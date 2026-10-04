import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import sharp from 'sharp'

const { authMock, scopeMock, dbMock } = vi.hoisted(() => ({
  authMock: vi.fn(), scopeMock: vi.fn(),
  dbMock: {
    $transaction: vi.fn(),
    deliberation: { findFirst: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}))
vi.mock('@/lib/auth/config', () => ({ auth: authMock }))
vi.mock('@/lib/auth/organization-scope', () => ({ getOrganizationScope: scopeMock }))
vi.mock('@/lib/db', () => ({ db: dbMock }))

const { POST } = await import('./route')

async function request(file: Buffer, memberIndex = 0) {
  const form = new FormData()
  form.set('deliberationId', 'delib-A')
  form.set('memberIndex', String(memberIndex))
  form.set('file', new File([new Uint8Array(file)], 'signature.png', { type: 'image/png' }))
  return new NextRequest('http://localhost:3000/api/deliberation/signature', { method: 'POST', body: form })
}

beforeEach(() => {
  vi.clearAllMocks()
  authMock.mockResolvedValue({ user: { id: 'head-A', role: 'DEPARTEMENT', tenantId: 'tenant-A' } })
  scopeMock.mockResolvedValue({ facultyId: 'faculty-A', departmentIds: ['department-A'] })
  dbMock.$transaction.mockImplementation((callback: (tx: typeof dbMock) => Promise<unknown>) => callback(dbMock))
  dbMock.deliberation.findFirst.mockResolvedValue({ id: 'delib-A', juryMembers: [{ name: 'Président', role: 'President' }] })
})

describe('locked jury signature upload', () => {
  it('adds the signature without changing the jury composition and records the author', async () => {
    const png = await sharp({ create: { width: 20, height: 10, channels: 4, background: '#111' } }).png().toBuffer()
    const response = await POST(await request(png))
    expect(response.status).toBe(200)
    expect(dbMock.deliberation.findFirst).toHaveBeenCalledWith({ where: { id: 'delib-A', tenantId: 'tenant-A',
      isLocked: true, departmentId: { in: ['department-A'] } } })
    expect(dbMock.deliberation.update).toHaveBeenCalledWith({ where: { id: 'delib-A' }, data: {
      juryMembers: [{ name: 'Président', role: 'President', signature: expect.stringMatching(/^data:image\/png;base64,/) }],
    } })
    expect(dbMock.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      action: 'JURY_SIGNATURE_UPLOADED', userId: 'head-A', tenantId: 'tenant-A',
    }) })
  })

  it('cannot upload for a department outside the manager scope', async () => {
    dbMock.deliberation.findFirst.mockResolvedValue(null)
    const png = await sharp({ create: { width: 2, height: 2, channels: 4, background: '#fff' } }).png().toBuffer()
    const response = await POST(await request(png))
    expect(response.status).toBe(404)
    expect(dbMock.deliberation.update).not.toHaveBeenCalled()
  })
})
