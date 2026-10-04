import { Resvg } from '@resvg/resvg-js'
import { join } from 'node:path'

const fontFile = join(process.cwd(), 'src', 'lib', 'pdf', 'fonts', 'NotoNaskhArabic.ttf')

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!)
}

export function renderArabicHeader(input: { headerLanguageMode?: string; arabicCountry?: string; arabicMinistry?: string; arabicName?: string }): string | undefined {
  if (input.headerLanguageMode !== 'FR_AR') return undefined
  const lines = [
    input.arabicCountry?.trim() || '',
    input.arabicMinistry?.trim() || '',
    input.arabicName?.trim() || '',
  ]
  if (!lines.some(Boolean)) return undefined
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="160" viewBox="0 0 560 160">
    ${lines.map((line, index) => `<text x="280" y="${32 + index * 59}" text-anchor="middle" direction="rtl" font-family="Noto Naskh Arabic" font-size="27" fill="#1a2744">${escapeXml(line.slice(0, 130))}</text>`).join('')}
  </svg>`
  const png = new Resvg(svg, { font: { loadSystemFonts: false, fontFiles: [fontFile], defaultFontFamily: 'Noto Naskh Arabic' } }).render().asPng()
  return `data:image/png;base64,${png.toString('base64')}`
}
