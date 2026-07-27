import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth } from '@/lib/auth/helpers'
import { resolveOwnStudentId } from '@/lib/auth/student-scope'

import type { SessionUser } from '@/lib/auth/helpers'

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

// A student's own dashboard: personal academic/payment status, never the
// institution-wide admin aggregates (total revenue, every student's status, etc.)
// that the rest of this route computes for staff roles.
async function getStudentDashboardHandler(studentId: string, tenantId: string) {
  const now = new Date()

  const [student, currentAcademicYear, settings, payments, announcements, upcomingExamSessions, grades] = await Promise.all([
    db.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        matricule: true,
        status: true,
        currentProgram: { select: { name: true } },
        currentLevel: { select: { name: true } },
      },
    }),
    db.academicYear.findFirst({ where: { tenantId, isCurrent: true }, include: { sessions: true } }),
    db.tenantSettings.findUnique({ where: { tenantId }, select: { passingGrade: true } }),
    db.payment.findMany({ where: { tenantId, studentId }, orderBy: { createdAt: 'desc' } }),
    db.announcement.findMany({ where: { tenantId, isPublished: true }, orderBy: { publishedAt: 'desc' }, take: 5 }),
    db.examSession.findMany({ where: { academicYear: { tenantId }, startDate: { gte: now } }, orderBy: { startDate: 'asc' }, take: 5 }),
    db.grade.findMany({
      where: { studentId, finalGrade: { not: null } },
      select: { finalGrade: true, courseElement: { select: { coefficient: true } } },
    }),
  ])

  const passingGrade = settings?.passingGrade ?? 10
  let weightedSum = 0
  let weightTotal = 0
  for (const g of grades) {
    if (g.finalGrade === null) continue
    const coeff = g.courseElement?.coefficient ?? 1
    weightedSum += g.finalGrade * coeff
    weightTotal += coeff
  }
  const moyenneGenerale = weightTotal > 0 ? round2(weightedSum / weightTotal) : null

  const totalPaid = payments.filter((p) => p.status === 'VALIDATED').reduce((sum, p) => sum + p.amount, 0)
  const pendingPaymentsCount = payments.filter((p) => p.status === 'PENDING').length
  const lastPayment = payments[0] ?? null

  const upcomingEvents = upcomingExamSessions.map((e) => ({
    id: `exam-${e.id}`,
    date: e.startDate,
    title: e.name,
    type: 'exam' as const,
  }))

  const recentActivity = announcements.map((a) => ({
    id: `announcement-${a.id}`,
    type: 'annonce' as const,
    description: a.title,
    time: a.publishedAt || a.createdAt,
    user: a.publishedBy || 'Administration',
  }))

  return NextResponse.json({
    isStudentView: true,
    student: student
      ? {
          firstName: student.firstName,
          lastName: student.lastName,
          matricule: student.matricule,
          status: student.status,
          program: student.currentProgram?.name ?? null,
          level: student.currentLevel?.name ?? null,
        }
      : null,
    stats: {
      moyenneGenerale,
      passingGrade,
      totalPaid,
      pendingPaymentsCount,
      lastPaymentStatus: lastPayment?.status ?? null,
    },
    recentActivity,
    upcomingEvents,
    currentAcademicYear: currentAcademicYear
      ? {
          id: currentAcademicYear.id,
          name: currentAcademicYear.name,
          startDate: currentAcademicYear.startDate,
          endDate: currentAcademicYear.endDate,
          examSessions: currentAcademicYear.sessions.length,
        }
      : null,
  })
}

