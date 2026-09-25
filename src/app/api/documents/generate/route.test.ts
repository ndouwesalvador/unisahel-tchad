import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { authMock, dbMock, renderPDFMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  renderPDFMock: vi.fn(),
  dbMock: {
    academicYear: { findFirst: vi.fn() },
    administrativeRegistration: { findFirst: vi.fn() },
    deliberation: { findFirst: vi.fn() },
    grade: { findMany: vi.fn() },
    officialDocument: { create: vi.fn() },
    semester: { findMany: vi.fn() },
    student: { findFirst: vi.fn(), findMany: vi.fn() },
    tenant: { findUnique: vi.fn() },
  },
}))

vi.mock('@/lib/auth/config', () => ({ auth: authMock }))
vi.mock('@/lib/db', () => ({ db: dbMock }))
vi.mock('@/lib/pdf/templates', () => ({
  renderPDF: renderPDFMock,
  ReleveNotesPDF: () => null,
  AttestationInscriptionPDF: () => null,
  CertificatScolaritePDF: () => null,
  PVDeliberationPDF: () => null,
  ListeEtudiantsPDF: () => null,
}))

const { POST } = await import('./route')

const tenantId = 'tenant-A'
const studentId = 'student-A'

function request(body: unknown) {
  return new NextRequest('http://localhost:3000/api/documents/generate', {
    method: 'POST', body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  authMock.mockResolvedValue({ user: { id: 'admin-A', role: 'ADMIN_INSTITUTION', tenantId } })
  dbMock.tenant.findUnique.mockResolvedValue({ id: tenantId, name: 'Université A' })
  dbMock.student.findFirst.mockResolvedValue({ id: studentId, firstName: 'Awa', lastName: 'Test', matricule: 'A-001' })
  dbMock.academicYear.findFirst.mockResolvedValue({ id: 'year-A', name: '2026-2027' })
  dbMock.grade.findMany.mockResolvedValue([])
  dbMock.semester.findMany.mockResolvedValue([])
  dbMock.administrativeRegistration.findFirst.mockResolvedValue(null)
  dbMock.deliberation.findFirst.mockResolvedValue(null)
  renderPDFMock.mockResolvedValue(Buffer.from('pdf'))
  dbMock.officialDocument.create.mockResolvedValue({ id: 'doc-A' })
})

describe('POST /api/documents/generate', () => {
  it('refuses document generation by a teacher role', async () => {
    authMock.mockResolvedValue({ user: { id: 'teacher-A', role: 'ENSEIGNANT', tenantId } })
    const response = await POST(request({ type: 'ATTESTATION_INSCRIPTION', tenantId, studentId }))

    expect(response.status).toBe(403)
    expect(dbMock.officialDocument.create).not.toHaveBeenCalled()
  })

  it('refuses a student account with no linked student record', async () => {
    authMock.mockResolvedValue({ user: { id: 'user-A', role: 'ETUDIANT', tenantId } })
    dbMock.student.findFirst.mockResolvedValue(null)

    const response = await POST(request({ type: 'RELEVE_NOTES', tenantId, studentId, sign: true }))

    expect(response.status).toBe(403)
    expect(dbMock.officialDocument.create).not.toHaveBeenCalled()
  })

  it('refuses a foreign student even when a student object is supplied by the client', async () => {
    dbMock.student.findFirst.mockResolvedValue(null)
    const response = await POST(request({ type: 'RELEVE_NOTES', tenantId, studentId: 'student-B', data: { student: { firstName: 'Forged' } } }))

    expect(response.status).toBe(404)
    expect(dbMock.student.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'student-B', tenantId } }))
    expect(dbMock.officialDocument.create).not.toHaveBeenCalled()
  })

  it('refuses an academic year outside the institution', async () => {
    dbMock.academicYear.findFirst.mockResolvedValue(null)
    const response = await POST(request({ type: 'RELEVE_NOTES', tenantId, studentId, academicYearId: 'year-B' }))

    expect(response.status).toBe(404)
    expect(dbMock.academicYear.findFirst).toHaveBeenCalledWith({ where: { id: 'year-B', tenantId }, select: { id: true, name: true } })
    expect(dbMock.grade.findMany).not.toHaveBeenCalled()
  })

  it('does not produce a transcript from client-provided grades', async () => {
    const response = await POST(request({ type: 'RELEVE_NOTES', tenantId, studentId, data: { ueGrades: [{ ue: 'Inventée', credits: 30 }] } }))

    expect(response.status).toBe(409)
    expect(dbMock.grade.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ studentId, academicYearId: 'year-A', student: { tenantId } }),
    }))
    expect(dbMock.officialDocument.create).not.toHaveBeenCalled()
  })

  it('requires a validated administrative registration for an attestation', async () => {
    const response = await POST(request({ type: 'ATTESTATION_INSCRIPTION', tenantId, studentId }))

    expect(response.status).toBe(409)
    expect(dbMock.administrativeRegistration.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { studentId, tenantId, academicYearId: 'year-A', status: 'INSCRIT' },
    }))
    expect(dbMock.officialDocument.create).not.toHaveBeenCalled()
  })

  it('generates an attestation from a validated registration and records its source', async () => {
    dbMock.administrativeRegistration.findFirst.mockResolvedValue({ id: 'registration-A', academicYear: { name: '2026-2027' } })
    const response = await POST(request({ type: 'ATTESTATION_INSCRIPTION', tenantId, studentId, data: { academicYear: 'Inventée' } }))

    expect(response.status).toBe(200)
    const saved = dbMock.officialDocument.create.mock.calls[0][0].data
    expect(JSON.parse(saved.content)).toMatchObject({ registrationId: 'registration-A', academicYear: '2026-2027' })
  })

  it('refuses a PV for a deliberation outside the institution', async () => {
    const response = await POST(request({ type: 'PV_DELIBERATION', tenantId, deliberationId: 'delib-B', data: { students: [{ name: 'Forged' }] } }))

    expect(response.status).toBe(404)
    expect(dbMock.deliberation.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'delib-B', tenantId } }))
    expect(dbMock.officialDocument.create).not.toHaveBeenCalled()
  })

  it('refuses a PV while the deliberation is not locked', async () => {
    dbMock.deliberation.findFirst.mockResolvedValue({ id: 'delib-A', isLocked: false, decisions: [] })
    const response = await POST(request({ type: 'PV_DELIBERATION', tenantId, deliberationId: 'delib-A' }))

    expect(response.status).toBe(409)
    expect(dbMock.officialDocument.create).not.toHaveBeenCalled()
  })

  it('stores a tenant-scoped snapshot based on real grades, not the submitted data', async () => {
    dbMock.grade.findMany.mockResolvedValue([{
      isLocked: true,
      teachingUnit: { id: 'unit-A', name: 'Mathématiques', code: 'MAT101', credits: 6, semester: { id: 'sem-A' } },
      courseElement: { name: 'Algèbre', coefficient: 2 },
      ccGrade: 14, examGrade: 16, finalGrade: 15,
    }])
    dbMock.semester.findMany.mockResolvedValue([{ name: 'Semestre 1', level: { program: { tenantId } } }])

    const response = await POST(request({ type: 'RELEVE_NOTES', tenantId, studentId, data: { student: { firstName: 'Forged' }, ueGrades: [{ ue: 'Fake' }] } }))

    expect(response.status).toBe(200)
    const saved = dbMock.officialDocument.create.mock.calls[0][0].data
    const snapshot = JSON.parse(saved.content)
    expect(saved.studentId).toBe(studentId)
    expect(saved.generatedBy).toBe('admin-A')
    expect(snapshot.student.firstName).toBe('Awa')
    expect(snapshot.ueGrades[0].ue).toBe('Mathématiques')
    expect(snapshot.academicYear).toBe('2026-2027')
  })

  it('refuses to sign a transcript with unlocked grades', async () => {
    dbMock.grade.findMany.mockResolvedValue([{
      isLocked: false,
      teachingUnit: { id: 'unit-A', name: 'Mathématiques', code: 'MAT101', credits: 6, semester: { id: 'sem-A' } },
    }])

    const response = await POST(request({ type: 'RELEVE_NOTES', tenantId, studentId, sign: true }))
    expect(response.status).toBe(409)
    expect(dbMock.officialDocument.create).not.toHaveBeenCalled()
  })
})
