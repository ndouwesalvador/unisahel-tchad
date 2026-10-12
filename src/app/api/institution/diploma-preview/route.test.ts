import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { authMock, tenantMock, artworkMock, renderMock } = vi.hoisted(() => ({
  authMock: vi.fn(), tenantMock: vi.fn(), artworkMock: vi.fn(), renderMock: vi.fn(),
}))

vi.mock('@/lib/auth/config', () => ({ auth: authMock }))
vi.mock('@/lib/db', () => ({ db: { tenant: { findUnique: tenantMock } } }))
vi.mock('@/lib/pdf/artwork', () => ({ prepareDocumentArtwork: artworkMock }))
vi.mock('@/lib/pdf/arabic-header', () => ({ renderArabicHeader: vi.fn(() => undefined), renderArabicMotto: vi.fn(() => undefined) }))
vi.mock('@/lib/institution-branding', () => ({ parseHeaderLines: vi.fn(() => undefined) }))
vi.mock('@/lib/diploma-design', () => ({ DIPLOMA_TEMPLATE_TYPE: 'DIPLOMA_DESIGN', parseDiplomaDesign: vi.fn(() => ({ version: 1 })) }))
vi.mock('@/lib/pdf/templates', () => ({ DiplomePDF: vi.fn(() => null), renderPDF: renderMock }))

const { GET } = await import('./route')

beforeEach(() => {
  vi.clearAllMocks()
  authMock.mockResolvedValue({ user: { id: 'admin-A', role: 'ADMIN_INSTITUTION', tenantId: 'tenant-A', firstName: 'Ada', lastName: 'Admin' } })
  tenantMock.mockResolvedValue({
    id: 'tenant-A', name: 'Université A', shortName: 'UA', headerLanguageMode: 'FR_ONLY',
    documentTemplates: [{ template: '{}' }],
  })
  artworkMock.mockImplementation(async (value) => value)
  renderMock.mockResolvedValue(Buffer.from('%PDF exact preview'))
})

describe('institution diploma PDF preview', () => {
  it('renders the preview with the same PDF template used for issued diplomas', async () => {
    const response = await GET(new NextRequest('http://localhost/api/institution/diploma-preview'))

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/pdf')
    expect(response.headers.get('content-disposition')).toContain('inline')
    expect(renderMock).toHaveBeenCalledOnce()
    expect(artworkMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'tenant-A', name: 'Université A' }))
  })

  it('does not expose another institution preview to an unauthenticated request', async () => {
    authMock.mockResolvedValue(null)
    const response = await GET(new NextRequest('http://localhost/api/institution/diploma-preview'))
    expect(response.status).toBe(401)
    expect(renderMock).not.toHaveBeenCalled()
  })
})
