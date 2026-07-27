import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'

const KNOWN_STATUSES = ['PLANIFIE', 'CONFIRME', 'EN_COURS', 'TERMINE', 'ANNULE']
const statusToUi: Record<string, string> = {
  PLANIFIE: 'planifie', CONFIRME: 'confirme', EN_COURS: 'en_cours', TERMINE: 'termine', ANNULE: 'annule',
}

async function resolveCurrentAcademicYearId(tenantId: string): Promise<string | null> {
  const current = await db.academicYear.findFirst({ where: { tenantId, isCurrent: true }, select: { id: true } })
  return current?.id ?? null
}

// GET /api/exam-scheduling - real scheduled exams, room occupancy/conflicts, and stats
async function handleGet(_user: SessionUser, tenantId: string) {
  try {
    const [scheduled, rooms] = await Promise.all([
      db.scheduledExam.findMany({
        where: { tenantId },
        orderBy: [{ examDate: 'asc' }, { startTime: 'asc' }],
        take: 200,
      }),
      db.room.findMany({ where: { tenantId, isActive: true }, orderBy: { name: 'asc' } }),
    ])

    const teachingUnitIds = Array.from(new Set(scheduled.map((s) => s.teachingUnitId).filter((id): id is string => Boolean(id))))
    const roomIds = Array.from(new Set(scheduled.map((s) => s.roomId).filter((id): id is string => Boolean(id))))
    const supervisorIds = Array.from(new Set(scheduled.map((s) => s.supervisorId).filter((id): id is string => Boolean(id))))
    const academicYearId = await resolveCurrentAcademicYearId(tenantId)

    const [units, roomRows, supervisors, registrationCounts] = await Promise.all([
      db.teachingUnit.findMany({
        where: { id: { in: teachingUnitIds } },
        select: {
          id: true, code: true, name: true,
          semester: { select: { level: { select: { name: true, program: { select: { name: true } } } } } },
        },
      }),
      db.room.findMany({ where: { id: { in: roomIds } }, select: { id: true, name: true } }),
      db.teacher.findMany({ where: { id: { in: supervisorIds } }, select: { id: true, user: { select: { firstName: true, lastName: true } } } }),
      academicYearId && teachingUnitIds.length > 0
        ? db.pedagogicalRegistration.groupBy({
            by: ['teachingUnitId'],
            where: { teachingUnitId: { in: teachingUnitIds }, academicYearId, status: 'ACTIVE' },
            _count: { id: true },
          })
        : Promise.resolve([]),
    ])

    const unitById = new Map(units.map((u) => [u.id, u]))
    const roomById = new Map(roomRows.map((r) => [r.id, r]))
    const supervisorById = new Map(supervisors.map((s) => [s.id, s]))
    const effectifByUnit = new Map(registrationCounts.map((r) => [r.teachingUnitId, r._count.id]))

    const examEntries = scheduled.map((s) => {
      const unit = s.teachingUnitId ? unitById.get(s.teachingUnitId) : undefined
      const supervisor = s.supervisorId ? supervisorById.get(s.supervisorId) : undefined
      return {
        id: s.id,
        date: s.examDate.toLocaleDateString('fr-FR'),
        heure: `${s.startTime} - ${s.endTime}`,
        ue: unit?.name || '—',
        code: unit?.code || '—',
        programme: unit?.semester.level.program.name || '—',
        niveau: unit?.semester.level.name || '—',
        salle: s.roomId ? roomById.get(s.roomId)?.name || '—' : '—',
        surveillant: supervisor?.user ? `${supervisor.user.firstName} ${supervisor.user.lastName}` : '—',
        effectif: s.teachingUnitId ? effectifByUnit.get(s.teachingUnitId) ?? 0 : 0,
        statut: statusToUi[s.status] || 'planifie',
      }
    })

    // Real room conflicts: same room, same date, overlapping time window
    const byRoomDate = new Map<string, typeof scheduled>()
    for (const s of scheduled) {
      if (!s.roomId || s.status === 'ANNULE') continue
      const key = `${s.roomId}:${s.examDate.toDateString()}`
      const list = byRoomDate.get(key) ?? []
      list.push(s)
      byRoomDate.set(key, list)
    }
    const conflictRoomIds = new Set<string>()
    let conflictCount = 0
    for (const list of byRoomDate.values()) {
      if (list.length < 2) continue
      const sorted = [...list].sort((a, b) => a.startTime.localeCompare(b.startTime))
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].startTime < sorted[i - 1].endTime) {
          conflictCount += 1
          if (sorted[i].roomId) conflictRoomIds.add(sorted[i].roomId as string)
        }
      }
    }

    const occupancyByRoom = new Map<string, number>()
    for (const s of scheduled) {
      if (!s.roomId || s.status === 'ANNULE') continue
      const unit = s.teachingUnitId ? unitById.get(s.teachingUnitId) : undefined
      const count = s.teachingUnitId ? effectifByUnit.get(s.teachingUnitId) ?? 0 : 0
      void unit
      occupancyByRoom.set(s.roomId, Math.max(occupancyByRoom.get(s.roomId) ?? 0, count))
    }

    const roomInfos = rooms.map((r) => ({
      id: r.id,
      name: r.name,
      capacity: r.capacity,
      occupancy: occupancyByRoom.get(r.id) ?? 0,
      hasConflict: conflictRoomIds.has(r.id),
    }))

    const stats = {
      total: examEntries.length,
      enCours: examEntries.filter((e) => e.statut === 'en_cours').length,
      termines: examEntries.filter((e) => e.statut === 'termine').length,
      conflits: conflictCount,
    }

    const distinctSupervisors = new Set(scheduled.filter((s) => s.status !== 'ANNULE' && s.supervisorId).map((s) => s.supervisorId)).size

    return NextResponse.json({ examEntries, rooms: roomInfos, stats, supervisorsAssigned: distinctSupervisors })
  } catch (error) {
    console.error('Exam scheduling API error:', error)
    return NextResponse.json({ error: 'Failed to fetch exam scheduling data' }, { status: 500 })
  }
}

