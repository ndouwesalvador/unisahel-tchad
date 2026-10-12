import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    student: { findFirst: vi.fn() },
    officialDocument: { findMany: vi.fn(), count: vi.fn(), groupBy: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}))

vi.mock('@/lib/db', () => ({ db: dbMock }))
vi.mock('@/lib/auth/helpers', () => ({ withTenantAuth: (handler: unknown) => handler }))
vi.mock('@/lib/auth/organization-scope', () => ({
  isOrganizationManager: (role: string) => role === 'FACULTE' || role === 'DEPARTEMENT',
  getOrganizationScope: vi.fn().mockResolvedValue({ facultyId: 'faculty-A', departmentIds: ['department-A'] }),
}))

const { GET, PUT } = await import('./route')

beforeEach(() => {
  vi.clearAllMocks()
  dbMock.student.findFirst.mockResolvedValue(null)
  dbMock.officialDocument.findMany.mockResolvedValue([])
  dbMock.officialDocument.count.mockResolvedValue(0)
  dbMock.officialDocument.groupBy.mockResolvedValue([])
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

  it('limits a linked student to legitimate personal document types', async () => {
    dbMock.student.findFirst.mockResolvedValue({ id: 'student-A' })
    const user = { id: 'student-user-A', role: 'ETUDIANT', tenantId: 'tenant-A' }
    const request = new NextRequest('http://localhost:3000/api/documents')
    const handler = GET as unknown as (sessionUser: typeof user, tenantId: string, request: NextRequest) => Promise<Response>

    const response = await handler(user, 'tenant-A', request)

    expect(response.status).toBe(200)
    expect(dbMock.officialDocument.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        tenantId: 'tenant-A',
        studentId: 'student-A',
        type: { in: ['RELEVE_NOTES', 'ATTESTATION_INSCRIPTION', 'CERTIFICAT_SCOLARITE', 'ATTESTATION_NIVEAU', 'DIPLOME'] },
        validatedAt: { not: null },
        status: { not: 'REVOKED' },
      }),
    }))
  })

  it('shows a department manager only PVs belonging to their department', async () => {
    dbMock.officialDocument.findMany.mockResolvedValue([
      { id: 'pv-A', type: 'PV_DELIBERATION', content: JSON.stringify({ departmentId: 'department-A' }), studentId: null,
        academicYearId: 'year-A', student: null, createdAt: new Date(), validatedAt: new Date(), status: 'VALIDATED', verificationCode: 'A' },
      { id: 'pv-B', type: 'PV_DELIBERATION', content: JSON.stringify({ departmentId: 'department-B' }), studentId: null,
        academicYearId: 'year-A', student: null, createdAt: new Date(), validatedAt: new Date(), status: 'VALIDATED', verificationCode: 'B' },
    ])
    const user = { id: 'head-A', role: 'DEPARTEMENT', tenantId: 'tenant-A' }
    const request = new NextRequest('http://localhost:3000/api/documents')
    const handler = GET as unknown as (sessionUser: typeof user, tenantId: string, request: NextRequest) => Promise<Response>

    const response = await handler(user, 'tenant-A', request)
    expect(response.status).toBe(200)
    expect((await response.json()).documents).toEqual([expect.objectContaining({ id: 'pv-A' })])
    expect(dbMock.officialDocument.count).not.toHaveBeenCalled()
  })

  it('shows the rectorat only validated official PVs', async () => {
    const user = { id: 'rectorat-A', role: 'RECTORAT', tenantId: 'tenant-A' }
    const request = new NextRequest('http://localhost:3000/api/documents')
    const handler = GET as unknown as (sessionUser: typeof user, tenantId: string, request: NextRequest) => Promise<Response>

    const response = await handler(user, 'tenant-A', request)

    expect(response.status).toBe(200)
    expect(dbMock.officialDocument.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId: 'tenant-A', type: 'PV_DELIBERATION', validatedAt: { not: null }, status: { not: 'REVOKED' } },
    }))
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

  it('revokes an issued document with an auditable reason', async () => {
    dbMock.officialDocument.findFirst.mockResolvedValue({ id: 'doc-A', status: 'GENERATED', type: 'RELEVE_NOTES' })
    dbMock.officialDocument.update.mockResolvedValue({ id: 'doc-A', status: 'REVOKED' })
    const user = { id: 'admin-A', role: 'ADMIN_INSTITUTION', tenantId: 'tenant-A' }
    const request = new NextRequest('http://localhost:3000/api/documents', { method: 'PUT', body: JSON.stringify({
      id: 'doc-A', action: 'REVOKE', reason: 'En-tête institutionnel incorrect lors de l’émission.',
    }) })
    const handler = PUT as unknown as (sessionUser: typeof user, tenantId: string, request: NextRequest) => Promise<Response>
    const response = await handler(user, 'tenant-A', request)
    expect(response.status).toBe(200)
    expect(dbMock.officialDocument.update).toHaveBeenCalledWith({ where: { id: 'doc-A' }, data: { status: 'REVOKED' } })
    expect(dbMock.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      tenantId: 'tenant-A', userId: 'admin-A', action: 'REVOKE', entity: 'OfficialDocument', entityId: 'doc-A',
    }) })
  })
})
