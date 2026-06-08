import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth } from '@/lib/auth/helpers'

// GET /api/rooms - List rooms with stats
async function handleGet(request: NextRequest) {
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

    const [rooms, total, available, occupied, maintenance] = await Promise.all([
      db.room.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      db.room.count({ where }),
      db.room.count({ where: { ...where, status: 'libre' } }),
      db.room.count({ where: { ...where, status: 'occupee' } }),
      db.room.count({ where: { ...where, status: 'maintenance' } }),
    ])

    // Count today's reservations
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const todayReservations = await db.roomReservation.count({
      where: {
        tenantId,
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    })

    const stats = {
      total,
      available,
      occupied,
      maintenance,
      todayReservations,
    }

    return NextResponse.json({ data: rooms, stats })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Rooms API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rooms' },
      { status: 500 }
    )
  }
}

export const GET = withTenantAuth(handleGet as any)

// POST /api/rooms - Create a new room reservation
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      tenantId,
      roomId,
      date,
      startTime,
      endTime,
      purpose,
      organizer,
      participants,
      notes,
    } = body

    // Validate required fields
    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      )
    }

    if (!roomId || !date || !startTime || !endTime || !purpose || !organizer) {
      return NextResponse.json(
        { error: 'roomId, date, startTime, endTime, purpose, and organizer are required fields' },
        { status: 400 }
      )
    }

    // Validate purpose
    const validPurposes = ['Cours', 'Conference', 'Reunion', 'Examen', 'Autre']
    if (!validPurposes.includes(purpose)) {
      return NextResponse.json(
        { error: `purpose must be one of: ${validPurposes.join(', ')}` },
        { status: 400 }
      )
    }

    // Check that the room exists
    const room = await db.room.findUnique({
      where: { id: roomId },
    })

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      )
    }

    // Check for time conflicts on the same room and date
    const reservationDate = new Date(date)
    const dayStart = new Date(reservationDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(reservationDate)
    dayEnd.setHours(23, 59, 59, 999)

    const existingReservations = await db.roomReservation.findMany({
      where: {
        roomId,
        date: {
          gte: dayStart,
          lte: dayEnd,
        },
        status: {
          in: ['confirmee', 'en_attente'],
        },
      },
    })

    // Check for overlapping time slots
    const hasConflict = existingReservations.some((reservation) => {
      const existingStart = reservation.startTime
      const existingEnd = reservation.endTime
      // Overlap condition: new start < existing end AND new end > existing start
      return startTime < existingEnd && endTime > existingStart
    })

    if (hasConflict) {
      return NextResponse.json(
        { error: 'Time conflict detected: this room already has a reservation that overlaps with the requested time slot' },
        { status: 409 }
      )
    }

    const newReservation = await db.roomReservation.create({
      data: {
        tenantId,
        roomId,
        date: reservationDate,
        startTime,
        endTime,
        purpose,
        organizer,
        participants: participants ?? 0,
        status: 'en_attente',
        notes: notes ?? null,
      },
    })

    return NextResponse.json(
      { data: newReservation, message: 'Reservation creee avec succes' },
      { status: 201 }
    )
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Create room reservation error:', error)
    return NextResponse.json(
      { error: 'Failed to create reservation' },
      { status: 500 }
    )
  }
}

export const POST = withTenantAuth(handlePost as any)
