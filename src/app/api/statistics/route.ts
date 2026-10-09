import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { isStudentSelfRole } from '@/lib/auth/student-scope'

type StudentGroup = { name: string; gender: string | null; count: number }
type PaymentGroup = { status: string; total: number }
type GradeBucket = { range: string; count: number }
type YearSuccess = { academicYearId: string; passing: number; total: number }
type ProgramLevelSuccess = { program: string; level: string; passing: number; total: number }

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

    const [studentGroups, paymentGroups, academicYears, gradeBuckets, successRows, programLevelRows] = await Promise.all([
      db.$queryRaw<StudentGroup[]>`
        SELECT
          COALESCE(p."name", 'Non affecté') AS "name",
          s."gender" AS "gender",
          COUNT(*)::int AS "count"
        FROM "Student" s
        LEFT JOIN "Program" p
          ON p."id" = s."currentProgramId"
        WHERE s."tenantId" = ${tenantId}
        GROUP BY p."name", s."gender"
      `,
      db.$queryRaw<PaymentGroup[]>`
        SELECT
          p."status" AS "status",
          COALESCE(SUM(p."amount"), 0)::float8 AS "total"
        FROM "Payment" p
        WHERE p."tenantId" = ${tenantId}
        GROUP BY p."status"
      `,
      db.academicYear.findMany({
        where: { tenantId },
        orderBy: { startDate: 'asc' },
        select: { id: true, name: true },
      }),
      db.$queryRaw<GradeBucket[]>`
        SELECT
          CASE
            WHEN g."finalGrade" >= 0 AND g."finalGrade" < 5 THEN '0-5'
            WHEN g."finalGrade" < 8 THEN '5-8'
            WHEN g."finalGrade" < 10 THEN '8-10'
            WHEN g."finalGrade" < 12 THEN '10-12'
            WHEN g."finalGrade" < 14 THEN '12-14'
            WHEN g."finalGrade" < 16 THEN '14-16'
            WHEN g."finalGrade" < 18 THEN '16-18'
            ELSE '18-20'
          END AS "range",
          COUNT(*)::int AS "count"
        FROM "Grade" g
        INNER JOIN "Student" s ON s."id" = g."studentId"
        WHERE s."tenantId" = ${tenantId}
          AND g."finalGrade" IS NOT NULL
          AND g."finalGrade" >= 0
          AND g."finalGrade" <= 20
        GROUP BY 1
      `,
      db.$queryRaw<YearSuccess[]>`
        SELECT
          g."academicYearId" AS "academicYearId",
          COUNT(*) FILTER (WHERE g."finalGrade" >= ${passingGrade})::int AS "passing",
          COUNT(*)::int AS "total"
        FROM "Grade" g
        INNER JOIN "Student" s ON s."id" = g."studentId"
        WHERE s."tenantId" = ${tenantId}
          AND g."finalGrade" IS NOT NULL
        GROUP BY g."academicYearId"
      `,
      db.$queryRaw<ProgramLevelSuccess[]>`
        SELECT
          COALESCE(p."name", 'Non affecté') AS "program",
          COALESCE(l."name", '—') AS "level",
          COUNT(*) FILTER (WHERE g."finalGrade" >= ${passingGrade})::int AS "passing",
          COUNT(*)::int AS "total"
        FROM "Grade" g
        INNER JOIN "Student" s ON s."id" = g."studentId"
        LEFT JOIN "Program" p
          ON p."id" = s."currentProgramId"
        LEFT JOIN "Level" l ON l."id" = s."currentLevelId"
        WHERE s."tenantId" = ${tenantId}
          AND g."finalGrade" IS NOT NULL
        GROUP BY p."name", l."name"
        ORDER BY p."name", l."name"
      `,
    ])

    const byProgram = new Map<string, { name: string; etudiants: number; femmes: number; hommes: number }>()
    for (const row of studentGroups) {
      const entry = byProgram.get(row.name) ?? { name: row.name, etudiants: 0, femmes: 0, hommes: 0 }
      entry.etudiants += row.count
      if (row.gender === 'F') entry.femmes += row.count
      if (row.gender === 'M') entry.hommes += row.count
      byProgram.set(row.name, entry)
    }
    const studentsByFaculty = Array.from(byProgram.values()).sort((a, b) => b.etudiants - a.etudiants)

    const paymentTotals = new Map(paymentGroups.map((row) => [row.status, row.total]))
    const paymentCollection = [
      { name: 'Encaisse', value: paymentTotals.get('VALIDATED') ?? 0, color: '#2d7a4f' },
      { name: 'En attente', value: paymentTotals.get('PENDING') ?? 0, color: '#d4a853' },
      {
        name: 'Remboursé/Annulé',
        value: (paymentTotals.get('CANCELLED') ?? 0) + (paymentTotals.get('REFUNDED') ?? 0),
        color: '#c62828',
      },
    ]

    const bucketCounts = new Map(gradeBuckets.map((row) => [row.range, row.count]))
    const gradeDistribution = ['0-5', '5-8', '8-10', '10-12', '12-14', '14-16', '16-18', '18-20']
      .map((range) => ({ range, count: bucketCounts.get(range) ?? 0 }))

    const successByYearId = new Map(successRows.map((row) => [row.academicYearId, row]))
    const successRateByYear = academicYears.flatMap((year) => {
      const row = successByYearId.get(year.id)
      return row && row.total > 0
        ? [{ year: year.name, taux: Math.round((row.passing / row.total) * 100) }]
        : []
    })

    const successByProgramMap = new Map<string, Record<string, string | number>>()
    for (const row of programLevelRows) {
      const entry = successByProgramMap.get(row.program) ?? { program: row.program }
      entry[row.level] = row.total > 0 ? Math.round((row.passing / row.total) * 100) : 0
      successByProgramMap.set(row.program, entry)
    }
    const successByProgram = Array.from(successByProgramMap.values())

    const totalStudents = studentGroups.reduce((sum, row) => sum + row.count, 0)
    const totalFemmes = studentGroups.reduce((sum, row) => sum + (row.gender === 'F' ? row.count : 0), 0)
    const gradeTotal = successRows.reduce((sum, row) => sum + row.total, 0)
    const passingTotal = successRows.reduce((sum, row) => sum + row.passing, 0)
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
