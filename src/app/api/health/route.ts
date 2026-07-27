import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { resolveOwnStudentId, isStudentSelfRole } from '@/lib/auth/student-scope'

function formatFr(date: Date | null | undefined): string {
  if (!date) return ''
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

const KNOWN_SHIFTS = ['JOUR', 'NUIT']

// GET /api/health - clinical internships, hospitals, guard duties, and one student's carnet
async function handleGet(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const requestedStudentId = searchParams.get('studentId')
    const ownStudentId = await resolveOwnStudentId(user)
    if (ownStudentId && requestedStudentId && requestedStudentId !== ownStudentId) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Accès refusé' }, { status: 403 })
    }
    // A student account can never see the institution-wide overview (all students'
    // internships/guard duties) -- always resolve to their own carnet, even with no ?studentId.
    if (isStudentSelfRole(user.role) && !ownStudentId) {
      return NextResponse.json({ carnet: null, competenceCategories: [] })
    }
    const studentId = ownStudentId ?? requestedStudentId

    // ─── One student's carnet de stage ─────────────────────────────────────
    if (studentId) {
      const [internship, attendances, skills, studentSkills] = await Promise.all([
        db.clinicalInternship.findFirst({
          where: { studentId, tenantId },
          orderBy: { startDate: 'desc' },
          include: { hospital: { select: { name: true } }, clinicalDepartment: { select: { name: true } } },
        }),
        db.clinicalAttendance.findMany({ where: { studentId, tenantId }, orderBy: { date: 'asc' }, take: 60 }),
        db.clinicalSkill.findMany({ where: { isActive: true } }),
        db.studentClinicalSkill.findMany({ where: { studentId } }),
      ])

      const studentSkillByskillId = new Map(studentSkills.map((s) => [s.skillId, s]))
      const categories = new Map<string, { id: string; nom: string; competences: { id: string; nom: string; statut: string; date: string }[] }>()
      for (const skill of skills) {
        const entry = studentSkillByskillId.get(skill.id)
        const statut = entry?.status === 'VALIDATED' ? 'validee' : entry?.status === 'IN_PROGRESS' ? 'en_cours' : 'non_acquise'
        if (!categories.has(skill.category)) {
          categories.set(skill.category, { id: skill.category, nom: skill.category, competences: [] })
        }
        categories.get(skill.category)!.competences.push({
          id: skill.id, nom: skill.name, statut, date: formatFr(entry?.validationDate),
        })
      }

      let evaluation = null
      if (internship) {
        evaluation = await db.clinicalEvaluation.findFirst({
          where: { internshipId: internship.id },
          orderBy: { date: 'desc' },
        })
      }

      const presences = attendances.map((a) => ({ date: formatFr(a.date), present: a.status === 'PRESENT' }))
      const validatedSkillNames = Array.from(categories.values())
        .flatMap((c) => c.competences)
        .filter((c) => c.statut === 'validee')
        .map((c) => c.nom)

      return NextResponse.json({
        carnet: internship ? {
          etudiantId: studentId,
          hopital: internship.hospital?.name || '—',
          service: internship.clinicalDepartment?.name || '—',
          debut: formatFr(internship.startDate),
          fin: formatFr(internship.endDate),
          maitre: '—',
          presences,
          competencesValidees: validatedSkillNames,
          evaluation: evaluation ? {
            comportement: evaluation.behaviorGrade ?? 0,
            competence: evaluation.competenceGrade ?? 0,
            pratique: evaluation.practicalGrade ?? 0,
            note: evaluation.overallGrade ?? 0,
          } : null,
        } : null,
        competenceCategories: Array.from(categories.values()),
      })
    }

    // ─── Overview: hospitals, stages, gardes, alerts, stats ────────────────
    const [hospitalsRaw, internships, gardesRaw, pendingSkillsCount, studentsWithInternship] = await Promise.all([
      db.hospital.findMany({
        where: { tenantId },
        include: { departments: { select: { name: true } }, _count: { select: { clinicalInternships: true } } },
        orderBy: { name: 'asc' },
      }),
      db.clinicalInternship.findMany({
        where: { tenantId },
        orderBy: { startDate: 'desc' },
        take: 100,
        include: {
          hospital: { select: { name: true } },
          clinicalDepartment: { select: { name: true } },
        },
      }),
      db.guardDuty.findMany({ where: { tenantId }, orderBy: { date: 'desc' }, take: 100 }),
      db.studentClinicalSkill.count({ where: { status: 'PENDING' } }),
      db.clinicalInternship.findMany({ where: { tenantId }, select: { studentId: true }, distinct: ['studentId'] }),
    ])

    const studentIds = Array.from(new Set([
      ...internships.map((i) => i.studentId),
      ...gardesRaw.map((g) => g.studentId),
    ]))
    const students = await db.student.findMany({
      where: { id: { in: studentIds }, tenantId },
      select: { id: true, firstName: true, lastName: true, currentProgram: { select: { name: true } } },
    })
    const studentById = new Map(students.map((s) => [s.id, s]))

    const hospitals = hospitalsRaw.map((h) => ({
      id: h.id,
      nom: h.name,
      type: h.type,
      ville: h.city || '—',
      adresse: h.address || '—',
      departements: h.departments.map((d) => d.name),
      internes: h._count.clinicalInternships,
      status: h.isActive ? 'actif' : 'alerte',
    }))

    const statusMap: Record<string, string> = { PLANIFIE: 'planifie', EN_COURS: 'en_cours', TERMINE: 'termine', VALIDE: 'valide' }
    const stages = internships.map((i) => {
      const student = studentById.get(i.studentId)
      return {
        id: i.id,
        etudiant: student ? `${student.lastName.toUpperCase()} ${student.firstName}` : '—',
        filiere: student?.currentProgram?.name || '—',
        hopital: i.hospital?.name || '—',
        service: i.clinicalDepartment?.name || '—',
        debut: formatFr(i.startDate),
        fin: formatFr(i.endDate),
        maitre: '—',
        statut: statusMap[i.status] || 'planifie',
      }
    })

    const hospitalById = new Map(hospitalsRaw.map((h) => [h.id, h.name]))
    const gardes = gardesRaw.map((g) => {
      const student = studentById.get(g.studentId)
      return {
        id: g.id,
        date: formatFr(g.date),
        etudiant: student ? `${student.lastName.toUpperCase()} ${student.firstName}` : '—',
        hopital: g.hospitalId ? hospitalById.get(g.hospitalId) || '—' : '—',
        service: g.service || '—',
        shift: g.shift === 'NUIT' ? 'nuit' : 'jour',
        statut: g.isCompleted ? 'effectuee' : 'planifiee',
      }
    })

    const alertes: { id: string; text: string; severity: string }[] = []
    if (pendingSkillsCount > 0) {
      alertes.push({ id: 'skills-pending', text: `Competence non validee: ${pendingSkillsCount} etudiants`, severity: 'critical' })
    }
    const fullHospitals = hospitals.filter((h) => h.internes >= 15)
    for (const h of fullHospitals) {
      alertes.push({ id: `full-${h.id}`, text: `${h.nom} - forte affluence (${h.internes} internes)`, severity: 'warning' })
    }

    const stagesEnCours = stages.filter((s) => s.statut === 'en_cours').length
    const etudiantsEnStage = studentsWithInternship.length

    const allSkillsCount = await db.studentClinicalSkill.count()
    const validatedSkillsCount = await db.studentClinicalSkill.count({ where: { status: 'VALIDATED' } })
    const competencePercent = allSkillsCount > 0 ? Math.round((validatedSkillsCount / allSkillsCount) * 100) : 0

    return NextResponse.json({
      hospitals,
      stages,
      gardes,
      alertes,
      students: students.map((s) => ({ id: s.id, name: `${s.lastName.toUpperCase()} ${s.firstName}` })),
      stats: { stagesEnCours, etudiantsEnStage, competencePercent, totalHospitals: hospitals.length },
    })
  } catch (error) {
    console.error('Health API error:', error)
    return NextResponse.json({ error: 'Failed to fetch health data' }, { status: 500 })
  }
}

