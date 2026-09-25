import { afterEach, describe, expect, it, vi } from 'vitest'

const { authMock, tenantFindFirstMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  tenantFindFirstMock: vi.fn(),
}))

vi.mock('@/lib/auth/config', () => ({ auth: authMock }))
vi.mock('@/lib/db', () => ({ db: { tenant: { findFirst: tenantFindFirstMock } } }))

const { GET } = await import('./route')

afterEach(() => vi.unstubAllEnvs())

describe('GET /api/seed', () => {
  it('cannot load demonstration data in production, even for a super admin', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    authMock.mockResolvedValue({ user: { id: 'admin', role: 'SUPER_ADMIN' } })

    const response = await GET()

    expect(response.status).toBe(404)
    expect(authMock).not.toHaveBeenCalled()
    expect(tenantFindFirstMock).not.toHaveBeenCalled()
  })
})
