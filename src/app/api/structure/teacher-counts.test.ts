import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  scope: vi.fn(), tenant: vi.fn(), faculties: vi.fn(), studentGroup: vi.fn(), teacherGroup: vi.fn(),
}))
vi.mock('@/lib/auth/helpers', () => ({ withTenantAuth: (handler: unknown) => handler }))
vi.mock('@/lib/auth/teacher-scope', () => ({ getTeacherScope: mocks.scope }))
vi.mock('@/lib/db', () => ({ db: {
  tenant: { findUnique: mocks.tenant },
  faculty: { findMany: mocks.faculties },
  student: { groupBy: mocks.studentGroup },
  teacher: { groupBy: mocks.teacherGroup },
} }))

const { GET } = await import('./route')
const handler = GET as unknown as (user: { id: string; role: string; tenantId: string }, tenantId: string, request: NextRequest) => Promise<Response>

beforeEach(() => {
  vi.clearAllMocks()
  mocks.tenant.mockResolvedValue({ id: 'tenant-1', name: 'Université', settings: {} })
  mocks.faculties.mockResolvedValue([{ id: 'faculty-1', name: 'Faculté', departments: [
    { id: 'department-1', name: 'Génie industriel', programs: [{ id: 'program-1', name: 'Licence', levels: [] }] },
  ] }])
  mocks.studentGroup.mockResolvedValue([])
  mocks.teacherGroup.mockResolvedValue([{ departmentId: 'department-1', _count: { _all: 2 } }])
})

describe('structure teacher counts', () => {
  it('counts active teachers by department, not by assigned courses', async () => {
    const response = await handler({ id: 'admin-1', role: 'ADMIN_INSTITUTION', tenantId: 'tenant-1' }, 'tenant-1', new NextRequest('http://localhost/api/structure'))
    expect(response.status).toBe(200)
    expect(mocks.teacherGroup).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: 'tenant-1', isActive: true, departmentId: { not: null } } }))
    const body = await response.json()
    expect(body.faculties[0].teacherCount).toBe(2)
    expect(body.faculties[0].departments[0].teacherCount).toBe(2)
  })
})
