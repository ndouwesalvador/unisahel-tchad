import { db } from '@/lib/db'
import type { SessionUser } from '@/lib/auth/helpers'
import { isOrganizationManager, isOrganizationScopedRole } from '@/lib/auth/role-capabilities'

export { isOrganizationManager, isOrganizationScopedRole } from '@/lib/auth/role-capabilities'

// Resolve permissions from the database on every request: a stale session
// cannot retain access after a reassignment or deactivation.
export async function getOrganizationScope(user: SessionUser, tenantId: string) {
  if (!isOrganizationScopedRole(user.role)) return null

  const account = await db.user.findFirst({
    where: { id: user.id, tenantId, role: user.role as 'FACULTE' | 'DEPARTEMENT' | 'RESPONSABLE_FILIERE', isActive: true },
    select: { facultyId: true, departmentId: true },
  })
  if (!account) return { facultyId: null, departmentIds: [] as string[] }

  if (user.role === 'DEPARTEMENT' || user.role === 'RESPONSABLE_FILIERE') {
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
