export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatNumber(n: number, decimals = 2): string {
  return n.toFixed(decimals)
}

// React PDF writes one uncompressed /Type /Page dictionary per physical page.
// Check the rendered artifact before issuing a one-page transcript, rather
// than silently certifying a document whose last rows moved to page two.
export function countPdfPages(pdf: Buffer): number {
  return (pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length
}

export function generateDocNumber(prefix: string, tenant: string, year: string, seq: number): string {
  const padded = String(seq).padStart(5, '0')
  return `${prefix}-${tenant}-${year}-${padded}`
}

export function generateVerificationCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function getPublicBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

export function getVerificationUrl(verificationCode: string): string {
  return `${getPublicBaseUrl()}/verify?code=${encodeURIComponent(verificationCode)}`
}

export interface TenantInfo {
  id?: string
  name: string
  shortName?: string
  address?: string
  city?: string
  country?: string
  ministry?: string
  phone?: string
  email?: string
  website?: string
  logo?: string
  secondaryLogo?: string
  thirdLogo?: string
  stamp?: string
  signature?: string
  secondarySignature?: string
  secondarySignerName?: string
  secondarySignerTitle?: string
  thirdSignature?: string
  thirdSignerName?: string
  thirdSignerTitle?: string
  secondaryStamp?: string
  thirdStamp?: string
  arabicName?: string
  arabicMinistry?: string
  arabicHeaderImage?: string
  arabicCountry?: string
  headerLanguageMode?: string
  headerLinesFr?: string[]
  headerLinesAr?: string[]
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  rectorName?: string
  rectorTitle?: string
  motto?: string
  arabicMottoImage?: string
  arabicMotto?: string
  contactPlacement?: string
  sealSizeMm?: number
}

export interface StudentInfo {
  firstName: string
  lastName: string
  matricule?: string
  photo?: string
  dateOfBirth?: string
  placeOfBirth?: string
  gender?: string
  nationality?: string
  phone?: string
  email?: string
  program?: string
  level?: string
  academicYear?: string
}
