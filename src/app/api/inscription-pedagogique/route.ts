import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
const REGISTRATION_ROLES = ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'RECTORAT', 'SCOLARITE']

// GET /api/inscription-pedagogique - real registration status per student
// Admin/scolarite tool only -- no student-facing UI calls this, so student-tier
// accounts (who could otherwise dump every student's UE registration status) are blocked.
async function handleGet(_user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')

    const settings = await db.tenantSettings.findUnique({
      where: { tenantId },
      select: {
        pedagogicalRegistrationOpen: true,
        creditsPerSemester: true,
        creditsPerYear: true,
        passingGrade: true,
        eliminationGrade: true,
        compensationEnabled: true,
      },
    })
    const registrationOpen = settings?.pedagogicalRegistrationOpen ?? true
    const currentAcademicYear = await db.academicYear.findFirst({
      where: { tenantId, isCurrent: true },
      select: { id: true, name: true },
    })
    const academicYearId = currentAcademicYear?.id ?? null
    const creditsPerSemester = settings?.creditsPerSemester ?? 30
    const rules = {
      creditsPerSemester,
      creditsPerYear: settings?.creditsPerYear ?? 60,
      passingGrade: settings?.passingGrade ?? 10,
      eliminationGrade: settings?.eliminationGrade ?? 8,
      compensationEnabled: settings?.compensationEnabled ?? true,
      minCredits: creditsPerSemester,
      maxCredits: Math.max(creditsPerSemester, Math.ceil(creditsPerSemester * 1.4)),
    }

    // ─── UE picker for a single student ────────────────────────────────────
    if (studentId) {
      const student = await db.student.findFirst({
        where: { id: studentId, tenantId },
        select: { id: true, currentLevelId: true },
      })
      if (!student || !student.currentLevelId) {
        return NextResponse.json({ availableUEs: [], registrationOpen })
      }

      const [teachingUnits, registrations] = await Promise.all([
        db.teachingUnit.findMany({
          where: { semester: { level: { id: student.currentLevelId, isActive: true, program: { tenantId, isActive: true } } } },
          include: { responsible: { include: { user: { select: { firstName: true, lastName: true } } } } },
          orderBy: { orderIndex: 'asc' },
        }),
        academicYearId
          ? db.pedagogicalRegistration.findMany({
              where: { studentId, academicYearId, status: 'ACTIVE' },
              select: { teachingUnitId: true },
            })
          : Promise.resolve([]),
      ])
      const registeredIds = new Set(registrations.map((r) => r.teachingUnitId))

      const availableUEs = teachingUnits.map((ue) => ({
        id: ue.id,
        code: ue.code || ue.id.slice(0, 6).toUpperCase(),
        name: ue.name,
        credits: ue.credits,
        type: ue.type === 'FONDAMENTALE' ? 'obligatoire' : 'optionnelle',
        professor: ue.responsible?.user ? `${ue.responsible.user.firstName} ${ue.responsible.user.lastName}` : '—',
        selected: registeredIds.has(ue.id) || ue.type === 'FONDAMENTALE',
      }))

      return NextResponse.json({ availableUEs, registrationOpen, academicYear: currentAcademicYear, rules })
    }

    // ─── Students list with real registration status ───────────────────────
    const students = await db.student.findMany({
      where: { tenantId, currentLevelId: { not: null } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        matricule: true,
        currentLevelId: true,
        currentProgram: { select: { name: true } },
        currentLevel: { select: { id: true, name: true } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })

    const levelIds = Array.from(new Set(students.map((s) => s.currentLevelId).filter((id): id is string => Boolean(id))))
    const [unitsByLevel, registrationCounts, debtGroups] = await Promise.all([
      db.teachingUnit.findMany({
        where: { semester: { level: { id: { in: levelIds }, program: { tenantId } } } },
        select: { id: true, semester: { select: { levelId: true } } },
      }),
      academicYearId
        ? db.pedagogicalRegistration.findMany({
            where: { academicYearId, status: 'ACTIVE', studentId: { in: students.map((s) => s.id) } },
            select: { studentId: true, teachingUnitId: true },
          })
        : Promise.resolve([]),
      db.payment.groupBy({
        by: ['studentId'],
        where: { tenantId, studentId: { in: students.map((s) => s.id) }, status: 'PENDING' },
        _count: { id: true },
      }),
    ])

    const totalUeByLevel = new Map<string, number>()
    const levelByUnit = new Map<string, string>()
    for (const u of unitsByLevel) {
      const levelId = u.semester.levelId
      levelByUnit.set(u.id, levelId)
      totalUeByLevel.set(levelId, (totalUeByLevel.get(levelId) ?? 0) + 1)
    }
    const studentLevel = new Map(students.map((student) => [student.id, student.currentLevelId]))
    const registeredCountByStudent = new Map<string, number>()
    for (const registration of registrationCounts) {
      if (levelByUnit.get(registration.teachingUnitId) !== studentLevel.get(registration.studentId)) continue
      registeredCountByStudent.set(registration.studentId, (registeredCountByStudent.get(registration.studentId) ?? 0) + 1)
    }
    const debtByStudent = new Set(debtGroups.map((d) => d.studentId))

    const mapped = students.map((s) => {
      const totalUe = s.currentLevelId ? (totalUeByLevel.get(s.currentLevelId) ?? 0) : 0
      const ueInscrites = registeredCountByStudent.get(s.id) ?? 0
      const statut = ueInscrites === 0 ? 'non-commencee' : ueInscrites >= totalUe && totalUe > 0 ? 'complete' : 'en-cours'
      return {
        id: s.id,
        name: `${s.lastName.toUpperCase()} ${s.firstName}`,
        matricule: s.matricule || '—',
        filiere: s.currentProgram?.name || '—',
        niveau: s.currentLevel?.name || '—',
        ueInscrites,
        totalUe,
        statut,
        hasDebt: debtByStudent.has(s.id),
      }
    })

    const stats = {
      completes: mapped.filter((s) => s.statut === 'complete').length,
      enCours: mapped.filter((s) => s.statut === 'en-cours').length,
      nonCommencees: mapped.filter((s) => s.statut === 'non-commencee').length,
      pendingPayments: mapped.filter((s) => s.hasDebt).length,
      completionRate: mapped.length > 0 ? Math.round((mapped.filter((s) => s.statut === 'complete').length / mapped.length) * 100) : 0,
    }

    return NextResponse.json({ students: mapped, stats, registrationOpen, academicYear: currentAcademicYear, rules })
  } catch (error) {
    console.error('Inscription pedagogique API error:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}

// POST /api/inscription-pedagogique - sync a student's UE registrations for the current academic year
class RegistrationRejected extends Error {
  constructor(message: string, public readonly status: number) { super(message) }
}

async function handlePost(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const { studentId, teachingUnitIds } = body
    if (typeof studentId !== 'string' || !Array.isArray(teachingUnitIds) || teachingUnitIds.length > 500 || teachingUnitIds.some((id: unknown) => typeof id !== 'string' || !id)) {
      return NextResponse.json({ error: 'studentId and teachingUnitIds are required' }, { status: 400 })
    }

    const requestedIds = [...new Set(teachingUnitIds as string[])]
    await db.$transaction(async (tx) => {
      const settings = await tx.tenantSettings.findUnique({ where: { tenantId }, select: { pedagogicalRegistrationOpen: true } })
      if (settings && !settings.pedagogicalRegistrationOpen) throw new RegistrationRejected('La période d’inscription pédagogique est clôturée', 409)

      const student = await tx.student.findFirst({ where: { id: studentId, tenantId }, select: { id: true, currentLevelId: true, currentProgramId: true } })
      if (!student) throw new RegistrationRejected('Étudiant introuvable', 404)
      if (!student.currentLevelId) throw new RegistrationRejected('Aucun niveau courant n’est affecté à cet étudiant', 409)

      const level = await tx.level.findFirst({
        where: { id: student.currentLevelId, isActive: true, program: { tenantId, isActive: true } },
        select: { id: true, programId: true },
      })
      if (!level || (student.currentProgramId && student.currentProgramId !== level.programId)) {
        throw new RegistrationRejected('Le niveau et le programme de cet étudiant sont incohérents ou inactifs', 409)
      }
      const year = await tx.academicYear.findFirst({ where: { tenantId, isCurrent: true }, select: { id: true } })
      if (!year) throw new RegistrationRejected('Aucune année académique courante configurée', 409)
      const academicYearId = year.id

      const levelUnits = await tx.teachingUnit.findMany({
        where: { semester: { level: { id: level.id, isActive: true, program: { tenantId, isActive: true } } } },
        select: { id: true, type: true },
      })
      const levelUnitIds = levelUnits.map((unit) => unit.id)
      const availableIds = new Set(levelUnitIds)
      if (requestedIds.some((id) => !availableIds.has(id))) throw new RegistrationRejected('Une ou plusieurs UE ne font pas partie du niveau de cet étudiant', 400)
      if (levelUnits.some((unit) => unit.type === 'FONDAMENTALE' && !requestedIds.includes(unit.id))) {
        throw new RegistrationRejected('Toutes les UE obligatoires doivent être sélectionnées', 400)
      }

      const previousRegistrations = await tx.pedagogicalRegistration.findMany({
        where: { studentId, academicYearId, status: 'ACTIVE', teachingUnitId: { in: levelUnitIds } },
        select: { teachingUnitId: true },
      })
      const removedIds = previousRegistrations.map((row) => row.teachingUnitId).filter((id) => !requestedIds.includes(id))
      if (removedIds.length > 0) {
        const grades = await tx.grade.count({ where: {
          studentId, academicYearId,
          OR: [{ teachingUnitId: { in: removedIds } }, { courseElement: { teachingUnitId: { in: removedIds } } }],
        } })
        if (grades > 0) throw new RegistrationRejected('Une UE évaluée ne peut pas être retirée de l’inscription pédagogique', 409)
        await tx.pedagogicalRegistration.deleteMany({
          where: { studentId, academicYearId, status: 'ACTIVE', teachingUnitId: { in: removedIds } },
        })
      }
      for (const teachingUnitId of requestedIds) {
        await tx.pedagogicalRegistration.upsert({
          where: { studentId_teachingUnitId_academicYearId: { studentId, teachingUnitId, academicYearId } },
          create: { studentId, teachingUnitId, academicYearId, status: 'ACTIVE' },
          update: { status: 'ACTIVE' },
        })
      }
      await tx.auditLog.create({
        data: {
          tenantId,
          userId: user.id,
          action: 'UPDATE',
          entity: 'PedagogicalRegistration',
          entityId: studentId,
          details: JSON.stringify({ academicYearId, before: previousRegistrations.map((row) => row.teachingUnitId), after: requestedIds }),
        },
      })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    return NextResponse.json({ ok: true, registeredCount: requestedIds.length })
  } catch (error) {
    if (error instanceof RegistrationRejected) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('Sync pedagogical registration error:', error)
    return NextResponse.json({ error: 'Failed to save registration' }, { status: 500 })
  }
}

// PUT /api/inscription-pedagogique - open/close the registration period
async function handlePut(_user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const { open } = body
    if (typeof open !== 'boolean') {
      return NextResponse.json({ error: 'open (boolean) is required' }, { status: 400 })
    }
    await db.tenantSettings.update({ where: { tenantId }, data: { pedagogicalRegistrationOpen: open } })
    return NextResponse.json({ registrationOpen: open })
  } catch (error) {
    console.error('Toggle registration period error:', error)
    return NextResponse.json({ error: 'Failed to update registration period' }, { status: 500 })
  }
}

export const GET = withTenantAuth(handleGet, REGISTRATION_ROLES)
export const POST = withTenantAuth(handlePost, REGISTRATION_ROLES)
export const PUT = withTenantAuth(handlePut, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE'])
