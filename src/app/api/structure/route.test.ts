import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { authMock, dbMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  dbMock: {
    teachingUnit: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    courseElement: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    teacher: { findFirst: vi.fn() },
    academicYear: { findFirst: vi.fn() },
    teachingService: { findFirst: vi.fn(), create: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}))

vi.mock('@/lib/auth/config', () => ({ auth: authMock }))
vi.mock('@/lib/db', () => ({ db: dbMock }))

const { PUT } = await import('./route')

const tenantId = 'ctenant0000000000000000a1'
const unitId = 'cunit00000000000000000001'
const elementId = 'celement0000000000000001'

function request(type: string, body: unknown) {
  return new NextRequest(`http://localhost:3000/api/structure?type=${type}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  authMock.mockResolvedValue({ user: { id: 'cadmin000000000000000001', role: 'ADMIN_INSTITUTION', tenantId } })
  dbMock.teachingUnit.findFirst.mockResolvedValue({ id: unitId })
  dbMock.courseElement.findFirst.mockResolvedValue({ id: elementId })
  dbMock.teachingUnit.update.mockResolvedValue({ id: unitId })
  dbMock.courseElement.update.mockResolvedValue({ id: elementId })
  dbMock.teacher.findFirst.mockResolvedValue({ id: 'cteacher0000000000000001' })
  dbMock.teachingUnit.findUnique.mockResolvedValue({ responsibleId: null })
  dbMock.courseElement.findUnique.mockResolvedValue({ teacherId: null })
  dbMock.auditLog.create.mockResolvedValue({ id: 'caudit000000000000000001' })
  dbMock.academicYear.findFirst.mockResolvedValue(null)
})

describe('PUT /api/structure', () => {
  it('updates an owned UE with validated credits and order', async () => {
    const response = await PUT(request('teaching-unit', {
      id: unitId, code: 'INF101', name: 'Algorithmique', credits: 6,
      type: 'FONDAMENTALE', compensable: false, orderIndex: 0,
    }))

    expect(response.status).toBe(200)
    expect(dbMock.teachingUnit.findFirst).toHaveBeenCalledWith({
      where: { id: unitId, semester: { level: { program: { tenantId } } } },
      select: { id: true },
    })
    expect(dbMock.teachingUnit.update).toHaveBeenCalledWith({
      where: { id: unitId },
      data: { code: 'INF101', name: 'Algorithmique', credits: 6, type: 'FONDAMENTALE', compensable: false, orderIndex: 0 },
    })
  })

  it('updates an owned matter with fractional teaching hours', async () => {
    const response = await PUT(request('course-element', {
      id: elementId, name: 'Structures de données', coefficient: 1.5,
      hoursCM: 12.5, hoursTD: 0, hoursTP: 15, hoursStage: 0, hoursPersonal: 10, orderIndex: 1,
    }))

    expect(response.status).toBe(200)
    expect(dbMock.courseElement.update).toHaveBeenCalledWith({
      where: { id: elementId },
      data: { name: 'Structures de données', coefficient: 1.5, hoursCM: 12.5, hoursTD: 0, hoursTP: 15, hoursStage: 0, hoursPersonal: 10, orderIndex: 1 },
    })
  })

  it('rejects invalid credits and hours before writing', async () => {
    const invalidUnit = await PUT(request('teaching-unit', { id: unitId, credits: -2 }))
    const invalidMatter = await PUT(request('course-element', { id: elementId, hoursStage: -1 }))

    expect(invalidUnit.status).toBe(400)
    expect(invalidMatter.status).toBe(400)
    expect(dbMock.teachingUnit.update).not.toHaveBeenCalled()
    expect(dbMock.courseElement.update).not.toHaveBeenCalled()
  })

  it('rejects an UE outside the signed-in institution', async () => {
    dbMock.teachingUnit.findFirst.mockResolvedValue(null)
    const response = await PUT(request('teaching-unit', { id: unitId, name: 'Autre nom' }))

    expect(response.status).toBe(404)
    expect(dbMock.teachingUnit.update).not.toHaveBeenCalled()
  })

  it('only allows the institution admin to change the maquette', async () => {
    authMock.mockResolvedValue({ user: { id: 'cteacher0000000000000001', role: 'ENSEIGNANT', tenantId } })
    const response = await PUT(request('course-element', { id: elementId, teacherId: null }))
    expect(response.status).toBe(403)
    expect(dbMock.courseElement.update).not.toHaveBeenCalled()
  })

  it('rejects a teacher who is not active in the same institution', async () => {
    dbMock.teacher.findFirst.mockResolvedValue(null)
    const response = await PUT(request('course-element', { id: elementId, teacherId: 'cteacher0000000000000001' }))
    expect(response.status).toBe(404)
    expect(dbMock.courseElement.update).not.toHaveBeenCalled()
  })

  it('requires explicit confirmation before reassigning a course element', async () => {
    dbMock.courseElement.findUnique.mockResolvedValue({ teacherId: 'cteacher0000000000000002' })
    const body = { id: elementId, teacherId: 'cteacher0000000000000001' }
    const refused = await PUT(request('course-element', body))
    expect(refused.status).toBe(409)
    expect(dbMock.courseElement.update).not.toHaveBeenCalled()

    const confirmed = await PUT(request('course-element', { ...body, confirmReassignment: true }))
    expect(confirmed.status).toBe(200)
    expect(dbMock.courseElement.update).toHaveBeenCalledWith({ where: { id: elementId }, data: { teacherId: body.teacherId } })
  })

  it('can remove a responsible teacher without reassigning the UE', async () => {
    dbMock.teachingUnit.findUnique.mockResolvedValue({ responsibleId: 'cteacher0000000000000001' })
    const response = await PUT(request('teaching-unit', { id: unitId, responsibleId: null }))
    expect(response.status).toBe(200)
    expect(dbMock.teachingUnit.update).toHaveBeenCalledWith({ where: { id: unitId }, data: { responsibleId: null } })
  })
})