// POST /api/health?entity=garde - schedule a new guard duty
async function createGardeHandler(_user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const { studentId, date, shift, service, hospitalId } = body

    if (!studentId || !date) {
      return NextResponse.json({ error: 'studentId and date are required' }, { status: 400 })
    }
    if (shift !== undefined && !KNOWN_SHIFTS.includes(shift)) {
      return NextResponse.json({ error: `shift must be one of: ${KNOWN_SHIFTS.join(', ')}` }, { status: 400 })
    }

    const student = await db.student.findFirst({ where: { id: studentId, tenantId }, select: { id: true } })
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const garde = await db.guardDuty.create({
      data: {
        tenantId,
        studentId,
        date: new Date(date),
        shift: shift ?? undefined,
        service: service || null,
        hospitalId: hospitalId || null,
      },
    })

    return NextResponse.json({ garde }, { status: 201 })
  } catch (error) {
    console.error('Create garde error:', error)
    return NextResponse.json({ error: 'Failed to create garde' }, { status: 500 })
  }
}

export const GET = withTenantAuth(handleGet)

export const POST = withTenantAuth(async (user: SessionUser, tenantId: string, request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('entity') === 'garde') {
    return createGardeHandler(user, tenantId, request)
  }
  return NextResponse.json({ error: 'Unsupported entity' }, { status: 400 })
})
