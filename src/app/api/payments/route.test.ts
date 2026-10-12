import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { authMock, dbMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  dbMock: {
    payment: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    student: { findFirst: vi.fn(), findMany: vi.fn() },
    feeStructure: { findMany: vi.fn() },
    auditLog: {
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth/config', () => ({ auth: authMock }))
vi.mock('@/lib/db', () => ({ db: dbMock }))

const { GET, POST } = await import('./route')

const sessionUser = {
  id: 'user-1',
  email: 'caisse@example.com',
  role: 'CAISSE',
  tenantId: 'tenant-A',
  firstName: 'Caisse',
  lastName: 'User',
}

function req(url: string, init?: { method?: string; body?: string }) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), init)
}

beforeEach(() => {
  vi.clearAllMocks()
  authMock.mockResolvedValue({ user: sessionUser })
  dbMock.student.findFirst.mockResolvedValue(null)
  dbMock.student.findMany.mockResolvedValue([])
  dbMock.feeStructure.findMany.mockResolvedValue([])
})

// Regression tests for the Mobile Money honesty fix: these endpoints used to
// silently fake a successful initiation (flip status to PENDING, invent a
// transaction reference) with zero real provider call. They must now report
// the true state (not configured) instead of pretending to work.
describe('POST /api/payments?action=mobile-money-initiate', () => {
  it('returns 501 MOBILE_MONEY_NOT_CONFIGURED and does not touch the payment record', async () => {
    dbMock.payment.findFirst.mockResolvedValue({ id: 'pay-1', tenantId: 'tenant-A', transactionRef: null })

    const res = await POST(req('/api/payments?action=mobile-money-initiate', {
      method: 'POST',
      body: JSON.stringify({ paymentId: 'pay-1', provider: 'ORANGE', phoneNumber: '+235000000' }),
    }))
    const body = await res.json()

    expect(res.status).toBe(501)
    expect(body.error).toBe('MOBILE_MONEY_NOT_CONFIGURED')
    expect(dbMock.payment.update).not.toHaveBeenCalled()
  })

  it('returns 404 when the payment does not belong to the caller tenant', async () => {
    dbMock.payment.findFirst.mockResolvedValue(null)

    const res = await POST(req('/api/payments?action=mobile-money-initiate', {
      method: 'POST',
      body: JSON.stringify({ paymentId: 'pay-x', provider: 'ORANGE', phoneNumber: '+235000000' }),
    }))

    expect(res.status).toBe(404)
    expect(dbMock.payment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-A' }) })
    )
  })
})

describe('GET /api/payments?mobileMoneyStatus=true', () => {
  it('returns 501 MOBILE_MONEY_NOT_CONFIGURED instead of a fabricated PENDING status', async () => {
    dbMock.payment.findFirst.mockResolvedValue({ id: 'pay-1', tenantId: 'tenant-A' })

    const res = await GET(req('/api/payments?id=pay-1&mobileMoneyStatus=true'))
    const body = await res.json()

    expect(res.status).toBe(501)
    expect(body.error).toBe('MOBILE_MONEY_NOT_CONFIGURED')
  })
})

describe('auth on the payments route', () => {
  it('rejects an unauthenticated request', async () => {
    authMock.mockResolvedValue(null)
    const res = await GET(req('/api/payments'))
    expect(res.status).toBe(401)
  })
})

describe('GET /api/payments?studentLookup=true', () => {
  it('returns a minimal tenant-scoped student lookup for caisse', async () => {
    dbMock.student.findMany.mockResolvedValue([{ id: 'student-A', firstName: 'Succès', lastName: 'Ouangbe', matricule: 'UPM-001', currentProgram: { name: 'Master GE' }, currentLevel: { name: 'M1' } }])
    const response = await GET(req('/api/payments?studentLookup=true&search=succ&limit=6'))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ data: [{ id: 'student-A', matricule: 'UPM-001' }] })
    expect(dbMock.student.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-A', OR: expect.any(Array) },
      select: {
        id: true, firstName: true, lastName: true, matricule: true,
        currentProgram: { select: { name: true } }, currentLevel: { select: { name: true } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      take: 6,
    })
  })

  it('refuses the cashier lookup to an unrelated oversight role', async () => {
    authMock.mockResolvedValue({ user: { ...sessionUser, role: 'RECTORAT' } })
    const response = await GET(req('/api/payments?studentLookup=true&search=succ'))
    expect(response.status).toBe(403)
    expect(dbMock.student.findMany).not.toHaveBeenCalled()
  })
})

describe('GET /api/payments?receipt=true', () => {
  it('allows a student to retrieve only their own validated receipt', async () => {
    authMock.mockResolvedValue({ user: { ...sessionUser, id: 'student-user-A', role: 'ETUDIANT' } })
    dbMock.student.findFirst.mockResolvedValue({ id: 'student-A' })
    dbMock.payment.findFirst.mockResolvedValue(null)

    const response = await GET(req('/api/payments?receipt=true&id=payment-A'))

    expect(response.status).toBe(404)
    expect(dbMock.payment.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'payment-A', tenantId: 'tenant-A', studentId: 'student-A', status: 'VALIDATED' },
    }))
  })
})
