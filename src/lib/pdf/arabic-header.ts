import { Resvg } from '@resvg/resvg-js'
import { join } from 'node:path'

const fontFile = join(process.cwd(), 'src', 'lib', 'pdf', 'fonts', 'NotoNaskhArabic.ttf')

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!)
}

function normalizeArabicPunctuation(value: string) {
  // Keep separators legible with the embedded Arabic font instead of relying
  // on a missing glyph that some PDF viewers render as a small rectangle.
  // U+2010 is present in Noto Naskh Arabic; U+2212 is not and becomes a tofu
  // rectangle in several PDF viewers.
  return value.replace(/[\u002D\u2010\u2011\u2012\u2013\u2014\u2212]/g, ' ‐ ')
}

export function renderArabicHeader(input: { headerLanguageMode?: string; arabicCountry?: string; arabicMinistry?: string; arabicName?: string; headerLinesAr?: string[]; primaryColor?: string }): string | undefined {
  if (input.headerLanguageMode !== 'FR_AR') return undefined
  const lines = (input.headerLinesAr ?? [
    input.arabicCountry?.trim() || '',
    input.arabicMinistry?.trim() || '',
    input.arabicName?.trim() || '',
  ]).filter(Boolean).slice(0, 10)
  if (!lines.some(Boolean)) return undefined
  const fontSize = Math.min(27, Math.floor(150 / lines.length * 0.95))
  const step = 150 / lines.length
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="160" viewBox="0 0 560 160">
    ${lines.map((line, index) => `<text x="280" y="${8 + step * (index + 0.75)}" text-anchor="middle" direction="rtl" font-family="Noto Naskh Arabic" font-size="${fontSize}" fill="#111111">${escapeXml(line.slice(0, 130))}</text>`).join('')}
  </svg>`
  const png = new Resvg(svg, { font: { loadSystemFonts: false, fontFiles: [fontFile], defaultFontFamily: 'Noto Naskh Arabic' } }).render().asPng()
  return `data:image/png;base64,${png.toString('base64')}`
}

export function renderArabicMotto(input: { headerLanguageMode?: string; arabicMotto?: string | null }): string | undefined {
  if (input.headerLanguageMode !== 'FR_AR' || !input.arabicMotto?.trim()) return undefined
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="56" viewBox="0 0 560 56">
    <text x="280" y="39" text-anchor="middle" direction="rtl" font-family="Noto Naskh Arabic" font-size="29" fill="#111111">${escapeXml(normalizeArabicPunctuation(input.arabicMotto.trim().slice(0, 130)))}</text>
  </svg>`
  const png = new Resvg(svg, { font: { loadSystemFonts: false, fontFiles: [fontFile], defaultFontFamily: 'Noto Naskh Arabic' } }).render().asPng()
  return `data:image/png;base64,${png.toString('base64')}`
}
