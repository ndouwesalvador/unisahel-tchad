export type PvColumn = {
  key: string
  ueCode: string
  code: string
  label: string
  kind: 'EC' | 'UE'
  credits?: number
}

export type PvStudentRow = {
  name: string
  matricule: string
  grades: Record<string, number>
  components?: Record<string, { cc?: number; tp?: number; exam?: number; final: number }>
  average: number
  decision: string
}

export type PvSection = {
  program: string
  level: string
  columns: PvColumn[]
  students: PvStudentRow[]
}

export const PV_COLUMNS_PER_SHEET = 12
export const PV_ROWS_PER_SHEET = 11
export const PV_A4_COLUMNS_PER_SHEET = 6
export const PV_A4_ROWS_PER_SHEET = 3

export function expectedPvSheetCount(sections: PvSection[], pageFormat: 'A3' | 'A4' = 'A3'): number {
  const columns = pageFormat === 'A4' ? PV_A4_COLUMNS_PER_SHEET : PV_COLUMNS_PER_SHEET
  const rows = pageFormat === 'A4' ? PV_A4_ROWS_PER_SHEET : PV_ROWS_PER_SHEET
  return sections.reduce((sum, section) => sum +
    Math.ceil(section.columns.length / columns) *
    Math.ceil(section.students.length / rows), 0)
}

type Registration = {
  studentId: string
  programId: string
  levelId: string
  program: { name: string }
  level: { name: string; orderIndex: number }
}

type TeachingUnit = {
  id: string
  code: string | null
  name: string
  credits?: number
  orderIndex: number
  semester: { levelId: string; orderIndex: number }
  courseElements: Array<{ id: string; code: string | null; name: string; coefficient: number; orderIndex: number }>
}

type PedagogicalRegistration = { studentId: string; teachingUnitId: string; teachingUnit: TeachingUnit }
type Grade = { studentId: string; teachingUnitId: string | null; courseElementId: string | null; finalGrade: number | null; isLocked: boolean; ccGrade?: number | null; tpGrade?: number | null; examGrade?: number | null }
type Student = { id: string; firstName: string; lastName: string; matricule: string | null }
type Decision = { studentId: string; average: number | null; decision: string }

export class PvMatrixError extends Error {}

