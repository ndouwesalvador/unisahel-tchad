import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth } from '@/lib/auth/helpers'

import type { SessionUser } from '@/lib/auth/helpers'

async function getDashboardHandler(user: SessionUser, tenantId: string, _request: NextRequest) {
  try {
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
    ])

    // Process students by program for chart
    const programCounts: Record<string, number> = {}
    for (const s of studentsByProgram) {
      const progName = s.currentProgram?.name || 'Non assigné'
      programCounts[progName] = (programCounts[progName] || 0) + 1
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
    }

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