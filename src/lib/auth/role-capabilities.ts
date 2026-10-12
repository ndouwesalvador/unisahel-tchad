export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN_INSTITUTION'
  | 'RECTORAT'
  | 'SCOLARITE'
  | 'FACULTE'
  | 'DEPARTEMENT'
  | 'ENSEIGNANT'
  | 'RESPONSABLE_FILIERE'
  | 'JURY'
  | 'CAISSE'
  | 'ETUDIANT'
  | 'ETUDIANT_SANTE'
  | 'MAITRE_STAGE'
  | 'PARENT'
  | 'ONECS'

export type AppView =
  | 'landing' | 'login' | 'signup' | 'student-login'
  | 'dashboard' | 'students' | 'student-detail' | 'teachers' | 'teacher-detail'
  | 'structure' | 'programs' | 'maquette' | 'grades' | 'deliberation'
  | 'documents' | 'payments' | 'receipts' | 'health' | 'internships' | 'statistics'
  | 'settings' | 'institution' | 'platform-institutions' | 'staff-users' | 'verify'
  | 'announcements' | 'timetable' | 'teaching-services' | 'import-export'
  | 'inscription-pedagogique' | 'scholarships' | 'profile' | 'candidature'
  | 'exam-scheduling' | 'alumni' | 'advising' | 'library' | 'attendance'
  | 'communication' | 'online-exam' | 'student-exam' | 'reports' | 'hr'
  | 'room-booking' | 'results' | 'transport' | 'onecs'

const COMMON = ['dashboard', 'profile', 'verify'] as const

const ROLE_VIEWS: Record<UserRole, ReadonlySet<AppView>> = {
  SUPER_ADMIN: new Set([...COMMON, 'platform-institutions', 'settings', 'onecs']),
  ADMIN_INSTITUTION: new Set([
    ...COMMON, 'students', 'student-detail', 'teachers', 'teacher-detail', 'staff-users',
    'candidature', 'structure', 'maquette', 'grades', 'deliberation', 'documents',
    'payments', 'health', 'internships', 'timetable', 'teaching-services',
    'exam-scheduling', 'announcements', 'import-export', 'inscription-pedagogique',
    'scholarships', 'alumni', 'advising', 'library', 'attendance', 'communication',
    'online-exam', 'statistics', 'reports', 'hr', 'room-booking', 'transport',
    'results', 'institution', 'settings',
  ]),
  RECTORAT: new Set([...COMMON, 'students', 'student-detail', 'teachers', 'teacher-detail', 'structure', 'statistics', 'documents', 'reports']),
  SCOLARITE: new Set([
    ...COMMON, 'students', 'student-detail', 'teachers', 'teacher-detail', 'staff-users',
    'structure', 'maquette', 'grades', 'deliberation', 'candidature', 'documents',
    'payments', 'scholarships', 'advising', 'library', 'attendance', 'timetable',
    'teaching-services', 'room-booking', 'transport', 'results', 'announcements',
    'communication', 'reports',
  ]),
  FACULTE: new Set([...COMMON, 'students', 'student-detail', 'teachers', 'teacher-detail', 'structure', 'timetable', 'teaching-services', 'deliberation', 'documents', 'reports']),
  DEPARTEMENT: new Set([...COMMON, 'students', 'student-detail', 'teachers', 'teacher-detail', 'structure', 'maquette', 'timetable', 'teaching-services', 'deliberation', 'documents', 'reports']),
  ENSEIGNANT: new Set([...COMMON, 'maquette', 'students', 'student-detail', 'grades', 'timetable', 'attendance', 'online-exam', 'communication']),
  RESPONSABLE_FILIERE: new Set([...COMMON, 'students', 'student-detail', 'maquette']),
  JURY: new Set([...COMMON, 'grades', 'deliberation', 'students', 'student-detail']),
  CAISSE: new Set([...COMMON, 'payments', 'receipts', 'scholarships']),
  ETUDIANT: new Set([...COMMON, 'grades', 'documents', 'payments', 'timetable', 'student-exam']),
  ETUDIANT_SANTE: new Set([...COMMON, 'grades', 'documents', 'payments', 'internships', 'health', 'timetable']),
  MAITRE_STAGE: new Set([...COMMON, 'internships']),
  PARENT: new Set([...COMMON, 'grades', 'payments']),
  ONECS: new Set([...COMMON, 'onecs']),
}

export function isViewAllowed(role: string | null | undefined, view: AppView): boolean {
  if (!role || !(role in ROLE_VIEWS)) return false
  return ROLE_VIEWS[role as UserRole].has(view)
}

export function isOrganizationManager(role: string): boolean {
  return role === 'FACULTE' || role === 'DEPARTEMENT'
}

export function isOrganizationScopedRole(role: string): boolean {
  return isOrganizationManager(role) || role === 'RESPONSABLE_FILIERE'
}

export function canManageStudents(role: string | null | undefined): boolean {
  return role === 'SUPER_ADMIN' || role === 'ADMIN_INSTITUTION' || role === 'SCOLARITE'
}

export function canWriteTeachers(role: string | null | undefined): boolean {
  return role === 'SUPER_ADMIN' || role === 'ADMIN_INSTITUTION' || role === 'SCOLARITE' || role === 'DEPARTEMENT'
}

export function viewsForRole(role: UserRole): ReadonlySet<AppView> {
  return ROLE_VIEWS[role]
}
