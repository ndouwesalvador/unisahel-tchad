import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'

const { authMock, credentialsMock, dbMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  credentialsMock: vi.fn(),
  dbMock: {
    $transaction: vi.fn(),
    student: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    auditLog: { create: vi.fn() },
    tenantSettings: { findUnique: vi.fn() },
    level: { findFirst: vi.fn() },
    program: { findFirst: vi.fn() },
    academicYear: { findFirst: vi.fn() },
    administrativeRegistration: { findFirst: vi.fn() },
    grade: { findMany: vi.fn() },
  },
}))

vi.mock('@/lib/auth/config', () => ({ auth: authMock }))
vi.mock('@/lib/db', () => ({ db: dbMock }))
vi.mock('@/lib/student-portal', () => ({ createStudentPortalCredentials: credentialsMock }))

const { GET, POST } = await import('./route')

const sessionUser = {
  id: 'user-1',
  email: 'scolarite@example.com',
  role: 'SCOLARITE',
  tenantId: 'tenant-A',
  firstName: 'Scolarite',
  lastName: 'User',
}

function req(url: string) {
  return new NextRequest(new URL(url, 'http://localhost:3000'))
}

beforeEach(() => {
  vi.clearAllMocks()
  dbMock.student.findMany.mockResolvedValue([])
  dbMock.student.count.mockResolvedValue(0)
  dbMock.student.findFirst.mockResolvedValue(null)
  dbMock.academicYear.findFirst.mockResolvedValue({ id: 'year-A', name: '2026-2027' })
  dbMock.administrativeRegistration.findFirst.mockResolvedValue(null)
  dbMock.grade.findMany.mockResolvedValue([])
  dbMock.$transaction.mockImplementation((callback: (tx: typeof dbMock) => unknown) => callback(dbMock))
  dbMock.tenantSettings.findUnique.mockResolvedValue({ matriculePrefix: 'UNSH' })
  dbMock.program.findFirst.mockResolvedValue({ id: 'cprogram00000000000000001' })
  dbMock.level.findFirst.mockResolvedValue({ id: 'clevel000000000000000001', code: 'L1' })
  dbMock.user.findMany.mockResolvedValue([])
  dbMock.user.findUnique.mockResolvedValue(null)
  dbMock.user.create.mockResolvedValue({ id: 'cstudentuser000000000001' })
  dbMock.student.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'cstudent00000000000000001', ...data }))
  dbMock.student.update.mockResolvedValue({ id: 'cstudent00000000000000001' })
  dbMock.auditLog.create.mockResolvedValue({ id: 'caudit000000000000000001' })
  credentialsMock.mockResolvedValue({ pin: '123456', pinHash: 'hashed-pin' })
  authMock.mockResolvedValue({ user: sessionUser })
})

describe('GET /api/students', () => {
  it('rejects an unauthenticated request', async () => {
    authMock.mockResolvedValue(null)
    const res = await GET(req('/api/students'))
    expect(res.status).toBe(401)
  })

  it('always scopes the query to the caller tenant, ignoring any studentId-less request', async () => {
    const res = await GET(req('/api/students'))
    expect(res.status).toBe(200)
    expect(dbMock.student.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-A' }) })
    )
  })

  it('rejects a cross-tenant request from a non-SUPER_ADMIN with 403 before querying the DB', async () => {
    const res = await GET(req('/api/students?tenantId=tenant-B'))
    expect(res.status).toBe(403)
    expect(dbMock.student.findMany).not.toHaveBeenCalled()
  })

  // Regression test: lib/validations/api.ts's paginationSchema used to cap
  // `limit` at 100, which silently 500'd every page that requests a full
  // tenant roster with limit=1000 (students-list.tsx, teachers-page.tsx,
  // payments-page.tsx, grades-page.tsx, import-export-page.tsx all do this).
  it('accepts limit=1000 (students-list.tsx requests the full roster this way)', async () => {
    const res = await GET(req('/api/students?limit=1000'))
    expect(res.status).toBe(200)
    expect(dbMock.student.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 1000 })
    )
  })

  it('rejects a limit above the raised cap (1000) without querying the DB', async () => {
    // Note: getStudentsHandler's catch block doesn't special-case ZodError
    // the way the POST/PUT handlers in this file do, so an out-of-range
    // limit currently surfaces as a generic 500 rather than 400. That's a
    // minor pre-existing inconsistency (client input misclassified as a
    // server error) - out of scope to fix here; this test just documents
    // the current, safe behavior (rejected, DB never queried).
    const res = await GET(req('/api/students?limit=100000'))
    expect(res.status).toBe(500)
    expect(dbMock.student.findMany).not.toHaveBeenCalled()
  })

  it('does not expose historical grades in a pre-enrollment transcript preview', async () => {
    dbMock.student.findFirst.mockResolvedValue({ id: 'student-A', totalCreditsAcquired: 60 })
    const res = await GET(req('/api/students?id=student-A&transcript=true'))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ data: {
      isEnrolledForYear: false, grades: [], summary: { totalGrades: 0, totalCreditsAcquired: 0 },
    } })
    expect(dbMock.grade.findMany).not.toHaveBeenCalled()
  })

  it('scopes a transcript preview to published grades in the enrolled year', async () => {
    dbMock.student.findFirst.mockResolvedValue({ id: 'student-A', totalCreditsAcquired: 12 })
    dbMock.administrativeRegistration.findFirst.mockResolvedValue({ id: 'registration-A' })
    const res = await GET(req('/api/students?id=student-A&transcript=true&academicYearId=year-A'))
    expect(res.status).toBe(200)
    expect(dbMock.grade.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {
      studentId: 'student-A', student: { tenantId: 'tenant-A' }, academicYearId: 'year-A', session: 'NORMALE', isLocked: true,
      teachingUnit: { pedagogicalRegistrations: { some: { studentId: 'student-A', academicYearId: 'year-A', status: 'ACTIVE' } } },
    } }))
    expect(dbMock.administrativeRegistration.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-A', studentId: 'student-A', academicYearId: 'year-A', status: 'INSCRIT' },
      select: { id: true },
    })
  })
})

