import { db } from '@/lib/db'

type ExpectedGradeItem = {
  studentId: string
  teachingUnitId: string
  courseElementId: string | null
  ueCode: string | null
  ueName: string
  ecCode: string | null
  ecName: string | null
  student: { id: string; firstName: string; lastName: string; matricule: string | null }
}

type MissingGradeItem = {
  ueCode: string | null
  ueName: string
  ecCode: string | null
  ecName: string | null
}

function gradeKey(studentId: string, teachingUnitId: string, courseElementId?: string | null) {
  return `${studentId}:${teachingUnitId}:${courseElementId || 'UE'}`
}

export async function computeGradeReadiness(tenantId: string, academicYearId: string, session: string, departmentId: string) {
  const programs = await db.program.findMany({
    where: { tenantId, departmentId }, select: { id: true },
  })
  // The annual registration is preferred, but development and migration data
  // can legitimately have a validated current student without a separate
  // registration row. Keep the jury pipeline aligned with the teacher roster
  // in that case instead of silently producing a 0/0 deliberation.
  let enrolments = await db.administrativeRegistration.findMany({
    where: { tenantId, academicYearId, status: 'INSCRIT', programId: { in: programs.map((program) => program.id) } },
    select: { studentId: true, student: { select: { id: true, firstName: true, lastName: true, matricule: true } } },
  })
  if (enrolments.length === 0 && programs.length > 0) {
    const currentStudents = await db.student.findMany({
      where: { tenantId, OR: [
        { currentProgramId: { in: programs.map((program) => program.id) } },
        { currentLevel: { programId: { in: programs.map((program) => program.id) } } },
      ] },
      select: { id: true, firstName: true, lastName: true, matricule: true },
    })
    enrolments = currentStudents.map((student) => ({ studentId: student.id, student }))
  }
  const enrolled = new Map(enrolments.map((entry) => [entry.studentId, entry.student]))
  const studentIds = Array.from(enrolled.keys())
  let registrations = await db.pedagogicalRegistration.findMany({
    where: { academicYearId, status: 'ACTIVE', studentId: { in: studentIds }, student: { tenantId } },
    select: {
      studentId: true,
      teachingUnitId: true,
      student: { select: { id: true, firstName: true, lastName: true, matricule: true } },
      teachingUnit: {
        select: {
          id: true, code: true, name: true,
          courseElements: { orderBy: { orderIndex: 'asc' }, select: { id: true, code: true, name: true } },
        },
      },
    },
  })

  // If no pedagogical registrations were created yet, derive the expected
  // subjects from the department curriculum. This is the same source used by
  // the teacher's level roster and prevents entered grades from disappearing
  // from the jury view merely because an optional registration step was
  // skipped.
  const studentsWithoutPedagogicalRegistration = Array.from(enrolled.values())
    .filter((student) => !registrations.some((registration) => registration.studentId === student.id))
  if (registrations.length === 0 && studentsWithoutPedagogicalRegistration.length > 0 && programs.length > 0) {
    const units = await db.teachingUnit.findMany({
      where: { semester: { level: { programId: { in: programs.map((program) => program.id) } } } },
      select: {
        id: true, code: true, name: true,
        semester: { select: { levelId: true } },
        courseElements: { orderBy: { orderIndex: 'asc' }, select: { id: true, code: true, name: true } },
      },
    })
    const fallback = studentsWithoutPedagogicalRegistration.flatMap((student) => units.map((unit) => ({
      studentId: student.id,
      teachingUnitId: unit.id,
      student,
      teachingUnit: {
        id: unit.id, code: unit.code, name: unit.name,
        courseElements: unit.courseElements,
      },
    })))
    registrations = [...registrations, ...fallback]
  }

  const expected: ExpectedGradeItem[] = registrations.flatMap((registration): ExpectedGradeItem[] => {
    const elements = registration.teachingUnit.courseElements
    if (elements.length === 0) {
      return [{
        studentId: registration.studentId, teachingUnitId: registration.teachingUnitId,
        courseElementId: null, ueCode: registration.teachingUnit.code,
        ueName: registration.teachingUnit.name, ecCode: null, ecName: null,
        student: registration.student,
      }]
    }
    return elements.map((element) => ({
      studentId: registration.studentId, teachingUnitId: registration.teachingUnitId,
      courseElementId: element.id, ueCode: registration.teachingUnit.code,
      ueName: registration.teachingUnit.name, ecCode: element.code, ecName: element.name,
      student: registration.student,
    }))
  })

  const grades = await db.grade.findMany({
    where: { student: { tenantId }, studentId: { in: studentIds }, academicYearId, session },
    select: {
      studentId: true, teachingUnitId: true, courseElementId: true,
      finalGrade: true, isLocked: true, isAbsent: true, isDefaillant: true,
    },
  })
  const expectedKeys = new Set(expected.map((item) => gradeKey(item.studentId, item.teachingUnitId, item.courseElementId)))
  const gradesByKey = new Map<string, typeof grades>()
  let unexpectedGradeCount = 0
  for (const grade of grades) {
    if (!grade.teachingUnitId) {
      unexpectedGradeCount += 1
      continue
    }
    const key = gradeKey(grade.studentId, grade.teachingUnitId, grade.courseElementId)
    if (!expectedKeys.has(key)) {
      unexpectedGradeCount += 1
      continue
    }
    const rows = gradesByKey.get(key) ?? []
    rows.push(grade)
    gradesByKey.set(key, rows)
  }

  const byStudent = new Map<string, {
    studentId: string
    name: string
    matricule: string
    expected: number
    locked: number
    missing: number
    missingItems: MissingGradeItem[]
  }>()

  for (const student of enrolled.values()) {
    byStudent.set(student.id, {
      studentId: student.id,
      name: `${student.firstName} ${student.lastName}`.trim(),
      matricule: student.matricule || '—',
      expected: 0, locked: 0, missing: 0, missingItems: [],
    })
  }

  for (const item of expected) {
    const existing = byStudent.get(item.studentId) || {
      studentId: item.studentId,
      name: `${item.student.firstName} ${item.student.lastName}`.trim(),
      matricule: item.student.matricule || '—',
      expected: 0, locked: 0, missing: 0, missingItems: [],
    }
    existing.expected += 1
    const rows = gradesByKey.get(gradeKey(item.studentId, item.teachingUnitId, item.courseElementId)) ?? []
    const grade = rows[0]
    if (rows.length === 1 && grade.isLocked && !grade.isAbsent && !grade.isDefaillant &&
        grade.finalGrade !== null && Number.isFinite(grade.finalGrade) && grade.finalGrade >= 0 && grade.finalGrade <= 20) {
      existing.locked += 1
    } else {
      existing.missing += 1
      existing.missingItems.push({ ueCode: item.ueCode, ueName: item.ueName, ecCode: item.ecCode, ecName: item.ecName })
    }
    byStudent.set(item.studentId, existing)
  }

  const students = Array.from(byStudent.values()).sort((a, b) => a.name.localeCompare(b.name))
  const expectedGradeCount = students.reduce((sum, student) => sum + student.expected, 0)
  const lockedGradeCount = students.reduce((sum, student) => sum + student.locked, 0)
  const studentsWithoutRegistration = students.filter((student) => student.expected === 0).length
  const missingGradeCount = Math.max(expectedGradeCount - lockedGradeCount, 0)
  return {
    ready: students.length > 0 && expectedGradeCount > 0 && studentsWithoutRegistration === 0 && missingGradeCount === 0 && unexpectedGradeCount === 0,
    expectedGradeCount, lockedGradeCount, missingGradeCount, unexpectedGradeCount, studentsWithoutRegistration,
    studentsTotal: students.length,
    studentIds: students.map((student) => student.studentId),
    studentsReady: students.filter((student) => student.expected > 0 && student.missing === 0).length,
    incompleteStudents: students.filter((student) => student.missing > 0 || student.expected === 0)
      .map((student) => ({ ...student, missingItems: student.missingItems.slice(0, 8) })),
  }
}
