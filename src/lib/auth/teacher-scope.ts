import { db } from '@/lib/db'
import type { SessionUser } from '@/lib/auth/helpers'

export async function getTeacherScope(user: SessionUser, tenantId: string, requestedAcademicYearId?: string | null) {
  const teacher = await db.teacher.findFirst({
    where: { userId: user.id, tenantId, isActive: true },
    select: { id: true },
  })
  if (!teacher) return { linked: false as const, teacherId: null, academicYearId: null,
    courseElementIds: [] as string[], teachingUnitIds: [] as string[] }

  const year = await db.academicYear.findFirst({ where: requestedAcademicYearId
    ? { id: requestedAcademicYearId, tenantId } : { tenantId, isCurrent: true }, select: { id: true } })
  if (!year) return { linked: true as const, teacherId: teacher.id, academicYearId: null,
    courseElementIds: [] as string[], teachingUnitIds: [] as string[] }

  const services = await db.teachingService.findMany({ where: {
    tenantId, teacherId: teacher.id, academicYearId: year.id, status: 'APPROVED',
    courseElement: { teachingUnit: { semester: { level: { program: { tenantId, isActive: true } } } } },
  }, select: { courseElementId: true, courseElement: { select: { teachingUnitId: true } } } })

  return {
    linked: true as const,
    teacherId: teacher.id,
    academicYearId: year.id,
    courseElementIds: [...new Set(services.map((service) => service.courseElementId))],
    teachingUnitIds: [...new Set(services.map((service) => service.courseElement.teachingUnitId))],
  }
}
