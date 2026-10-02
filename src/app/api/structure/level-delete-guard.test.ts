import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { authMock, dbMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  dbMock: {
    level: { findFirst: vi.fn(), update: vi.fn() },
    semester: { count: vi.fn() },
    student: { count: vi.fn() },
    administrativeRegistration: { count: vi.fn() },
    admission: { count: vi.fn() },
    admissionCampaign: { count: vi.fn() },
    deliberation: { count: vi.fn() },
    feeStructure: { count: vi.fn() },
    timetableSlot: { count: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}))

vi.mock('@/lib/auth/config', () => ({ auth: authMock }))
vi.mock('@/lib/db', () => ({ db: dbMock }))

const { DELETE } = await import('./route')
const tenantId = 'ctenant0000000000000000a1'
const levelId = 'clevel000000000000000001'
const request = () => new NextRequest(`http://localhost:3000/api/structure?type=level&id=${levelId}`, { method: 'DELETE' })

beforeEach(() => {
  vi.clearAllMocks()
  authMock.mockResolvedValue({ user: { id: 'cadmin000000000000000001', role: 'ADMIN_INSTITUTION', tenantId } })
  dbMock.level.findFirst.mockResolvedValue({ id: levelId })
  dbMock.level.update.mockResolvedValue({ id: levelId, isActive: false })
  for (const delegate of [dbMock.semester, dbMock.student, dbMock.administrativeRegistration, dbMock.admission, dbMock.admissionCampaign, dbMock.deliberation, dbMock.feeStructure, dbMock.timetableSlot]) {
    delegate.count.mockResolvedValue(0)
  }
})

describe('level archive guard', () => {
  it('does not hide a level with a curriculum', async () => {
    dbMock.semester.count.mockResolvedValue(1)
    const response = await DELETE(request())
    expect(response.status).toBe(409)
    expect(dbMock.level.update).not.toHaveBeenCalled()
  })

  it('does not hide a level referenced by a student', async () => {
    dbMock.student.count.mockResolvedValue(1)
    const response = await DELETE(request())
    expect(response.status).toBe(409)
    expect(dbMock.level.update).not.toHaveBeenCalled()
  })

  it('permits archiving only an empty unreferenced level', async () => {
    const response = await DELETE(request())
    expect(response.status).toBe(200)
    expect(dbMock.level.update).toHaveBeenCalledWith({ where: { id: levelId }, data: { isActive: false } })
  })
})
