import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  scope: vi.fn(), year: vi.fn(), program: vi.fn(), programs: vi.fn(), teacher: vi.fn(), room: vi.fn(), element: vi.fn(),
  slots: vi.fn(), findSlot: vi.fn(), create: vi.fn(), update: vi.fn(), deleteSlot: vi.fn(), audit: vi.fn(), transaction: vi.fn(), service: vi.fn(),
}))

vi.mock('@/lib/auth/helpers', () => ({ withTenantAuth: (handler: unknown) => handler }))
vi.mock('@/lib/auth/organization-scope', () => ({ getOrganizationScope: mocks.scope }))
vi.mock('@/lib/db', () => ({ db: {
  academicYear: { findFirst: mocks.year }, program: { findFirst: mocks.program, findMany: mocks.programs },
  teacher: { findFirst: mocks.teacher }, room: { findFirst: mocks.room },
  courseElement: { findFirst: mocks.element },
  teachingService: { findFirst: mocks.service },
  timetableSlot: { findMany: mocks.slots, findFirst: mocks.findSlot },
  $transaction: mocks.transaction,
} }))

const { POST, GET, PUT, DELETE } = await import('./route')
const post = POST as unknown as (user: { id: string; role: string; tenantId: string }, tenantId: string, request: NextRequest) => Promise<Response>
const get = GET as unknown as (user: { id: string; role: string; tenantId: string }, tenantId: string, request: NextRequest) => Promise<Response>
const put = PUT as unknown as typeof post
const deleteSlot = DELETE as unknown as typeof post
const manager = { id: 'head-A', role: 'DEPARTEMENT', tenantId: 'tenant-A' }
const body = {
  academicYearId: 'year-A', dayOfWeek: 0, startTime: '08:00', endTime: '10:00',
  programId: 'program-A', levelId: 'level-A', courseElementId: 'element-A', teacherId: 'teacher-B', roomId: 'room-A', type: 'CM',
}
const request = (data: unknown) => new NextRequest('http://localhost/api/timetable', { method: 'POST', body: JSON.stringify(data) })

beforeEach(() => {
  vi.resetAllMocks()
  mocks.scope.mockResolvedValue({ facultyId: 'faculty-A', departmentIds: ['department-A'] })
  mocks.year.mockResolvedValue({ id: 'year-A' })
  mocks.program.mockResolvedValue({ id: 'program-A', departmentId: 'department-A' })
  mocks.programs.mockResolvedValue([{ id: 'program-A' }])
  mocks.teacher.mockResolvedValue({ id: 'teacher-B' })
  mocks.room.mockResolvedValue({ id: 'room-A' })
  mocks.element.mockResolvedValue({ teacherId: 'teacher-B', teachingUnit: { responsibleId: null, semester: { level: { id: 'level-A', programId: 'program-A' } } } })
  mocks.service.mockResolvedValue({ id: 'service-A' })
  mocks.slots.mockResolvedValue([])
  mocks.create.mockResolvedValue({ id: 'slot-A' })
  mocks.update.mockResolvedValue({ id: 'slot-A' })
  mocks.deleteSlot.mockResolvedValue({ id: 'slot-A' })
  mocks.audit.mockResolvedValue({ id: 'audit-A' })
  mocks.transaction.mockImplementation((callback: (tx: unknown) => Promise<unknown>) => callback({
    timetableSlot: { findMany: mocks.slots, create: mocks.create, update: mocks.update, delete: mocks.deleteSlot },
    auditLog: { create: mocks.audit },
  }))
})

