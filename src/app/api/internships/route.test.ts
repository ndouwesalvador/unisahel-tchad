import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  internshipFindMany: vi.fn(), internshipCount: vi.fn(), internshipFindFirst: vi.fn(), internshipUpdate: vi.fn(),
  partnerFindMany: vi.fn(), userFindMany: vi.fn(),
}))

vi.mock('@/lib/auth/helpers', () => ({ withTenantAuth: (handler: unknown) => handler }))
vi.mock('@/lib/db', () => ({ db: {
  internship: { findMany: mocks.internshipFindMany, count: mocks.internshipCount, findFirst: mocks.internshipFindFirst, update: mocks.internshipUpdate },
  internshipPartner: { findMany: mocks.partnerFindMany },
  user: { findMany: mocks.userFindMany },
} }))

const { GET, PUT } = await import('./route')
const get = GET as unknown as (user: { id: string; role: string }, tenantId: string, request: NextRequest) => Promise<Response>
const put = PUT as unknown as (user: { id: string; role: string }, tenantId: string, request: NextRequest) => Promise<Response>
const supervisor = { id: 'supervisor-A', role: 'MAITRE_STAGE' }
const admin = { id: 'admin-A', role: 'ADMIN_INSTITUTION' }

beforeEach(() => {
  vi.resetAllMocks()
  mocks.internshipFindMany.mockResolvedValue([])
  mocks.internshipCount.mockResolvedValue(0)
  mocks.partnerFindMany.mockResolvedValue([])
  mocks.userFindMany.mockResolvedValue([])
})

describe('internship supervisor scope', () => {
  it('lists only internships explicitly assigned to the signed-in supervisor', async () => {
    const response = await get(supervisor, 'tenant-A', new NextRequest('http://localhost/api/internships'))
    expect(response.status).toBe(200)
    expect(mocks.internshipFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId: 'tenant-A', supervisorUserId: 'supervisor-A' },
    }))
    expect(mocks.partnerFindMany).not.toHaveBeenCalled()
  })

  it('does not let a supervisor evaluate an internship assigned to another account', async () => {
    mocks.internshipFindFirst.mockResolvedValue(null)
    const response = await put(supervisor, 'tenant-A', new NextRequest('http://localhost/api/internships?id=stage-B', {
      method: 'PUT', body: JSON.stringify({ evaluation: 'BIEN' }),
    }))
    expect(response.status).toBe(404)
    expect(mocks.internshipFindFirst).toHaveBeenCalledWith({
      where: { id: 'stage-B', tenantId: 'tenant-A', supervisorUserId: 'supervisor-A' },
    })
    expect(mocks.internshipUpdate).not.toHaveBeenCalled()
  })

  it('lets a supervisor record an evaluation but not change convention status', async () => {
    mocks.internshipFindFirst.mockResolvedValue({ id: 'stage-A', supervisorUserId: 'supervisor-A', status: 'EN_COURS' })
    mocks.internshipUpdate.mockResolvedValue({ id: 'stage-A', evaluation: 'BIEN' })
    const forbidden = await put(supervisor, 'tenant-A', new NextRequest('http://localhost/api/internships?id=stage-A', {
      method: 'PUT', body: JSON.stringify({ status: 'TERMINE' }),
    }))
    expect(forbidden.status).toBe(403)
    expect(mocks.internshipUpdate).not.toHaveBeenCalled()

    const allowed = await put(supervisor, 'tenant-A', new NextRequest('http://localhost/api/internships?id=stage-A', {
      method: 'PUT', body: JSON.stringify({ evaluation: 'BIEN' }),
    }))
    expect(allowed.status).toBe(200)
    expect(mocks.internshipUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'stage-A' } }))
  })

  it('exposes active stage-supervisor accounts only to central managers', async () => {
    mocks.userFindMany.mockResolvedValue([{ id: 'supervisor-A', firstName: 'Nale', lastName: 'Test', email: 'nale@upm.td' }])
    const response = await get(admin, 'tenant-A', new NextRequest('http://localhost/api/internships?supervisors=true'))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ supervisors: [{ id: 'supervisor-A', email: 'nale@upm.td' }] })
    expect(mocks.userFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: 'tenant-A', role: 'MAITRE_STAGE', isActive: true } }))
  })
})
