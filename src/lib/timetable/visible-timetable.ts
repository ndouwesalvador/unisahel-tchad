import { db } from '@/lib/db'
import type { SessionUser } from '@/lib/auth/helpers'
import { getTeacherScope } from '@/lib/auth/teacher-scope'
import { getOrganizationScope } from '@/lib/auth/organization-scope'
import { isStudentSelfRole, resolveOwnStudentId } from '@/lib/auth/student-scope'
import { latestPublishedVersions, parsePublishedSlots, type PublishedSlot } from '@/lib/timetable-publication'

export class TimetableAccessError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

type TimetableFilters = {
  academicYearId?: string
  programId?: string
  levelId?: string
}

export type VisibleTimetable = {
  slots: PublishedSlot[]
  source: 'draft' | 'published'
  registration?: { programId: string; levelId: string } | null
}

async function resolveSlotNames(
  tenantId: string,
  slots: { courseElementId: string | null; teacherId: string | null; roomId: string | null }[],
) {
  const courseElementIds = [...new Set(slots.map((slot) => slot.courseElementId).filter((value): value is string => Boolean(value)))]
  const teacherIds = [...new Set(slots.map((slot) => slot.teacherId).filter((value): value is string => Boolean(value)))]
  const roomIds = [...new Set(slots.map((slot) => slot.roomId).filter((value): value is string => Boolean(value)))]

  const [courseElements, teachers, rooms] = await Promise.all([
    courseElementIds.length
      ? db.courseElement.findMany({
          where: { id: { in: courseElementIds }, teachingUnit: { semester: { level: { program: { tenantId } } } } },
          select: { id: true, name: true },
        })
      : [],
    teacherIds.length
      ? db.teacher.findMany({
          where: { id: { in: teacherIds }, tenantId },
          select: { id: true, user: { select: { firstName: true, lastName: true } } },
        })
      : [],
    roomIds.length
      ? db.room.findMany({ where: { id: { in: roomIds }, tenantId }, select: { id: true, name: true } })
      : [],
  ])

  return {
    courseMap: new Map(courseElements.map((course) => [course.id, course.name])),
    teacherMap: new Map(teachers.map((teacher) => [
      teacher.id,
      teacher.user ? `${teacher.user.firstName} ${teacher.user.lastName}`.trim() : '',
    ])),
    roomMap: new Map(rooms.map((room) => [room.id, room.name])),
  }
}

export async function readVisibleTimetable(
  user: SessionUser,
  tenantId: string,
  { academicYearId, programId, levelId }: TimetableFilters,
): Promise<VisibleTimetable> {
  if (academicYearId && !await db.academicYear.findFirst({
    where: { id: academicYearId, tenantId },
    select: { id: true },
  })) {
    throw new TimetableAccessError('Année académique introuvable', 404)
  }

  const canReadDraft = ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE', 'FACULTE', 'DEPARTEMENT'].includes(user.role)
  if (!canReadDraft) {
    if (!['ENSEIGNANT', 'RECTORAT'].includes(user.role) && !isStudentSelfRole(user.role)) {
      throw new TimetableAccessError('Accès refusé', 403)
    }
    if (!academicYearId) throw new TimetableAccessError('Année académique requise', 400)

    let teacherId: string | null = null
    let studentProgramId: string | null = null
    let studentLevelId: string | null = null
    if (user.role === 'ENSEIGNANT') {
      const teacher = await db.teacher.findFirst({
        where: { userId: user.id, tenantId, isActive: true },
        select: { id: true },
      })
      if (!teacher) return { slots: [], source: 'published' }
      teacherId = teacher.id
    }
    if (isStudentSelfRole(user.role)) {
      const studentId = await resolveOwnStudentId(user)
      if (!studentId) return { slots: [], source: 'published', registration: null }
      const registration = await db.administrativeRegistration.findFirst({
        where: { tenantId, studentId, academicYearId, status: 'INSCRIT' },
        select: { programId: true, levelId: true },
        orderBy: { registrationDate: 'desc' },
      })
      if (!registration) return { slots: [], source: 'published', registration: null }
      studentProgramId = registration.programId
      studentLevelId = registration.levelId
      if ((programId && programId !== studentProgramId) || (levelId && levelId !== studentLevelId)) {
        throw new TimetableAccessError('Programme ou niveau hors de votre inscription.', 403)
      }
    }

    const publications = await db.timetablePublication.findMany({
      where: { tenantId, academicYearId, status: { in: ['PUBLISHED', 'LEGACY_BASELINE'] } },
      select: { departmentId: true, version: true, snapshot: true },
    })
    const slots: PublishedSlot[] = []
    for (const publication of latestPublishedVersions(publications)) {
      const snapshot = parsePublishedSlots(publication.snapshot)
      if (!snapshot) throw new TimetableAccessError('Version publiée invalide.', 500)
      slots.push(...snapshot.filter((slot) =>
        (!teacherId || slot.teacherId === teacherId)
        && (!studentProgramId || slot.programId === studentProgramId && slot.levelId === studentLevelId)
        && (!programId || slot.programId === programId)
        && (!levelId || slot.levelId === levelId)
      ))
    }
    slots.sort((left, right) => left.dayOfWeek - right.dayOfWeek || left.startTime.localeCompare(right.startTime))
    return {
      slots,
      source: 'published',
      ...(studentProgramId ? { registration: { programId: studentProgramId, levelId: studentLevelId! } } : {}),
    }
  }

  const teacherScope = user.role === 'ENSEIGNANT' ? await getTeacherScope(user, tenantId) : null
  if (teacherScope && !teacherScope.linked) return { slots: [], source: 'draft' }
  const organizationScope = await getOrganizationScope(user, tenantId)
  if (organizationScope && organizationScope.departmentIds.length === 0) return { slots: [], source: 'draft' }
  const scopedProgramIds = organizationScope ? (await db.program.findMany({
    where: { tenantId, isActive: true, departmentId: { in: organizationScope.departmentIds } },
    select: { id: true },
  })).map((program) => program.id) : null
  if (scopedProgramIds && programId && !scopedProgramIds.includes(programId)) {
    throw new TimetableAccessError('Programme hors de votre périmètre', 403)
  }

  const slots = await db.timetableSlot.findMany({
    where: {
      tenantId,
      ...(scopedProgramIds ? { programId: { in: programId ? [programId] : scopedProgramIds } } : programId ? { programId } : {}),
      ...(levelId ? { levelId } : {}),
      ...(academicYearId ? { academicYearId } : {}),
      ...(teacherScope ? { teacherId: teacherScope.teacherId } : {}),
    },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    take: 300,
  })
  const { courseMap, teacherMap, roomMap } = await resolveSlotNames(tenantId, slots)
  return {
    source: 'draft',
    slots: slots.map((slot) => ({
      id: slot.id,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      type: slot.type,
      course: (slot.courseElementId && courseMap.get(slot.courseElementId)) || '',
      teacher: (slot.teacherId && teacherMap.get(slot.teacherId)) || '',
      room: (slot.roomId && roomMap.get(slot.roomId)) || '',
      courseElementId: slot.courseElementId,
      academicYearId: slot.academicYearId,
      teacherId: slot.teacherId,
      roomId: slot.roomId,
      programId: slot.programId,
      levelId: slot.levelId,
    })),
  }
}
