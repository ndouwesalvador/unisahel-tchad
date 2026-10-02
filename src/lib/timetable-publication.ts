import { z } from 'zod'

const nullableId = z.string().nullable()
export const publishedSlotSchema = z.object({
  id: z.string(), academicYearId: z.string(), dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string(), endTime: z.string(), type: z.string(),
  course: z.string(), teacher: z.string(), room: z.string(),
  courseElementId: nullableId, teacherId: nullableId, roomId: nullableId,
  programId: nullableId, levelId: nullableId,
})
export type PublishedSlot = z.infer<typeof publishedSlotSchema>

export function parsePublishedSlots(value: unknown): PublishedSlot[] | null {
  const result = z.array(publishedSlotSchema).safeParse(value)
  return result.success ? result.data : null
}

export function latestPublishedVersions<T extends { departmentId: string; version: number }>(versions: T[]): T[] {
  const byDepartment = new Map<string, T>()
  for (const version of versions) {
    const current = byDepartment.get(version.departmentId)
    if (!current || version.version > current.version) byDepartment.set(version.departmentId, version)
  }
  return [...byDepartment.values()]
}
