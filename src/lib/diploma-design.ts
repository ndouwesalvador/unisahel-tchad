export const DIPLOMA_TEMPLATE_TYPE = 'DIPLOMA_DESIGN'

export const diplomaStyles = ['HERITAGE_TCHADIEN', 'SAHEL_PRESTIGE', 'ACADEMIQUE'] as const
export const diplomaBorders = ['GUILLOCHE', 'GEOMETRIQUE', 'DOUBLE_FILET'] as const
export const diplomaPatterns = ['ROSETTES', 'VAGUES', 'DIAMANTS', 'AUCUN'] as const

export type DiplomaStyle = typeof diplomaStyles[number]
export type DiplomaBorder = typeof diplomaBorders[number]
export type DiplomaPattern = typeof diplomaPatterns[number]

export interface DiplomaDesignConfig {
  version: 1
  style: DiplomaStyle
  border: DiplomaBorder
  pattern: DiplomaPattern
  primaryColor: string
  accentColor: string
  paperColor: string
  showWatermark: boolean
  showMedallion: boolean
  nationalEmblem?: string
  medallion?: string
}

export const defaultDiplomaDesign: DiplomaDesignConfig = {
  version: 1,
  style: 'HERITAGE_TCHADIEN',
  border: 'GUILLOCHE',
  pattern: 'VAGUES',
  primaryColor: '#17365D',
  accentColor: '#B58A32',
  paperColor: '#FFFCF4',
  showWatermark: true,
  showMedallion: true,
}

const HEX_COLOR = /^#[0-9A-F]{6}$/i
const DATA_IMAGE = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/
const MAX_EMBEDDED_IMAGE_LENGTH = 420_000

function isOneOf<T extends readonly string[]>(value: unknown, options: T): value is T[number] {
  return typeof value === 'string' && options.includes(value as T[number])
}

function safeImage(value: unknown): string | undefined {
  return typeof value === 'string' && value.length <= MAX_EMBEDDED_IMAGE_LENGTH && DATA_IMAGE.test(value)
    ? value
    : undefined
}

export function parseDiplomaDesign(value: unknown): DiplomaDesignConfig {
  let candidate = value
  if (typeof value === 'string') {
    try { candidate = JSON.parse(value) } catch { candidate = null }
  }
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return { ...defaultDiplomaDesign }
  const record = candidate as Record<string, unknown>
  return {
    version: 1,
    style: isOneOf(record.style, diplomaStyles) ? record.style : defaultDiplomaDesign.style,
    border: isOneOf(record.border, diplomaBorders) ? record.border : defaultDiplomaDesign.border,
    pattern: isOneOf(record.pattern, diplomaPatterns) ? record.pattern : defaultDiplomaDesign.pattern,
    primaryColor: typeof record.primaryColor === 'string' && HEX_COLOR.test(record.primaryColor) ? record.primaryColor.toUpperCase() : defaultDiplomaDesign.primaryColor,
    accentColor: typeof record.accentColor === 'string' && HEX_COLOR.test(record.accentColor) ? record.accentColor.toUpperCase() : defaultDiplomaDesign.accentColor,
    paperColor: typeof record.paperColor === 'string' && HEX_COLOR.test(record.paperColor) ? record.paperColor.toUpperCase() : defaultDiplomaDesign.paperColor,
    showWatermark: typeof record.showWatermark === 'boolean' ? record.showWatermark : defaultDiplomaDesign.showWatermark,
    showMedallion: typeof record.showMedallion === 'boolean' ? record.showMedallion : defaultDiplomaDesign.showMedallion,
    nationalEmblem: safeImage(record.nationalEmblem),
    medallion: safeImage(record.medallion),
  }
}

export function validateDiplomaDesign(value: unknown): { valid: true; value: DiplomaDesignConfig } | { valid: false; error: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { valid: false, error: 'Configuration du diplôme invalide.' }
  }
  const record = value as Record<string, unknown>
  if (!isOneOf(record.style, diplomaStyles) || !isOneOf(record.border, diplomaBorders) || !isOneOf(record.pattern, diplomaPatterns)) {
    return { valid: false, error: 'Style, bordure ou motif du diplôme invalide.' }
  }
  for (const field of ['primaryColor', 'accentColor', 'paperColor'] as const) {
    if (typeof record[field] !== 'string' || !HEX_COLOR.test(record[field])) {
      return { valid: false, error: `${field} doit être une couleur hexadécimale #RRGGBB.` }
    }
  }
  for (const field of ['showWatermark', 'showMedallion'] as const) {
    if (typeof record[field] !== 'boolean') return { valid: false, error: `Option ${field} invalide.` }
  }
  for (const field of ['nationalEmblem', 'medallion'] as const) {
    if (record[field] != null && safeImage(record[field]) === undefined) {
      return { valid: false, error: `Le visuel ${field} est invalide ou trop volumineux.` }
    }
  }
  return { valid: true, value: parseDiplomaDesign(record) }
}
