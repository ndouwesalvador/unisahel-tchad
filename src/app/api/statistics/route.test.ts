import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    $queryRaw: vi.fn(),
    tenantSettings: { findUnique: vi.fn() },
    academicYear: { findMany: vi.fn() },
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
    dbMock.$queryRaw
      .mockResolvedValueOnce([
        { name: 'Génie électrique', gender: 'F', count: 7 },
        { name: 'Génie électrique', gender: 'M', count: 5 },
        { name: 'Informatique', gender: null, count: 3 },
      ])
      .mockResolvedValueOnce([
        { status: 'VALIDATED', total: 500_000 },
        { status: 'PENDING', total: 80_000 },
        { status: 'REFUNDED', total: 20_000 },
      ])
      .mockResolvedValueOnce([
        { range: '8-10', count: 3 },
        { range: '10-12', count: 5 },
        { range: '14-16', count: 2 },
      ])
      .mockResolvedValueOnce([
        { academicYearId: 'year-1', passing: 4, total: 5 },
        { academicYearId: 'year-2', passing: 6, total: 10 },
      ])
      .mockResolvedValueOnce([
        { program: 'Génie électrique', level: 'Master I', passing: 8, total: 10 },
      ])
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
    expect(dbMock.$queryRaw).toHaveBeenCalledTimes(5)
  })

  it.each(['ETUDIANT', 'ETUDIANT_SANTE'])('refuses institution statistics to %s', async (role) => {
    const response = await handler(
      { id: 'student-1', role, tenantId: 'tenant-1' },
      'tenant-1',
      new NextRequest('http://localhost:3000/api/statistics'),
    )
    expect(response.status).toBe(403)
    expect(dbMock.$queryRaw).not.toHaveBeenCalled()
  })
})
