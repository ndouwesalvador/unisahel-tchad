import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ scope: vi.fn(), tenant: vi.fn(), faculties: vi.fn(), studentGroup: vi.fn() }))
vi.mock('@/lib/auth/helpers', () => ({ withTenantAuth: (handler: unknown) => handler }))
vi.mock('@/lib/auth/teacher-scope', () => ({ getTeacherScope: mocks.scope }))
vi.mock('@/lib/db', () => ({ db: {
  tenant: { findUnique: mocks.tenant }, faculty: { findMany: mocks.faculties }, student: { groupBy: mocks.studentGroup },
} }))

const { GET } = await import('./route')
const handler = GET as unknown as (u: { id: string; role: string; tenantId: string }, t: string, r: NextRequest) => Promise<Response>

describe('teacher structure isolation', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.scope.mockResolvedValue({ linked: true, teacherId: 'teacher-A', courseElementIds: ['element-A'], teachingUnitIds: ['unit-A'] })
    mocks.tenant.mockResolvedValue({ id: 'tenant-A', name: 'Université', settings: {} })
    const program = (name: string, unitId: string, elementId: string) => ({ id: name, name, levels: [{ id: `${name}-level`, name: 'L1', semesters: [{ id: `${name}-semester`, name: 'S1', teachingUnits: [{ id: unitId, name: `${name}-UE`, courseElements: [{ id: elementId, name: `${name}-course` }] }] }] }] })
    mocks.faculties.mockResolvedValue([{ id: 'faculty-A', name: 'Faculté', departments: [{ id: 'department-A', name: 'Département', programs: [program('Assigned', 'unit-A', 'element-A'), program('Foreign', 'unit-B', 'element-B')] }] }])
  })

  it('removes every unrelated programme, level, UE, matter and student count', async () => {
    const response = await handler({ id: 'user-A', role: 'ENSEIGNANT', tenantId: 'tenant-A' }, 'tenant-A', new NextRequest('http://localhost/api/structure'))
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(JSON.stringify(body)).toContain('Assigned')
    expect(JSON.stringify(body)).not.toContain('Foreign')
    expect(body.stats.students).toBe(0)
    expect(mocks.studentGroup).not.toHaveBeenCalled()
  })
})
