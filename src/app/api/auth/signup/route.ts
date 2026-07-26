import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

// Public route — this is the only place a brand-new tenant gets created
// outside of the SUPER_ADMIN-only /api/seed demo-data seeder. No auth
// wrapper on purpose: a visitor with no account yet is exactly who this
// is for.

const signupSchema = z.object({
  institutionName: z.string().trim().min(2).max(150),
  country: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(180),
  password: z.string().min(8).max(100),
})

const COMBINING_DIACRITICS = new RegExp('[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']', 'g')

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS, '') // strip accents left over by NFD normalization
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

// Computes a sensible "current" academic year (Oct 1 -> Jul 31) for the
// date the tenant is created, so the dashboard isn't immediately empty.
function defaultAcademicYear(now: Date) {
  const year = now.getUTCMonth() >= 7 ? now.getUTCFullYear() : now.getUTCFullYear() - 1
  return {
    name: `${year}-${year + 1}`,
    startDate: new Date(Date.UTC(year, 9, 1)),
    endDate: new Date(Date.UTC(year + 1, 6, 31)),
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = signupSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { institutionName, country, city, firstName, lastName, email, password } = parsed.data

    const existingUser = await db.user.findUnique({ where: { email }, select: { id: true } })
    if (existingUser) {
      return NextResponse.json({ error: 'Un compte existe déjà avec cet email' }, { status: 409 })
    }

    const slug = await uniqueSlug(institutionName)
    const passwordHash = await bcrypt.hash(password, 12)
    const academicYear = defaultAcademicYear(new Date())

    const result = await db.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: institutionName,
          slug,
          country: country || null,
          city: city || null,
          subscriptionPlan: 'STARTER',
        },
      })

      await tx.tenantSettings.create({ data: { tenantId: tenant.id } })

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email,
          passwordHash,
          firstName,
          lastName,
          role: 'ADMIN_INSTITUTION',
          emailVerified: false,
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
          userId: user.id,
          action: 'CREATE',
          entity: 'Tenant',
          entityId: tenant.id,
          details: JSON.stringify({ via: 'signup', institutionName }),
        },
      })

      return { tenantId: tenant.id, userId: user.id }
    }, { timeout: 15000 }) // Neon can take a few seconds to wake from idle; default 5s is too tight for 5 sequential writes

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: "Échec de la création du compte", details: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    )
  }
}
