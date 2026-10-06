import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { isStudentSelfRole } from '@/lib/auth/student-scope'
import { computeGradeReadiness } from '@/lib/deliberations/readiness'
import { getOrganizationScope } from '@/lib/auth/organization-scope'
import { getJuryScope, type JuryScope } from '@/lib/auth/jury-scope'
import { parseJuryMembers } from '@/lib/deliberations/jury'

type Decision = 'ADMI' | 'AJOURNE' | 'REDOUBLANT' | 'EXCLU' | 'ADMI_DETTE' | 'COMPENSE'
const DECISIONS = new Set<Decision>(['ADMI', 'AJOURNE', 'REDOUBLANT', 'EXCLU', 'ADMI_DETTE', 'COMPENSE'])

class DecisionEditError extends Error {
  constructor(message: string, readonly status: number) { super(message) }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function juryRuleSummary(settings: { passingGrade: number; eliminationGrade: number; compensationEnabled: boolean; creditsPerYear: number } | null) {
  return {
    passingGrade: settings?.passingGrade ?? 10,
    eliminationGrade: settings?.eliminationGrade ?? 0,
    compensationEnabled: settings?.compensationEnabled ?? true,
    creditsPerYear: settings?.creditsPerYear ?? 60,
  }
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

async function computeStudentDecisions(tenantId: string, academicYearId: string, session: string, studentIds: string[], levelId?: string | null) {
  const settings = await db.tenantSettings.findUnique({
    where: { tenantId },
    select: { passingGrade: true, eliminationGrade: true, compensationEnabled: true, creditsPerYear: true },
  })
  const passingGrade = settings?.passingGrade ?? 10
  const eliminationGrade = settings?.eliminationGrade ?? 0
  const compensationEnabled = settings?.compensationEnabled ?? true
  const creditsTotal = settings?.creditsPerYear ?? 60

  const gradeRows = await db.grade.findMany({
    where: { student: { tenantId }, studentId: { in: studentIds }, academicYearId, session, isLocked: true,
      finalGrade: { not: null }, ...(levelId ? { teachingUnit: { semester: { levelId } } } : {}) },
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

async function availableDepartments(user: SessionUser, tenantId: string, juryScope?: JuryScope | null) {
  if (user.role === 'JURY') {
    const departmentIds = juryScope?.departmentIds ?? []
    if (departmentIds.length === 0) return []
    return db.department.findMany({
      where: { tenantId, isActive: true, id: { in: departmentIds } },
      select: { id: true, name: true, shortName: true }, orderBy: { name: 'asc' },
    })
  }
  const scope = await getOrganizationScope(user, tenantId)
  if (scope && scope.departmentIds.length === 0) return []
  return db.department.findMany({
    where: { tenantId, isActive: true, ...(scope ? { id: { in: scope.departmentIds } } : {}) },
    select: { id: true, name: true, shortName: true }, orderBy: { name: 'asc' },
  })
}

function findJuryAssignment(scope: JuryScope, programId?: string | null, levelId?: string | null) {
  if (!programId && !levelId && scope.assignments.length === 1) return scope.assignments[0]
  if (!programId || !levelId) return null
  return scope.assignments.find((assignment) => assignment.programId === programId && assignment.levelId === levelId) ?? null
}

function juryDeliberationFilters(scope: JuryScope) {
  return scope.assignments.map((assignment) => ({
    academicYearId: scope.academicYearId,
    departmentId: assignment.departmentId,
    programId: assignment.programId,
    levelId: assignment.levelId,
  }))
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
    const programId = searchParams.get('programId')
    const levelId = searchParams.get('levelId')
    const sessionType = searchParams.get('session') || 'NORMALE'
    const academicYear = await resolveCurrentAcademicYear(tenantId)
    const juryScope = user.role === 'JURY'
      ? await getJuryScope(user, tenantId, academicYear?.id)
      : null
    const departments = await availableDepartments(user, tenantId, juryScope)
    const permittedIds = new Set(departments.map((department) => department.id))
    if (departmentId && !permittedIds.has(departmentId)) {
      return NextResponse.json({ error: 'Département inaccessible' }, { status: 403 })
    }
    const selectedAssignment = juryScope ? findJuryAssignment(juryScope, programId, levelId) : null
    if (juryScope && (programId || levelId) && !selectedAssignment) {
      return NextResponse.json({ error: 'Programme ou niveau hors du périmètre du jury' }, { status: 403 })
    }
    const selectedDepartmentId = selectedAssignment?.departmentId || departmentId || (departments.length === 1 ? departments[0].id : null)

    const scopeFilters = juryScope ? juryDeliberationFilters(juryScope) : []
    const deliberationWhere = juryScope
      ? {
          tenantId,
          OR: selectedAssignment
            ? [{ academicYearId: juryScope.academicYearId, departmentId: selectedAssignment.departmentId,
                programId: selectedAssignment.programId, levelId: selectedAssignment.levelId }]
            : scopeFilters,
        }
      : { tenantId, departmentId: { in: Array.from(permittedIds) }, ...(selectedDepartmentId ? { departmentId: selectedDepartmentId } : {}) }

    const deliberations = await db.deliberation.findMany({
      where: deliberationWhere,
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
      programId: d.programId,
      levelId: d.levelId,
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
        db.tenantSettings.findUnique({ where: { tenantId }, select: {
          creditsPerYear: true, passingGrade: true, eliminationGrade: true, compensationEnabled: true,
        } }),
        computeGradeReadiness(
          tenantId, deliberation.academicYearId, readinessSession, deliberation.departmentId!,
          deliberation.programId ?? undefined, deliberation.levelId ?? undefined
        ),
      ])
      const latestCorrections = decisionRows.length ? await db.auditLog.findMany({
        where: { tenantId, action: 'JURY_DECISION_CHANGED', entity: 'DeliberationDecision',
          entityId: { in: decisionRows.map((decision) => decision.id) } },
        orderBy: { createdAt: 'desc' }, distinct: ['entityId'],
        select: { entityId: true, createdAt: true, user: { select: { firstName: true, lastName: true } } },
      }) : []
      const correctionByDecision = new Map(latestCorrections.map((entry) => [entry.entityId, entry]))
      const creditsTotal = settings?.creditsPerYear ?? 60
      const studentRows = await db.student.findMany({
        where: { id: { in: decisionRows.map((d) => d.studentId) }, tenantId },
        select: { id: true, firstName: true, lastName: true, matricule: true },
      })
      const studentById = new Map(studentRows.map((s) => [s.id, s]))
      const students = decisionRows.map((d) => {
        const student = studentById.get(d.studentId)
        const correction = correctionByDecision.get(d.id)
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
          isModified: d.isModified,
          modificationReason: d.modificationReason || '',
          updatedAt: d.updatedAt.toISOString(),
          modifiedBy: correction?.user ? `${correction.user.firstName} ${correction.user.lastName}`.trim() : null,
          modifiedAt: correction?.createdAt.toISOString() || null,
        }
      })
      return NextResponse.json({
        departments, juryScopes: juryScope?.assignments ?? [], sessions,
        selected: { id: deliberation.id, departmentId: deliberation.departmentId, programId: deliberation.programId,
          levelId: deliberation.levelId, isLocked: deliberation.isLocked, juryMembers: deliberation.juryMembers },
        students, readiness, rules: juryRuleSummary(settings),
      })
    }

    // No deliberation selected yet: show a live preview computed from real grades
    if (!academicYear) {
      return NextResponse.json({ departments, juryScopes: juryScope?.assignments ?? [], sessions, selected: null, students: [] })
    }
    if (!selectedDepartmentId || (juryScope && !selectedAssignment)) {
      return NextResponse.json({
        departments, juryScopes: juryScope?.assignments ?? [], sessions,
        selected: null, students: [], readiness: null, academicYearName: academicYear.name,
      })
    }
    const [readiness, settings] = await Promise.all([
      computeGradeReadiness(
        tenantId, academicYear.id, sessionType, selectedDepartmentId,
        selectedAssignment?.programId, selectedAssignment?.levelId
      ),
      db.tenantSettings.findUnique({ where: { tenantId }, select: {
        creditsPerYear: true, passingGrade: true, eliminationGrade: true, compensationEnabled: true,
      } }),
    ])
    const preview = await computeStudentDecisions(
      tenantId, academicYear.id, sessionType, readiness.studentIds, selectedAssignment?.levelId
    )
    const students = preview.map((p) => ({ ...p, id: p.studentId, observation: '' }))

    return NextResponse.json({
      departments, juryScopes: juryScope?.assignments ?? [], sessions, selected: null, students, readiness,
      rules: juryRuleSummary(settings), academicYearName: academicYear.name,
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Deliberation API error:', error)
    return NextResponse.json({ error: 'Failed to fetch deliberation data' }, { status: 500 })
  }
}

// PATCH /api/deliberation?id=...&decisionId=... — reasoned jury correction before finalization.
// A no-op write on the parent row serializes corrections with PUT's final lock.
async function handlePatch(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const decisionId = searchParams.get('decisionId')
    if (!id || !decisionId) return NextResponse.json({ error: 'Délibération et décision requises' }, { status: 400 })

    const body = await request.json().catch(() => ({}))
    const nextDecision = body.decision
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
    if (!DECISIONS.has(nextDecision) || reason.length < 10 || reason.length > 1000 ||
        typeof body.expectedUpdatedAt !== 'string' || !Number.isFinite(Date.parse(body.expectedUpdatedAt))) {
      return NextResponse.json({ error: 'Décision, motif de 10 à 1000 caractères et version actuelle requis' }, { status: 400 })
    }

    const deliberation = await db.deliberation.findFirst({
      where: { id, tenantId },
      select: { academicYearId: true, departmentId: true, programId: true, levelId: true },
    })
    if (!deliberation) return NextResponse.json({ error: 'Délibération introuvable' }, { status: 404 })
    const juryScope = user.role === 'JURY' ? await getJuryScope(user, tenantId, deliberation.academicYearId) : null
    const departments = await availableDepartments(user, tenantId, juryScope)
    const permittedIds = departments.map((department) => department.id)
    if (permittedIds.length === 0) return NextResponse.json({ error: 'Département inaccessible' }, { status: 403 })
    if (juryScope && !juryScope.assignments.some((assignment) =>
      assignment.departmentId === deliberation.departmentId && assignment.programId === deliberation.programId &&
      assignment.levelId === deliberation.levelId)) {
      return NextResponse.json({ error: 'Délibération hors du périmètre du jury' }, { status: 403 })
    }

    const updated = await db.$transaction(async (tx) => {
      const parent = await tx.deliberation.updateMany({
        where: { id, tenantId, departmentId: { in: permittedIds }, isLocked: false, status: 'EN_COURS' },
        data: { updatedAt: new Date() },
      })
      if (parent.count !== 1) throw new DecisionEditError('Délibération introuvable, inaccessible ou finalisée', 409)

      const previous = await tx.deliberationDecision.findFirst({
        where: { id: decisionId, deliberationId: id },
        select: { id: true, studentId: true, decision: true, updatedAt: true },
      })
      if (!previous) throw new DecisionEditError('Décision introuvable dans cette délibération', 404)
      if (previous.updatedAt.toISOString() !== body.expectedUpdatedAt) {
        throw new DecisionEditError('La décision a changé depuis son ouverture. Rechargez-la avant de corriger.', 409)
      }
      if (previous.decision === nextDecision) throw new DecisionEditError('Choisissez une décision différente', 409)

      const decision = await tx.deliberationDecision.update({
        where: { id: decisionId },
        data: { decision: nextDecision, isModified: true, modificationReason: reason },
      })
      await tx.auditLog.create({ data: {
        tenantId, userId: user.id, action: 'JURY_DECISION_CHANGED', entity: 'DeliberationDecision', entityId: decisionId,
        details: JSON.stringify({ deliberationId: id, studentId: previous.studentId,
          from: previous.decision, to: nextDecision, reason }),
      } })
      return decision
    })

    return NextResponse.json({ decision: updated })
  } catch (error) {
    if (error instanceof DecisionEditError) return NextResponse.json({ error: error.message }, { status: error.status })
    // eslint-disable-next-line no-console
    console.error('Correct deliberation decision error:', error)
    return NextResponse.json({ error: 'Échec de la correction de la décision' }, { status: 500 })
  }
}

// POST /api/deliberation - launch a new deliberation for the current academic year,
// auto-computing every student's decision from real Grade data
async function handlePost(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const sessionType = body.session === 'RATTRAPAGE' ? 'RATTRAPAGE' : 'NORMALE'
    const academicYear = await resolveCurrentAcademicYear(tenantId)
    if (!academicYear) {
      return NextResponse.json({ error: 'No current academic year configured' }, { status: 409 })
    }
    const juryScope = user.role === 'JURY' ? await getJuryScope(user, tenantId, academicYear.id) : null
    const departments = await availableDepartments(user, tenantId, juryScope)
    const selectedAssignment = juryScope ? findJuryAssignment(juryScope, body.programId, body.levelId) : null
    if (juryScope && !selectedAssignment) {
      return NextResponse.json({ error: 'Sélectionnez un programme et un niveau affectés à ce jury' }, { status: 403 })
    }
    const department = selectedAssignment
      ? departments.find((item) => item.id === selectedAssignment.departmentId)
      : departments.find((item) => item.id === body.departmentId) ||
        (departments.length === 1 && !body.departmentId ? departments[0] : null)
    if (!department) return NextResponse.json({ error: 'Département inaccessible ou non sélectionné' }, { status: 403 })

    let selectedProgramId: string | undefined = selectedAssignment?.programId
    let selectedLevelId: string | undefined = selectedAssignment?.levelId
    let scopeLabel = selectedAssignment ? `${selectedAssignment.programName} · ${selectedAssignment.levelName}` : department.name
    if (!juryScope && (body.programId || body.levelId)) {
      if (!body.programId || !body.levelId) {
        return NextResponse.json({ error: 'Le programme et le niveau doivent être sélectionnés ensemble' }, { status: 400 })
      }
      const level = await db.level.findFirst({
        where: { id: body.levelId, programId: body.programId, isActive: true,
          program: { tenantId, departmentId: department.id, isActive: true } },
        select: { id: true, name: true, program: { select: { id: true, name: true } } },
      })
      if (!level) return NextResponse.json({ error: 'Programme ou niveau inaccessible' }, { status: 403 })
      selectedProgramId = level.program.id
      selectedLevelId = level.id
      scopeLabel = `${level.program.name} · ${level.name}`
    }

    const readiness = await computeGradeReadiness(
      tenantId, academicYear.id, sessionType, department.id, selectedProgramId, selectedLevelId
    )
    if (!readiness.ready) {
      return NextResponse.json(
        { error: 'Les notes sont incomplètes ou incohérentes pour cette session', readiness },
        { status: 409 }
      )
    }

    const computed = await computeStudentDecisions(tenantId, academicYear.id, sessionType, readiness.studentIds, selectedLevelId)
    if (computed.length === 0) {
      return NextResponse.json({ error: 'Aucune note trouvee pour cette annee academique' }, { status: 409 })
    }

    const existing = await db.deliberation.findFirst({
      where: { tenantId, academicYearId: academicYear.id, departmentId: department.id,
        programId: selectedProgramId ?? null, levelId: selectedLevelId ?? null,
        type: sessionType === 'RATTRAPAGE' ? 'RATTRAPAGE' : 'ANNUEL' },
      select: { id: true },
    })
    if (existing) return NextResponse.json({ error: 'Une délibération existe déjà pour ce périmètre et cette session', id: existing.id }, { status: 409 })

    const deliberation = await db.deliberation.create({
      data: {
        tenantId,
        academicYearId: academicYear.id,
        departmentId: department.id,
        programId: selectedProgramId,
        levelId: selectedLevelId,
        type: sessionType === 'RATTRAPAGE' ? 'RATTRAPAGE' : 'ANNUEL',
        name: `Délibération ${scopeLabel} · ${sessionType === 'RATTRAPAGE' ? 'Rattrapage' : 'Normale'} ${academicYear.name}`,
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
      return NextResponse.json({ error: 'Une délibération existe déjà pour ce périmètre et cette session' }, { status: 409 })
    }
    // eslint-disable-next-line no-console
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
    const juryScope = user.role === 'JURY' ? await getJuryScope(user, tenantId, existing.academicYearId) : null
    const departments = await availableDepartments(user, tenantId, juryScope)
    if (!existing.departmentId || !departments.some((department) => department.id === existing.departmentId)) {
      return NextResponse.json({ error: 'Département inaccessible' }, { status: 403 })
    }
    if (juryScope && !juryScope.assignments.some((assignment) =>
      assignment.departmentId === existing.departmentId && assignment.programId === existing.programId &&
      assignment.levelId === existing.levelId)) {
      return NextResponse.json({ error: 'Délibération hors du périmètre du jury' }, { status: 403 })
    }
    if (existing.isLocked) return NextResponse.json({ error: 'Cette délibération est déjà finalisée' }, { status: 409 })
    const sessionType = existing.type === 'RATTRAPAGE' ? 'RATTRAPAGE' : 'NORMALE'
    const readiness = await computeGradeReadiness(
      tenantId, existing.academicYearId, sessionType, existing.departmentId,
      existing.programId ?? undefined, existing.levelId ?? undefined
    )
    if (!readiness.ready) {
      return NextResponse.json(
        { error: 'Les notes sont incomplètes ou incohérentes pour cette session', readiness },
        { status: 409 }
      )
    }
    const decisions = await db.deliberationDecision.findMany({ where: { deliberationId: id }, select: { studentId: true, decision: true } })
    const decisionIds = decisions.map((decision) => decision.studentId)
    if (decisionIds.length !== readiness.studentIds.length || new Set(decisionIds).size !== decisionIds.length ||
        decisionIds.some((studentId) => !readiness.studentIds.includes(studentId)) ||
        decisions.some((decision) => !DECISIONS.has(decision.decision as Decision))) {
      return NextResponse.json({ error: 'Les décisions ne correspondent plus aux inscrits du programme et du niveau' }, { status: 409 })
    }

    const locked = await db.deliberation.updateMany({
      where: { id, tenantId, isLocked: false },
      data: { isLocked: true, status: 'TERMINEE', lockedBy: user.id, juryMembers },
    })
    if (locked.count !== 1) return NextResponse.json({ error: 'Cette délibération vient d’être finalisée' }, { status: 409 })
    const deliberation = await db.deliberation.findFirst({ where: { id, tenantId } })

    return NextResponse.json({ deliberation })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Lock deliberation error:', error)
    return NextResponse.json({ error: 'Failed to lock deliberation' }, { status: 500 })
  }
}

export const GET = withTenantAuth(handleGet, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'FACULTE', 'DEPARTEMENT', 'JURY'])
export const POST = withTenantAuth(handlePost, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'FACULTE', 'DEPARTEMENT', 'JURY'])
export const PUT = withTenantAuth(handlePut, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'FACULTE', 'DEPARTEMENT', 'JURY'])
export const PATCH = withTenantAuth(handlePatch, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'FACULTE', 'DEPARTEMENT', 'JURY'])
