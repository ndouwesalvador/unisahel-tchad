import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { isStudentSelfRole } from '@/lib/auth/student-scope'

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

// GET /api/statistics - institution-wide statistics for the authorized dashboards.
// PostgreSQL performs every aggregation: the Function never materializes the
// complete student, payment or grade tables in memory.
async function handleGet(user: SessionUser, tenantId: string, _request: NextRequest) {
  try {
    if (isStudentSelfRole(user.role)) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Accès refusé' }, { status: 403 })
    }

    const settings = await db.tenantSettings.findUnique({
      where: { tenantId },
      select: { passingGrade: true },
    })
    const passingGrade = settings?.passingGrade ?? 10

    const [studentGroups, paymentGroups, academicYears, gradeGroups, studentGradeGroups] = await Promise.all([
      db.student.groupBy({
        by: ['currentProgramId', 'gender'],
        where: { tenantId },
        _count: { _all: true },
      }),
      db.payment.groupBy({
        by: ['status'],
        where: { tenantId },
        _sum: { amount: true },
      }),
      db.academicYear.findMany({
        where: { tenantId },
        orderBy: { startDate: 'asc' },
        select: { id: true, name: true },
      }),
      db.grade.groupBy({
        by: ['academicYearId', 'finalGrade'],
        where: { student: { tenantId }, finalGrade: { not: null } },
        _count: { _all: true },
      }),
      db.grade.groupBy({
        by: ['studentId', 'finalGrade'],
        where: { student: { tenantId }, finalGrade: { not: null } },
        _count: { _all: true },
      }),
    ])

    const programIds = [...new Set(studentGroups.flatMap((row) => row.currentProgramId ? [row.currentProgramId] : []))]
    const gradeStudentIds = [...new Set(studentGradeGroups.map((row) => row.studentId))]
    const [programs, gradeStudents] = await Promise.all([
      programIds.length > 0
        ? db.program.findMany({ where: { tenantId, id: { in: programIds } }, select: { id: true, name: true } })
        : [],
      gradeStudentIds.length > 0
        ? db.student.findMany({
          where: { tenantId, id: { in: gradeStudentIds } },
          select: {
            id: true,
            currentProgram: { select: { name: true } },
            currentLevel: { select: { name: true } },
          },
        })
        : [],
    ])
    const programNames = new Map(programs.map((program) => [program.id, program.name]))
    const gradeStudentScopes = new Map(gradeStudents.map((student) => [student.id, {
      program: student.currentProgram?.name ?? 'Non affecté',
      level: student.currentLevel?.name ?? '—',
    }]))

    const byProgram = new Map<string, { name: string; etudiants: number; femmes: number; hommes: number }>()
    for (const row of studentGroups) {
      const name = row.currentProgramId ? programNames.get(row.currentProgramId) ?? 'Non affecté' : 'Non affecté'
      const count = row._count._all
      const entry = byProgram.get(name) ?? { name, etudiants: 0, femmes: 0, hommes: 0 }
      entry.etudiants += count
      if (row.gender === 'F') entry.femmes += count
      if (row.gender === 'M') entry.hommes += count
      byProgram.set(name, entry)
    }
    const studentsByFaculty = Array.from(byProgram.values()).sort((a, b) => b.etudiants - a.etudiants)

    const paymentTotals = new Map(paymentGroups.map((row) => [row.status, row._sum.amount ?? 0]))
    const paymentCollection = [
      { name: 'Encaisse', value: paymentTotals.get('VALIDATED') ?? 0, color: '#2d7a4f' },
      { name: 'En attente', value: paymentTotals.get('PENDING') ?? 0, color: '#d4a853' },
      {
        name: 'Remboursé/Annulé',
        value: (paymentTotals.get('CANCELLED') ?? 0) + (paymentTotals.get('REFUNDED') ?? 0),
        color: '#c62828',
      },
    ]

    const bucketRanges = [
      { range: '0-5', min: 0, max: 5 },
      { range: '5-8', min: 5, max: 8 },
      { range: '8-10', min: 8, max: 10 },
      { range: '10-12', min: 10, max: 12 },
      { range: '12-14', min: 12, max: 14 },
      { range: '14-16', min: 14, max: 16 },
      { range: '16-18', min: 16, max: 18 },
      { range: '18-20', min: 18, max: 20.01 },
    ]
    const gradeDistribution = bucketRanges.map((bucket) => ({
      range: bucket.range,
      count: gradeGroups.reduce((sum, row) => {
        const value = row.finalGrade
        return value !== null && value >= bucket.min && value < bucket.max ? sum + row._count._all : sum
      }, 0),
    }))

    const successByYearId = new Map<string, { passing: number; total: number }>()
    for (const row of gradeGroups) {
      if (row.finalGrade === null) continue
      const entry = successByYearId.get(row.academicYearId) ?? { passing: 0, total: 0 }
      entry.total += row._count._all
      if (row.finalGrade >= passingGrade) entry.passing += row._count._all
      successByYearId.set(row.academicYearId, entry)
    }
    const successRateByYear = academicYears.flatMap((year) => {
      const row = successByYearId.get(year.id)
      return row && row.total > 0
        ? [{ year: year.name, taux: Math.round((row.passing / row.total) * 100) }]
        : []
    })

    const successByProgramMap = new Map<string, Record<string, string | number>>()
    const successCounters = new Map<string, { program: string; level: string; passing: number; total: number }>()
    for (const row of studentGradeGroups) {
      if (row.finalGrade === null) continue
      const scope = gradeStudentScopes.get(row.studentId) ?? { program: 'Non affecté', level: '—' }
      const key = `${scope.program}\u0000${scope.level}`
      const counter = successCounters.get(key) ?? { ...scope, passing: 0, total: 0 }
      counter.total += row._count._all
      if (row.finalGrade >= passingGrade) counter.passing += row._count._all
      successCounters.set(key, counter)
    }
    for (const row of successCounters.values()) {
      const entry = successByProgramMap.get(row.program) ?? { program: row.program }
      entry[row.level] = row.total > 0 ? Math.round((row.passing / row.total) * 100) : 0
      successByProgramMap.set(row.program, entry)
    }
    const successByProgram = Array.from(successByProgramMap.values())

    const totalStudents = studentGroups.reduce((sum, row) => sum + row._count._all, 0)
    const totalFemmes = studentGroups.reduce((sum, row) => sum + (row.gender === 'F' ? row._count._all : 0), 0)
    const yearCounters = Array.from(successByYearId.values())
    const gradeTotal = yearCounters.reduce((sum, row) => sum + row.total, 0)
    const passingTotal = yearCounters.reduce((sum, row) => sum + row.passing, 0)
    const globalSuccessRate = gradeTotal > 0 ? round2((passingTotal / gradeTotal) * 100) : 0

    return NextResponse.json({
      studentsByFaculty,
      successRateByYear,
      paymentCollection,
      gradeDistribution,
      successByProgram,
      totals: { totalStudents, totalFemmes, globalSuccessRate },
    })
  } catch (error) {
    console.error('Statistics API error:', error)
    return NextResponse.json({ error: 'Impossible de charger les statistiques.' }, { status: 500 })
  }
}

export const GET = withTenantAuth(handleGet, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'RECTORAT', 'CAISSE'])
