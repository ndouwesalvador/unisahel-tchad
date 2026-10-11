import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { getOrganizationScope } from '@/lib/auth/organization-scope'
import { readVisibleTimetable, TimetableAccessError } from '@/lib/timetable/visible-timetable'

const VALID_TYPES = ['CM', 'TD', 'TP', 'EXAM']

// GET /api/timetable - list weekly timetable slots
async function handleGet(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const programId = searchParams.get('programId') || undefined
    const levelId = searchParams.get('levelId') || undefined
    const academicYearId = searchParams.get('academicYearId') || undefined
    return NextResponse.json(await readVisibleTimetable(user, tenantId, { programId, levelId, academicYearId }))
  } catch (error) {
    if (error instanceof TimetableAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Timetable API error:', error)
    return NextResponse.json({ error: "Impossible de charger l'emploi du temps" }, { status: 500 })
  }
}

// POST/PUT /api/timetable - create or revise a slot. The original and target
// program must both belong to the manager's scope.
async function saveSlot(user: SessionUser, tenantId: string, request: NextRequest, existingId?: string) {
  try {
    const existing = existingId ? await db.timetableSlot.findFirst({ where: { id: existingId, tenantId } }) : null
    if (existingId && !existing) return NextResponse.json({ error: 'Créneau introuvable' }, { status: 404 })
    const body = await request.json()
    const { academicYearId, dayOfWeek, startTime, endTime, courseElementId, teacherId, roomId, programId, levelId, type } = body

    if (!academicYearId || dayOfWeek === undefined || !startTime || !endTime || !courseElementId || !teacherId || !roomId || !programId || !levelId) {
      return NextResponse.json(
        { error: 'Année, jour, horaires, programme, niveau, matière, enseignant et salle sont obligatoires.' },
        { status: 400 }
      )
    }

    const day = Number(dayOfWeek)
    if (!Number.isInteger(day) || day < 0 || day > 6 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime)) {
      return NextResponse.json({ error: 'Jour ou horaires invalides' }, { status: 400 })
    }

    if (type && !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: `Le type doit être l'un des suivants : ${VALID_TYPES.join(', ')}` }, { status: 400 })
    }

    if (startTime >= endTime) {
      return NextResponse.json({ error: "L'heure de fin doit être postérieure à l'heure de début" }, { status: 400 })
    }

    const year = await db.academicYear.findFirst({ where: { id: academicYearId, tenantId } })
    if (!year) {
      return NextResponse.json({ error: 'Année académique introuvable dans cette institution' }, { status: 404 })
    }

    const organizationScope = await getOrganizationScope(user, tenantId)
    if (organizationScope && organizationScope.departmentIds.length === 0) {
      return NextResponse.json({ error: 'Aucun département actif ne vous est attribué.' }, { status: 403 })
    }
    if (existing && organizationScope) {
      const originalProgram = existing.programId ? await db.program.findFirst({
        where: { id: existing.programId, tenantId, departmentId: { in: organizationScope.departmentIds } },
        select: { id: true },
      }) : null
      if (!originalProgram) return NextResponse.json({ error: 'Créneau hors de votre périmètre' }, { status: 403 })
    }
    const program = await db.program.findFirst({ where: { id: programId, tenantId, isActive: true }, select: { id: true, departmentId: true } })
    if (!program) return NextResponse.json({ error: 'Programme introuvable' }, { status: 404 })
    if (!program.departmentId) return NextResponse.json({ error: 'Rattachez le programme à un département avant de le planifier.' }, { status: 400 })
    const targetDepartmentId = program.departmentId
    if (organizationScope && !organizationScope.departmentIds.includes(program.departmentId)) {
      return NextResponse.json({ error: 'Ce programme appartient à un autre département.' }, { status: 403 })
    }

    const [teacher, room] = await Promise.all([
      db.teacher.findFirst({ where: { id: teacherId, tenantId, isActive: true }, select: { id: true } }),
      db.room.findFirst({ where: { id: roomId, tenantId, isActive: true }, select: { id: true } }),
    ])
    if (!teacher || !room) return NextResponse.json({ error: 'Enseignant ou salle actif introuvable dans cette institution.' }, { status: 400 })

    if (courseElementId) {
      const element = await db.courseElement.findFirst({
        where: { id: courseElementId, teachingUnit: { semester: { level: { program: { tenantId } } } } },
        select: { teacherId: true, teachingUnit: { select: { responsibleId: true, semester: { select: { level: { select: { id: true, programId: true } } } } } } },
      })
      if (!element) return NextResponse.json({ error: 'Matière introuvable' }, { status: 404 })
      if (programId !== element.teachingUnit.semester.level.programId || levelId !== element.teachingUnit.semester.level.id) {
        return NextResponse.json({ error: 'Programme ou niveau incohérent avec la matière' }, { status: 400 })
      }
      // Existing legacy slots remain editable without inventing approval
      // history. Any new pairing must use an explicitly approved annual service.
      const unchangedLegacyPair = existing?.academicYearId === academicYearId
        && existing?.courseElementId === courseElementId && existing?.teacherId === teacherId
      if (!unchangedLegacyPair) {
        const service = await db.teachingService.findFirst({ where: {
          tenantId, academicYearId, courseElementId, teacherId, status: 'APPROVED',
          requestingDepartmentId: program.departmentId,
        }, select: { id: true } })
        if (!service) return NextResponse.json({ error: 'Service annuel non approuvé pour cet enseignant, cette matière et cette année.' }, { status: 409 })
      }
    }

    const slotData = {
        tenantId,
        academicYearId,
        dayOfWeek: day,
        startTime,
        endTime,
        courseElementId: courseElementId ?? null,
        teacherId: teacherId ?? null,
        roomId: roomId ?? null,
        programId: programId ?? null,
        levelId: levelId ?? null,
        type: type ?? undefined,
      }
    let slot: Awaited<ReturnType<typeof db.timetableSlot.create>> | undefined
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        slot = await db.$transaction(async (tx) => {
          const conflicts = await tx.timetableSlot.findMany({
            where: {
              tenantId, academicYearId, dayOfWeek: day,
              startTime: { lt: endTime }, endTime: { gt: startTime },
              ...(existingId ? { id: { not: existingId } } : {}),
              OR: [{ roomId }, { teacherId }, { levelId }],
            }, take: 1,
          })
          if (conflicts.length > 0) throw new Error('SLOT_CONFLICT')
          const originalDepartment = existing?.programId ? await tx.program.findFirst({ where: { id: existing.programId, tenantId }, select: { departmentId: true } }) : null
          const pending = await tx.timetablePublication.findFirst({ where: { tenantId, status: 'PENDING_REVIEW', OR: [
            { academicYearId, departmentId: targetDepartmentId },
            ...(existing && originalDepartment?.departmentId ? [{ academicYearId: existing.academicYearId, departmentId: originalDepartment.departmentId }] : []),
          ] }, select: { id: true } })
          if (pending) throw new Error('PUBLICATION_PENDING')
          const saved = existingId
            ? await tx.timetableSlot.update({ where: { id: existingId }, data: slotData })
            : await tx.timetableSlot.create({ data: slotData })
          await tx.auditLog.create({ data: {
            tenantId, userId: user.id, action: existingId ? 'UPDATE' : 'CREATE', entity: 'TimetableSlot', entityId: saved.id,
            details: JSON.stringify({ before: existing ? { programId: existing.programId, levelId: existing.levelId, courseElementId: existing.courseElementId, teacherId: existing.teacherId, roomId: existing.roomId, dayOfWeek: existing.dayOfWeek, startTime: existing.startTime, endTime: existing.endTime } : null, after: slotData }),
          } })
          return saved
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
        break
      } catch (error) {
        if (error instanceof Error && error.message === 'SLOT_CONFLICT') {
          return NextResponse.json({ error: 'Conflit détecté : salle, enseignant ou niveau déjà occupé sur ce créneau.' }, { status: 409 })
        }
        if (error instanceof Error && error.message === 'PUBLICATION_PENDING') {
          return NextResponse.json({ error: 'Une version est en cours de validation. Attendez la décision avant de modifier le brouillon.' }, { status: 409 })
        }
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2034' && attempt < 2) continue
        throw error
      }
    }
    if (!slot) return NextResponse.json({ error: 'Conflit de planification, réessayez.' }, { status: 409 })

    return NextResponse.json({ slot }, { status: existingId ? 200 : 201 })
  } catch (error) {
    console.error('Create timetable slot error:', error)
    return NextResponse.json({ error: 'Impossible d’enregistrer le créneau' }, { status: 500 })
  }
}

