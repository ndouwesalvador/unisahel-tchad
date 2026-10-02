import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  scope: vi.fn(), year: vi.fn(), department: vi.fn(), programs: vi.fn(), slots: vi.fn(), approved: vi.fn(),
  publicationFind: vi.fn(), publicationCreate: vi.fn(), publicationUpdate: vi.fn(), publicationSaved: vi.fn(),
  courses: vi.fn(), teachers: vi.fn(), rooms: vi.fn(), registrations: vi.fn(), notifications: vi.fn(), audit: vi.fn(), transaction: vi.fn(),
}))
vi.mock('@/lib/auth/helpers', () => ({ withTenantAuth: (handler: unknown) => handler }))
vi.mock('@/lib/auth/organization-scope', () => ({ getOrganizationScope: mocks.scope }))
vi.mock('@/lib/db', () => ({ db: {
  academicYear: { findFirst: mocks.year }, department: { findFirst: mocks.department },
  $transaction: mocks.transaction,
} }))

const { POST, PATCH } = await import('./route')
const post = POST as unknown as (user: { id: string; role: string; tenantId: string }, tenantId: string, request: NextRequest) => Promise<Response>
const patch = PATCH as unknown as typeof post
const head = { id: 'head-A', role: 'DEPARTEMENT', tenantId: 'tenant-A' }
const dean = { id: 'dean-A', role: 'FACULTE', tenantId: 'tenant-A' }
const admin = { id: 'admin-A', role: 'ADMIN_INSTITUTION', tenantId: 'tenant-A' }
const request = (method: string, body: unknown) => new NextRequest('http://localhost/api/timetable-publications', { method, body: JSON.stringify(body) })
const submission = { academicYearId: 'year-A', departmentId: 'department-A', reason: 'Planification vérifiée pour le semestre.' }
const snapshotSlot = { id: 'slot-A', academicYearId: 'year-A', dayOfWeek: 0, startTime: '08:00', endTime: '10:00', type: 'CM',
  courseElementId: 'element-A', teacherId: 'teacher-A', roomId: 'room-A', programId: 'program-A', levelId: 'level-A',
  course: 'Analyse', teacher: 'Awa Enseignante', room: 'Salle 1' }

beforeEach(() => {
  vi.resetAllMocks()
  mocks.scope.mockResolvedValue({ departmentIds: ['department-A'] })
  mocks.year.mockResolvedValue({ id: 'year-A' })
  mocks.department.mockResolvedValue({ id: 'department-A', name: 'Sciences' })
  mocks.programs.mockResolvedValue([{ id: 'program-A' }])
  mocks.slots.mockResolvedValue([{ id: 'slot-A', academicYearId: 'year-A', dayOfWeek: 0, startTime: '08:00', endTime: '10:00', type: 'CM',
    courseElementId: 'element-A', teacherId: 'teacher-A', roomId: 'room-A', programId: 'program-A', levelId: 'level-A' }])
  mocks.approved.mockResolvedValue([{ courseElementId: 'element-A', teacherId: 'teacher-A' }])
  mocks.publicationFind.mockImplementation(async ({ where }: { where: { id?: string; status?: string } }) => where.id
    ? { id: 'publication-A', tenantId: 'tenant-A', academicYearId: 'year-A', departmentId: 'department-A', version: 1,
      status: 'PENDING_REVIEW', submittedById: 'head-A', snapshot: [snapshotSlot] }
    : where.status === 'PENDING_REVIEW' ? null : { version: 0 })
  mocks.publicationCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'publication-A', ...data }))
  mocks.publicationUpdate.mockResolvedValue({ count: 1 })
  mocks.publicationSaved.mockResolvedValue({ id: 'publication-A', status: 'PUBLISHED' })
  mocks.courses.mockResolvedValue([{ id: 'element-A', name: 'Analyse', teachingUnit: { semester: { level: { id: 'level-A', programId: 'program-A' } } } }])
  mocks.teachers.mockResolvedValue([{ id: 'teacher-A', user: { firstName: 'Awa', lastName: 'Enseignante' }, userId: 'user-teacher' }])
  mocks.rooms.mockResolvedValue([{ id: 'room-A', name: 'Salle 1' }])
  mocks.registrations.mockResolvedValue([{ student: { userId: 'user-student' } }])
  mocks.notifications.mockResolvedValue({ count: 2 })
  mocks.audit.mockResolvedValue({ id: 'audit-A' })
  mocks.transaction.mockImplementation((callback: (tx: unknown) => Promise<unknown>) => callback({
    timetablePublication: { findFirst: mocks.publicationFind, create: mocks.publicationCreate, updateMany: mocks.publicationUpdate, findUniqueOrThrow: mocks.publicationSaved },
    program: { findMany: mocks.programs }, timetableSlot: { findMany: mocks.slots }, teachingService: { findMany: mocks.approved },
    courseElement: { findMany: mocks.courses }, teacher: { findMany: mocks.teachers }, room: { findMany: mocks.rooms },
    administrativeRegistration: { findMany: mocks.registrations }, department: { findFirst: mocks.department },
    notification: { createMany: mocks.notifications }, auditLog: { create: mocks.audit },
  }))
})

