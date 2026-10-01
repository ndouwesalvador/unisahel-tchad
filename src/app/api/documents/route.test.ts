import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    student: { findFirst: vi.fn() },
    officialDocument: { findMany: vi.fn(), count: vi.fn(), groupBy: vi.fn(), update: vi.fn() },
  },
}))

vi.mock('@/lib/db', () => ({ db: dbMock }))
vi.mock('@/lib/auth/helpers', () => ({ withTenantAuth: (handler: unknown) => handler }))

const { GET, PUT } = await import('./route')

beforeEach(() => {
  vi.clearAllMocks()
  dbMock.student.findFirst.mockResolvedValue(null)
})

describe('GET /api/documents', () => {
  it('refuses a teacher access to institution-wide document history', async () => {
    const user = { id: 'teacher-A', role: 'ENSEIGNANT', tenantId: 'tenant-A' }
    const request = new NextRequest('http://localhost:3000/api/documents')
    const handler = GET as unknown as (sessionUser: typeof user, tenantId: string, request: NextRequest) => Promise<Response>

    const response = await handler(user, 'tenant-A', request)

    expect(response.status).toBe(403)
    expect(dbMock.officialDocument.findMany).not.toHaveBeenCalled()
  })

  it('refuses an unlinked student before querying institution documents', async () => {
    const user = { id: 'student-user-A', role: 'ETUDIANT', tenantId: 'tenant-A' }
    const request = new NextRequest('http://localhost:3000/api/documents')

    const handler = GET as unknown as (sessionUser: { id: string; role: string; tenantId: string }, tenantId: string, request: NextRequest) => Promise<Response>
    const response = await handler(user, 'tenant-A', request)

    expect(response.status).toBe(403)
    expect(dbMock.officialDocument.findMany).not.toHaveBeenCalled()
  })
})

describe('PUT /api/documents', () => {
  it('never retroactively validates a PDF without regenerating it', async () => {
    const user = { id: 'admin-A', role: 'ADMIN_INSTITUTION', tenantId: 'tenant-A' }
    const request = new NextRequest('http://localhost:3000/api/documents', { method: 'PUT', body: JSON.stringify({ id: 'old-pv-A' }) })
    const handler = PUT as unknown as (sessionUser: typeof user, tenantId: string, request: NextRequest) => Promise<Response>
    const response = await handler(user, 'tenant-A', request)
    expect(response.status).toBe(409)
    expect(dbMock.officialDocument.update).not.toHaveBeenCalled()
  })
})
