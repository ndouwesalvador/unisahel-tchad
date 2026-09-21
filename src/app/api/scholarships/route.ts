import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'

async function handleGet(_user: SessionUser, tenantId: string, _request: NextRequest) {
  try {
    const where = { tenantId }

    const [scholarships, active, totalBudget, totalBeneficiaries, beneficiaries] = await Promise.all([
      db.scholarship.findMany({ where, orderBy: { createdAt: 'desc' } }),
      db.scholarship.count({ where: { ...where, status: 'ACTIVE' } }),
      db.scholarship.aggregate({ where, _sum: { budget: true } }),
      db.scholarship.aggregate({ where, _sum: { currentCount: true } }),
      db.scholarshipApplication.findMany({
        where,
        include: { scholarship: { select: { name: true, type: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    return NextResponse.json({
      scholarships,
      beneficiaries,
      stats: {
        total: scholarships.length,
        active,
        totalBudget: totalBudget._sum.budget || 0,
        totalBeneficiaries: totalBeneficiaries._sum.currentCount || 0,
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch scholarships' },
      { status: 500 }
    )
  }
}

async function handlePost(_user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, budget, currency, duration, eligibility, maxBeneficiaries, status, startDate, endDate } = body

    if (!name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      )
    }

    const scholarship = await db.scholarship.create({
      data: {
        tenantId,
        name,
        type: type ?? undefined,
        budget: typeof budget === 'number' ? budget : undefined,
        currency: currency ?? undefined,
        duration: duration ?? null,
        eligibility: eligibility ?? null,
        maxBeneficiaries: typeof maxBeneficiaries === 'number' ? maxBeneficiaries : null,
        status: status ?? undefined,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
    })
    return NextResponse.json({ scholarship }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Failed to create scholarship' },
      { status: 500 }
    )
  }
}

async function handlePut(_user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, type, budget, currency, duration, eligibility, maxBeneficiaries, status, startDate, endDate } = body

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const existing = await db.scholarship.findFirst({ where: { id, tenantId }, select: { id: true } })
    if (!existing) {
      return NextResponse.json({ error: 'Scholarship not found' }, { status: 404 })
    }

    const scholarship = await db.scholarship.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(type !== undefined ? { type } : {}),
        ...(budget !== undefined ? { budget } : {}),
        ...(currency !== undefined ? { currency } : {}),
        ...(duration !== undefined ? { duration } : {}),
        ...(eligibility !== undefined ? { eligibility } : {}),
        ...(maxBeneficiaries !== undefined ? { maxBeneficiaries } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(startDate !== undefined ? { startDate: startDate ? new Date(startDate) : null } : {}),
        ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
      },
    })
    return NextResponse.json({ scholarship })
  } catch {
    return NextResponse.json(
      { error: 'Failed to update scholarship' },
      { status: 500 }
    )
  }
}

async function handleDelete(_user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 })
    }

    const existing = await db.scholarship.findFirst({
      where: { id, tenantId },
      select: { id: true, _count: { select: { applications: true } } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Scholarship not found' }, { status: 404 })
    }
    if (existing._count.applications > 0) {
      return NextResponse.json({ error: 'Cette bourse a deja des candidatures et ne peut pas etre supprimee.' }, { status: 409 })
    }

    await db.scholarship.delete({ where: { id } })
    return NextResponse.json({ data: { id, deleted: true } })
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete scholarship' },
      { status: 500 }
    )
  }
}

export const GET = withTenantAuth(handleGet)
export const POST = withTenantAuth(handlePost)
export const PUT = withTenantAuth(handlePut, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE'])
export const DELETE = withTenantAuth(handleDelete, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE'])
