import { db } from '@/lib/db'
import type { SessionUser } from '@/lib/auth/helpers'

export function isOrganizationManager(role: string) {
  return role === 'FACULTE' || role === 'DEPARTEMENT'
}

// Resolve permissions from the database on every request: a stale session
// cannot retain access after a reassignment or deactivation.
export async function getOrganizationScope(user: SessionUser, tenantId: string) {
  if (!isOrganizationManager(user.role)) return null

  const account = await db.user.findFirst({
    where: { id: user.id, tenantId, role: user.role as 'FACULTE' | 'DEPARTEMENT', isActive: true },
    select: { facultyId: true, departmentId: true },
  })
  if (!account) return { facultyId: null, departmentIds: [] as string[] }

  if (user.role === 'DEPARTEMENT') {
    const department = account.departmentId ? await db.department.findFirst({
      where: { id: account.departmentId, tenantId, isActive: true },
      select: { id: true, facultyId: true },
    }) : null
    return { facultyId: department?.facultyId ?? null, departmentIds: department ? [department.id] : [] }
  }

  const faculty = account.facultyId ? await db.faculty.findFirst({
    where: { id: account.facultyId, tenantId, isActive: true },
    select: { id: true, departments: { where: { tenantId, isActive: true }, select: { id: true } } },
  }) : null
  return { facultyId: faculty?.id ?? null, departmentIds: faculty?.departments.map((department) => department.id) ?? [] }
}
