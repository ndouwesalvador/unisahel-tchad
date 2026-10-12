import { describe, expect, it } from 'vitest'
import { isOrganizationApiAllowed } from './organization-policy'

describe('organization API policy', () => {
  it('allows scoped schedule reads and writes', () => {
    expect(isOrganizationApiAllowed('DEPARTEMENT', '/api/timetable', 'GET')).toBe(true)
    expect(isOrganizationApiAllowed('DEPARTEMENT', '/api/timetable', 'POST')).toBe(true)
    expect(isOrganizationApiAllowed('DEPARTEMENT', '/api/timetable', 'PUT')).toBe(true)
    expect(isOrganizationApiAllowed('DEPARTEMENT', '/api/timetable', 'DELETE')).toBe(true)
    expect(isOrganizationApiAllowed('DEPARTEMENT', '/api/timetable/export', 'GET')).toBe(true)
    expect(isOrganizationApiAllowed('DEPARTEMENT', '/api/timetable/export', 'POST')).toBe(false)
  })
  it('allows department jury corrections only through the scoped deliberation endpoint', () => {
    expect(isOrganizationApiAllowed('DEPARTEMENT', '/api/deliberation', 'PATCH')).toBe(true)
    expect(isOrganizationApiAllowed('DEPARTEMENT', '/api/grades', 'PATCH')).toBe(false)
  })
  it('allows scoped annual-service requests and decisions', () => {
    expect(isOrganizationApiAllowed('DEPARTEMENT', '/api/teaching-services', 'GET')).toBe(true)
    expect(isOrganizationApiAllowed('DEPARTEMENT', '/api/teaching-services', 'POST')).toBe(true)
    expect(isOrganizationApiAllowed('DEPARTEMENT', '/api/teaching-services', 'PATCH')).toBe(true)
  })
  it('allows organization users to change their own password', () => {
    expect(isOrganizationApiAllowed('DEPARTEMENT', '/api/profile', 'GET')).toBe(true)
    expect(isOrganizationApiAllowed('DEPARTEMENT', '/api/profile', 'PUT')).toBe(true)
  })
  it('allows organization users to read the tenant color palette only', () => {
    expect(isOrganizationApiAllowed('DEPARTEMENT', '/api/institution/branding', 'GET')).toBe(true)
    expect(isOrganizationApiAllowed('DEPARTEMENT', '/api/institution/branding', 'PUT')).toBe(false)
  })
  it('denies institution-wide operations while allowing scoped curriculum management', () => {
    expect(isOrganizationApiAllowed('DEPARTEMENT', '/api/grades', 'GET')).toBe(false)
    expect(isOrganizationApiAllowed('DEPARTEMENT', '/api/structure', 'POST')).toBe(true)
    expect(isOrganizationApiAllowed('DEPARTEMENT', '/api/teachers', 'POST')).toBe(true)
    expect(isOrganizationApiAllowed('DEPARTEMENT', '/api/users', 'GET')).toBe(false)
  })

  it('keeps a filiere lead on scoped read-only endpoints', () => {
    expect(isOrganizationApiAllowed('RESPONSABLE_FILIERE', '/api/dashboard', 'GET')).toBe(true)
    expect(isOrganizationApiAllowed('RESPONSABLE_FILIERE', '/api/students', 'GET')).toBe(true)
    expect(isOrganizationApiAllowed('RESPONSABLE_FILIERE', '/api/structure', 'GET')).toBe(true)
    expect(isOrganizationApiAllowed('RESPONSABLE_FILIERE', '/api/structure', 'POST')).toBe(false)
    expect(isOrganizationApiAllowed('RESPONSABLE_FILIERE', '/api/teachers', 'GET')).toBe(false)
    expect(isOrganizationApiAllowed('RESPONSABLE_FILIERE', '/api/deliberation', 'GET')).toBe(false)
  })
})
