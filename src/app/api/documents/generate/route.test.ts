import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { authMock, dbMock, renderPDFMock, eligibilityMock, readinessMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  renderPDFMock: vi.fn(),
  readinessMock: vi.fn(),
  eligibilityMock: { level: vi.fn(), diploma: vi.fn() },
  dbMock: {
    academicYear: { findFirst: vi.fn() },
    administrativeRegistration: { findFirst: vi.fn(), findMany: vi.fn() },
    deliberation: { findFirst: vi.fn() },
    grade: { findMany: vi.fn() },
    pedagogicalRegistration: { findMany: vi.fn() },
    officialDocument: { create: vi.fn() },
    program: { findFirst: vi.fn() },
    level: { findFirst: vi.fn() },
    semester: { findMany: vi.fn() },
    student: { findFirst: vi.fn(), findMany: vi.fn() },
    tenant: { findUnique: vi.fn() },
  },
}))

vi.mock('@/lib/auth/config', () => ({ auth: authMock }))
vi.mock('@/lib/db', () => ({ db: dbMock }))
vi.mock('@/lib/deliberations/readiness', () => ({ computeGradeReadiness: readinessMock }))
vi.mock('@/lib/documents/eligibility', () => ({
  AwardEligibilityError: class AwardEligibilityError extends Error {},
  getValidatedLevelAward: eligibilityMock.level,
  getValidatedDiplomaAward: eligibilityMock.diploma,
}))
vi.mock('@/lib/pdf/templates', () => ({
  renderPDF: renderPDFMock,
  ReleveNotesPDF: () => null,
  AttestationInscriptionPDF: () => null,
  AttestationNiveauPDF: () => null,
  DiplomePDF: () => null,
  CertificatScolaritePDF: () => null,
  PVDeliberationPDF: () => null,
  ListeEtudiantsPDF: () => null,
}))

