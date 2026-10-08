import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import sharp from 'sharp'

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
    deliberationDecision: { findMany: vi.fn() },
    grade: { findMany: vi.fn() },
  },
}))

vi.mock('@/lib/auth/config', () => ({ auth: authMock }))
vi.mock('@/lib/db', () => ({ db: dbMock }))
vi.mock('@/lib/student-portal', () => ({ createStudentPortalCredentials: credentialsMock }))

const { GET, POST, PUT } = await import('./route')

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
  dbMock.deliberationDecision.findMany.mockResolvedValue([])
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

  // A single export page may contain up to 1,000 rows. Interactive screens
  // use smaller server-paginated queries and never preload the full roster.
  it('accepts a 1,000-row page for the explicit export flow', async () => {
    const res = await GET(req('/api/students?limit=1000'))
    expect(res.status).toBe(200)
    expect(dbMock.student.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 1000 })
    )
  })

  it('keeps stored portraits out of the large roster response', async () => {
    await GET(req('/api/students?limit=1000'))
    expect(dbMock.student.findMany).toHaveBeenCalledWith(expect.objectContaining({ omit: { photo: true } }))
  })

  it('shows credits from finalized jury decisions, counting a year only once', async () => {
    dbMock.student.findMany.mockResolvedValue([{ id: 'student-A', totalCreditsAcquired: 0 }])
    dbMock.deliberationDecision.findMany.mockResolvedValue([
      { studentId: 'student-A', creditsAcquired: 40, deliberation: { academicYearId: 'year-A' } },
      { studentId: 'student-A', creditsAcquired: 60, deliberation: { academicYearId: 'year-A' } },
      { studentId: 'student-A', creditsAcquired: 30, deliberation: { academicYearId: 'year-B' } },
    ])
    const res = await GET(req('/api/students'))
    expect(res.status).toBe(200)
    expect((await res.json()).data[0].totalCreditsAcquired).toBe(90)
    expect(dbMock.deliberationDecision.findMany).toHaveBeenCalledWith({
      where: { studentId: { in: ['student-A'] }, deliberation: { tenantId: 'tenant-A', isLocked: true, status: 'TERMINEE' } },
      select: expect.any(Object),
    })
  })

  it('rejects a limit above the cap as invalid client input without querying the DB', async () => {
    const res = await GET(req('/api/students?limit=100000'))
    expect(res.status).toBe(400)
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
    dbMock.administrativeRegistration.findFirst.mockResolvedValue({ id: 'registration-A', programId: 'program-A', levelId: 'level-A' })
    dbMock.deliberationDecision.findMany.mockResolvedValue([{
      average: 14.25, creditsAcquired: 60, decision: 'ADMI',
      deliberation: { date: new Date('2026-10-06T00:00:00.000Z') },
    }])
    const res = await GET(req('/api/students?id=student-A&transcript=true&academicYearId=year-A'))
    expect(res.status).toBe(200)
    expect((await res.json()).data.summary).toMatchObject({
      totalCreditsAcquired: 60,
      averageFinalGrade: 14.25,
      juryDecision: { decision: 'ADMI', creditsAcquired: 60 },
    })
    expect(dbMock.grade.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {
      studentId: 'student-A', student: { tenantId: 'tenant-A' }, academicYearId: 'year-A', session: 'NORMALE', isLocked: true,
      teachingUnit: { semester: { levelId: 'level-A', level: { programId: 'program-A', program: { tenantId: 'tenant-A' } } } },
    } }))
    expect(dbMock.administrativeRegistration.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-A', studentId: 'student-A', academicYearId: 'year-A', status: 'INSCRIT' },
      select: { id: true, programId: true, levelId: true },
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

  it('normalizes an optional student portrait before saving it', async () => {
    const source = await sharp({ create: { width: 300, height: 300, channels: 3, background: '#7a906a' } }).png().toBuffer()
    const res = await POST(post({ ...body, photo: `data:image/png;base64,${source.toString('base64')}` }))
    expect(res.status).toBe(201)
    expect(dbMock.student.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ photo: expect.stringMatching(/^data:image\/jpeg;base64,/) }) }))
  })
})

describe('PUT /api/students', () => {
  it('rejects a level that does not belong to the selected program', async () => {
    dbMock.student.findFirst.mockResolvedValue({ id: 'cstudent00000000000000001', currentProgramId: 'cprogram00000000000000001', currentLevelId: 'clevel000000000000000001' })
    dbMock.level.findFirst.mockResolvedValue(null)
    const res = await PUT(new NextRequest('http://localhost:3000/api/students', {
      method: 'PUT', body: JSON.stringify({ id: 'cstudent00000000000000001', currentProgramId: 'cprogram00000000000000002', currentLevelId: 'clevel000000000000000001' }),
    }))
    expect(res.status).toBe(400)
    expect(dbMock.level.findFirst).toHaveBeenCalledWith({ where: expect.objectContaining({ programId: 'cprogram00000000000000002', isActive: true }) })
    expect(dbMock.student.update).not.toHaveBeenCalled()
  })
})
