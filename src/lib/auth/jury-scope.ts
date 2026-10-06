import { db } from '@/lib/db'
import type { SessionUser } from '@/lib/auth/helpers'

export type JuryScope = {
  academicYearId: string
  assignments: Array<{
    departmentId: string
    programId: string
    levelId: string
    programName: string
    levelName: string
  }>
  departmentIds: string[]
  programIds: string[]
  levelIds: string[]
}

export async function getJuryScope(user: SessionUser, tenantId: string, academicYearId?: string | null): Promise<JuryScope> {
  const year = academicYearId
    ? await db.academicYear.findFirst({ where: { id: academicYearId, tenantId }, select: { id: true } })
    : await db.academicYear.findFirst({ where: { tenantId, isCurrent: true }, select: { id: true } })
  if (!year || user.role !== 'JURY') {
    return { academicYearId: year?.id ?? '', assignments: [], departmentIds: [], programIds: [], levelIds: [] }
  }
  const rows = await db.juryAssignment.findMany({
    where: { tenantId, userId: user.id, academicYearId: year.id,
      user: { isActive: true, role: 'JURY' }, department: { isActive: true },
      program: { isActive: true }, level: { isActive: true } },
    select: {
      departmentId: true, programId: true, levelId: true,
      program: { select: { name: true } }, level: { select: { name: true } },
    },
    orderBy: [{ program: { name: 'asc' } }, { level: { orderIndex: 'asc' } }],
  })
  const assignments = rows.map((row) => ({
    departmentId: row.departmentId, programId: row.programId, levelId: row.levelId,
    programName: row.program.name, levelName: row.level.name,
  }))
  return {
    academicYearId: year.id,
    assignments,
    departmentIds: [...new Set(assignments.map((row) => row.departmentId))],
    programIds: [...new Set(assignments.map((row) => row.programId))],
    levelIds: [...new Set(assignments.map((row) => row.levelId))],
  }
}

