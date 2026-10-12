type DashboardYearData = {
  academicYear?: { id?: string | null } | null
  currentAcademicYear?: { id?: string | null } | null
} | null | undefined

export function resolvePaymentAcademicYearId(selectedAcademicYearId: string | null | undefined, dashboard: DashboardYearData): string | undefined {
  return selectedAcademicYearId || dashboard?.currentAcademicYear?.id || dashboard?.academicYear?.id || undefined
}
