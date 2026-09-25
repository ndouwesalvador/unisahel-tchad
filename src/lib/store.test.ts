import { describe, expect, it, beforeEach } from 'vitest'
import { useAppStore, type AppUser } from './store'

const adminUser: AppUser = {
  id: 'user-1',
  tenantId: 'tenant-1',
  email: 'admin@example.com',
  firstName: 'Admin',
  lastName: 'Institution',
  role: 'ADMIN_INSTITUTION',
}

describe('useAppStore session view handling', () => {
  beforeEach(() => {
    useAppStore.setState({
      currentView: 'landing',
      previousView: null,
      user: null,
      isAuthenticated: false,
      selectedTenantId: null,
      selectedAcademicYearId: null,
      selectedStudentId: null,
      selectedProgramId: null,
      selectedTeacherId: null,
    })
  })

  it('opens the dashboard on the first login', () => {
    useAppStore.getState().login(adminUser)

    expect(useAppStore.getState().currentView).toBe('dashboard')
  })

  it('keeps the current module when the same authenticated user is resynchronized', () => {
    useAppStore.getState().login(adminUser)
    useAppStore.getState().setView('structure')

    useAppStore.getState().login({ ...adminUser, tenantName: 'Université Polytechnique de Mongo' })

    expect(useAppStore.getState().currentView).toBe('structure')
  })
})
