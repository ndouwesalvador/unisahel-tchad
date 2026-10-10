import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  studentFindFirst: vi.fn(), registrationFindMany: vi.fn(), elementFindMany: vi.fn(),
  resultFindMany: vi.fn(), examFindMany: vi.fn(),
}))

vi.mock('@/lib/auth/helpers', () => ({ withTenantAuth: (handler: unknown) => handler }))
vi.mock('@/lib/auth/teacher-scope', () => ({ getTeacherScope: vi.fn() }))
vi.mock('@/lib/db', () => ({ db: {
  student: { findFirst: mocks.studentFindFirst },
  pedagogicalRegistration: { findMany: mocks.registrationFindMany },
  courseElement: { findMany: mocks.elementFindMany },
  examResult: { findMany: mocks.resultFindMany },
  onlineExam: { findMany: mocks.examFindMany },
} }))

const { GET } = await import('./route')
const user = { id: 'student-user', role: 'ETUDIANT', tenantId: 'tenant-A' }
const call = () => (GET as unknown as (u: typeof user, t: string, r: NextRequest) => Promise<Response>)(
  user, 'tenant-A', new NextRequest('http://localhost/api/online-exams?scope=me'),
)

describe('student online exam visibility', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.studentFindFirst.mockResolvedValue({ id: 'student-A', firstName: 'Amina', lastName: 'Test' })
    mocks.registrationFindMany.mockResolvedValue([{ teachingUnitId: 'unit-A' }])
    mocks.elementFindMany.mockResolvedValue([{ id: 'element-A' }])
    mocks.resultFindMany.mockResolvedValue([])
    mocks.examFindMany.mockResolvedValue([])
  })

  it('queries published exams only within the student registered matters', async () => {
    const response = await call()
    expect(response.status).toBe(200)
    expect(mocks.examFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        tenantId: 'tenant-A',
        AND: [
          { OR: [{ status: 'IN_PROGRESS' }, { id: { in: [] } }] },
          { OR: [{ courseElementId: { in: ['element-A'] } }, { id: { in: [] } }] },
        ],
      },
    }))
  })

  it('keeps an already started or submitted exam visible to its student', async () => {
    mocks.resultFindMany.mockResolvedValue([{ id: 'result-A', examId: 'exam-A', startedAt: new Date(), submittedAt: new Date(), score: 12, maxScore: 20, status: 'REUSSI' }])
    mocks.examFindMany.mockResolvedValue([{ id: 'exam-A', name: 'Examen', course: 'Électricité', examDate: new Date(), duration: '1h00', questionIds: ['q1'], type: 'QCM' }])

    const response = await call()
    const body = await response.json()
    expect(body.exams).toEqual([expect.objectContaining({ id: 'exam-A', submitted: true, score: 12 })])
  })
})
