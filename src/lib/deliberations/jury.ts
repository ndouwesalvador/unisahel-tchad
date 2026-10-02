export type JuryMember = { name: string; role: 'President' | 'Membre' }

export function parseJuryMembers(value: unknown): JuryMember[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 12 ||
      value.some((item) => !item || typeof item.name !== 'string' || item.name.trim().length < 2 ||
        item.name.trim().length > 120 || !['President', 'Membre'].includes(item.role)) ||
      value.filter((item) => item.role === 'President').length !== 1) return null
  return value.map((item) => ({ name: item.name.trim(), role: item.role }))
}
