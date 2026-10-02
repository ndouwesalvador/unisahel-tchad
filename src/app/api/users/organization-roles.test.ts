import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  faculty: vi.fn(), department: vi.fn(), userFindUnique: vi.fn(), userFindFirst: vi.fn(), userCreate: vi.fn(), userUpdate: vi.fn(), audit: vi.fn(),
}))
vi.mock('@/lib/auth/helpers', () => ({ withTenantAuth: (handler: unknown) => handler }))
vi.mock('@/lib/password', () => ({ generateTempPassword: () => 'temporary-test-password' }))
vi.mock('bcryptjs', () => ({ default: { hash: vi.fn().mockResolvedValue('hashed-password') } }))
vi.mock('@/lib/db', () => ({ db: {
  faculty: { findFirst: mocks.faculty }, department: { findFirst: mocks.department },
  user: { findUnique: mocks.userFindUnique, findFirst: mocks.userFindFirst, create: mocks.userCreate, update: mocks.userUpdate },
  auditLog: { create: mocks.audit },
} }))

const { POST, PUT } = await import('./route')
const admin = { id: 'cadmin000000000000000001', role: 'ADMIN_INSTITUTION', tenantId: 'ctenant00000000000000001' }
const post = POST as unknown as (user: typeof admin, tenantId: string, request: NextRequest) => Promise<Response>
const put = PUT as unknown as (user: typeof admin, tenantId: string, request: NextRequest) => Promise<Response>
const request = (method: string, body: unknown) => new NextRequest('http://localhost/api/users', { method, body: JSON.stringify(body) })
const base = { firstName: 'Awa', lastName: 'Tahir', email: 'awa@example.test' }

beforeEach(() => {
  vi.resetAllMocks()
  mocks.faculty.mockResolvedValue({ id: 'cfaculty0000000000000001' })
  mocks.department.mockResolvedValue({ id: 'cdepartment000000000001', facultyId: 'cfaculty0000000000000001' })
  mocks.userFindUnique.mockResolvedValue(null)
  mocks.userCreate.mockResolvedValue({ id: 'cuser000000000000000001', ...base, role: 'DEPARTEMENT' })
  mocks.audit.mockResolvedValue({ id: 'audit' })
})

describe('staff scope assignment', () => {
  it('requires a department for a new head', async () => {
    const response = await post(admin, admin.tenantId, request('POST', { ...base, role: 'DEPARTEMENT' }))
    expect(response.status).toBe(400)
    expect(mocks.userCreate).not.toHaveBeenCalled()
  })

  it('rejects a department outside the tenant', async () => {
    mocks.department.mockResolvedValue(null)
    const response = await post(admin, admin.tenantId, request('POST', { ...base, role: 'DEPARTEMENT', departmentId: 'cdepartment000000000001' }))
    expect(response.status).toBe(400)
    expect(mocks.userCreate).not.toHaveBeenCalled()
  })

  it('creates a scoped dean', async () => {
    const response = await post(admin, admin.tenantId, request('POST', { ...base, role: 'FACULTE', facultyId: 'cfaculty0000000000000001' }))
    expect(response.status).toBe(201)
    expect(mocks.userCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ facultyId: 'cfaculty0000000000000001', departmentId: null }) }))
  })

  it('does not mutate a teacher through the staff module', async () => {
    mocks.userFindFirst.mockResolvedValue({ id: 'cteacher0000000000000001', role: 'ENSEIGNANT', facultyId: null, departmentId: null })
    const response = await put(admin, admin.tenantId, request('PUT', { id: 'cteacher0000000000000001', role: 'DEPARTEMENT', departmentId: 'cdepartment000000000001' }))
    expect(response.status).toBe(403)
    expect(mocks.userUpdate).not.toHaveBeenCalled()
  })
})
