import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    officialDocument: { findUnique: vi.fn() },
    tenant: { findUnique: vi.fn() },
  },
}))

vi.mock('@/lib/db', () => ({ db: dbMock }))

const { GET } = await import('./route')
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
    expect((await response.json()).valid).toBe(true)
  })
})
