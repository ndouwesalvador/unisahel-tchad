import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { useAppStore, type AppUser } from './store'

const adminUser: AppUser = {
  id: 'user-1',
  tenantId: 'tenant-1',
  email: 'admin@example.com',
  firstName: 'Admin',
  lastName: 'Institution',
  role: 'ADMIN_INSTITUTION',
}

const otherUser: AppUser = {
  ...adminUser,
  id: 'user-2',
  email: 'other@example.com',
}

const createSessionStorageMock = () => {
  const storage = new Map<string, string>()

  return {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  }
}

describe('useAppStore session view handling', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      sessionStorage: createSessionStorageMock(),
    })

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

  afterEach(() => {
    vi.unstubAllGlobals()
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

  it('restores the last module for the same user after a browser reload', () => {
    useAppStore.getState().login(adminUser)
    useAppStore.getState().setView('structure')

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

    useAppStore.getState().login(adminUser)

    expect(useAppStore.getState().currentView).toBe('structure')
  })

  it('does not restore another user module after a browser reload', () => {
    useAppStore.getState().login(adminUser)
    useAppStore.getState().setView('structure')

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

    useAppStore.getState().login(otherUser)

    expect(useAppStore.getState().currentView).toBe('dashboard')
  })
})
