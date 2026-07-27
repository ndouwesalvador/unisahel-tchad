import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'

// ─── Helpers ────────────────────────────────────────────────────────────────

// TransportDeparture only stores a start time ("06:00"). The end time shown
// in the fleet mini-timeline is derived from the owning route's free-text
// durationLabel (e.g. "45 min", "1h", "1h30") whenever it can be parsed as a
// number of minutes. When it can't be parsed (missing or unrecognised
// format), the end simply falls back to the start time instead of
// fabricating a number that has no basis in stored data.
function parseDurationMinutes(label?: string | null): number | null {
  if (!label) return null
  let total = 0
  let matched = false

  const hourMatch = label.match(/(\d+)\s*h/i)
  if (hourMatch) {
    total += parseInt(hourMatch[1], 10) * 60
    matched = true
  }

  const minMatch = label.match(/(\d+)\s*min/i)
  if (minMatch) {
    total += parseInt(minMatch[1], 10)
    matched = true
  }

  if (!matched) {
    const digitsOnly = label.match(/^(\d+)$/)
    if (digitsOnly) {
      total = parseInt(digitsOnly[1], 10)
      matched = true
    }
  }

  return matched ? total : null
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map((n) => parseInt(n, 10))
  if (Number.isNaN(h) || Number.isNaN(m)) return time
  const total = (((h * 60 + m + minutes) % 1440) + 1440) % 1440
  const hh = Math.floor(total / 60).toString().padStart(2, '0')
  const mm = (total % 60).toString().padStart(2, '0')
  return `${hh}:${mm}`
}

