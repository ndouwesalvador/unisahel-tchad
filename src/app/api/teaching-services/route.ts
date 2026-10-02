import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { getOrganizationScope } from '@/lib/auth/organization-scope'
import { nextServiceStatus, type ServiceAction, type ServiceStatus } from '@/lib/teaching-service'

const createSchema = z.object({
  academicYearId: z.string().min(1),
  courseElementId: z.string().min(1),
  teacherId: z.string().min(1),
  plannedHours: z.number().finite().positive().max(1000),
  reason: z.string().trim().min(10).max(2000),
})
const decisionSchema = z.object({
  id: z.string().min(1),
  action: z.enum(['HOME_APPROVE', 'HOME_REJECT', 'CENTRAL_APPROVE', 'CENTRAL_REJECT']),
  reason: z.string().trim().min(10).max(2000),
})
const serviceInclude = {
  academicYear: { select: { name: true } },
  courseElement: { select: {
    name: true, code: true,
    teachingUnit: { select: {
      name: true, code: true,
      semester: { select: {
        name: true,
        level: { select: { name: true, program: { select: { name: true } } } },
      } },
    } },
  } },
  teacher: { select: { user: { select: { firstName: true, lastName: true } } } },
  requestingDepartment: { select: { name: true } },
  homeDepartment: { select: { name: true } },
} as const

