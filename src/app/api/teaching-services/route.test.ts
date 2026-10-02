import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  scope: vi.fn(), year: vi.fn(), element: vi.fn(), teacher: vi.fn(), current: vi.fn(), create: vi.fn(), update: vi.fn(), saved: vi.fn(), audit: vi.fn(), transaction: vi.fn(),
}))
vi.mock('@/lib/auth/helpers', () => ({ withTenantAuth: (handler: unknown) => handler }))
vi.mock('@/lib/auth/organization-scope', () => ({ getOrganizationScope: mocks.scope }))
vi.mock('@/lib/db', () => ({ db: {
  academicYear: { findFirst: mocks.year }, courseElement: { findFirst: mocks.element }, teacher: { findFirst: mocks.teacher },
  teachingService: { findFirst: mocks.current, create: mocks.create, updateMany: mocks.update, findUniqueOrThrow: mocks.saved },
  auditLog: { create: mocks.audit }, $transaction: mocks.transaction,
} }))

const { POST, PATCH } = await import('./route')
const post = POST as unknown as (user: { id: string; role: string; tenantId: string }, tenantId: string, request: NextRequest) => Promise<Response>
const patch = PATCH as unknown as typeof post
const manager = { id: 'head-request', role: 'DEPARTEMENT', tenantId: 'tenant-A' }
const homeManager = { id: 'head-home', role: 'DEPARTEMENT', tenantId: 'tenant-A' }
const central = { id: 'admin-A', role: 'ADMIN_INSTITUTION', tenantId: 'tenant-A' }
const request = (method: string, body: unknown) => new NextRequest('http://localhost/api/teaching-services', { method, body: JSON.stringify(body) })
const application = { academicYearId: 'year-A', courseElementId: 'element-A', teacherId: 'teacher-B', plannedHours: 40, reason: 'Cours partagé avec le département voisin.' }
const decision = (action: string) => ({ id: 'service-A', action, reason: 'Accord pédagogique et charge contrôlée.' })

beforeEach(() => {
  vi.resetAllMocks()
  mocks.scope.mockImplementation(async (user: { id: string }) => ({ departmentIds: [user.id === 'head-home' ? 'department-B' : 'department-A'] }))
  mocks.year.mockResolvedValue({ id: 'year-A' })
  mocks.element.mockResolvedValue({ teachingUnit: { semester: { level: { program: { departmentId: 'department-A', department: { isActive: true } } } } } })
  mocks.teacher.mockResolvedValue({ departmentId: 'department-B', department: { isActive: true } })
  mocks.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'service-A', ...data }))
  mocks.current.mockResolvedValue({ id: 'service-A', tenantId: 'tenant-A', status: 'PENDING_HOME', homeDepartmentId: 'department-B', teacherId: 'teacher-B', courseElementId: 'element-A', requestingDepartmentId: 'department-A', requestedById: 'head-request' })
  mocks.update.mockResolvedValue({ count: 1 })
  mocks.saved.mockResolvedValue({ id: 'service-A', status: 'PENDING_CENTRAL' })
  mocks.audit.mockResolvedValue({ id: 'audit-A' })
  mocks.transaction.mockImplementation((callback: (tx: unknown) => Promise<unknown>) => callback({
    teachingService: { findFirst: mocks.current, create: mocks.create, updateMany: mocks.update, findUniqueOrThrow: mocks.saved },
    teacher: { findFirst: mocks.teacher }, courseElement: { findFirst: mocks.element }, auditLog: { create: mocks.audit },
  }))
})

describe('annual teaching-service workflow', () => {
  it('records an external request as pending home approval without changing the EC', async () => {
    const response = await post(manager, 'tenant-A', request('POST', application))
    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledWith({ data: expect.objectContaining({ status: 'PENDING_HOME', requestingDepartmentId: 'department-A', homeDepartmentId: 'department-B', academicYearId: 'year-A' }) })
    expect(mocks.audit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'CREATE', entity: 'TeachingService' }) })
  })
  it('sends a same-department request directly to central arbitration', async () => {
    mocks.teacher.mockResolvedValue({ departmentId: 'department-A', department: { isActive: true } })
    const response = await post(manager, 'tenant-A', request('POST', application))
    expect(response.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledWith({ data: expect.objectContaining({ status: 'PENDING_CENTRAL' }) })
  })
  it('rejects a request for an EC outside the manager perimeter', async () => {
    mocks.element.mockResolvedValue({ teachingUnit: { semester: { level: { program: { departmentId: 'department-C', department: { isActive: true } } } } } })
    const response = await post(manager, 'tenant-A', request('POST', application))
    expect(response.status).toBe(403)
    expect(mocks.create).not.toHaveBeenCalled()
  })
  it('requires the home department and refuses self-approval', async () => {
    expect((await patch(manager, 'tenant-A', request('PATCH', decision('HOME_APPROVE')))).status).toBe(403)
    mocks.current.mockResolvedValue({ id: 'service-A', tenantId: 'tenant-A', status: 'PENDING_HOME', homeDepartmentId: 'department-A', teacherId: 'teacher-B', courseElementId: 'element-A', requestingDepartmentId: 'department-A', requestedById: 'head-request' })
    expect((await patch(manager, 'tenant-A', request('PATCH', decision('HOME_APPROVE')))).status).toBe(403)
    expect(mocks.update).not.toHaveBeenCalled()
  })
  it('blocks central approval until home consent and then records a motivated decision', async () => {
    expect((await patch(central, 'tenant-A', request('PATCH', decision('CENTRAL_APPROVE')))).status).toBe(409)
    mocks.current.mockResolvedValue({ id: 'service-A', tenantId: 'tenant-A', status: 'PENDING_CENTRAL', homeDepartmentId: 'department-B', teacherId: 'teacher-B', courseElementId: 'element-A', requestingDepartmentId: 'department-A', requestedById: 'head-request' })
    mocks.saved.mockResolvedValue({ id: 'service-A', status: 'APPROVED' })
    const response = await patch(central, 'tenant-A', request('PATCH', decision('CENTRAL_APPROVE')))
    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: 'PENDING_CENTRAL' }), data: expect.objectContaining({ status: 'APPROVED', centralDecidedById: 'admin-A' }) }))
  })
  it('does not approve after a teacher changes home department', async () => {
    mocks.teacher.mockResolvedValue({ departmentId: 'department-C' })
    const response = await patch(homeManager, 'tenant-A', request('PATCH', decision('HOME_APPROVE')))
    expect(response.status).toBe(409)
    expect(mocks.update).not.toHaveBeenCalled()
  })
})
