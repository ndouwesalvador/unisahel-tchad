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

  it('crops white margins from a second signature before saving it', async () => {
    const image = await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="500" height="160"><rect width="500" height="160" fill="white"/><path d="M150 90 Q200 10 250 90 L350 70" fill="none" stroke="black" stroke-width="5"/></svg>')).png().toBuffer()
    const response = await POST(await request('secondarySignature', image))
    expect(response.status).toBe(200)
    const saved = dbMock.tenant.update.mock.calls[0][0].data.secondarySignature as string
    const metadata = await sharp(Buffer.from(saved.split(',')[1], 'base64')).metadata()
    expect(metadata.width).toBeLessThan(500)
    expect(metadata.height).toBeLessThan(160)
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
