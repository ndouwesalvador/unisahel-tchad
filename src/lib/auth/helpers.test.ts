import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { authMock } = vi.hoisted(() => ({ authMock: vi.fn() }))
vi.mock('@/lib/auth/config', () => ({ auth: authMock }))

import { withAuth, withTenantAuth, type SessionUser } from './helpers'

function makeUser(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: 'user-1',
    email: 'user@example.com',
    role: 'ADMIN_INSTITUTION',
    tenantId: 'tenant-A',
    firstName: 'Test',
    lastName: 'User',
    ...overrides,
  }
}

function req(url: string) {
  return new NextRequest(new URL(url, 'http://localhost:3000'))
}

beforeEach(() => {
  authMock.mockReset()
})

describe('withAuth', () => {
  it('returns 401 when there is no session', async () => {
    authMock.mockResolvedValue(null)
    const handler = vi.fn()
    const wrapped = withAuth(handler)
    const res = await wrapped(req('/api/x'))
    expect(res.status).toBe(401)
    expect(handler).not.toHaveBeenCalled()
  })

  it('returns 403 when the role is not in the allow-list', async () => {
    authMock.mockResolvedValue({ user: makeUser({ role: 'ETUDIANT' }) })
    const handler = vi.fn()
    const wrapped = withAuth(handler, ['SUPER_ADMIN', 'ADMIN_INSTITUTION'])
    const res = await wrapped(req('/api/x'))
    expect(res.status).toBe(403)
    expect(handler).not.toHaveBeenCalled()
  })

  it('calls the handler with the session user when authorized', async () => {
    const user = makeUser({ role: 'SUPER_ADMIN' })
    authMock.mockResolvedValue({ user })
    const handler = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    const wrapped = withAuth(handler, ['SUPER_ADMIN'])
    await wrapped(req('/api/x'))
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0][0]).toMatchObject({ id: user.id, role: 'SUPER_ADMIN' })
  })
})

describe('withTenantAuth', () => {
  // This is the exact class of bug found and fixed in Chantier 1: several
  // routes were written with a single-argument handler and cast `as any`,
  // silently receiving the SessionUser object where they expected a
  // NextRequest. Asserting the real 3-arg call shape here is a regression
  // test for that specific failure mode.
  it('invokes the handler with (user, tenantId, request) in that order', async () => {
    const user = makeUser({ tenantId: 'tenant-A' })
    authMock.mockResolvedValue({ user })
    const handler = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    const wrapped = withTenantAuth(handler)
    const request = req('/api/x?tenantId=tenant-A')

    await wrapped(request)

    expect(handler).toHaveBeenCalledTimes(1)
    const [calledUser, calledTenantId, calledRequest] = handler.mock.calls[0]
    expect(calledUser).toMatchObject({ id: user.id })
    expect(calledTenantId).toBe('tenant-A')
    expect(calledRequest).toBeInstanceOf(NextRequest)
    // A handler that mistakenly treats its single arg as NextRequest would
    // crash on `.url` (SessionUser has no such property) - assert the
    // opposite is true instead: it really is a request with a valid url.
    expect(typeof calledRequest.url).toBe('string')
  })

  it('returns 401 with no session', async () => {
    authMock.mockResolvedValue(null)
    const handler = vi.fn()
    const wrapped = withTenantAuth(handler)
    const res = await wrapped(req('/api/x'))
    expect(res.status).toBe(401)
    expect(handler).not.toHaveBeenCalled()
  })

  it('returns 403 when a non-SUPER_ADMIN requests a different tenant (cross-tenant isolation)', async () => {
    const user = makeUser({ role: 'ADMIN_INSTITUTION', tenantId: 'tenant-A' })
    authMock.mockResolvedValue({ user })
    const handler = vi.fn()
    const wrapped = withTenantAuth(handler)
    const res = await wrapped(req('/api/x?tenantId=tenant-B'))
    expect(res.status).toBe(403)
    expect(handler).not.toHaveBeenCalled()
  })

  it('allows SUPER_ADMIN to access a tenant other than their own', async () => {
    const user = makeUser({ role: 'SUPER_ADMIN', tenantId: 'tenant-A' })
    authMock.mockResolvedValue({ user })
    const handler = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    const wrapped = withTenantAuth(handler)
    const res = await wrapped(req('/api/x?tenantId=tenant-B'))
    expect(res.status).toBe(200)
    expect(handler.mock.calls[0][1]).toBe('tenant-B')
  })

  it('falls back to the session tenantId when no tenantId query param is given', async () => {
    const user = makeUser({ tenantId: 'tenant-A' })
    authMock.mockResolvedValue({ user })
    const handler = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    const wrapped = withTenantAuth(handler)
    await wrapped(req('/api/x'))
    expect(handler.mock.calls[0][1]).toBe('tenant-A')
  })

  it('rejects a role not in the allow-list before ever resolving a tenant', async () => {
    const user = makeUser({ role: 'ETUDIANT', tenantId: 'tenant-A' })
    authMock.mockResolvedValue({ user })
    const handler = vi.fn()
    const wrapped = withTenantAuth(handler, ['SUPER_ADMIN', 'ADMIN_INSTITUTION'])
    const res = await wrapped(req('/api/x'))
    expect(res.status).toBe(403)
    expect(handler).not.toHaveBeenCalled()
  })
})
