import { beforeEach, describe, expect, it, vi } from 'vitest'

const dbMock = vi.hoisted(() => ({
  administrativeRegistration: { findMany: vi.fn() },
  tenantSettings: { findUnique: vi.fn() },
  deliberation: { findFirst: vi.fn() },
  pedagogicalRegistration: { findMany: vi.fn() },
  grade: { findMany: vi.fn() },
  program: { findFirst: vi.fn() },
}))
vi.mock('@/lib/db', () => ({ db: dbMock }))

const { getValidatedLevelAward, getValidatedDiplomaAward, AwardEligibilityError } = await import('./eligibility')
const input = { tenantId: 'tenant-A', studentId: 'student-A', academicYearId: 'year-A', programId: 'program-A', levelId: 'level-A' }

beforeEach(() => {
  vi.clearAllMocks()
  dbMock.administrativeRegistration.findMany.mockResolvedValue([{ id: 'registration-A' }])
  dbMock.tenantSettings.findUnique.mockResolvedValue({ creditsPerYear: 60, passingGrade: 10 })
  dbMock.deliberation.findFirst.mockResolvedValue({
    id: 'delib-A', type: 'ANNUEL', decisions: [{ id: 'decision-A', decision: 'ADMI', average: 14, creditsAcquired: 60 }],
  })
  dbMock.pedagogicalRegistration.findMany.mockResolvedValue([{
    teachingUnitId: 'unit-A', teachingUnit: { credits: 60, courseElements: [{ id: 'element-A', coefficient: 1 }] },
  }])
  dbMock.grade.findMany.mockResolvedValue([{ teachingUnitId: 'unit-A', courseElementId: 'element-A', finalGrade: 14, isLocked: true, isAbsent: false, isDefaillant: false }])
})

describe('validated diploma award', () => {
  beforeEach(() => {
    const years = [
      { academicYearId: 'year-1', levelId: 'level-1', academicYear: { startDate: new Date('2025-10-01') } },
      { academicYearId: 'year-2', levelId: 'level-2', academicYear: { startDate: new Date('2026-10-01') } },
    ]
    dbMock.administrativeRegistration.findMany.mockImplementation(({ where }) => {
      if (where.levelId) return Promise.resolve([{ id: `registration-${where.academicYearId}` }])
      if (where.programId) return Promise.resolve(years)
      return Promise.resolve([{ programId: 'program-A', levelId: 'level-2' }])
    })
    dbMock.program.findFirst.mockResolvedValue({
      id: 'program-A', name: 'Génie informatique', diplomaType: 'Licence', duration: 2,
      levels: [{ id: 'level-1', name: 'Licence 1', orderIndex: 1 }, { id: 'level-2', name: 'Licence 2', orderIndex: 2 }],
    })
  })

  it('requires every level to be validated in chronological order', async () => {
    const diploma = await getValidatedDiplomaAward({ tenantId: 'tenant-A', studentId: 'student-A', academicYearId: 'year-2' })
    expect(diploma.awards).toHaveLength(2)
    expect(diploma.creditsAcquired).toBe(120)
    expect(dbMock.deliberation.findFirst).toHaveBeenCalledTimes(2)
  })

  it('blocks graduation when an earlier level has a debt', async () => {
    dbMock.deliberation.findFirst.mockImplementation(({ where }) => Promise.resolve({
      id: `delib-${where.academicYearId}`, type: 'ANNUEL',
      decisions: [{ id: 'decision-A', decision: where.academicYearId === 'year-1' ? 'ADMI_DETTE' : 'ADMI', average: 14, creditsAcquired: 60 }],
    }))
    await expect(getValidatedDiplomaAward({ tenantId: 'tenant-A', studentId: 'student-A', academicYearId: 'year-2' }))
      .rejects.toThrow('sans dette')
  })

  it('blocks graduation when the diploma type or level order is incomplete', async () => {
    dbMock.program.findFirst.mockResolvedValue({
      id: 'program-A', name: 'Génie informatique', diplomaType: null, duration: 2,
      levels: [{ id: 'level-1', name: 'Licence 1', orderIndex: 0 }, { id: 'level-2', name: 'Licence 2', orderIndex: 0 }],
    })
    await expect(getValidatedDiplomaAward({ tenantId: 'tenant-A', studentId: 'student-A', academicYearId: 'year-2' }))
      .rejects.toThrow('configurés')
  })
})

describe('validated level award', () => {
  it('accepts a fully credited, locked, debt-free jury decision', async () => {
    const award = await getValidatedLevelAward(input)
    expect(award).toMatchObject({ academicYearId: 'year-A', deliberationId: 'delib-A', creditsAcquired: 60, creditsRequired: 60 })
    expect(dbMock.deliberation.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ tenantId: 'tenant-A', academicYearId: 'year-A', isLocked: true, status: 'TERMINEE' }),
    }))
  })

  it('rejects a jury decision with debt even if the grades appear complete', async () => {
    dbMock.deliberation.findFirst.mockResolvedValue({
      id: 'delib-A', type: 'ANNUEL', decisions: [{ id: 'decision-A', decision: 'ADMI_DETTE', average: 14, creditsAcquired: 60 }],
    })
    await expect(getValidatedLevelAward(input)).rejects.toBeInstanceOf(AwardEligibilityError)
    expect(dbMock.grade.findMany).not.toHaveBeenCalled()
  })

  it('rejects an incomplete curriculum despite a favorable jury decision', async () => {
    dbMock.pedagogicalRegistration.findMany.mockResolvedValue([{
      teachingUnitId: 'unit-A', teachingUnit: { credits: 6, courseElements: [{ id: 'element-A', coefficient: 1 }] },
    }])
    await expect(getValidatedLevelAward(input)).rejects.toThrow('6/60')
  })

  it('rejects missing or unlocked grades', async () => {
    dbMock.grade.findMany.mockResolvedValue([])
    await expect(getValidatedLevelAward(input)).rejects.toThrow('notées et verrouillées')
  })

  it('rejects a failed UE even if the jury snapshot claims all credits', async () => {
    dbMock.grade.findMany.mockResolvedValue([{ teachingUnitId: 'unit-A', courseElementId: 'element-A', finalGrade: 8, isLocked: true, isAbsent: false, isDefaillant: false }])
    await expect(getValidatedLevelAward(input)).rejects.toThrow('dette')
  })

  it('rejects an unlocked duplicate even when a locked grade also exists', async () => {
    dbMock.grade.findMany.mockResolvedValue([
      { teachingUnitId: 'unit-A', courseElementId: 'element-A', finalGrade: 14, isLocked: true, isAbsent: false, isDefaillant: false },
      { teachingUnitId: 'unit-A', courseElementId: 'element-A', finalGrade: 14, isLocked: false, isAbsent: false, isDefaillant: false },
    ])
    await expect(getValidatedLevelAward(input)).rejects.toThrow('incohérentes')
  })

  it('rejects an ambiguous administrative registration', async () => {
    dbMock.administrativeRegistration.findMany.mockResolvedValue([{ id: 'registration-A' }, { id: 'registration-B' }])
    await expect(getValidatedLevelAward(input)).rejects.toThrow('non ambiguë')
  })
})
