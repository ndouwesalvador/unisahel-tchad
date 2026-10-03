import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { resolveOwnStudentId, isStudentSelfRole } from '@/lib/auth/student-scope'
import { isValidGradingPolicy, resolveGradingPolicy } from '@/lib/grading-policy'
import { gradeQuerySchema, validateQuery } from '@/lib/validations/api'

const GRADE_OVERSIGHT_ROLES = new Set(['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE', 'RECTORAT', 'RESPONSABLE_FILIERE', 'JURY'])
const GRADE_ENTRY_ROLES = new Set(['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE', 'ENSEIGNANT', 'RESPONSABLE_FILIERE'])

function gradeCompletionKey(studentId: string, teachingUnitId: string, courseElementId?: string | null) {
  return `${studentId}:${teachingUnitId}:${courseElementId || 'UE'}`
}

async function assignedTeacherId(user: SessionUser, tenantId: string): Promise<string | null> {
  if (user.role !== 'ENSEIGNANT') return null
  const teacher = await db.teacher.findFirst({
    where: { userId: user.id, tenantId, isActive: true },
    select: { id: true },
  })
  return teacher?.id ?? null
}

async function getTeacherAssignmentsHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  if (user.role !== 'ENSEIGNANT') {
    return NextResponse.json({ error: 'Accès réservé aux enseignants' }, { status: 403 })
  }
  const teacherId = await assignedTeacherId(user, tenantId)
  if (!teacherId) {
    return NextResponse.json({ error: 'Enseignant non associé à cet établissement' }, { status: 403 })
  }
  const academicYearId = await resolveAcademicYearId(tenantId, new URL(request.url).searchParams.get('academicYearId'))
  if (!academicYearId) return NextResponse.json({ error: 'Année académique introuvable' }, { status: 404 })
  const services = await db.teachingService.findMany({
    where: { tenantId, teacherId, academicYearId, status: 'APPROVED' },
    select: { courseElementId: true },
  })
  return NextResponse.json({ data: { courseElementIds: services.map((service) => service.courseElementId) } })
}

async function getGradingPolicyHandler(user: SessionUser, tenantId: string) {
  if (!GRADE_ENTRY_ROLES.has(user.role)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }
  const settings = await db.tenantSettings.findUnique({ where: { tenantId } })
  const policy = resolveGradingPolicy(settings)
  if (!isValidGradingPolicy(policy)) {
    return NextResponse.json({ error: 'Coefficients de notation invalides dans les paramètres de l’établissement' }, { status: 409 })
  }
  return NextResponse.json({ data: { ...policy, passingGrade: settings?.passingGrade ?? 10 } })
}

async function getGradeRosterHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  if (!GRADE_ENTRY_ROLES.has(user.role)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  const teacherId = await assignedTeacherId(user, tenantId)
  if (user.role === 'ENSEIGNANT' && !teacherId) {
    return NextResponse.json({ error: 'Enseignant non associé à cet établissement' }, { status: 403 })
  }

  const params = new URL(request.url).searchParams
  const courseElementId = params.get('courseElementId')
  const academicYearId = params.get('academicYearId')
  if (!courseElementId || !academicYearId) {
    return NextResponse.json({ error: 'Matière et année académique requises' }, { status: 400 })
  }
  if (!await academicYearBelongsToTenant(academicYearId, tenantId)) {
    return NextResponse.json({ error: 'Année académique introuvable' }, { status: 404 })
  }
  const element = await db.courseElement.findFirst({
    where: {
      id: courseElementId,
      teachingUnit: { semester: { level: { program: { tenantId } } } },
      ...(teacherId ? { teachingServices: { some: { tenantId, teacherId, academicYearId, status: 'APPROVED' } } } : {}),
    },
    select: { teachingUnitId: true, teachingUnit: { select: { semester: { select: { levelId: true } } } } },
  })
  if (!element) return NextResponse.json({ error: 'Enseignement inaccessible' }, { status: 403 })

  const registrations = await db.pedagogicalRegistration.findMany({
    where: {
      teachingUnitId: element.teachingUnitId,
      academicYearId,
      status: 'ACTIVE',
      student: { tenantId, registrations: { some: { tenantId, academicYearId, status: 'INSCRIT',
        levelId: element.teachingUnit.semester.levelId } } },
    },
    select: { student: { select: { id: true, matricule: true, firstName: true, lastName: true } } },
    orderBy: { student: { lastName: 'asc' } },
  })
  return NextResponse.json({ data: registrations.map((registration) => registration.student) })
}

