import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth } from '@/lib/auth/helpers'

// GET /api/reports - List reports with stats
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

    const [reports, total, completed, pending, totalDownloadsResult] = await Promise.all([
      db.report.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      db.report.count({ where }),
      db.report.count({ where: { ...where, status: 'COMPLETED' } }),
      db.report.count({ where: { ...where, status: 'PENDING' } }),
      db.report.aggregate({
        where,
        _sum: { downloadCount: true },
      }),
    ])

    const stats = {
      total,
      completed,
      pending,
      totalDownloads: totalDownloadsResult._sum.downloadCount ?? 0,
    }

    return NextResponse.json({ reports, stats })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Reports API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    )
  }
}

export const GET = withTenantAuth(handleGet as any)

// POST /api/reports - Create a new report
async function handlePost(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantId, name, type, format, period, level, program, generatedBy, scheduledAt } = body

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      )
    }

    if (!name || !type || !format) {
      return NextResponse.json(
        { error: 'name, type, and format are required fields' },
        { status: 400 }
      )
    }

    const validTypes = ['PERFORMANCE', 'FINANCIAL', 'ATTENDANCE', 'EXAM', 'PROGRESS', 'INSTITUTIONAL']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const validFormats = ['PDF', 'EXCEL', 'CSV']
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { error: `format must be one of: ${validFormats.join(', ')}` },
        { status: 400 }
      )
    }

    const report = await db.report.create({
      data: {
        tenantId,
        name,
        type,
        format,
        period: period ?? null,
        level: level ?? null,
        program: program ?? null,
        generatedBy: generatedBy ?? 'system',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
    })

    return NextResponse.json({ report }, { status: 201 })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Create report error:', error)
    return NextResponse.json(
      { error: 'Failed to create report' },
      { status: 500 }
    )
  }
}

export const POST = withTenantAuth(handlePost as any)
