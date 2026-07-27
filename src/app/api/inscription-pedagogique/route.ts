import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { isStudentSelfRole } from '@/lib/auth/student-scope'

async function resolveCurrentAcademicYearId(tenantId: string): Promise<string | null> {
  const current = await db.academicYear.findFirst({ where: { tenantId, isCurrent: true }, select: { id: true } })
  return current?.id ?? null
}

// GET /api/inscription-pedagogique - real registration status per student
// Admin/scolarite tool only -- no student-facing UI calls this, so student-tier
// accounts (who could otherwise dump every student's UE registration status) are blocked.
async function handleGet(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    if (isStudentSelfRole(user.role)) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Accès refusé' }, { status: 403 })
    }
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')

    const settings = await db.tenantSettings.findUnique({
      where: { tenantId },
      select: { pedagogicalRegistrationOpen: true },
    })
    const registrationOpen = settings?.pedagogicalRegistrationOpen ?? true
    const academicYearId = await resolveCurrentAcademicYearId(tenantId)

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
          where: { semester: { levelId: student.currentLevelId } },
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
        selected: registeredIds.has(ue.id),
      }))

      return NextResponse.json({ availableUEs, registrationOpen })
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
        where: { semester: { levelId: { in: levelIds } } },
        select: { id: true, semester: { select: { levelId: true } } },
      }),
      academicYearId
        ? db.pedagogicalRegistration.groupBy({
            by: ['studentId'],
            where: { academicYearId, status: 'ACTIVE', studentId: { in: students.map((s) => s.id) } },
            _count: { id: true },
          })
        : Promise.resolve([]),
      db.payment.groupBy({
        by: ['studentId'],
        where: { tenantId, studentId: { in: students.map((s) => s.id) }, status: 'PENDING' },
        _count: { id: true },
      }),
    ])

    const totalUeByLevel = new Map<string, number>()
    for (const u of unitsByLevel) {
      const levelId = u.semester.levelId
      totalUeByLevel.set(levelId, (totalUeByLevel.get(levelId) ?? 0) + 1)
    }
    const registeredCountByStudent = new Map(registrationCounts.map((r) => [r.studentId, r._count.id]))
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
      completionRate: mapped.length > 0 ? Math.round((mapped.filter((s) => s.statut === 'complete').length / mapped.length) * 100) : 0,
    }

    return NextResponse.json({ students: mapped, stats, registrationOpen })
  } catch (error) {
    console.error('Inscription pedagogique API error:', error)
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }
}

// POST /api/inscription-pedagogique - sync a student's UE registrations for the current academic year
async function handlePost(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    if (isStudentSelfRole(user.role)) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Accès refusé' }, { status: 403 })
    }
    const body = await request.json()
    const { studentId, teachingUnitIds } = body
    if (!studentId || !Array.isArray(teachingUnitIds)) {
      return NextResponse.json({ error: 'studentId and teachingUnitIds are required' }, { status: 400 })
    }

    const settings = await db.tenantSettings.findUnique({ where: { tenantId }, select: { pedagogicalRegistrationOpen: true } })
    if (settings && !settings.pedagogicalRegistrationOpen) {
      return NextResponse.json({ error: 'La periode d\'inscription pedagogique est cloturee' }, { status: 409 })
    }

    const student = await db.student.findFirst({ where: { id: studentId, tenantId }, select: { id: true, currentLevelId: true } })
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }
    const academicYearId = await resolveCurrentAcademicYearId(tenantId)
    if (!academicYearId) {
      return NextResponse.json({ error: 'No current academic year configured' }, { status: 409 })
    }

    const validUnits = await db.teachingUnit.findMany({
      where: { id: { in: teachingUnitIds.map(String) }, semester: { levelId: student.currentLevelId ?? undefined } },
      select: { id: true },
    })
    const validIds = validUnits.map((u) => u.id)

    await db.$transaction([
      db.pedagogicalRegistration.deleteMany({
        where: { studentId, academicYearId, teachingUnitId: { notIn: validIds } },
      }),
      ...validIds.map((teachingUnitId) =>
        db.pedagogicalRegistration.upsert({
          where: { studentId_teachingUnitId_academicYearId: { studentId, teachingUnitId, academicYearId } },
          create: { studentId, teachingUnitId, academicYearId, status: 'ACTIVE' },
          update: { status: 'ACTIVE' },
        })
      ),
    ])

    return NextResponse.json({ ok: true, registeredCount: validIds.length })
  } catch (error) {
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

export const GET = withTenantAuth(handleGet)
export const POST = withTenantAuth(handlePost)
export const PUT = withTenantAuth(handlePut, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE'])
