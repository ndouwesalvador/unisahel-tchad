import { beforeEach, describe, expect, it, vi } from 'vitest'

const dbMock = vi.hoisted(() => ({
  program: { findMany: vi.fn() },
  administrativeRegistration: { findMany: vi.fn() },
  pedagogicalRegistration: { findMany: vi.fn() },
  grade: { findMany: vi.fn() },
}))
vi.mock('@/lib/db', () => ({ db: dbMock }))

const { computeGradeReadiness } = await import('./readiness')

beforeEach(() => {
  vi.clearAllMocks()
  dbMock.program.findMany.mockResolvedValue([{ id: 'program-A' }])
  dbMock.administrativeRegistration.findMany.mockResolvedValue([{
    studentId: 'student-A', student: { id: 'student-A', firstName: 'Awa', lastName: 'Test', matricule: 'A-001' },
  }])
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
    const readiness = await computeGradeReadiness('tenant-A', 'year-A', 'NORMALE', 'department-A')
    expect(readiness).toMatchObject({ ready: true, expectedGradeCount: 1, lockedGradeCount: 1, studentIds: ['student-A'] })
    expect(dbMock.administrativeRegistration.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ programId: { in: ['program-A'] }, status: 'INSCRIT' }),
    }))
    expect(dbMock.grade.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ studentId: { in: ['student-A'] } }),
    }))
  })

  it('rejects a duplicate or unlocked grade even if another grade is valid', async () => {
    dbMock.grade.findMany.mockResolvedValue([
      { studentId: 'student-A', teachingUnitId: 'unit-A', courseElementId: 'element-A', finalGrade: 14, isLocked: true, isAbsent: false, isDefaillant: false },
      { studentId: 'student-A', teachingUnitId: 'unit-A', courseElementId: 'element-A', finalGrade: 14, isLocked: false, isAbsent: false, isDefaillant: false },
    ])
    const readiness = await computeGradeReadiness('tenant-A', 'year-A', 'NORMALE', 'department-A')
    expect(readiness).toMatchObject({ ready: false, missingGradeCount: 1, lockedGradeCount: 0 })
  })

  it('rejects grades outside the active registrations', async () => {
    dbMock.grade.findMany.mockResolvedValue([
      { studentId: 'student-A', teachingUnitId: 'unit-A', courseElementId: 'element-A', finalGrade: 14, isLocked: true, isAbsent: false, isDefaillant: false },
      { studentId: 'student-A', teachingUnitId: 'unit-B', courseElementId: 'element-B', finalGrade: 14, isLocked: true, isAbsent: false, isDefaillant: false },
    ])
    const readiness = await computeGradeReadiness('tenant-A', 'year-A', 'NORMALE', 'department-A')
    expect(readiness).toMatchObject({ ready: false, unexpectedGradeCount: 1 })
  })

  it('blocks a department if an enrolled student has no pedagogical registration', async () => {
    dbMock.administrativeRegistration.findMany.mockResolvedValueOnce([
      { studentId: 'student-A', student: { id: 'student-A', firstName: 'Awa', lastName: 'Test', matricule: 'A-001' } },
      { studentId: 'student-B', student: { id: 'student-B', firstName: 'Binta', lastName: 'Test', matricule: 'B-001' } },
    ])
    const readiness = await computeGradeReadiness('tenant-A', 'year-A', 'NORMALE', 'department-A')
    expect(readiness).toMatchObject({ ready: false, studentsWithoutRegistration: 1, studentsTotal: 2 })
  })

  it('accepts a locked grade directly on an UE without course elements', async () => {
    dbMock.pedagogicalRegistration.findMany.mockResolvedValueOnce([{
      studentId: 'student-A', teachingUnitId: 'unit-A',
      student: { id: 'student-A', firstName: 'Awa', lastName: 'Test', matricule: 'A-001' },
      teachingUnit: { id: 'unit-A', code: 'UE1', name: 'Unité 1', courseElements: [] },
    }])
    dbMock.grade.findMany.mockResolvedValueOnce([{
      studentId: 'student-A', teachingUnitId: 'unit-A', courseElementId: null,
      finalGrade: 14, isLocked: true, isAbsent: false, isDefaillant: false,
    }])
    const readiness = await computeGradeReadiness('tenant-A', 'year-A', 'NORMALE', 'department-A')
    expect(readiness).toMatchObject({ ready: true, expectedGradeCount: 1, lockedGradeCount: 1 })
  })
})
