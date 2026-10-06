import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), year: vi.fn(), teacher: vi.fn(), user: vi.fn(), services: vi.fn(),
  courses: vi.fn(), course: vi.fn(), registrations: vi.fn(), registration: vi.fn(),
  grades: vi.fn(), studentFindMany: vi.fn(), studentFindFirst: vi.fn(), administrativeRegistration: vi.fn(), gradeCreate: vi.fn(), gradeUpdate: vi.fn(), gradeFind: vi.fn(), gradeUpdateMany: vi.fn(),
  settings: vi.fn(), deliberation: vi.fn(), changeLog: vi.fn(), audit: vi.fn(),
  transaction: vi.fn(), advisory: vi.fn(),
  juryAssignments: vi.fn(),
}))
vi.mock('@/lib/auth/config', () => ({ auth: mocks.auth }))
vi.mock('@/lib/db', () => ({ db: {
  academicYear: { findFirst: mocks.year }, teacher: { findFirst: mocks.teacher }, user: { findFirst: mocks.user },
  juryAssignment: { findMany: mocks.juryAssignments },
  teachingService: { findMany: mocks.services }, courseElement: { findMany: mocks.courses, findFirst: mocks.course },
  pedagogicalRegistration: { findMany: mocks.registrations, findFirst: mocks.registration },
  administrativeRegistration: { findFirst: mocks.administrativeRegistration },
  student: { findMany: mocks.studentFindMany, findFirst: mocks.studentFindFirst },
  grade: { findMany: mocks.grades, create: mocks.gradeCreate, update: mocks.gradeUpdate,
    findFirst: mocks.gradeFind, updateMany: mocks.gradeUpdateMany },
  tenantSettings: { findUnique: mocks.settings }, deliberation: { findFirst: mocks.deliberation },
  gradeChangeLog: { create: mocks.changeLog }, auditLog: { create: mocks.audit },
  $transaction: mocks.transaction, $queryRaw: mocks.advisory,
} }))

const { GET, POST } = await import('./route')
const tenantId = 'ctenant0000000000000000a1'
const academicYearId = 'cacademicyear0000000000001'
const courseElementId = 'ccourseelement000000000001'
const studentId = 'cstudent00000000000000001'
const teacherId = 'cteacherrecord00000000001'
const departmentId = 'cdepartment000000000001'
const gradeId = 'cgrade00000000000000000001'
const teacher = { id: 'cteacher00000000000000001', role: 'ENSEIGNANT', tenantId }
const jury = { ...teacher, id: 'cjury00000000000000000001', role: 'JURY' }
const body = (component: string, value = 14, extra: Record<string, unknown> = {}) => ({
  academicYearId, courseElementId, studentId, session: 'NORMALE', component, value, ...extra,
})
const post = (payload: unknown) => POST(new NextRequest('http://localhost/api/grade-entry', {
  method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' },
}))
const get = (suffix = '') => GET(new NextRequest(`http://localhost/api/grade-entry${suffix}`))
const course = { teachingUnitId: 'cteachingunit0000000000001', hoursTP: 12, hoursStage: 0,
  teachingUnit: { semester: { levelId: 'clevel000000000000000001', level: { programId: 'cprogram000000000000000001', program: { departmentId } } } } }
const storedGrade = { id: gradeId, studentId, courseElementId, academicYearId, session: 'NORMALE',
  ccGrade: 12, tpGrade: null, examGrade: null, stageGrade: null,
  isAbsent: false, isDefaillant: false, isLocked: false, finalGrade: null }

