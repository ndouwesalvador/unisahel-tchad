import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  scope: vi.fn(), examFindMany: vi.fn(), examCount: vi.fn(), questionFindMany: vi.fn(),
  resultFindMany: vi.fn(), incidentFindMany: vi.fn(), elementFindFirst: vi.fn(),
  elementFindMany: vi.fn(), examFindFirst: vi.fn(), examUpdate: vi.fn(), resultCount: vi.fn(),
}))
vi.mock('@/lib/auth/helpers', () => ({ withTenantAuth: (handler: unknown) => handler }))
vi.mock('@/lib/auth/teacher-scope', () => ({ getTeacherScope: mocks.scope }))
vi.mock('@/lib/db', () => ({ db: {
  onlineExam: { findMany: mocks.examFindMany, count: mocks.examCount, findFirst: mocks.examFindFirst, update: mocks.examUpdate },
  examBankQuestion: { findMany: mocks.questionFindMany },
  examResult: { findMany: mocks.resultFindMany, count: mocks.resultCount },
  examIncident: { findMany: mocks.incidentFindMany },
  courseElement: { findFirst: mocks.elementFindFirst, findMany: mocks.elementFindMany },
} }))

const { GET, POST, PUT } = await import('./route')
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
    mocks.elementFindMany.mockResolvedValue([])
    mocks.resultCount.mockResolvedValue(0)
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

  it('lets a teacher publish only an owned exam with questions and a real matter', async () => {
    mocks.examFindFirst.mockResolvedValue({ id: 'exam-A', status: 'PLANNED', questionIds: ['q1'], courseElementId: 'element-A' })
    mocks.examUpdate.mockResolvedValue({ id: 'exam-A', status: 'IN_PROGRESS' })

    const response = await call(PUT, 'http://localhost/api/online-exams?entity=status&id=exam-A', {
      method: 'PUT', body: JSON.stringify({ status: 'IN_PROGRESS' }),
    })

    expect(response.status).toBe(200)
    expect(mocks.examFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'exam-A', tenantId: 'tenant-A', teacherId: 'teacher-A', courseElementId: { in: ['element-A'] } },
    }))
    expect(mocks.examUpdate).toHaveBeenCalledWith({ where: { id: 'exam-A' }, data: { status: 'IN_PROGRESS' } })
  })
})
