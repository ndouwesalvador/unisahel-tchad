// A dean/department head only sees endpoints that have explicit scoped
// handling or contain shared scheduling prerequisites. Expand this list only
// after auditing both reads and writes for the new organization boundary.
const methods: Record<string, readonly string[]> = {
  '/api/structure': ['GET'],
  '/api/teachers': ['GET'],
  '/api/timetable': ['GET', 'POST', 'PUT', 'DELETE'],
  '/api/timetable-publications': ['GET', 'POST', 'PATCH'],
  '/api/teaching-services': ['GET', 'POST', 'PATCH'],
  '/api/rooms': ['GET'],
  '/api/academic-years': ['GET'],
  '/api/deliberation': ['GET', 'POST', 'PUT', 'PATCH'],
  '/api/deliberation/signature': ['POST'],
  '/api/documents/generate': ['POST'],
  '/api/documents/download': ['GET'],
  '/api/profile': ['GET'],
  '/api/notifications': ['GET', 'PUT'],
}

export function isOrganizationApiAllowed(pathname: string, method: string): boolean {
  return methods[pathname]?.includes(method.toUpperCase()) ?? false
}
