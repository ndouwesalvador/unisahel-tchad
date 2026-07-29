import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'

const TENANT_FIELDS = [
  'name', 'shortName', 'motto', 'ministry', 'country', 'city', 'address',
  'phone', 'email', 'website', 'rectorName', 'rectorTitle', 'academicSystem', 'logo',
] as const

const SETTINGS_FIELDS = [
  'creditsPerSemester', 'creditsPerYear', 'passingGrade', 'eliminationGrade',
  'primaryColor', 'secondaryColor', 'accentColor', 'gradingScale',
  'compensationEnabled', 'catchUpSessionEnabled', 'ccWeight', 'examWeight',
  'tpWeight', 'stageWeight', 'emailNotifications', 'smsNotifications',
  'whatsappNotifications',
] as const

// GET /api/institution - fetch the current tenant's profile + settings, plus
// real usage stats and email-delivery status for the Settings/Maintenance
// pages (replaces what used to be hardcoded placeholder numbers there).
async function handleGet(_user: SessionUser, tenantId: string, _request: NextRequest) {
  try {
    const [tenant, students, teachers, staffUsers, payments, documentsGenerated, auditLogCount, oldestAuditLog] = await Promise.all([
      db.tenant.findUnique({ where: { id: tenantId }, include: { settings: true } }),
      db.student.count({ where: { tenantId } }),
      db.teacher.count({ where: { tenantId } }),
      db.user.count({ where: { tenantId, role: { notIn: ['ETUDIANT', 'ETUDIANT_SANTE', 'PARENT'] } } }),
      db.payment.count({ where: { tenantId } }),
      db.officialDocument.count({ where: { tenantId } }),
      db.auditLog.count({ where: { tenantId } }),
      db.auditLog.findFirst({ where: { tenantId }, orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
    ])

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    return NextResponse.json({
      tenant,
      stats: { students, teachers, staffUsers, payments, documentsGenerated, auditLogCount, oldestAuditLogDate: oldestAuditLog?.createdAt ?? null },
      emailStatus: { resendConfigured: Boolean(process.env.RESEND_API_KEY) },
    })
  } catch (error) {
    console.error('Institution API error:', error)
    return NextResponse.json({ error: 'Failed to fetch institution profile' }, { status: 500 })
  }
}

// PUT /api/institution - update the current tenant's profile and/or settings
async function handlePut(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()

    const tenantData: Record<string, unknown> = {}
    for (const field of TENANT_FIELDS) {
      if (body[field] !== undefined) tenantData[field] = body[field]
    }

    const settingsData: Record<string, unknown> = {}
    for (const field of SETTINGS_FIELDS) {
      if (body[field] !== undefined) settingsData[field] = body[field]
    }

    if (Object.keys(tenantData).length === 0 && Object.keys(settingsData).length === 0) {
      return NextResponse.json({ error: 'No recognized fields to update' }, { status: 400 })
    }

    const [tenant] = await db.$transaction([
      db.tenant.update({
        where: { id: tenantId },
        data: {
          ...tenantData,
          ...(Object.keys(settingsData).length > 0
            ? { settings: { upsert: { create: settingsData, update: settingsData } } }
            : {}),
        },
        include: { settings: true },
      }),
    ])

    await db.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: 'UPDATE',
        entity: 'Tenant',
        entityId: tenantId,
        details: JSON.stringify({ fields: [...Object.keys(tenantData), ...Object.keys(settingsData)] }),
      },
    })

    return NextResponse.json({ tenant })
  } catch (error) {
    console.error('Update institution error:', error)
    return NextResponse.json({ error: 'Failed to update institution profile' }, { status: 500 })
  }
}

export const GET = withTenantAuth(handleGet)
export const PUT = withTenantAuth(handlePut, ['SUPER_ADMIN', 'ADMIN_INSTITUTION'])