describe('POST /api/students', () => {
  const body = {
    firstName: 'Amina', lastName: 'TEST-PARCOURS', gender: 'F',
    dateOfBirth: '2004-03-17T00:00:00.000Z', placeOfBirth: 'Mongo',
    currentProgramId: 'cprogram00000000000000001', currentLevelId: 'clevel000000000000000001',
    status: 'INSCRIT',
  }
  const post = (student: Record<string, unknown> = body) => new NextRequest('http://localhost:3000/api/students', {
    method: 'POST', body: JSON.stringify(student),
  })

  it('allocates after the highest matricule or portal login across programs and creates the account atomically', async () => {
    const stem = `UNSH-${new Date().getFullYear()}-L1-`
    dbMock.student.findMany.mockResolvedValue([{ matricule: `${stem}000002` }])
    dbMock.user.findMany.mockResolvedValue([{ login: `${stem}000003` }])
    const res = await POST(post())
    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({ data: { matricule: `${stem}000004`, status: 'INSCRIT', userId: 'cstudentuser000000000001' },
      portalAccount: { login: `${stem}000004`, pin: '123456' } })
    expect(dbMock.student.findMany).toHaveBeenCalledWith({ where: { matricule: { startsWith: stem } }, select: { matricule: true } })
    expect(dbMock.user.create).toHaveBeenCalledWith({ data: expect.objectContaining({ login: `${stem}000004`, pinHash: 'hashed-pin', role: 'ETUDIANT' }) })
    expect(dbMock.student.update).toHaveBeenCalledWith({ where: { id: 'cstudent00000000000000001' }, data: { userId: 'cstudentuser000000000001' } })
    expect(dbMock.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  })

  it('retries a generated matricule after a concurrent unique conflict', async () => {
    const stem = `UNSH-${new Date().getFullYear()}-L1-`
    dbMock.student.findMany.mockResolvedValueOnce([{ matricule: `${stem}000002` }])
      .mockResolvedValueOnce([{ matricule: `${stem}000003` }])
    dbMock.student.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('Duplicate', {
      code: 'P2002', clientVersion: '6.11.1',
    }))
    const res = await POST(post())
    expect(res.status).toBe(201)
    expect((await res.json()).data.matricule).toBe(`${stem}000004`)
    expect(dbMock.$transaction).toHaveBeenCalledTimes(2)
  })

  it('rejects a level outside the selected program before writing', async () => {
    dbMock.level.findFirst.mockResolvedValue(null)
    const res = await POST(post())
    expect(res.status).toBe(400)
    expect(dbMock.$transaction).not.toHaveBeenCalled()
    expect(dbMock.level.findFirst).toHaveBeenCalledWith({ where: expect.objectContaining({ programId: body.currentProgramId }) })
  })
})
