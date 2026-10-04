export const DEFAULT_BRAND = {
  primaryColor: '#1a2744',
  secondaryColor: '#2d7a4f',
  accentColor: '#d4a853',
} as const

export function parseHeaderLines(value: string | null | undefined): string[] | null {
  if (value == null) return null
  try {
    const lines: unknown = JSON.parse(value)
    return Array.isArray(lines) && lines.every((line) => typeof line === 'string') ? lines : null
  } catch {
    return null
  }
}

export function validHeaderLines(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 10 && value.every((line) =>
    typeof line === 'string' && line.trim().length > 0 && line.length <= 130)
}

export function validBrandColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
}

// Brand surfaces must retain readable white labels even when a tenant chooses a pastel.
export function readableBrandColor(color: string): string {
  if (!validBrandColor(color)) return DEFAULT_BRAND.primaryColor
  let [red, green, blue] = [1, 3, 5].map((index) => parseInt(color.slice(index, index + 2), 16))
  const luminance = () => [red, green, blue].map((value) => {
    const channel = value / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0)
  while (luminance() > 0.18) {
    red = Math.floor(red * 0.9)
    green = Math.floor(green * 0.9)
    blue = Math.floor(blue * 0.9)
  }
  return `#${[red, green, blue].map((value) => value.toString(16).padStart(2, '0')).join('')}`
}
