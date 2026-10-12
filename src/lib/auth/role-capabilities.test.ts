import { describe, expect, it } from 'vitest'
import {
  canManageStudents,
  canWriteTeachers,
  isOrganizationManager,
  isOrganizationScopedRole,
  isViewAllowed,
} from './role-capabilities'

describe('role capability matrix', () => {
  it('keeps caisse inside the financial workflow', () => {
    expect(isViewAllowed('CAISSE', 'payments')).toBe(true)
    expect(isViewAllowed('CAISSE', 'receipts')).toBe(true)
    expect(isViewAllowed('CAISSE', 'documents')).toBe(false)
    expect(isViewAllowed('CAISSE', 'students')).toBe(false)
    expect(isViewAllowed('CAISSE', 'statistics')).toBe(false)
  })

  it('makes rectorate an academic read-only oversight role', () => {
    for (const view of ['students', 'teachers', 'structure', 'statistics', 'documents', 'reports'] as const) {
      expect(isViewAllowed('RECTORAT', view)).toBe(true)
    }
    expect(canManageStudents('RECTORAT')).toBe(false)
    expect(canWriteTeachers('RECTORAT')).toBe(false)
    expect(isViewAllowed('RECTORAT', 'staff-users')).toBe(false)
    expect(isViewAllowed('RECTORAT', 'hr')).toBe(false)
  })

  it('limits a stage supervisor to assigned-stage work', () => {
    expect(isViewAllowed('MAITRE_STAGE', 'internships')).toBe(true)
    expect(isViewAllowed('MAITRE_STAGE', 'students')).toBe(false)
    expect(isViewAllowed('MAITRE_STAGE', 'grades')).toBe(false)
  })

  it('recognizes local organization scopes without granting manager powers to a filiere lead', () => {
    expect(isOrganizationScopedRole('FACULTE')).toBe(true)
    expect(isOrganizationScopedRole('DEPARTEMENT')).toBe(true)
    expect(isOrganizationScopedRole('RESPONSABLE_FILIERE')).toBe(true)
    expect(isOrganizationScopedRole('RECTORAT')).toBe(false)
    expect(isOrganizationManager('FACULTE')).toBe(true)
    expect(isOrganizationManager('DEPARTEMENT')).toBe(true)
    expect(isOrganizationManager('RESPONSABLE_FILIERE')).toBe(false)
  })

  it('reserves student mutations for central enrollment roles', () => {
    for (const role of ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE'] as const) {
      expect(canManageStudents(role)).toBe(true)
    }
    for (const role of ['RECTORAT', 'FACULTE', 'DEPARTEMENT', 'RESPONSABLE_FILIERE', 'MAITRE_STAGE', 'CAISSE'] as const) {
      expect(canManageStudents(role)).toBe(false)
    }
  })
})