const { POST } = await import('./route')
const { AwardEligibilityError } = await import('@/lib/documents/eligibility')

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
  dbMock.pedagogicalRegistration.findMany.mockResolvedValue([])
  dbMock.semester.findMany.mockResolvedValue([])
  dbMock.administrativeRegistration.findFirst.mockResolvedValue(null)
  dbMock.administrativeRegistration.findMany.mockResolvedValue([])
  dbMock.program.findFirst.mockResolvedValue(null)
  dbMock.level.findFirst.mockResolvedValue(null)
  dbMock.deliberation.findFirst.mockResolvedValue(null)
  eligibilityMock.level.mockResolvedValue({
    deliberationId: 'delib-A', decisionId: 'decision-A', creditsAcquired: 60,
    juryDate: new Date('2026-09-30'),
  })
  eligibilityMock.diploma.mockResolvedValue({
    program: { id: 'program-A', name: 'Génie informatique', diplomaType: 'Licence' },
    finalLevel: { id: 'level-3', name: 'Licence 3' }, creditsRequired: 180,
    finalDecision: { juryDate: new Date('2026-09-30') },
    awards: [{ academicYearId: 'year-A', levelId: 'level-3', deliberationId: 'delib-A', decisionId: 'decision-A', creditsAcquired: 60 }],
  })
  readinessMock.mockResolvedValue({ ready: true, studentIds: [studentId], studentsTotal: 1 })
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

  it('requires validation before issuing an attestation of level or a diploma', async () => {
    for (const type of ['ATTESTATION_NIVEAU', 'DIPLOME']) {
      const response = await POST(request({ type, tenantId, studentId, sign: false }))
      expect(response.status).toBe(409)
    }
    expect(dbMock.officialDocument.create).not.toHaveBeenCalled()
  })

  it('issues a level certificate from the historical registration and validated jury award', async () => {
    dbMock.administrativeRegistration.findMany.mockResolvedValue([{ programId: 'program-A', levelId: 'level-3' }])
    dbMock.program.findFirst.mockResolvedValue({ id: 'program-A', name: 'Génie informatique' })
    dbMock.level.findFirst.mockResolvedValue({ id: 'level-3', name: 'Licence 3' })
    const response = await POST(request({ type: 'ATTESTATION_NIVEAU', tenantId, studentId, academicYearId: 'year-A', sign: true }))
    expect(response.status).toBe(200)
    expect(eligibilityMock.level).toHaveBeenCalledWith({ tenantId, studentId, academicYearId: 'year-A', programId: 'program-A', levelId: 'level-3' })
    const saved = dbMock.officialDocument.create.mock.calls[0][0].data
    expect(saved.validatedBy).toBe('admin-A')
    expect(JSON.parse(saved.content)).toMatchObject({ deliberationId: 'delib-A', levelId: 'level-3' })
  })

  it('issues a diploma only from the verified multi-level award', async () => {
    const response = await POST(request({ type: 'DIPLOME', tenantId, studentId, academicYearId: 'year-A', sign: true, data: { title: 'Faux diplôme' } }))
    expect(response.status).toBe(200)
    expect(eligibilityMock.diploma).toHaveBeenCalledWith({ tenantId, studentId, academicYearId: 'year-A' })
    const saved = dbMock.officialDocument.create.mock.calls[0][0].data
    const snapshot = JSON.parse(saved.content)
    expect(saved.validatedBy).toBe('admin-A')
    expect(snapshot.diploma.title).toBe('Licence')
    expect(snapshot.awards[0].decisionId).toBe('decision-A')
  })

  it('returns a conflict and stores nothing when a prior level is in debt', async () => {
    eligibilityMock.diploma.mockRejectedValue(new AwardEligibilityError('Un niveau antérieur reste en dette'))
    const response = await POST(request({ type: 'DIPLOME', tenantId, studentId, academicYearId: 'year-A', sign: true }))
    expect(response.status).toBe(409)
    expect((await response.json()).error).toContain('dette')
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
    const response = await POST(request({ type: 'PV_DELIBERATION', tenantId, deliberationId: 'delib-B', sign: true, data: { members: [{ name: 'Président Test', role: 'President' }], students: [{ name: 'Forged' }] } }))

    expect(response.status).toBe(404)
    expect(dbMock.deliberation.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'delib-B', tenantId } }))
    expect(dbMock.officialDocument.create).not.toHaveBeenCalled()
  })

  it('refuses a PV while the deliberation is not locked', async () => {
    dbMock.deliberation.findFirst.mockResolvedValue({ id: 'delib-A', isLocked: false, decisions: [] })
    const response = await POST(request({ type: 'PV_DELIBERATION', tenantId, deliberationId: 'delib-A', sign: true, data: { members: [{ name: 'Président Test', role: 'President' }] } }))

    expect(response.status).toBe(409)
    expect(dbMock.officialDocument.create).not.toHaveBeenCalled()
  })

  it('stores a tenant-scoped snapshot based on real grades, not the submitted data', async () => {
    dbMock.grade.findMany.mockResolvedValue([{
      isLocked: true,
      teachingUnitId: 'unit-A', courseElementId: 'element-A',
      teachingUnit: { id: 'unit-A', name: 'Mathématiques', code: 'MAT101', credits: 6, semester: { id: 'sem-A' } },
      courseElement: { teachingUnitId: 'unit-A', name: 'Algèbre', coefficient: 2 },
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
    expect(snapshot.ueGrades[0].moyenne).toBe(15)
    expect(snapshot.academicYear).toBe('2026-2027')
  })

  it('refuses to certify a transcript with a missing registered subject', async () => {
    dbMock.grade.findMany.mockResolvedValue([{
      isLocked: true, teachingUnitId: 'unit-A', courseElementId: 'element-A', finalGrade: 15,
      teachingUnit: { id: 'unit-A', name: 'Mathématiques', code: 'MAT101', credits: 6, semester: { id: 'sem-A' } },
      courseElement: { teachingUnitId: 'unit-A', name: 'Algèbre', coefficient: 2 },
    }])
    dbMock.pedagogicalRegistration.findMany.mockResolvedValue([{
      teachingUnit: { courseElements: [{ id: 'element-A' }, { id: 'element-B' }] },
    }])

    const response = await POST(request({ type: 'RELEVE_NOTES', tenantId, studentId, sign: true }))
    expect(response.status).toBe(409)
    expect(dbMock.officialDocument.create).not.toHaveBeenCalled()
  })

  it('certifies a complete locked transcript and calculates the weighted UE average', async () => {
    dbMock.grade.findMany.mockResolvedValue([
      { isLocked: true, teachingUnitId: 'unit-A', courseElementId: 'element-A', finalGrade: 12,
        teachingUnit: { id: 'unit-A', name: 'Mathématiques', code: 'MAT101', credits: 6, semester: { id: 'sem-A' } },
        courseElement: { teachingUnitId: 'unit-A', name: 'Algèbre', coefficient: 1 } },
      { isLocked: true, teachingUnitId: 'unit-A', courseElementId: 'element-B', finalGrade: 18,
        teachingUnit: { id: 'unit-A', name: 'Mathématiques', code: 'MAT101', credits: 6, semester: { id: 'sem-A' } },
        courseElement: { teachingUnitId: 'unit-A', name: 'Analyse', coefficient: 2 } },
    ])
    dbMock.pedagogicalRegistration.findMany.mockResolvedValue([{
      teachingUnit: { courseElements: [{ id: 'element-A' }, { id: 'element-B' }] },
    }])
    dbMock.semester.findMany.mockResolvedValue([{ name: 'Semestre 1' }])

    const response = await POST(request({ type: 'RELEVE_NOTES', tenantId, studentId, sign: true }))
    expect(response.status).toBe(200)
    const saved = dbMock.officialDocument.create.mock.calls[0][0].data
    expect(saved.validatedBy).toBe('admin-A')
    expect(JSON.parse(saved.content).ueGrades[0].moyenne).toBe(16)
  })

  it('requires a validated PV with exactly one named president', async () => {
    const unsigned = await POST(request({ type: 'PV_DELIBERATION', tenantId, deliberationId: 'delib-A' }))
    expect(unsigned.status).toBe(409)
    const noPresident = await POST(request({ type: 'PV_DELIBERATION', tenantId, deliberationId: 'delib-A', sign: true, data: { members: [{ name: 'Membre Test', role: 'Membre' }] } }))
    expect(noPresident.status).toBe(400)
    expect(dbMock.deliberation.findFirst).not.toHaveBeenCalled()
  })

  it('signs a PV from stored jury decisions rather than client student data', async () => {
    dbMock.deliberation.findFirst.mockResolvedValue({
      id: 'delib-A', isLocked: true, status: 'TERMINEE', academicYearId: 'year-A',
      name: 'Délibération annuelle', date: new Date('2026-10-01'), type: 'ANNUEL',
      decisions: [{ studentId, average: 13.9, decision: 'ADMI_DETTE' }],
    })
    dbMock.student.findMany.mockResolvedValue([{ id: studentId, firstName: 'Awa', lastName: 'Test', matricule: 'A-001' }])
    const response = await POST(request({
      type: 'PV_DELIBERATION', tenantId, deliberationId: 'delib-A', sign: true,
      data: { members: [{ name: '  Président Test  ', role: 'President' }], students: [{ name: 'Faux étudiant' }] },
    }))

    expect(response.status).toBe(200)
    const saved = dbMock.officialDocument.create.mock.calls[0][0].data
    const snapshot = JSON.parse(saved.content)
    expect(saved.validatedBy).toBe('admin-A')
    expect(snapshot.members[0].name).toBe('Président Test')
    expect(snapshot.students[0]).toMatchObject({ name: 'Awa Test', decision: 'ADMIS AVEC DETTE' })
  })

  it('refuses an old locked PV when grades have since become incomplete', async () => {
    dbMock.deliberation.findFirst.mockResolvedValue({
      id: 'delib-A', isLocked: true, status: 'TERMINEE', academicYearId: 'year-A', type: 'ANNUEL',
      decisions: [{ studentId, decision: 'ADMI' }],
    })
    readinessMock.mockResolvedValue({ ready: false, studentIds: [studentId], missingGradeCount: 1 })
    const response = await POST(request({
      type: 'PV_DELIBERATION', tenantId, deliberationId: 'delib-A', sign: true,
      data: { members: [{ name: 'Président Test', role: 'President' }] },
    }))
    expect(response.status).toBe(409)
    expect(dbMock.officialDocument.create).not.toHaveBeenCalled()
  })

  it('refuses a PV whose decisions omit an enrolled student', async () => {
    dbMock.deliberation.findFirst.mockResolvedValue({
      id: 'delib-A', isLocked: true, status: 'TERMINEE', academicYearId: 'year-A', type: 'ANNUEL',
      decisions: [{ studentId, decision: 'ADMI' }],
    })
    readinessMock.mockResolvedValue({ ready: true, studentIds: [studentId, 'student-B'], studentsTotal: 2 })
    const response = await POST(request({
      type: 'PV_DELIBERATION', tenantId, deliberationId: 'delib-A', sign: true,
      data: { members: [{ name: 'Président Test', role: 'President' }] },
    }))
    expect(response.status).toBe(409)
    expect(dbMock.officialDocument.create).not.toHaveBeenCalled()
  })

  it('refuses to sign a transcript with unlocked grades', async () => {
    dbMock.grade.findMany.mockResolvedValue([{
      isLocked: false, teachingUnitId: 'unit-A', courseElementId: 'element-A',
      teachingUnit: { id: 'unit-A', name: 'Mathématiques', code: 'MAT101', credits: 6, semester: { id: 'sem-A' } },
      courseElement: { teachingUnitId: 'unit-A' },
    }])

    const response = await POST(request({ type: 'RELEVE_NOTES', tenantId, studentId, sign: true }))
    expect(response.status).toBe(409)
    expect(dbMock.officialDocument.create).not.toHaveBeenCalled()
  })
})
