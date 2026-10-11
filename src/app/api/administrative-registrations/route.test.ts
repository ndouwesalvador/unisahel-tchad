import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  student: vi.fn(), year: vi.fn(), program: vi.fn(), level: vi.fn(), existing: vi.fn(),
  create: vi.fn(), units: vi.fn(), pedagogicalCreateMany: vi.fn(), audit: vi.fn(), transaction: vi.fn(),
  curriculumVersion: vi.fn(),
}))
vi.mock('@/lib/auth/helpers', () => ({ withTenantAuth: (handler: unknown) => handler }))
vi.mock('@/lib/db', () => ({ db: { $transaction: mocks.transaction } }))

const { POST } = await import('./route')
const post = POST as unknown as (user: { id: string; role: string; tenantId: string }, tenantId: string, request: NextRequest) => Promise<Response>
const admin = { id: 'admin-A', role: 'ADMIN_INSTITUTION', tenantId: 'tenant-A' }
const studentId = 'cstudent00000000000000001'
const academicYearId = 'cyear00000000000000000001'
const request = () => new NextRequest('http://localhost/api/administrative-registrations', {
  method: 'POST', body: JSON.stringify({ studentId, academicYearId }),
})

beforeEach(() => {
  vi.resetAllMocks()
  mocks.student.mockResolvedValue({ id: studentId, status: 'INSCRIT', currentProgramId: 'program-A', currentLevelId: 'level-A' })
  mocks.year.mockResolvedValue({ id: academicYearId })
  mocks.program.mockResolvedValue({ id: 'program-A' })
  mocks.level.mockResolvedValue({ id: 'level-A' })
  mocks.existing.mockResolvedValue(null)
  mocks.create.mockResolvedValue({ id: 'registration-A', studentId, academicYearId, status: 'INSCRIT' })
  mocks.units.mockResolvedValue([{ id: 'ue-1' }, { id: 'ue-2' }])
  mocks.pedagogicalCreateMany.mockResolvedValue({ count: 2 })
  mocks.audit.mockResolvedValue({ id: 'audit-A' })
  mocks.curriculumVersion.mockResolvedValue({ id: 'curriculum-A', status: 'FROZEN', snapshot: {
    schemaVersion: 1, capturedAt: '2026-10-11T00:00:00.000Z',
    program: { id: 'program-A', code: 'INFO', name: 'Informatique' },
    level: { id: 'level-A', code: 'L1', name: 'Licence 1' },
    semesters: [{ id: 'semester-A', code: 'S1', name: 'Semestre 1', orderIndex: 1, units: [
      { id: 'ue-1', code: 'UE1', name: 'UE 1', credits: 6, type: 'FONDAMENTALE', compensable: true, orderIndex: 1, semesterId: 'semester-A', elements: [{ id: 'ec-1', code: 'EC1', name: 'EC 1', coefficient: 1, hoursCM: 20, hoursTD: 10, hoursTP: 0, hoursStage: 0, hoursPersonal: 0, orderIndex: 1 }] },
      { id: 'ue-2', code: 'UE2', name: 'UE 2', credits: 6, type: 'FONDAMENTALE', compensable: true, orderIndex: 2, semesterId: 'semester-A', elements: [{ id: 'ec-2', code: 'EC2', name: 'EC 2', coefficient: 1, hoursCM: 20, hoursTD: 10, hoursTP: 0, hoursStage: 0, hoursPersonal: 0, orderIndex: 1 }] },
    ] }],
  } })
  mocks.transaction.mockImplementation((callback: (tx: unknown) => Promise<unknown>) => callback({
    student: { findFirst: mocks.student }, academicYear: { findFirst: mocks.year },
    program: { findFirst: mocks.program }, level: { findFirst: mocks.level },
    administrativeRegistration: { findFirst: mocks.existing, create: mocks.create },
    curriculumVersion: { findFirst: mocks.curriculumVersion },
    teachingUnit: { findMany: mocks.units },
    pedagogicalRegistration: { createMany: mocks.pedagogicalCreateMany },
    auditLog: { create: mocks.audit },
  }))
})

describe('annual administrative enrollment', () => {
  it('validates a real enrolled student for the current year and audits the exact program', async () => {
    const response = await post(admin, 'tenant-A', request())
    expect(response.status).toBe(201)
    expect(mocks.student).toHaveBeenCalledWith({ where: { id: studentId, tenantId: 'tenant-A' }, select: expect.any(Object) })
    expect(mocks.year).toHaveBeenCalledWith({ where: { id: academicYearId, tenantId: 'tenant-A', isCurrent: true }, select: { id: true } })
    expect(mocks.create).toHaveBeenCalledWith({ data: { tenantId: 'tenant-A', studentId, academicYearId, programId: 'program-A', levelId: 'level-A', curriculumVersionId: 'curriculum-A', status: 'INSCRIT' } })
    expect(mocks.pedagogicalCreateMany).toHaveBeenCalledWith({
      data: [
        { studentId, teachingUnitId: 'ue-1', academicYearId, type: 'OBLIGATOIRE', status: 'ACTIVE' },
        { studentId, teachingUnitId: 'ue-2', academicYearId, type: 'OBLIGATOIRE', status: 'ACTIVE' },
      ],
      skipDuplicates: true,
    })
    expect(mocks.audit).toHaveBeenCalledWith({ data: expect.objectContaining({ entity: 'AdministrativeRegistration', action: 'CREATE' }) })
  })
  it('refuses a student not enrolled at institution level', async () => {
    mocks.student.mockResolvedValue({ id: studentId, status: 'PRE_INSCRIT', currentProgramId: 'program-A', currentLevelId: 'level-A' })
    const response = await post(admin, 'tenant-A', request())
    expect(response.status).toBe(409)
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it('refuses a past or foreign academic year', async () => {
    mocks.year.mockResolvedValue(null)
    const response = await post(admin, 'tenant-A', request())
    expect(response.status).toBe(409)
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it('refuses a level outside the student program', async () => {
    mocks.level.mockResolvedValue(null)
    const response = await post(admin, 'tenant-A', request())
    expect(response.status).toBe(409)
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it('never creates a second registration for the same student and year', async () => {
    mocks.existing.mockResolvedValue({ id: 'previous' })
    const response = await post(admin, 'tenant-A', request())
    expect(response.status).toBe(409)
    expect(mocks.create).not.toHaveBeenCalled()
  })
})