// POST /api/exam-scheduling - schedule a new written exam slot
async function handlePost(_user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const { teachingUnitId, examDate, startTime, endTime, roomId, supervisorId, sessionType } = body

    if (!examDate || !startTime || !endTime) {
      return NextResponse.json({ error: 'examDate, startTime and endTime are required' }, { status: 400 })
    }

    const scheduledExam = await db.scheduledExam.create({
      data: {
        tenantId,
        teachingUnitId: teachingUnitId || null,
        examDate: new Date(examDate),
        startTime,
        endTime,
        roomId: roomId || null,
        supervisorId: supervisorId || null,
        sessionType: sessionType === 'RATTRAPAGE' ? 'RATTRAPAGE' : 'NORMALE',
      },
    })

    return NextResponse.json({ scheduledExam }, { status: 201 })
  } catch (error) {
    console.error('Create scheduled exam error:', error)
    return NextResponse.json({ error: 'Failed to schedule exam' }, { status: 500 })
  }
}

// PUT /api/exam-scheduling?id=X - update a scheduled exam's status
async function handlePut(_user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 })
    }
    const existing = await db.scheduledExam.findFirst({ where: { id, tenantId } })
    if (!existing) {
      return NextResponse.json({ error: 'Scheduled exam not found' }, { status: 404 })
    }

    const body = await request.json()
    const { status } = body
    if (!status || !KNOWN_STATUSES.includes(status)) {
      return NextResponse.json({ error: `status must be one of: ${KNOWN_STATUSES.join(', ')}` }, { status: 400 })
    }

    const scheduledExam = await db.scheduledExam.update({ where: { id }, data: { status } })
    return NextResponse.json({ scheduledExam })
  } catch (error) {
    console.error('Update scheduled exam error:', error)
    return NextResponse.json({ error: 'Failed to update scheduled exam' }, { status: 500 })
  }
}

export const GET = withTenantAuth(handleGet)
export const POST = withTenantAuth(handlePost)
export const PUT = withTenantAuth(handlePut)
