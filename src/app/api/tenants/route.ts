import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, type SessionUser } from '@/lib/auth/helpers'
import { generateTempPassword } from '@/lib/password'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

// Platform-wide institution management for SUPER_ADMIN — a SUPER_ADMIN
// belongs to no single tenant (see 20260729120000_user_tenant_id_nullable),
// so this route uses withAuth (role-only) rather than withTenantAuth
// (which always resolves a specific tenantId).

const COMBINING_DIACRITICS = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g')

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || 'etablissement'
  let candidate = root
  let attempt = 1
  while (await db.tenant.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    attempt += 1
    candidate = `${root}-${attempt}`
  }
  return candidate
}

function defaultAcademicYear(now: Date) {
  const year = now.getUTCMonth() >= 7 ? now.getUTCFullYear() : now.getUTCFullYear() - 1
  return {
    name: `${year}-${year + 1}`,
    startDate: new Date(Date.UTC(year, 9, 1)),
    endDate: new Date(Date.UTC(year + 1, 6, 31)),
  }
}

// GET /api/tenants - list every institution on the platform with real stats
async function handleGet() {
  try {
    const tenants = await db.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        country: true,
        isActive: true,
        subscriptionPlan: true,
        subscriptionEnd: true,
        createdAt: true,
        _count: { select: { students: true, teachers: true, users: true } },
        users: {
          where: { role: 'ADMIN_INSTITUTION' },
          select: { firstName: true, lastName: true, email: true },
          take: 1,
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    const data = tenants.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      city: t.city,
      country: t.country,
      isActive: t.isActive,
      subscriptionPlan: t.subscriptionPlan,
      subscriptionEnd: t.subscriptionEnd,
      createdAt: t.createdAt,
      totalStudents: t._count.students,
      totalTeachers: t._count.teachers,
      totalUsers: t._count.users,
      admin: t.users[0] ? { name: `${t.users[0].firstName} ${t.users[0].lastName}`, email: t.users[0].email } : null,
    }))

    return NextResponse.json({
      data,
      stats: {
        total: data.length,
        active: data.filter((t) => t.isActive).length,
        totalStudents: data.reduce((sum, t) => sum + t.totalStudents, 0),
        totalTeachers: data.reduce((sum, t) => sum + t.totalTeachers, 0),
      },
    })
  } catch (error) {
    console.error('Tenants API error:', error)
    return NextResponse.json({ error: 'Failed to fetch institutions' }, { status: 500 })
  }
}

const createSchema = z.object({
  name: z.string().trim().min(2).max(150),
  country: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  headerLanguageMode: z.enum(['FR_ONLY', 'FR_AR']).default('FR_ONLY'),
  subscriptionPlan: z.enum(['STARTER', 'PRO', 'ENTERPRISE']).default('STARTER'),
  adminFirstName: z.string().trim().min(1).max(80),
  adminLastName: z.string().trim().min(1).max(80),
  adminEmail: z.string().trim().email().max(180),
})

