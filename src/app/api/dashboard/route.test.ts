import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  resolveOwnStudentId: vi.fn(),
  academicYearFindFirst: vi.fn(),
  teacherFindFirst: vi.fn(),
  announcementFindMany: vi.fn(),
  courseElementFindMany: vi.fn(),
  serviceFindMany: vi.fn(),
  gradeCount: vi.fn(),
  gradeFindMany: vi.fn(),
  studentCount: vi.fn(),
  studentFindFirst: vi.fn(),
  tenantSettingsFindUnique: vi.fn(),
  paymentFindMany: vi.fn(),
  examSessionFindMany: vi.fn(),
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
  teachingService: { findMany: mocks.serviceFindMany },
  grade: { count: mocks.gradeCount, findMany: mocks.gradeFindMany },
  student: { count: mocks.studentCount, findFirst: mocks.studentFindFirst },
  tenantSettings: { findUnique: mocks.tenantSettingsFindUnique },
  payment: { findMany: mocks.paymentFindMany },
  examSession: { findMany: mocks.examSessionFindMany },
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
    mocks.serviceFindMany.mockResolvedValue([{ courseElementId: 'element-A' }])
    mocks.gradeCount.mockResolvedValueOnce(12).mockResolvedValueOnce(8)
    mocks.gradeFindMany.mockResolvedValue([])
    mocks.studentFindFirst.mockResolvedValue(null)
    mocks.tenantSettingsFindUnique.mockResolvedValue({ passingGrade: 10 })
    mocks.paymentFindMany.mockResolvedValue([])
    mocks.examSessionFindMany.mockResolvedValue([])
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
      id: { in: ['element-A'] },
    } }))
    expect(mocks.serviceFindMany).toHaveBeenCalledWith({ where: { tenantId: 'tenant-A',
      teacherId: 'teacher-A', academicYearId: 'year-A', status: 'APPROVED' }, select: { courseElementId: true } })
    expect(mocks.gradeCount).toHaveBeenCalledWith({ where: expect.objectContaining({ courseElementId: { in: ['element-A'] }, student: { tenantId: 'tenant-A' }, academicYearId: 'year-A' }) })
    expect(mocks.studentCount).not.toHaveBeenCalled()
  })

  it('does not leak institution totals to a teacher without an active profile', async () => {
    mocks.teacherFindFirst.mockResolvedValue(null)
    const response = await handler({ id: 'user-A', role: 'ENSEIGNANT', tenantId: 'tenant-A' }, 'tenant-A', request())
    expect(await response.json()).toMatchObject({ isTeacherView: true, linked: false, assignments: [] })
    expect(mocks.courseElementFindMany).not.toHaveBeenCalled()
    expect(mocks.serviceFindMany).not.toHaveBeenCalled()
    expect(mocks.studentCount).not.toHaveBeenCalled()
  })

  it('shows no course when the teacher has no approved annual service', async () => {
    mocks.serviceFindMany.mockResolvedValue([])
    mocks.courseElementFindMany.mockResolvedValue([])
    const response = await handler({ id: 'user-A', role: 'ENSEIGNANT', tenantId: 'tenant-A' }, 'tenant-A', request())
    expect(await response.json()).toMatchObject({ stats: { assignedCourses: 0, enteredGrades: 0, lockedGrades: 0 }, assignments: [] })
    expect(mocks.courseElementFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: { in: [] } }) }))
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

  it('allows an institution admin to preview only a student in their tenant', async () => {
    mocks.studentFindFirst.mockResolvedValue({
      id: 'student-A', firstName: 'Awa', lastName: 'Test', matricule: 'A-001', status: 'INSCRIT',
      currentProgram: { name: 'Informatique' }, currentLevel: { name: 'Licence 1' },
    })
    mocks.academicYearFindFirst.mockResolvedValue({ id: 'year-A', name: '2026-2027', startDate: new Date(), endDate: new Date(), sessions: [] })
    const response = await handler({ id: 'admin-A', role: 'ADMIN_INSTITUTION', tenantId: 'tenant-A' }, 'tenant-A', request('?studentId=student-A'))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ isStudentView: true, student: { matricule: 'A-001' }, stats: { moyenneGenerale: null, totalPaid: 0 } })
    expect(mocks.studentFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'student-A', tenantId: 'tenant-A' } }))
    expect(mocks.paymentFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: 'tenant-A', studentId: 'student-A' } }))
    expect(mocks.studentCount).not.toHaveBeenCalled()
  })

  it('rejects a student preview from another institution', async () => {
    const response = await handler({ id: 'admin-A', role: 'ADMIN_INSTITUTION', tenantId: 'tenant-A' }, 'tenant-A', request('?studentId=student-B'))
    expect(response.status).toBe(404)
    expect(mocks.studentFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'student-B', tenantId: 'tenant-A' } }))
    expect(mocks.paymentFindMany).not.toHaveBeenCalled()
  })

  it('rejects a student preview for staff and students', async () => {
    for (const role of ['ENSEIGNANT', 'SCOLARITE', 'ETUDIANT']) {
      const response = await handler({ id: 'user-A', role, tenantId: 'tenant-A' }, 'tenant-A', request('?studentId=student-A'))
      expect(response.status).toBe(403)
    }
    expect(mocks.studentFindFirst).not.toHaveBeenCalled()
  })
})
