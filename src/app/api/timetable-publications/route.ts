import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { getOrganizationScope } from '@/lib/auth/organization-scope'
import { parsePublishedSlots, type PublishedSlot } from '@/lib/timetable-publication'

const submitSchema = z.object({ academicYearId: z.string().min(1), departmentId: z.string().min(1), reason: z.string().trim().min(10).max(2000) })
const reviewSchema = z.object({ id: z.string().min(1), action: z.enum(['APPROVE', 'REJECT']), reason: z.string().trim().min(10).max(2000) })
const reviewerRoles = new Set(['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'FACULTE'])

async function getScope(user: SessionUser, tenantId: string) {
  const scope = await getOrganizationScope(user, tenantId)
  return scope?.departmentIds ?? null
}

async function buildSnapshot(tx: Prisma.TransactionClient, tenantId: string, slots: Awaited<ReturnType<typeof db.timetableSlot.findMany>>): Promise<PublishedSlot[]> {
  const courseIds = [...new Set(slots.map(slot => slot.courseElementId).filter((id): id is string => !!id))]
  const teacherIds = [...new Set(slots.map(slot => slot.teacherId).filter((id): id is string => !!id))]
  const roomIds = [...new Set(slots.map(slot => slot.roomId).filter((id): id is string => !!id))]
  const [courses, teachers, rooms] = await Promise.all([
    tx.courseElement.findMany({ where: { id: { in: courseIds }, teachingUnit: { semester: { level: { program: { tenantId } } } } },
      select: { id: true, name: true, teachingUnit: { select: { semester: { select: { level: { select: { id: true, programId: true } } } } } } } }),
    tx.teacher.findMany({ where: { id: { in: teacherIds }, tenantId, isActive: true }, select: { id: true, user: { select: { firstName: true, lastName: true } } } }),
    tx.room.findMany({ where: { id: { in: roomIds }, tenantId, isActive: true }, select: { id: true, name: true } }),
  ])
  if (courses.length !== courseIds.length || teachers.length !== teacherIds.length || rooms.length !== roomIds.length) throw new Error('RESOURCE_INACTIVE')
  const courseById = new Map(courses.map(course => [course.id, course]))
  if (slots.some(slot => {
    const level = courseById.get(slot.courseElementId ?? '')?.teachingUnit.semester.level
    return !level || level.id !== slot.levelId || level.programId !== slot.programId
  })) throw new Error('INVALID_DRAFT_STRUCTURE')
  const courseNames = new Map(courses.map(course => [course.id, course.name]))
  const teacherNames = new Map(teachers.map(teacher => [teacher.id, teacher.user ? `${teacher.user.firstName} ${teacher.user.lastName}` : '']))
  const roomNames = new Map(rooms.map(room => [room.id, room.name]))
  return slots.map(slot => ({
    id: slot.id, academicYearId: slot.academicYearId, dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime, endTime: slot.endTime, type: slot.type,
    courseElementId: slot.courseElementId, teacherId: slot.teacherId, roomId: slot.roomId,
    programId: slot.programId, levelId: slot.levelId,
    course: courseNames.get(slot.courseElementId ?? '') ?? '',
    teacher: teacherNames.get(slot.teacherId ?? '') ?? '',
    room: roomNames.get(slot.roomId ?? '') ?? '',
  }))
}

async function handleGet(user: SessionUser, tenantId: string, request: NextRequest) {
  const academicYearId = request.nextUrl.searchParams.get('academicYearId')
  if (!academicYearId) return NextResponse.json({ error: 'Année académique requise.' }, { status: 400 })
  const year = await db.academicYear.findFirst({ where: { id: academicYearId, tenantId }, select: { id: true, name: true } })
  if (!year) return NextResponse.json({ error: 'Année académique introuvable.' }, { status: 404 })
  const departmentIds = await getScope(user, tenantId)
  if (departmentIds && departmentIds.length === 0) return NextResponse.json({ departments: [], publications: [] })
  const departments = await db.department.findMany({ where: { tenantId, isActive: true, ...(departmentIds ? { id: { in: departmentIds } } : {}) }, select: { id: true, name: true }, orderBy: { name: 'asc' } })
  const visibleIds = departments.map(department => department.id)
  const publicationId = request.nextUrl.searchParams.get('publicationId')
  if (publicationId) {
    const publication = await db.timetablePublication.findFirst({ where: { id: publicationId, tenantId, academicYearId, departmentId: { in: visibleIds } } })
    if (!publication) return NextResponse.json({ error: 'Version introuvable dans votre périmètre.' }, { status: 404 })
    const snapshot = parsePublishedSlots(publication.snapshot)
    if (!snapshot) return NextResponse.json({ error: 'Instantané de publication invalide.' }, { status: 500 })
    return NextResponse.json({ publication: { ...publication, snapshot } })
  }
  const publications = await db.timetablePublication.findMany({
    where: { tenantId, academicYearId, departmentId: { in: visibleIds } },
    select: { id: true, departmentId: true, version: true, status: true, reason: true, reviewReason: true,
      submittedById: true, reviewedById: true, createdAt: true, reviewedAt: true, snapshot: true },
    orderBy: [{ departmentId: 'asc' }, { version: 'desc' }],
  })
  return NextResponse.json({ year, departments, publications: publications.map(({ snapshot, ...publication }) => ({
    ...publication, slotCount: Array.isArray(snapshot) ? snapshot.length : 0,
  })) })
}

async function handlePost(user: SessionUser, tenantId: string, request: NextRequest) {
  const parsed = submitSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Année, département et motif détaillé (10 caractères minimum) requis.' }, { status: 400 })
  const { academicYearId, departmentId, reason } = parsed.data
  const departmentIds = await getScope(user, tenantId)
  if (departmentIds && !departmentIds.includes(departmentId)) return NextResponse.json({ error: 'Département hors de votre périmètre.' }, { status: 403 })
  const [year, department] = await Promise.all([
    db.academicYear.findFirst({ where: { id: academicYearId, tenantId }, select: { id: true } }),
    db.department.findFirst({ where: { id: departmentId, tenantId, isActive: true }, select: { id: true } }),
  ])
  if (!year || !department) return NextResponse.json({ error: 'Année ou département actif introuvable.' }, { status: 404 })

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const publication = await db.$transaction(async tx => {
        const pending = await tx.timetablePublication.findFirst({ where: { tenantId, academicYearId, departmentId, status: 'PENDING_REVIEW' }, select: { id: true } })
        if (pending) throw new Error('PENDING_EXISTS')
        const programs = await tx.program.findMany({ where: { tenantId, departmentId, isActive: true }, select: { id: true } })
        const slots = await tx.timetableSlot.findMany({ where: { tenantId, academicYearId, programId: { in: programs.map(program => program.id) } }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] })
        if (slots.length === 0) throw new Error('EMPTY_DRAFT')
        if (slots.some(slot => !slot.courseElementId || !slot.teacherId || !slot.roomId || !slot.levelId || !slot.programId)) throw new Error('INCOMPLETE_DRAFT')
        const approved = await tx.teachingService.findMany({ where: { tenantId, academicYearId, requestingDepartmentId: departmentId, status: 'APPROVED' }, select: { courseElementId: true, teacherId: true } })
        const approvedPairs = new Set(approved.map(service => `${service.courseElementId}:${service.teacherId}`))
        const missing = slots.filter(slot => !approvedPairs.has(`${slot.courseElementId}:${slot.teacherId}`))
        if (missing.length) throw new Error(`UNAPPROVED_SERVICE:${missing.length}`)
        const snapshot = await buildSnapshot(tx, tenantId, slots)
        const last = await tx.timetablePublication.findFirst({ where: { tenantId, academicYearId, departmentId }, select: { version: true }, orderBy: { version: 'desc' } })
        const created = await tx.timetablePublication.create({ data: {
          tenantId, academicYearId, departmentId, version: (last?.version ?? 0) + 1,
          status: 'PENDING_REVIEW', snapshot: snapshot as unknown as Prisma.InputJsonValue,
          reason, submittedById: user.id,
        } })
        await tx.auditLog.create({ data: { tenantId, userId: user.id, action: 'CREATE', entity: 'TimetablePublication', entityId: created.id,
          details: JSON.stringify({ academicYearId, departmentId, version: created.version, slotCount: snapshot.length, reason, status: 'PENDING_REVIEW' }) } })
        return created
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
      return NextResponse.json({ publication }, { status: 201 })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2034', 'P2002'].includes(error.code) && attempt < 2) continue
      if (error instanceof Error) {
        if (error.message === 'PENDING_EXISTS') return NextResponse.json({ error: 'Une version est déjà en attente de validation.' }, { status: 409 })
        if (error.message === 'EMPTY_DRAFT') return NextResponse.json({ error: 'Aucun créneau dans le brouillon de ce département.' }, { status: 409 })
        if (error.message === 'INCOMPLETE_DRAFT') return NextResponse.json({ error: 'Certains créneaux sont incomplets.' }, { status: 409 })
        if (error.message === 'RESOURCE_INACTIVE') return NextResponse.json({ error: 'Une matière, une salle ou un enseignant du brouillon est introuvable ou inactif.' }, { status: 409 })
        if (error.message === 'INVALID_DRAFT_STRUCTURE') return NextResponse.json({ error: 'Un créneau ne correspond plus au programme et au niveau de sa matière.' }, { status: 409 })
        if (error.message.startsWith('UNAPPROVED_SERVICE:')) return NextResponse.json({ error: `${error.message.split(':')[1]} créneau(x) sans service annuel approuvé. Régularisez-les avant de soumettre.` }, { status: 409 })
      }
      console.error('Timetable submission error:', error)
      return NextResponse.json({ error: 'Soumission impossible.' }, { status: 500 })
    }
  }
  return NextResponse.json({ error: 'Conflit concurrent, réessayez.' }, { status: 409 })
}

async function handlePatch(user: SessionUser, tenantId: string, request: NextRequest) {
  const parsed = reviewSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Version, décision et motif détaillé (10 caractères minimum) requis.' }, { status: 400 })
  if (!reviewerRoles.has(user.role)) return NextResponse.json({ error: 'Validation réservée au décanat ou à l’administration centrale.' }, { status: 403 })
  const { id, action, reason } = parsed.data
  const departmentIds = await getScope(user, tenantId)
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const publication = await db.$transaction(async tx => {
        const current = await tx.timetablePublication.findFirst({ where: { id, tenantId } })
        if (!current) throw new Error('NOT_FOUND')
        if (departmentIds && !departmentIds.includes(current.departmentId)) throw new Error('OUT_OF_SCOPE')
        if (current.status !== 'PENDING_REVIEW') throw new Error('ALREADY_REVIEWED')
        if (user.role === 'FACULTE' && current.submittedById === user.id) throw new Error('SELF_REVIEW')
        const snapshot = parsePublishedSlots(current.snapshot)
        if (!snapshot || snapshot.length === 0) throw new Error('INVALID_SNAPSHOT')
        const status = action === 'APPROVE' ? 'PUBLISHED' : 'REJECTED'
        if (status === 'PUBLISHED') {
          if (snapshot.some(slot => !slot.courseElementId || !slot.teacherId || !slot.roomId || !slot.programId || !slot.levelId
            || slot.academicYearId !== current.academicYearId)) throw new Error('INVALID_SNAPSHOT')
          const teacherIds = [...new Set(snapshot.map(slot => slot.teacherId!))]
          const roomIds = [...new Set(snapshot.map(slot => slot.roomId!))]
          const programIds = [...new Set(snapshot.map(slot => slot.programId!))]
          const [teachers, rooms, programs, services] = await Promise.all([
            tx.teacher.findMany({ where: { tenantId, isActive: true, id: { in: teacherIds } }, select: { id: true } }),
            tx.room.findMany({ where: { tenantId, isActive: true, id: { in: roomIds } }, select: { id: true } }),
            tx.program.findMany({ where: { tenantId, isActive: true, departmentId: current.departmentId, id: { in: programIds } }, select: { id: true } }),
            tx.teachingService.findMany({ where: { tenantId, academicYearId: current.academicYearId,
              requestingDepartmentId: current.departmentId, status: 'APPROVED' }, select: { courseElementId: true, teacherId: true } }),
          ])
          if (teachers.length !== teacherIds.length || rooms.length !== roomIds.length || programs.length !== programIds.length) throw new Error('RESOURCE_INACTIVE')
          const approvedPairs = new Set(services.map(service => `${service.courseElementId}:${service.teacherId}`))
          if (snapshot.some(slot => !approvedPairs.has(`${slot.courseElementId}:${slot.teacherId}`))) throw new Error('UNAPPROVED_SERVICE')
        }
        const updated = await tx.timetablePublication.updateMany({ where: { id, tenantId, status: 'PENDING_REVIEW' }, data: {
          status, reviewedById: user.id, reviewReason: reason, reviewedAt: new Date(),
        } })
        if (updated.count !== 1) throw new Error('ALREADY_REVIEWED')
        await tx.auditLog.create({ data: { tenantId, userId: user.id, action: 'UPDATE', entity: 'TimetablePublication', entityId: id,
          details: JSON.stringify({ before: 'PENDING_REVIEW', after: status, reason, version: current.version, departmentId: current.departmentId }) } })
        if (status === 'PUBLISHED') {
          const teacherIds = [...new Set(snapshot.map(slot => slot.teacherId).filter((value): value is string => !!value))]
          const pairs = [...new Set(snapshot.map(slot => `${slot.programId}:${slot.levelId}`))].map(value => {
            const [programId, levelId] = value.split(':'); return { programId, levelId }
          })
          const [teachers, registrations, department] = await Promise.all([
            tx.teacher.findMany({ where: { tenantId, id: { in: teacherIds }, userId: { not: null } }, select: { userId: true } }),
            tx.administrativeRegistration.findMany({ where: { tenantId, academicYearId: current.academicYearId, status: 'INSCRIT', OR: pairs,
              student: { tenantId, status: 'INSCRIT' } }, select: { student: { select: { userId: true } } } }),
            tx.department.findFirst({ where: { id: current.departmentId, tenantId }, select: { name: true } }),
          ])
          const recipients = [...new Set([...teachers.map(teacher => teacher.userId), ...registrations.map(registration => registration.student.userId)].filter((value): value is string => !!value))]
          if (recipients.length) await tx.notification.createMany({ data: recipients.map(recipientUserId => ({
            tenantId, recipientUserId, type: 'info', category: 'Academique',
            title: 'Emploi du temps publié',
            description: `${department?.name ?? 'Votre département'} : version ${current.version} de l’emploi du temps disponible.`,
          })) })
        }
        return tx.timetablePublication.findUniqueOrThrow({ where: { id } })
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
      return NextResponse.json({ publication })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034' && attempt < 2) continue
      if (error instanceof Error) {
        const failures: Record<string, [string, number]> = {
          NOT_FOUND: ['Version introuvable.', 404], OUT_OF_SCOPE: ['Département hors de votre périmètre.', 403],
          ALREADY_REVIEWED: ['Cette version a déjà été traitée.', 409], SELF_REVIEW: ['Le soumetteur ne peut pas valider sa propre version.', 403],
          INVALID_SNAPSHOT: ['Instantané invalide ou vide.', 409],
          RESOURCE_INACTIVE: ['Une salle, un enseignant ou un programme est devenu inactif depuis la soumission.', 409],
          UNAPPROVED_SERVICE: ['Un service annuel n’est plus approuvé depuis la soumission.', 409],
        }
        if (failures[error.message]) return NextResponse.json({ error: failures[error.message][0] }, { status: failures[error.message][1] })
      }
      console.error('Timetable review error:', error)
      return NextResponse.json({ error: 'Décision impossible.' }, { status: 500 })
    }
  }
  return NextResponse.json({ error: 'Conflit concurrent, réessayez.' }, { status: 409 })
}

export const GET = withTenantAuth(handleGet, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE', 'FACULTE', 'DEPARTEMENT'])
export const POST = withTenantAuth(handlePost, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE', 'FACULTE', 'DEPARTEMENT'])
export const PATCH = withTenantAuth(handlePatch, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'FACULTE'])