function timeAgo(date: Date): string {
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000)
  if (diffMin < 1) return "À l'instant"
  if (diffMin < 60) return `Il y a ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `Il y a ${diffH}h`
  const diffJ = Math.floor(diffH / 24)
  return `Il y a ${diffJ}j`
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

const VEHICLE_STATUSES = ['en_service', 'en_maintenance', 'en_panne']
const ALERT_SEVERITIES = ['critique', 'avertissement', 'info']

// ─── GET /api/transport - fleet, routes, departures board, maintenance & alerts ─

async function handleGet(_user: SessionUser, tenantId: string, _request: NextRequest) {
  try {
    const where = { tenantId }

    const [vehicles, routes, departures, maintenanceRows, alertRows, subscriptionGroups] = await Promise.all([
      db.transportVehicle.findMany({
        where,
        include: { route: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      db.transportRoute.findMany({ where, orderBy: { createdAt: 'desc' } }),
      db.transportDeparture.findMany({
        where,
        include: {
          vehicle: { select: { id: true, name: true, capacity: true, driverName: true } },
          route: { select: { id: true, name: true, durationLabel: true } },
        },
        orderBy: { departureTime: 'asc' },
      }),
      db.transportMaintenance.findMany({
        where,
        include: { vehicle: { select: { name: true } } },
        orderBy: { performedAt: 'desc' },
      }),
      db.transportAlert.findMany({
        where,
        include: { vehicle: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      db.transportSubscription.groupBy({
        by: ['routeId'],
        where: { tenantId, status: 'actif' },
        _count: { routeId: true },
      }),
    ])

    // Active subscriptions per route - the single source of truth for every
    // occupancy number below (vehicle occupancy, route avgOccupancy, and
    // available seats on the departures board).
    const subscriptionsByRoute = new Map<string, number>()
    for (const g of subscriptionGroups) {
      subscriptionsByRoute.set(g.routeId, g._count.routeId)
    }

    const capacityByRoute = new Map<string, number>()
    const vehicleCountByRoute = new Map<string, number>()
    for (const v of vehicles) {
      if (v.routeId) {
        capacityByRoute.set(v.routeId, (capacityByRoute.get(v.routeId) || 0) + v.capacity)
        vehicleCountByRoute.set(v.routeId, (vehicleCountByRoute.get(v.routeId) || 0) + 1)
      }
    }

    const departuresByVehicle = new Map<string, { start: string; end: string; label: string }[]>()

    const scheduleEntries = departures.map((d) => {
      const durationMinutes = parseDurationMinutes(d.route.durationLabel)
      const end = durationMinutes !== null ? addMinutesToTime(d.departureTime, durationMinutes) : d.departureTime
      const routeSubs = subscriptionsByRoute.get(d.routeId) || 0
      const availableSeats = Math.max(d.vehicle.capacity - routeSubs, 0)

      const list = departuresByVehicle.get(d.vehicleId) || []
      list.push({ start: d.departureTime, end, label: d.label || '' })
      departuresByVehicle.set(d.vehicleId, list)

      return {
        id: d.id,
        departureTime: d.departureTime,
        label: d.label,
        status: d.status,
        vehicleId: d.vehicleId,
        vehicleName: d.vehicle.name,
        routeId: d.routeId,
        routeName: d.route.name,
        driverName: d.vehicle.driverName,
        availableSeats,
      }
    })

    const vehiclesOut = vehicles.map((v) => {
      const routeSubs = v.routeId ? subscriptionsByRoute.get(v.routeId) || 0 : 0
      const occupancy = v.routeId ? Math.min(routeSubs, v.capacity) : 0
      return {
        id: v.id,
        name: v.name,
        plate: v.plate,
        capacity: v.capacity,
        driverName: v.driverName,
        driverPhone: v.driverPhone,
        status: v.status,
        routeId: v.routeId,
        routeName: v.route?.name || null,
        occupancy,
        schedule: (departuresByVehicle.get(v.id) || []).slice().sort((a, b) => a.start.localeCompare(b.start)),
      }
    })

    const routesOut = routes.map((r) => {
      const capacity = capacityByRoute.get(r.id) || 0
      const subs = subscriptionsByRoute.get(r.id) || 0
      const avgOccupancy = capacity > 0 ? Math.min(Math.round((subs / capacity) * 100), 100) : 0
      return {
        id: r.id,
        name: r.name,
        departure: r.departure,
        arrival: r.arrival,
        distanceKm: r.distanceKm,
        durationLabel: r.durationLabel,
        stops: r.stops,
        frequency: r.frequency,
        avgOccupancy,
        vehicleCount: vehicleCountByRoute.get(r.id) || 0,
        subscriptionCount: subs,
      }
    })

    const maintenanceOut = maintenanceRows.map((m) => ({
      id: m.id,
      vehicleId: m.vehicleId,
      vehicleName: m.vehicle.name,
      type: m.type,
      cost: m.cost,
      performedAt: m.performedAt.toISOString(),
    }))

    const alertsOut = alertRows.map((a) => ({
      id: a.id,
      vehicleId: a.vehicleId,
      vehicleName: a.vehicle?.name || null,
      severity: a.severity,
      message: a.message,
      createdAt: a.createdAt.toISOString(),
      timeLabel: timeAgo(a.createdAt),
    }))

    const totalCapacity = vehicles.reduce((acc, v) => acc + v.capacity, 0)
    const studentsTransported = vehiclesOut.reduce((acc, v) => acc + v.occupancy, 0)

    const stats = {
      totalVehicles: vehicles.length,
      activeVehicles: vehicles.filter((v) => v.status === 'en_service').length,
      maintenanceVehicles: vehicles.filter((v) => v.status === 'en_maintenance').length,
      brokenVehicles: vehicles.filter((v) => v.status === 'en_panne').length,
      totalRoutes: routes.length,
      totalDepartures: departures.length,
      activeDepartures: departures.filter((d) => d.status !== 'annule').length,
      studentsTransported,
      totalCapacity,
      occupancyRate: totalCapacity > 0 ? Math.round((studentsTransported / totalCapacity) * 100) : 0,
      totalMaintenanceCost: maintenanceRows.reduce((acc, m) => acc + m.cost, 0),
    }

    return NextResponse.json({
      vehicles: vehiclesOut,
      routes: routesOut,
      schedule: scheduleEntries,
      maintenance: maintenanceOut,
      alerts: alertsOut,
      stats,
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Transport API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transport data' },
      { status: 500 }
    )
  }
}

// ─── POST /api/transport?entity=vehicle|route|alert - create a sub-resource ────

async function createVehicle(tenantId: string, request: NextRequest) {
  const body = await request.json()
  const { name, plate, capacity, driverName, driverPhone, status, routeId } = body

  if (!name || !plate || capacity === undefined || capacity === null || capacity === '') {
    return NextResponse.json(
      { error: 'name, plate, and capacity are required fields' },
      { status: 400 }
    )
  }

  const parsedCapacity = Number(capacity)
  if (!Number.isFinite(parsedCapacity) || parsedCapacity <= 0) {
    return NextResponse.json({ error: 'capacity must be a positive number' }, { status: 400 })
  }

  if (status && !VEHICLE_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${VEHICLE_STATUSES.join(', ')}` },
      { status: 400 }
    )
  }

  if (routeId) {
    const route = await db.transportRoute.findFirst({ where: { id: routeId, tenantId } })
    if (!route) {
      return NextResponse.json({ error: 'Route not found' }, { status: 404 })
    }
  }

  const vehicle = await db.transportVehicle.create({
    data: {
      tenantId,
      name,
      plate,
      capacity: parsedCapacity,
      driverName: driverName ?? null,
      driverPhone: driverPhone ?? null,
      status: status ?? undefined,
      routeId: routeId ?? null,
    },
  })

  return NextResponse.json({ vehicle, message: 'Vehicule cree avec succes' }, { status: 201 })
}

