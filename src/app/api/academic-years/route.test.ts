import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ years: vi.fn() }))
vi.mock('@/lib/auth/helpers', () => ({ withTenantAuth: (handler: unknown) => handler }))
vi.mock('@/lib/db', () => ({ db: { academicYear: { findMany: mocks.years } } }))

const { GET } = await import('./route')
const get = GET as unknown as (user: { id: string; role: string; tenantId: string }, tenantId: string, request: NextRequest) => Promise<Response>

describe('student academic-year selector', () => {
  it('returns only public year fields to the signed-in student', async () => {
    mocks.years.mockResolvedValue([{ id: 'year-A', name: '2026-2027', isCurrent: true }])
    const response = await get({ id: 'student-A', role: 'ETUDIANT', tenantId: 'tenant-A' }, 'tenant-A', new NextRequest('http://localhost/api/academic-years'))
    expect(response.status).toBe(200)
    expect(mocks.years).toHaveBeenCalledWith({ where: { tenantId: 'tenant-A' },
      select: { id: true, name: true, startDate: true, endDate: true, isCurrent: true }, orderBy: { startDate: 'desc' } })
  })
})
