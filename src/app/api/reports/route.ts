import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { isStudentSelfRole } from '@/lib/auth/student-scope'

// GET /api/reports - List reports with stats
async function handleGet(user: SessionUser, tenantId: string, _request: NextRequest) {
  try {
    if (isStudentSelfRole(user.role)) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Accès refusé' }, { status: 403 })
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

export const GET = withTenantAuth(handleGet)

// A report row has no generated file or worker attached to it. Refuse legacy
// creation calls instead of saving a permanently PENDING, misleading record.
async function handlePost() {
  return NextResponse.json(
    { error: 'REPORT_GENERATION_UNAVAILABLE', message: 'Utilisez les exports réels de la page Rapports ou les documents officiels.' },
    { status: 501 }
  )
}

export const POST = withTenantAuth(handlePost)
