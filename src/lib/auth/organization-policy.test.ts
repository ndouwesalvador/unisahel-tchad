import { describe, expect, it } from 'vitest'
import { isOrganizationApiAllowed } from './organization-policy'

describe('organization API policy', () => {
  it('allows scoped schedule reads and writes', () => {
    expect(isOrganizationApiAllowed('/api/timetable', 'GET')).toBe(true)
    expect(isOrganizationApiAllowed('/api/timetable', 'POST')).toBe(true)
    expect(isOrganizationApiAllowed('/api/timetable', 'PUT')).toBe(true)
    expect(isOrganizationApiAllowed('/api/timetable', 'DELETE')).toBe(true)
  })
  it('denies institution-wide grade and administrative operations', () => {
    expect(isOrganizationApiAllowed('/api/grades', 'GET')).toBe(false)
    expect(isOrganizationApiAllowed('/api/structure', 'POST')).toBe(false)
    expect(isOrganizationApiAllowed('/api/users', 'GET')).toBe(false)
  })
})
