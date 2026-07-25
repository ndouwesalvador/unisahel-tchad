import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'

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
      ? db.courseElement.findMany({ where: { id: { in: courseElementIds } }, select: { id: true, name: true } })
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
async function handleGet(_user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const programId = searchParams.get('programId') || undefined
    const levelId = searchParams.get('levelId') || undefined

    const where = {
      tenantId,
      ...(programId ? { programId } : {}),
      ...(levelId ? { levelId } : {}),
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

// POST /api/timetable - create a new slot
async function handlePost(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const { academicYearId, dayOfWeek, startTime, endTime, courseElementId, teacherId, roomId, programId, levelId, type } = body

    if (!academicYearId || dayOfWeek === undefined || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'academicYearId, dayOfWeek, startTime, and endTime are required fields' },
        { status: 400 }
      )
    }

    if (type && !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 })
    }

    const year = await db.academicYear.findFirst({ where: { id: academicYearId, tenantId } })
    if (!year) {
      return NextResponse.json({ error: 'academicYearId not found for this tenant' }, { status: 404 })
    }

    const slot = await db.timetableSlot.create({
      data: {
        tenantId,
        academicYearId,
        dayOfWeek,
        startTime,
        endTime,
        courseElementId: courseElementId ?? null,
        teacherId: teacherId ?? null,
        roomId: roomId ?? null,
        programId: programId ?? null,
        levelId: levelId ?? null,
        type: type ?? undefined,
      },
    })

    await db.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: 'CREATE',
        entity: 'TimetableSlot',
        entityId: slot.id,
        details: JSON.stringify({ dayOfWeek, startTime, endTime }),
      },
    })

    return NextResponse.json({ slot }, { status: 201 })
  } catch (error) {
    console.error('Create timetable slot error:', error)
    return NextResponse.json({ error: 'Failed to create timetable slot' }, { status: 500 })
  }
}

export const GET = withTenantAuth(handleGet)
export const POST = withTenantAuth(handlePost)
