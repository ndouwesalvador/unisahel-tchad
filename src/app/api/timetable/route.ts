import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { getTeacherScope } from '@/lib/auth/teacher-scope'
import { getOrganizationScope } from '@/lib/auth/organization-scope'

const VALID_TYPES = ['CM', 'TD', 'TP', 'EXAM']

// TimetableSlot only stores scalar FK-style ids (courseElementId, teacherId,
// roomId, programId, levelId), not Prisma relations, so related display
// names (course/teacher/room) are resolved here with a few batched queries
// instead of a Prisma `include`.
async function resolveSlotNames(tenantId: string, slots: { courseElementId: string | null; teacherId: string | null; roomId: string | null }[]) {
  const courseElementIds = [...new Set(slots.map((s) => s.courseElementId).filter((v): v is string => !!v))]
  const teacherIds = [...new Set(slots.map((s) => s.teacherId).filter((v): v is string => !!v))]
  const roomIds = [...new Set(slots.map((s) => s.roomId).filter((v): v is string => !!v))]

  const [courseElements, teachers, rooms] = await Promise.all([
    courseElementIds.length
      ? db.courseElement.findMany({ where: { id: { in: courseElementIds }, teachingUnit: { semester: { level: { program: { tenantId } } } } }, select: { id: true, name: true } })
      : [],
    teacherIds.length
      ? db.teacher.findMany({ where: { id: { in: teacherIds }, tenantId }, select: { id: true, user: { select: { firstName: true, lastName: true } } } })
      : [],
    roomIds.length
      ? db.room.findMany({ where: { id: { in: roomIds }, tenantId }, select: { id: true, name: true } })
      : [],
  ])

  const courseMap = new Map(courseElements.map((c) => [c.id, c.name]))
  const teacherMap = new Map(teachers.map((t) => [t.id, t.user ? `${t.user.firstName} ${t.user.lastName}` : '']))
  const roomMap = new Map(rooms.map((r) => [r.id, r.name]))

  return { courseMap, teacherMap, roomMap }
}

// GET /api/timetable - list weekly timetable slots
async function handleGet(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const programId = searchParams.get('programId') || undefined
    const levelId = searchParams.get('levelId') || undefined
    const academicYearId = searchParams.get('academicYearId') || undefined
    if (academicYearId && !await db.academicYear.findFirst({ where: { id: academicYearId, tenantId }, select: { id: true } })) {
      return NextResponse.json({ error: 'Année académique introuvable' }, { status: 404 })
    }
    const teacherScope = user.role === 'ENSEIGNANT' ? await getTeacherScope(user, tenantId) : null
    if (teacherScope && !teacherScope.linked) return NextResponse.json({ slots: [] })
    const organizationScope = await getOrganizationScope(user, tenantId)
    if (organizationScope && organizationScope.departmentIds.length === 0) return NextResponse.json({ slots: [] })
    const scopedProgramIds = organizationScope ? (await db.program.findMany({
      where: { tenantId, isActive: true, departmentId: { in: organizationScope.departmentIds } }, select: { id: true },
    })).map((program) => program.id) : null
    if (scopedProgramIds && programId && !scopedProgramIds.includes(programId)) {
      return NextResponse.json({ error: 'Programme hors de votre périmètre' }, { status: 403 })
    }

    const where = {
      tenantId,
      ...(scopedProgramIds ? { programId: { in: programId ? [programId] : scopedProgramIds } } : programId ? { programId } : {}),
      ...(levelId ? { levelId } : {}),
      ...(academicYearId ? { academicYearId } : {}),
      ...(teacherScope ? { courseElementId: { in: teacherScope.courseElementIds } } : {}),
    }

    const slots = await db.timetableSlot.findMany({
      where,
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      take: 300,
    })

    const { courseMap, teacherMap, roomMap } = await resolveSlotNames(tenantId, slots)

    const data = slots.map((s) => ({
      id: s.id,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      type: s.type,
      course: (s.courseElementId && courseMap.get(s.courseElementId)) || '',
      teacher: (s.teacherId && teacherMap.get(s.teacherId)) || '',
      room: (s.roomId && roomMap.get(s.roomId)) || '',
      courseElementId: s.courseElementId,
      academicYearId: s.academicYearId,
      teacherId: s.teacherId,
      roomId: s.roomId,
      programId: s.programId,
      levelId: s.levelId,
    }))

    return NextResponse.json({ slots: data })
  } catch (error) {
    console.error('Timetable API error:', error)
    return NextResponse.json({ error: 'Failed to fetch timetable' }, { status: 500 })
  }
}

