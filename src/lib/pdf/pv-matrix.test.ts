import { describe, expect, it } from 'vitest'
import { buildPvMatrix, expectedPvSheetCount, PvMatrixError } from './pv-matrix'

const unit = {
  id: 'ue-1', code: 'UE1', name: 'Sciences appliquées', orderIndex: 1,
  semester: { levelId: 'level-1', orderIndex: 1 },
  courseElements: [
    { id: 'ec-1', code: 'MAT', name: 'Mathématiques', coefficient: 2, orderIndex: 1 },
    { id: 'ec-2', code: 'PHY', name: 'Physique', coefficient: 1, orderIndex: 2 },
  ],
}

const input = {
  registrations: [
    { studentId: 's-1', programId: 'p-1', levelId: 'level-1', program: { name: 'Génie industriel' }, level: { name: 'Licence 1', orderIndex: 1 } },
    { studentId: 's-2', programId: 'p-1', levelId: 'level-1', program: { name: 'Génie industriel' }, level: { name: 'Licence 1', orderIndex: 1 } },
  ],
  pedagogicalRegistrations: [
    { studentId: 's-1', teachingUnitId: 'ue-1', teachingUnit: unit },
    { studentId: 's-2', teachingUnitId: 'ue-1', teachingUnit: unit },
  ],
  grades: [
    { studentId: 's-1', teachingUnitId: 'ue-1', courseElementId: 'ec-1', finalGrade: 12, isLocked: true },
    { studentId: 's-1', teachingUnitId: 'ue-1', courseElementId: 'ec-2', finalGrade: 18, isLocked: true },
    { studentId: 's-2', teachingUnitId: 'ue-1', courseElementId: 'ec-1', finalGrade: 8, isLocked: true },
    { studentId: 's-2', teachingUnitId: 'ue-1', courseElementId: 'ec-2', finalGrade: 11, isLocked: true },
  ],
  students: [
    { id: 's-1', firstName: 'Awa', lastName: 'Diallo', matricule: 'A001' },
    { id: 's-2', firstName: 'Idriss', lastName: 'Adam', matricule: 'A002' },
  ],
  decisions: [
    { studentId: 's-1', average: 14, decision: 'ADMI' },
    { studentId: 's-2', average: 9, decision: 'AJOURNE' },
  ],
}

describe('department PV matrix', () => {
  it('puts EC and weighted UE results in columns and one student per row', () => {
    const [section] = buildPvMatrix(input)
    expect(section.columns.map(column => column.key)).toEqual(['EC:ec-1', 'EC:ec-2', 'UE:ue-1'])
    expect(section.students.map(student => student.matricule)).toEqual(['A002', 'A001'])
    expect(section.students[1]).toMatchObject({ average: 14, decision: 'ADMI', grades: {
      'EC:ec-1': 12, 'EC:ec-2': 18, 'UE:ue-1': 14,
    } })
    expect(section.students[0].grades['UE:ue-1']).toBe(9)
    expect(expectedPvSheetCount([section])).toBe(1)
  })

  it('does not publish incomplete or unlocked results', () => {
    const grades = input.grades.filter(grade => grade.courseElementId !== 'ec-2' || grade.studentId !== 's-1')
    expect(() => buildPvMatrix({ ...input, grades })).toThrow(PvMatrixError)
    expect(() => buildPvMatrix({ ...input, grades: input.grades.map(grade =>
      grade.studentId === 's-1' ? { ...grade, isLocked: false } : grade) })).toThrow(PvMatrixError)
  })

  it('rejects a registration assigned to another academic level', () => {
    const pedagogicalRegistrations = [{ ...input.pedagogicalRegistrations[0], teachingUnit: {
      ...unit, semester: { levelId: 'level-2', orderIndex: 1 },
    } }, input.pedagogicalRegistrations[1]]
    expect(() => buildPvMatrix({ ...input, pedagogicalRegistrations })).toThrow(PvMatrixError)
  })
})
