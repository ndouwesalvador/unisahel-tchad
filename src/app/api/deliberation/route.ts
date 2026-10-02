import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { isStudentSelfRole } from '@/lib/auth/student-scope'
import { computeGradeReadiness } from '@/lib/deliberations/readiness'
import { getOrganizationScope } from '@/lib/auth/organization-scope'
import { parseJuryMembers } from '@/lib/deliberations/jury'

type Decision = 'ADMI' | 'AJOURNE' | 'REDOUBLANT' | 'EXCLU' | 'ADMI_DETTE' | 'COMPENSE'

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

async function resolveCurrentAcademicYear(tenantId: string) {
  return db.academicYear.findFirst({ where: { tenantId, isCurrent: true }, select: { id: true, name: true } })
}

// Suggested decision from real thresholds - the jury remains the final authority;
// this only gives them a real, defensible starting point instead of a blank table.
function suggestDecision(
  moyenne: number,
  credits: number,
  creditsTotal: number,
  passingGrade: number,
  eliminationGrade: number,
  compensationEnabled: boolean
): Decision {
  if (moyenne <= eliminationGrade) return 'EXCLU'
  if (moyenne >= passingGrade) return credits >= creditsTotal ? 'ADMI' : 'ADMI_DETTE'
  if (compensationEnabled && moyenne >= passingGrade - 2) return 'COMPENSE'
  if (moyenne >= passingGrade - 4) return 'AJOURNE'
  return 'REDOUBLANT'
}

async function computeStudentDecisions(tenantId: string, academicYearId: string, session: string, studentIds: string[]) {
  const settings = await db.tenantSettings.findUnique({
    where: { tenantId },
    select: { passingGrade: true, eliminationGrade: true, compensationEnabled: true, creditsPerYear: true },
  })
  const passingGrade = settings?.passingGrade ?? 10
  const eliminationGrade = settings?.eliminationGrade ?? 0
  const compensationEnabled = settings?.compensationEnabled ?? true
  const creditsTotal = settings?.creditsPerYear ?? 60

  const gradeRows = await db.grade.findMany({
    where: { student: { tenantId }, studentId: { in: studentIds }, academicYearId, session, isLocked: true, finalGrade: { not: null } },
    select: {
      studentId: true,
      finalGrade: true,
      teachingUnitId: true,
      courseElement: { select: { coefficient: true } },
      teachingUnit: { select: { credits: true } },
      student: { select: { id: true, firstName: true, lastName: true, matricule: true } },
    },
  })

  type Agg = {
    student: { id: string; firstName: string; lastName: string; matricule: string | null }
    weightedSum: number
    weightTotal: number
    ues: Map<string, { credits: number; weightedSum: number; weightTotal: number }>
  }
  const byStudent = new Map<string, Agg>()

  for (const g of gradeRows) {
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
    const existing = agg.ues.get(ueId)
    if (existing) {
      existing.weightedSum += g.finalGrade * coeff
      existing.weightTotal += coeff
    } else {
      agg.ues.set(ueId, { credits: g.teachingUnit?.credits ?? 0, weightedSum: g.finalGrade * coeff, weightTotal: coeff })
    }
  }

  return Array.from(byStudent.values()).map((agg) => {
    const moyenne = agg.weightTotal > 0 ? round2(agg.weightedSum / agg.weightTotal) : 0
    const credits = Array.from(agg.ues.values()).reduce((sum, ue) => {
      const ueAvg = ue.weightTotal > 0 ? round2(ue.weightedSum / ue.weightTotal) : 0
      return ueAvg >= passingGrade ? sum + ue.credits : sum
    }, 0)
    return {
      studentId: agg.student.id,
      matricule: agg.student.matricule || '—',
      nom: agg.student.lastName.toUpperCase(),
      prenom: agg.student.firstName,
      moyenne,
      credits,
      creditsTotal,
      decision: suggestDecision(moyenne, credits, creditsTotal, passingGrade, eliminationGrade, compensationEnabled),
    }
  }).sort((a, b) => a.nom.localeCompare(b.nom))
}

async function availableDepartments(user: SessionUser, tenantId: string) {
  const scope = await getOrganizationScope(user, tenantId)
  if (scope && scope.departmentIds.length === 0) return []
  return db.department.findMany({
    where: { tenantId, isActive: true, ...(scope ? { id: { in: scope.departmentIds } } : {}) },
    select: { id: true, name: true, shortName: true }, orderBy: { name: 'asc' },
  })
}

