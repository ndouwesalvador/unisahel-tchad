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

// Select components submit an empty string when a scope is not applicable.
// Treat that value as absent before validating CUIDs; otherwise valid
// institution-level roles (caisse, rectorat, scolarité, etc.) are rejected
// with the generic “données invalides” response.
const optionalCuid = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? undefined : value),
  z.string().cuid().optional(),
)

const nullableCuid = z.preprocess(
  (value) => (value === '' ? null : value),
  z.string().cuid().nullable().optional(),
)

const createStaffSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().max(30).optional(),
  role: z.enum(STAFF_ROLES),
  facultyId: optionalCuid,
  departmentId: optionalCuid,
  juryLevelIds: z.array(z.string().cuid()).max(30).optional(),
})

const updateStaffSchema = z.object({
  id: z.string().cuid(),
  isActive: z.boolean().optional(),
  role: z.enum(STAFF_ROLES).optional(),
  facultyId: nullableCuid,
  departmentId: nullableCuid,
  juryLevelIds: z.array(z.string().cuid()).max(30).optional(),
  resetPassword: z.boolean().optional(),
})

async function resolveJuryLevels(tenantId: string, departmentId: string | null | undefined, levelIds?: string[]) {
  if (!departmentId || !levelIds?.length) return { error: 'Sélectionnez au moins un niveau pour ce jury.' } as const
  const [year, levels] = await Promise.all([
    db.academicYear.findFirst({ where: { tenantId, isCurrent: true }, select: { id: true } }),
    db.level.findMany({ where: { id: { in: [...new Set(levelIds)] }, isActive: true,
      program: { tenantId, departmentId, isActive: true } },
      select: { id: true, programId: true, program: { select: { departmentId: true } } } }),
  ])
  if (!year) return { error: 'Configurez l’année académique courante avant d’affecter un jury.' } as const
  if (levels.length !== new Set(levelIds).size) return { error: 'Un niveau sélectionné est inactif ou hors du département.' } as const
  return { yearId: year.id, levels } as const
}

async function resolveStaffScope(tenantId: string, role: string, facultyId?: string | null, departmentId?: string | null) {
  if (role === 'FACULTE') {
    if (!facultyId || departmentId) return { error: 'Choisissez une faculté, sans département.' }
    const faculty = await db.faculty.findFirst({ where: { id: facultyId, tenantId, isActive: true }, select: { id: true } })
    return faculty ? { facultyId, departmentId: null } : { error: 'Faculté active introuvable dans cette institution.' }
  }
  if (role === 'DEPARTEMENT' || role === 'RESPONSABLE_FILIERE' || role === 'JURY') {
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
        juryAssignments: { where: { academicYear: { isCurrent: true } }, select: {
          levelId: true, programId: true, departmentId: true,
          program: { select: { name: true } }, level: { select: { name: true } },
        } },
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
      return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
    }
    const { firstName, lastName, email, phone, role, facultyId, departmentId, juryLevelIds } = parsed.data
    const scope = await resolveStaffScope(tenantId, role, facultyId, departmentId)
    if ('error' in scope) return NextResponse.json({ error: scope.error }, { status: 400 })
    const juryScope = role === 'JURY' ? await resolveJuryLevels(tenantId, scope.departmentId, juryLevelIds) : null
    if (juryScope && 'error' in juryScope) return NextResponse.json({ error: juryScope.error }, { status: 400 })

    // User.email is unique platform-wide
    const existing = await db.user.findUnique({ where: { email }, select: { id: true } })
    if (existing) {
      return NextResponse.json({ error: 'Un compte existe déjà avec cet e-mail' }, { status: 409 })
    }

    const tempPassword = generateTempPassword()
    const passwordHash = await bcrypt.hash(tempPassword, 12)

    const account = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { tenantId, firstName, lastName, email, phone, role, facultyId: scope.facultyId, departmentId: scope.departmentId,
          passwordHash, mustChangePassword: true,
          ...(juryScope && !('error' in juryScope) ? { juryAssignments: { create: juryScope.levels.map((level) => ({
            tenantId, academicYearId: juryScope.yearId, departmentId: level.program.departmentId!,
            programId: level.programId, levelId: level.id,
          })) } } : {}),
        },
        select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, facultyId: true, departmentId: true, isActive: true },
      })
      await tx.auditLog.create({ data: { tenantId, userId: user.id, action: 'CREATE', entity: 'User', entityId: created.id,
        details: JSON.stringify({ role, email, firstName, lastName, facultyId: scope.facultyId,
          departmentId: scope.departmentId, juryLevelIds: juryLevelIds ?? [] }) } })
      return created
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
      return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
    }
    const { id, isActive, role, facultyId, departmentId, juryLevelIds, resetPassword } = parsed.data

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
    const existingJuryLevelIds = existing.role === 'JURY' ? (await db.juryAssignment.findMany({
      where: { tenantId, userId: existing.id, academicYear: { isCurrent: true } }, select: { levelId: true },
    })).map((row) => row.levelId) : []
    const nextJuryLevelIds = juryLevelIds ?? (nextRole === existing.role ? existingJuryLevelIds : [])
    const juryScope = nextRole === 'JURY' ? await resolveJuryLevels(tenantId, scope.departmentId, nextJuryLevelIds) : null
    if (juryScope && 'error' in juryScope) return NextResponse.json({ error: juryScope.error }, { status: 400 })

    let tempPassword: string | undefined
    const data: { isActive?: boolean; role?: (typeof STAFF_ROLES)[number]; facultyId?: string | null; departmentId?: string | null;
      passwordHash?: string; mustChangePassword?: boolean; juryAssignments?: { deleteMany: { academicYearId?: string }; create?: Array<{
        tenantId: string; academicYearId: string; departmentId: string; programId: string; levelId: string
      }> } } = {}
    if (isActive !== undefined) data.isActive = isActive
    if (role !== undefined) data.role = role
    data.facultyId = scope.facultyId
    data.departmentId = scope.departmentId
    if (juryScope && !('error' in juryScope)) {
      data.juryAssignments = { deleteMany: { academicYearId: juryScope.yearId }, create: juryScope.levels.map((level) => ({
        tenantId, academicYearId: juryScope.yearId, departmentId: level.program.departmentId!, programId: level.programId, levelId: level.id,
      })) }
    } else if (existing.role === 'JURY') {
      data.juryAssignments = { deleteMany: {} }
    }
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
        details: JSON.stringify({ isActive, role, facultyId: scope.facultyId, departmentId: scope.departmentId,
          juryLevelIds: nextRole === 'JURY' ? nextJuryLevelIds : [], resetPassword: Boolean(resetPassword) }),
      },
    })

    return NextResponse.json({ data: { user: updated, tempPassword } })
  } catch (error) {
    console.error('Update staff error:', error)
    return NextResponse.json({ error: 'Failed to update user', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export const GET = withTenantAuth(getUsersHandler, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE'])
export const POST = withTenantAuth(createStaffHandler, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE'])
export const PUT = withTenantAuth(updateStaffHandler, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE'])
