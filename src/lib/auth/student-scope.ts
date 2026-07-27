import { db } from '@/lib/db'
import type { SessionUser } from '@/lib/auth/helpers'

// Roles that log in as a specific student (matricule+PIN "Espace Etudiant" account)
// and must only ever see their own records, never another student's or the
// institution's aggregates -- withTenantAuth only scopes by tenant, not by user.
export const STUDENT_SELF_ROLES = ['ETUDIANT', 'ETUDIANT_SANTE']

export function isStudentSelfRole(role: string): boolean {
  return STUDENT_SELF_ROLES.includes(role)
}

// Resolves the Student row linked to this session's User, if the caller is a
// student-tier account. Returns null for staff roles (no restriction applies).
export async function resolveOwnStudentId(user: SessionUser): Promise<string | null> {
  if (!isStudentSelfRole(user.role)) return null
  const student = await db.student.findFirst({
    where: { userId: user.id, tenantId: user.tenantId },
    select: { id: true },
  })
  return student?.id ?? null
}
