// Deny by default: a teacher must not call an administration API directly,
// even if the corresponding page is absent from the sidebar.
const teacherMethods: Record<string, readonly string[]> = {
  '/api/dashboard': ['GET'],
  '/api/academic-years': ['GET'],
  '/api/structure': ['GET'],
  '/api/teacher-students': ['GET'],
  '/api/students': ['GET'],
  '/api/grades': ['GET'],
  '/api/grade-entry': ['GET', 'POST'],
  '/api/timetable': ['GET'],
  '/api/notifications': ['GET', 'PUT'],
  '/api/attendance': ['GET', 'POST', 'PUT'],
  '/api/online-exams': ['GET', 'POST'],
  '/api/communications': ['GET', 'POST'],
}

export function isTeacherApiAllowed(pathname: string, method: string): boolean {
  return teacherMethods[pathname]?.includes(method.toUpperCase()) ?? false
}
