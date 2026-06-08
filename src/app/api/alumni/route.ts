import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth } from '@/lib/auth/helpers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId') || ''

    const where = tenantId ? { tenantId } : {}

    const [alumni] = await Promise.all([
      db.alumni.findMany({ where, orderBy: { graduationYear: 'desc' } }),
      db.alumni.aggregate({
        where,
        _count: true,
        _sum: { contributionAmt: true },
      }),
    ])

    const active = alumni.filter((a) => a.status === 'ACTIF').length
    const employed = alumni.filter((a) => a.currentPosition).length
    const contributing = alumni.filter((a) => a.isContributing).length

    const countryMap = new Map<string, number>()
    const sectorMap = new Map<string, number>()
    const yearMap = new Map<number, number>()

    for (const a of alumni) {
      if (a.country) countryMap.set(a.country, (countryMap.get(a.country) || 0) + 1)
      if (a.sector) sectorMap.set(a.sector, (sectorMap.get(a.sector) || 0) + 1)
      if (a.graduationYear) yearMap.set(a.graduationYear, (yearMap.get(a.graduationYear) || 0) + 1)
    }

    return NextResponse.json({
      alumni,
      stats: {
        total: alumni.length,
        active,
        employed,
        contributing,
        employmentRate: alumni.length ? Math.round((employed / alumni.length) * 100) : 0,
        countries: countryMap.size,
      },
      distributions: {
        countries: Array.from(countryMap.entries()).map(([name, count]) => ({ name, count })),
        sectors: Array.from(sectorMap.entries()).map(([name, count]) => ({ name, count })),
        years: Array.from(yearMap.entries()).map(([year, count]) => ({ year, count })).sort((a, b) => a.year - b.year),
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch alumni' },
      { status: 500 }
    )
  }
}

async function handler(request: NextRequest) {
  try {
    const body = await request.json()
    const alumni = await db.alumni.create({ data: body })
    return NextResponse.json({ alumni }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Failed to create alumni record' },
      { status: 500 }
    )
  }
}

export const POST = withTenantAuth(handler as any)
