import { describe, expect, it } from 'vitest'
import { parseHeaderLines, readableBrandColor, validBrandColor, validHeaderLines } from './institution-branding'

describe('institution branding', () => {
  it('accepts ordered, bounded lines and preserves explicit empty headers', () => {
    expect(validHeaderLines(['République', 'Ministère', 'Université'])).toBe(true)
    expect(validHeaderLines([''])).toBe(false)
    expect(validHeaderLines(Array(11).fill('ligne'))).toBe(false)
    expect(parseHeaderLines('["Ministère","Université"]')).toEqual(['Ministère', 'Université'])
    expect(parseHeaderLines('[]')).toEqual([])
    expect(parseHeaderLines('invalid')).toBeNull()
  })

  it('only accepts safe hex values and darkens pale surfaces for white labels', () => {
    expect(validBrandColor('#a1B2c3')).toBe(true)
    expect(validBrandColor('red; background:url(x)')).toBe(false)
    expect(readableBrandColor('#ffffff')).not.toBe('#ffffff')
    expect(readableBrandColor('#1a2744')).toBe('#1a2744')
  })
})
