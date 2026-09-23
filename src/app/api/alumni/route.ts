import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'

async function handleGet(_user: SessionUser, tenantId: string, _request: NextRequest) {
  try {
    const where = { tenantId }

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

async function handlePost(_user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const {
      studentId, firstName, lastName, email, phone, diploma, graduationYear,
      program, currentPosition, company, sector, country, city, status,
      isContributing, contributionAmt, linkedIn,
    } = body

    const graduationYearNumber = Number(graduationYear)
    const currentYear = new Date().getFullYear() + 1
    const validStatuses = ['ACTIF', 'INACTIF', 'INJOIGNABLE']

    if (!firstName?.trim() || !lastName?.trim() || !graduationYear) {
      return NextResponse.json(
        { error: 'firstName, lastName, and graduationYear are required fields' },
        { status: 400 }
      )
    }

    if (!Number.isInteger(graduationYearNumber) || graduationYearNumber < 1950 || graduationYearNumber > currentYear) {
      return NextResponse.json(
        { error: `graduationYear must be an integer between 1950 and ${currentYear}` },
        { status: 400 }
      )
    }

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const alumni = await db.alumni.create({
      data: {
        tenantId,
        studentId: studentId ?? null,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        diploma: diploma?.trim() || null,
        graduationYear: graduationYearNumber,
        program: program?.trim() || null,
        currentPosition: currentPosition?.trim() || null,
        company: company?.trim() || null,
        sector: sector?.trim() || null,
        country: country?.trim() || null,
        city: city?.trim() || null,
        status: status ?? undefined,
        isContributing: typeof isContributing === 'boolean' ? isContributing : undefined,
        contributionAmt: typeof contributionAmt === 'number' ? contributionAmt : undefined,
        linkedIn: linkedIn?.trim() || null,
      },
    })
    return NextResponse.json({ alumni }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Failed to create alumni record' },
      { status: 500 }
    )
  }
}

async function handlePatch(_user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status, markContacted } = body
    const validStatuses = ['ACTIF', 'INACTIF', 'INJOIGNABLE']

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const existing = await db.alumni.findFirst({ where: { id, tenantId } })
    if (!existing) {
      return NextResponse.json({ error: 'Alumni record not found' }, { status: 404 })
    }

    const alumni = await db.alumni.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(markContacted ? { lastContactDate: new Date() } : {}),
      },
    })

    return NextResponse.json({ alumni })
  } catch {
    return NextResponse.json(
      { error: 'Failed to update alumni record' },
      { status: 500 }
    )
  }
}

async function handleDelete(_user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const existing = await db.alumni.findFirst({ where: { id, tenantId } })
    if (!existing) {
      return NextResponse.json({ error: 'Alumni record not found' }, { status: 404 })
    }

    await db.alumni.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete alumni record' },
      { status: 500 }
    )
  }
}

export const GET = withTenantAuth(handleGet)
export const POST = withTenantAuth(handlePost)
export const PATCH = withTenantAuth(handlePatch)
export const DELETE = withTenantAuth(handleDelete)
