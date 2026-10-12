import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  academicYearFindFirst: vi.fn(), studentCount: vi.fn(), teacherCount: vi.fn(),
  programCount: vi.fn(), facultyCount: vi.fn(), departmentCount: vi.fn(),
  studentGroupBy: vi.fn(), programFindMany: vi.fn(), documentCount: vi.fn(),
}))

vi.mock('@/lib/auth/helpers', () => ({
  withTenantAuth: (handler: unknown, allowedRoles?: string[]) => async (user: { role: string }, tenantId: string, request: NextRequest) => {
    if (allowedRoles && !allowedRoles.includes(user.role)) return new Response('{}', { status: 403 })
    return (handler as (user: { role: string }, tenantId: string, request: NextRequest) => Promise<Response>)(user, tenantId, request)
  },
}))
vi.mock('@/lib/db', () => ({ db: {
  academicYear: { findFirst: mocks.academicYearFindFirst },
  student: { count: mocks.studentCount, groupBy: mocks.studentGroupBy },
  teacher: { count: mocks.teacherCount }, program: { count: mocks.programCount, findMany: mocks.programFindMany },
  faculty: { count: mocks.facultyCount }, department: { count: mocks.departmentCount },
  officialDocument: { count: mocks.documentCount },
} }))

const { GET } = await import('./route')
const get = GET as unknown as (user: { role: string }, tenantId: string, request: NextRequest) => Promise<Response>

beforeEach(() => {
  vi.resetAllMocks()
  mocks.academicYearFindFirst.mockResolvedValue({ id: 'year-A', name: '2026-2027' })
  mocks.studentCount.mockResolvedValue(12)
  mocks.teacherCount.mockResolvedValue(4)
  mocks.programCount.mockResolvedValue(2)
  mocks.facultyCount.mockResolvedValue(1)
  mocks.departmentCount.mockResolvedValue(2)
  mocks.studentGroupBy.mockResolvedValue([{ status: 'INSCRIT', _count: { _all: 10 } }])
  mocks.programFindMany.mockResolvedValue([{ id: 'program-A', name: 'Génie électrique', cycle: 'MASTER', department: { id: 'dep-A', name: 'Génie électrique', faculty: { id: 'fac-A', name: 'Sciences' } }, levels: [{ id: 'level-A', name: 'Master 1', _count: { students: 10 } }], _count: { students: 10 } }])
  mocks.documentCount.mockResolvedValue(3)
})

describe('GET /api/oversight', () => {
  it('returns read-only academic oversight without financial data', async () => {
    const response = await get({ role: 'RECTORAT' }, 'tenant-A', new NextRequest('http://localhost/api/oversight'))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({ academicYear: { id: 'year-A' }, totals: { students: 12, teachers: 4, signedPvs: 3 } })
    expect(body).not.toHaveProperty('payments')
    expect(body.programs[0]).toMatchObject({ name: 'Génie électrique', students: 10, department: 'Génie électrique' })
  })

  it('rejects operational roles such as caisse', async () => {
    const response = await get({ role: 'CAISSE' }, 'tenant-A', new NextRequest('http://localhost/api/oversight'))
    expect(response.status).toBe(403)
    expect(mocks.studentCount).not.toHaveBeenCalled()
  })
})