export function buildPvMatrix(input: {
  registrations: Registration[]
  pedagogicalRegistrations: PedagogicalRegistration[]
  grades: Grade[]
  students: Student[]
  decisions: Decision[]
}): PvSection[] {
  const registrationByStudent = new Map(input.registrations.map((row) => [row.studentId, row]))
  const studentById = new Map(input.students.map((row) => [row.id, row]))
  const decisionByStudent = new Map(input.decisions.map((row) => [row.studentId, row]))
  if (registrationByStudent.size !== input.decisions.length || studentById.size !== input.decisions.length ||
      decisionByStudent.size !== input.decisions.length) {
    throw new PvMatrixError('Le PV ne couvre pas exactement les inscriptions et décisions du jury.')
  }

  const gradeByKey = new Map<string, Grade>()
  for (const grade of input.grades) {
    const key = `${grade.studentId}:${grade.teachingUnitId}:${grade.courseElementId ?? 'UE'}`
    if (gradeByKey.has(key)) throw new PvMatrixError('Notes en double dans le PV.')
    gradeByKey.set(key, grade)
  }

  const sections = new Map<string, {
    program: string; level: string; levelOrder: number
    units: Map<string, TeachingUnit>; studentIds: Set<string>
    registeredUnits: Map<string, Set<string>>
  }>()
  for (const registration of input.registrations) {
    const key = `${registration.programId}:${registration.levelId}`
    if (!sections.has(key)) sections.set(key, {
      program: registration.program.name, level: registration.level.name,
      levelOrder: registration.level.orderIndex, units: new Map(),
      studentIds: new Set(), registeredUnits: new Map(),
    })
    sections.get(key)!.studentIds.add(registration.studentId)
  }
  for (const registration of input.pedagogicalRegistrations) {
    const annual = registrationByStudent.get(registration.studentId)
    if (!annual || annual.levelId !== registration.teachingUnit.semester.levelId ||
        registration.teachingUnitId !== registration.teachingUnit.id) {
      throw new PvMatrixError('Une inscription pédagogique ne correspond pas au niveau annuel de l’étudiant.')
    }
    const section = sections.get(`${annual.programId}:${annual.levelId}`)!
    section.units.set(registration.teachingUnit.id, registration.teachingUnit)
    const units = section.registeredUnits.get(registration.studentId) ?? new Set<string>()
    units.add(registration.teachingUnit.id)
    section.registeredUnits.set(registration.studentId, units)
  }

  return Array.from(sections.values()).sort((a, b) => a.program.localeCompare(b.program) || a.levelOrder - b.levelOrder)
    .map((section) => {
      const units = Array.from(section.units.values()).sort((a, b) =>
        a.semester.orderIndex - b.semester.orderIndex || a.orderIndex - b.orderIndex || a.name.localeCompare(b.name))
      const columns: PvColumn[] = units.flatMap((unit) => [
        ...[...unit.courseElements].sort((a, b) => a.orderIndex - b.orderIndex || a.name.localeCompare(b.name))
          .map((element) => ({ key: `EC:${element.id}`, ueCode: unit.code || unit.name,
            code: element.code || element.name, label: element.name, kind: 'EC' as const })),
        { key: `UE:${unit.id}`, ueCode: unit.code || unit.name,
          code: unit.code || unit.name, label: unit.name, kind: 'UE' as const, credits: unit.credits },
      ])
      if (columns.length === 0) throw new PvMatrixError('Aucune matière inscrite pour cette filière et ce niveau.')

      const students = Array.from(section.studentIds).map((studentId): PvStudentRow => {
        const student = studentById.get(studentId)
        const decision = decisionByStudent.get(studentId)
        if (!student || !decision || decision.average === null || !Number.isFinite(decision.average)) {
          throw new PvMatrixError('Identité ou décision finale manquante pour un étudiant du PV.')
        }
        const grades: Record<string, number> = {}
        const components: NonNullable<PvStudentRow['components']> = {}
        for (const unit of units) {
          if (!section.registeredUnits.get(studentId)?.has(unit.id)) continue
          if (unit.courseElements.length === 0) {
            const grade = gradeByKey.get(`${studentId}:${unit.id}:UE`)
            if (!grade?.isLocked || grade.finalGrade === null) throw new PvMatrixError('Note UE manquante ou non verrouillée dans le PV.')
            grades[`UE:${unit.id}`] = grade.finalGrade
            continue
          }
          let weighted = 0
          let totalWeight = 0
          for (const element of unit.courseElements) {
            const grade = gradeByKey.get(`${studentId}:${unit.id}:${element.id}`)
            if (!grade?.isLocked || grade.finalGrade === null || !Number.isFinite(grade.finalGrade)) {
              throw new PvMatrixError('Note de matière manquante ou non verrouillée dans le PV.')
            }
            grades[`EC:${element.id}`] = grade.finalGrade
            const partials = [grade.ccGrade, grade.tpGrade, grade.examGrade].filter((value): value is number => value != null)
            if (partials.some((value) => !Number.isFinite(value) || value < 0 || value > 20)) {
              throw new PvMatrixError('Une composante de note est hors barème dans le PV.')
            }
            components[`EC:${element.id}`] = {
              ...(grade.ccGrade == null ? {} : { cc: grade.ccGrade }),
              ...(grade.tpGrade == null ? {} : { tp: grade.tpGrade }),
              ...(grade.examGrade == null ? {} : { exam: grade.examGrade }),
              final: grade.finalGrade,
            }
            weighted += grade.finalGrade * element.coefficient
            totalWeight += element.coefficient
          }
          if (totalWeight <= 0) throw new PvMatrixError('Coefficient invalide dans la maquette du PV.')
          grades[`UE:${unit.id}`] = Math.round((weighted / totalWeight + Number.EPSILON) * 100) / 100
        }
        return { name: `${student.lastName.toUpperCase()} ${student.firstName}`.trim(),
          matricule: student.matricule || '—', grades, components, average: decision.average, decision: decision.decision }
      }).sort((a, b) => a.name.localeCompare(b.name) || a.matricule.localeCompare(b.matricule))
      return { program: section.program, level: section.level, columns, students }
    })
}
