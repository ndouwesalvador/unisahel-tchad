import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  student: vi.fn(), registration: vi.fn(), settings: vi.fn(), existing: vi.fn(),
  create: vi.fn(), audit: vi.fn(), transaction: vi.fn(), recognitions: vi.fn(),
  update: vi.fn(),
}))

vi.mock('@/lib/auth/helpers', () => ({ withTenantAuth: (handler: unknown) => handler }))
vi.mock('@/lib/db', () => ({ db: {
  student: { findFirst: mocks.student },
  administrativeRegistration: { findFirst: mocks.registration },
  tenantSettings: { findUnique: mocks.settings },
  priorLevelRecognition: { findFirst: mocks.existing, findMany: mocks.recognitions },
  $transaction: mocks.transaction,
} }))

const { GET, POST, PUT } = await import('./route')
const admin = { id: 'admin-A', role: 'ADMIN_INSTITUTION', tenantId: 'tenant-A' }
const studentId = 'cstudent00000000000000001'
const levelId = 'clevel0000000000000000001'
const terminalLevelId = 'clevel0000000000000000002'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.student.mockResolvedValue({
    id: studentId, currentProgramId: 'program-A', currentLevelId: terminalLevelId,
    currentLevel: { id: terminalLevelId, name: 'Master II', orderIndex: 2 },
    currentProgram: { id: 'program-A', name: 'Master GE', levels: [
      { id: levelId, name: 'Master I', orderIndex: 1 },
      { id: terminalLevelId, name: 'Master II', orderIndex: 2 },
    ] },
  })
  mocks.registration.mockResolvedValue({ academicYear: { startDate: new Date('2026-10-01') } })
  mocks.settings.mockResolvedValue({ creditsPerYear: 60 })
  mocks.existing.mockResolvedValue(null)
  mocks.recognitions.mockResolvedValue([])
  mocks.create.mockResolvedValue({ id: 'recognition-A', status: 'APPROVED' })
  mocks.audit.mockResolvedValue({ id: 'audit-A' })
  mocks.update.mockResolvedValue({ id: 'recognition-A', status: 'REVOKED' })
  mocks.transaction.mockImplementation((callback: (tx: unknown) => Promise<unknown>) => callback({
    priorLevelRecognition: { create: mocks.create, update: mocks.update }, auditLog: { create: mocks.audit },
  }))
})

function postRequest(overrides: Record<string, unknown> = {}) {
  return new NextRequest('http://localhost/api/level-recognitions', { method: 'POST', body: JSON.stringify({
    studentId, levelId, sourceInstitution: 'Université partenaire', sourceReference: 'EQ-2026-001',
    sourceAcademicYear: '2025-2026', sourceAwardDate: '2026-07-15', creditsAcquired: 60, average: 13.5,
    ...overrides,
  }) })
}

describe('prior level recognitions', () => {
  it('records and audits a complete prior-level equivalence', async () => {
    const handler = POST as unknown as (user: typeof admin, tenantId: string, request: NextRequest) => Promise<Response>
    const response = await handler(admin, 'tenant-A', postRequest())

    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      tenantId: 'tenant-A', studentId, programId: 'program-A', levelId,
      status: 'APPROVED', validatedById: 'admin-A', creditsAcquired: 60,
    }) })
    expect(mocks.audit).toHaveBeenCalledWith({ data: expect.objectContaining({
      action: 'APPROVE_EQUIVALENCE', entity: 'PriorLevelRecognition', entityId: 'recognition-A',
    }) })
  })

  it('refuses to replace the terminal level jury with an equivalence', async () => {
    const handler = POST as unknown as (user: typeof admin, tenantId: string, request: NextRequest) => Promise<Response>
    const response = await handler(admin, 'tenant-A', postRequest({ levelId: terminalLevelId }))

    expect(response.status).toBe(409)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('returns the recognised and still missing prior levels for the selected student', async () => {
    mocks.recognitions.mockResolvedValue([{ id: 'recognition-A', levelId, status: 'APPROVED' }])
    const request = new NextRequest(`http://localhost/api/level-recognitions?studentId=${studentId}`)
    const handler = GET as unknown as (user: typeof admin, tenantId: string, request: NextRequest) => Promise<Response>
    const response = await handler(admin, 'tenant-A', request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.priorLevels).toEqual([expect.objectContaining({ id: levelId, recognition: expect.objectContaining({ id: 'recognition-A' }) })])
  })

  it('revokes an erroneous equivalence without deleting its audit history', async () => {
    mocks.existing.mockResolvedValue({ id: 'recognition-A', status: 'APPROVED' })
    const request = new NextRequest('http://localhost/api/level-recognitions', { method: 'PUT', body: JSON.stringify({
      id: 'crecognition000000000000001', action: 'REVOKE', reason: 'La pièce justificative fournie était incorrecte.',
    }) })
    const handler = PUT as unknown as (user: typeof admin, tenantId: string, request: NextRequest) => Promise<Response>
    const response = await handler(admin, 'tenant-A', request)

    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: 'recognition-A' }, data: expect.objectContaining({
      status: 'REVOKED', revokedById: 'admin-A', revocationReason: 'La pièce justificative fournie était incorrecte.',
    }) })
    expect(mocks.audit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'REVOKE_EQUIVALENCE' }) })
  })
})