describe('department timetable', () => {
  it('allows a teacher from another department with approved annual service', async () => {
    const response = await post(manager, 'tenant-A', request(body))
    expect(response.status).toBe(201)
    expect(mocks.service).toHaveBeenCalledWith({ where: expect.objectContaining({ academicYearId: 'year-A', teacherId: 'teacher-B', status: 'APPROVED' }), select: { id: true } })
    expect(mocks.create).toHaveBeenCalledWith({ data: expect.objectContaining({ programId: 'program-A', teacherId: 'teacher-B', courseElementId: 'element-A' }) })
  })

  it('blocks a program outside the manager department', async () => {
    mocks.program.mockResolvedValue({ id: 'program-A', departmentId: 'department-B' })
    const response = await post(manager, 'tenant-A', request(body))
    expect(response.status).toBe(403)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('blocks a teacher with no approved annual service even when the current EC points to them', async () => {
    mocks.service.mockResolvedValue(null)
    const response = await post(manager, 'tenant-A', request(body))
    expect(response.status).toBe(409)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects a conflict for the same student level', async () => {
    mocks.slots.mockResolvedValue([{ id: 'existing' }])
    const response = await post(manager, 'tenant-A', request(body))
    expect(response.status).toBe(409)
    expect(mocks.slots).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ OR: expect.arrayContaining([{ levelId: 'level-A' }]) }) }))
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('retries a concurrent serializable write instead of creating a duplicate blindly', async () => {
    mocks.transaction.mockRejectedValueOnce({ code: 'P2034' })
    const response = await post(manager, 'tenant-A', request(body))
    expect(response.status).toBe(201)
    expect(mocks.transaction).toHaveBeenCalledTimes(2)
    expect(mocks.slots).toHaveBeenCalledTimes(1)
  })

  it('fails closed when the manager has no active department', async () => {
    mocks.scope.mockResolvedValue({ facultyId: null, departmentIds: [] })
    const response = await post(manager, 'tenant-A', request(body))
    expect(response.status).toBe(403)
  })

  it('reads only its department and preserves a selected program filter', async () => {
    const response = await get(manager, 'tenant-A', new NextRequest('http://localhost/api/timetable?programId=program-A'))
    expect(response.status).toBe(200)
    expect(mocks.slots).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-A', programId: { in: ['program-A'] } }) }))
  })

  it('rejects an attempted read of another department program', async () => {
    const response = await get(manager, 'tenant-A', new NextRequest('http://localhost/api/timetable?programId=program-B'))
    expect(response.status).toBe(403)
    expect(mocks.slots).not.toHaveBeenCalled()
  })

  it('updates a slot in its own department and audits the previous version', async () => {
    mocks.findSlot.mockResolvedValue({ id: 'slot-A', academicYearId: 'year-A', programId: 'program-A', levelId: 'level-A', courseElementId: 'element-A', teacherId: 'teacher-B', roomId: 'room-A', dayOfWeek: 1, startTime: '10:00', endTime: '12:00' })
    mocks.service.mockResolvedValue(null)
    const response = await put(manager, 'tenant-A', new NextRequest('http://localhost/api/timetable?id=slot-A', { method: 'PUT', body: JSON.stringify(body) }))
    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'slot-A' } }))
    expect(mocks.audit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'UPDATE', entityId: 'slot-A' }) })
    expect(mocks.service).not.toHaveBeenCalled()
    expect(mocks.slots).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: { not: 'slot-A' } }) }))
  })

  it('cannot change another department slot into its own program', async () => {
    mocks.findSlot.mockResolvedValue({ id: 'slot-A', programId: 'program-B' })
    mocks.program.mockResolvedValueOnce(null)
    const response = await put(manager, 'tenant-A', new NextRequest('http://localhost/api/timetable?id=slot-A', { method: 'PUT', body: JSON.stringify(body) }))
    expect(response.status).toBe(403)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('cannot delete another department slot', async () => {
    mocks.findSlot.mockResolvedValue({ id: 'slot-A', programId: 'program-B' })
    mocks.program.mockResolvedValue(null)
    const response = await deleteSlot(manager, 'tenant-A', new NextRequest('http://localhost/api/timetable?id=slot-A', { method: 'DELETE' }))
    expect(response.status).toBe(403)
    expect(mocks.deleteSlot).not.toHaveBeenCalled()
  })

  it('deletes its own slot together with an audit entry', async () => {
    mocks.findSlot.mockResolvedValue({ id: 'slot-A', programId: 'program-A', levelId: 'level-A', dayOfWeek: 0, startTime: '08:00', endTime: '10:00' })
    const response = await deleteSlot(manager, 'tenant-A', new NextRequest('http://localhost/api/timetable?id=slot-A', { method: 'DELETE' }))
    expect(response.status).toBe(200)
    expect(mocks.deleteSlot).toHaveBeenCalledWith({ where: { id: 'slot-A' } })
    expect(mocks.audit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'DELETE', entityId: 'slot-A' }) })
  })
})
