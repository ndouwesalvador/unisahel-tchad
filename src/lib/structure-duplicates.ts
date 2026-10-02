export function normalizeStructureLabel(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('fr')
}

export interface StructureSibling {
  id: string
  name: string
  code: string | null
}

export function findStructureConflict(
  siblings: StructureSibling[],
  candidate: { name: string; code?: string | null },
  excludeId?: string,
): StructureSibling | undefined {
  const name = normalizeStructureLabel(candidate.name)
  const code = normalizeStructureLabel(candidate.code ?? '')
  return siblings.find((sibling) =>
    sibling.id !== excludeId && (
      normalizeStructureLabel(sibling.name) === name ||
      (Boolean(code) && normalizeStructureLabel(sibling.code ?? '') === code)
    ),
  )
}

export function duplicateNameGroups<T extends StructureSibling>(siblings: T[]): T[][] {
  const byName = new Map<string, T[]>()
  for (const sibling of siblings) {
    const key = normalizeStructureLabel(sibling.name)
    const group = byName.get(key) ?? []
    group.push(sibling)
    byName.set(key, group)
  }
  return [...byName.values()].filter((group) => group.length > 1)
}
