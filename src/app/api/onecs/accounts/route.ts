import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { withAuth, type SessionUser } from '@/lib/auth/helpers'
import { generateTempPassword } from '@/lib/password'

const schema = z.object({
  firstName: z.string().trim().min(2).max(100),
  lastName: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
})

async function handleGet(_user: SessionUser, _request: NextRequest) {
  const accounts = await db.user.findMany({
    where: { role: 'ONECS', tenantId: null },
    orderBy: [{ isActive: 'desc' }, { lastName: 'asc' }],
    select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
  })
  return NextResponse.json({ accounts })
}

async function handlePost(user: SessionUser, request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Données du responsable ONECS invalides.', details: parsed.error.flatten() }, { status: 400 })
  const email = parsed.data.email.toLowerCase()
  if (await db.user.findFirst({ where: { email }, select: { id: true } })) {
    return NextResponse.json({ error: 'Cette adresse est déjà utilisée.' }, { status: 409 })
  }
  const tempPassword = generateTempPassword()
  const account = await db.user.create({
    data: {
      tenantId: null,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email,
      role: 'ONECS',
      passwordHash: await bcrypt.hash(tempPassword, 12),
      mustChangePassword: true,
      isActive: true,
    },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true },
  })
  await db.auditLog.create({ data: {
    tenantId: null, userId: user.id, action: 'CREATE', entity: 'User', entityId: account.id,
    details: JSON.stringify({ role: 'ONECS', email }),
  } })
  return NextResponse.json({ account, tempPassword }, { status: 201 })
}

export const GET = withAuth(handleGet, ['SUPER_ADMIN'])
export const POST = withAuth(handlePost, ['SUPER_ADMIN'])
