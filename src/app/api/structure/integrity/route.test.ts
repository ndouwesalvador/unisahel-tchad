import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { authMock, dbMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  dbMock: {
    academicYear: { findFirst: vi.fn() },
    program: { findMany: vi.fn() },
    student: { findMany: vi.fn() },
    user: { count: vi.fn() },
    administrativeRegistration: { count: vi.fn(), findMany: vi.fn() },
    pedagogicalRegistration: { count: vi.fn(), findMany: vi.fn(), createMany: vi.fn(), updateMany: vi.fn() },
    grade: { count: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
    gradeImportItem: { deleteMany: vi.fn() },
    teachingService: { count: vi.fn() },
    timetableSlot: { count: vi.fn() },
    scheduledExam: { count: vi.fn() },
    officialDocument: { count: vi.fn() },
    deliberation: { count: vi.fn() },
    admission: { count: vi.fn() },
    juryAssignment: { count: vi.fn() },
    feeStructure: { count: vi.fn() },
    teachingUnit: { findMany: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/auth/config', () => ({ auth: authMock }))
vi.mock('@/lib/db', () => ({ db: dbMock }))

const { GET, POST } = await import('./route')
const tenantId = 'ctenant0000000000000000a1'

beforeEach(() => {
  vi.clearAllMocks()
  authMock.mockResolvedValue({ user: { id: 'admin', role: 'ADMIN_INSTITUTION', tenantId } })
  dbMock.academicYear.findFirst.mockResolvedValue({ id: 'year', name: '2026-2027' })
  dbMock.program.findMany.mockResolvedValue([])
  dbMock.grade.findMany.mockResolvedValue([])
  dbMock.grade.deleteMany.mockResolvedValue({ count: 0 })
  dbMock.gradeImportItem.deleteMany.mockResolvedValue({ count: 0 })
  dbMock.administrativeRegistration.findMany.mockResolvedValue([])
  dbMock.pedagogicalRegistration.findMany.mockResolvedValue([])
  dbMock.teachingUnit.findMany.mockResolvedValue([])
  dbMock.pedagogicalRegistration.createMany.mockResolvedValue({ count: 0 })
  dbMock.pedagogicalRegistration.updateMany.mockResolvedValue({ count: 0 })
  dbMock.auditLog.create.mockResolvedValue({ id: 'audit' })
  dbMock.$transaction.mockImplementation(async (callback: (tx: typeof dbMock) => unknown) => callback(dbMock))
})

describe('POST /api/structure/integrity', () => {
  it('repairs only current-year registrations backed by a valid annual enrollment', async () => {
    dbMock.academicYear.findFirst.mockResolvedValue({ id: 'year', name: '2026-2027' })
    dbMock.administrativeRegistration.findMany.mockResolvedValue([{ studentId: 'student-1', levelId: 'level-1' }])
    dbMock.teachingUnit.findMany.mockResolvedValue([
      { id: 'ue-required', type: 'FONDAMENTALE', semester: { levelId: 'level-1' } },
      { id: 'ue-option', type: 'OPTIONNELLE', semester: { levelId: 'level-1' } },
    ])
    dbMock.grade.findMany.mockResolvedValue([{
      studentId: 'student-1', teachingUnitId: 'ue-option', courseElement: null,
    }])
    dbMock.pedagogicalRegistration.findMany.mockResolvedValue([])
    dbMock.pedagogicalRegistration.createMany.mockResolvedValue({ count: 2 })

    const response = await POST(new NextRequest('http://localhost:3000/api/structure/integrity', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'repair-pedagogical-registrations', academicYearId: 'year' }),
    }))
    expect(response.status).toBe(200)
    expect(dbMock.pedagogicalRegistration.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([
        expect.objectContaining({ studentId: 'student-1', teachingUnitId: 'ue-required', status: 'ACTIVE' }),
        expect.objectContaining({ studentId: 'student-1', teachingUnitId: 'ue-option', status: 'ACTIVE' }),
      ]),
    }))
    expect(dbMock.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'REPAIR' }) })
  })

  it('removes only current-year grades without a validated annual enrollment', async () => {
    dbMock.academicYear.findFirst.mockResolvedValue({ id: 'year', name: '2026-2027' })
    dbMock.administrativeRegistration.findMany.mockResolvedValue([{ studentId: 'student-valid' }])
    dbMock.grade.findMany.mockResolvedValue([
      { id: 'grade-valid', studentId: 'student-valid', isLocked: true },
      { id: 'grade-orphan', studentId: 'student-orphan', isLocked: true },
    ])
    dbMock.gradeImportItem.deleteMany.mockResolvedValue({ count: 0 })
    dbMock.grade.deleteMany.mockResolvedValue({ count: 1 })

    const response = await POST(new NextRequest('http://localhost:3000/api/structure/integrity', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'remove-orphan-grades', academicYearId: 'year',
        confirmation: 'SUPPRIMER NOTES SANS INSCRIPTION',
      }),
    }))
    expect(response.status).toBe(200)
    expect(dbMock.grade.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['grade-orphan'] } } })
    expect(dbMock.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      action: 'REMOVE_ORPHAN_GRADES',
    }) })
  })
})

describe('GET /api/structure/integrity', () => {
  it('returns an empty, tenant-scoped integrity report', async () => {
    const response = await GET(new NextRequest('http://localhost:3000/api/structure/integrity'))
    expect(response.status).toBe(200)
    expect(dbMock.program.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenantId }) }))
    const body = await response.json()
    expect(body.data.demoData.counts.programs).toBe(0)
    expect(body.data.gradeIntegrity.scannedLockedGrades).toBe(0)
  })

  it('detects locked grades without valid annual and pedagogical registrations', async () => {
    dbMock.grade.findMany.mockResolvedValue([{
      id: 'grade-1', studentId: 'student-1', teachingUnitId: 'ue-1',
      student: { matricule: 'UPM-001' }, courseElement: null,
    }])
    dbMock.administrativeRegistration.findMany.mockResolvedValue([{
      studentId: 'student-1', levelId: 'level-1', status: 'PRE_INSCRIT',
    }])
    dbMock.teachingUnit.findMany.mockResolvedValue([{
      id: 'ue-1', semester: { levelId: 'level-1' },
    }])
    const response = await GET(new NextRequest('http://localhost:3000/api/structure/integrity'))
    const body = await response.json()
    expect(body.data.gradeIntegrity).toEqual(expect.objectContaining({
      missingAnnualRegistration: 1,
      missingPedagogicalRegistration: 1,
      curriculumMismatch: 0,
    }))
  })

  it('denies teachers access to the institutional audit', async () => {
    authMock.mockResolvedValue({ user: { id: 'teacher', role: 'ENSEIGNANT', tenantId } })
    const response = await GET(new NextRequest('http://localhost:3000/api/structure/integrity'))
    expect(response.status).toBe(403)
    expect(dbMock.program.findMany).not.toHaveBeenCalled()
  })
})
