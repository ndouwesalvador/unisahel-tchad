import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  visible: vi.fn(),
  tenant: vi.fn(),
  year: vi.fn(),
  program: vi.fn(),
  level: vi.fn(),
  render: vi.fn(async (_element: unknown) => Buffer.from('%PDF-1.4\n/Type /Page\n')),
}))

vi.mock('@/lib/auth/helpers', () => ({ withTenantAuth: (handler: unknown) => handler }))
vi.mock('@/lib/timetable/visible-timetable', () => ({
  TimetableAccessError: class TimetableAccessError extends Error {
    constructor(message: string, readonly status: number) { super(message) }
  },
  readVisibleTimetable: mocks.visible,
}))
vi.mock('@/lib/db', () => ({ db: {
  tenant: { findUnique: mocks.tenant },
  academicYear: { findFirst: mocks.year },
  program: { findFirst: mocks.program },
  level: { findFirst: mocks.level },
} }))
vi.mock('@/lib/pdf/artwork', () => ({ prepareDocumentArtwork: vi.fn(async (tenant: unknown) => tenant) }))
vi.mock('@/lib/pdf/arabic-header', () => ({ renderArabicHeader: vi.fn(), renderArabicMotto: vi.fn() }))
vi.mock('@/lib/pdf/templates', () => ({
  TimetablePDF: (props: unknown) => ({ props }),
  paginateTimetable: () => [['08:00–10:00']],
  renderPDF: mocks.render,
}))

const { GET } = await import('./route')
const handler = GET as unknown as (
  user: { id: string; role: string; tenantId: string; firstName: string; lastName: string },
  tenantId: string,
  request: NextRequest,
) => Promise<Response>
const slot = {
  id: 'slot-A', academicYearId: 'year-A', dayOfWeek: 0, startTime: '08:00', endTime: '10:00', type: 'CM',
  course: 'Analyse', teacher: 'Mme Test', room: 'Salle 1', courseElementId: 'element-A', teacherId: 'teacher-A',
  roomId: 'room-A', programId: 'program-A', levelId: 'level-A',
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.visible.mockResolvedValue({ slots: [slot], source: 'published', registration: { programId: 'program-A', levelId: 'level-A' } })
  mocks.tenant.mockResolvedValue({
    id: 'tenant-A', name: 'Université A', shortName: 'UA', address: null, city: null, country: 'Tchad', ministry: null,
    phone: null, email: null, website: null, logo: null, secondaryLogo: null, thirdLogo: null,
    headerLanguageMode: 'FR_ONLY', arabicCountry: null, arabicName: null, arabicMinistry: null, arabicMotto: null,
    contactPlacement: 'BOTTOM', headerLinesFr: null, headerLinesAr: null, motto: null,
  })
  mocks.year.mockResolvedValue({ name: '2026-2027' })
  mocks.program.mockResolvedValue({ name: 'Master Génie électrique' })
  mocks.level.mockResolvedValue({ name: 'Master I' })
})

describe('GET /api/timetable/export', () => {
  it('requires an exact class for a staff export', async () => {
    const response = await handler(
      { id: 'admin-A', role: 'ADMIN_INSTITUTION', tenantId: 'tenant-A', firstName: 'Ada', lastName: 'Admin' },
      'tenant-A',
      new NextRequest('http://localhost/api/timetable/export?academicYearId=year-A'),
    )
    expect(response.status).toBe(400)
    expect(mocks.visible).not.toHaveBeenCalled()
  })

  it('exports only the published timetable visible to the connected student', async () => {
    const response = await handler(
      { id: 'student-user-A', role: 'ETUDIANT', tenantId: 'tenant-A', firstName: 'Awa', lastName: 'Test' },
      'tenant-A',
      new NextRequest('http://localhost/api/timetable/export?academicYearId=year-A'),
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/pdf')
    expect(mocks.visible).toHaveBeenCalledWith(expect.objectContaining({ role: 'ETUDIANT' }), 'tenant-A', {
      academicYearId: 'year-A', programId: undefined, levelId: undefined,
    })
    const rendered = mocks.render.mock.calls[0][0] as { props: { slots: unknown[]; scopeLabel: string; source: string } }
    expect(rendered.props).toMatchObject({ slots: [slot], scopeLabel: 'Master Génie électrique · Master I', source: 'published' })
  })

  it('does not create an empty or misleading PDF', async () => {
    mocks.visible.mockResolvedValue({ slots: [], source: 'published' })
    const response = await handler(
      { id: 'teacher-user-A', role: 'ENSEIGNANT', tenantId: 'tenant-A', firstName: 'Amina', lastName: 'Ali' },
      'tenant-A',
      new NextRequest('http://localhost/api/timetable/export?academicYearId=year-A'),
    )
    expect(response.status).toBe(409)
    expect(mocks.render).not.toHaveBeenCalled()
  })
})
