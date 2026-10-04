import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createHash } from 'node:crypto'

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    officialDocument: { findUnique: vi.fn() },
    tenant: { findUnique: vi.fn() },
  },
}))

vi.mock('@/lib/db', () => ({ db: dbMock }))

const { GET, POST } = await import('./route')
const request = new NextRequest('http://localhost:3000/api/documents/verify/ABC123')
const context = { params: Promise.resolve({ code: 'ABC123' }) }

beforeEach(() => {
  vi.clearAllMocks()
  dbMock.tenant.findUnique.mockResolvedValue({ name: 'Université A' })
})

describe('GET /api/documents/verify/[code]', () => {
  it('does not authenticate an unsigned generated document', async () => {
    dbMock.officialDocument.findUnique.mockResolvedValue({
      tenantId: 'tenant-A', content: '{}', type: 'RELEVE_NOTES', number: 'R-1',
      status: 'GENERATED', validatedAt: null, student: null,
    })

    const response = await GET(request, context)
    expect((await response.json()).valid).toBe(false)
  })

  it('authenticates a signed document', async () => {
    dbMock.officialDocument.findUnique.mockResolvedValue({
      tenantId: 'tenant-A', content: '{}', type: 'RELEVE_NOTES', number: 'R-2',
      status: 'GENERATED', validatedAt: new Date(), student: null,
    })

    const response = await GET(request, context)
    const result = await response.json()
    expect(result.valid).toBe(true)
    expect(result.fileVerificationAvailable).toBe(false)
  })
})

describe('POST /api/documents/verify/[code]', () => {
  const original = Buffer.from('%PDF-1.4\nissued content')
  beforeEach(() => dbMock.officialDocument.findUnique.mockResolvedValue({
    validatedAt: new Date(), status: 'GENERATED', hash: createHash('sha256').update(original).digest('hex'),
  }))

  function upload(bytes: Buffer) {
    const form = new FormData()
    form.set('file', new File([Uint8Array.from(bytes)], 'releve.pdf', { type: 'application/pdf' }))
    return new NextRequest(request.url, { method: 'POST', body: form })
  }

  it('accepts the exact issued PDF bytes', async () => {
    const response = await POST(upload(original), context)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ valid: true, fileMatchesOriginal: true })
  })

  it('detects a changed PDF despite a valid QR code', async () => {
    const response = await POST(upload(Buffer.from('%PDF-1.4\nchanged grades')), context)
    expect(await response.json()).toMatchObject({ valid: false, fileMatchesOriginal: false })
  })

  it('refuses an older document without a stored digest', async () => {
    dbMock.officialDocument.findUnique.mockResolvedValue({ validatedAt: new Date(), status: 'GENERATED', hash: null })
    const response = await POST(upload(original), context)
    expect(response.status).toBe(409)
  })

  it('refuses a revoked document even when its bytes match', async () => {
    dbMock.officialDocument.findUnique.mockResolvedValue({ validatedAt: new Date(), status: 'REVOKED',
      hash: createHash('sha256').update(original).digest('hex') })
    const response = await POST(upload(original), context)
    expect(response.status).toBe(409)
  })
})
