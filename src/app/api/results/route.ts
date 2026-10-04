import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { isStudentSelfRole, resolveOwnStudentId } from '@/lib/auth/student-scope'

type Mention = 'Passable' | 'Assez-Bien' | 'Bien' | 'Tres-Bien' | 'Excellent'
type Decision = 'Admis' | 'Ajourne'
const RESULTS_OVERSIGHT_ROLES = new Set(['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'RECTORAT', 'SCOLARITE'])

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

// Standard French LMD mention thresholds, consistent with the ones already used in
// deliberation-page.tsx and the (out-of-scope) "new result" dialog in results-page.tsx.
function computeMention(moyenne: number): Mention {
  if (moyenne >= 18) return 'Excellent'
  if (moyenne >= 16) return 'Tres-Bien'
  if (moyenne >= 14) return 'Bien'
  if (moyenne >= 12) return 'Assez-Bien'
  return 'Passable'
}

function formatDateFr(date: Date | null | undefined): string {
  if (!date) return ''
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

async function resolveAcademicYearId(tenantId: string, requested: string | null): Promise<string | null> {
  if (requested) return requested
  const current = await db.academicYear.findFirst({
    where: { tenantId, isCurrent: true },
    select: { id: true },
  })
  return current?.id ?? null
}

// GET /api/results
//   - no `studentId`: aggregated per-student results for a session (academic year), built from real Grade rows
//   - `studentId` present: a single student's transcript for that academic year
async function handleGet(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    if (!isStudentSelfRole(user.role) && !RESULTS_OVERSIGHT_ROLES.has(user.role)) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Accès refusé' }, { status: 403 })
    }
    const { searchParams } = new URL(request.url)
    const requestedStudentId = searchParams.get('studentId') || undefined
    const ownStudentId = await resolveOwnStudentId(user)
    if (isStudentSelfRole(user.role) && !ownStudentId) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Accès refusé' }, { status: 403 })
    }
    if (ownStudentId && requestedStudentId && requestedStudentId !== ownStudentId) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Accès refusé' }, { status: 403 })
    }
    const studentId = ownStudentId ?? requestedStudentId
    const sessionType = searchParams.get('session') || 'NORMALE'
    const requestedYearId = searchParams.get('academicYearId')

    const academicYearId = await resolveAcademicYearId(tenantId, requestedYearId)

    const settings = await db.tenantSettings.findUnique({
      where: { tenantId },
      select: { passingGrade: true, creditsPerYear: true },
    })
    const passingGrade = settings?.passingGrade ?? 10
    const creditsPerYear = settings?.creditsPerYear ?? 60

    const academicYear = academicYearId
      ? await db.academicYear.findFirst({ where: { id: academicYearId, tenantId }, select: { id: true, name: true } })
      : null

    if (!academicYearId) {
      // No academic year at all for this tenant yet — nothing to compute.
      return NextResponse.json(
        studentId
          ? { transcript: null, passingGrade, creditsPerYear }
          : {
              results: [],
              academicYearId: null,
              academicYearName: null,
              passingGrade,
              creditsPerYear,
              stats: { admis: 0, ajournes: 0, moyenneGenerale: 0 },
            }
      )
    }

    // ─── Single student transcript ─────────────────────────────────────────
    if (studentId) {
      const [student, registration] = await Promise.all([
        db.student.findFirst({
          where: { id: studentId, tenantId },
          select: { id: true, firstName: true, lastName: true, matricule: true,
            dateOfBirth: true, placeOfBirth: true },
        }),
        db.administrativeRegistration.findFirst({
          where: { tenantId, studentId, academicYearId, status: 'INSCRIT' },
          select: { programId: true, levelId: true },
        }),
      ])
      if (!student) {
        return NextResponse.json({ error: 'Student not found' }, { status: 404 })
      }
      if (!registration) {
        return NextResponse.json({ transcript: null, jury: null, passingGrade, creditsPerYear })
      }
      const [program, level] = await Promise.all([
        db.program.findFirst({ where: { id: registration.programId, tenantId }, select: { name: true, departmentId: true } }),
        db.level.findFirst({ where: { id: registration.levelId, programId: registration.programId, program: { tenantId } }, select: { name: true } }),
      ])
      if (!program || !level) {
        return NextResponse.json({ error: 'Programme ou niveau de l’inscription introuvable' }, { status: 409 })
      }

      const grades = await db.grade.findMany({
        where: { studentId, academicYearId, session: sessionType, finalGrade: { not: null },
          ...(isStudentSelfRole(user.role) ? {
            isLocked: true,
            teachingUnit: { pedagogicalRegistrations: { some: {
              studentId, academicYearId, status: 'ACTIVE',
            } } },
          } : {}),
        },
        select: {
          finalGrade: true,
          courseElement: { select: { coefficient: true } },
          teachingUnit: { select: { id: true, code: true, name: true, credits: true } },
        },
      })

      const ueMap = new Map<string, { code: string; name: string; credit: number; weightedSum: number; weightTotal: number }>()
      let weightedSum = 0
      let weightTotal = 0

      for (const g of grades) {
        if (g.finalGrade === null || !g.teachingUnit) continue
        const coeff = g.courseElement?.coefficient ?? 1
        weightedSum += g.finalGrade * coeff
        weightTotal += coeff

        const existing = ueMap.get(g.teachingUnit.id)
        if (existing) {
          existing.weightedSum += g.finalGrade * coeff
          existing.weightTotal += coeff
        } else {
          ueMap.set(g.teachingUnit.id, {
            code: g.teachingUnit.code || g.teachingUnit.id.slice(0, 6).toUpperCase(),
            name: g.teachingUnit.name,
            credit: g.teachingUnit.credits,
            weightedSum: g.finalGrade * coeff,
            weightTotal: coeff,
          })
        }
      }

      const ueGrades = Array.from(ueMap.values()).map((ue) => ({
        code: ue.code,
        name: ue.name,
        credit: ue.credit,
        note: ue.weightTotal > 0 ? round2(ue.weightedSum / ue.weightTotal) : 0,
      }))

      const moyenne = weightTotal > 0 ? round2(weightedSum / weightTotal) : 0
      const totalCredits = ueGrades.reduce((sum, ue) => (ue.note >= passingGrade ? sum + ue.credit : sum), 0)

      const transcript = {
        id: student.id,
        name: `${student.lastName.toUpperCase()} ${student.firstName}`,
        matricule: student.matricule || '—',
        dateNaissance: formatDateFr(student.dateOfBirth) || '—',
        lieuNaissance: student.placeOfBirth || '—',
        filiere: program.name,
        niveau: level.name,
        semester: academicYear?.name || '—',
        ueGrades,
        moyenne,
        mention: computeMention(moyenne),
        totalCredits,
      }

      let jury: { average: number; creditsAcquired: number; decision: string; date: string } | null = null
      if (program.departmentId) {
        const decisions = await db.deliberationDecision.findMany({
          where: { studentId, deliberation: {
            tenantId, academicYearId, departmentId: program.departmentId,
            status: 'TERMINEE', isLocked: true,
          } },
          select: { average: true, creditsAcquired: true, decision: true,
            deliberation: { select: { id: true, date: true } } },
        })
        for (const decision of decisions.sort((a, b) => b.deliberation.date.getTime() - a.deliberation.date.getTime())) {
          if (decision.average === null) continue
          const issuedPv = await db.officialDocument.findFirst({
            where: { tenantId, academicYearId, type: 'PV_DELIBERATION', validatedAt: { not: null },
              content: { contains: `"deliberationId":"${decision.deliberation.id}"` } },
            select: { id: true },
          })
          if (issuedPv) {
            jury = { average: decision.average, creditsAcquired: decision.creditsAcquired,
              decision: decision.decision, date: decision.deliberation.date.toISOString() }
            break
          }
        }
      }

      return NextResponse.json({ transcript, jury, passingGrade, creditsPerYear })
    }

    // ─── Session results: one row per student with at least one published grade ──
    const grades = await db.grade.findMany({
      where: {
        student: { tenantId },
        academicYearId,
        session: sessionType,
        finalGrade: { not: null },
      },
      select: {
        studentId: true,
        finalGrade: true,
        teachingUnitId: true,
        courseElement: { select: { coefficient: true } },
        teachingUnit: { select: { credits: true } },
        student: { select: { id: true, firstName: true, lastName: true, matricule: true } },
      },
    })

    type StudentAgg = {
      student: { id: string; firstName: string; lastName: string; matricule: string | null }
      weightedSum: number
      weightTotal: number
      ues: Map<string, { credits: number; weightedSum: number; weightTotal: number }>
    }
    const byStudent = new Map<string, StudentAgg>()

    for (const g of grades) {
      if (g.finalGrade === null) continue
      const coeff = g.courseElement?.coefficient ?? 1

      let agg = byStudent.get(g.studentId)
      if (!agg) {
        agg = { student: g.student, weightedSum: 0, weightTotal: 0, ues: new Map() }
        byStudent.set(g.studentId, agg)
      }
      agg.weightedSum += g.finalGrade * coeff
      agg.weightTotal += coeff

      const ueId = g.teachingUnitId || 'unknown'
      const existingUe = agg.ues.get(ueId)
      if (existingUe) {
        existingUe.weightedSum += g.finalGrade * coeff
        existingUe.weightTotal += coeff
      } else {
        agg.ues.set(ueId, { credits: g.teachingUnit?.credits ?? 0, weightedSum: g.finalGrade * coeff, weightTotal: coeff })
      }
    }

    const results = Array.from(byStudent.values())
      .map((agg) => {
        const moyenne = agg.weightTotal > 0 ? round2(agg.weightedSum / agg.weightTotal) : 0
        const credits = Array.from(agg.ues.values()).reduce((sum, ue) => {
          const ueAverage = ue.weightTotal > 0 ? round2(ue.weightedSum / ue.weightTotal) : 0
          return ueAverage >= passingGrade ? sum + ue.credits : sum
        }, 0)
        const decision: Decision = moyenne >= passingGrade ? 'Admis' : 'Ajourne'

        return {
          id: agg.student.id,
          name: `${agg.student.lastName.toUpperCase()} ${agg.student.firstName}`,
          matricule: agg.student.matricule || '—',
          moyenne,
          mention: computeMention(moyenne),
          credits,
          decision,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))

    const stats = {
      admis: results.filter((r) => r.decision === 'Admis').length,
      ajournes: results.filter((r) => r.decision === 'Ajourne').length,
      moyenneGenerale: results.length > 0 ? round2(results.reduce((sum, r) => sum + r.moyenne, 0) / results.length) : 0,
    }

    return NextResponse.json({
      results,
      academicYearId,
      academicYearName: academicYear?.name ?? null,
      passingGrade,
      creditsPerYear,
      stats,
    })
  } catch (error) {
    console.error('Results API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch results', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export const GET = withTenantAuth(handleGet)
