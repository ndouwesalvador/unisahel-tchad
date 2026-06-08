import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth } from '@/lib/auth/helpers'

async function handleGet(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId') || ''

    const where = tenantId ? { tenantId } : {}

    const [scholarships, active, totalBudget, totalBeneficiaries] = await Promise.all([
      db.scholarship.findMany({ where, orderBy: { createdAt: 'desc' } }),
      db.scholarship.count({ where: { ...where, status: 'ACTIVE' } }),
      db.scholarship.aggregate({ where, _sum: { budget: true } }),
      db.scholarship.aggregate({ where, _sum: { currentCount: true } }),
    ])

    return NextResponse.json({
      scholarships,
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

async function handlePost(request: NextRequest) {
  try {
    const body = await request.json()
    const scholarship = await db.scholarship.create({ data: body })
    return NextResponse.json({ scholarship }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Failed to create scholarship' },
      { status: 500 }
    )
  }
}

export const GET = withTenantAuth(handleGet as any)
export const POST = withTenantAuth(handlePost as any)
