import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { isStudentSelfRole } from '@/lib/auth/student-scope'

// GET /api/academic-years - real list, replacing institution-page.tsx's
// hardcoded academicYears array.
async function handleGet(user: SessionUser, tenantId: string) {
  try {
    if (isStudentSelfRole(user.role)) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Accès refusé' }, { status: 403 })
    }
    const years = await db.academicYear.findMany({
      where: { tenantId },
      orderBy: { startDate: 'desc' },
    })
    return NextResponse.json({ data: years })
  } catch (error) {
    console.error('Academic years API error:', error)
    return NextResponse.json({ error: 'Failed to fetch academic years' }, { status: 500 })
  }
}

// POST /api/academic-years - create a new academic year
async function handlePost(_user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const { name, startDate, endDate } = body
    if (!name || !startDate || !endDate) {
      return NextResponse.json({ error: 'name, startDate and endDate are required' }, { status: 400 })
    }
    const year = await db.academicYear.create({
      data: { tenantId, name, startDate: new Date(startDate), endDate: new Date(endDate) },
    })
    return NextResponse.json({ data: year }, { status: 201 })
  } catch (error) {
    console.error('Create academic year error:', error)
    return NextResponse.json({ error: 'Failed to create academic year' }, { status: 500 })
  }
}

// PUT /api/academic-years - set one academic year as the current one
async function handlePut(_user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }
    const existing = await db.academicYear.findFirst({ where: { id, tenantId } })
    if (!existing) {
      return NextResponse.json({ error: 'Academic year not found' }, { status: 404 })
    }
    await db.$transaction([
      db.academicYear.updateMany({ where: { tenantId }, data: { isCurrent: false } }),
      db.academicYear.update({ where: { id }, data: { isCurrent: true, isActive: true } }),
    ])
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Set current academic year error:', error)
    return NextResponse.json({ error: 'Failed to update academic year' }, { status: 500 })
  }
}

export const GET = withTenantAuth(handleGet)
export const POST = withTenantAuth(handlePost, ['SUPER_ADMIN', 'ADMIN_INSTITUTION'])
export const PUT = withTenantAuth(handlePut, ['SUPER_ADMIN', 'ADMIN_INSTITUTION'])
