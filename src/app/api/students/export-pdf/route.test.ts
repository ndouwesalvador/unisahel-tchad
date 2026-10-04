import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), tenant: vi.fn(), year: vi.fn(), students: vi.fn(), render: vi.fn(),
}))

vi.mock('@/lib/auth/config', () => ({ auth: mocks.auth }))
vi.mock('@/lib/db', () => ({ db: {
  tenant: { findUnique: mocks.tenant }, academicYear: { findFirst: mocks.year },
  student: { findMany: mocks.students },
} }))
vi.mock('@/lib/pdf/templates', () => ({ ListeEtudiantsPDF: () => null, paginateStudentList: () => [{}], renderPDF: mocks.render }))
vi.mock('@/lib/pdf/utils', () => ({ countPdfPages: () => 1 }))

const { POST } = await import('./route')
const request = (studentIds: unknown) => new NextRequest('http://localhost/api/students/export-pdf', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentIds }),
})

beforeEach(() => {
  vi.clearAllMocks()
  mocks.auth.mockResolvedValue({ user: { id: 'admin-A', role: 'SCOLARITE', tenantId: 'tenant-A', firstName: 'Agent', lastName: 'Test' } })
  mocks.tenant.mockResolvedValue({ id: 'tenant-A', name: 'Université A', shortName: 'UA', country: 'Tchad' })
  mocks.year.mockResolvedValue({ name: '2026-2027' })
  mocks.students.mockResolvedValue([{ id: 'student-A', firstName: 'Awa', lastName: 'Test', matricule: 'UA-001', gender: 'F', status: 'INSCRIT', currentProgram: { name: 'Informatique' }, currentLevel: { name: 'Licence 1' } }])
  mocks.render.mockResolvedValue(Buffer.from('%PDF-1.4\n'))
})

describe('POST /api/students/export-pdf', () => {
  it('refuses unauthenticated and non-administrative users', async () => {
    mocks.auth.mockResolvedValueOnce(null)
    expect((await POST(request(['student-A']))).status).toBe(401)
    mocks.auth.mockResolvedValueOnce({ user: { id: 'student-A', role: 'ETUDIANT', tenantId: 'tenant-A' } })
    expect((await POST(request(['student-A']))).status).toBe(403)
    expect(mocks.students).not.toHaveBeenCalled()
  })

  it('rejects invalid selections and students outside the caller institution', async () => {
    expect((await POST(request([]))).status).toBe(400)
    expect((await POST(request(['student-A', 3]))).status).toBe(400)
    mocks.students.mockResolvedValueOnce([])
    expect((await POST(request(['student-B']))).status).toBe(404)
    expect(mocks.students).toHaveBeenCalledWith(expect.objectContaining({ where: {
      tenantId: 'tenant-A', id: { in: ['student-B'] },
    } }))
    expect(mocks.render).not.toHaveBeenCalled()
  })

  it('renders the selected tenant-scoped roster as a private PDF', async () => {
    const response = await POST(request(['student-A', 'student-A']))
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/pdf')
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(mocks.students).toHaveBeenCalledWith(expect.objectContaining({ where: {
      tenantId: 'tenant-A', id: { in: ['student-A'] },
    } }))
    expect(mocks.render).toHaveBeenCalledTimes(1)
  })
})