// GET /api/deliberation - list real deliberation sessions + decisions for the selected one
// Jury/admin tool only -- no student-facing UI calls this, and it would otherwise
// expose every student's suggested deliberation decision to any student account.
async function handleGet(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    if (isStudentSelfRole(user.role)) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Accès refusé' }, { status: 403 })
    }
    const { searchParams } = new URL(request.url)
    const deliberationId = searchParams.get('id')
    const departmentId = searchParams.get('departmentId')
    const sessionType = searchParams.get('session') || 'NORMALE'
    const departments = await availableDepartments(user, tenantId)
    const permittedIds = new Set(departments.map((department) => department.id))
    if (departmentId && !permittedIds.has(departmentId)) {
      return NextResponse.json({ error: 'Département inaccessible' }, { status: 403 })
    }
    const selectedDepartmentId = departmentId || (departments.length === 1 ? departments[0].id : null)
    if (!selectedDepartmentId && !deliberationId) {
      return NextResponse.json({ departments, sessions: [], selected: null, students: [], readiness: null })
    }

    const deliberations = await db.deliberation.findMany({
      where: { tenantId, departmentId: { in: Array.from(permittedIds) }, ...(selectedDepartmentId ? { departmentId: selectedDepartmentId } : {}) },
      orderBy: { date: 'desc' },
      take: 50,
    })

    const statusMap: Record<string, string> = { PREPARATION: 'planifiee', EN_COURS: 'en_cours', TERMINEE: 'terminee' }
    const sessions = deliberations.map((d) => ({
      id: d.id,
      titre: d.name,
      date: d.date.toLocaleDateString('fr-FR'),
      statut: statusMap[d.status] || 'planifiee',
      isLocked: d.isLocked,
      type: d.type,
      departmentId: d.departmentId,
      academicYearId: d.academicYearId,
    }))

    if (deliberationId) {
      const deliberation = deliberations.find((d) => d.id === deliberationId)
      if (!deliberation) {
        return NextResponse.json({ error: 'Deliberation not found' }, { status: 404 })
      }
      const readinessSession = deliberation.type === 'RATTRAPAGE' ? 'RATTRAPAGE' : 'NORMALE'
      const [decisionRows, settings, readiness] = await Promise.all([
        db.deliberationDecision.findMany({ where: { deliberationId } }),
        db.tenantSettings.findUnique({ where: { tenantId }, select: { creditsPerYear: true } }),
        computeGradeReadiness(tenantId, deliberation.academicYearId, readinessSession, deliberation.departmentId!),
      ])
      const creditsTotal = settings?.creditsPerYear ?? 60
      const studentRows = await db.student.findMany({
        where: { id: { in: decisionRows.map((d) => d.studentId) }, tenantId },
        select: { id: true, firstName: true, lastName: true, matricule: true },
      })
      const studentById = new Map(studentRows.map((s) => [s.id, s]))
      const students = decisionRows.map((d) => {
        const student = studentById.get(d.studentId)
        return {
          id: d.id,
          studentId: d.studentId,
          matricule: student?.matricule || '—',
          nom: student?.lastName.toUpperCase() || '—',
          prenom: student?.firstName || '',
          moyenne: d.average ?? 0,
          credits: d.creditsAcquired,
          creditsTotal,
          decision: d.decision as Decision,
          observation: d.comment || '',
        }
      })
      return NextResponse.json({ departments, sessions, selected: { id: deliberation.id, departmentId: deliberation.departmentId, isLocked: deliberation.isLocked, juryMembers: deliberation.juryMembers }, students, readiness })
    }

    // No deliberation selected yet: show a live preview computed from real grades
    const academicYear = await resolveCurrentAcademicYear(tenantId)
    if (!academicYear) {
      return NextResponse.json({ departments, sessions, selected: null, students: [] })
    }
    const readiness = await computeGradeReadiness(tenantId, academicYear.id, sessionType, selectedDepartmentId!)
    const preview = await computeStudentDecisions(tenantId, academicYear.id, sessionType, readiness.studentIds)
    const students = preview.map((p) => ({ ...p, id: p.studentId, observation: '' }))

    return NextResponse.json({ departments, sessions, selected: null, students, readiness, academicYearName: academicYear.name })
  } catch (error) {
    console.error('Deliberation API error:', error)
    return NextResponse.json({ error: 'Failed to fetch deliberation data' }, { status: 500 })
  }
}

