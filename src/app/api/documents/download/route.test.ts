import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { dbMock, renderMock } = vi.hoisted(() => ({
  dbMock: {
    officialDocument: { findFirst: vi.fn(), create: vi.fn() },
    student: { findFirst: vi.fn() },
    user: { findFirst: vi.fn() },
    academicYear: { findFirst: vi.fn() },
    department: { findFirst: vi.fn() },
  },
  renderMock: vi.fn(async (_element: unknown) => Buffer.from('%PDF-1.4\n/Type /Page\n')),
}))

vi.mock('@/lib/db', () => ({ db: dbMock }))
vi.mock('@/lib/auth/helpers', () => ({ withTenantAuth: (handler: unknown) => handler }))
vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn(async () => 'data:image/png;base64,test') } }))
vi.mock('@/lib/pdf/templates', () => ({
  renderPDF: renderMock,
  ReleveNotesPDF: () => null,
  AttestationInscriptionPDF: () => null,
  CertificatScolaritePDF: () => null,
  AttestationNiveauPDF: () => null,
  DiplomePDF: () => null,
  PVDeliberationPDF: () => null,
}))

const { GET } = await import('./route')
const handler = GET as unknown as (user: { id: string; role: string; tenantId: string }, tenantId: string, request: NextRequest) => Promise<Response>
const request = new NextRequest('http://localhost:3000/api/documents/download?id=doc-A')
const document = {
  id: 'doc-A', tenantId: 'tenant-A', studentId: 'student-A', type: 'RELEVE_NOTES',
  number: 'RELEVE_NOTES-001', verificationCode: 'VERIFY001', validatedAt: new Date(),
  createdAt: new Date('2026-09-30T10:00:00.000Z'),
  content: JSON.stringify({ type: 'RELEVE_NOTES', tenant: { name: 'Université A' },
    student: { firstName: 'Awa', lastName: 'Test' }, academicYear: '2026-2027',
    semester: 'Semestre 1', ueGrades: [] }),
}

beforeEach(() => {
  vi.clearAllMocks()
  dbMock.officialDocument.findFirst.mockResolvedValue(document)
  dbMock.student.findFirst.mockResolvedValue({ id: 'student-A' })
  dbMock.department.findFirst.mockResolvedValue({ headName: null })
})

describe('GET /api/documents/download', () => {
  it('downloads the saved reference without issuing another document', async () => {
    const response = await handler({ id: 'admin-A', role: 'ADMIN_INSTITUTION', tenantId: 'tenant-A' }, 'tenant-A', request)
    expect(response.status).toBe(200)
    expect(response.headers.get('X-Doc-Number')).toBe('RELEVE_NOTES-001')
    expect(response.headers.get('Content-Type')).toBe('application/pdf')
    expect(dbMock.officialDocument.findFirst).toHaveBeenCalledWith({ where: { id: 'doc-A', tenantId: 'tenant-A' } })
    expect(dbMock.officialDocument.create).not.toHaveBeenCalled()
    expect(renderMock).toHaveBeenCalledOnce()
    const rendered = renderMock.mock.calls[0][0] as { props: { docNumber: string; verificationCode: string } }
    expect(rendered.props.docNumber).toBe('RELEVE_NOTES-001')
    expect(rendered.props.verificationCode).toBe('VERIFY001')
  })

  it('does not let a student download another student’s document', async () => {
    dbMock.student.findFirst.mockResolvedValue({ id: 'student-B' })
    const response = await handler({ id: 'student-user-B', role: 'ETUDIANT', tenantId: 'tenant-A' }, 'tenant-A', request)
    expect(response.status).toBe(403)
    expect(renderMock).not.toHaveBeenCalled()
  })

  it('rejects unsupported staff roles and corrupt snapshots', async () => {
    const teacher = await handler({ id: 'teacher-A', role: 'ENSEIGNANT', tenantId: 'tenant-A' }, 'tenant-A', request)
    expect(teacher.status).toBe(403)
    dbMock.officialDocument.findFirst.mockResolvedValue({ ...document, content: '{bad json' })
    const corrupt = await handler({ id: 'admin-A', role: 'ADMIN_INSTITUTION', tenantId: 'tenant-A' }, 'tenant-A', request)
    expect(corrupt.status).toBe(409)
    expect(renderMock).not.toHaveBeenCalled()
  })

  it('allows only the active jury of the saved PV department', async () => {
    dbMock.officialDocument.findFirst.mockResolvedValue({ ...document, studentId: null, type: 'PV_DELIBERATION',
      content: JSON.stringify({ type: 'PV_DELIBERATION', tenant: { name: 'Université A' },
        departmentId: 'department-A', departmentName: 'Département A', academicYear: '2026-2027',
        session: { name: 'Session normale', date: '2026-10-04', type: 'NORMALE' }, members: [], students: [] }) })
    dbMock.user.findFirst.mockResolvedValue({ id: 'jury-A' })
    const allowed = await handler({ id: 'jury-A', role: 'JURY', tenantId: 'tenant-A' }, 'tenant-A', request)
    expect(allowed.status).toBe(200)
    expect(dbMock.user.findFirst).toHaveBeenCalledWith({ where: {
      id: 'jury-A', tenantId: 'tenant-A', role: 'JURY', isActive: true, departmentId: 'department-A',
      department: { isActive: true },
    }, select: { id: true } })
    dbMock.user.findFirst.mockResolvedValue(null)
    const denied = await handler({ id: 'jury-B', role: 'JURY', tenantId: 'tenant-A' }, 'tenant-A', request)
    expect(denied.status).toBe(403)
  })

  it('reuses the original issue date on a historical certificate', async () => {
    dbMock.officialDocument.findFirst.mockResolvedValue({ ...document, type: 'CERTIFICAT_SCOLARITE',
      content: JSON.stringify({ type: 'CERTIFICAT_SCOLARITE', tenant: { name: 'Université A' },
        student: { firstName: 'Awa', lastName: 'Test' }, academicYear: '2026-2027' }) })
    const response = await handler({ id: 'admin-A', role: 'ADMIN_INSTITUTION', tenantId: 'tenant-A' }, 'tenant-A', request)
    expect(response.status).toBe(200)
    const rendered = renderMock.mock.calls[0][0] as { props: { issuedAt: string } }
    expect(rendered.props.issuedAt).toBe('2026-09-30T10:00:00.000Z')
  })
})
