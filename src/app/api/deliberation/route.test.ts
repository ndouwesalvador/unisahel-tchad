import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { authMock, scopeMock, readinessMock, dbMock } = vi.hoisted(() => ({
  authMock: vi.fn(), scopeMock: vi.fn(), readinessMock: vi.fn(),
  dbMock: {
    $transaction: vi.fn(),
    auditLog: { create: vi.fn(), findMany: vi.fn() },
    academicYear: { findFirst: vi.fn() },
    department: { findMany: vi.fn() },
    deliberation: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    deliberationDecision: { findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    grade: { findMany: vi.fn() },
    student: { findMany: vi.fn() },
    tenantSettings: { findUnique: vi.fn() },
  },
}))
vi.mock('@/lib/auth/config', () => ({ auth: authMock }))
vi.mock('@/lib/auth/organization-scope', () => ({ getOrganizationScope: scopeMock }))
vi.mock('@/lib/deliberations/readiness', () => ({ computeGradeReadiness: readinessMock }))
vi.mock('@/lib/db', () => ({ db: dbMock }))

const { GET, POST, PUT, PATCH } = await import('./route')
const url = 'http://localhost:3000/api/deliberation'
const request = (method: string, suffix = '', body?: unknown) => new NextRequest(`${url}${suffix}`, {
  method, ...(body ? { body: JSON.stringify(body) } : {}),
})

beforeEach(() => {
  vi.clearAllMocks()
  dbMock.$transaction.mockImplementation((callback: (tx: typeof dbMock) => Promise<unknown>) => callback(dbMock))
  authMock.mockResolvedValue({ user: { id: 'head-A', role: 'DEPARTEMENT', tenantId: 'tenant-A' } })
  scopeMock.mockResolvedValue({ facultyId: 'faculty-A', departmentIds: ['department-A'] })
  dbMock.department.findMany.mockResolvedValue([{ id: 'department-A', name: 'Génie informatique', shortName: 'GI' }])
  dbMock.academicYear.findFirst.mockResolvedValue({ id: 'year-A', name: '2026-2027' })
  dbMock.deliberation.findMany.mockResolvedValue([])
  dbMock.auditLog.findMany.mockResolvedValue([])
  dbMock.deliberation.findFirst.mockResolvedValue(null)
  dbMock.tenantSettings.findUnique.mockResolvedValue(null)
  dbMock.grade.findMany.mockResolvedValue([{
    studentId: 'student-A', finalGrade: 14, teachingUnitId: 'unit-A', courseElement: { coefficient: 1 },
    teachingUnit: { credits: 6 }, student: { id: 'student-A', firstName: 'Awa', lastName: 'Test', matricule: 'A-001' },
  }])
  readinessMock.mockResolvedValue({ ready: true, studentIds: ['student-A'], studentsTotal: 1 })
  dbMock.deliberation.create.mockResolvedValue({ id: 'delib-A', departmentId: 'department-A', decisions: [{ studentId: 'student-A' }] })
})

describe('department deliberation boundary', () => {
  it('refuses to preview or launch another department', async () => {
    const preview = await GET(request('GET', '?departmentId=department-B'))
    const launch = await POST(request('POST', '', { departmentId: 'department-B', session: 'NORMALE' }))
    expect(preview.status).toBe(403)
    expect(launch.status).toBe(403)
    expect(readinessMock).not.toHaveBeenCalled()
    expect(dbMock.deliberation.create).not.toHaveBeenCalled()
  })

  it('creates a jury only for its own ready cohort', async () => {
    const response = await POST(request('POST', '', { departmentId: 'department-A', session: 'NORMALE' }))
    expect(response.status).toBe(201)
    expect(readinessMock).toHaveBeenCalledWith('tenant-A', 'year-A', 'NORMALE', 'department-A')
    expect(dbMock.deliberation.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ departmentId: 'department-A', decisions: { create: [expect.objectContaining({ studentId: 'student-A' })] } }),
    }))
  })

  it('returns the stored correction and its author for the selected jury', async () => {
    const changedAt = new Date('2026-10-02T12:00:00.000Z')
    dbMock.deliberation.findMany.mockResolvedValue([{
      id: 'delib-A', departmentId: 'department-A', academicYearId: 'year-A', type: 'ANNUEL',
      date: changedAt, name: 'Jury GI', status: 'EN_COURS', isLocked: false, juryMembers: null,
    }])
    dbMock.deliberationDecision.findMany.mockResolvedValue([{
      id: 'decision-A', studentId: 'student-A', decision: 'ADMI', average: 14, creditsAcquired: 6,
      isModified: true, modificationReason: 'Dossier examiné par le jury', updatedAt: changedAt,
    }])
    dbMock.student.findMany.mockResolvedValue([{ id: 'student-A', firstName: 'Awa', lastName: 'Test', matricule: 'A-001' }])
    dbMock.auditLog.findMany.mockResolvedValue([{
      entityId: 'decision-A', createdAt: changedAt, user: { firstName: 'Salvador', lastName: 'Ndouwe' },
    }])
    const response = await GET(request('GET', '?id=delib-A&departmentId=department-A'))
    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.students[0]).toMatchObject({
      decision: 'ADMI', isModified: true, modificationReason: 'Dossier examiné par le jury', modifiedBy: 'Salvador Ndouwe',
    })
    expect(dbMock.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ tenantId: 'tenant-A', entityId: { in: ['decision-A'] } }),
    }))
  })

  it('blocks finalization if registered students no longer match jury decisions', async () => {
    dbMock.deliberation.findFirst.mockResolvedValue({
      id: 'delib-A', tenantId: 'tenant-A', departmentId: 'department-A', academicYearId: 'year-A', type: 'ANNUEL',
    })
    dbMock.deliberationDecision.findMany.mockResolvedValue([{ studentId: 'student-B', decision: 'ADMI' }])
    const response = await PUT(request('PUT', '?id=delib-A', { juryMembers: [{ name: 'Président Test', role: 'President' }] }))
    expect(response.status).toBe(409)
    expect(dbMock.deliberation.updateMany).not.toHaveBeenCalled()
  })

  it('persists the named jury exactly once when finalizing the department', async () => {
    dbMock.deliberation.findFirst.mockResolvedValue({
      id: 'delib-A', tenantId: 'tenant-A', departmentId: 'department-A', academicYearId: 'year-A', type: 'ANNUEL', isLocked: false,
    })
    dbMock.deliberationDecision.findMany.mockResolvedValue([{ studentId: 'student-A', decision: 'ADMI' }])
    dbMock.deliberation.updateMany.mockResolvedValue({ count: 1 })
    const response = await PUT(request('PUT', '?id=delib-A', { juryMembers: [{ name: '  Présidente Test  ', role: 'President' }] }))
    expect(response.status).toBe(200)
    expect(dbMock.deliberation.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'delib-A', tenantId: 'tenant-A', isLocked: false },
      data: expect.objectContaining({ lockedBy: 'head-A', juryMembers: [{ name: 'Présidente Test', role: 'President' }] }),
    }))
  })

  it('records a reasoned correction and its author in the same transaction', async () => {
    const updatedAt = new Date('2026-10-02T10:00:00.000Z')
    dbMock.deliberation.updateMany.mockResolvedValue({ count: 1 })
    dbMock.deliberationDecision.findFirst.mockResolvedValue({
      id: 'decision-A', studentId: 'student-A', decision: 'AJOURNE', updatedAt,
    })
    dbMock.deliberationDecision.update.mockResolvedValue({ id: 'decision-A', decision: 'ADMI', isModified: true })
    const response = await PATCH(request('PATCH', '?id=delib-A&decisionId=decision-A', {
      decision: 'ADMI', reason: 'Décision motivée du jury après examen du dossier', expectedUpdatedAt: updatedAt.toISOString(),
    }))
    expect(response.status).toBe(200)
    expect(dbMock.deliberation.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ tenantId: 'tenant-A', departmentId: { in: ['department-A'] }, isLocked: false }),
    }))
    expect(dbMock.deliberationDecision.update).toHaveBeenCalledWith({
      where: { id: 'decision-A' },
      data: { decision: 'ADMI', isModified: true, modificationReason: 'Décision motivée du jury après examen du dossier' },
    })
    expect(dbMock.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      tenantId: 'tenant-A', userId: 'head-A', action: 'JURY_DECISION_CHANGED', entityId: 'decision-A',
    }) }))
  })

  it('rejects an empty reason or unsupported decision without writing', async () => {
    const response = await PATCH(request('PATCH', '?id=delib-A&decisionId=decision-A', {
      decision: 'UNKNOWN', reason: 'court', expectedUpdatedAt: new Date().toISOString(),
    }))
    expect(response.status).toBe(400)
    expect(dbMock.$transaction).not.toHaveBeenCalled()
  })

  it('does not grant a teacher jury-correction rights', async () => {
    authMock.mockResolvedValueOnce({ user: { id: 'teacher-A', role: 'ENSEIGNANT', tenantId: 'tenant-A' } })
    const response = await PATCH(request('PATCH', '?id=delib-A&decisionId=decision-A', {
      decision: 'ADMI', reason: 'Décision motivée par le jury', expectedUpdatedAt: new Date().toISOString(),
    }))
    expect(response.status).toBe(403)
    expect(dbMock.$transaction).not.toHaveBeenCalled()
  })

  it('rejects corrections after finalization or outside the department', async () => {
    dbMock.deliberation.updateMany.mockResolvedValue({ count: 0 })
    const response = await PATCH(request('PATCH', '?id=delib-B&decisionId=decision-B', {
      decision: 'ADMI', reason: 'Décision motivée par le jury', expectedUpdatedAt: new Date().toISOString(),
    }))
    expect(response.status).toBe(409)
    expect(dbMock.deliberationDecision.update).not.toHaveBeenCalled()
    expect(dbMock.auditLog.create).not.toHaveBeenCalled()
  })

  it('rejects a stale correction and does not overwrite newer jury work', async () => {
    dbMock.deliberation.updateMany.mockResolvedValue({ count: 1 })
    dbMock.deliberationDecision.findFirst.mockResolvedValue({
      id: 'decision-A', studentId: 'student-A', decision: 'AJOURNE', updatedAt: new Date('2026-10-02T12:00:00.000Z'),
    })
    const response = await PATCH(request('PATCH', '?id=delib-A&decisionId=decision-A', {
      decision: 'ADMI', reason: 'Décision motivée par le jury', expectedUpdatedAt: '2026-10-02T10:00:00.000Z',
    }))
    expect(response.status).toBe(409)
    expect(dbMock.deliberationDecision.update).not.toHaveBeenCalled()
    expect(dbMock.auditLog.create).not.toHaveBeenCalled()
  })
})
