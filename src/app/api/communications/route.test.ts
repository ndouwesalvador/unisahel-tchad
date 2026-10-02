import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ scope: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn() }))
vi.mock('@/lib/auth/helpers', () => ({ withTenantAuth: (handler: unknown) => handler }))
vi.mock('@/lib/auth/teacher-scope', () => ({ getTeacherScope: mocks.scope }))
vi.mock('@/lib/db', () => ({ db: { communication: { findMany: mocks.findMany, count: mocks.count, create: mocks.create } } }))

const { GET, POST } = await import('./route')
const user = { id: 'user-A', role: 'ENSEIGNANT', tenantId: 'tenant-A' }
const call = (handler: typeof GET, init?: ConstructorParameters<typeof NextRequest>[1]) => (handler as unknown as (u: typeof user, t: string, r: NextRequest) => Promise<Response>)(user, 'tenant-A', new NextRequest('http://localhost/api/communications', init))

describe('teacher communications isolation', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.scope.mockResolvedValue({ linked: true, teacherId: 'teacher-A', courseElementIds: ['element-A'] })
    mocks.findMany.mockResolvedValue([])
    mocks.count.mockResolvedValue(0)
  })

  it('does not list institution-wide broadcasts', async () => {
    expect((await call(GET)).status).toBe(200)
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: 'tenant-A', teacherId: 'teacher-A', courseElementId: { in: ['element-A'] } } }))
  })

  it('refuses a message associated with another teacher’s matter', async () => {
    const response = await call(POST, { method: 'POST', body: JSON.stringify({ courseElementId: 'element-B', subject: 'Question', content: 'Contenu' }) })
    expect(response.status).toBe(403)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('addresses an assigned matter only to administration', async () => {
    mocks.create.mockResolvedValue({ id: 'message-A' })
    const response = await call(POST, { method: 'POST', body: JSON.stringify({ courseElementId: 'element-A', subject: 'Question', content: 'Contenu' }) })
    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledWith({ data: expect.objectContaining({ teacherId: 'teacher-A', courseElementId: 'element-A', audience: 'Administration', channel: 'IN_APP' }) })
  })
})