beforeEach(() => {
  vi.resetAllMocks()
  mocks.auth.mockResolvedValue({ user: teacher })
  mocks.year.mockResolvedValue({ id: academicYearId, name: '2026-2027' })
  mocks.teacher.mockResolvedValue({ id: teacherId })
  mocks.user.mockResolvedValue({ departmentId })
  mocks.juryAssignments.mockResolvedValue([{ departmentId, programId: 'cprogram000000000000000001',
    levelId: 'clevel000000000000000001', program: { name: 'Informatique' }, level: { name: 'L1' } }])
  mocks.services.mockResolvedValue([{ courseElementId }])
  mocks.course.mockResolvedValue(course)
  mocks.courses.mockResolvedValue([{ id: courseElementId, code: 'EC1', name: 'Algorithmique', hoursTP: 12,
    teachingUnit: { id: course.teachingUnitId, name: 'Informatique', code: 'UE1',
      semester: { name: 'S1', level: { id: 'clevel000000000000000001', name: 'L1', program: { name: 'Informatique' } } } } }])
  mocks.registration.mockResolvedValue({ id: 'cregistration0000000000001' })
  mocks.administrativeRegistration.mockResolvedValue({ id: 'cregistration0000000000001' })
  mocks.studentFindMany.mockResolvedValue([{ id: studentId, firstName: 'Awa', lastName: 'Tahir', matricule: 'UPM-001' }])
  mocks.studentFindFirst.mockResolvedValue({ id: studentId })
  mocks.registrations.mockResolvedValue([{ student: { id: studentId, firstName: 'Awa', lastName: 'Tahir', matricule: 'UPM-001' } }])
  mocks.grades.mockResolvedValue([])
  mocks.gradeCreate.mockImplementation(async ({ data }) => ({ id: gradeId, ...data }))
  mocks.gradeUpdate.mockImplementation(async ({ data }) => ({ ...storedGrade, ...data }))
  mocks.gradeUpdateMany.mockResolvedValue({ count: 1 })
  mocks.settings.mockResolvedValue(null)
  mocks.deliberation.mockResolvedValue(null)
  mocks.transaction.mockImplementation(async (callback) => callback({
    $queryRaw: mocks.advisory, grade: { findMany: mocks.grades, create: mocks.gradeCreate, update: mocks.gradeUpdate },
    deliberation: { findFirst: mocks.deliberation }, gradeChangeLog: { create: mocks.changeLog },
    auditLog: { create: mocks.audit },
  }))
})

