export interface GradeTeachingUnitOption {
  teachingUnitId: string
  courseElements: { id: string; code: string; name: string }[]
  code: string
  name: string
  semesterId: string
  semesterName: string
  levelId: string
  levelName: string
  programId: string
  programName: string
}

interface CourseElementNode { id: string; code?: string | null; name: string }
interface TeachingUnitNode { id: string; code?: string | null; name: string; courseElements?: CourseElementNode[] }
interface SemesterNode { id: string; name: string; teachingUnits?: TeachingUnitNode[] }
interface LevelNode { id: string; name: string; semesters?: SemesterNode[] }
interface ProgramNode { id: string; name: string; levels?: LevelNode[] }
interface DepartmentNode { programs?: ProgramNode[] }
interface FacultyNode { departments?: DepartmentNode[] }

export function flattenTeachingUnits(faculties: FacultyNode[], allowedElements?: Set<string>): GradeTeachingUnitOption[] {
  const result: GradeTeachingUnitOption[] = []
  for (const faculty of faculties) {
    for (const dept of faculty.departments || []) {
      for (const program of dept.programs || []) {
        for (const level of program.levels || []) {
          for (const semester of level.semesters || []) {
            for (const unit of semester.teachingUnits || []) {
              const courseElements = (unit.courseElements || [])
                .filter((element) => !allowedElements || allowedElements.has(element.id))
                .map((element) => ({ id: element.id, code: element.code || element.id, name: element.name }))
              if (allowedElements && courseElements.length === 0) continue
              result.push({
                teachingUnitId: unit.id,
                courseElements,
                code: unit.code || unit.id,
                name: unit.name,
                semesterId: semester.id,
                semesterName: semester.name,
                levelId: level.id,
                levelName: level.name,
                programId: program.id,
                programName: program.name,
              })
            }
          }
        }
      }
    }
  }
  return result
}
