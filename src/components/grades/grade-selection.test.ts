import { describe, expect, it } from 'vitest'
import { flattenTeachingUnits } from './grade-selection'

const structure = [{
  departments: [{ programs: [{
    id: 'program-1', name: 'Technique',
    levels: [{ id: 'level-1', name: 'L1', semesters: [{
      id: 'semester-1', name: 'S1',
      teachingUnits: [
        { id: 'unit-1', code: 'UE1', name: 'Mathématiques', courseElements: [
          { id: 'element-1', code: 'EC1', name: 'Analyse' },
          { id: 'element-2', code: 'EC2', name: 'Algèbre' },
        ] },
        { id: 'unit-2', code: 'UE2', name: 'Physique', courseElements: [
          { id: 'element-3', code: 'EC3', name: 'Mécanique' },
        ] },
      ],
    }] }],
  }] }],
}]

describe('grade matter selection', () => {
  it('keeps every course element selectable for administration', () => {
    const units = flattenTeachingUnits(structure)
    expect(units).toHaveLength(2)
    expect(units[0].courseElements.map((element) => element.id)).toEqual(['element-1', 'element-2'])
  })

  it('shows teachers only their assigned course elements and units', () => {
    const units = flattenTeachingUnits(structure, new Set(['element-2']))
    expect(units).toHaveLength(1)
    expect(units[0].teachingUnitId).toBe('unit-1')
    expect(units[0].courseElements.map((element) => element.id)).toEqual(['element-2'])
  })
})
