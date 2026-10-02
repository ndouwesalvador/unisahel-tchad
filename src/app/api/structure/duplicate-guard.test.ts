import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { authMock, dbMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  dbMock: {
    program: { findFirst: vi.fn() },
    level: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    semester: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}))

vi.mock('@/lib/auth/config', () => ({ auth: authMock }))
vi.mock('@/lib/db', () => ({ db: dbMock }))

const { POST, PUT } = await import('./route')
const tenantId = 'ctenant0000000000000000a1'
const programId = 'cprogram0000000000000001'
const levelId = 'clevel000000000000000001'

function request(method: 'POST' | 'PUT', type: string, body: unknown) {
  return new NextRequest(`http://localhost:3000/api/structure?type=${type}`, { method, body: JSON.stringify(body) })
}

beforeEach(() => {
  vi.clearAllMocks()
  authMock.mockResolvedValue({ user: { id: 'cadmin000000000000000001', role: 'ADMIN_INSTITUTION', tenantId } })
  dbMock.program.findFirst.mockResolvedValue({ id: programId })
  dbMock.level.findFirst.mockResolvedValue({ id: levelId })
  dbMock.level.findUnique.mockResolvedValue({ programId, name: 'Licence 2', code: 'L2' })
  dbMock.level.findMany.mockResolvedValue([{ id: 'clevel000000000000000002', name: 'LICENCE 1', code: 'GIM1' }])
  dbMock.semester.findFirst.mockResolvedValue({ id: 'csemester00000000000001' })
  dbMock.semester.findUnique.mockResolvedValue({ levelId, name: 'Semestre 2', code: 'S2' })
  dbMock.semester.findMany.mockResolvedValue([{ id: 'csemester00000000000002', name: 'SEMESTRE 1', code: 'S1' }])
})

describe('structure duplicate guard', () => {
  it('rejects a same-name level in the same program', async () => {
    const response = await POST(request('POST', 'level', { programId, name: 'Licence 1', code: 'L1', orderIndex: 1 }))
    expect(response.status).toBe(409)
    expect(dbMock.level.create).not.toHaveBeenCalled()
  })

  it('rejects a same-code semester in the same level', async () => {
    const response = await POST(request('POST', 'semester', { levelId, name: 'Premier semestre', code: 's1', orderIndex: 1 }))
    expect(response.status).toBe(409)
    expect(dbMock.semester.create).not.toHaveBeenCalled()
  })

  it('rejects renaming a level to an existing sibling name', async () => {
    const response = await PUT(request('PUT', 'level', { id: levelId, name: 'licence 1' }))
    expect(response.status).toBe(409)
    expect(dbMock.level.update).not.toHaveBeenCalled()
  })

  it('rejects reactivating a conflicting level', async () => {
    dbMock.level.findUnique.mockResolvedValue({ programId, name: 'Licence 1', code: 'L1' })
    const response = await PUT(request('PUT', 'level', { id: levelId, isActive: true }))
    expect(response.status).toBe(409)
    expect(dbMock.level.update).not.toHaveBeenCalled()
  })
})
