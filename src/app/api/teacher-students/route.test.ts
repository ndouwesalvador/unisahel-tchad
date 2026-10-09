import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { authMock, dbMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  dbMock: {
    academicYear: { findFirst: vi.fn() },
    teacher: { findFirst: vi.fn() },
    teachingService: { findMany: vi.fn() },
    student: { findMany: vi.fn() },
  },
}))

vi.mock('@/lib/auth/config', () => ({ auth: authMock }))
vi.mock('@/lib/db', () => ({ db: dbMock }))

const { GET } = await import('./route')
const tenantId = 'ctenant0000000000000000a1'

beforeEach(() => {
  vi.clearAllMocks()
  authMock.mockResolvedValue({ user: { id: 'teacher-user', role: 'ENSEIGNANT', tenantId } })
  dbMock.academicYear.findFirst.mockResolvedValue({ id: 'year-1', name: '2026-2027' })
  dbMock.teacher.findFirst.mockResolvedValue({ id: 'teacher-1' })
  dbMock.teachingService.findMany.mockResolvedValue([{
    courseElement: {
      id: 'ec-1', name: 'Machines électriques', code: 'EC1',
      teachingUnit: {
        code: 'UE1', name: 'Énergie',
        semester: {
          name: 'Semestre 1',
          level: { id: 'level-1', name: 'Master I', program: { id: 'program-1', name: 'Génie électrique' } },
        },
      },
    },
  }])
  dbMock.student.findMany.mockResolvedValue([{
    id: 'student-1', matricule: 'UPM-001', firstName: 'Amina', lastName: 'ADOUM', middleName: null,
    email: null, phone: null, registrations: [{ programId: 'program-1', levelId: 'level-1' }],
  }])
})

describe('GET /api/teacher-students', () => {
  it('returns only students with a validated annual registration in the teacher scope', async () => {
    const response = await GET(new NextRequest('http://localhost/api/teacher-students'))
    expect(response.status).toBe(200)
    expect(dbMock.student.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        tenantId,
        registrations: { some: {
          tenantId, academicYearId: 'year-1', status: 'INSCRIT',
          OR: [{ programId: 'program-1', levelId: 'level-1' }],
        } },
      },
    }))
    const body = await response.json()
    expect(body.data.students).toEqual([expect.objectContaining({
      id: 'student-1', program: 'Génie électrique', level: 'Master I',
      programId: 'program-1', levelId: 'level-1',
    })])
  })
})
