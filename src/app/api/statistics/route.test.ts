import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    tenantSettings: { findUnique: vi.fn() },
    academicYear: { findMany: vi.fn() },
    student: { groupBy: vi.fn(), findMany: vi.fn() },
    payment: { groupBy: vi.fn() },
    grade: { groupBy: vi.fn() },
    program: { findMany: vi.fn() },
  },
}))

vi.mock('@/lib/db', () => ({ db: dbMock }))
vi.mock('@/lib/auth/helpers', () => ({ withTenantAuth: (handler: unknown) => handler }))
vi.mock('@/lib/auth/student-scope', () => ({
  isStudentSelfRole: (role: string) => role === 'ETUDIANT' || role === 'ETUDIANT_SANTE',
}))

const { GET } = await import('./route')
const handler = GET as unknown as (
  user: { id: string; role: string; tenantId: string },
  tenantId: string,
  request: NextRequest,
) => Promise<Response>

describe('GET /api/statistics', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    dbMock.tenantSettings.findUnique.mockResolvedValue({ passingGrade: 10 })
    dbMock.academicYear.findMany.mockResolvedValue([
      { id: 'year-1', name: '2025-2026' },
      { id: 'year-2', name: '2026-2027' },
    ])
    dbMock.student.groupBy.mockResolvedValue([
      { currentProgramId: 'program-ge', gender: 'F', _count: { _all: 7 } },
      { currentProgramId: 'program-ge', gender: 'M', _count: { _all: 5 } },
      { currentProgramId: 'program-info', gender: null, _count: { _all: 3 } },
    ])
    dbMock.payment.groupBy.mockResolvedValue([
      { status: 'VALIDATED', _sum: { amount: 500_000 } },
      { status: 'PENDING', _sum: { amount: 80_000 } },
      { status: 'REFUNDED', _sum: { amount: 20_000 } },
    ])
    dbMock.grade.groupBy
      .mockResolvedValueOnce([
        { academicYearId: 'year-1', finalGrade: 9, _count: { _all: 1 } },
        { academicYearId: 'year-1', finalGrade: 12, _count: { _all: 4 } },
        { academicYearId: 'year-2', finalGrade: 9, _count: { _all: 4 } },
        { academicYearId: 'year-2', finalGrade: 14, _count: { _all: 6 } },
      ])
      .mockResolvedValueOnce([
        { studentId: 'student-1', finalGrade: 9, _count: { _all: 2 } },
        { studentId: 'student-1', finalGrade: 14, _count: { _all: 8 } },
      ])
    dbMock.program.findMany.mockResolvedValue([
      { id: 'program-ge', name: 'Génie électrique' },
      { id: 'program-info', name: 'Informatique' },
    ])
    dbMock.student.findMany.mockResolvedValue([{ id: 'student-1', currentProgram: { name: 'Génie électrique' }, currentLevel: { name: 'Master I' } }])
  })

  it('returns bounded database aggregates without loading complete tables', async () => {
    const response = await handler(
      { id: 'admin-1', role: 'ADMIN_INSTITUTION', tenantId: 'tenant-1' },
      'tenant-1',
      new NextRequest('http://localhost:3000/api/statistics'),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.studentsByFaculty).toEqual([
      { name: 'Génie électrique', etudiants: 12, femmes: 7, hommes: 5 },
      { name: 'Informatique', etudiants: 3, femmes: 0, hommes: 0 },
    ])
    expect(body.paymentCollection).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Encaisse', value: 500_000 }),
      expect.objectContaining({ name: 'Remboursé/Annulé', value: 20_000 }),
    ]))
    expect(body.successRateByYear).toEqual([
      { year: '2025-2026', taux: 80 },
      { year: '2026-2027', taux: 60 },
    ])
    expect(body.successByProgram).toEqual([{ program: 'Génie électrique', 'Master I': 80 }])
    expect(body.totals).toEqual({ totalStudents: 15, totalFemmes: 7, globalSuccessRate: 66.67 })
    expect(dbMock.grade.groupBy).toHaveBeenCalledTimes(2)
    expect(dbMock.student.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: 'tenant-1' } }))
  })

  it.each(['ETUDIANT', 'ETUDIANT_SANTE'])('refuses institution statistics to %s', async (role) => {
    const response = await handler(
      { id: 'student-1', role, tenantId: 'tenant-1' },
      'tenant-1',
      new NextRequest('http://localhost:3000/api/statistics'),
    )
    expect(response.status).toBe(403)
    expect(dbMock.grade.groupBy).not.toHaveBeenCalled()
  })
})
