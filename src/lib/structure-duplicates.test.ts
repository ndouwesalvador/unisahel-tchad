import { describe, expect, it } from 'vitest'
import { duplicateNameGroups, findStructureConflict, normalizeStructureLabel } from './structure-duplicates'

describe('academic structure duplicates', () => {
  const levels = [
    { id: 'one', name: 'LICENCE 1', code: 'GIM1' },
    { id: 'two', name: 'Licence 1', code: 'L1' },
    { id: 'three', name: 'Licence 2', code: 'L2' },
  ]

  it('normalizes case, accents, and repeated spaces', () => {
    expect(normalizeStructureLabel('  Seméstre   1 ')).toBe('semestre 1')
  })

  it('finds a duplicate name even when the code differs', () => {
    expect(findStructureConflict(levels, { name: 'licence  1', code: 'NEW' })?.id).toBe('one')
  })

  it('finds a duplicate code and excludes the edited record', () => {
    expect(findStructureConflict(levels, { name: 'Autre', code: ' l1 ' })?.id).toBe('two')
    expect(findStructureConflict(levels, { name: 'Licence 2', code: 'L2' }, 'three')).toBeUndefined()
  })

  it('groups only siblings with a duplicate normalized name', () => {
    expect(duplicateNameGroups(levels)).toEqual([[levels[0], levels[1]]])
  })
})
