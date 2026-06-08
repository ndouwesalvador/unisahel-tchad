export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatNumber(n: number, decimals = 2): string {
  return n.toFixed(decimals)
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

export interface TenantInfo {
  name: string
  shortName?: string
  address?: string
  city?: string
  phone?: string
  email?: string
  website?: string
  logo?: string
  rectorName?: string
  rectorTitle?: string
  motto?: string
}

export interface StudentInfo {
  firstName: string
  lastName: string
  matricule?: string
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
