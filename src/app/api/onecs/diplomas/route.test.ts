import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn(), auditCreate: vi.fn() }))
vi.mock('@/lib/auth/helpers', () => ({
  withAuth: (handler: unknown, roles?: string[]) => async (user: { id: string; role: string }, request: NextRequest) => {
    if (roles && !roles.includes(user.role)) return new Response('{}', { status: 403 })
    return (handler as (user: { id: string; role: string }, request: NextRequest) => Promise<Response>)(user, request)
  },
}))
vi.mock('@/lib/db', () => ({ db: {
  officialDocument: { findMany: mocks.findMany, findFirst: mocks.findFirst, update: mocks.update },
  auditLog: { create: mocks.auditCreate },
} }))

const { GET, PUT } = await import('./route')
const onecs = { id: 'onecs-A', role: 'ONECS' }

beforeEach(() => {
  vi.resetAllMocks()
  mocks.findMany.mockResolvedValue([])
  mocks.auditCreate.mockResolvedValue({})
})

describe('ONECS diploma authentication', () => {
  it('lists only signed diplomas across institutions', async () => {
    const response = await (GET as never as Function)(onecs, new NextRequest('http://localhost/api/onecs/diplomas'))
    expect(response.status).toBe(200)
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ type: 'DIPLOME', validatedAt: { not: null }, status: { not: 'REVOKED' } }) }))
  })

  it('authenticates an issued diploma without modifying its PDF', async () => {
    mocks.findFirst.mockResolvedValue({ id: 'doc-A', tenantId: 'tenant-A', type: 'DIPLOME', validatedAt: new Date(), status: 'GENERATED', onecsStatus: 'PENDING' })
    mocks.update.mockResolvedValue({ id: 'doc-A', onecsStatus: 'AUTHENTICATED', onecsReference: 'ONECS-2026-ABC' })
    const response = await (PUT as never as Function)(onecs, new NextRequest('http://localhost/api/onecs/diplomas', { method: 'PUT', body: JSON.stringify({ id: 'doc-A', decision: 'AUTHENTICATED' }) }))
    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'doc-A' }, data: expect.objectContaining({ onecsStatus: 'AUTHENTICATED', onecsAuthenticatedBy: 'onecs-A' }) }))
    expect(mocks.auditCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ tenantId: 'tenant-A', entity: 'OfficialDocument', entityId: 'doc-A' }) }))
  })

  it('requires a reason when rejecting a diploma', async () => {
    mocks.findFirst.mockResolvedValue({ id: 'doc-A', tenantId: 'tenant-A', type: 'DIPLOME', validatedAt: new Date(), status: 'GENERATED', onecsStatus: 'PENDING' })
    const response = await (PUT as never as Function)(onecs, new NextRequest('http://localhost/api/onecs/diplomas', { method: 'PUT', body: JSON.stringify({ id: 'doc-A', decision: 'REJECTED' }) }))
    expect(response.status).toBe(400)
    expect(mocks.update).not.toHaveBeenCalled()
  })
})
