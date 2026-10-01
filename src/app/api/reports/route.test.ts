import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { createReport } = vi.hoisted(() => ({ createReport: vi.fn() }))

vi.mock('@/lib/db', () => ({ db: { report: { create: createReport } } }))
vi.mock('@/lib/auth/helpers', () => ({ withTenantAuth: (handler: unknown) => handler }))

const { POST } = await import('./route')

describe('POST /api/reports', () => {
  it('refuses to create a pending report without an actual generator', async () => {
    const user = { id: 'admin-A', role: 'ADMIN_INSTITUTION', tenantId: 'tenant-A' }
    const request = new NextRequest('http://localhost:3000/api/reports', {
      method: 'POST',
      body: JSON.stringify({ name: 'Bilan', type: 'INSTITUTIONAL', format: 'PDF' }),
    })
    const handler = POST as unknown as (sessionUser: typeof user, tenantId: string, request: NextRequest) => Promise<Response>

    const response = await handler(user, 'tenant-A', request)

    expect(response.status).toBe(501)
    expect((await response.json()).error).toBe('REPORT_GENERATION_UNAVAILABLE')
    expect(createReport).not.toHaveBeenCalled()
  })
})