describe('scoped grade entry', () => {
  it('rejects institution administrators on both entry methods', async () => {
    mocks.auth.mockResolvedValue({ user: { ...teacher, role: 'ADMIN_INSTITUTION' } })
    expect((await get()).status).toBe(403)
    expect((await post(body('ccGrade'))).status).toBe(403)
    expect(mocks.gradeCreate).not.toHaveBeenCalled()
  })

  it('lists only approved annual teacher services and enrolled students', async () => {
    const response = await get(`?courseElementId=${courseElementId}`)
    expect(response.status).toBe(200)
    expect((await response.json()).data.students).toHaveLength(1)
    expect(mocks.services).toHaveBeenCalledWith({ where: { tenantId, academicYearId, teacherId, status: 'APPROVED' },
      select: { courseElementId: true } })
    expect(mocks.studentFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      OR: expect.arrayContaining([expect.objectContaining({ currentLevelId: 'clevel000000000000000001' })]),
    }) }))
  })

  it('refuses a teacher without the annual approved service', async () => {
    mocks.services.mockResolvedValue([])
    const response = await post(body('ccGrade'))
    expect(response.status).toBe(403)
    expect(mocks.course).not.toHaveBeenCalled()
  })

  it('refuses teacher exam grades and TP for a matter without TP', async () => {
    expect((await post(body('examGrade'))).status).toBe(403)
    mocks.course.mockResolvedValue({ ...course, hoursTP: 0 })
    expect((await post(body('tpGrade'))).status).toBe(409)
    expect(mocks.gradeCreate).not.toHaveBeenCalled()
  })

  it('saves the teacher first CC once and audits it', async () => {
    const response = await post(body('ccGrade'))
    expect(response.status).toBe(200)
    expect(mocks.gradeCreate).toHaveBeenCalledWith({ data: expect.objectContaining({
      studentId, courseElementId, academicYearId, ccGrade: 14, finalGrade: null,
    }) })
    expect(mocks.changeLog).toHaveBeenCalledWith({ data: expect.objectContaining({ field: 'ccGrade', oldValue: null, newValue: '14' }) })
    expect(mocks.audit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'CREATE_COMPONENT', entity: 'Grade' }) })
  })

  it('never lets a teacher rewrite an entered component', async () => {
    mocks.grades.mockResolvedValue([storedGrade])
    const response = await post(body('ccGrade', 16))
    expect(response.status).toBe(409)
    expect(mocks.gradeUpdate).not.toHaveBeenCalled()
  })

  it('accepts an identical retry without writing the note a second time', async () => {
    mocks.grades.mockResolvedValue([storedGrade])
    const response = await post(body('ccGrade', 12))
    expect(response.status).toBe(200)
    expect(mocks.gradeUpdate).not.toHaveBeenCalled()
    expect(mocks.changeLog).not.toHaveBeenCalled()
  })

  it('refuses any note for a student without active annual enrollment', async () => {
    mocks.studentFindFirst.mockResolvedValue(null)
    const response = await post(body('ccGrade'))
    expect(response.status).toBe(403)
    expect(mocks.gradeCreate).not.toHaveBeenCalled()
  })

  it('requires a scoped department for a jury account', async () => {
    mocks.auth.mockResolvedValue({ user: jury })
    mocks.juryAssignments.mockResolvedValue([])
    expect((await get()).status).toBe(403)
    expect((await post(body('examGrade'))).status).toBe(403)
  })

  it('does not let the jury first-enter teacher components', async () => {
    mocks.auth.mockResolvedValue({ user: jury })
    expect((await post(body('ccGrade'))).status).toBe(403)
    expect(mocks.gradeCreate).not.toHaveBeenCalled()
  })

  it('lets the department jury enter the exam and recalculates the final mark', async () => {
    mocks.auth.mockResolvedValue({ user: jury })
    mocks.grades.mockResolvedValue([storedGrade])
    const response = await post(body('examGrade', 16))
    expect(response.status).toBe(200)
    expect(mocks.gradeUpdate).toHaveBeenCalledWith({ where: { id: gradeId }, data: expect.objectContaining({
      examGrade: 16, finalGrade: 14.4, isLocked: false,
    }) })
  })

  it('does not require a TP grade for a matter without TP hours', async () => {
    mocks.auth.mockResolvedValue({ user: jury })
    mocks.course.mockResolvedValue({ ...course, hoursTP: 0 })
    mocks.settings.mockResolvedValue({ ccWeight: 0.3, examWeight: 0.5, tpWeight: 0.2, stageWeight: 0 })
    mocks.grades.mockResolvedValue([storedGrade])
    const response = await post(body('examGrade', 16))
    expect(response.status).toBe(200)
    expect(mocks.gradeUpdate).toHaveBeenCalledWith({ where: { id: gradeId }, data: expect.objectContaining({ finalGrade: 14.5 }) })
  })

  it('demands a reason for jury corrections and records the old value', async () => {
    mocks.auth.mockResolvedValue({ user: jury })
    mocks.grades.mockResolvedValue([storedGrade])
    expect((await post(body('ccGrade', 15))).status).toBe(400)
    const response = await post(body('ccGrade', 15, { reason: 'Erreur de report vérifiée' }))
    expect(response.status).toBe(200)
    expect(mocks.changeLog).toHaveBeenCalledWith({ data: expect.objectContaining({
      field: 'ccGrade', oldValue: '12', newValue: '15', reason: 'Erreur de report vérifiée',
    }) })
    expect(mocks.audit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'CORRECT_COMPONENT' }) })
  })

  it('blocks entries once the department PV is locked', async () => {
    mocks.deliberation.mockResolvedValue({ id: 'cpv000000000000000000001' })
    expect((await post(body('ccGrade'))).status).toBe(409)
    expect(mocks.gradeCreate).not.toHaveBeenCalled()
  })

  it('allows only the jury to publish a complete final mark', async () => {
    mocks.gradeFind.mockResolvedValue({ id: gradeId, finalGrade: 14.4, isLocked: false, academicYearId,
      ccGrade: 12, examGrade: 16, tpGrade: 14, courseElement: { hoursTP: 12 } })
    expect((await post({ action: 'LOCK', gradeId })).status).toBe(400)
    mocks.auth.mockResolvedValue({ user: jury })
    const response = await post({ action: 'LOCK', gradeId })
    expect(response.status).toBe(200)
    expect(mocks.gradeUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: gradeId, isLocked: false, finalGrade: { not: null } },
      data: { isLocked: true, lockedBy: jury.id, validatedBy: jury.id },
    }))
  })
})
