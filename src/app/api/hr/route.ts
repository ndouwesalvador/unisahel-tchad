import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth } from '@/lib/auth/helpers'

// GET /api/hr - List staff with stats
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

    const [staff, total, active, onLeave, vacantPosts] = await Promise.all([
      db.staff.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      db.staff.count({ where }),
      db.staff.count({ where: { ...where, status: 'actif' } }),
      db.staff.count({ where: { ...where, status: 'en_conge' } }),
      db.staff.count({ where: { ...where, status: 'depart' } }),
    ])

    const stats = {
      total,
      active,
      onLeave,
      vacantPosts,
    }

    return NextResponse.json({ data: staff, stats })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('HR API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch staff' },
      { status: 500 }
    )
  }
}

// POST /api/hr - Create a new staff member
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      tenantId,
      firstName,
      lastName,
      email,
      phone,
      department,
      position,
      contractType,
      status,
      joinDate,
    } = body

    // Validate required fields
    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      )
    }

    if (!firstName || !lastName || !email || !department || !position || !contractType) {
      return NextResponse.json(
        { error: 'firstName, lastName, email, department, position, and contractType are required fields' },
        { status: 400 }
      )
    }

    if (!joinDate) {
      return NextResponse.json(
        { error: 'joinDate is required' },
        { status: 400 }
      )
    }

    // Validate contractType
    const validContractTypes = ['CDI', 'CDD', 'Vacataire', 'Stagiaire']
    if (!validContractTypes.includes(contractType)) {
      return NextResponse.json(
        { error: `contractType must be one of: ${validContractTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Check for duplicate email
    const existingStaff = await db.staff.findUnique({
      where: { email },
    })

    if (existingStaff) {
      return NextResponse.json(
        { error: 'A staff member with this email already exists' },
        { status: 409 }
      )
    }

    const newStaff = await db.staff.create({
      data: {
        tenantId,
        firstName,
        lastName,
        email,
        phone: phone ?? null,
        department,
        position,
        contractType,
        status: status ?? 'actif',
        joinDate: new Date(joinDate),
      },
    })

    return NextResponse.json(
      { data: newStaff, message: 'Personnel cree avec succes' },
      { status: 201 }
    )
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Create staff error:', error)
    return NextResponse.json(
      { error: 'Failed to create staff member' },
      { status: 500 }
    )
  }
}

export const GET = withTenantAuth(handleGet as any)
export const POST = withTenantAuth(handlePost as any)