async function handlePost(user: SessionUser, tenantId: string, request: NextRequest) {
  return saveSlot(user, tenantId, request)
}

async function handlePut(user: SessionUser, tenantId: string, request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Identifiant du créneau requis' }, { status: 400 })
  return saveSlot(user, tenantId, request, id)
}

async function handleDelete(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Identifiant du créneau requis' }, { status: 400 })
    const slot = await db.timetableSlot.findFirst({ where: { id, tenantId } })
    if (!slot) return NextResponse.json({ error: 'Créneau introuvable' }, { status: 404 })
    const scope = await getOrganizationScope(user, tenantId)
    if (scope) {
      const program = slot.programId ? await db.program.findFirst({
        where: { id: slot.programId, tenantId, departmentId: { in: scope.departmentIds } }, select: { id: true },
      }) : null
      if (!program) return NextResponse.json({ error: 'Créneau hors de votre périmètre' }, { status: 403 })
    }
    await db.$transaction(async (tx) => {
      const program = slot.programId ? await tx.program.findFirst({ where: { id: slot.programId, tenantId }, select: { departmentId: true } }) : null
      if (program?.departmentId) {
        const pending = await tx.timetablePublication.findFirst({ where: { tenantId, academicYearId: slot.academicYearId,
          departmentId: program.departmentId, status: 'PENDING_REVIEW' }, select: { id: true } })
        if (pending) throw new Error('PUBLICATION_PENDING')
      }
      await tx.timetableSlot.delete({ where: { id } })
      await tx.auditLog.create({ data: {
        tenantId, userId: user.id, action: 'DELETE', entity: 'TimetableSlot', entityId: id,
        details: JSON.stringify({ programId: slot.programId, levelId: slot.levelId, courseElementId: slot.courseElementId, teacherId: slot.teacherId, roomId: slot.roomId, dayOfWeek: slot.dayOfWeek, startTime: slot.startTime, endTime: slot.endTime }),
      } })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    return NextResponse.json({ deleted: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'PUBLICATION_PENDING') return NextResponse.json({ error: 'Version en cours de validation : suppression suspendue.' }, { status: 409 })
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') return NextResponse.json({ error: 'Modification concurrente, réessayez.' }, { status: 409 })
    console.error('Delete timetable slot error:', error)
    return NextResponse.json({ error: 'Suppression du créneau impossible' }, { status: 500 })
  }
}

export const GET = withTenantAuth(handleGet)
export const POST = withTenantAuth(handlePost, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE', 'FACULTE', 'DEPARTEMENT'])
export const PUT = withTenantAuth(handlePut, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE', 'FACULTE', 'DEPARTEMENT'])
export const DELETE = withTenantAuth(handleDelete, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE', 'FACULTE', 'DEPARTEMENT'])