// POST/PUT /api/timetable - create or revise a slot. The original and target
// program must both belong to the manager's scope.
async function saveSlot(user: SessionUser, tenantId: string, request: NextRequest, existingId?: string) {
  try {
    const existing = existingId ? await db.timetableSlot.findFirst({ where: { id: existingId, tenantId } }) : null
    if (existingId && !existing) return NextResponse.json({ error: 'Créneau introuvable' }, { status: 404 })
    const body = await request.json()
    const { academicYearId, dayOfWeek, startTime, endTime, courseElementId, teacherId, roomId, programId, levelId, type } = body

    if (!academicYearId || dayOfWeek === undefined || !startTime || !endTime || !courseElementId || !teacherId || !roomId || !programId || !levelId) {
      return NextResponse.json(
        { error: 'Année, jour, horaires, programme, niveau, matière, enseignant et salle sont obligatoires.' },
        { status: 400 }
      )
    }

    const day = Number(dayOfWeek)
    if (!Number.isInteger(day) || day < 0 || day > 6 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime)) {
      return NextResponse.json({ error: 'Jour ou horaires invalides' }, { status: 400 })
    }

    if (type && !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 })
    }

    if (startTime >= endTime) {
      return NextResponse.json({ error: 'endTime must be after startTime' }, { status: 400 })
    }

    const year = await db.academicYear.findFirst({ where: { id: academicYearId, tenantId } })
    if (!year) {
      return NextResponse.json({ error: 'academicYearId not found for this tenant' }, { status: 404 })
    }

    const organizationScope = await getOrganizationScope(user, tenantId)
    if (organizationScope && organizationScope.departmentIds.length === 0) {
      return NextResponse.json({ error: 'Aucun département actif ne vous est attribué.' }, { status: 403 })
    }
    if (existing && organizationScope) {
      const originalProgram = existing.programId ? await db.program.findFirst({
        where: { id: existing.programId, tenantId, departmentId: { in: organizationScope.departmentIds } },
        select: { id: true },
      }) : null
      if (!originalProgram) return NextResponse.json({ error: 'Créneau hors de votre périmètre' }, { status: 403 })
    }
    const program = await db.program.findFirst({ where: { id: programId, tenantId, isActive: true }, select: { id: true, departmentId: true } })
    if (!program) return NextResponse.json({ error: 'Programme introuvable' }, { status: 404 })
    if (!program.departmentId) return NextResponse.json({ error: 'Rattachez le programme à un département avant de le planifier.' }, { status: 400 })
    if (organizationScope && !organizationScope.departmentIds.includes(program.departmentId)) {
      return NextResponse.json({ error: 'Ce programme appartient à un autre département.' }, { status: 403 })
    }

    const [teacher, room] = await Promise.all([
      db.teacher.findFirst({ where: { id: teacherId, tenantId, isActive: true }, select: { id: true } }),
      db.room.findFirst({ where: { id: roomId, tenantId, isActive: true }, select: { id: true } }),
    ])
    if (!teacher || !room) return NextResponse.json({ error: 'Enseignant ou salle actif introuvable dans cette institution.' }, { status: 400 })

    if (courseElementId) {
      const element = await db.courseElement.findFirst({
        where: { id: courseElementId, teachingUnit: { semester: { level: { program: { tenantId } } } } },
        select: { teacherId: true, teachingUnit: { select: { responsibleId: true, semester: { select: { level: { select: { id: true, programId: true } } } } } } },
      })
      if (!element) return NextResponse.json({ error: 'Matière introuvable' }, { status: 404 })
      if (programId !== element.teachingUnit.semester.level.programId || levelId !== element.teachingUnit.semester.level.id) {
        return NextResponse.json({ error: 'Programme ou niveau incohérent avec la matière' }, { status: 400 })
      }
      if (teacherId !== element.teacherId && teacherId !== element.teachingUnit.responsibleId) {
        return NextResponse.json({ error: 'Enseignant non affecté à cette matière' }, { status: 400 })
      }
    }

    const slotData = {
        tenantId,
        academicYearId,
        dayOfWeek: day,
        startTime,
        endTime,
        courseElementId: courseElementId ?? null,
        teacherId: teacherId ?? null,
        roomId: roomId ?? null,
        programId: programId ?? null,
        levelId: levelId ?? null,
        type: type ?? undefined,
      }
    let slot: Awaited<ReturnType<typeof db.timetableSlot.create>> | undefined
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        slot = await db.$transaction(async (tx) => {
          const conflicts = await tx.timetableSlot.findMany({
            where: {
              tenantId, academicYearId, dayOfWeek: day,
              startTime: { lt: endTime }, endTime: { gt: startTime },
              ...(existingId ? { id: { not: existingId } } : {}),
              OR: [{ roomId }, { teacherId }, { levelId }],
            }, take: 1,
          })
          if (conflicts.length > 0) throw new Error('SLOT_CONFLICT')
          const saved = existingId
            ? await tx.timetableSlot.update({ where: { id: existingId }, data: slotData })
            : await tx.timetableSlot.create({ data: slotData })
          await tx.auditLog.create({ data: {
            tenantId, userId: user.id, action: existingId ? 'UPDATE' : 'CREATE', entity: 'TimetableSlot', entityId: saved.id,
            details: JSON.stringify({ before: existing ? { programId: existing.programId, levelId: existing.levelId, courseElementId: existing.courseElementId, teacherId: existing.teacherId, roomId: existing.roomId, dayOfWeek: existing.dayOfWeek, startTime: existing.startTime, endTime: existing.endTime } : null, after: slotData }),
          } })
          return saved
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
        break
      } catch (error) {
        if (error instanceof Error && error.message === 'SLOT_CONFLICT') {
          return NextResponse.json({ error: 'Conflit détecté : salle, enseignant ou niveau déjà occupé sur ce créneau.' }, { status: 409 })
        }
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2034' && attempt < 2) continue
        throw error
      }
    }
    if (!slot) return NextResponse.json({ error: 'Conflit de planification, réessayez.' }, { status: 409 })

    return NextResponse.json({ slot }, { status: existingId ? 200 : 201 })
  } catch (error) {
    console.error('Create timetable slot error:', error)
    return NextResponse.json({ error: 'Failed to create timetable slot' }, { status: 500 })
  }
}

