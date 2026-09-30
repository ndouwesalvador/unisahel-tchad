import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { authMock, dbMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  dbMock: {
    academicYear: { findFirst: vi.fn() },
    teacher: { findFirst: vi.fn() },
    teachingUnit: { findFirst: vi.fn() },
    student: { findFirst: vi.fn() },
    courseElement: { findFirst: vi.fn(), findMany: vi.fn() },
    pedagogicalRegistration: { findFirst: vi.fn(), findMany: vi.fn() },
    grade: { findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
    tenantSettings: { findUnique: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}))

vi.mock('@/lib/auth/config', () => ({ auth: authMock }))
vi.mock('@/lib/db', () => ({ db: dbMock }))

const { GET, POST, PUT } = await import('./route')

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
const TEACHER_ID = 'cteacherrecord00000000001'

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
  dbMock.academicYear.findFirst.mockResolvedValue({ id: ACADEMIC_YEAR_ID })
  dbMock.teacher.findFirst.mockResolvedValue({ id: TEACHER_ID })
  dbMock.pedagogicalRegistration.findFirst.mockResolvedValue({ id: 'cregistration0000000000001' })
  dbMock.grade.findMany.mockResolvedValue([])
  dbMock.grade.count.mockResolvedValue(0)
})

describe('POST /api/grades?action=bulk', () => {
  it('computes finalGrade with the default 40/60 CC/exam weighting and persists it', async () => {
    dbMock.student.findFirst.mockResolvedValue({ id: STUDENT_ID, tenantId: sessionUser.tenantId })
    dbMock.courseElement.findFirst.mockResolvedValue({ id: COURSE_ELEMENT_ID, teachingUnitId: TEACHING_UNIT_ID, teacherId: TEACHER_ID })
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
    expect(body.data).toEqual({ created: 1, updated: 0, lockedSkipped: 0, errors: [] })
    expect(dbMock.grade.create).toHaveBeenCalledTimes(1)
    const createArgs = dbMock.grade.create.mock.calls[0][0]
    expect(createArgs.data.finalGrade).toBeCloseTo(14 * 0.4 + 15 * 0.6, 5)
  })

  it('skips existing locked grades during bulk entry', async () => {
    dbMock.student.findFirst.mockResolvedValue({ id: STUDENT_ID, tenantId: sessionUser.tenantId })
    dbMock.courseElement.findFirst.mockResolvedValue({ id: COURSE_ELEMENT_ID, teachingUnitId: TEACHING_UNIT_ID, teacherId: TEACHER_ID })
    dbMock.grade.findFirst.mockResolvedValue({ id: 'cgrade00000000000000000001', isLocked: true })

    const res = await POST(req('/api/grades?action=bulk', {
      academicYearId: ACADEMIC_YEAR_ID,
      session: 'NORMALE',
      grades: [{
        studentId: STUDENT_ID,
        teachingUnitId: TEACHING_UNIT_ID,
        courseElementId: COURSE_ELEMENT_ID,
        academicYearId: ACADEMIC_YEAR_ID,
        session: 'NORMALE',
        ccGrade: 18,
        examGrade: 18,
      }],
    }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toEqual({ created: 0, updated: 0, lockedSkipped: 1, errors: [] })
    expect(dbMock.grade.update).not.toHaveBeenCalled()
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

  it('rejects an academic year belonging to another tenant before writing', async () => {
    dbMock.academicYear.findFirst.mockResolvedValue(null)
    const res = await POST(req('/api/grades?action=bulk', {
      academicYearId: ACADEMIC_YEAR_ID, grades: [],
    }))
    expect(res.status).toBe(404)
    expect(dbMock.academicYear.findFirst).toHaveBeenCalledWith({
      where: { id: ACADEMIC_YEAR_ID, tenantId: sessionUser.tenantId }, select: { id: true },
    })
    expect(dbMock.grade.create).not.toHaveBeenCalled()
  })

  it('does not let a teacher write grades for an unassigned course element', async () => {
    dbMock.student.findFirst.mockResolvedValue({ id: STUDENT_ID })
    dbMock.courseElement.findFirst.mockResolvedValue({ id: COURSE_ELEMENT_ID, teachingUnitId: TEACHING_UNIT_ID, teacherId: 'other-teacher' })
    dbMock.teachingUnit.findFirst.mockResolvedValue(null)
    const res = await POST(req('/api/grades?action=bulk', {
      academicYearId: ACADEMIC_YEAR_ID,
      grades: [{ studentId: STUDENT_ID, teachingUnitId: TEACHING_UNIT_ID, courseElementId: COURSE_ELEMENT_ID, academicYearId: ACADEMIC_YEAR_ID }],
    }))
    const body = await res.json()
    expect(body.data.created).toBe(0)
    expect(body.data.errors[0].error).toContain('non attribué')
    expect(dbMock.grade.create).not.toHaveBeenCalled()
  })

  it('does not let a teacher write a grade for a student not registered to the UE', async () => {
    dbMock.student.findFirst.mockResolvedValue({ id: STUDENT_ID, tenantId: sessionUser.tenantId })
    dbMock.courseElement.findFirst.mockResolvedValue({ id: COURSE_ELEMENT_ID, teachingUnitId: TEACHING_UNIT_ID, teacherId: TEACHER_ID })
    dbMock.pedagogicalRegistration.findFirst.mockResolvedValue(null)
    const res = await POST(req('/api/grades?action=bulk', {
      academicYearId: ACADEMIC_YEAR_ID,
      grades: [{ studentId: STUDENT_ID, teachingUnitId: TEACHING_UNIT_ID, courseElementId: COURSE_ELEMENT_ID, academicYearId: ACADEMIC_YEAR_ID }],
    }))
    expect(res.status).toBe(200)
    expect((await res.json()).data.errors[0].error).toContain('non inscrit pédagogiquement')
    expect(dbMock.grade.create).not.toHaveBeenCalled()
  })

  it('rejects a course element paired with a different teaching unit', async () => {
    dbMock.student.findFirst.mockResolvedValue({ id: STUDENT_ID })
    dbMock.courseElement.findFirst.mockResolvedValue({ id: COURSE_ELEMENT_ID, teachingUnitId: 'another-unit', teacherId: TEACHER_ID })
    const res = await POST(req('/api/grades?action=bulk', {
      academicYearId: ACADEMIC_YEAR_ID,
      grades: [{ studentId: STUDENT_ID, teachingUnitId: TEACHING_UNIT_ID, courseElementId: COURSE_ELEMENT_ID, academicYearId: ACADEMIC_YEAR_ID }],
    }))
    const body = await res.json()
    expect(body.data.created).toBe(0)
    expect(body.data.errors[0].error).toContain('does not belong')
    expect(dbMock.grade.create).not.toHaveBeenCalled()
  })

  it('does not allow a teacher to unlock a grade through the direct API', async () => {
    const res = await POST(req('/api/grades?action=lock&id=cgrade00000000000000000001&lock=false', {}))
    expect(res.status).toBe(403)
    expect(dbMock.grade.update).not.toHaveBeenCalled()
  })

  it('requires an administrator and a documented reason to unlock a grade', async () => {
    authMock.mockResolvedValue({ user: { ...sessionUser, role: 'ADMIN_INSTITUTION' } })
    const res = await POST(req('/api/grades?action=lock&id=cgrade00000000000000000001&lock=false', {}))
    expect(res.status).toBe(403)
    expect(dbMock.grade.update).not.toHaveBeenCalled()
  })

  it('does not allow a teacher to edit an unassigned existing grade', async () => {
    const gradeId = 'cgrade00000000000000000001'
    dbMock.grade.findFirst.mockResolvedValue({
      id: gradeId, studentId: STUDENT_ID, teachingUnitId: TEACHING_UNIT_ID,
      courseElementId: COURSE_ELEMENT_ID, academicYearId: ACADEMIC_YEAR_ID,
      session: 'NORMALE', isLocked: false, student: { tenantId: sessionUser.tenantId },
      teachingUnit: { responsibleId: 'other-teacher', semester: { level: { program: { tenantId: sessionUser.tenantId } } } },
      courseElement: { teacherId: 'other-teacher', teachingUnitId: TEACHING_UNIT_ID, teachingUnit: { semester: { level: { program: { tenantId: sessionUser.tenantId } } } } },
    })
    const request = new NextRequest('http://localhost:3000/api/grades', {
      method: 'PUT', body: JSON.stringify({ id: gradeId, ccGrade: 18 }),
    })

    const res = await PUT(request)
    expect(res.status).toBe(403)
    expect(dbMock.grade.update).not.toHaveBeenCalled()
  })

  it('does not let staff modify an already locked grade via PUT', async () => {
    const gradeId = 'cgrade00000000000000000001'
    authMock.mockResolvedValue({ user: { ...sessionUser, role: 'ADMIN_INSTITUTION' } })
    dbMock.grade.findFirst.mockResolvedValue({
      id: gradeId, studentId: STUDENT_ID, teachingUnitId: TEACHING_UNIT_ID,
      courseElementId: COURSE_ELEMENT_ID, academicYearId: ACADEMIC_YEAR_ID,
      session: 'NORMALE', isLocked: true, student: { tenantId: sessionUser.tenantId },
      teachingUnit: { semester: { level: { program: { tenantId: sessionUser.tenantId } } } },
      courseElement: { teachingUnitId: TEACHING_UNIT_ID, teachingUnit: { semester: { level: { program: { tenantId: sessionUser.tenantId } } } } },
    })
    const request = new NextRequest('http://localhost:3000/api/grades', {
      method: 'PUT', body: JSON.stringify({ id: gradeId, ccGrade: 19 }),
    })

    const res = await PUT(request)
    expect(res.status).toBe(403)
    expect(dbMock.grade.update).not.toHaveBeenCalled()
  })
})

describe('grade access beyond bulk entry', () => {
  it('returns only pedagogically registered students for an assigned matter', async () => {
    dbMock.courseElement.findFirst.mockResolvedValue({ teachingUnitId: TEACHING_UNIT_ID })
    dbMock.pedagogicalRegistration.findMany.mockResolvedValue([{ student: { id: STUDENT_ID, matricule: 'UPM-001', firstName: 'A', lastName: 'B' } }])
    const res = await GET(new NextRequest(`http://localhost:3000/api/grades?action=roster&courseElementId=${COURSE_ELEMENT_ID}&academicYearId=${ACADEMIC_YEAR_ID}`))
    expect(res.status).toBe(200)
    expect((await res.json()).data).toEqual([{ id: STUDENT_ID, matricule: 'UPM-001', firstName: 'A', lastName: 'B' }])
    expect(dbMock.courseElement.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: COURSE_ELEMENT_ID,
        teachingUnit: { semester: { level: { program: { tenantId: sessionUser.tenantId } } } },
        OR: [{ teacherId: TEACHER_ID }, { teachingUnit: { responsibleId: TEACHER_ID } }],
      }),
    }))
    expect(dbMock.pedagogicalRegistration.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { teachingUnitId: TEACHING_UNIT_ID, academicYearId: ACADEMIC_YEAR_ID, status: 'ACTIVE', student: { tenantId: sessionUser.tenantId } },
    }))
  })

  it('refuses the roster for an unassigned matter', async () => {
    dbMock.courseElement.findFirst.mockResolvedValue(null)
    const res = await GET(new NextRequest(`http://localhost:3000/api/grades?action=roster&courseElementId=${COURSE_ELEMENT_ID}&academicYearId=${ACADEMIC_YEAR_ID}`))
    expect(res.status).toBe(403)
    expect(dbMock.pedagogicalRegistration.findMany).not.toHaveBeenCalled()
  })

  it('lets administration access registered students without a teacher assignment', async () => {
    authMock.mockResolvedValue({ user: { ...sessionUser, role: 'ADMIN_INSTITUTION' } })
    dbMock.courseElement.findFirst.mockResolvedValue({ teachingUnitId: TEACHING_UNIT_ID })
    dbMock.pedagogicalRegistration.findMany.mockResolvedValue([])
    const res = await GET(new NextRequest(`http://localhost:3000/api/grades?action=roster&courseElementId=${COURSE_ELEMENT_ID}&academicYearId=${ACADEMIC_YEAR_ID}`))
    expect(res.status).toBe(200)
    expect(dbMock.courseElement.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: COURSE_ELEMENT_ID,
        teachingUnit: { semester: { level: { program: { tenantId: sessionUser.tenantId } } } },
      },
    }))
  })

  it('lists only the connected teacher’s assigned course elements in their tenant', async () => {
    dbMock.courseElement.findMany.mockResolvedValue([{ id: COURSE_ELEMENT_ID }])
    const res = await GET(new NextRequest('http://localhost:3000/api/grades?action=assignments'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ data: { courseElementIds: [COURSE_ELEMENT_ID] } })
    expect(dbMock.courseElement.findMany).toHaveBeenCalledWith({
      where: {
        teachingUnit: { semester: { level: { program: { tenantId: sessionUser.tenantId } } } },
        OR: [{ teacherId: TEACHER_ID }, { teachingUnit: { responsibleId: TEACHER_ID } }],
      },
      select: { id: true },
    })
  })

  it('does not expose assignments of another teacher when no linked profile exists', async () => {
    dbMock.teacher.findFirst.mockResolvedValue(null)
    const res = await GET(new NextRequest('http://localhost:3000/api/grades?action=assignments'))
    expect(res.status).toBe(403)
    expect(dbMock.courseElement.findMany).not.toHaveBeenCalled()
  })

  it('shows a linked student only their locked grades', async () => {
    authMock.mockResolvedValue({ user: { ...sessionUser, role: 'ETUDIANT' } })
    dbMock.student.findFirst.mockResolvedValue({ id: STUDENT_ID })
    const res = await GET(new NextRequest('http://localhost:3000/api/grades'))
    expect(res.status).toBe(200)
    expect(dbMock.grade.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ studentId: STUDENT_ID, student: { tenantId: sessionUser.tenantId }, isLocked: true }),
    }))
  })

  it('does not expose global completion data to a teacher', async () => {
    const res = await GET(new NextRequest('http://localhost:3000/api/grades?action=completion'))
    expect(res.status).toBe(403)
    expect(dbMock.grade.findMany).not.toHaveBeenCalled()
  })

  it('does not expose institution grades to another tenant role without grade privileges', async () => {
    authMock.mockResolvedValue({ user: { ...sessionUser, role: 'PARENT' } })
    const res = await GET(new NextRequest('http://localhost:3000/api/grades'))
    expect(res.status).toBe(403)
    expect(dbMock.grade.findMany).not.toHaveBeenCalled()
  })

  it('scopes a teacher grade list to their assigned elements or teaching units', async () => {
    const res = await GET(new NextRequest('http://localhost:3000/api/grades'))
    expect(res.status).toBe(200)
    expect(dbMock.grade.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        student: { tenantId: sessionUser.tenantId },
        OR: [
          { courseElement: { teacherId: TEACHER_ID, teachingUnit: { semester: { level: { program: { tenantId: sessionUser.tenantId } } } } } },
          { teachingUnit: { responsibleId: TEACHER_ID, semester: { level: { program: { tenantId: sessionUser.tenantId } } } } },
        ],
      }),
    }))
  })

  it('refuses a student account without a linked student record before listing grades', async () => {
    authMock.mockResolvedValue({ user: { ...sessionUser, role: 'ETUDIANT' } })
    dbMock.student.findFirst.mockResolvedValue(null)
    const res = await GET(new NextRequest('http://localhost:3000/api/grades'))
    expect(res.status).toBe(403)
  })

  it('refuses single-grade creation against a foreign academic year', async () => {
    dbMock.academicYear.findFirst.mockResolvedValue(null)
    const res = await POST(req('/api/grades', {
      studentId: STUDENT_ID, teachingUnitId: TEACHING_UNIT_ID,
      courseElementId: COURSE_ELEMENT_ID, academicYearId: ACADEMIC_YEAR_ID,
    }))
    expect(res.status).toBe(404)
    expect(dbMock.grade.create).not.toHaveBeenCalled()
  })

  it('refuses single-grade creation for an unassigned element', async () => {
    dbMock.student.findFirst.mockResolvedValue({ id: STUDENT_ID })
    dbMock.courseElement.findFirst.mockResolvedValue({
      id: COURSE_ELEMENT_ID, teachingUnitId: TEACHING_UNIT_ID,
      teacherId: 'other-teacher', teachingUnit: { responsibleId: 'other-teacher' },
    })
    const res = await POST(req('/api/grades', {
      studentId: STUDENT_ID, teachingUnitId: TEACHING_UNIT_ID,
      courseElementId: COURSE_ELEMENT_ID, academicYearId: ACADEMIC_YEAR_ID,
    }))
    expect(res.status).toBe(403)
    expect(dbMock.grade.create).not.toHaveBeenCalled()
  })
})
