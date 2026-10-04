import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import sharp from 'sharp'

const { authMock, dbMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  dbMock: { tenant: { update: vi.fn() }, auditLog: { create: vi.fn() } },
}))
vi.mock('@/lib/auth/config', () => ({ auth: authMock }))
vi.mock('@/lib/db', () => ({ db: dbMock }))

const { POST } = await import('./route')

async function request(kind: string, content: Buffer, mime = 'image/png') {
  const form = new FormData()
  form.set('kind', kind)
  form.set('file', new File([new Uint8Array(content)], 'visuel.png', { type: mime }))
  return new NextRequest('http://localhost:3000/api/institution/assets', { method: 'POST', body: form })
}

beforeEach(() => {
  vi.clearAllMocks()
  authMock.mockResolvedValue({ user: { id: 'admin-A', role: 'ADMIN_INSTITUTION', tenantId: 'tenant-A' } })
})

describe('institution artwork upload', () => {
  it('stores an optimized image under the authenticated tenant and audits the change', async () => {
    const image = await sharp({ create: { width: 20, height: 20, channels: 4, background: '#175c3e' } }).png().toBuffer()
    const response = await POST(await request('logo', image))
    expect(response.status).toBe(200)
    expect(dbMock.tenant.update).toHaveBeenCalledWith({ where: { id: 'tenant-A' },
      data: { logo: expect.stringMatching(/^data:image\/png;base64,/) } })
    expect(dbMock.auditLog.create).toHaveBeenCalledOnce()
  })

  it('rejects a forged image and never writes it', async () => {
    const response = await POST(await request('stamp', Buffer.from('%PDF-1.4'), 'image/png'))
    expect(response.status).toBe(400)
    expect(dbMock.tenant.update).not.toHaveBeenCalled()
  })

  it('rejects teachers even with a valid image', async () => {
    authMock.mockResolvedValue({ user: { id: 'teacher-A', role: 'ENSEIGNANT', tenantId: 'tenant-A' } })
    const image = await sharp({ create: { width: 2, height: 2, channels: 4, background: '#fff' } }).png().toBuffer()
    const response = await POST(await request('logo', image))
    expect(response.status).toBe(403)
    expect(dbMock.tenant.update).not.toHaveBeenCalled()
  })
})
