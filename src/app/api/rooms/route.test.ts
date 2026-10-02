import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { authMock, dbMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  dbMock: {
    room: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}))

vi.mock('@/lib/auth/config', () => ({ auth: authMock }))
vi.mock('@/lib/db', () => ({ db: dbMock }))

const { POST, PUT } = await import('./route')
const tenantId = 'ctenant0000000000000000a1'
const roomId = 'croom000000000000000001'
const roomBody = { name: 'Salle 12', type: 'SALLE', capacity: 30, building: 'Campus central', equipment: 'Tableau', status: 'libre' }

function request(method: 'POST' | 'PUT', body: unknown, id?: string) {
  return new NextRequest(`http://localhost:3000/api/rooms?entity=room${id ? `&id=${id}` : ''}`, { method, body: JSON.stringify(body) })
}

beforeEach(() => {
  vi.clearAllMocks()
  authMock.mockResolvedValue({ user: { id: 'cadmin000000000000000001', role: 'ADMIN_INSTITUTION', tenantId } })
  dbMock.room.findFirst.mockResolvedValue(null)
  dbMock.room.create.mockResolvedValue({ id: roomId, ...roomBody })
  dbMock.room.update.mockResolvedValue({ id: roomId, ...roomBody })
  dbMock.auditLog.create.mockResolvedValue({ id: 'caudit000000000000000001' })
})

describe('room catalogue', () => {
  it('creates a room for the current institution', async () => {
    const response = await POST(request('POST', roomBody))
    expect(response.status).toBe(201)
    expect(dbMock.room.create).toHaveBeenCalledWith({ data: { tenantId, ...roomBody } })
  })

  it('blocks teachers from creating rooms', async () => {
    authMock.mockResolvedValue({ user: { id: 'cteacher0000000000000001', role: 'ENSEIGNANT', tenantId } })
    const response = await POST(request('POST', roomBody))
    expect(response.status).toBe(403)
    expect(dbMock.room.create).not.toHaveBeenCalled()
  })

  it('rejects duplicate names', async () => {
    dbMock.room.findFirst.mockResolvedValue({ id: 'croom000000000000000002' })
    const response = await POST(request('POST', roomBody))
    expect(response.status).toBe(409)
    expect(dbMock.room.create).not.toHaveBeenCalled()
  })

  it('updates only a room belonging to the institution', async () => {
    const missing = await PUT(request('PUT', roomBody, roomId))
    expect(missing.status).toBe(404)
    dbMock.room.findFirst.mockResolvedValueOnce({ id: roomId }).mockResolvedValueOnce(null)
    const response = await PUT(request('PUT', { ...roomBody, capacity: 40 }, roomId))
    expect(response.status).toBe(200)
    expect(dbMock.room.update).toHaveBeenCalledWith({ where: { id: roomId }, data: { ...roomBody, capacity: 40 } })
  })
})
