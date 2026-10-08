import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { isStudentSelfRole } from '@/lib/auth/student-scope'

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

type StudentProgramRow = { name: string; etudiants: bigint; femmes: bigint; hommes: bigint }
type GradeYearRow = { year: string; total: bigint; passed: bigint }
type GradeBucketRow = { range: string; count: bigint }
type GradeProgramRow = { program: string; level: string; total: bigint; passed: bigint }

// GET /api/statistics - real institution-wide statistics for the SUPER_ADMIN/CAISSE dashboard
async function handleGet(user: SessionUser, tenantId: string, _request: NextRequest) {
  try {
    if (isStudentSelfRole(user.role)) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Accès refusé' }, { status: 403 })
    }
    const [studentProgramRows, paymentsByStatus, gradeYearRows, gradeBucketRows, gradeProgramRows] = await Promise.all([
      db.$queryRaw<StudentProgramRow[]>(Prisma.sql`
        SELECT COALESCE(p."name", 'Non affecté') AS "name",
               COUNT(*)::bigint AS "etudiants",
               COUNT(*) FILTER (WHERE s."gender" = 'F')::bigint AS "femmes",
               COUNT(*) FILTER (WHERE s."gender" = 'M')::bigint AS "hommes"
        FROM "Student" s
        LEFT JOIN "Program" p ON p."id" = s."currentProgramId" AND p."tenantId" = s."tenantId"
        WHERE s."tenantId" = ${tenantId}
        GROUP BY p."id", p."name"
        ORDER BY COUNT(*) DESC
      `),
      db.payment.groupBy({
        by: ['status'],
        where: { tenantId },
        _sum: { amount: true },
      }),
      db.$queryRaw<GradeYearRow[]>(Prisma.sql`
        SELECT ay."name" AS "year", COUNT(*)::bigint AS "total",
               COUNT(*) FILTER (
                 WHERE g."finalGrade" >= COALESCE(
                   (SELECT ts."passingGrade" FROM "TenantSettings" ts WHERE ts."tenantId" = ${tenantId}),
                   10
                 )
               )::bigint AS "passed"
        FROM "Grade" g
        JOIN "Student" s ON s."id" = g."studentId"
        JOIN "AcademicYear" ay ON ay."id" = g."academicYearId" AND ay."tenantId" = s."tenantId"
        WHERE s."tenantId" = ${tenantId} AND g."finalGrade" IS NOT NULL
        GROUP BY ay."id", ay."name", ay."startDate"
        ORDER BY ay."startDate" ASC
      `),
      db.$queryRaw<GradeBucketRow[]>(Prisma.sql`
        SELECT CASE
                 WHEN g."finalGrade" < 5 THEN '0-5'
                 WHEN g."finalGrade" < 8 THEN '5-8'
                 WHEN g."finalGrade" < 10 THEN '8-10'
                 WHEN g."finalGrade" < 12 THEN '10-12'
                 WHEN g."finalGrade" < 14 THEN '12-14'
                 WHEN g."finalGrade" < 16 THEN '14-16'
                 WHEN g."finalGrade" < 18 THEN '16-18'
                 ELSE '18-20'
               END AS "range",
               COUNT(*)::bigint AS "count"
        FROM "Grade" g
        JOIN "Student" s ON s."id" = g."studentId"
        WHERE s."tenantId" = ${tenantId} AND g."finalGrade" IS NOT NULL
        GROUP BY "range"
      `),
      db.$queryRaw<GradeProgramRow[]>(Prisma.sql`
        SELECT COALESCE(p."name", 'Non affecté') AS "program",
               COALESCE(l."name", '—') AS "level",
               COUNT(*)::bigint AS "total",
               COUNT(*) FILTER (
                 WHERE g."finalGrade" >= COALESCE(
                   (SELECT ts."passingGrade" FROM "TenantSettings" ts WHERE ts."tenantId" = ${tenantId}),
                   10
                 )
               )::bigint AS "passed"
        FROM "Grade" g
        JOIN "Student" s ON s."id" = g."studentId"
        LEFT JOIN "Program" p ON p."id" = s."currentProgramId" AND p."tenantId" = s."tenantId"
        LEFT JOIN "Level" l ON l."id" = s."currentLevelId" AND l."programId" = p."id"
        WHERE s."tenantId" = ${tenantId} AND g."finalGrade" IS NOT NULL
        GROUP BY p."id", p."name", l."id", l."name"
      `),
    ])

    // ─── Students by faculty/program, split by gender ──────────────────────
    const studentsByFaculty = studentProgramRows.map((row) => ({
      name: row.name,
      etudiants: Number(row.etudiants),
      femmes: Number(row.femmes),
      hommes: Number(row.hommes),
    }))

    // ─── Payment collection breakdown ───────────────────────────────────────
    const paymentTotals = new Map(paymentsByStatus.map((row) => [row.status, row._sum.amount ?? 0]))
    const sumByStatus = (status: string) => paymentTotals.get(status) ?? 0
    const paymentCollection = [
      { name: 'Encaisse', value: sumByStatus('VALIDATED'), color: '#2d7a4f' },
      { name: 'En attente', value: sumByStatus('PENDING'), color: '#d4a853' },
      { name: 'Rembourse/Annule', value: sumByStatus('CANCELLED') + sumByStatus('REFUNDED'), color: '#c62828' },
    ]

    // ─── Grade distribution + success rate per academic year (real, however
    //     many years actually have grade data - no fabricated multi-year trend) ──
    const successRateByYear = gradeYearRows.map((row) => ({
      year: row.year,
      taux: Number(row.total) > 0 ? Math.round((Number(row.passed) / Number(row.total)) * 100) : 0,
    }))
    const bucketCounts = new Map(gradeBucketRows.map((row) => [row.range, Number(row.count)]))
    const gradeDistribution = ['0-5', '5-8', '8-10', '10-12', '12-14', '14-16', '16-18', '18-20']
      .map((range) => ({ range, count: bucketCounts.get(range) ?? 0 }))

    // ─── Success rate per program x level ───────────────────────────────────
    const byProgLevel = new Map<string, { program: string; levels: Map<string, { pass: number; total: number }> }>()
    for (const row of gradeProgramRows) {
      const program = row.program
      const level = row.level
      if (!byProgLevel.has(program)) byProgLevel.set(program, { program, levels: new Map() })
      const entry = byProgLevel.get(program)!
      entry.levels.set(level, { pass: Number(row.passed), total: Number(row.total) })
    }
    const successByProgram = Array.from(byProgLevel.values()).map((entry) => {
      const row: Record<string, string | number> = { program: entry.program }
      for (const [level, { pass, total }] of entry.levels) {
        row[level] = total > 0 ? Math.round((pass / total) * 100) : 0
      }
      return row
    })

    const totalStudents = studentsByFaculty.reduce((sum, row) => sum + row.etudiants, 0)
    const totalFemmes = studentsByFaculty.reduce((sum, row) => sum + row.femmes, 0)
    const totalGrades = gradeYearRows.reduce((sum, row) => sum + Number(row.total), 0)
    const totalPassingGrades = gradeYearRows.reduce((sum, row) => sum + Number(row.passed), 0)
    const globalSuccessRate = totalGrades > 0
      ? round2((totalPassingGrades / totalGrades) * 100)
      : 0

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
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 })
  }
}

export const GET = withTenantAuth(handleGet)
