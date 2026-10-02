import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { authMock, dbMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  dbMock: {
    level: { findFirst: vi.fn(), delete: vi.fn(), count: vi.fn() },
    faculty: { findFirst: vi.fn(), delete: vi.fn() },
    department: { findFirst: vi.fn(), delete: vi.fn(), count: vi.fn() },
    program: { findFirst: vi.fn(), delete: vi.fn(), count: vi.fn() },
    teacher: { count: vi.fn() },
    semester: { count: vi.fn() },
    student: { count: vi.fn() },
    administrativeRegistration: { count: vi.fn() },
    admission: { count: vi.fn() },
    admissionCampaign: { count: vi.fn() },
    deliberation: { count: vi.fn() },
    feeStructure: { count: vi.fn() },
    timetableSlot: { count: vi.fn() },
    pedagogicalRegistration: { count: vi.fn() },
    grade: { count: vi.fn() },
    scheduledExam: { count: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/auth/config', () => ({ auth: authMock }))
vi.mock('@/lib/db', () => ({ db: dbMock }))

const { DELETE, PUT } = await import('./route')
const tenantId = 'ctenant0000000000000000a1'
const levelId = 'clevel000000000000000001'
const request = () => new NextRequest(`http://localhost:3000/api/structure?type=level&id=${levelId}`, { method: 'DELETE' })

beforeEach(() => {
  vi.clearAllMocks()
  authMock.mockResolvedValue({ user: { id: 'cadmin000000000000000001', role: 'ADMIN_INSTITUTION', tenantId } })
  dbMock.level.findFirst.mockResolvedValue({ id: levelId })
  dbMock.faculty.findFirst.mockResolvedValue({ id: 'f1' })
  dbMock.department.findFirst.mockResolvedValue({ id: 'd1' })
  dbMock.program.findFirst.mockResolvedValue({ id: 'p1' })
  dbMock.$transaction.mockImplementation(async (callback: (tx: typeof dbMock) => unknown) => callback(dbMock))
  for (const delegate of [dbMock.level, dbMock.department, dbMock.program, dbMock.teacher, dbMock.semester, dbMock.student, dbMock.administrativeRegistration, dbMock.admission, dbMock.admissionCampaign, dbMock.deliberation, dbMock.feeStructure, dbMock.timetableSlot, dbMock.pedagogicalRegistration, dbMock.grade, dbMock.scheduledExam]) {
    delegate.count.mockResolvedValue(0)
  }
})

describe('parent structure deletion', () => {
  it('blocks removal of a faculty that still owns a department', async () => {
    dbMock.department.count.mockResolvedValue(1)
    const response = await DELETE(new NextRequest('http://localhost:3000/api/structure?type=faculty&id=f1', { method: 'DELETE' }))
    expect(response.status).toBe(409)
    expect(dbMock.faculty.delete).not.toHaveBeenCalled()
  })

  it('blocks removal of a department linked to a teacher', async () => {
    dbMock.teacher.count.mockResolvedValue(1)
    const response = await DELETE(new NextRequest('http://localhost:3000/api/structure?type=department&id=d1', { method: 'DELETE' }))
    expect(response.status).toBe(409)
    expect(dbMock.department.delete).not.toHaveBeenCalled()
  })

  it('blocks removal of a program referenced by a student', async () => {
    dbMock.student.count.mockResolvedValue(1)
    const response = await DELETE(new NextRequest('http://localhost:3000/api/structure?type=program&id=p1', { method: 'DELETE' }))
    expect(response.status).toBe(409)
    expect(dbMock.program.delete).not.toHaveBeenCalled()
  })

  it('deletes an empty faculty instead of masking it', async () => {
    const response = await DELETE(new NextRequest('http://localhost:3000/api/structure?type=faculty&id=f1', { method: 'DELETE' }))
    expect(response.status).toBe(200)
    expect(dbMock.faculty.delete).toHaveBeenCalledWith({ where: { id: 'f1' } })
  })
})

describe('level archive guard', () => {
  it('does not hide a level with a curriculum', async () => {
    dbMock.semester.count.mockResolvedValue(1)
    const response = await DELETE(request())
    expect(response.status).toBe(409)
    expect(dbMock.level.delete).not.toHaveBeenCalled()
  })

  it('does not hide a level referenced by a student', async () => {
    dbMock.student.count.mockResolvedValue(1)
    const response = await DELETE(request())
    expect(response.status).toBe(409)
    expect(dbMock.level.delete).not.toHaveBeenCalled()
  })

  it('deletes only an empty unreferenced level', async () => {
    const response = await DELETE(request())
    expect(response.status).toBe(200)
    expect(dbMock.level.delete).toHaveBeenCalledWith({ where: { id: levelId } })
  })

  it('blocks the PUT isActive shortcut for a level with semesters', async () => {
    dbMock.semester.count.mockResolvedValue(1)
    const response = await PUT(new NextRequest('http://localhost:3000/api/structure?type=level', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: levelId, isActive: false }),
    }))
    expect(response.status).toBe(400)
    expect(dbMock.level.delete).not.toHaveBeenCalled()
  })
})
