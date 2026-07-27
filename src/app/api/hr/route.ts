import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { isStudentSelfRole } from '@/lib/auth/student-scope'

// GET /api/hr - List staff with stats. No student-facing UI calls this, so
// student-tier accounts (who could otherwise dump the full staff roster and
// leave requests) are blocked.
async function handleGet(user: SessionUser, tenantId: string, _request: NextRequest) {
  try {
    if (isStudentSelfRole(user.role)) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Accès refusé' }, { status: 403 })
    }
    const where = { tenantId }

    const [staff, total, active, onLeave, vacantPosts, leaveRequests] = await Promise.all([
      db.staff.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      db.staff.count({ where }),
      db.staff.count({ where: { ...where, status: 'actif' } }),
      db.staff.count({ where: { ...where, status: 'en_conge' } }),
      db.staff.count({ where: { ...where, status: 'depart' } }),
      db.leaveRequest.findMany({
        where,
        include: { staff: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ])

    const stats = {
      total,
      active,
      onLeave,
      vacantPosts,
    }

    return NextResponse.json({ data: staff, stats, leaveRequests })
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
async function handlePost(_user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const {
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

// PUT /api/hr?leaveRequestId=X - approve or refuse a leave request
async function handlePutLeaveRequest(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const leaveRequestId = searchParams.get('leaveRequestId')
    if (!leaveRequestId) {
      return NextResponse.json(
        { error: 'leaveRequestId query parameter is required' },
        { status: 400 }
      )
    }

    const existing = await db.leaveRequest.findFirst({ where: { id: leaveRequestId, tenantId } })
    if (!existing) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 })
    }

    const body = await request.json()
    const { status } = body

    const validStatuses = ['en_attente', 'approuve', 'refuse']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const leaveRequest = await db.leaveRequest.update({
      where: { id: leaveRequestId },
      data: {
        status,
        approverId: ['approuve', 'refuse'].includes(status) ? user.id : existing.approverId,
      },
      include: { staff: { select: { firstName: true, lastName: true } } },
    })

    return NextResponse.json({ leaveRequest })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Update leave request error:', error)
    return NextResponse.json(
      { error: 'Failed to update leave request' },
      { status: 500 }
    )
  }
}

export const GET = withTenantAuth(handleGet)
export const POST = withTenantAuth(handlePost)
export const PUT = withTenantAuth(handlePutLeaveRequest, ['SUPER_ADMIN', 'ADMIN_INSTITUTION'])
