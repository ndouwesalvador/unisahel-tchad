import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), auditCreate: vi.fn(), hash: vi.fn() }))
vi.mock('@/lib/auth/helpers', () => ({
  withAuth: (handler: unknown, roles?: string[]) => async (user: { id: string; role: string }, request: NextRequest) => {
    if (roles && !roles.includes(user.role)) return new Response('{}', { status: 403 })
    return (handler as (user: { id: string; role: string }, request: NextRequest) => Promise<Response>)(user, request)
  },
}))
vi.mock('@/lib/db', () => ({ db: { user: { findMany: mocks.findMany, findFirst: mocks.findFirst, create: mocks.create }, auditLog: { create: mocks.auditCreate } } }))
vi.mock('bcryptjs', () => ({ default: { hash: mocks.hash } }))
vi.mock('@/lib/password', () => ({ generateTempPassword: () => 'Temp-ONECS-123' }))

const { GET, POST } = await import('./route')
const superAdmin = { id: 'super-A', role: 'SUPER_ADMIN' }
const get = GET as unknown as (user: typeof superAdmin, request: NextRequest) => Promise<Response>
const post = POST as unknown as (user: typeof superAdmin, request: NextRequest) => Promise<Response>

beforeEach(() => {
  vi.resetAllMocks(); mocks.findMany.mockResolvedValue([]); mocks.findFirst.mockResolvedValue(null); mocks.hash.mockResolvedValue('hash'); mocks.auditCreate.mockResolvedValue({})
  mocks.create.mockResolvedValue({ id: 'onecs-A', email: 'controle@onecs.td', firstName: 'Agent', lastName: 'ONECS', role: 'ONECS', isActive: true })
})

describe('ONECS national accounts', () => {
  it('lists tenantless ONECS accounts for the super admin', async () => {
    const response = await get(superAdmin, new NextRequest('http://localhost/api/onecs/accounts'))
    expect(response.status).toBe(200)
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { role: 'ONECS', tenantId: null } }))
  })

  it('creates a tenantless account with a forced password change', async () => {
    const response = await post(superAdmin, new NextRequest('http://localhost/api/onecs/accounts', { method: 'POST', body: JSON.stringify({ firstName: 'Agent', lastName: 'ONECS', email: 'controle@onecs.td' }) }))
    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ tenantId: null, role: 'ONECS', mustChangePassword: true }) }))
    expect((await response.json()).tempPassword).toBe('Temp-ONECS-123')
  })
})
