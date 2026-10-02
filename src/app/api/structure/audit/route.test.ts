import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { authMock, dbMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  dbMock: {
    program: { findMany: vi.fn() },
    level: { findFirst: vi.fn(), delete: vi.fn() },
    semester: { count: vi.fn() },
    student: { count: vi.fn() },
    administrativeRegistration: { count: vi.fn() },
    admission: { count: vi.fn() },
    admissionCampaign: { count: vi.fn() },
    deliberation: { count: vi.fn() },
    feeStructure: { count: vi.fn() },
    timetableSlot: { count: vi.fn() },
    pedagogicalRegistration: { count: vi.fn() },
    grade: { count: vi.fn() },
    scheduledExam: { count: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/auth/config', () => ({ auth: authMock }))
vi.mock('@/lib/db', () => ({ db: dbMock }))

const { GET, DELETE } = await import('./route')
const tenantId = 'ctenant0000000000000000a1'

beforeEach(() => {
  vi.clearAllMocks()
  authMock.mockResolvedValue({ user: { id: 'cadmin000000000000000001', role: 'ADMIN_INSTITUTION', tenantId } })
  dbMock.program.findMany.mockResolvedValue([{ id: 'p1', name: 'Génie industriel', levels: [
    { id: 'l1', name: 'LICENCE 1', code: 'GIM1', isActive: false, semesters: [{ id: 's1', name: 'Semestre 1', teachingUnits: [{ id: 'u1', credits: 6, responsibleId: null, _count: { courseElements: 0 } }] }] },
    { id: 'l2', name: 'Licence 1', code: 'L1', isActive: true, semesters: [{ id: 's2', name: 'Semestre 1', teachingUnits: [{ id: 'u2', credits: 30, responsibleId: null, _count: { courseElements: 7 } }] }] },
  ] }])
  for (const delegate of [dbMock.semester, dbMock.student, dbMock.administrativeRegistration, dbMock.admission, dbMock.admissionCampaign, dbMock.deliberation, dbMock.feeStructure, dbMock.timetableSlot, dbMock.pedagogicalRegistration, dbMock.grade, dbMock.scheduledExam]) {
    delegate.count.mockResolvedValue(0)
  }
  dbMock.student.count.mockImplementation(async ({ where }: { where: { currentLevelId: string } }) => where.currentLevelId === 'l2' ? 1 : 0)
  dbMock.level.findFirst.mockImplementation(async ({ where }: { where: { id: string } }) => where.id === 'l1'
    ? { id: 'l1', programId: 'p1', name: 'LICENCE 1', isActive: false, semesters: [{ id: 's1', teachingUnits: [{ id: 'u1', responsibleId: null, courseElements: [] }] }] }
    : { id: 'l2', programId: 'p1', name: 'Licence 1' })
  dbMock.$transaction.mockImplementation(async (callback: (tx: typeof dbMock) => unknown) => callback(dbMock))
})

describe('GET /api/structure/audit', () => {
  it('returns tenant-scoped duplicate levels with their real references', async () => {
    const response = await GET(new NextRequest('http://localhost:3000/api/structure/audit'))
    expect(response.status).toBe(200)
    expect(dbMock.program.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId, isActive: true } }))
    const body = await response.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].levels).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'l1', teachingUnits: 1, courseElements: 0, canDeleteDraft: true, references: expect.objectContaining({ students: 0 }) }),
      expect.objectContaining({ id: 'l2', teachingUnits: 1, courseElements: 7, canDeleteDraft: false, references: expect.objectContaining({ students: 1 }) }),
    ]))
  })

  it('denies a teacher the institution audit', async () => {
    authMock.mockResolvedValue({ user: { id: 'cteacher0000000000000001', role: 'ENSEIGNANT', tenantId } })
    const response = await GET(new NextRequest('http://localhost:3000/api/structure/audit'))
    expect(response.status).toBe(403)
    expect(dbMock.program.findMany).not.toHaveBeenCalled()
  })
})

const deleteRequest = () => new NextRequest('http://localhost:3000/api/structure/audit', {
  method: 'DELETE', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ candidateLevelId: 'l1', keepLevelId: 'l2' }),
})

describe('DELETE /api/structure/audit', () => {
  it('deletes only a verified draft and records the action', async () => {
    const response = await DELETE(deleteRequest())
    expect(response.status).toBe(200)
    expect(dbMock.level.delete).toHaveBeenCalledWith({ where: { id: 'l1' } })
    expect(dbMock.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'DELETE_DRAFT', entityId: 'l1' }) }))
  })

  it('refuses a draft with a teacher assignment', async () => {
    dbMock.level.findFirst.mockImplementation(async ({ where }: { where: { id: string } }) => where.id === 'l1'
      ? { id: 'l1', programId: 'p1', name: 'LICENCE 1', semesters: [{ teachingUnits: [{ responsibleId: 't1', courseElements: [] }] }] }
      : { id: 'l2', programId: 'p1', name: 'Licence 1' })
    expect((await DELETE(deleteRequest())).status).toBe(409)
    expect(dbMock.level.delete).not.toHaveBeenCalled()
  })

  it('refuses a draft with academic references', async () => {
    dbMock.grade.count.mockResolvedValue(1)
    expect((await DELETE(deleteRequest())).status).toBe(409)
    expect(dbMock.level.delete).not.toHaveBeenCalled()
  })

  it('refuses a draft with a scheduled exam', async () => {
    dbMock.scheduledExam.count.mockResolvedValue(1)
    expect((await DELETE(deleteRequest())).status).toBe(409)
    expect(dbMock.level.delete).not.toHaveBeenCalled()
  })

  it('refuses a level with a matter', async () => {
    dbMock.level.findFirst.mockImplementation(async ({ where }: { where: { id: string } }) => where.id === 'l1'
      ? { id: 'l1', programId: 'p1', name: 'LICENCE 1', semesters: [{ teachingUnits: [{ responsibleId: null, courseElements: [{ id: 'ec1' }] }] }] }
      : { id: 'l2', programId: 'p1', name: 'Licence 1' })
    expect((await DELETE(deleteRequest())).status).toBe(409)
    expect(dbMock.level.delete).not.toHaveBeenCalled()
  })

  it('refuses a level from another program', async () => {
    dbMock.level.findFirst.mockImplementation(async ({ where }: { where: { id: string } }) => where.id === 'l1'
      ? { id: 'l1', programId: 'other', name: 'LICENCE 1', semesters: [] }
      : { id: 'l2', programId: 'p1', name: 'Licence 1' })
    expect((await DELETE(deleteRequest())).status).toBe(409)
    expect(dbMock.level.delete).not.toHaveBeenCalled()
  })

  it('denies teachers the archive action', async () => {
    authMock.mockResolvedValue({ user: { id: 'teacher', role: 'ENSEIGNANT', tenantId } })
    expect((await DELETE(deleteRequest())).status).toBe(403)
    expect(dbMock.$transaction).not.toHaveBeenCalled()
  })
})
