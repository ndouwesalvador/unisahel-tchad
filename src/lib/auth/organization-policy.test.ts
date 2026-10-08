import { describe, expect, it } from 'vitest'
import { isOrganizationApiAllowed } from './organization-policy'

describe('organization API policy', () => {
  it('allows scoped schedule reads and writes', () => {
    expect(isOrganizationApiAllowed('/api/timetable', 'GET')).toBe(true)
    expect(isOrganizationApiAllowed('/api/timetable', 'POST')).toBe(true)
    expect(isOrganizationApiAllowed('/api/timetable', 'PUT')).toBe(true)
    expect(isOrganizationApiAllowed('/api/timetable', 'DELETE')).toBe(true)
  })
  it('allows department jury corrections only through the scoped deliberation endpoint', () => {
    expect(isOrganizationApiAllowed('/api/deliberation', 'PATCH')).toBe(true)
    expect(isOrganizationApiAllowed('/api/grades', 'PATCH')).toBe(false)
  })
  it('allows scoped annual-service requests and decisions', () => {
    expect(isOrganizationApiAllowed('/api/teaching-services', 'GET')).toBe(true)
    expect(isOrganizationApiAllowed('/api/teaching-services', 'POST')).toBe(true)
    expect(isOrganizationApiAllowed('/api/teaching-services', 'PATCH')).toBe(true)
  })
  it('allows organization users to change their own password', () => {
    expect(isOrganizationApiAllowed('/api/profile', 'GET')).toBe(true)
    expect(isOrganizationApiAllowed('/api/profile', 'PUT')).toBe(true)
  })
  it('allows organization users to read the tenant color palette only', () => {
    expect(isOrganizationApiAllowed('/api/institution/branding', 'GET')).toBe(true)
    expect(isOrganizationApiAllowed('/api/institution/branding', 'PUT')).toBe(false)
  })
  it('denies institution-wide operations while allowing scoped curriculum management', () => {
    expect(isOrganizationApiAllowed('/api/grades', 'GET')).toBe(false)
    expect(isOrganizationApiAllowed('/api/structure', 'POST')).toBe(true)
    expect(isOrganizationApiAllowed('/api/teachers', 'POST')).toBe(true)
    expect(isOrganizationApiAllowed('/api/users', 'GET')).toBe(false)
  })
})