async function getDashboardHandler(user: SessionUser, tenantId: string, _request: NextRequest) {
  try {
    const ownStudentId = await resolveOwnStudentId(user)
    if (ownStudentId) {
      return getStudentDashboardHandler(ownStudentId, tenantId)
    }

    const now = new Date()

    // Parallel fetch all stats
    const [
      totalStudents,
      totalTeachers,
      totalPrograms,
      totalPayments,
      totalFaculties,
      totalDepartments,
      totalTeachingUnits,
      studentsByStatus,
      studentsByProgram,
      paymentsByStatus,
      recentPayments,
      recentStudents,
      recentAnnouncements,
      currentAcademicYear,
      studentsForCycle,
      gradesForSuccessRate,
      tenantSettings,
      unvalidatedGradesCount,
      pendingPaymentsCount,
      studentsWithoutPaymentCount,
      upcomingExamSessions,
      upcomingDeliberations,
    ] = await Promise.all([
      // Total students
      db.student.count({ where: { tenantId } }),

      // Total teachers
      db.teacher.count({ where: { tenantId } }),

      // Total programs
      db.program.count({ where: { tenantId } }),

      // Total payments amount
      db.payment.aggregate({
        where: { tenantId, status: 'VALIDATED' },
        _sum: { amount: true },
        _count: true,
      }),

      // Total faculties
      db.faculty.count({ where: { tenantId } }),

      // Total departments
      db.department.count({ where: { tenantId } }),

      // Total teaching units
      db.teachingUnit.count({
        where: {
          semester: {
            level: {
              program: { tenantId },
            },
          },
        },
      }),

      // Students by status
      db.student.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { status: true },
      }),

      // Students by program
      db.student.findMany({
        where: { tenantId, currentProgramId: { not: null } },
        select: {
          currentProgram: {
            select: { name: true },
          },
        },
      }),

      // Payments by status
      db.payment.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { status: true },
        _sum: { amount: true },
      }),

      // Recent payments
      db.payment.findMany({
        where: { tenantId },
        include: {
          student: {
            select: { firstName: true, lastName: true, matricule: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // Recent students
      db.student.findMany({
        where: { tenantId },
        include: {
          currentProgram: { select: { name: true } },
          currentLevel: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // Recent announcements
      db.announcement.findMany({
        where: { tenantId, isPublished: true },
        orderBy: { publishedAt: 'desc' },
        take: 5,
      }),

      // Current academic year
      db.academicYear.findFirst({
        where: { tenantId, isCurrent: true },
        include: { sessions: true },
      }),

      // Students with their program's cycle (Licence/Master/Doctorat)
      db.student.findMany({
        where: { tenantId, currentProgramId: { not: null } },
        select: { currentProgram: { select: { cycle: true } } },
      }),

      // Entered grades with the student's program, to compute a real pass rate
      db.grade.findMany({
        where: { student: { tenantId }, finalGrade: { not: null } },
        select: { finalGrade: true, student: { select: { currentProgram: { select: { name: true } } } } },
      }),

      // Passing grade threshold
      db.tenantSettings.findUnique({ where: { tenantId }, select: { passingGrade: true } }),

      // Grades entered but not yet locked/validated
      db.grade.count({ where: { student: { tenantId }, isLocked: false, finalGrade: { not: null } } }),

      // Payments awaiting validation
      db.payment.count({ where: { tenantId, status: 'PENDING' } }),

      // Active students with no validated payment at all (honest proxy for "en dette" — no fee-due-date model exists)
      db.student.count({
        where: { tenantId, status: 'INSCRIT', payments: { none: { status: 'VALIDATED' } } },
      }),

      // Upcoming exam sessions
      db.examSession.findMany({
        where: { academicYear: { tenantId }, startDate: { gte: now } },
        orderBy: { startDate: 'asc' },
        take: 5,
      }),

      // Upcoming deliberations
      db.deliberation.findMany({
        where: { tenantId, date: { gte: now } },
        orderBy: { date: 'asc' },
        take: 5,
      }),
    ])

    // Process students by program for chart
    const programCounts: Record<string, number> = {}
    for (const s of studentsByProgram) {
      const progName = s.currentProgram?.name || 'Non assigné'
      programCounts[progName] = (programCounts[progName] || 0) + 1
    }

    // Students by cycle (Licence/Master/Doctorat)
    const cycleCounts: Record<string, number> = {}
    for (const s of studentsForCycle) {
      const cycle = s.currentProgram?.cycle || 'AUTRE'
      cycleCounts[cycle] = (cycleCounts[cycle] || 0) + 1
    }

    // Success rate per program, from real entered grades vs the tenant's passing threshold
    const passingGrade = tenantSettings?.passingGrade ?? 10
    const successByProgram: Record<string, { total: number; passed: number }> = {}
    for (const g of gradesForSuccessRate) {
      const progName = g.student.currentProgram?.name || 'Non assigné'
      if (!successByProgram[progName]) successByProgram[progName] = { total: 0, passed: 0 }
      successByProgram[progName].total += 1
      if ((g.finalGrade ?? 0) >= passingGrade) successByProgram[progName].passed += 1
    }

    const chartData = {
      studentsByStatus: studentsByStatus.map((s) => ({
        status: s.status,
        count: s._count.status,
      })),
      studentsByProgram: Object.entries(programCounts).map(([name, count]) => ({
        name,
        count,
      })),
      paymentsByStatus: paymentsByStatus.map((p) => ({
        status: p.status,
        count: p._count.status,
        total: p._sum.amount || 0,
      })),
      studentsByCycle: Object.entries(cycleCounts).map(([cycle, count]) => ({ cycle, count })),
      successRateByProgram: Object.entries(successByProgram).map(([name, { total, passed }]) => ({
        name,
        rate: total > 0 ? Math.round((passed / total) * 100) : 0,
      })),
    }

    // Real alerts (no fabricated numbers — each is a direct, honest DB count)
    const alerts = {
      unvalidatedGrades: unvalidatedGradesCount,
      pendingPayments: pendingPaymentsCount,
      studentsWithoutPayment: studentsWithoutPaymentCount,
    }

    // Upcoming events, merged from real exam sessions and deliberations
    const upcomingEvents = [
      ...upcomingExamSessions.map((e) => ({
        id: `exam-${e.id}`,
        date: e.startDate,
        title: e.name,
        type: 'exam' as const,
      })),
      ...upcomingDeliberations.map((d) => ({
        id: `deliberation-${d.id}`,
        date: d.date,
        title: d.name,
        type: 'deliberation' as const,
      })),
    ]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5)

    // Build recent activity feed
    const recentActivity = [
      ...recentStudents.map((s) => ({
        id: `student-${s.id}`,
        type: 'inscription' as const,
        description: `Inscription de ${s.firstName} ${s.lastName}`,
        time: s.createdAt,
        user: 'Scolarité',
      })),
      ...recentPayments.map((p) => ({
        id: `payment-${p.id}`,
        type: 'paiement' as const,
        description: `Paiement de ${p.amount.toLocaleString()} FCFA - ${p.student.firstName} ${p.student.lastName}`,
        time: p.createdAt,
        user: 'Caisse',
      })),
      ...recentAnnouncements.map((a) => ({
        id: `announcement-${a.id}`,
        type: 'annonce' as const,
        description: a.title,
        time: a.publishedAt || a.createdAt,
        user: a.publishedBy || 'Administration',
      })),
    ]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 10)

    // Stats cards data
    const totalPaymentsAmount = totalPayments._sum.amount || 0
    const statsCards = {
      totalStudents,
      totalTeachers,
      totalPrograms,
      totalFaculties,
      totalDepartments,
      totalTeachingUnits,
      totalPaymentsAmount,
      totalPaymentsCount: totalPayments._count,
    }

    return NextResponse.json({
      statsCards,
      chartData,
      recentActivity,
      alerts,
      upcomingEvents,
      currentAcademicYear: currentAcademicYear
        ? {
            id: currentAcademicYear.id,
            name: currentAcademicYear.name,
            startDate: currentAcademicYear.startDate,
            endDate: currentAcademicYear.endDate,
            examSessions: currentAcademicYear.sessions.length,
          }
        : null,
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export const GET = withTenantAuth(getDashboardHandler)