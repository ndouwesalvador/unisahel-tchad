import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { generateTempPassword } from '@/lib/password'
import { z } from 'zod'

// Roles an institution admin can provision a login-only account for.
// ENSEIGNANT is deliberately excluded: teacher accounts are created via
// POST /api/teachers, which also creates the required Teacher profile
// (department, grade, employeeId) -- a bare ENSEIGNANT user created here
// would leave that profile permanently missing.
const STAFF_ROLES = [
  'ADMIN_INSTITUTION',
  'RECTORAT',
  'SCOLARITE',
  'FACULTE',
  'DEPARTEMENT',
  'RESPONSABLE_FILIERE',
  'JURY',
  'CAISSE',
  'MAITRE_STAGE',
] as const

const createStaffSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().max(30).optional(),
  role: z.enum(STAFF_ROLES),
  facultyId: z.string().cuid().optional(),
  departmentId: z.string().cuid().optional(),
})

const updateStaffSchema = z.object({
  id: z.string().cuid(),
  isActive: z.boolean().optional(),
  role: z.enum(STAFF_ROLES).optional(),
  facultyId: z.string().cuid().nullable().optional(),
  departmentId: z.string().cuid().nullable().optional(),
  resetPassword: z.boolean().optional(),
})

async function resolveStaffScope(tenantId: string, role: string, facultyId?: string | null, departmentId?: string | null) {
  if (role === 'FACULTE') {
    if (!facultyId || departmentId) return { error: 'Choisissez une faculté, sans département.' }
    const faculty = await db.faculty.findFirst({ where: { id: facultyId, tenantId, isActive: true }, select: { id: true } })
    return faculty ? { facultyId, departmentId: null } : { error: 'Faculté active introuvable dans cette institution.' }
  }
  if (role === 'DEPARTEMENT') {
    if (!departmentId || facultyId) return { error: 'Choisissez un département, sans faculté.' }
    const department = await db.department.findFirst({ where: { id: departmentId, tenantId, isActive: true }, select: { id: true, facultyId: true } })
    return department?.facultyId ? { facultyId: null, departmentId } : { error: 'Département actif sans faculté de rattachement ou introuvable.' }
  }
  if (facultyId || departmentId) return { error: 'Ce rôle ne doit pas avoir de périmètre faculté ou département.' }
  return { facultyId: null, departmentId: null }
}

// Lists every non-student, non-parent account in the tenant -- includes
// ENSEIGNANT (managed via /api/teachers) for a unified staff directory, but
// creation/mutation here is restricted to STAFF_ROLES.
async function getUsersHandler(user: SessionUser, tenantId: string) {
  try {
    const users = await db.user.findMany({
      where: { tenantId, role: { notIn: ['ETUDIANT', 'ETUDIANT_SANTE', 'PARENT'] } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        facultyId: true,
        departmentId: true,
        isActive: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: [{ role: 'asc' }, { lastName: 'asc' }],
    })
    return NextResponse.json({ data: users })
  } catch (error) {
    console.error('List users error:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

async function createStaffHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createStaffSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Donnees invalides', details: parsed.error.flatten() }, { status: 400 })
    }
    const { firstName, lastName, email, phone, role, facultyId, departmentId } = parsed.data
    const scope = await resolveStaffScope(tenantId, role, facultyId, departmentId)
    if ('error' in scope) return NextResponse.json({ error: scope.error }, { status: 400 })

    // User.email is unique platform-wide
    const existing = await db.user.findUnique({ where: { email }, select: { id: true } })
    if (existing) {
      return NextResponse.json({ error: 'Un compte existe deja avec cet email' }, { status: 409 })
    }

    const tempPassword = generateTempPassword()
    const passwordHash = await bcrypt.hash(tempPassword, 12)

    const account = await db.user.create({
      data: { tenantId, firstName, lastName, email, phone, role, facultyId: scope.facultyId, departmentId: scope.departmentId, passwordHash, mustChangePassword: true },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, facultyId: true, departmentId: true, isActive: true },
    })

    await db.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: 'CREATE',
        entity: 'User',
        entityId: account.id,
        details: JSON.stringify({ role, email, firstName, lastName, facultyId: scope.facultyId, departmentId: scope.departmentId }),
      },
    })

    return NextResponse.json({ data: { user: account, tempPassword } }, { status: 201 })
  } catch (error) {
    console.error('Create staff error:', error)
    return NextResponse.json({ error: 'Failed to create user', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

async function updateStaffHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = updateStaffSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Donnees invalides', details: parsed.error.flatten() }, { status: 400 })
    }
    const { id, isActive, role, facultyId, departmentId, resetPassword } = parsed.data

    const existing = await db.user.findFirst({ where: { id, tenantId } })
    if (!existing) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }
    if (existing.id === user.id) {
      return NextResponse.json({ error: 'Impossible de modifier votre propre compte depuis cette page' }, { status: 400 })
    }
    if (!STAFF_ROLES.includes(existing.role as (typeof STAFF_ROLES)[number])) {
      return NextResponse.json({ error: 'Ce profil est géré par son module dédié.' }, { status: 403 })
    }

    const nextRole = role ?? existing.role
    const scope = await resolveStaffScope(
      tenantId, nextRole,
      facultyId !== undefined ? facultyId : role && role !== existing.role ? null : existing.facultyId,
      departmentId !== undefined ? departmentId : role && role !== existing.role ? null : existing.departmentId,
    )
    if ('error' in scope) return NextResponse.json({ error: scope.error }, { status: 400 })

    let tempPassword: string | undefined
    const data: { isActive?: boolean; role?: (typeof STAFF_ROLES)[number]; facultyId?: string | null; departmentId?: string | null; passwordHash?: string; mustChangePassword?: boolean } = {}
    if (isActive !== undefined) data.isActive = isActive
    if (role !== undefined) data.role = role
    data.facultyId = scope.facultyId
    data.departmentId = scope.departmentId
    if (resetPassword) {
      tempPassword = generateTempPassword()
      data.passwordHash = await bcrypt.hash(tempPassword, 12)
      data.mustChangePassword = true
    }

    const updated = await db.user.update({
      where: { id },
      data,
      select: { id: true, firstName: true, lastName: true, email: true, role: true, facultyId: true, departmentId: true, isActive: true },
    })

    await db.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: 'UPDATE',
        entity: 'User',
        entityId: updated.id,
        details: JSON.stringify({ isActive, role, facultyId: scope.facultyId, departmentId: scope.departmentId, resetPassword: Boolean(resetPassword) }),
      },
    })

    return NextResponse.json({ data: { user: updated, tempPassword } })
  } catch (error) {
    console.error('Update staff error:', error)
    return NextResponse.json({ error: 'Failed to update user', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export const GET = withTenantAuth(getUsersHandler, ['SUPER_ADMIN', 'ADMIN_INSTITUTION'])
export const POST = withTenantAuth(createStaffHandler, ['SUPER_ADMIN', 'ADMIN_INSTITUTION'])
export const PUT = withTenantAuth(updateStaffHandler, ['SUPER_ADMIN', 'ADMIN_INSTITUTION'])
