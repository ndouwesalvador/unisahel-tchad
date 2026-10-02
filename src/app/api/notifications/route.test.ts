import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ findMany: vi.fn(), count: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn() }))
vi.mock('@/lib/auth/helpers', () => ({ withAuth: (handler: unknown) => handler }))
vi.mock('@/lib/db', () => ({ db: { notification: mocks } }))

const { GET, PUT } = await import('./route')
const get = GET as unknown as (user: { id: string; role: string; tenantId: string }, request: NextRequest) => Promise<Response>
const put = PUT as unknown as typeof get
const teacher = { id: 'user-teacher', role: 'ENSEIGNANT', tenantId: 'tenant-A' }
const admin = { id: 'user-admin', role: 'ADMIN_INSTITUTION', tenantId: 'tenant-A' }

beforeEach(() => {
  vi.resetAllMocks()
  mocks.findMany.mockResolvedValue([])
  mocks.count.mockResolvedValue(0)
  mocks.findFirst.mockResolvedValue(null)
  mocks.updateMany.mockResolvedValue({ count: 1 })
})

describe('recipient-scoped notifications', () => {
  it('lists only the teacher’s own notifications', async () => {
    const response = await get(teacher, new NextRequest('http://localhost/api/notifications'))
    expect(response.status).toBe(200)
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: 'tenant-A', recipientUserId: 'user-teacher' } }))
    expect(mocks.count).toHaveBeenCalledWith({ where: { tenantId: 'tenant-A', recipientUserId: 'user-teacher', isRead: false } })
  })

  it('preserves institution-wide notices for central administration only', async () => {
    await get(admin, new NextRequest('http://localhost/api/notifications'))
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {
      tenantId: 'tenant-A', OR: [{ recipientUserId: null }, { recipientUserId: 'user-admin' }],
    } }))
  })

  it('does not let a teacher mark another recipient’s notification as read', async () => {
    const response = await put(teacher, new NextRequest('http://localhost/api/notifications?id=other', {
      method: 'PUT', body: JSON.stringify({ action: 'read' }),
    }))
    expect(response.status).toBe(404)
    expect(mocks.findFirst).toHaveBeenCalledWith({ where: { id: 'other', tenantId: 'tenant-A', recipientUserId: 'user-teacher' } })
    expect(mocks.updateMany).not.toHaveBeenCalled()
  })

  it('marks only the teacher’s own unread notifications read', async () => {
    const response = await put(teacher, new NextRequest('http://localhost/api/notifications', {
      method: 'PUT', body: JSON.stringify({ action: 'read-all' }),
    }))
    expect(response.status).toBe(200)
    expect(mocks.updateMany).toHaveBeenCalledWith({ where: {
      tenantId: 'tenant-A', recipientUserId: 'user-teacher', isRead: false,
    }, data: { isRead: true } })
  })
})
