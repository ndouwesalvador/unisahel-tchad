import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth } from '@/lib/auth/helpers'

// GET /api/attendance - List attendance records with computed stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId query parameter is required' },
        { status: 400 }
      )
    }

    const where = { tenantId }

    const [records, present, absent, justified, late] = await Promise.all([
      db.attendance.findMany({
        where,
        orderBy: { date: 'desc' },
        take: 100,
      }),
      db.attendance.count({ where: { ...where, status: 'PRESENT' } }),
      db.attendance.count({ where: { ...where, status: 'ABSENT' } }),
      db.attendance.count({ where: { ...where, status: 'JUSTIFIED' } }),
      db.attendance.count({ where: { ...where, status: 'LATE' } }),
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

    return NextResponse.json({ records, stats })
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
async function handler(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantId, studentName, matricule, course, timeSlot, status, duration, justification, program, level, date } = body

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      )
    }

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

export const POST = withTenantAuth(handler as any)
