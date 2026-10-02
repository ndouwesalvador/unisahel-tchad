import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  scope: vi.fn(), examFindMany: vi.fn(), examCount: vi.fn(), questionFindMany: vi.fn(),
  resultFindMany: vi.fn(), incidentFindMany: vi.fn(), elementFindFirst: vi.fn(),
}))
vi.mock('@/lib/auth/helpers', () => ({ withTenantAuth: (handler: unknown) => handler }))
vi.mock('@/lib/auth/teacher-scope', () => ({ getTeacherScope: mocks.scope }))
vi.mock('@/lib/db', () => ({ db: {
  onlineExam: { findMany: mocks.examFindMany, count: mocks.examCount },
  examBankQuestion: { findMany: mocks.questionFindMany },
  examResult: { findMany: mocks.resultFindMany },
  examIncident: { findMany: mocks.incidentFindMany },
  courseElement: { findFirst: mocks.elementFindFirst },
} }))

const { GET, POST } = await import('./route')
const user = { id: 'user-A', role: 'ENSEIGNANT', tenantId: 'tenant-A' }
const call = (handler: typeof GET, url: string, init?: ConstructorParameters<typeof NextRequest>[1]) => (handler as unknown as (u: typeof user, t: string, r: NextRequest) => Promise<Response>)(user, 'tenant-A', new NextRequest(url, init))

describe('teacher online exam isolation', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.scope.mockResolvedValue({ linked: true, teacherId: 'teacher-A', courseElementIds: ['element-A'] })
    mocks.examFindMany.mockResolvedValue([])
    mocks.examCount.mockResolvedValue(0)
    mocks.questionFindMany.mockResolvedValue([])
    mocks.resultFindMany.mockResolvedValue([])
    mocks.incidentFindMany.mockResolvedValue([])
  })

  it('lists only this teacher’s exams, questions and results', async () => {
    expect((await call(GET, 'http://localhost/api/online-exams')).status).toBe(200)
    expect(mocks.examFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: 'tenant-A', teacherId: 'teacher-A', courseElementId: { in: ['element-A'] } } }))
    expect(mocks.questionFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: 'tenant-A', teacherId: 'teacher-A', courseElementId: { in: ['element-A'] } } }))
    expect(mocks.resultFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: 'tenant-A', exam: { teacherId: 'teacher-A', courseElementId: { in: ['element-A'] } } } }))
  })

  it('rejects creating an exam for an unassigned matter', async () => {
    const response = await call(POST, 'http://localhost/api/online-exams', { method: 'POST', body: JSON.stringify({ courseElementId: 'element-B', name: 'Examen', duration: '1h00', type: 'QCM', questionIds: ['q1'] }) })
    expect(response.status).toBe(403)
    expect(mocks.elementFindFirst).not.toHaveBeenCalled()
  })
})
