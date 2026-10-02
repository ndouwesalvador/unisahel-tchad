import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  resolveOwnStudentId: vi.fn(),
  academicYearFindFirst: vi.fn(),
  teacherFindFirst: vi.fn(),
  announcementFindMany: vi.fn(),
  courseElementFindMany: vi.fn(),
  gradeCount: vi.fn(),
  studentCount: vi.fn(),
}))

vi.mock('@/lib/auth/helpers', () => ({ withTenantAuth: (handler: unknown) => handler }))
vi.mock('@/lib/auth/student-scope', () => ({
  resolveOwnStudentId: mocks.resolveOwnStudentId,
  isStudentSelfRole: (role: string) => role === 'ETUDIANT' || role === 'ETUDIANT_SANTE',
}))
vi.mock('@/lib/db', () => ({ db: {
  academicYear: { findFirst: mocks.academicYearFindFirst },
  teacher: { findFirst: mocks.teacherFindFirst },
  announcement: { findMany: mocks.announcementFindMany },
  courseElement: { findMany: mocks.courseElementFindMany },
  grade: { count: mocks.gradeCount },
  student: { count: mocks.studentCount },
} }))

const { GET } = await import('./route')
const handler = GET as unknown as (user: { id: string; role: string; tenantId: string }, tenantId: string, request: NextRequest) => Promise<Response>
const request = (query = '') => new NextRequest(`http://localhost:3000/api/dashboard${query}`)

describe('GET /api/dashboard — role isolation', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.resolveOwnStudentId.mockResolvedValue(null)
    mocks.academicYearFindFirst.mockResolvedValue({ id: 'year-A', name: '2026-2027' })
    mocks.teacherFindFirst.mockResolvedValue({ id: 'teacher-A' })
    mocks.announcementFindMany.mockResolvedValue([])
    mocks.courseElementFindMany.mockResolvedValue([{
      id: 'element-A', code: 'INFO101', name: 'Programmation',
      teachingUnit: { name: 'Informatique', semester: { name: 'Semestre 1', level: { name: 'Licence 1', program: { name: 'Informatique' } } } },
    }])
    mocks.gradeCount.mockResolvedValueOnce(12).mockResolvedValueOnce(8)
  })

  it('shows a teacher only their assigned courses and grade counts scoped to tenant and year', async () => {
    const response = await handler({ id: 'user-A', role: 'ENSEIGNANT', tenantId: 'tenant-A' }, 'tenant-A', request())
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ isTeacherView: true, linked: true, stats: { assignedCourses: 1, enteredGrades: 12, lockedGrades: 8 } })
    expect(body.assignments).toHaveLength(1)
    expect(body.assignments[0].id).toBe('element-A')
    expect(mocks.teacherFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-A', tenantId: 'tenant-A', isActive: true } }))
    expect(mocks.courseElementFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: {
      teachingUnit: { semester: { level: { program: { tenantId: 'tenant-A' } } } },
      OR: [{ teacherId: 'teacher-A' }, { teachingUnit: { responsibleId: 'teacher-A' } }],
    } }))
    expect(mocks.gradeCount).toHaveBeenCalledWith({ where: expect.objectContaining({ courseElementId: { in: ['element-A'] }, student: { tenantId: 'tenant-A' }, academicYearId: 'year-A' }) })
    expect(mocks.studentCount).not.toHaveBeenCalled()
  })

  it('does not leak institution totals to a teacher without an active profile', async () => {
    mocks.teacherFindFirst.mockResolvedValue(null)
    const response = await handler({ id: 'user-A', role: 'ENSEIGNANT', tenantId: 'tenant-A' }, 'tenant-A', request())
    expect(await response.json()).toMatchObject({ isTeacherView: true, linked: false, assignments: [] })
    expect(mocks.courseElementFindMany).not.toHaveBeenCalled()
    expect(mocks.studentCount).not.toHaveBeenCalled()
  })

  it.each(['RECTORAT', 'SCOLARITE', 'FACULTE', 'DEPARTEMENT', 'RESPONSABLE_FILIERE', 'JURY', 'CAISSE', 'MAITRE_STAGE', 'PARENT'])(
    'returns a limited dashboard to %s without institution aggregates', async (role) => {
      const response = await handler({ id: 'user-A', role, tenantId: 'tenant-A' }, 'tenant-A', request())
      const body = await response.json()
      expect(response.status).toBe(200)
      expect(body).toMatchObject({ isRoleView: true, role, academicYear: { id: 'year-A' } })
      expect(body.statsCards).toBeUndefined()
      expect(mocks.studentCount).not.toHaveBeenCalled()
      expect(mocks.gradeCount).not.toHaveBeenCalled()
      expect(mocks.announcementFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: 'tenant-A', isPublished: true } }))
    },
  )

  it('refuses a student without a linked profile rather than exposing admin totals', async () => {
    const response = await handler({ id: 'user-A', role: 'ETUDIANT', tenantId: 'tenant-A' }, 'tenant-A', request())
    expect(response.status).toBe(403)
    expect(mocks.studentCount).not.toHaveBeenCalled()
  })

  it('also refuses an unlinked health student rather than exposing admin totals', async () => {
    const response = await handler({ id: 'user-A', role: 'ETUDIANT_SANTE', tenantId: 'tenant-A' }, 'tenant-A', request())
    expect(response.status).toBe(403)
    expect(mocks.studentCount).not.toHaveBeenCalled()
  })

  it('rejects an academic year outside the current tenant', async () => {
    mocks.academicYearFindFirst.mockResolvedValue(null)
    const response = await handler({ id: 'user-A', role: 'ENSEIGNANT', tenantId: 'tenant-A' }, 'tenant-A', request('?academicYearId=year-B'))
    expect(response.status).toBe(404)
    expect(mocks.teacherFindFirst).not.toHaveBeenCalled()
  })
})
