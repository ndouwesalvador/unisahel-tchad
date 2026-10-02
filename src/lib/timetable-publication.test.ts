import { describe, expect, it } from 'vitest'
import { latestPublishedVersions, parsePublishedSlots } from './timetable-publication'

describe('published timetable snapshots', () => {
  it('keeps only the newest published version of each department', () => {
    expect(latestPublishedVersions([
      { departmentId: 'a', version: 0 }, { departmentId: 'b', version: 2 }, { departmentId: 'a', version: 3 },
    ])).toEqual([{ departmentId: 'a', version: 3 }, { departmentId: 'b', version: 2 }])
  })
  it('refuses a malformed snapshot instead of leaking draft slots', () => {
    expect(parsePublishedSlots([{ id: 'slot', teacherId: 'x' }])).toBeNull()
    expect(parsePublishedSlots([])).toEqual([])
  })
})
