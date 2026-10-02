import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  teacherFindFirst: vi.fn(), academicYearFindFirst: vi.fn(), timetableFindMany: vi.fn(), roomFindMany: vi.fn(),
  userFindFirst: vi.fn(), userUpdate: vi.fn(), teacherUpdate: vi.fn(), transaction: vi.fn(), auditCreate: vi.fn(),
}))

vi.mock('@/lib/auth/helpers', () => ({ withTenantAuth: (handler: unknown) => handler }))
vi.mock('@/lib/db', () => ({ db: {
  teacher: { findFirst: mocks.teacherFindFirst },
  academicYear: { findFirst: mocks.academicYearFindFirst },
  timetableSlot: { findMany: mocks.timetableFindMany },
  room: { findMany: mocks.roomFindMany },
  user: { findFirst: mocks.userFindFirst },
  $transaction: mocks.transaction,
  auditLog: { create: mocks.auditCreate },
} }))

const { GET, PUT } = await import('./route')
const handler = GET as unknown as (user: { id: string; role: string; tenantId: string }, tenantId: string, request: NextRequest) => Promise<Response>
const updateHandler = PUT as unknown as (user: { id: string; role: string; tenantId: string }, tenantId: string, request: NextRequest) => Promise<Response>
const request = (query: string) => new NextRequest(`http://localhost:3000/api/teachers${query}`)
const admin = { id: 'admin-A', role: 'ADMIN_INSTITUTION', tenantId: 'tenant-A' }

