import { describe, it, expect } from 'vitest'

describe('Document generation request validation', () => {
  it('requires type and tenant', () => {
    const valid = (o: unknown): o is { type: string; tenant: { name: string } } =>
      typeof o === 'object' && o !== null && 'type' in o && 'tenant' in o &&
      typeof (o as Record<string, unknown>).tenant === 'object' &&
      !!((o as Record<string, Record<string, unknown>>).tenant?.name)

    expect(valid({ type: 'RELEVE_NOTES', tenant: { name: 'Université' } })).toBe(true)
    expect(valid({ type: 'PV_DELIBERATION', tenant: { name: 'UND' } })).toBe(true)
    expect(valid({ tenant: { name: 'Université' } })).toBe(false)
    expect(valid({ type: 'RELEVE_NOTES' })).toBe(false)
    expect(valid({ type: 'RELEVE_NOTES', tenant: { name: '' } })).toBe(false)
  })
})
