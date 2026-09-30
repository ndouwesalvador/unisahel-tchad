import { describe, expect, it } from 'vitest'
import { calculateFinalGrade, isValidGradingPolicy, resolveGradingPolicy } from './grading-policy'

describe('institution grading policy', () => {
  it('preserves an explicitly disabled component', () => {
    const policy = resolveGradingPolicy({ ccWeight: 0, examWeight: 1, tpWeight: 0, stageWeight: 0 })
    expect(policy.ccWeight).toBe(0)
    expect(calculateFinalGrade({ examGrade: 16 }, policy)).toBe(16)
  })

  it('requires every component with a positive weight, including TP', () => {
    const policy = resolveGradingPolicy({ ccWeight: 0.3, examWeight: 0.5, tpWeight: 0.2 })
    expect(calculateFinalGrade({ ccGrade: 12, examGrade: 16 }, policy)).toBeNull()
    expect(calculateFinalGrade({ ccGrade: 12, examGrade: 16, tpGrade: 14 }, policy)).toBe(14.4)
  })

  it('rejects absent students and a policy with no active coefficient', () => {
    const policy = resolveGradingPolicy(null)
    expect(calculateFinalGrade({ ccGrade: 12, examGrade: 16, isAbsent: true }, policy)).toBeNull()
    expect(isValidGradingPolicy({ ccWeight: 0, examWeight: 0, tpWeight: 0, stageWeight: 0 })).toBe(false)
  })
})
