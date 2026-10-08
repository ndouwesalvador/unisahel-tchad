import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { isStudentSelfRole } from '@/lib/auth/student-scope'

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

// GET /api/statistics - real institution-wide statistics for the SUPER_ADMIN/CAISSE dashboard
async function handleGet(user: SessionUser, tenantId: string, _request: NextRequest) {
  try {
    if (isStudentSelfRole(user.role)) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Accès refusé' }, { status: 403 })
    }
    const [students, payments, academicYears, settings] = await Promise.all([
      db.student.findMany({
        where: { tenantId },
        select: { id: true, gender: true, currentProgramId: true, currentProgram: { select: { name: true } }, currentLevel: { select: { name: true } } },
      }),
      db.payment.findMany({ where: { tenantId }, select: { amount: true, status: true } }),
      db.academicYear.findMany({ where: { tenantId }, orderBy: { startDate: 'asc' } }),
      db.tenantSettings.findUnique({ where: { tenantId }, select: { passingGrade: true } }),
    ])
    const passingGrade = settings?.passingGrade ?? 10

    // ─── Students by faculty/program, split by gender ──────────────────────
    const byProgram = new Map<string, { name: string; etudiants: number; femmes: number; hommes: number }>()
    for (const s of students) {
      const key = s.currentProgramId || 'none'
      const name = s.currentProgram?.name || 'Non affecte'
      const entry = byProgram.get(key) ?? { name, etudiants: 0, femmes: 0, hommes: 0 }
      entry.etudiants += 1
      if (s.gender === 'F') entry.femmes += 1
      else if (s.gender === 'M') entry.hommes += 1
      byProgram.set(key, entry)
    }
    const studentsByFaculty = Array.from(byProgram.values()).sort((a, b) => b.etudiants - a.etudiants)

    // ─── Payment collection breakdown ───────────────────────────────────────
    const sumByStatus = (status: string) => payments.filter((p) => p.status === status).reduce((sum, p) => sum + p.amount, 0)
    const paymentCollection = [
      { name: 'Encaisse', value: sumByStatus('VALIDATED'), color: '#2d7a4f' },
      { name: 'En attente', value: sumByStatus('PENDING'), color: '#d4a853' },
      { name: 'Rembourse/Annule', value: sumByStatus('CANCELLED') + sumByStatus('REFUNDED'), color: '#c62828' },
    ]

    // ─── Grade distribution + success rate per academic year (real, however
    //     many years actually have grade data - no fabricated multi-year trend) ──
    const gradeBuckets = [
      { range: '0-5', min: 0, max: 5 },
      { range: '5-8', min: 5, max: 8 },
      { range: '8-10', min: 8, max: 10 },
      { range: '10-12', min: 10, max: 12 },
      { range: '12-14', min: 12, max: 14 },
      { range: '14-16', min: 14, max: 16 },
      { range: '16-18', min: 16, max: 18 },
      { range: '18-20', min: 18, max: 20.01 },
    ]

    const successRateByYear: { year: string; taux: number }[] = []
    let allFinalGrades: number[] = []
    for (const year of academicYears) {
      const grades = await db.grade.findMany({
        where: { student: { tenantId }, academicYearId: year.id, finalGrade: { not: null } },
        select: { finalGrade: true },
      })
      const finals = grades.map((g) => g.finalGrade as number)
      allFinalGrades = allFinalGrades.concat(finals)
      if (finals.length > 0) {
        const passing = finals.filter((g) => g >= passingGrade).length
        successRateByYear.push({ year: year.name, taux: Math.round((passing / finals.length) * 100) })
      }
    }

    const gradeDistribution = gradeBuckets.map((b) => ({
      range: b.range,
      count: allFinalGrades.filter((g) => g >= b.min && g < b.max).length,
    }))

    // ─── Success rate per program x level ───────────────────────────────────
    const gradeRows = await db.grade.findMany({
      where: { student: { tenantId }, finalGrade: { not: null } },
      select: {
        finalGrade: true,
        student: { select: { currentProgram: { select: { name: true } }, currentLevel: { select: { name: true } } } },
      },
    })
    const byProgLevel = new Map<string, { program: string; levels: Map<string, { pass: number; total: number }> }>()
    for (const g of gradeRows) {
      if (g.finalGrade === null) continue
      const program = g.student.currentProgram?.name || 'Non affecte'
      const level = g.student.currentLevel?.name || '—'
      if (!byProgLevel.has(program)) byProgLevel.set(program, { program, levels: new Map() })
      const entry = byProgLevel.get(program)!
      const levelEntry = entry.levels.get(level) ?? { pass: 0, total: 0 }
      levelEntry.total += 1
      if (g.finalGrade >= passingGrade) levelEntry.pass += 1
      entry.levels.set(level, levelEntry)
    }
    const successByProgram = Array.from(byProgLevel.values()).map((entry) => {
      const row: Record<string, string | number> = { program: entry.program }
      for (const [level, { pass, total }] of entry.levels) {
        row[level] = total > 0 ? Math.round((pass / total) * 100) : 0
      }
      return row
    })

    const totalStudents = students.length
    const totalFemmes = students.filter((s) => s.gender === 'F').length
    const globalSuccessRate = allFinalGrades.length > 0
      ? round2((allFinalGrades.filter((g) => g >= passingGrade).length / allFinalGrades.length) * 100)
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
