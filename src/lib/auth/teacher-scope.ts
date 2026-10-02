import { db } from '@/lib/db'
import type { SessionUser } from '@/lib/auth/helpers'

export async function getTeacherScope(user: SessionUser, tenantId: string) {
  const teacher = await db.teacher.findFirst({
    where: { userId: user.id, tenantId, isActive: true },
    select: { id: true },
  })
  if (!teacher) return { linked: false as const, teacherId: null, courseElementIds: [] as string[], teachingUnitIds: [] as string[] }

  const [elements, responsibleUnits] = await Promise.all([
    db.courseElement.findMany({
      where: {
        teachingUnit: { semester: { level: { program: { tenantId, isActive: true } } } },
        OR: [{ teacherId: teacher.id }, { teachingUnit: { responsibleId: teacher.id } }],
      },
      select: { id: true, teachingUnitId: true },
    }),
    db.teachingUnit.findMany({
      where: { responsibleId: teacher.id, semester: { level: { program: { tenantId, isActive: true } } } },
      select: { id: true },
    }),
  ])

  return {
    linked: true as const,
    teacherId: teacher.id,
    courseElementIds: elements.map((element) => element.id),
    teachingUnitIds: [...new Set([...elements.map((element) => element.teachingUnitId), ...responsibleUnits.map((unit) => unit.id)])],
  }
}
