import { beforeEach, describe, expect, it, vi } from 'vitest'

const dbMock = vi.hoisted(() => ({
  pedagogicalRegistration: { findMany: vi.fn() },
  grade: { findMany: vi.fn() },
}))
vi.mock('@/lib/db', () => ({ db: dbMock }))

const { computeGradeReadiness } = await import('./readiness')

beforeEach(() => {
  vi.clearAllMocks()
  dbMock.pedagogicalRegistration.findMany.mockResolvedValue([{
    studentId: 'student-A', teachingUnitId: 'unit-A',
    student: { id: 'student-A', firstName: 'Awa', lastName: 'Test', matricule: 'A-001' },
    teachingUnit: { id: 'unit-A', code: 'UE1', name: 'Unité 1', courseElements: [{ id: 'element-A', code: 'EC1', name: 'Matière 1' }] },
  }])
  dbMock.grade.findMany.mockResolvedValue([{
    studentId: 'student-A', teachingUnitId: 'unit-A', courseElementId: 'element-A',
    finalGrade: 14, isLocked: true, isAbsent: false, isDefaillant: false,
  }])
})

describe('jury grade readiness', () => {
  it('accepts exactly one definitive locked grade per registered subject', async () => {
    const readiness = await computeGradeReadiness('tenant-A', 'year-A', 'NORMALE')
    expect(readiness).toMatchObject({ ready: true, expectedGradeCount: 1, lockedGradeCount: 1, studentIds: ['student-A'] })
  })

  it('rejects a duplicate or unlocked grade even if another grade is valid', async () => {
    dbMock.grade.findMany.mockResolvedValue([
      { studentId: 'student-A', teachingUnitId: 'unit-A', courseElementId: 'element-A', finalGrade: 14, isLocked: true, isAbsent: false, isDefaillant: false },
      { studentId: 'student-A', teachingUnitId: 'unit-A', courseElementId: 'element-A', finalGrade: 14, isLocked: false, isAbsent: false, isDefaillant: false },
    ])
    const readiness = await computeGradeReadiness('tenant-A', 'year-A', 'NORMALE')
    expect(readiness).toMatchObject({ ready: false, missingGradeCount: 1, lockedGradeCount: 0 })
  })

  it('rejects grades outside the active registrations', async () => {
    dbMock.grade.findMany.mockResolvedValue([
      { studentId: 'student-A', teachingUnitId: 'unit-A', courseElementId: 'element-A', finalGrade: 14, isLocked: true, isAbsent: false, isDefaillant: false },
      { studentId: 'student-A', teachingUnitId: 'unit-B', courseElementId: 'element-B', finalGrade: 14, isLocked: true, isAbsent: false, isDefaillant: false },
    ])
    const readiness = await computeGradeReadiness('tenant-A', 'year-A', 'NORMALE')
    expect(readiness).toMatchObject({ ready: false, unexpectedGradeCount: 1 })
  })
})