async function createRoute(tenantId: string, request: NextRequest) {
  const body = await request.json()
  const { name, departure, arrival, distanceKm, durationLabel, stops, frequency } = body

  if (!name || !departure || !arrival) {
    return NextResponse.json(
      { error: 'name, departure, and arrival are required fields' },
      { status: 400 }
    )
  }

  const route = await db.transportRoute.create({
    data: {
      tenantId,
      name,
      departure,
      arrival,
      distanceKm: toNullableNumber(distanceKm),
      durationLabel: durationLabel ?? null,
      stops: Array.isArray(stops)
        ? stops.filter((s: unknown): s is string => typeof s === 'string' && s.trim() !== '')
        : [],
      frequency: frequency ?? null,
    },
  })

  return NextResponse.json({ route, message: 'Trajet cree avec succes' }, { status: 201 })
}

async function createAlert(tenantId: string, request: NextRequest) {
  const body = await request.json()
  const { vehicleId, severity, message } = body

  if (!message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  if (severity && !ALERT_SEVERITIES.includes(severity)) {
    return NextResponse.json(
      { error: `severity must be one of: ${ALERT_SEVERITIES.join(', ')}` },
      { status: 400 }
    )
  }

  if (vehicleId) {
    const vehicle = await db.transportVehicle.findFirst({ where: { id: vehicleId, tenantId } })
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }
  }

  const alert = await db.transportAlert.create({
    data: {
      tenantId,
      vehicleId: vehicleId ?? null,
      severity: severity ?? undefined,
      message,
    },
  })

  return NextResponse.json({ alert, message: 'Alerte creee avec succes' }, { status: 201 })
}

async function handlePost(_user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const entity = searchParams.get('entity') || 'vehicle'

    switch (entity) {
      case 'vehicle':
        return await createVehicle(tenantId, request)
      case 'route':
        return await createRoute(tenantId, request)
      case 'alert':
        return await createAlert(tenantId, request)
      default:
        return NextResponse.json(
          { error: 'entity query parameter must be one of: vehicle, route, alert' },
          { status: 400 }
        )
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Create transport entity error:', error)
    return NextResponse.json(
      { error: 'Failed to create transport entity' },
      { status: 500 }
    )
  }
}

// ─── PUT /api/transport?vehicleId=X - update a vehicle's status ───────────────
// Optionally logs a maintenance record in the same call (e.g. when switching
// a vehicle to en_maintenance with a { maintenance: { type, cost } } payload).

async function handlePut(_user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vehicleId = searchParams.get('vehicleId')
    if (!vehicleId) {
      return NextResponse.json({ error: 'vehicleId query parameter is required' }, { status: 400 })
    }

    const existing = await db.transportVehicle.findFirst({ where: { id: vehicleId, tenantId } })
    if (!existing) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    const body = await request.json()
    const { status, maintenance } = body

    if (!status || !VEHICLE_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${VEHICLE_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    const vehicle = await db.transportVehicle.update({
      where: { id: vehicleId },
      data: { status },
    })

    let maintenanceRecord = null
    if (maintenance && typeof maintenance === 'object' && maintenance.type) {
      maintenanceRecord = await db.transportMaintenance.create({
        data: {
          tenantId,
          vehicleId,
          type: maintenance.type,
          cost: toNullableNumber(maintenance.cost) ?? 0,
        },
      })
    }

    return NextResponse.json({ vehicle, maintenance: maintenanceRecord, message: 'Statut du vehicule mis a jour' })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Update vehicle error:', error)
    return NextResponse.json(
      { error: 'Failed to update vehicle' },
      { status: 500 }
    )
  }
}

export const GET = withTenantAuth(handleGet)
export const POST = withTenantAuth(handlePost)
export const PUT = withTenantAuth(handlePut)
