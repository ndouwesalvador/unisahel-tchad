import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ scope: vi.fn(), findMany: vi.fn(), count: vi.fn(), findFirst: vi.fn(), create: vi.fn(), element: vi.fn(), student: vi.fn(), year: vi.fn(), registration: vi.fn() }))
vi.mock('@/lib/auth/helpers', () => ({ withTenantAuth: (handler: unknown) => handler }))
vi.mock('@/lib/auth/teacher-scope', () => ({ getTeacherScope: mocks.scope }))
vi.mock('@/lib/db', () => ({ db: {
  attendance: { findMany: mocks.findMany, count: mocks.count, findFirst: mocks.findFirst, create: mocks.create },
  courseElement: { findFirst: mocks.element }, student: { findFirst: mocks.student },
  academicYear: { findFirst: mocks.year }, administrativeRegistration: { findFirst: mocks.registration },
} }))

const { GET, POST, PUT } = await import('./route')
const user = { id: 'user-A', role: 'ENSEIGNANT', tenantId: 'tenant-A' }
const call = (handler: typeof GET, url: string, init?: ConstructorParameters<typeof NextRequest>[1]) => (handler as unknown as (u: typeof user, t: string, r: NextRequest) => Promise<Response>)(user, 'tenant-A', new NextRequest(url, init))

describe('teacher attendance isolation', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.scope.mockResolvedValue({ linked: true, teacherId: 'teacher-A', academicYearId: 'year-A', courseElementIds: ['element-A'] })
    mocks.findMany.mockResolvedValue([])
    mocks.count.mockResolvedValue(0)
    mocks.element.mockResolvedValue({ name: 'Algorithmique', teachingUnitId: 'unit-A', teachingUnit: { semester: { level: { id: 'level-A', name: 'L1', program: { name: 'Informatique' } } } } })
    mocks.student.mockResolvedValue({ id: 'student-A', firstName: 'A', lastName: 'B', matricule: 'M-1' })
    mocks.year.mockResolvedValue({ id: 'year-A' })
    mocks.registration.mockResolvedValue({ id: 'registration-A' })
    mocks.findFirst.mockResolvedValue(null)
  })

  it('lists only records by this teacher in assigned matters', async () => {
    const response = await call(GET, 'http://localhost/api/attendance')
    expect(response.status).toBe(200)
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ teacherId: 'teacher-A', courseElementId: { in: ['element-A'] }, academicYearId: 'year-A' }) }))
  })

  it('rejects an unassigned matter even if it belongs to the tenant', async () => {
    const response = await call(GET, 'http://localhost/api/attendance?courseElementId=element-B')
    expect(response.status).toBe(403)
    expect(mocks.findMany).not.toHaveBeenCalled()
  })

  it('rejects free-text teacher writes with an unassigned matter', async () => {
    const response = await call(POST, 'http://localhost/api/attendance', { method: 'POST', body: JSON.stringify({ courseElementId: 'element-B', studentId: 'student-A', academicYearId: 'year-A', timeSlot: '08:00', status: 'PRESENT' }) })
    expect(response.status).toBe(403)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('cannot edit a different teacher’s attendance record', async () => {
    mocks.findFirst.mockResolvedValue({ id: 'record-B', tenantId: 'tenant-A', teacherId: 'teacher-B', courseElementId: 'element-A', academicYearId: 'year-A' })
    const response = await call(PUT, 'http://localhost/api/attendance?id=record-B', { method: 'PUT', body: JSON.stringify({ action: 'updateStatus', status: 'PRESENT' }) })
    expect(response.status).toBe(403)
  })

  it('does not let a teacher edit a historic record without an academic year', async () => {
    mocks.findFirst.mockResolvedValue({ id: 'record-old', tenantId: 'tenant-A', teacherId: 'teacher-A', courseElementId: 'element-A', academicYearId: null })
    const response = await call(PUT, 'http://localhost/api/attendance?id=record-old', { method: 'PUT', body: JSON.stringify({ action: 'updateStatus', status: 'PRESENT' }) })
    expect(response.status).toBe(403)
    expect(mocks.scope).not.toHaveBeenCalled()
  })

  it('records an enrolled student only in the assigned matter with a normalized session date', async () => {
    mocks.create.mockResolvedValue({ id: 'record-A' })
    const response = await call(POST, 'http://localhost/api/attendance', { method: 'POST', body: JSON.stringify({ courseElementId: 'element-A', studentId: 'student-A', academicYearId: 'year-A', date: '2026-10-02', timeSlot: '08:00', status: 'PRESENT' }) })
    expect(response.status).toBe(201)
    expect(mocks.registration).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ levelId: 'level-A', academicYearId: 'year-A' }) }))
    expect(mocks.scope).toHaveBeenCalledWith(user, 'tenant-A', 'year-A')
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ teacherId: 'teacher-A', courseElementId: 'element-A', date: new Date('2026-10-02T00:00:00.000Z') }) }))
  })

  it('rejects duplicate presence for the same student and session', async () => {
    mocks.findFirst.mockResolvedValue({ id: 'record-A' })
    const response = await call(POST, 'http://localhost/api/attendance', { method: 'POST', body: JSON.stringify({ courseElementId: 'element-A', studentId: 'student-A', academicYearId: 'year-A', date: '2026-10-02', timeSlot: '08:00', status: 'PRESENT' }) })
    expect(response.status).toBe(409)
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
