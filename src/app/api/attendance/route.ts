import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'

// GET /api/attendance - List attendance records with computed stats
async function handleGet(_user: SessionUser, tenantId: string, _request: NextRequest) {
  try {
    const where = { tenantId }

    const [records, present, absent, justified, late, pendingJustifications] = await Promise.all([
      db.attendance.findMany({
        where,
        orderBy: { date: 'desc' },
        take: 100,
      }),
      db.attendance.count({ where: { ...where, status: 'PRESENT' } }),
      db.attendance.count({ where: { ...where, status: 'ABSENT' } }),
      db.attendance.count({ where: { ...where, status: 'JUSTIFIED' } }),
      db.attendance.count({ where: { ...where, status: 'LATE' } }),
      // Pending justification requests: an absence for which the student/scolarite
      // already submitted a justification note, but it hasn't been reviewed yet
      // (i.e. not upgraded to status = 'JUSTIFIED').
      db.attendance.findMany({
        where: { ...where, status: 'ABSENT', justification: { not: null } },
        orderBy: { date: 'desc' },
        take: 50,
      }),
    ])

    const total = present + absent + justified + late
    const attendanceRate = total > 0 ? Math.round(((present + late) / total) * 100) : 0

    const stats = {
      present,
      absent,
      justified,
      late,
      total,
      attendanceRate,
    }

    return NextResponse.json({ records, stats, pendingJustifications })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Attendance API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attendance records' },
      { status: 500 }
    )
  }
}

// POST /api/attendance - Create a new attendance record
async function handlePost(_user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const { studentName, matricule, course, timeSlot, status, duration, justification, program, level, date } = body

    if (!studentName || !matricule || !course || !timeSlot || !status) {
      return NextResponse.json(
        { error: 'studentName, matricule, course, timeSlot, and status are required fields' },
        { status: 400 }
      )
    }

    const validStatuses = ['PRESENT', 'ABSENT', 'JUSTIFIED', 'LATE']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const record = await db.attendance.create({
      data: {
        tenantId,
        studentName,
        matricule,
        course,
        timeSlot,
        status,
        duration: duration ?? null,
        justification: justification ?? null,
        program: program ?? null,
        level: level ?? null,
        date: date ? new Date(date) : new Date(),
      },
    })

    return NextResponse.json({ record }, { status: 201 })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Create attendance error:', error)
    return NextResponse.json(
      { error: 'Failed to create attendance record' },
      { status: 500 }
    )
  }
}

const JUSTIFICATION_REVIEW_ACTIONS = ['approve', 'reject'] as const

// PUT /api/attendance?id=X - review a pending absence-justification request
// action=approve upgrades the record to status: 'JUSTIFIED'
// action=reject clears the submitted justification note (the absence stays
// unjustified; there is no separate "rejected" state in the schema)
async function handlePut(_user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 })
    }

    const existing = await db.attendance.findFirst({ where: { id, tenantId } })
    if (!existing) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 })
    }

    const body = await request.json()
    const { action } = body

    if (!action || !JUSTIFICATION_REVIEW_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: `action must be one of: ${JUSTIFICATION_REVIEW_ACTIONS.join(', ')}` },
        { status: 400 }
      )
    }

    const record = await db.attendance.update({
      where: { id },
      data: action === 'approve' ? { status: 'JUSTIFIED' } : { justification: null },
    })

    return NextResponse.json({ record })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Update attendance error:', error)
    return NextResponse.json(
      { error: 'Failed to update attendance record' },
      { status: 500 }
    )
  }
}

export const GET = withTenantAuth(handleGet)
export const POST = withTenantAuth(handlePost)
export const PUT = withTenantAuth(handlePut)
