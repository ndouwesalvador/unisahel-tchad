import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { authMock, dbMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  dbMock: {
    $transaction: vi.fn(),
    academicYear: { findFirst: vi.fn() },
    auditLog: { create: vi.fn() },
    level: { findFirst: vi.fn() },
    pedagogicalRegistration: { deleteMany: vi.fn(), upsert: vi.fn(), findMany: vi.fn() },
    student: { findFirst: vi.fn() },
    teachingUnit: { findMany: vi.fn() },
    tenantSettings: { findUnique: vi.fn() },
  },
}))

vi.mock('@/lib/auth/config', () => ({ auth: authMock }))
vi.mock('@/lib/db', () => ({ db: dbMock }))

const { GET, POST } = await import('./route')

const tenantId = 'tenant-A'
const studentId = 'student-A'
const levelId = 'level-A'
const yearId = 'year-A'

function request(method: 'GET' | 'POST', body?: unknown) {
  return new NextRequest(`http://localhost:3000/api/inscription-pedagogique${method === 'GET' ? `?studentId=${studentId}` : ''}`, {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  authMock.mockResolvedValue({ user: { id: 'admin-A', role: 'ADMIN_INSTITUTION', tenantId } })
  dbMock.tenantSettings.findUnique.mockResolvedValue({ pedagogicalRegistrationOpen: true })
  dbMock.student.findFirst.mockResolvedValue({ id: studentId, currentLevelId: levelId })
  dbMock.level.findFirst.mockResolvedValue({ id: levelId })
  dbMock.academicYear.findFirst.mockResolvedValue({ id: yearId, name: '2026-2027' })
  dbMock.teachingUnit.findMany.mockResolvedValue([
    { id: 'unit-required', type: 'FONDAMENTALE' },
    { id: 'unit-optional', type: 'COMPLEMENTAIRE' },
  ])
  dbMock.pedagogicalRegistration.findMany.mockResolvedValue([])
  dbMock.$transaction.mockResolvedValue([])
})

describe('pedagogical registration tenant isolation', () => {
  it('refuses a teacher before reading student records', async () => {
    authMock.mockResolvedValue({ user: { id: 'teacher-A', role: 'ENSEIGNANT', tenantId } })
    const response = await POST(request('POST', { studentId, teachingUnitIds: ['unit-required'] }))

    expect(response.status).toBe(403)
    expect(dbMock.student.findFirst).not.toHaveBeenCalled()
  })

  it('refuses registration when the student has no current level', async () => {
    dbMock.student.findFirst.mockResolvedValue({ id: studentId, currentLevelId: null })
    const response = await POST(request('POST', { studentId, teachingUnitIds: ['foreign-unit'] }))

    expect(response.status).toBe(409)
    expect(dbMock.teachingUnit.findMany).not.toHaveBeenCalled()
    expect(dbMock.$transaction).not.toHaveBeenCalled()
  })

  it('refuses a level owned by another institution', async () => {
    dbMock.level.findFirst.mockResolvedValue(null)
    const response = await POST(request('POST', { studentId, teachingUnitIds: ['unit-required'] }))

    expect(response.status).toBe(409)
    expect(dbMock.level.findFirst).toHaveBeenCalledWith({
      where: { id: levelId, program: { tenantId } }, select: { id: true },
    })
    expect(dbMock.$transaction).not.toHaveBeenCalled()
  })

  it('refuses a foreign UE instead of silently dropping it', async () => {
    const response = await POST(request('POST', { studentId, teachingUnitIds: ['unit-required', 'foreign-unit'] }))

    expect(response.status).toBe(400)
    expect(dbMock.teachingUnit.findMany).toHaveBeenCalledWith({
      where: { semester: { level: { id: levelId, program: { tenantId } } } },
      select: { id: true, type: true },
    })
    expect(dbMock.$transaction).not.toHaveBeenCalled()
  })

  it('requires mandatory UE and saves valid selections with an audit record atomically', async () => {
    const missingRequired = await POST(request('POST', { studentId, teachingUnitIds: ['unit-optional'] }))
    expect(missingRequired.status).toBe(400)
    expect(dbMock.$transaction).not.toHaveBeenCalled()

    const valid = await POST(request('POST', { studentId, teachingUnitIds: ['unit-required', 'unit-optional'] }))
    expect(valid.status).toBe(200)
    expect(await valid.json()).toEqual({ ok: true, registeredCount: 2 })
    expect(dbMock.$transaction).toHaveBeenCalledTimes(1)
    expect(dbMock.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ tenantId, userId: 'admin-A', entity: 'PedagogicalRegistration', entityId: studentId }),
    })
    const audit = dbMock.auditLog.create.mock.calls[0][0].data
    expect(JSON.parse(audit.details)).toEqual({ academicYearId: yearId, before: [], after: ['unit-required', 'unit-optional'] })
  })

  it('limits the UE picker to the signed-in institution', async () => {
    const response = await GET(request('GET'))

    expect(response.status).toBe(200)
    expect(dbMock.teachingUnit.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { semester: { level: { id: levelId, program: { tenantId } } } },
    }))
  })
})
