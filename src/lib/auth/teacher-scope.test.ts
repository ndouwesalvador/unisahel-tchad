import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ teacher: vi.fn(), year: vi.fn(), services: vi.fn() }))
vi.mock('@/lib/db', () => ({ db: {
  teacher: { findFirst: mocks.teacher },
  academicYear: { findFirst: mocks.year },
  teachingService: { findMany: mocks.services },
} }))

import { getTeacherScope } from './teacher-scope'
import { isTeacherApiAllowed } from './teacher-policy'

const user = { id: 'user-A', role: 'ENSEIGNANT', tenantId: 'tenant-A', firstName: 'A', lastName: 'B' }

describe('teacher perimeter', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.teacher.mockResolvedValue({ id: 'teacher-A' })
    mocks.year.mockResolvedValue({ id: 'year-A' })
    mocks.services.mockResolvedValue([{ courseElementId: 'element-A', courseElement: { teachingUnitId: 'unit-A' } }])
  })

  it('returns no assignments when the active teacher profile is absent', async () => {
    mocks.teacher.mockResolvedValue(null)
    expect(await getTeacherScope(user, 'tenant-A')).toMatchObject({ linked: false, courseElementIds: [], teachingUnitIds: [] })
    expect(mocks.services).not.toHaveBeenCalled()
  })

  it('takes assignments only from the active profile and its tenant', async () => {
    const scope = await getTeacherScope(user, 'tenant-A')
    expect(scope).toMatchObject({ teacherId: 'teacher-A', courseElementIds: ['element-A'], teachingUnitIds: ['unit-A'] })
    expect(mocks.teacher).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-A', tenantId: 'tenant-A', isActive: true } }))
    expect(mocks.services).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      teacherId: 'teacher-A', tenantId: 'tenant-A', academicYearId: 'year-A', status: 'APPROVED',
    }) }))
  })

  it('does not turn a historic structure assignment into an annual service', async () => {
    mocks.services.mockResolvedValue([])
    const scope = await getTeacherScope(user, 'tenant-A')
    expect(scope).toMatchObject({ linked: true, courseElementIds: [], teachingUnitIds: [] })
  })

  it('rejects a requested academic year outside the institution', async () => {
    mocks.year.mockResolvedValue(null)
    const scope = await getTeacherScope(user, 'tenant-A', 'year-B')
    expect(scope.courseElementIds).toEqual([])
    expect(mocks.services).not.toHaveBeenCalled()
  })

  it('allows assigned-student reads but denies direct administration APIs and unrelated writes', () => {
    expect(isTeacherApiAllowed('/api/students', 'GET')).toBe(true)
    expect(isTeacherApiAllowed('/api/teachers', 'GET')).toBe(false)
    expect(isTeacherApiAllowed('/api/structure', 'POST')).toBe(false)
    expect(isTeacherApiAllowed('/api/timetable', 'POST')).toBe(false)
    expect(isTeacherApiAllowed('/api/communications', 'DELETE')).toBe(false)
    expect(isTeacherApiAllowed('/api/grades', 'GET')).toBe(true)
    expect(isTeacherApiAllowed('/api/attendance', 'POST')).toBe(true)
  })
})