async function handlePost(user: SessionUser, tenantId: string, request: NextRequest) {
  return saveSlot(user, tenantId, request)
}

async function handlePut(user: SessionUser, tenantId: string, request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Identifiant du créneau requis' }, { status: 400 })
  return saveSlot(user, tenantId, request, id)
}

async function handleDelete(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Identifiant du créneau requis' }, { status: 400 })
    const slot = await db.timetableSlot.findFirst({ where: { id, tenantId } })
    if (!slot) return NextResponse.json({ error: 'Créneau introuvable' }, { status: 404 })
    const scope = await getOrganizationScope(user, tenantId)
    if (scope) {
      const program = slot.programId ? await db.program.findFirst({
        where: { id: slot.programId, tenantId, departmentId: { in: scope.departmentIds } }, select: { id: true },
      }) : null
      if (!program) return NextResponse.json({ error: 'Créneau hors de votre périmètre' }, { status: 403 })
    }
    await db.$transaction(async (tx) => {
      await tx.timetableSlot.delete({ where: { id } })
      await tx.auditLog.create({ data: {
        tenantId, userId: user.id, action: 'DELETE', entity: 'TimetableSlot', entityId: id,
        details: JSON.stringify({ programId: slot.programId, levelId: slot.levelId, courseElementId: slot.courseElementId, teacherId: slot.teacherId, roomId: slot.roomId, dayOfWeek: slot.dayOfWeek, startTime: slot.startTime, endTime: slot.endTime }),
      } })
    })
    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error('Delete timetable slot error:', error)
    return NextResponse.json({ error: 'Suppression du créneau impossible' }, { status: 500 })
  }
}

export const GET = withTenantAuth(handleGet)
export const POST = withTenantAuth(handlePost, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE', 'FACULTE', 'DEPARTEMENT'])
export const PUT = withTenantAuth(handlePut, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE', 'FACULTE', 'DEPARTEMENT'])
export const DELETE = withTenantAuth(handleDelete, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE', 'FACULTE', 'DEPARTEMENT'])
