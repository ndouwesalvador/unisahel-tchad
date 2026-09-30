export interface GradingPolicy {
  ccWeight: number
  examWeight: number
  tpWeight: number
  stageWeight: number
}

export interface GradeComponents {
  ccGrade?: number | null
  examGrade?: number | null
  tpGrade?: number | null
  stageGrade?: number | null
  isAbsent?: boolean
  isDefaillant?: boolean
}

export const DEFAULT_GRADING_POLICY: GradingPolicy = {
  ccWeight: 0.4,
  examWeight: 0.6,
  tpWeight: 0,
  stageWeight: 0,
}

export function resolveGradingPolicy(settings: Partial<GradingPolicy> | null | undefined): GradingPolicy {
  return {
    ccWeight: settings?.ccWeight ?? DEFAULT_GRADING_POLICY.ccWeight,
    examWeight: settings?.examWeight ?? DEFAULT_GRADING_POLICY.examWeight,
    tpWeight: settings?.tpWeight ?? DEFAULT_GRADING_POLICY.tpWeight,
    stageWeight: settings?.stageWeight ?? DEFAULT_GRADING_POLICY.stageWeight,
  }
}

export function isValidGradingPolicy(policy: GradingPolicy): boolean {
  const weights = [policy.ccWeight, policy.examWeight, policy.tpWeight, policy.stageWeight]
  return weights.every((weight) => Number.isFinite(weight) && weight >= 0 && weight <= 1) &&
    weights.some((weight) => weight > 0)
}

export function calculateFinalGrade(components: GradeComponents, policy: GradingPolicy): number | null {
  if (components.isAbsent || components.isDefaillant || !isValidGradingPolicy(policy)) return null
  const parts: { grade: number | null | undefined; weight: number }[] = [
    { grade: components.ccGrade, weight: policy.ccWeight },
    { grade: components.examGrade, weight: policy.examWeight },
    { grade: components.tpGrade, weight: policy.tpWeight },
    { grade: components.stageGrade, weight: policy.stageWeight },
  ]
  const required = parts.filter((part) => part.weight > 0)
  if (required.some((part) => part.grade === null || part.grade === undefined ||
      !Number.isFinite(part.grade) || part.grade < 0 || part.grade > 20)) return null
  const weightedSum = required.reduce((sum, part) => sum + part.grade! * part.weight, 0)
  const weightTotal = required.reduce((sum, part) => sum + part.weight, 0)
  return Math.round((weightedSum / weightTotal + Number.EPSILON) * 100) / 100
}