// POST /api/deliberation - launch a new deliberation for the current academic year,
// auto-computing every student's decision from real Grade data
async function handlePost(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const sessionType = body.session === 'RATTRAPAGE' ? 'RATTRAPAGE' : 'NORMALE'
    const departments = await availableDepartments(user, tenantId)
    const department = departments.find((item) => item.id === body.departmentId) ||
      (departments.length === 1 && !body.departmentId ? departments[0] : null)
    if (!department) return NextResponse.json({ error: 'Département inaccessible ou non sélectionné' }, { status: 403 })

    const academicYear = await resolveCurrentAcademicYear(tenantId)
    if (!academicYear) {
      return NextResponse.json({ error: 'No current academic year configured' }, { status: 409 })
    }

    const readiness = await computeGradeReadiness(tenantId, academicYear.id, sessionType, department.id)
    if (!readiness.ready) {
      return NextResponse.json(
        { error: 'Les notes sont incomplètes ou incohérentes pour cette session', readiness },
        { status: 409 }
      )
    }

    const computed = await computeStudentDecisions(tenantId, academicYear.id, sessionType, readiness.studentIds)
    if (computed.length === 0) {
      return NextResponse.json({ error: 'Aucune note trouvee pour cette annee academique' }, { status: 409 })
    }

    const existing = await db.deliberation.findFirst({
      where: { tenantId, academicYearId: academicYear.id, departmentId: department.id, type: sessionType === 'RATTRAPAGE' ? 'RATTRAPAGE' : 'ANNUEL' },
      select: { id: true },
    })
    if (existing) return NextResponse.json({ error: 'Une délibération existe déjà pour ce département et cette session', id: existing.id }, { status: 409 })

    const deliberation = await db.deliberation.create({
      data: {
        tenantId,
        academicYearId: academicYear.id,
        departmentId: department.id,
        type: sessionType === 'RATTRAPAGE' ? 'RATTRAPAGE' : 'ANNUEL',
        name: `Délibération ${department.name} · ${sessionType === 'RATTRAPAGE' ? 'Rattrapage' : 'Normale'} ${academicYear.name}`,
        date: new Date(),
        status: 'EN_COURS',
        presidentId: user.id,
        decisions: {
          create: computed.map((c) => ({
            studentId: c.studentId,
            decision: c.decision,
            average: c.moyenne,
            creditsAcquired: c.credits,
          })),
        },
      },
      include: { decisions: true },
    })

    return NextResponse.json({ deliberation }, { status: 201 })
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Une délibération existe déjà pour ce département et cette session' }, { status: 409 })
    }
    console.error('Launch deliberation error:', error)
    return NextResponse.json({ error: 'Failed to launch deliberation' }, { status: 500 })
  }
}

// PUT /api/deliberation?id=<deliberationId> - lock a deliberation (officialize results)
async function handlePut(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const juryMembers = parseJuryMembers(body.juryMembers)
    if (!juryMembers) return NextResponse.json({ error: 'Un président et une composition valide du jury sont requis' }, { status: 400 })
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 })
    }
    const existing = await db.deliberation.findFirst({ where: { id, tenantId } })
    if (!existing) {
      return NextResponse.json({ error: 'Deliberation not found' }, { status: 404 })
    }
    const departments = await availableDepartments(user, tenantId)
    if (!existing.departmentId || !departments.some((department) => department.id === existing.departmentId)) {
      return NextResponse.json({ error: 'Département inaccessible' }, { status: 403 })
    }
    if (existing.isLocked) return NextResponse.json({ error: 'Cette délibération est déjà finalisée' }, { status: 409 })
    const sessionType = existing.type === 'RATTRAPAGE' ? 'RATTRAPAGE' : 'NORMALE'
    const readiness = await computeGradeReadiness(tenantId, existing.academicYearId, sessionType, existing.departmentId)
    if (!readiness.ready) {
      return NextResponse.json(
        { error: 'Les notes sont incomplètes ou incohérentes pour cette session', readiness },
        { status: 409 }
      )
    }
    const decisions = await db.deliberationDecision.findMany({ where: { deliberationId: id }, select: { studentId: true } })
    const decisionIds = decisions.map((decision) => decision.studentId)
    if (decisionIds.length !== readiness.studentIds.length || new Set(decisionIds).size !== decisionIds.length ||
        decisionIds.some((studentId) => !readiness.studentIds.includes(studentId))) {
      return NextResponse.json({ error: 'Les décisions ne correspondent plus aux inscrits du département' }, { status: 409 })
    }

    const locked = await db.deliberation.updateMany({
      where: { id, tenantId, isLocked: false },
      data: { isLocked: true, status: 'TERMINEE', lockedBy: user.id, juryMembers },
    })
    if (locked.count !== 1) return NextResponse.json({ error: 'Cette délibération vient d’être finalisée' }, { status: 409 })
    const deliberation = await db.deliberation.findFirst({ where: { id, tenantId } })

    return NextResponse.json({ deliberation })
  } catch (error) {
    console.error('Lock deliberation error:', error)
    return NextResponse.json({ error: 'Failed to lock deliberation' }, { status: 500 })
  }
}

export const GET = withTenantAuth(handleGet, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'FACULTE', 'DEPARTEMENT', 'JURY'])
export const POST = withTenantAuth(handlePost, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'FACULTE', 'DEPARTEMENT', 'JURY'])
export const PUT = withTenantAuth(handlePut, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'FACULTE', 'DEPARTEMENT', 'JURY'])