async function academicYearBelongsToTenant(academicYearId: string, tenantId: string): Promise<boolean> {
  const year = await db.academicYear.findFirst({
    where: { id: academicYearId, tenantId },
    select: { id: true },
  })
  return Boolean(year)
}

async function resolveAcademicYearId(tenantId: string, requestedAcademicYearId: string | null) {
  if (requestedAcademicYearId) {
    return await academicYearBelongsToTenant(requestedAcademicYearId, tenantId) ? requestedAcademicYearId : null
  }
  const current = await db.academicYear.findFirst({
    where: { tenantId, isCurrent: true },
    select: { id: true },
  })
  return current?.id || null
}

async function getGradesHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const validatedQuery = validateQuery(gradeQuerySchema, searchParams)

    const ownStudentId = await resolveOwnStudentId(user)
    if (isStudentSelfRole(user.role) && !ownStudentId) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Accès refusé' }, { status: 403 })
    }
    if (ownStudentId && validatedQuery.studentId && validatedQuery.studentId !== ownStudentId) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Accès refusé' }, { status: 403 })
    }
    const { academicYearId, semesterId, teachingUnitId, courseElementId, session, page, limit } = validatedQuery
    const studentId = ownStudentId ?? validatedQuery.studentId
    const skip = (page - 1) * limit

    const where: Prisma.GradeWhereInput = { student: { tenantId } }
    if (isStudentSelfRole(user.role)) where.isLocked = true
    const teacherId = await assignedTeacherId(user, tenantId)
    let teacherCourseIds: string[] | null = null
    if (user.role === 'ENSEIGNANT') {
      if (!teacherId) return NextResponse.json({ error: 'Enseignant non associé à cet établissement' }, { status: 403 })
      const yearId = await resolveAcademicYearId(tenantId, academicYearId ?? null)
      if (!yearId) return NextResponse.json({ error: 'Année académique introuvable' }, { status: 404 })
      const services = await db.teachingService.findMany({
        where: { tenantId, teacherId, academicYearId: yearId, status: 'APPROVED' },
        select: { courseElementId: true },
      })
      teacherCourseIds = services.map((service) => service.courseElementId)
      where.academicYearId = yearId
      where.courseElementId = { in: teacherCourseIds }
    }
    if (user.role === 'JURY') {
      const jury = await db.user.findFirst({
        where: { id: user.id, tenantId, role: 'JURY', isActive: true, department: { isActive: true } },
        select: { departmentId: true },
      })
      if (!jury?.departmentId) return NextResponse.json({ error: 'Jury sans département actif' }, { status: 403 })
      where.AND = [{ teachingUnit: { semester: { level: { program: { tenantId, departmentId: jury.departmentId } } } } }]
    }

    if (studentId) {
      where.studentId = studentId
    }

    if (academicYearId && !await academicYearBelongsToTenant(academicYearId, tenantId)) {
      return NextResponse.json({ error: 'Année académique introuvable' }, { status: 404 })
    }

    if (academicYearId) {
      where.academicYearId = academicYearId
    }

    if (semesterId) {
      where.courseElement = {
        teachingUnit: { semesterId },
      }
    }

    if (teachingUnitId) {
      where.teachingUnitId = teachingUnitId
    }

    if (courseElementId) {
      if (teacherCourseIds && !teacherCourseIds.includes(courseElementId)) {
        return NextResponse.json({ error: 'Matière hors du service annuel approuvé' }, { status: 403 })
      }
      where.courseElementId = courseElementId
    }

    if (session) {
      where.session = session
    }

    if (studentId) {
      const student = await db.student.findFirst({
        where: { id: studentId, tenantId },
      })
      if (!student) {
        return NextResponse.json(
          { error: 'Student not found or does not belong to this tenant' },
          { status: 404 }
        )
      }
    }

    const [grades, total] = await Promise.all([
      db.grade.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              matricule: true,
              currentProgram: { select: { name: true } },
              currentLevel: { select: { name: true, code: true } },
            },
          },
          teachingUnit: {
            select: {
              id: true,
              code: true,
              name: true,
              credits: true,
              type: true,
              compensable: true,
              semester: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  level: {
                    select: {
                      id: true,
                      name: true,
                      code: true,
                      program: { select: { id: true, name: true } },
                    },
                  },
                },
              },
            },
          },
          courseElement: {
            select: {
              id: true,
              code: true,
              name: true,
              coefficient: true,
              hoursCM: true,
              hoursTD: true,
              hoursTP: true,
              teacher: {
                select: {
                  id: true,
                  grade: true,
                  specialization: true,
                  user: { select: { firstName: true, lastName: true } },
                },
              },
            },
          },
        },
        orderBy: [
          { teachingUnit: { semester: { level: { orderIndex: 'asc' } } } },
          { teachingUnit: { semester: { orderIndex: 'asc' } } },
          { teachingUnit: { orderIndex: 'asc' } },
          { courseElement: { orderIndex: 'asc' } },
        ],
        skip,
        take: limit,
      }),
      db.grade.count({ where }),
    ])

    // Group grades by semester and UE for structured response
    const groupedGrades: Record<string, { semester: unknown; teachingUnits: Record<string, { teachingUnit: unknown; grades: unknown[] }> }> = {}

    for (const grade of grades) {
      const semesterKey = grade.teachingUnit?.semester?.id || 'unknown'
      const ueKey = grade.teachingUnit?.id || 'unknown'

      if (!groupedGrades[semesterKey]) {
        groupedGrades[semesterKey] = {
          semester: grade.teachingUnit?.semester || null,
          teachingUnits: {},
        }
      }

      if (!groupedGrades[semesterKey].teachingUnits[ueKey]) {
        groupedGrades[semesterKey].teachingUnits[ueKey] = {
          teachingUnit: grade.teachingUnit
            ? {
                id: grade.teachingUnit.id,
                code: grade.teachingUnit.code,
                name: grade.teachingUnit.name,
                credits: grade.teachingUnit.credits,
                type: grade.teachingUnit.type,
                compensable: grade.teachingUnit.compensable,
              }
            : null,
          grades: [],
        }
      }

      groupedGrades[semesterKey].teachingUnits[ueKey].grades.push({
        id: grade.id,
        courseElement: grade.courseElement,
        ccGrade: grade.ccGrade,
        examGrade: grade.examGrade,
        tpGrade: grade.tpGrade,
        stageGrade: grade.stageGrade,
        oralGrade: grade.oralGrade,
        memoireGrade: grade.memoireGrade,
        projectGrade: grade.projectGrade,
        finalGrade: grade.finalGrade,
        isAbsent: grade.isAbsent,
        isJustified: grade.isJustified,
        isDefaillant: grade.isDefaillant,
        isLocked: grade.isLocked,
        session: grade.session,
        comment: grade.comment,
      })
    }

    const structuredGrades = Object.values(groupedGrades).map((semData) => ({
      semester: semData.semester,
      teachingUnits: Object.values(semData.teachingUnits),
    }))

    // Calculate summary stats if a specific student is requested
    let summary = null
    if (studentId) {
      const totalGrades = grades.length
      const validatedGrades = grades.filter(
        (g) => g.finalGrade !== null && g.finalGrade >= 10
      ).length
      const averageFinalGrade =
        grades.length > 0
          ? grades
              .filter((g) => g.finalGrade !== null)
              .reduce((sum, g) => sum + (g.finalGrade || 0), 0) /
            Math.max(grades.filter((g) => g.finalGrade !== null).length, 1)
          : 0

      summary = {
        totalGrades,
        validatedGrades,
        failedGrades: totalGrades - validatedGrades,
        averageFinalGrade: Math.round(averageFinalGrade * 100) / 100,
      }
    }

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      data: grades,
      grouped: structuredGrades,
      summary,
      student: studentId
        ? grades[0]?.student || null
        : null,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error('Grades API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch grades',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

async function getGradeCompletionHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    if (!GRADE_OVERSIGHT_ROLES.has(user.role)) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const academicYearId = await resolveAcademicYearId(tenantId, searchParams.get('academicYearId'))
    const session = searchParams.get('session') === 'RATTRAPAGE' ? 'RATTRAPAGE' : 'NORMALE'

    if (!academicYearId) {
      return NextResponse.json({
        data: {
          ready: false,
          expectedGradeCount: 0,
          enteredGradeCount: 0,
          lockedGradeCount: 0,
          missingGradeCount: 0,
          studentsTotal: 0,
          studentsReady: 0,
          byTeachingUnit: [],
          incompleteStudents: [],
        },
      })
    }

    const registrations = await db.pedagogicalRegistration.findMany({
      where: {
        academicYearId,
        status: 'ACTIVE',
        student: { tenantId },
      },
      select: {
        studentId: true,
        teachingUnitId: true,
        student: { select: { id: true, firstName: true, lastName: true, matricule: true } },
        teachingUnit: {
          select: {
            id: true,
            code: true,
            name: true,
            semester: {
              select: {
                id: true,
                name: true,
                level: {
                  select: {
                    id: true,
                    name: true,
                    program: { select: { id: true, name: true } },
                  },
                },
              },
            },
            courseElements: {
              orderBy: { orderIndex: 'asc' },
              select: { id: true, code: true, name: true },
            },
          },
        },
      },
    })

    const grades = await db.grade.findMany({
      where: {
        student: { tenantId },
        academicYearId,
        session,
        finalGrade: { not: null },
      },
      select: {
        studentId: true,
        teachingUnitId: true,
        courseElementId: true,
        isLocked: true,
      },
    })

    const enteredKeys = new Set(
      grades
        .filter((grade) => grade.teachingUnitId)
        .map((grade) => gradeCompletionKey(grade.studentId, grade.teachingUnitId as string, grade.courseElementId))
    )
    const lockedKeys = new Set(
      grades
        .filter((grade) => grade.teachingUnitId && grade.isLocked)
        .map((grade) => gradeCompletionKey(grade.studentId, grade.teachingUnitId as string, grade.courseElementId))
    )

    const byTeachingUnit = new Map<string, {
      teachingUnitId: string
      courseElementId: string | null
      code: string
      name: string
      ecCode: string | null
      ecName: string | null
      semesterName: string
      levelName: string
      programName: string
      expected: number
      entered: number
      locked: number
      missing: number
    }>()
    const byStudent = new Map<string, {
      studentId: string
      name: string
      matricule: string
      expected: number
      entered: number
      locked: number
      missing: number
      missingItems: { teachingUnitId: string; courseElementId: string | null; label: string }[]
    }>()

    for (const registration of registrations) {
      const elements = registration.teachingUnit.courseElements.length > 0
        ? registration.teachingUnit.courseElements
        : [{ id: null, code: null, name: null }]

      for (const element of elements) {
        const courseElementId = element.id
        const key = gradeCompletionKey(registration.studentId, registration.teachingUnitId, courseElementId)
        const itemKey = `${registration.teachingUnitId}:${courseElementId || 'UE'}`
        const label = element.code || element.name
          ? `${registration.teachingUnit.code || registration.teachingUnit.name} / ${element.code || element.name}`
          : `${registration.teachingUnit.code || registration.teachingUnit.name}`
        const existingItem = byTeachingUnit.get(itemKey) || {
          teachingUnitId: registration.teachingUnitId,
          courseElementId,
          code: registration.teachingUnit.code || registration.teachingUnit.id,
          name: registration.teachingUnit.name,
          ecCode: element.code,
          ecName: element.name,
          semesterName: registration.teachingUnit.semester.name,
          levelName: registration.teachingUnit.semester.level.name,
          programName: registration.teachingUnit.semester.level.program.name,
          expected: 0,
          entered: 0,
          locked: 0,
          missing: 0,
        }
        existingItem.expected += 1
        if (enteredKeys.has(key)) existingItem.entered += 1
        if (lockedKeys.has(key)) existingItem.locked += 1
        if (!lockedKeys.has(key)) existingItem.missing += 1
        byTeachingUnit.set(itemKey, existingItem)

        const studentItem = byStudent.get(registration.studentId) || {
          studentId: registration.studentId,
          name: `${registration.student.firstName} ${registration.student.lastName}`.trim(),
          matricule: registration.student.matricule || '—',
          expected: 0,
          entered: 0,
          locked: 0,
          missing: 0,
          missingItems: [],
        }
        studentItem.expected += 1
        if (enteredKeys.has(key)) studentItem.entered += 1
        if (lockedKeys.has(key)) {
          studentItem.locked += 1
        } else {
          studentItem.missing += 1
          studentItem.missingItems.push({ teachingUnitId: registration.teachingUnitId, courseElementId, label })
        }
        byStudent.set(registration.studentId, studentItem)
      }
    }

    const teachingUnits = Array.from(byTeachingUnit.values())
      .sort((a, b) => (b.missing - a.missing) || a.code.localeCompare(b.code))
    const students = Array.from(byStudent.values()).sort((a, b) => a.name.localeCompare(b.name))
    const expectedGradeCount = teachingUnits.reduce((sum, item) => sum + item.expected, 0)
    const enteredGradeCount = teachingUnits.reduce((sum, item) => sum + item.entered, 0)
    const lockedGradeCount = teachingUnits.reduce((sum, item) => sum + item.locked, 0)
    const missingGradeCount = Math.max(expectedGradeCount - lockedGradeCount, 0)

    return NextResponse.json({
      data: {
        ready: expectedGradeCount > 0 && missingGradeCount === 0,
        expectedGradeCount,
        enteredGradeCount,
        lockedGradeCount,
        missingGradeCount,
        studentsTotal: students.length,
        studentsReady: students.filter((student) => student.expected > 0 && student.missing === 0).length,
        byTeachingUnit: teachingUnits,
        incompleteStudents: students
          .filter((student) => student.missing > 0)
          .map((student) => ({ ...student, missingItems: student.missingItems.slice(0, 8) })),
      },
    })
  } catch (error) {
    console.error('Grade completion error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch grade completion', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function getGradeStatsHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const academicYearId = searchParams.get('academicYearId') || ''
    const semesterId = searchParams.get('semesterId') || ''
    const teachingUnitId = searchParams.get('teachingUnitId') || ''

    const where: Prisma.GradeWhereInput = { student: { tenantId } }
    if (academicYearId) where.academicYearId = academicYearId
    if (semesterId) {
      where.courseElement = { teachingUnit: { semesterId } }
    }
    if (teachingUnitId) where.teachingUnitId = teachingUnitId

    const grades = await db.grade.findMany({
      where,
      select: {
        finalGrade: true,
        ccGrade: true,
        examGrade: true,
        tpGrade: true,
        isAbsent: true,
        isDefaillant: true,
        courseElement: {
          select: {
            id: true,
            code: true,
            name: true,
            coefficient: true,
            teachingUnit: { select: { id: true, code: true, name: true } },
          },
        },
      },
    })

    // Overall stats
    const totalGrades = grades.length
    const gradedCount = grades.filter(g => g.finalGrade !== null).length
    const absentCount = grades.filter(g => g.isAbsent).length
    const defaillantCount = grades.filter(g => g.isDefaillant).length
    const passedCount = grades.filter(g => g.finalGrade !== null && g.finalGrade >= 10).length
    const averageGrade = gradedCount > 0
      ? grades.filter(g => g.finalGrade !== null).reduce((sum, g) => sum + (g.finalGrade || 0), 0) / gradedCount
      : 0

    // Stats per course element
    const courseStats: Record<string, { total: number; graded: number; average: number; passed: number }> = {}
    for (const g of grades) {
      const ceId = g.courseElement?.id || 'unknown'
      if (!courseStats[ceId]) {
        courseStats[ceId] = { total: 0, graded: 0, average: 0, passed: 0 }
      }
      courseStats[ceId].total++
      if (g.finalGrade !== null) {
        courseStats[ceId].graded++
        courseStats[ceId].average += g.finalGrade
        if (g.finalGrade >= 10) courseStats[ceId].passed++
      }
    }
    for (const key of Object.keys(courseStats)) {
      if (courseStats[key].graded > 0) {
        courseStats[key].average = Math.round(courseStats[key].average / courseStats[key].graded * 100) / 100
      }
    }

    return NextResponse.json({
      data: {
        overall: {
          totalGrades,
          gradedCount,
          absentCount,
          defaillantCount,
          passedCount,
          failedCount: gradedCount - passedCount,
          passRate: gradedCount > 0 ? Math.round(passedCount / gradedCount * 10000) / 100 : 0,
          averageGrade: Math.round(averageGrade * 100) / 100,
        },
        byCourseElement: Object.entries(courseStats).map(([courseElementId, stats]) => ({
          courseElementId,
          ...stats,
        })),
      },
    })
  } catch (error) {
    console.error('Grade stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch grade stats', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export const GET = withTenantAuth(async (user: SessionUser, tenantId: string, request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (action === 'assignments') {
    return getTeacherAssignmentsHandler(user, tenantId, request)
  }
  if (action === 'roster') {
    return getGradeRosterHandler(user, tenantId, request)
  }
  if (action === 'policy') {
    return getGradingPolicyHandler(user, tenantId)
  }

  if (action === 'stats') {
    if (!GRADE_OVERSIGHT_ROLES.has(user.role) || user.role === 'JURY') {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Accès refusé' }, { status: 403 })
    }
    return getGradeStatsHandler(user, tenantId, request)
  }
  if (action === 'completion') {
    if (user.role === 'JURY') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    return getGradeCompletionHandler(user, tenantId, request)
  }
  if (!GRADE_OVERSIGHT_ROLES.has(user.role) && user.role !== 'ENSEIGNANT' && !isStudentSelfRole(user.role)) {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Accès refusé' }, { status: 403 })
  }
  return getGradesHandler(user, tenantId, request)
})

// The former bulk/create/update/lock entrypoints accepted institution admins and
// allowed teachers to rewrite exams. Keep them closed even for stale clients.
export const POST = withTenantAuth(async () => NextResponse.json(
  { error: 'Saisie déplacée vers la saisie nominative sécurisée' }, { status: 403 }
))

export const PUT = withTenantAuth(async () => NextResponse.json(
  { error: 'Modification directe des notes interdite' }, { status: 403 }
))
