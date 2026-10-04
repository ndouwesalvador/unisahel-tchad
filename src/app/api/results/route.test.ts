import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { dbMock, ownStudentMock } = vi.hoisted(() => ({
  ownStudentMock: vi.fn(),
  dbMock: {
    academicYear: { findFirst: vi.fn() },
    tenantSettings: { findUnique: vi.fn() },
    student: { findFirst: vi.fn() },
    administrativeRegistration: { findFirst: vi.fn() },
    program: { findFirst: vi.fn() },
    level: { findFirst: vi.fn() },
    grade: { findMany: vi.fn() },
    deliberationDecision: { findMany: vi.fn() },
    officialDocument: { findFirst: vi.fn() },
  },
}))

vi.mock('@/lib/db', () => ({ db: dbMock }))
vi.mock('@/lib/auth/helpers', () => ({ withTenantAuth: (handler: unknown) => handler }))
vi.mock('@/lib/auth/student-scope', () => ({
  isStudentSelfRole: (role: string) => role === 'ETUDIANT' || role === 'ETUDIANT_SANTE',
  resolveOwnStudentId: ownStudentMock,
}))

const { GET } = await import('./route')
const user = { id: 'user-A', role: 'ETUDIANT', tenantId: 'tenant-A' }
const request = new NextRequest('http://localhost:3000/api/results?academicYearId=year-A')
const handle = GET as unknown as (sessionUser: typeof user, tenantId: string, request: NextRequest) => Promise<Response>

beforeEach(() => {
  vi.clearAllMocks()
  ownStudentMock.mockResolvedValue('student-A')
  dbMock.tenantSettings.findUnique.mockResolvedValue({ passingGrade: 10, creditsPerYear: 60 })
  dbMock.academicYear.findFirst.mockResolvedValue({ id: 'year-A', name: '2026-2027' })
  dbMock.student.findFirst.mockResolvedValue({ id: 'student-A', firstName: 'Leila', lastName: 'Test', matricule: 'A-1' })
  dbMock.administrativeRegistration.findFirst.mockResolvedValue({ programId: 'program-A', levelId: 'level-A' })
  dbMock.program.findFirst.mockResolvedValue({ name: 'Programme de l’inscription', departmentId: 'department-A' })
  dbMock.level.findFirst.mockResolvedValue({ name: 'Année 1' })
  dbMock.grade.findMany.mockResolvedValue([{
    finalGrade: 15, teachingUnit: { id: 'unit-A', code: 'UE1', name: 'Mathématiques', credits: 10 },
    courseElement: { coefficient: 1 },
  }])
  dbMock.deliberationDecision.findMany.mockResolvedValue([{
    average: 14.5, creditsAcquired: 60, decision: 'ADMI',
    deliberation: { id: 'jury-A', date: new Date('2026-10-03') },
  }])
  dbMock.officialDocument.findFirst.mockResolvedValue(null)
})

describe('GET /api/results — étudiant', () => {
  it('does not expose institution-wide grades to unscoped teacher or local manager roles', async () => {
    for (const role of ['ENSEIGNANT', 'RESPONSABLE_FILIERE', 'JURY']) {
      const response = await handle({ ...user, role }, 'tenant-A', request)
      expect(response.status).toBe(403)
    }
    expect(dbMock.grade.findMany).not.toHaveBeenCalled()
  })

  it('refuses an account without a linked student', async () => {
    ownStudentMock.mockResolvedValue(null)
    const response = await handle(user, 'tenant-A', request)
    expect(response.status).toBe(403)
    expect(dbMock.grade.findMany).not.toHaveBeenCalled()
  })

  it('refuses another student id', async () => {
    const response = await handle(user, 'tenant-A', new NextRequest('http://localhost:3000/api/results?studentId=student-B'))
    expect(response.status).toBe(403)
  })

  it('shows only locked enrolled grades and waits for a signed PV before publishing the jury decision', async () => {
    const response = await handle(user, 'tenant-A', request)
    expect(response.status).toBe(200)
    const result = await response.json()
    expect(result.jury).toBeNull()
    expect(result.transcript).toMatchObject({ filiere: 'Programme de l’inscription', niveau: 'Année 1' })
    expect(dbMock.grade.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      studentId: 'student-A', isLocked: true,
      teachingUnit: { pedagogicalRegistrations: { some: { studentId: 'student-A', academicYearId: 'year-A', status: 'ACTIVE' } } },
    }) }))
    expect(dbMock.officialDocument.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      tenantId: 'tenant-A', type: 'PV_DELIBERATION', validatedAt: { not: null },
      content: { contains: '"deliberationId":"jury-A"' },
    }) }))
  })

  it('publishes only the own locked jury decision after its signed PV exists', async () => {
    dbMock.officialDocument.findFirst.mockResolvedValue({ id: 'pv-A' })
    const response = await handle(user, 'tenant-A', request)
    expect(response.status).toBe(200)
    expect((await response.json()).jury).toMatchObject({ average: 14.5, creditsAcquired: 60, decision: 'ADMI' })
    expect(dbMock.deliberationDecision.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {
      studentId: 'student-A', deliberation: {
        tenantId: 'tenant-A', academicYearId: 'year-A', departmentId: 'department-A',
        status: 'TERMINEE', isLocked: true,
      },
    } }))
  })
})
