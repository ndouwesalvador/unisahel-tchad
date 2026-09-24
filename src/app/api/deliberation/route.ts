import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { isStudentSelfRole } from '@/lib/auth/student-scope'

type Decision = 'ADMI' | 'AJOURNE' | 'REDOUBLANT' | 'EXCLU' | 'ADMI_DETTE' | 'COMPENSE'

type ExpectedGradeItem = {
  studentId: string
  teachingUnitId: string
  courseElementId: string | null
  ueCode: string | null
  ueName: string
  ecCode: string | null
  ecName: string | null
  student: { id: string; firstName: string; lastName: string; matricule: string | null }
}

type MissingGradeItem = {
  ueCode: string | null
  ueName: string
  ecCode: string | null
  ecName: string | null
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

async function resolveCurrentAcademicYear(tenantId: string) {
  return db.academicYear.findFirst({ where: { tenantId, isCurrent: true }, select: { id: true, name: true } })
}

function gradeKey(studentId: string, teachingUnitId: string, courseElementId?: string | null) {
  return `${studentId}:${teachingUnitId}:${courseElementId || 'UE'}`
}

async function computeGradeReadiness(tenantId: string, academicYearId: string, session: string) {
  const registrations = await db.pedagogicalRegistration.findMany({
    where: {
      academicYearId,
      status: 'ACTIVE',
      student: { tenantId },
    },
    select: {
      studentId: true,
      teachingUnitId: true,
      student: { select: { id: true, firstName: true, lastName: true, matricule: true } },
      teachingUnit: {
        select: {
          id: true,
          code: true,
          name: true,
          courseElements: {
            orderBy: { orderIndex: 'asc' },
            select: { id: true, code: true, name: true },
          },
        },
      },
    },
  })

  const expected: ExpectedGradeItem[] = registrations.flatMap((registration): ExpectedGradeItem[] => {
    const elements = registration.teachingUnit.courseElements
    if (elements.length === 0) {
      return [{
        studentId: registration.studentId,
        teachingUnitId: registration.teachingUnitId,
        courseElementId: null,
        ueCode: registration.teachingUnit.code,
        ueName: registration.teachingUnit.name,
        ecCode: null,
        ecName: null,
        student: registration.student,
      }]
    }

    return elements.map((element) => ({
      studentId: registration.studentId,
      teachingUnitId: registration.teachingUnitId,
      courseElementId: element.id,
      ueCode: registration.teachingUnit.code,
      ueName: registration.teachingUnit.name,
      ecCode: element.code,
      ecName: element.name,
      student: registration.student,
    }))
  })

  const lockedGrades = await db.grade.findMany({
    where: {
      student: { tenantId },
      academicYearId,
      session,
      isLocked: true,
      finalGrade: { not: null },
    },
    select: { studentId: true, teachingUnitId: true, courseElementId: true },
  })
  const lockedKeys = new Set(
    lockedGrades
      .filter((grade) => grade.teachingUnitId)
      .map((grade) => gradeKey(grade.studentId, grade.teachingUnitId as string, grade.courseElementId))
  )

  const byStudent = new Map<string, {
    studentId: string
    name: string
    matricule: string
    expected: number
    locked: number
    missing: number
    missingItems: MissingGradeItem[]
  }>()

  for (const item of expected) {
    const existing = byStudent.get(item.studentId) || {
      studentId: item.studentId,
      name: `${item.student.firstName} ${item.student.lastName}`.trim(),
      matricule: item.student.matricule || '—',
      expected: 0,
      locked: 0,
      missing: 0,
      missingItems: [],
    }
    existing.expected += 1

    if (lockedKeys.has(gradeKey(item.studentId, item.teachingUnitId, item.courseElementId))) {
      existing.locked += 1
    } else {
      existing.missing += 1
      existing.missingItems.push({
        ueCode: item.ueCode,
        ueName: item.ueName,
        ecCode: item.ecCode,
        ecName: item.ecName,
      })
    }

    byStudent.set(item.studentId, existing)
  }

  const students = Array.from(byStudent.values()).sort((a, b) => a.name.localeCompare(b.name))
  const expectedGradeCount = students.reduce((sum, student) => sum + student.expected, 0)
  const lockedGradeCount = students.reduce((sum, student) => sum + student.locked, 0)
  const missingGradeCount = Math.max(expectedGradeCount - lockedGradeCount, 0)

  return {
    ready: expectedGradeCount > 0 && missingGradeCount === 0,
    expectedGradeCount,
    lockedGradeCount,
    missingGradeCount,
    studentsTotal: students.length,
    studentsReady: students.filter((student) => student.expected > 0 && student.missing === 0).length,
    incompleteStudents: students
      .filter((student) => student.missing > 0)
      .map((student) => ({ ...student, missingItems: student.missingItems.slice(0, 8) })),
  }
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

async function computeStudentDecisions(tenantId: string, academicYearId: string, session: string) {
  const settings = await db.tenantSettings.findUnique({
    where: { tenantId },
    select: { passingGrade: true, eliminationGrade: true, compensationEnabled: true, creditsPerYear: true },
  })
  const passingGrade = settings?.passingGrade ?? 10
  const eliminationGrade = settings?.eliminationGrade ?? 0
  const compensationEnabled = settings?.compensationEnabled ?? true
  const creditsTotal = settings?.creditsPerYear ?? 60

  const gradeRows = await db.grade.findMany({
    where: { student: { tenantId }, academicYearId, session, isLocked: true, finalGrade: { not: null } },
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
    const sessionType = searchParams.get('session') || 'NORMALE'

    const deliberations = await db.deliberation.findMany({
      where: { tenantId },
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
        computeGradeReadiness(tenantId, deliberation.academicYearId, readinessSession),
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
      return NextResponse.json({ sessions, selected: { id: deliberation.id, isLocked: deliberation.isLocked }, students, readiness })
    }

    // No deliberation selected yet: show a live preview computed from real grades
    const academicYear = await resolveCurrentAcademicYear(tenantId)
    if (!academicYear) {
      return NextResponse.json({ sessions, selected: null, students: [] })
    }
    const [preview, readiness] = await Promise.all([
      computeStudentDecisions(tenantId, academicYear.id, sessionType),
      computeGradeReadiness(tenantId, academicYear.id, sessionType),
    ])
    const students = preview.map((p) => ({ ...p, id: p.studentId, observation: '' }))

    return NextResponse.json({ sessions, selected: null, students, readiness, academicYearName: academicYear.name })
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

    const academicYear = await resolveCurrentAcademicYear(tenantId)
    if (!academicYear) {
      return NextResponse.json({ error: 'No current academic year configured' }, { status: 409 })
    }

    const readiness = await computeGradeReadiness(tenantId, academicYear.id, sessionType)
    if (!readiness.ready) {
      return NextResponse.json(
        { error: 'Les notes verrouillées sont incomplètes pour cette session', readiness },
        { status: 409 }
      )
    }

    const computed = await computeStudentDecisions(tenantId, academicYear.id, sessionType)
    if (computed.length === 0) {
      return NextResponse.json({ error: 'Aucune note trouvee pour cette annee academique' }, { status: 409 })
    }

    const deliberation = await db.deliberation.create({
      data: {
        tenantId,
        academicYearId: academicYear.id,
        type: sessionType === 'RATTRAPAGE' ? 'RATTRAPAGE' : 'ANNUEL',
        name: `Deliberation ${sessionType === 'RATTRAPAGE' ? 'Rattrapage' : 'Normale'} ${academicYear.name}`,
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
    console.error('Launch deliberation error:', error)
    return NextResponse.json({ error: 'Failed to launch deliberation' }, { status: 500 })
  }
}

// PUT /api/deliberation?id=<deliberationId> - lock a deliberation (officialize results)
async function handlePut(_user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 })
    }
    const existing = await db.deliberation.findFirst({ where: { id, tenantId } })
    if (!existing) {
      return NextResponse.json({ error: 'Deliberation not found' }, { status: 404 })
    }
    const sessionType = existing.type === 'RATTRAPAGE' ? 'RATTRAPAGE' : 'NORMALE'
    const readiness = await computeGradeReadiness(tenantId, existing.academicYearId, sessionType)
    if (!readiness.ready) {
      return NextResponse.json(
        { error: 'Les notes verrouillées sont incomplètes pour cette session', readiness },
        { status: 409 }
      )
    }

    const deliberation = await db.deliberation.update({
      where: { id },
      data: { isLocked: true, status: 'TERMINEE' },
    })

    return NextResponse.json({ deliberation })
  } catch (error) {
    console.error('Lock deliberation error:', error)
    return NextResponse.json({ error: 'Failed to lock deliberation' }, { status: 500 })
  }
}

export const GET = withTenantAuth(handleGet)
export const POST = withTenantAuth(handlePost, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'FACULTE', 'JURY'])
export const PUT = withTenantAuth(handlePut, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'FACULTE', 'JURY'])
