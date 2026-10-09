import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  findLogs: vi.fn(),
  countLogs: vi.fn(),
  findUser: vi.fn(),
}))

vi.mock('@/lib/auth/helpers', () => ({ withAuth: (handler: unknown) => handler }))
vi.mock('@/lib/db', () => ({
  db: {
    auditLog: { findMany: mocks.findLogs, count: mocks.countLogs },
    user: { findUnique: mocks.findUser, update: vi.fn() },
  },
}))

const { GET } = await import('./route')
const get = GET as unknown as (user: { id: string; role: string; firstName: string; lastName: string; email: string }, request: NextRequest) => Promise<Response>

describe('profile data', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findLogs.mockResolvedValue([
      { id: 'log-1', action: 'SIGN_IN', entity: 'User', details: '{}', ipAddress: '127.0.0.1', createdAt: new Date('2026-10-09T07:00:00Z') },
    ])
    mocks.countLogs.mockResolvedValueOnce(3).mockResolvedValueOnce(7)
    mocks.findUser.mockResolvedValue({
      firstName: 'Nomaine', lastName: 'Djakfooga', email: 'teacher@example.test', phone: null,
      passwordHash: 'hash', isActive: true,
      createdAt: new Date('2026-09-01T00:00:00Z'), updatedAt: new Date('2026-10-01T00:00:00Z'), lastLoginAt: new Date('2026-10-09T07:00:00Z'),
      faculty: null, department: null,
      teacher: { employeeId: 'ENS-01', grade: 'Assistant', specialization: 'Électricité', department: { name: 'Génie électrique' } },
      student: null,
    })
  })

  it('returns the real professional scope and calculated monthly counters', async () => {
    const response = await get(
      { id: 'user-1', role: 'ENSEIGNANT', firstName: 'Nomaine', lastName: 'Djakfooga', email: 'teacher@example.test' },
      new NextRequest('http://localhost/api/profile'),
    )
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.profile).toMatchObject({
      departmentName: 'Génie électrique', employeeId: 'ENS-01', grade: 'Assistant',
      specialization: 'Électricité', isActive: true,
    })
    expect(body.stats).toEqual({ connectionsThisMonth: 3, actionsThisMonth: 7 })
    expect(JSON.stringify(body)).not.toContain('Informatique et Mathematiques')
    expect(JSON.stringify(body)).not.toContain('Jan 2024')
  })
})
