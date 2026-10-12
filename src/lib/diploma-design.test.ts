import { describe, expect, it } from 'vitest'
import { defaultDiplomaDesign, parseDiplomaDesign, validateDiplomaDesign } from './diploma-design'

describe('diploma design configuration', () => {
  it('falls back to a safe printable design when saved JSON is unreadable', () => {
    expect(parseDiplomaDesign('{broken')).toEqual(defaultDiplomaDesign)
  })

  it('keeps valid institution choices and normalizes colors', () => {
    const parsed = parseDiplomaDesign({
      ...defaultDiplomaDesign,
      style: 'SAHEL_PRESTIGE', border: 'GEOMETRIQUE', pattern: 'ROSETTES',
      primaryColor: '#184f3a', accentColor: '#c08b35', paperColor: '#fffdf7',
    })
    expect(parsed).toMatchObject({
      style: 'SAHEL_PRESTIGE', border: 'GEOMETRIQUE', pattern: 'ROSETTES',
      primaryColor: '#184F3A', accentColor: '#C08B35', paperColor: '#FFFDF7',
      watermarkSource: 'EMBLEM', watermarkSize: 225,
    })
  })

  it('keeps the selected watermark artwork and clamps its printable size', () => {
    expect(parseDiplomaDesign({ ...defaultDiplomaDesign, watermarkSource: 'LOGO', watermarkSize: 999 })).toMatchObject({
      watermarkSource: 'LOGO', watermarkSize: 360,
    })
    expect(parseDiplomaDesign({ ...defaultDiplomaDesign, watermarkSource: 'NONE', watermarkSize: 80 })).toMatchObject({
      watermarkSource: 'NONE', watermarkSize: 120,
    })
  })

  it('rejects unsafe or oversized embedded artwork', () => {
    const result = validateDiplomaDesign({
      ...defaultDiplomaDesign,
      nationalEmblem: 'https://external.example/emblem.svg',
    })
    expect(result.valid).toBe(false)
  })
})