describe('GET /api/teachers teacher profile', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.academicYearFindFirst.mockResolvedValue({ id: 'year-A', name: '2026-2027' })
    mocks.timetableFindMany.mockResolvedValue([])
    mocks.roomFindMany.mockResolvedValue([])
    mocks.userFindFirst.mockResolvedValue(null)
    mocks.auditCreate.mockResolvedValue({ id: 'audit-A' })
    mocks.transaction.mockImplementation((callback: (tx: unknown) => Promise<unknown>) => callback({
      user: { update: mocks.userUpdate }, teacher: { update: mocks.teacherUpdate },
    }))
  })

  it('returns the selected teacher and only their real assignments and timetable', async () => {
    mocks.teacherFindFirst.mockResolvedValue({
      id: 'teacher-A', userId: 'user-A', employeeId: 'ENS-A', grade: 'ASSISTANT',
      specialization: 'Électronique', maxHoursPerWeek: 20, currentHours: 4, isActive: true,
      user: { firstName: 'Awa', lastName: 'Test', email: 'awa@example.test', phone: null, photo: null },
      department: { id: 'department-A', name: 'Génie industriel' },
      assignedElements: [{
        id: 'element-A', code: 'EL101', name: 'Électronique', coefficient: 2, hoursCM: 24, hoursTD: 12, hoursTP: 0,
        teachingUnit: { id: 'unit-A', code: 'UE-A', name: 'Électronique générale', credits: 4,
          semester: { id: 'semester-A', name: 'Semestre 1', level: { name: 'Licence 1', program: { id: 'program-A', name: 'Génie industriel', code: 'GI' } } } },
      }],
      responsibleUnits: [],
    })
    mocks.timetableFindMany.mockResolvedValue([{ id: 'slot-A', dayOfWeek: 0, startTime: '08:00', endTime: '10:00', type: 'CM', courseElementId: 'element-A', roomId: 'room-A' }])
    mocks.roomFindMany.mockResolvedValue([{ id: 'room-A', name: 'Salle A' }])

    const response = await handler(admin, 'tenant-A', request('?id=teacher-A&schedule=true&academicYearId=year-A'))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ data: {
      teacher: { id: 'teacher-A', firstName: 'Awa', email: 'awa@example.test', linkedUser: true },
      assignedElements: [{ id: 'element-A', name: 'Électronique' }],
      academicYear: { id: 'year-A' }, timetable: [{ id: 'slot-A', course: { name: 'Électronique' }, room: 'Salle A' }],
    } })
    expect(mocks.teacherFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'teacher-A', tenantId: 'tenant-A' } }))
    expect(mocks.timetableFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: 'tenant-A', teacherId: 'teacher-A', academicYearId: 'year-A' } }))
    expect(mocks.roomFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: 'tenant-A', id: { in: ['room-A'] } } }))
  })

  it('does not reveal a teacher from another institution', async () => {
    mocks.teacherFindFirst.mockResolvedValue(null)
    const response = await handler(admin, 'tenant-A', request('?id=teacher-B&schedule=true'))
    expect(response.status).toBe(404)
    expect(mocks.teacherFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'teacher-B', tenantId: 'tenant-A' } }))
    expect(mocks.timetableFindMany).not.toHaveBeenCalled()
  })

  it('blocks non-admin roles from the private teacher profile', async () => {
    for (const role of ['ETUDIANT', 'ENSEIGNANT', 'SCOLARITE']) {
      const response = await handler({ id: 'user-A', role, tenantId: 'tenant-A' }, 'tenant-A', request('?id=teacher-A&schedule=true'))
      expect(response.status).toBe(403)
    }
    expect(mocks.teacherFindFirst).not.toHaveBeenCalled()
  })

  it('rejects an academic year outside the institution', async () => {
    mocks.teacherFindFirst.mockResolvedValue({ id: 'teacher-A', assignedElements: [], responsibleUnits: [] })
    mocks.academicYearFindFirst.mockResolvedValue(null)
    const response = await handler(admin, 'tenant-A', request('?id=teacher-A&schedule=true&academicYearId=year-B'))
    expect(response.status).toBe(404)
    expect(mocks.academicYearFindFirst).toHaveBeenCalledWith({ where: { id: 'year-B', tenantId: 'tenant-A' }, select: { id: true, name: true } })
    expect(mocks.timetableFindMany).not.toHaveBeenCalled()
  })

  it('returns empty real sections when no assignment or academic year exists', async () => {
    mocks.teacherFindFirst.mockResolvedValue({
      id: 'teacher-A', userId: null, employeeId: null, grade: null, specialization: null,
      maxHoursPerWeek: 20, currentHours: 0, isActive: true, user: null, department: null,
      assignedElements: [], responsibleUnits: [],
    })
    mocks.academicYearFindFirst.mockResolvedValue(null)
    const response = await handler(admin, 'tenant-A', request('?id=teacher-A&schedule=true'))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data).toMatchObject({ teacher: { linkedUser: false }, assignedElements: [], responsibleUnits: [], academicYear: null, timetable: [] })
    expect(body.data.publications).toBeUndefined()
    expect(mocks.timetableFindMany).not.toHaveBeenCalled()
  })

  it('saves the editable profile fields on the linked user and teacher', async () => {
    const teacherId = 'c1234567890'
    const departmentId = 'c9876543210'
    mocks.teacherFindFirst.mockResolvedValue({ id: teacherId, userId: 'user-A', departmentId, employeeId: 'ENS-A', user: { id: 'user-A' } })
    mocks.userUpdate.mockResolvedValue({ id: 'user-A' })
    mocks.teacherUpdate.mockResolvedValue({ id: teacherId, employeeId: 'ENS-A', user: { firstName: 'Awa', lastName: 'Test' } })
    const response = await updateHandler(admin, 'tenant-A', new NextRequest('http://localhost:3000/api/teachers', {
      method: 'PUT', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: teacherId, firstName: 'Awa', lastName: 'Test', email: 'awa@example.test', phone: '', grade: 'ASSISTANT', specialization: 'Électronique', departmentId, maxHoursPerWeek: 20, isActive: true }),
    }))
    expect(response.status).toBe(200)
    expect(mocks.teacherFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: teacherId, tenantId: 'tenant-A' } }))
    expect(mocks.userUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'user-A' }, data: expect.objectContaining({ firstName: 'Awa', email: 'awa@example.test' }) }))
    expect(mocks.teacherUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: teacherId }, data: expect.objectContaining({ grade: 'ASSISTANT', maxHoursPerWeek: 20 }) }))
    expect(mocks.auditCreate).toHaveBeenCalled()
  })
})
