import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { authMock, dbMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  dbMock: {
    student: { findFirst: vi.fn() },
    courseElement: { findFirst: vi.fn() },
    grade: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
    tenantSettings: { findUnique: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}))

vi.mock('@/lib/auth/config', () => ({ auth: authMock }))
vi.mock('@/lib/db', () => ({ db: dbMock }))

const { POST } = await import('./route')

const sessionUser = {
  id: 'cteacher00000000000000001',
  email: 'prof@example.com',
  role: 'ENSEIGNANT',
  tenantId: 'ctenant0000000000000000a1',
  firstName: 'Prof',
  lastName: 'User',
}

// Fake but well-formed cuids (Zod's .cuid() only checks format, not existence)
const STUDENT_ID = 'cstudent00000000000000001'
const OTHER_STUDENT_ID = 'cstudent00000000000000002'
const TEACHING_UNIT_ID = 'cteachingunit0000000000001'
const COURSE_ELEMENT_ID = 'ccourseelement000000000001'
const ACADEMIC_YEAR_ID = 'cacademicyear0000000000001'

function req(url: string, body: unknown) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  authMock.mockResolvedValue({ user: sessionUser })
  dbMock.tenantSettings.findUnique.mockResolvedValue(null) // -> default weights 0.4/0.6
})

describe('POST /api/grades?action=bulk', () => {
  it('computes finalGrade with the default 40/60 CC/exam weighting and persists it', async () => {
    dbMock.student.findFirst.mockResolvedValue({ id: STUDENT_ID, tenantId: sessionUser.tenantId })
    dbMock.courseElement.findFirst.mockResolvedValue({ id: COURSE_ELEMENT_ID, teachingUnitId: TEACHING_UNIT_ID })
    dbMock.grade.findFirst.mockResolvedValue(null) // no existing grade -> create path
    dbMock.grade.create.mockResolvedValue({ id: 'cgrade00000000000000000001' })

    const res = await POST(req('/api/grades?action=bulk', {
      academicYearId: ACADEMIC_YEAR_ID,
      session: 'NORMALE',
      grades: [{
        studentId: STUDENT_ID,
        teachingUnitId: TEACHING_UNIT_ID,
        courseElementId: COURSE_ELEMENT_ID,
        academicYearId: ACADEMIC_YEAR_ID,
        session: 'NORMALE',
        ccGrade: 14,
        examGrade: 15,
      }],
    }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toEqual({ created: 1, updated: 0, errors: [] })
    expect(dbMock.grade.create).toHaveBeenCalledTimes(1)
    const createArgs = dbMock.grade.create.mock.calls[0][0]
    expect(createArgs.data.finalGrade).toBeCloseTo(14 * 0.4 + 15 * 0.6, 5)
  })

  it("records a per-row error and does not throw when a student doesn't belong to the tenant", async () => {
    dbMock.student.findFirst.mockResolvedValue(null)

    const res = await POST(req('/api/grades?action=bulk', {
      academicYearId: ACADEMIC_YEAR_ID,
      session: 'NORMALE',
      grades: [{
        studentId: OTHER_STUDENT_ID,
        teachingUnitId: TEACHING_UNIT_ID,
        courseElementId: COURSE_ELEMENT_ID,
        academicYearId: ACADEMIC_YEAR_ID,
        session: 'NORMALE',
        ccGrade: 10,
        examGrade: 10,
      }],
    }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.created).toBe(0)
    expect(body.data.errors).toHaveLength(1)
    expect(body.data.errors[0]).toMatchObject({ studentId: OTHER_STUDENT_ID, error: 'Student not found' })
    expect(dbMock.grade.create).not.toHaveBeenCalled()
  })

  it('rejects a request from a role not allowed to enter grades', async () => {
    authMock.mockResolvedValue({ user: { ...sessionUser, role: 'ETUDIANT' } })
    const res = await POST(req('/api/grades?action=bulk', {
      academicYearId: ACADEMIC_YEAR_ID,
      session: 'NORMALE',
      grades: [],
    }))
    expect(res.status).toBe(403)
  })
})
