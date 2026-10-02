import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { authMock, scopeMock, readinessMock, dbMock } = vi.hoisted(() => ({
  authMock: vi.fn(), scopeMock: vi.fn(), readinessMock: vi.fn(),
  dbMock: {
    academicYear: { findFirst: vi.fn() },
    department: { findMany: vi.fn() },
    deliberation: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
    deliberationDecision: { findMany: vi.fn() },
    grade: { findMany: vi.fn() },
    student: { findMany: vi.fn() },
    tenantSettings: { findUnique: vi.fn() },
  },
}))
vi.mock('@/lib/auth/config', () => ({ auth: authMock }))
vi.mock('@/lib/auth/organization-scope', () => ({ getOrganizationScope: scopeMock }))
vi.mock('@/lib/deliberations/readiness', () => ({ computeGradeReadiness: readinessMock }))
vi.mock('@/lib/db', () => ({ db: dbMock }))

const { GET, POST, PUT } = await import('./route')
const url = 'http://localhost:3000/api/deliberation'
const request = (method: string, suffix = '', body?: unknown) => new NextRequest(`${url}${suffix}`, {
  method, ...(body ? { body: JSON.stringify(body) } : {}),
})

beforeEach(() => {
  vi.clearAllMocks()
  authMock.mockResolvedValue({ user: { id: 'head-A', role: 'DEPARTEMENT', tenantId: 'tenant-A' } })
  scopeMock.mockResolvedValue({ facultyId: 'faculty-A', departmentIds: ['department-A'] })
  dbMock.department.findMany.mockResolvedValue([{ id: 'department-A', name: 'Génie informatique', shortName: 'GI' }])
  dbMock.academicYear.findFirst.mockResolvedValue({ id: 'year-A', name: '2026-2027' })
  dbMock.deliberation.findMany.mockResolvedValue([])
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

  it('blocks finalization if registered students no longer match jury decisions', async () => {
    dbMock.deliberation.findFirst.mockResolvedValue({
      id: 'delib-A', tenantId: 'tenant-A', departmentId: 'department-A', academicYearId: 'year-A', type: 'ANNUEL',
    })
    dbMock.deliberationDecision.findMany.mockResolvedValue([{ studentId: 'student-B' }])
    const response = await PUT(request('PUT', '?id=delib-A', { juryMembers: [{ name: 'Président Test', role: 'President' }] }))
    expect(response.status).toBe(409)
    expect(dbMock.deliberation.updateMany).not.toHaveBeenCalled()
  })

  it('persists the named jury exactly once when finalizing the department', async () => {
    dbMock.deliberation.findFirst.mockResolvedValue({
      id: 'delib-A', tenantId: 'tenant-A', departmentId: 'department-A', academicYearId: 'year-A', type: 'ANNUEL', isLocked: false,
    })
    dbMock.deliberationDecision.findMany.mockResolvedValue([{ studentId: 'student-A' }])
    dbMock.deliberation.updateMany.mockResolvedValue({ count: 1 })
    const response = await PUT(request('PUT', '?id=delib-A', { juryMembers: [{ name: '  Présidente Test  ', role: 'President' }] }))
    expect(response.status).toBe(200)
    expect(dbMock.deliberation.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'delib-A', tenantId: 'tenant-A', isLocked: false },
      data: expect.objectContaining({ lockedBy: 'head-A', juryMembers: [{ name: 'Présidente Test', role: 'President' }] }),
    }))
  })
})
