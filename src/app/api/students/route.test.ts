import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { authMock, dbMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  dbMock: {
    student: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findFirst: vi.fn(),
    },
    academicYear: { findFirst: vi.fn() },
    administrativeRegistration: { findFirst: vi.fn() },
    grade: { findMany: vi.fn() },
  },
}))

vi.mock('@/lib/auth/config', () => ({ auth: authMock }))
vi.mock('@/lib/db', () => ({ db: dbMock }))

const { GET } = await import('./route')

const sessionUser = {
  id: 'user-1',
  email: 'scolarite@example.com',
  role: 'SCOLARITE',
  tenantId: 'tenant-A',
  firstName: 'Scolarite',
  lastName: 'User',
}

function req(url: string) {
  return new NextRequest(new URL(url, 'http://localhost:3000'))
}

beforeEach(() => {
  vi.clearAllMocks()
  dbMock.student.findMany.mockResolvedValue([])
  dbMock.student.count.mockResolvedValue(0)
  dbMock.student.findFirst.mockResolvedValue(null)
  dbMock.academicYear.findFirst.mockResolvedValue({ id: 'year-A', name: '2026-2027' })
  dbMock.administrativeRegistration.findFirst.mockResolvedValue(null)
  dbMock.grade.findMany.mockResolvedValue([])
  authMock.mockResolvedValue({ user: sessionUser })
})

describe('GET /api/students', () => {
  it('rejects an unauthenticated request', async () => {
    authMock.mockResolvedValue(null)
    const res = await GET(req('/api/students'))
    expect(res.status).toBe(401)
  })

  it('always scopes the query to the caller tenant, ignoring any studentId-less request', async () => {
    const res = await GET(req('/api/students'))
    expect(res.status).toBe(200)
    expect(dbMock.student.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-A' }) })
    )
  })

  it('rejects a cross-tenant request from a non-SUPER_ADMIN with 403 before querying the DB', async () => {
    const res = await GET(req('/api/students?tenantId=tenant-B'))
    expect(res.status).toBe(403)
    expect(dbMock.student.findMany).not.toHaveBeenCalled()
  })

  // Regression test: lib/validations/api.ts's paginationSchema used to cap
  // `limit` at 100, which silently 500'd every page that requests a full
  // tenant roster with limit=1000 (students-list.tsx, teachers-page.tsx,
  // payments-page.tsx, grades-page.tsx, import-export-page.tsx all do this).
  it('accepts limit=1000 (students-list.tsx requests the full roster this way)', async () => {
    const res = await GET(req('/api/students?limit=1000'))
    expect(res.status).toBe(200)
    expect(dbMock.student.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 1000 })
    )
  })

  it('rejects a limit above the raised cap (1000) without querying the DB', async () => {
    // Note: getStudentsHandler's catch block doesn't special-case ZodError
    // the way the POST/PUT handlers in this file do, so an out-of-range
    // limit currently surfaces as a generic 500 rather than 400. That's a
    // minor pre-existing inconsistency (client input misclassified as a
    // server error) - out of scope to fix here; this test just documents
    // the current, safe behavior (rejected, DB never queried).
    const res = await GET(req('/api/students?limit=100000'))
    expect(res.status).toBe(500)
    expect(dbMock.student.findMany).not.toHaveBeenCalled()
  })

  it('does not expose historical grades in a pre-enrollment transcript preview', async () => {
    dbMock.student.findFirst.mockResolvedValue({ id: 'student-A', totalCreditsAcquired: 60 })
    const res = await GET(req('/api/students?id=student-A&transcript=true'))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ data: {
      isEnrolledForYear: false, grades: [], summary: { totalGrades: 0, totalCreditsAcquired: 0 },
    } })
    expect(dbMock.grade.findMany).not.toHaveBeenCalled()
  })

  it('scopes a transcript preview to published grades in the enrolled year', async () => {
    dbMock.student.findFirst.mockResolvedValue({ id: 'student-A', totalCreditsAcquired: 12 })
    dbMock.administrativeRegistration.findFirst.mockResolvedValue({ id: 'registration-A' })
    const res = await GET(req('/api/students?id=student-A&transcript=true&academicYearId=year-A'))
    expect(res.status).toBe(200)
    expect(dbMock.grade.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {
      studentId: 'student-A', student: { tenantId: 'tenant-A' }, academicYearId: 'year-A', session: 'NORMALE', isLocked: true,
      teachingUnit: { pedagogicalRegistrations: { some: { studentId: 'student-A', academicYearId: 'year-A', status: 'ACTIVE' } } },
    } }))
    expect(dbMock.administrativeRegistration.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-A', studentId: 'student-A', academicYearId: 'year-A', status: 'INSCRIT' },
      select: { id: true },
    })
  })
})