describe('department timetable publication', () => {
  it('rejects a submission outside the department scope', async () => {
    const response = await post(head, 'tenant-A', request('POST', { ...submission, departmentId: 'department-B' }))
    expect(response.status).toBe(403)
    expect(mocks.publicationCreate).not.toHaveBeenCalled()
  })
  it('refuses to publish a draft containing a slot without approved annual service', async () => {
    mocks.approved.mockResolvedValue([])
    const response = await post(head, 'tenant-A', request('POST', submission))
    expect(response.status).toBe(409)
    expect(mocks.publicationCreate).not.toHaveBeenCalled()
  })
  it('captures a versioned immutable snapshot, not a live slot reference', async () => {
    const response = await post(head, 'tenant-A', request('POST', submission))
    expect(response.status).toBe(201)
    expect(mocks.publicationCreate).toHaveBeenCalledWith({ data: expect.objectContaining({
      version: 1, status: 'PENDING_REVIEW', snapshot: [snapshotSlot], submittedById: 'head-A',
    }) })
    expect(mocks.audit).toHaveBeenCalledWith({ data: expect.objectContaining({ entity: 'TimetablePublication', action: 'CREATE' }) })
  })
  it('rejects a legacy slot whose subject belongs to a different level', async () => {
    mocks.courses.mockResolvedValue([{ id: 'element-A', name: 'Analyse', teachingUnit: { semester: { level: { id: 'level-B', programId: 'program-A' } } } }])
    const response = await post(head, 'tenant-A', request('POST', submission))
    expect(response.status).toBe(409)
    expect(mocks.publicationCreate).not.toHaveBeenCalled()
  })
  it('prevents a dean from approving their own submission', async () => {
    mocks.publicationFind.mockResolvedValueOnce({ id: 'publication-A', tenantId: 'tenant-A', departmentId: 'department-A', status: 'PENDING_REVIEW', submittedById: 'dean-A', snapshot: [snapshotSlot] })
    const response = await patch(dean, 'tenant-A', request('PATCH', { id: 'publication-A', action: 'APPROVE', reason: 'Conforme à la maquette et aux disponibilités.' }))
    expect(response.status).toBe(403)
    expect(mocks.publicationUpdate).not.toHaveBeenCalled()
  })
  it('publishes after review and creates only recipient-scoped notifications', async () => {
    const response = await patch(admin, 'tenant-A', request('PATCH', { id: 'publication-A', action: 'APPROVE', reason: 'Créneaux et ressources vérifiés.' }))
    expect(response.status).toBe(200)
    expect(mocks.publicationUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: 'PENDING_REVIEW' }), data: expect.objectContaining({ status: 'PUBLISHED' }) }))
    expect(mocks.notifications).toHaveBeenCalledWith({ data: expect.arrayContaining([
      expect.objectContaining({ recipientUserId: 'user-teacher' }), expect.objectContaining({ recipientUserId: 'user-student' }),
    ]) })
  })
  it('does not publish when an approved annual service has been withdrawn', async () => {
    mocks.approved.mockResolvedValue([])
    const response = await patch(admin, 'tenant-A', request('PATCH', { id: 'publication-A', action: 'APPROVE', reason: 'Contrôle des affectations avant publication.' }))
    expect(response.status).toBe(409)
    expect(mocks.publicationUpdate).not.toHaveBeenCalled()
    expect(mocks.notifications).not.toHaveBeenCalled()
  })
  it('does not publish when the planned room has become inactive', async () => {
    mocks.rooms.mockResolvedValue([])
    const response = await patch(admin, 'tenant-A', request('PATCH', { id: 'publication-A', action: 'APPROVE', reason: 'Contrôle des salles avant publication.' }))
    expect(response.status).toBe(409)
    expect(mocks.publicationUpdate).not.toHaveBeenCalled()
  })
  it('keeps a rejection internal without notifying teachers or students', async () => {
    const response = await patch(admin, 'tenant-A', request('PATCH', { id: 'publication-A', action: 'REJECT', reason: 'Conflit de salle à corriger.' }))
    expect(response.status).toBe(200)
    expect(mocks.notifications).not.toHaveBeenCalled()
  })
})
