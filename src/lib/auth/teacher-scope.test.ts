import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ teacher: vi.fn(), elements: vi.fn(), units: vi.fn() }))
vi.mock('@/lib/db', () => ({ db: {
  teacher: { findFirst: mocks.teacher },
  courseElement: { findMany: mocks.elements },
  teachingUnit: { findMany: mocks.units },
} }))

import { getTeacherScope } from './teacher-scope'
import { isTeacherApiAllowed } from './teacher-policy'

const user = { id: 'user-A', role: 'ENSEIGNANT', tenantId: 'tenant-A', firstName: 'A', lastName: 'B' }

describe('teacher perimeter', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.teacher.mockResolvedValue({ id: 'teacher-A' })
    mocks.elements.mockResolvedValue([{ id: 'element-A', teachingUnitId: 'unit-A' }])
    mocks.units.mockResolvedValue([{ id: 'unit-A' }])
  })

  it('returns no assignments when the active teacher profile is absent', async () => {
    mocks.teacher.mockResolvedValue(null)
    expect(await getTeacherScope(user, 'tenant-A')).toMatchObject({ linked: false, courseElementIds: [], teachingUnitIds: [] })
    expect(mocks.elements).not.toHaveBeenCalled()
  })

  it('takes assignments only from the active profile and its tenant', async () => {
    const scope = await getTeacherScope(user, 'tenant-A')
    expect(scope).toMatchObject({ teacherId: 'teacher-A', courseElementIds: ['element-A'], teachingUnitIds: ['unit-A'] })
    expect(mocks.teacher).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-A', tenantId: 'tenant-A', isActive: true } }))
    expect(mocks.elements).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ OR: [{ teacherId: 'teacher-A' }, { teachingUnit: { responsibleId: 'teacher-A' } }] }) }))
  })

  it('denies direct administration APIs and write methods outside the teacher workflow', () => {
    expect(isTeacherApiAllowed('/api/students', 'GET')).toBe(false)
    expect(isTeacherApiAllowed('/api/teachers', 'GET')).toBe(false)
    expect(isTeacherApiAllowed('/api/structure', 'POST')).toBe(false)
    expect(isTeacherApiAllowed('/api/timetable', 'POST')).toBe(false)
    expect(isTeacherApiAllowed('/api/communications', 'DELETE')).toBe(false)
    expect(isTeacherApiAllowed('/api/grades', 'GET')).toBe(true)
    expect(isTeacherApiAllowed('/api/attendance', 'POST')).toBe(true)
  })
})
