import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'

// GET /api/rooms - List rooms with stats
async function handleGet(_user: SessionUser, tenantId: string, _request: NextRequest) {
  try {
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

    // Today's reservations (rows, so we can both count them and fill in
    // each room's per-day schedule below)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const [todayReservationRows, reservations] = await Promise.all([
      db.roomReservation.findMany({
        where: {
          tenantId,
          date: { gte: todayStart, lte: todayEnd },
          status: { in: ['confirmee', 'en_attente'] },
        },
        orderBy: { startTime: 'asc' },
      }),
      // Recent/upcoming reservations across all rooms, for the booking
      // table, conflict detection, and stats on the frontend.
      db.roomReservation.findMany({
        where: { tenantId },
        include: { room: { select: { name: true } } },
        orderBy: { date: 'desc' },
        take: 100,
      }),
    ])

    const todayScheduleByRoom = new Map<string, { start: string; end: string; purpose: string }[]>()
    for (const r of todayReservationRows) {
      const list = todayScheduleByRoom.get(r.roomId) || []
      list.push({ start: r.startTime, end: r.endTime, purpose: r.purpose })
      todayScheduleByRoom.set(r.roomId, list)
    }

    const roomsWithSchedule = rooms.map((room) => ({
      ...room,
      todaySchedule: todayScheduleByRoom.get(room.id) || [],
    }))

    const reservationsData = reservations.map((r) => ({
      id: r.id,
      roomId: r.roomId,
      room: r.room.name,
      date: r.date.toISOString().slice(0, 10),
      startTime: r.startTime,
      endTime: r.endTime,
      purpose: r.purpose,
      organizer: r.organizer,
      participants: r.participants,
      status: r.status,
    }))

    const stats = {
      total,
      available,
      occupied,
      maintenance,
      todayReservations: todayReservationRows.length,
    }

    return NextResponse.json({ data: roomsWithSchedule, stats, reservations: reservationsData })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Rooms API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rooms' },
      { status: 500 }
    )
  }
}

export const GET = withTenantAuth(handleGet)

// POST /api/rooms - Create a new room reservation
async function handlePost(_user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const {
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

    // Check that the room exists in this tenant
    const room = await db.room.findFirst({
      where: { id: roomId, tenantId },
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

export const POST = withTenantAuth(handlePost)