// POST /api/tenants - create a new institution + its first ADMIN_INSTITUTION
// account. Mirrors the self-service /api/auth/signup flow, but curated by
// SUPER_ADMIN with a generated one-time password instead of the admin
// choosing their own at signup.
async function handlePost(actor: SessionUser, request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten().fieldErrors }, { status: 400 })
    }
    const data = parsed.data
    const lowerEmail = data.adminEmail.toLowerCase()

    const existingUser = await db.user.findUnique({ where: { email: lowerEmail }, select: { id: true } })
    if (existingUser) {
      return NextResponse.json({ error: 'Un compte existe déjà avec cet email' }, { status: 409 })
    }

    const slug = await uniqueSlug(data.name)
    const tempPassword = generateTempPassword()
    const passwordHash = await bcrypt.hash(tempPassword, 12)
    const academicYear = defaultAcademicYear(new Date())

    const result = await db.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: data.name,
          slug,
          country: data.country || null,
          city: data.city || null,
          headerLanguageMode: data.headerLanguageMode,
          subscriptionPlan: data.subscriptionPlan,
        },
      })

      await tx.tenantSettings.create({ data: { tenantId: tenant.id } })

      const adminUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: lowerEmail,
          passwordHash,
          firstName: data.adminFirstName,
          lastName: data.adminLastName,
          role: 'ADMIN_INSTITUTION',
          emailVerified: false,
          mustChangePassword: true,
        },
      })

      await tx.academicYear.create({
        data: {
          tenantId: tenant.id,
          name: academicYear.name,
          startDate: academicYear.startDate,
          endDate: academicYear.endDate,
          isActive: true,
          isCurrent: true,
        },
      })

      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          userId: actor.id,
          action: 'CREATE',
          entity: 'Tenant',
          entityId: tenant.id,
          details: JSON.stringify({ via: 'super-admin', name: data.name, adminEmail: lowerEmail }),
        },
      })

      return { tenant, adminUser }
    }, { timeout: 15000 })

    return NextResponse.json({
      data: {
        tenant: { id: result.tenant.id, name: result.tenant.name, slug: result.tenant.slug },
        admin: { id: result.adminUser.id, email: result.adminUser.email, firstName: result.adminUser.firstName, lastName: result.adminUser.lastName },
        tempPassword,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Create tenant error:', error)
    return NextResponse.json({ error: "Échec de la création de l'institution", details: error instanceof Error ? error.message : 'Erreur inconnue' }, { status: 500 })
  }
}

const updateSchema = z.object({
  id: z.string().min(1),
  isActive: z.boolean().optional(),
  subscriptionPlan: z.enum(['STARTER', 'PRO', 'ENTERPRISE']).optional(),
  subscriptionEnd: z.string().datetime().optional().nullable(),
})

const deleteSchema = z.object({
  id: z.string().min(1),
  confirmationName: z.string().trim().min(1),
  currentPassword: z.string().min(1),
})

// PUT /api/tenants - suspend/reactivate an institution or change its plan
async function handlePut(actor: SessionUser, request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten().fieldErrors }, { status: 400 })
    }
    const { id, ...data } = parsed.data

    const existing = await db.tenant.findUnique({ where: { id }, select: { id: true } })
    if (!existing) {
      return NextResponse.json({ error: 'Institution introuvable' }, { status: 404 })
    }

    const updated = await db.tenant.update({
      where: { id },
      data: {
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.subscriptionPlan !== undefined ? { subscriptionPlan: data.subscriptionPlan } : {}),
        ...(data.subscriptionEnd !== undefined ? { subscriptionEnd: data.subscriptionEnd ? new Date(data.subscriptionEnd) : null } : {}),
      },
    })

    await db.auditLog.create({
      data: {
        tenantId: id,
        userId: actor.id,
        action: 'UPDATE',
        entity: 'Tenant',
        entityId: id,
        details: JSON.stringify(data),
      },
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Update tenant error:', error)
    return NextResponse.json({ error: "Échec de la mise à jour de l'institution" }, { status: 500 })
  }
}

// DELETE /api/tenants - irreversible platform deletion. It is deliberately
// protected by the Super Admin's current password and an exact institution
// name confirmation. Foreign-key restrictions can still refuse deletion when
// the institution has protected historical records; suspension remains safe.
async function handleDelete(actor: SessionUser, request: NextRequest) {
  try {
    const parsed = deleteSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten().fieldErrors }, { status: 400 })

    const [target, actorAccount] = await Promise.all([
      db.tenant.findUnique({ where: { id: parsed.data.id }, select: { id: true, name: true } }),
      db.user.findUnique({ where: { id: actor.id }, select: { passwordHash: true, role: true } }),
    ])
    if (!target) return NextResponse.json({ error: 'Institution introuvable' }, { status: 404 })
    if (actorAccount?.role !== 'SUPER_ADMIN' || !actorAccount.passwordHash) return NextResponse.json({ error: 'Une validation par mot de passe est requise.' }, { status: 403 })
    if (target.name !== parsed.data.confirmationName) return NextResponse.json({ error: 'Le nom de confirmation ne correspond pas exactement.' }, { status: 400 })
    if (!await bcrypt.compare(parsed.data.currentPassword, actorAccount.passwordHash)) return NextResponse.json({ error: 'Mot de passe Super Admin incorrect.' }, { status: 403 })

    await db.auditLog.create({
      data: {
        tenantId: null,
        userId: actor.id,
        action: 'DELETE_ATTEMPT',
        entity: 'Tenant',
        entityId: target.id,
        details: JSON.stringify({ name: target.name, confirmation: 'exact-name-and-password' }),
      },
    })
    await db.tenant.delete({ where: { id: target.id } })
    return NextResponse.json({ ok: true, deletedId: target.id })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2003') {
      return NextResponse.json({ error: 'Cette institution contient encore des historiques protégés et ne peut pas être supprimée. Suspendez-la pour la désactiver sans perte de données.' }, { status: 409 })
    }
    console.error('Delete tenant error:', error)
    return NextResponse.json({ error: "Échec de la suppression de l'institution" }, { status: 500 })
  }
}

export const GET = withAuth(handleGet, ['SUPER_ADMIN'])
export const POST = withAuth(handlePost, ['SUPER_ADMIN'])
export const PUT = withAuth(handlePut, ['SUPER_ADMIN'])
export const DELETE = withAuth(handleDelete, ['SUPER_ADMIN'])