async function handleGet(user: SessionUser, tenantId: string, request: NextRequest) {
  const academicYearId = request.nextUrl.searchParams.get('academicYearId')
  if (!academicYearId) return NextResponse.json({ error: 'Année académique requise' }, { status: 400 })
  const year = await db.academicYear.findFirst({ where: { id: academicYearId, tenantId }, select: { id: true } })
  if (!year) return NextResponse.json({ error: 'Année académique introuvable' }, { status: 404 })
  const scope = await getOrganizationScope(user, tenantId)
  const departmentIds = scope?.departmentIds
  if (scope && departmentIds?.length === 0) return NextResponse.json({ error: 'Aucun département actif ne vous est attribué.' }, { status: 403 })
  const [services, teachers, elements] = await Promise.all([
    db.teachingService.findMany({
      where: { tenantId, academicYearId, ...(departmentIds ? { OR: [
        { requestingDepartmentId: { in: departmentIds } }, { homeDepartmentId: { in: departmentIds } },
      ] } : {}) },
      include: serviceInclude,
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),
    db.teacher.findMany({ where: { tenantId, isActive: true, departmentId: { not: null }, department: { isActive: true } },
      select: { id: true, departmentId: true, user: { select: { firstName: true, lastName: true } }, department: { select: { name: true } } },
      orderBy: { user: { lastName: 'asc' } }, take: 1000 }),
    db.courseElement.findMany({ where: { teachingUnit: { semester: { level: { program: {
      tenantId, isActive: true, departmentId: departmentIds ? { in: departmentIds } : { not: null },
    } } } } }, select: { id: true, name: true, code: true, hoursCM: true, hoursTD: true, hoursTP: true,
      teachingUnit: { select: { name: true, code: true, semester: { select: { name: true, level: { select: { name: true, program: { select: { name: true, departmentId: true, department: { select: { name: true } } } } } } } } } } },
      orderBy: { name: 'asc' }, take: 1000 }),
  ])
  return NextResponse.json({ services, teachers, elements, departmentIds: departmentIds ?? null })
}

async function handlePost(user: SessionUser, tenantId: string, request: NextRequest) {
  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Année, matière, enseignant, volume et motif (10 caractères minimum) requis.' }, { status: 400 })
  const { academicYearId, courseElementId, teacherId, plannedHours, reason } = parsed.data
  const scope = await getOrganizationScope(user, tenantId)
  const [year, element, teacher] = await Promise.all([
    db.academicYear.findFirst({ where: { id: academicYearId, tenantId }, select: { id: true } }),
    db.courseElement.findFirst({ where: { id: courseElementId, teachingUnit: { semester: { level: { program: { tenantId, isActive: true } } } } },
      select: { teachingUnit: { select: { semester: { select: { level: { select: { program: { select: { departmentId: true, department: { select: { isActive: true } } } } } } } } } } } }),
    db.teacher.findFirst({ where: { id: teacherId, tenantId, isActive: true }, select: { departmentId: true, department: { select: { isActive: true } } } }),
  ])
  if (!year || !element || !teacher) return NextResponse.json({ error: 'Année, matière ou enseignant introuvable.' }, { status: 404 })
  const requestingDepartmentId = element.teachingUnit.semester.level.program.departmentId
  const homeDepartmentId = teacher.departmentId
  if (!requestingDepartmentId || !element.teachingUnit.semester.level.program.department?.isActive || !homeDepartmentId || !teacher.department?.isActive) {
    return NextResponse.json({ error: 'Les deux départements doivent être actifs et définis.' }, { status: 400 })
  }
  if (scope && !scope.departmentIds.includes(requestingDepartmentId)) return NextResponse.json({ error: 'Matière hors de votre département.' }, { status: 403 })
  try {
    const service = await db.$transaction(async (tx) => {
      const created = await tx.teachingService.create({ data: {
        tenantId, academicYearId, courseElementId, teacherId, requestingDepartmentId, homeDepartmentId,
        plannedHours, requestReason: reason, requestedById: user.id,
        status: homeDepartmentId === requestingDepartmentId ? 'PENDING_CENTRAL' : 'PENDING_HOME',
      } })
      await tx.auditLog.create({ data: { tenantId, userId: user.id, action: 'CREATE', entity: 'TeachingService', entityId: created.id,
        details: JSON.stringify({ academicYearId, courseElementId, teacherId, requestingDepartmentId, homeDepartmentId, plannedHours, reason, status: created.status }) } })
      return created
    })
    return NextResponse.json({ service }, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Une demande non rejetée existe déjà pour cet enseignant, cette matière et cette année.' }, { status: 409 })
    }
    throw error
  }
}

async function handlePatch(user: SessionUser, tenantId: string, request: NextRequest) {
  const parsed = decisionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Décision et motif explicite (10 caractères minimum) requis.' }, { status: 400 })
  const { id, action, reason } = parsed.data
  const isHomeDecision = action.startsWith('HOME_')
  if (!isHomeDecision && !['ADMIN_INSTITUTION', 'SUPER_ADMIN'].includes(user.role)) return NextResponse.json({ error: 'Arbitrage réservé à l’administration centrale.' }, { status: 403 })
  const scope = await getOrganizationScope(user, tenantId)
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const service = await db.$transaction(async (tx) => {
        const current = await tx.teachingService.findFirst({ where: { id, tenantId } })
        if (!current) throw new Error('NOT_FOUND')
        if (isHomeDecision && (user.role !== 'DEPARTEMENT' && user.role !== 'FACULTE' || !scope?.departmentIds.includes(current.homeDepartmentId))) throw new Error('FORBIDDEN_HOME')
        if (isHomeDecision && current.requestedById === user.id) throw new Error('SELF_APPROVAL')
        const next = nextServiceStatus(current.status as ServiceStatus, action as ServiceAction)
        if (!next) throw new Error('INVALID_TRANSITION')
        // A transfer during review invalidates the original home department's consent.
        const [teacher, element] = await Promise.all([
          tx.teacher.findFirst({ where: { id: current.teacherId, tenantId, isActive: true }, select: { departmentId: true, department: { select: { isActive: true } } } }),
          tx.courseElement.findFirst({ where: { id: current.courseElementId, teachingUnit: { semester: { level: { program: { tenantId, isActive: true } } } } },
            select: { teachingUnit: { select: { semester: { select: { level: { select: { program: { select: { departmentId: true } } } } } } } } } }),
        ])
        if (!teacher || teacher.departmentId !== current.homeDepartmentId || !teacher.department?.isActive) throw new Error('HOME_CHANGED')
        if (!element || element.teachingUnit.semester.level.program.departmentId !== current.requestingDepartmentId) throw new Error('PROGRAM_CHANGED')
        const updated = await tx.teachingService.updateMany({ where: { id, tenantId, status: current.status }, data: {
          status: next,
          ...(isHomeDecision ? { homeDecidedById: user.id, homeDecisionReason: reason, homeDecidedAt: new Date() }
            : { centralDecidedById: user.id, centralDecisionReason: reason, centralDecidedAt: new Date() }),
        } })
        if (updated.count !== 1) throw new Error('INVALID_TRANSITION')
        await tx.auditLog.create({ data: { tenantId, userId: user.id, action: 'UPDATE', entity: 'TeachingService', entityId: id,
          details: JSON.stringify({ action, before: current.status, after: next, reason }) } })
        return tx.teachingService.findUniqueOrThrow({ where: { id } })
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
      return NextResponse.json({ service })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034' && attempt < 2) continue
      if (error instanceof Error) {
        const response: Record<string, [string, number]> = {
          NOT_FOUND: ['Demande introuvable.', 404], FORBIDDEN_HOME: ['Accord réservé à la direction du département de rattachement.', 403],
          SELF_APPROVAL: ['Le demandeur ne peut pas valider sa propre demande pour le département de rattachement.', 403],
          INVALID_TRANSITION: ['Cette demande a déjà été traitée ou ne peut pas recevoir cette décision.', 409],
          HOME_CHANGED: ['Le département de rattachement a changé : créez une nouvelle demande.', 409],
          PROGRAM_CHANGED: ['Le programme a changé de département : créez une nouvelle demande.', 409],
        }
        if (response[error.message]) return NextResponse.json({ error: response[error.message][0] }, { status: response[error.message][1] })
      }
      throw error
    }
  }
  return NextResponse.json({ error: 'Conflit de décision, réessayez.' }, { status: 409 })
}

export const GET = withTenantAuth(handleGet, ['ADMIN_INSTITUTION', 'SUPER_ADMIN', 'SCOLARITE', 'FACULTE', 'DEPARTEMENT'])
export const POST = withTenantAuth(handlePost, ['ADMIN_INSTITUTION', 'SUPER_ADMIN', 'FACULTE', 'DEPARTEMENT'])
export const PATCH = withTenantAuth(handlePatch, ['ADMIN_INSTITUTION', 'SUPER_ADMIN', 'FACULTE', 'DEPARTEMENT'])
