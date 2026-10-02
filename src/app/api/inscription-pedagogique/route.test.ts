import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { authMock, dbMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  dbMock: {
    $transaction: vi.fn(),
    academicYear: { findFirst: vi.fn() },
    auditLog: { create: vi.fn() },
    grade: { count: vi.fn() },
    payment: { groupBy: vi.fn() },
    level: { findFirst: vi.fn() },
    pedagogicalRegistration: { deleteMany: vi.fn(), upsert: vi.fn(), findMany: vi.fn() },
    student: { findFirst: vi.fn(), findMany: vi.fn() },
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
  dbMock.student.findFirst.mockResolvedValue({ id: studentId, currentLevelId: levelId, currentProgramId: 'program-A' })
  dbMock.level.findFirst.mockResolvedValue({ id: levelId, programId: 'program-A' })
  dbMock.academicYear.findFirst.mockResolvedValue({ id: yearId, name: '2026-2027' })
  dbMock.teachingUnit.findMany.mockResolvedValue([
    { id: 'unit-required', type: 'FONDAMENTALE' },
    { id: 'unit-optional', type: 'COMPLEMENTAIRE' },
  ])
  dbMock.pedagogicalRegistration.findMany.mockResolvedValue([])
  dbMock.grade.count.mockResolvedValue(0)
  dbMock.payment.groupBy.mockResolvedValue([])
  dbMock.$transaction.mockImplementation(async (callback: (tx: typeof dbMock) => unknown) => callback(dbMock))
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
    expect(dbMock.pedagogicalRegistration.deleteMany).not.toHaveBeenCalled()
  })

  it('refuses a level owned by another institution', async () => {
    dbMock.level.findFirst.mockResolvedValue(null)
    const response = await POST(request('POST', { studentId, teachingUnitIds: ['unit-required'] }))

    expect(response.status).toBe(409)
    expect(dbMock.level.findFirst).toHaveBeenCalledWith({
      where: { id: levelId, isActive: true, program: { tenantId, isActive: true } }, select: { id: true, programId: true },
    })
    expect(dbMock.pedagogicalRegistration.deleteMany).not.toHaveBeenCalled()
  })

  it('refuses a foreign UE instead of silently dropping it', async () => {
    const response = await POST(request('POST', { studentId, teachingUnitIds: ['unit-required', 'foreign-unit'] }))

    expect(response.status).toBe(400)
    expect(dbMock.teachingUnit.findMany).toHaveBeenCalledWith({
      where: { semester: { level: { id: levelId, isActive: true, program: { tenantId, isActive: true } } } },
      select: { id: true, type: true },
    })
    expect(dbMock.pedagogicalRegistration.deleteMany).not.toHaveBeenCalled()
  })

  it('requires mandatory UE and saves valid selections with an audit record atomically', async () => {
    const missingRequired = await POST(request('POST', { studentId, teachingUnitIds: ['unit-optional'] }))
    expect(missingRequired.status).toBe(400)
    expect(dbMock.pedagogicalRegistration.upsert).not.toHaveBeenCalled()

    const valid = await POST(request('POST', { studentId, teachingUnitIds: ['unit-required', 'unit-optional'] }))
    expect(valid.status).toBe(200)
    expect(await valid.json()).toEqual({ ok: true, registeredCount: 2 })
    expect(dbMock.$transaction).toHaveBeenCalledTimes(2)
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
      where: { semester: { level: { id: levelId, isActive: true, program: { tenantId, isActive: true } } } },
    }))
  })

  it('does not remove registrations for an old level when syncing the current level', async () => {
    dbMock.pedagogicalRegistration.findMany.mockResolvedValue([
      { teachingUnitId: 'unit-required' },
    ])
    const response = await POST(request('POST', { studentId, teachingUnitIds: ['unit-required'] }))
    expect(response.status).toBe(200)
    expect(dbMock.pedagogicalRegistration.findMany).toHaveBeenCalledWith({
      where: { studentId, academicYearId: yearId, status: 'ACTIVE', teachingUnitId: { in: ['unit-required', 'unit-optional'] } },
      select: { teachingUnitId: true },
    })
    expect(dbMock.pedagogicalRegistration.deleteMany).not.toHaveBeenCalled()
  })

  it('refuses to withdraw an evaluated UE', async () => {
    dbMock.pedagogicalRegistration.findMany.mockResolvedValue([
      { teachingUnitId: 'unit-required' }, { teachingUnitId: 'unit-optional' },
    ])
    dbMock.grade.count.mockResolvedValue(1)
    const response = await POST(request('POST', { studentId, teachingUnitIds: ['unit-required'] }))
    expect(response.status).toBe(409)
    expect(dbMock.pedagogicalRegistration.deleteMany).not.toHaveBeenCalled()
    expect(dbMock.auditLog.create).not.toHaveBeenCalled()
  })

  it('deletes only a current-level optional UE without grades', async () => {
    dbMock.pedagogicalRegistration.findMany.mockResolvedValue([
      { teachingUnitId: 'unit-required' }, { teachingUnitId: 'unit-optional' },
    ])
    const response = await POST(request('POST', { studentId, teachingUnitIds: ['unit-required'] }))
    expect(response.status).toBe(200)
    expect(dbMock.pedagogicalRegistration.deleteMany).toHaveBeenCalledWith({
      where: { studentId, academicYearId: yearId, status: 'ACTIVE', teachingUnitId: { in: ['unit-optional'] } },
    })
  })

  it('counts only the student’s current-level UE in the registration status', async () => {
    dbMock.student.findMany.mockResolvedValue([{
      id: studentId, firstName: 'A', lastName: 'B', matricule: 'M1', currentLevelId: levelId,
      currentProgram: { name: 'Programme A' }, currentLevel: { name: 'Licence 1' },
    }])
    dbMock.teachingUnit.findMany.mockResolvedValue([
      { id: 'unit-required', semester: { levelId } },
      { id: 'unit-optional', semester: { levelId } },
    ])
    dbMock.pedagogicalRegistration.findMany.mockResolvedValue([
      { studentId, teachingUnitId: 'unit-required' },
      { studentId, teachingUnitId: 'old-level-unit' },
    ])
    const response = await GET(new NextRequest('http://localhost:3000/api/inscription-pedagogique'))
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.students[0]).toMatchObject({ ueInscrites: 1, totalUe: 2, statut: 'en-cours' })
  })
})
