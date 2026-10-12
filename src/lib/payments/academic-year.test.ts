import { describe, expect, it } from 'vitest'
import { resolvePaymentAcademicYearId } from './academic-year'

describe('resolvePaymentAcademicYearId', () => {
  it('uses the academicYear field returned to role dashboards', () => {
    expect(resolvePaymentAcademicYearId(null, { academicYear: { id: 'year-role' } })).toBe('year-role')
  })

  it('keeps compatibility with the institution dashboard response', () => {
    expect(resolvePaymentAcademicYearId(null, { currentAcademicYear: { id: 'year-admin' } })).toBe('year-admin')
  })

  it('prefers the year selected in the global header', () => {
    expect(resolvePaymentAcademicYearId('year-selected', {
      academicYear: { id: 'year-role' }, currentAcademicYear: { id: 'year-admin' },
    })).toBe('year-selected')
  })
})
