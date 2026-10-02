import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  scope: vi.fn(), year: vi.fn(), program: vi.fn(), programs: vi.fn(), teacher: vi.fn(), room: vi.fn(), element: vi.fn(),
  slots: vi.fn(), create: vi.fn(), audit: vi.fn(),
}))

vi.mock('@/lib/auth/helpers', () => ({ withTenantAuth: (handler: unknown) => handler }))
vi.mock('@/lib/auth/organization-scope', () => ({ getOrganizationScope: mocks.scope }))
vi.mock('@/lib/db', () => ({ db: {
  academicYear: { findFirst: mocks.year }, program: { findFirst: mocks.program, findMany: mocks.programs },
  teacher: { findFirst: mocks.teacher }, room: { findFirst: mocks.room },
  courseElement: { findFirst: mocks.element },
  timetableSlot: { findMany: mocks.slots, create: mocks.create }, auditLog: { create: mocks.audit },
} }))

const { POST, GET } = await import('./route')
const post = POST as unknown as (user: { id: string; role: string; tenantId: string }, tenantId: string, request: NextRequest) => Promise<Response>
const get = GET as unknown as (user: { id: string; role: string; tenantId: string }, tenantId: string, request: NextRequest) => Promise<Response>
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
  mocks.slots.mockResolvedValue([])
  mocks.create.mockResolvedValue({ id: 'slot-A' })
  mocks.audit.mockResolvedValue({ id: 'audit-A' })
})

describe('department timetable', () => {
  it('allows an explicitly assigned teacher from another department', async () => {
    const response = await post(manager, 'tenant-A', request(body))
    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledWith({ data: expect.objectContaining({ programId: 'program-A', teacherId: 'teacher-B', courseElementId: 'element-A' }) })
  })

  it('blocks a program outside the manager department', async () => {
    mocks.program.mockResolvedValue({ id: 'program-A', departmentId: 'department-B' })
    const response = await post(manager, 'tenant-A', request(body))
    expect(response.status).toBe(403)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('blocks an unassigned teacher even if the teacher belongs to this institution', async () => {
    mocks.element.mockResolvedValue({ teacherId: 'teacher-C', teachingUnit: { responsibleId: null, semester: { level: { id: 'level-A', programId: 'program-A' } } } })
    const response = await post(manager, 'tenant-A', request(body))
    expect(response.status).toBe(400)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects a conflict for the same student level', async () => {
    mocks.slots.mockResolvedValue([{ id: 'existing' }])
    const response = await post(manager, 'tenant-A', request(body))
    expect(response.status).toBe(409)
    expect(mocks.slots).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ OR: expect.arrayContaining([{ levelId: 'level-A' }]) }) }))
    expect(mocks.create).not.toHaveBeenCalled()
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
})
