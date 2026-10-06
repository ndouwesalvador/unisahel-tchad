import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), teacher: vi.fn(), services: vi.fn(), year: vi.fn(), student: vi.fn(),
  user: vi.fn(), grades: vi.fn(), count: vi.fn(), course: vi.fn(), registrations: vi.fn(),
  settings: vi.fn(),
}))
vi.mock('@/lib/auth/config', () => ({ auth: mocks.auth }))
vi.mock('@/lib/db', () => ({ db: {
  teacher: { findFirst: mocks.teacher }, teachingService: { findMany: mocks.services },
  academicYear: { findFirst: mocks.year }, student: { findFirst: mocks.student, findMany: mocks.student },
  user: { findFirst: mocks.user }, grade: { findMany: mocks.grades, count: mocks.count },
  courseElement: { findFirst: mocks.course }, pedagogicalRegistration: { findMany: mocks.registrations },
  tenantSettings: { findUnique: mocks.settings },
} }))

const { GET, POST, PUT } = await import('./route')
const tenantId = 'ctenant0000000000000000a1'
const yearId = 'cacademicyear0000000000001'
const elementId = 'ccourseelement000000000001'
const studentId = 'cstudent00000000000000001'
const departmentId = 'cdepartment000000000001'
const teacherId = 'cteacherrecord00000000001'
const user = { id: 'cuser000000000000000001', role: 'ENSEIGNANT', tenantId }
const request = (url: string, method = 'GET') => new NextRequest(`http://localhost${url}`, {
  method, ...(method === 'GET' ? {} : { body: JSON.stringify({}) }),
})

beforeEach(() => {
  vi.resetAllMocks()
  mocks.auth.mockResolvedValue({ user })
  mocks.teacher.mockResolvedValue({ id: teacherId })
  mocks.services.mockResolvedValue([{ courseElementId: elementId }])
  mocks.year.mockResolvedValue({ id: yearId })
  mocks.student.mockResolvedValue({ id: studentId })
  mocks.user.mockResolvedValue({ departmentId })
  mocks.grades.mockResolvedValue([])
  mocks.count.mockResolvedValue(0)
  mocks.course.mockResolvedValue({ teachingUnitId: 'cteachingunit0000000000001',
    teachingUnit: { semester: { levelId: 'clevel000000000000000001' } } })
  mocks.registrations.mockResolvedValue([])
  mocks.settings.mockResolvedValue(null)
})

describe('legacy notes endpoint is read-only', () => {
  it.each(['ADMIN_INSTITUTION', 'SCOLARITE', 'SUPER_ADMIN', 'ENSEIGNANT', 'JURY'])(
    'rejects every direct write for %s', async (role) => {
      mocks.auth.mockResolvedValue({ user: { ...user, role } })
      expect((await POST(request('/api/grades?action=bulk', 'POST'))).status).toBe(403)
      expect((await POST(request('/api/grades?action=lock', 'POST'))).status).toBe(403)
      expect((await PUT(request('/api/grades', 'PUT'))).status).toBe(403)
    },
  )

  it('returns only approved annual assignments to a teacher', async () => {
    const response = await GET(request('/api/grades?action=assignments'))
    expect(response.status).toBe(200)
    expect((await response.json()).data.courseElementIds).toEqual([elementId])
    expect(mocks.services).toHaveBeenCalledWith({ where: { tenantId, teacherId,
      academicYearId: yearId, status: 'APPROVED' }, select: { courseElementId: true } })
  })

  it('checks the annual service before returning a teacher roster', async () => {
    const response = await GET(request(`/api/grades?action=roster&courseElementId=${elementId}&academicYearId=${yearId}`))
    expect(response.status).toBe(200)
    expect(mocks.course).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      teachingServices: { some: { tenantId, teacherId, academicYearId: yearId, status: 'APPROVED' } },
    }) }))
  })

  it('scopes teacher grade reads to annual service course IDs', async () => {
    const response = await GET(request('/api/grades'))
    expect(response.status).toBe(200)
    expect(mocks.grades).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      academicYearId: yearId, courseElementId: { in: [elementId] },
    }) }))
  })

  it('cannot override teacher scope with a courseElementId query', async () => {
    const response = await GET(request('/api/grades?courseElementId=ccourseelement000000000002'))
    expect(response.status).toBe(403)
    expect(mocks.grades).not.toHaveBeenCalled()
  })

  it('scopes jury grade reads to their department', async () => {
    mocks.auth.mockResolvedValue({ user: { ...user, role: 'JURY' } })
    const response = await GET(request('/api/grades'))
    expect(response.status).toBe(200)
    expect(mocks.grades).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      AND: [{ teachingUnit: { semester: { level: { program: { tenantId, departmentId } } } } }],
    }) }))
    expect((await GET(request('/api/grades?action=stats'))).status).toBe(403)
  })

  it('shows a student only their own published notes', async () => {
    mocks.auth.mockResolvedValue({ user: { ...user, role: 'ETUDIANT' } })
    const response = await GET(request('/api/grades'))
    expect(response.status).toBe(200)
    expect(mocks.grades).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      studentId, isLocked: true, academicYearId: yearId,
      student: { tenantId, registrations: { some: { tenantId, academicYearId: yearId, status: 'INSCRIT' } } },
      teachingUnit: { pedagogicalRegistrations: { some: { studentId, academicYearId: yearId, status: 'ACTIVE' } } },
    }) }))
  })

  it('does not fall back to historical student grades when there is no current year', async () => {
    mocks.auth.mockResolvedValue({ user: { ...user, role: 'ETUDIANT' } })
    mocks.year.mockResolvedValue(null)
    const response = await GET(request('/api/grades'))
    expect(response.status).toBe(200)
    expect(mocks.grades).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      studentId, academicYearId: { in: [] }, isLocked: true,
    }) }))
  })

  it('rejects a student who requests another student’s notes', async () => {
    mocks.auth.mockResolvedValue({ user: { ...user, role: 'ETUDIANT' } })
    const response = await GET(request('/api/grades?studentId=cstudent00000000000000002'))
    expect(response.status).toBe(403)
    expect(mocks.grades).not.toHaveBeenCalled()
  })
})
