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

export const GET = withTenantAuth(handleGet)
export const POST = withTenantAuth(handlePost)
