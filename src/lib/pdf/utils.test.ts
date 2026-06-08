import { describe, it, expect } from 'vitest'
import { formatDate, generateDocNumber, generateVerificationCode } from './utils'

describe('formatDate', () => {
  it('formats a Date object correctly in French long format', () => {
    const date = new Date(2025, 0, 15)
    const result = formatDate(date)
    expect(result).toContain('janvier')
    expect(result).toContain('2025')
    expect(result).toContain('15')
  })

  it('formats an ISO string correctly', () => {
    const result = formatDate('2025-06-07')
    expect(result).toContain('juin')
    expect(result).toContain('2025')
  })
})

describe('generateDocNumber', () => {
  it('generates a document number with all parts', () => {
    const result = generateDocNumber('RELEVE', 'UDN', '2025', 1)
    expect(result).toBe('RELEVE-UDN-2025-00001')
  })

  it('pads the sequence number to 5 digits', () => {
    const result = generateDocNumber('PV', 'UND', '2024', 42)
    expect(result).toBe('PV-UND-2024-00042')
  })

  it('handles large sequence numbers', () => {
    const result = generateDocNumber('DIPLOME', 'UTA', '2024', 99999)
    expect(result).toBe('DIPLOME-UTA-2024-99999')
  })
})

describe('generateVerificationCode', () => {
  it('generates a 12-character alphanumeric code', () => {
    const code = generateVerificationCode()
    expect(code).toHaveLength(12)
    expect(code).toMatch(/^[A-Z0-9]{12}$/)
  })

  it('generates unique codes on successive calls', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateVerificationCode()))
    expect(codes.size).toBe(100)
  })
})
