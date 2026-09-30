import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { resolveOwnStudentId, isStudentSelfRole } from '@/lib/auth/student-scope'
import { calculateFinalGrade, isValidGradingPolicy, resolveGradingPolicy } from '@/lib/grading-policy'
import { gradeQuerySchema, createGradeSchema, updateGradeSchema, bulkGradeEntrySchema, calculateGradeSchema, validateQuery, validateBody, formatZodError } from '@/lib/validations/api'

const GRADE_OVERSIGHT_ROLES = new Set(['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE', 'RECTORAT', 'RESPONSABLE_FILIERE', 'JURY'])
const GRADE_ENTRY_ROLES = new Set(['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE', 'ENSEIGNANT', 'RESPONSABLE_FILIERE'])
const GRADE_LOCK_ROLES = new Set(['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE', 'RESPONSABLE_FILIERE'])

class GradeWriteConflict extends Error {}

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

async function getTeacherAssignmentsHandler(user: SessionUser, tenantId: string) {
  if (user.role !== 'ENSEIGNANT') {
    return NextResponse.json({ error: 'Accès réservé aux enseignants' }, { status: 403 })
  }
  const teacherId = await assignedTeacherId(user, tenantId)
  if (!teacherId) {
    return NextResponse.json({ error: 'Enseignant non associé à cet établissement' }, { status: 403 })
  }
  const elements = await db.courseElement.findMany({
    where: {
      teachingUnit: { semester: { level: { program: { tenantId } } } },
      OR: [{ teacherId }, { teachingUnit: { responsibleId: teacherId } }],
    },
    select: { id: true },
  })
  return NextResponse.json({ data: { courseElementIds: elements.map((element) => element.id) } })
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
      ...(teacherId ? { OR: [{ teacherId }, { teachingUnit: { responsibleId: teacherId } }] } : {}),
    },
    select: { teachingUnitId: true },
  })
  if (!element) return NextResponse.json({ error: 'Enseignement inaccessible' }, { status: 403 })

  const registrations = await db.pedagogicalRegistration.findMany({
    where: {
      teachingUnitId: element.teachingUnitId,
      academicYearId,
      status: 'ACTIVE',
      student: { tenantId },
    },
    select: { student: { select: { id: true, matricule: true, firstName: true, lastName: true } } },
    orderBy: { student: { lastName: 'asc' } },
  })
  return NextResponse.json({ data: registrations.map((registration) => registration.student) })
}

async function isStudentRegistered(studentId: string, teachingUnitId: string, academicYearId: string) {
  return Boolean(await db.pedagogicalRegistration.findFirst({
    where: { studentId, teachingUnitId, academicYearId, status: 'ACTIVE' },
    select: { id: true },
  }))
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
    if (user.role === 'ENSEIGNANT') {
      if (!teacherId) return NextResponse.json({ error: 'Enseignant non associé à cet établissement' }, { status: 403 })
      where.OR = [
        { courseElement: { teacherId, teachingUnit: { semester: { level: { program: { tenantId } } } } } },
        { teachingUnit: { responsibleId: teacherId, semester: { level: { program: { tenantId } } } } },
      ]
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

async function createGradeHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const validatedBody = validateBody(createGradeSchema, body)
    if (!await academicYearBelongsToTenant(validatedBody.academicYearId, tenantId)) {
      return NextResponse.json({ error: 'Année académique introuvable dans cet établissement' }, { status: 404 })
    }
    const teacherId = await assignedTeacherId(user, tenantId)
    if (user.role === 'ENSEIGNANT' && !teacherId) {
      return NextResponse.json({ error: 'Enseignant non associé à cet établissement' }, { status: 403 })
    }

    // Verify student belongs to tenant
    const student = await db.student.findFirst({
      where: { id: validatedBody.studentId, tenantId },
      include: { currentProgram: true, currentLevel: true },
    })
    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Verify course element belongs to tenant via teaching unit -> semester -> level -> program
    const courseElement = await db.courseElement.findFirst({
      where: {
        id: validatedBody.courseElementId,
        teachingUnit: {
          semester: {
            level: {
              program: { tenantId },
            },
          },
        },
      },
      include: {
        teachingUnit: {
          include: {
            semester: {
              include: {
                level: {
                  include: { program: true },
                },
              },
            },
          },
        },
      },
    })
    if (!courseElement) {
      return NextResponse.json(
        { error: 'Course element not found or not in this tenant' },
        { status: 404 }
      )
    }

    // Verify teaching unit matches
    if (courseElement.teachingUnitId !== validatedBody.teachingUnitId) {
      return NextResponse.json(
        { error: 'Course element does not belong to the specified teaching unit' },
        { status: 400 }
      )
    }
    if (teacherId && courseElement.teacherId !== teacherId && courseElement.teachingUnit.responsibleId !== teacherId) {
      return NextResponse.json({ error: 'Enseignement non attribué à cet enseignant' }, { status: 403 })
    }
    if (teacherId && !await isStudentRegistered(validatedBody.studentId, validatedBody.teachingUnitId, validatedBody.academicYearId)) {
      return NextResponse.json({ error: 'Étudiant non inscrit pédagogiquement à cette UE pour cette année' }, { status: 403 })
    }

    // Check if grade already exists for this student/course element/academic year/session
    const existingGrade = await db.grade.findFirst({
      where: {
        studentId: validatedBody.studentId,
        courseElementId: validatedBody.courseElementId,
        academicYearId: validatedBody.academicYearId,
        session: validatedBody.session,
      },
    })
    if (existingGrade) {
      return NextResponse.json(
        { error: 'Grade already exists for this student/course/session' },
        { status: 409 }
      )
    }

    // Calculate final grade
    const settings = await db.tenantSettings.findUnique({ where: { tenantId } })
    const policy = resolveGradingPolicy(settings)
    if (!isValidGradingPolicy(policy)) {
      return NextResponse.json({ error: 'Coefficients de notation invalides' }, { status: 409 })
    }
    const finalGrade = calculateFinalGrade(validatedBody, policy)

    const grade = await db.grade.create({
      data: {
        ...validatedBody,
        finalGrade,
        academicYearId: validatedBody.academicYearId,
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, matricule: true },
        },
        teachingUnit: { select: { id: true, code: true, name: true } },
        courseElement: { select: { id: true, code: true, name: true } },
      },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: 'CREATE',
        entity: 'Grade',
        entityId: grade.id,
        details: JSON.stringify({
          studentId: grade.studentId,
          courseElementId: grade.courseElementId,
          finalGrade: grade.finalGrade,
        }),
      },
    })

    return NextResponse.json({ data: grade }, { status: 201 })
  } catch (error) {
    console.error('Create grade error:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodError(error as any) },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create grade', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function updateGradeHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const validatedBody = validateBody(updateGradeSchema, body)
    const { id, ...data } = validatedBody

    // Verify grade exists and belongs to tenant
    const existingGrade = await db.grade.findFirst({
      where: { id, student: { tenantId } },
      include: {
        student: { select: { tenantId: true } },
        teachingUnit: { include: { semester: { include: { level: { include: { program: true } } } } } },
        courseElement: {
          include: {
            teachingUnit: {
              include: {
                semester: {
                  include: { level: { include: { program: true } } },
                },
              },
            },
          },
        },
      },
    })
    if (!existingGrade || existingGrade.student.tenantId !== tenantId) {
      return NextResponse.json(
        { error: 'Grade not found' },
        { status: 404 }
      )
    }
    if (!await academicYearBelongsToTenant(existingGrade.academicYearId, tenantId) ||
        (existingGrade.teachingUnit && existingGrade.teachingUnit.semester.level.program.tenantId !== tenantId) ||
        (existingGrade.courseElement && existingGrade.courseElement.teachingUnit.semester.level.program.tenantId !== tenantId) ||
        (existingGrade.courseElement && existingGrade.teachingUnitId && existingGrade.courseElement.teachingUnitId !== existingGrade.teachingUnitId)) {
      return NextResponse.json({ error: 'Contexte académique incohérent pour cet établissement' }, { status: 409 })
    }
    if ((data.studentId && data.studentId !== existingGrade.studentId) ||
        (data.teachingUnitId && data.teachingUnitId !== existingGrade.teachingUnitId) ||
        (data.courseElementId && data.courseElementId !== existingGrade.courseElementId) ||
        (data.academicYearId && data.academicYearId !== existingGrade.academicYearId) ||
        (data.session && data.session !== existingGrade.session)) {
      return NextResponse.json({ error: 'Le contexte d’une note ne peut pas être modifié' }, { status: 400 })
    }
    const teacherId = await assignedTeacherId(user, tenantId)
    if (user.role === 'ENSEIGNANT' &&
        (!teacherId ||
         (existingGrade.courseElement?.teacherId !== teacherId && existingGrade.teachingUnit?.responsibleId !== teacherId))) {
      return NextResponse.json({ error: 'Modification non autorisée pour cet enseignant' }, { status: 403 })
    }
    if (teacherId && (!existingGrade.teachingUnitId ||
        !await isStudentRegistered(existingGrade.studentId, existingGrade.teachingUnitId, existingGrade.academicYearId))) {
      return NextResponse.json({ error: 'Étudiant non inscrit pédagogiquement à cette UE pour cette année' }, { status: 403 })
    }

    if (data.isLocked !== undefined) {
      return NextResponse.json({ error: 'Utilisez l’action de verrouillage dédiée' }, { status: 400 })
    }
    if (existingGrade.isLocked) {
      return NextResponse.json(
        { error: 'Grade is locked and cannot be modified' },
        { status: 403 }
      )
    }

    // Recalculate final grade if grades changed
    let finalGrade = existingGrade.finalGrade
    if (data.ccGrade !== undefined || data.examGrade !== undefined || data.tpGrade !== undefined || data.stageGrade !== undefined || data.oralGrade !== undefined || data.memoireGrade !== undefined || data.projectGrade !== undefined || data.isAbsent !== undefined || data.isDefaillant !== undefined) {
      const settings = await db.tenantSettings.findUnique({ where: { tenantId } })
      const policy = resolveGradingPolicy(settings)
      if (!isValidGradingPolicy(policy)) {
        return NextResponse.json({ error: 'Coefficients de notation invalides' }, { status: 409 })
      }
      finalGrade = calculateFinalGrade({ ...existingGrade, ...data }, policy)
    }

    const grade = await db.grade.update({
      where: { id },
      data: {
        ...data,
        finalGrade,
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, matricule: true } },
        teachingUnit: { select: { id: true, code: true, name: true } },
        courseElement: { select: { id: true, code: true, name: true } },
      },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: 'UPDATE',
        entity: 'Grade',
        entityId: grade.id,
        details: JSON.stringify({
          studentId: grade.studentId,
          courseElementId: grade.courseElementId,
          finalGrade: grade.finalGrade,
        }),
      },
    })

    return NextResponse.json({ data: grade })
  } catch (error) {
    console.error('Update grade error:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodError(error as any) },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update grade', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function bulkGradeEntryHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const validatedBody = validateBody(bulkGradeEntrySchema, body)
    const { grades, academicYearId, session, lockAfterSave } = validatedBody
    if (lockAfterSave && !GRADE_LOCK_ROLES.has(user.role)) {
      return NextResponse.json({ error: 'Verrouillage non autorisé pour ce rôle' }, { status: 403 })
    }
    if (lockAfterSave && grades.length === 0) {
      return NextResponse.json({ error: 'Aucune note à enregistrer et verrouiller' }, { status: 400 })
    }
    if (!await academicYearBelongsToTenant(academicYearId, tenantId)) {
      return NextResponse.json({ error: 'Année académique introuvable dans cet établissement' }, { status: 404 })
    }
    const teacherId = await assignedTeacherId(user, tenantId)
    if (user.role === 'ENSEIGNANT' && !teacherId) {
      return NextResponse.json({ error: 'Enseignant non associé à cet établissement' }, { status: 403 })
    }

    const settings = await db.tenantSettings.findUnique({ where: { tenantId } })
    const policy = resolveGradingPolicy(settings)
    if (!isValidGradingPolicy(policy)) {
      return NextResponse.json({ error: 'Coefficients de notation invalides' }, { status: 409 })
    }

    const result = await db.$transaction(async (tx) => {
      const errors: { studentId: string; courseElementId: string; error: string }[] = []
      const prepared: { gradeData: typeof grades[number]; existingId: string | null }[] = []
      const seen = new Set<string>()

      for (const gradeData of grades) {
        const rowError = (error: string) => errors.push({ studentId: gradeData.studentId, courseElementId: gradeData.courseElementId, error })
        const key = `${gradeData.studentId}:${gradeData.courseElementId}`
        if (seen.has(key)) { rowError('Cette note apparaît plusieurs fois dans le lot'); continue }
        seen.add(key)
        if (gradeData.academicYearId !== academicYearId || gradeData.session !== session) {
          rowError('Année académique ou session incohérente dans le lot')
          continue
        }
        const student = await tx.student.findFirst({ where: { id: gradeData.studentId, tenantId }, select: { id: true } })
        if (!student) { rowError('Étudiant introuvable dans cet établissement'); continue }
        const element = await tx.courseElement.findFirst({
          where: { id: gradeData.courseElementId, teachingUnit: { semester: { level: { program: { tenantId } } } } },
          select: { teachingUnitId: true, teacherId: true },
        })
        if (!element) { rowError('Matière introuvable dans cet établissement'); continue }
        if (element.teachingUnitId !== gradeData.teachingUnitId) {
          rowError('La matière ne correspond pas à l’UE indiquée')
          continue
        }
        if (teacherId && element.teacherId !== teacherId &&
            !await tx.teachingUnit.findFirst({ where: { id: gradeData.teachingUnitId, responsibleId: teacherId, semester: { level: { program: { tenantId } } } }, select: { id: true } })) {
          rowError('Enseignement non attribué à cet enseignant')
          continue
        }
        if (teacherId && !await tx.pedagogicalRegistration.findFirst({
          where: { studentId: gradeData.studentId, teachingUnitId: gradeData.teachingUnitId, academicYearId, status: 'ACTIVE' },
          select: { id: true },
        })) {
          rowError('Étudiant non inscrit pédagogiquement à cette UE pour cette année')
          continue
        }
        const existing = await tx.grade.findFirst({
          where: { studentId: gradeData.studentId, courseElementId: gradeData.courseElementId, academicYearId, session },
          select: { id: true, isLocked: true },
        })
        if (existing?.isLocked) { rowError('La note est déjà verrouillée'); continue }
        if (lockAfterSave && calculateFinalGrade(gradeData, policy) === null) {
          rowError('Toutes les composantes pondérées sont requises avant verrouillage')
          continue
        }
        prepared.push({ gradeData, existingId: existing?.id ?? null })
      }

      if (lockAfterSave && errors.length === 0) {
        const teachingUnitId = grades[0].teachingUnitId
        const courseElementId = grades[0].courseElementId
        if (grades.some((grade) => grade.teachingUnitId !== teachingUnitId || grade.courseElementId !== courseElementId)) {
          errors.push({ studentId: grades[0].studentId, courseElementId, error: 'Un seul enseignement peut être verrouillé par lot' })
        } else {
          const registrations = await tx.pedagogicalRegistration.findMany({
            where: { teachingUnitId, academicYearId, status: 'ACTIVE', student: { tenantId } },
            select: { studentId: true },
          })
          const rosterIds = new Set(registrations.map((registration) => registration.studentId))
          if (rosterIds.size === 0) {
            errors.push({ studentId: grades[0].studentId, courseElementId, error: 'Aucun étudiant inscrit pédagogiquement à cette UE' })
          }
          for (const grade of grades) {
            if (!rosterIds.has(grade.studentId)) {
              errors.push({ studentId: grade.studentId, courseElementId, error: 'Étudiant absent des inscriptions pédagogiques de cette UE' })
            }
          }
          const locked = await tx.grade.findMany({
            where: {
              studentId: { in: [...rosterIds] }, courseElementId, academicYearId, session,
              isLocked: true, finalGrade: { not: null },
            },
            select: { studentId: true },
          })
          const covered = new Set([...grades.map((grade) => grade.studentId), ...locked.map((grade) => grade.studentId)])
          for (const studentId of rosterIds) {
            if (!covered.has(studentId)) {
              errors.push({ studentId, courseElementId, error: 'Note manquante pour un étudiant inscrit à cette UE' })
            }
          }
        }
      }

      if (errors.length > 0) return { created: 0, updated: 0, lockedSkipped: 0, errors }

      let created = 0
      let updated = 0
      for (const { gradeData, existingId } of prepared) {
        const data = {
          ...gradeData, academicYearId, session, finalGrade: calculateFinalGrade(gradeData, policy),
          ...(lockAfterSave ? { isLocked: true, lockedBy: user.id, validatedBy: user.id } : {}),
        }
        if (existingId) {
          const update = await tx.grade.updateMany({ where: { id: existingId, isLocked: false }, data })
          if (update.count !== 1) throw new GradeWriteConflict('Une note a été verrouillée entre la vérification et l’enregistrement')
          updated++
        } else {
          await tx.grade.create({ data })
          created++
        }
      }
      if (prepared.length > 0) {
        await tx.auditLog.create({
          data: {
            tenantId, userId: user.id, action: lockAfterSave ? 'BULK_SAVE_AND_LOCK' : 'BULK_CREATE', entity: 'Grade',
            details: JSON.stringify({ created, updated, locked: lockAfterSave ? prepared.length : 0, academicYearId, session }),
          },
        })
      }
      return { created, updated, lockedSkipped: 0, errors, ...(lockAfterSave ? { locked: prepared.length } : {}) }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

    if (result.errors.length > 0) {
      return NextResponse.json({ error: `Lot refusé : ${result.errors[0].error}`, data: result }, { status: 422 })
    }
    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Bulk grade entry error:', error)
    if (error instanceof GradeWriteConflict ||
        (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code))) {
      return NextResponse.json({ error: error instanceof GradeWriteConflict ? error.message : 'Conflit concurrent sur les notes : rechargez puis réessayez' }, { status: 409 })
    }
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodError(error as any) },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to process bulk grades', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function calculateGradeHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const validatedBody = validateBody(calculateGradeSchema, body)

    const settings = await db.tenantSettings.findUnique({ where: { tenantId } })
    const policy = { ...resolveGradingPolicy(settings),
      ...(validatedBody.ccWeight !== undefined ? { ccWeight: validatedBody.ccWeight } : {}),
      ...(validatedBody.examWeight !== undefined ? { examWeight: validatedBody.examWeight } : {}),
      ...(validatedBody.tpWeight !== undefined ? { tpWeight: validatedBody.tpWeight } : {}),
      ...(validatedBody.stageWeight !== undefined ? { stageWeight: validatedBody.stageWeight } : {}),
    }
    if (!isValidGradingPolicy(policy)) {
      return NextResponse.json({ error: 'Coefficients de notation invalides' }, { status: 409 })
    }
    const finalGrade = calculateFinalGrade(validatedBody, policy)
    const breakdown = [
      { grade: validatedBody.ccGrade ?? null, weight: policy.ccWeight },
      { grade: validatedBody.examGrade ?? null, weight: policy.examWeight },
      { grade: validatedBody.tpGrade ?? null, weight: policy.tpWeight },
      { grade: validatedBody.stageGrade ?? null, weight: policy.stageWeight },
    ]

    return NextResponse.json({
      data: {
        finalGrade,
        breakdown,
      },
    })
  } catch (error) {
    console.error('Calculate grade error:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodError(error as any) },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to calculate grade', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function lockGradeHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    if (!GRADE_LOCK_ROLES.has(user.role)) {
      return NextResponse.json({ error: 'Verrouillage non autorisé pour ce rôle' }, { status: 403 })
    }
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const lock = searchParams.get('lock') === 'true'
    const reason = searchParams.get('reason')?.trim() || ''

    if (!lock && (!['SUPER_ADMIN', 'ADMIN_INSTITUTION'].includes(user.role) || reason.length < 10)) {
      return NextResponse.json({ error: 'Déverrouillage réservé à l’administration avec un motif d’au moins 10 caractères' }, { status: 403 })
    }

    if (!id) {
      return NextResponse.json(
        { error: 'Grade ID is required' },
        { status: 400 }
      )
    }

    // Verify grade exists and belongs to tenant
    const existingGrade = await db.grade.findFirst({
      where: { id, student: { tenantId } },
      include: { student: { select: { tenantId: true } } },
    })
    if (!existingGrade || existingGrade.student.tenantId !== tenantId) {
      return NextResponse.json(
        { error: 'Grade not found' },
        { status: 404 }
      )
    }
    const [unit, element] = await Promise.all([
      existingGrade.teachingUnitId
        ? db.teachingUnit.findFirst({ where: { id: existingGrade.teachingUnitId, semester: { level: { program: { tenantId } } } }, select: { id: true } })
        : Promise.resolve(null),
      existingGrade.courseElementId
        ? db.courseElement.findFirst({ where: { id: existingGrade.courseElementId, teachingUnit: { semester: { level: { program: { tenantId } } } } }, select: { teachingUnitId: true } })
        : Promise.resolve(null),
    ])
    if (!await academicYearBelongsToTenant(existingGrade.academicYearId, tenantId) ||
        (existingGrade.teachingUnitId && !unit) ||
        (existingGrade.courseElementId && !element) ||
        (element && existingGrade.teachingUnitId && element.teachingUnitId !== existingGrade.teachingUnitId)) {
      return NextResponse.json({ error: 'Contexte académique incohérent pour cet établissement' }, { status: 409 })
    }
    if (lock && existingGrade.finalGrade === null) {
      return NextResponse.json({ error: 'Une note incomplète ne peut pas être verrouillée' }, { status: 409 })
    }

    await db.$transaction(async (tx) => {
      const updated = await tx.grade.updateMany({
        where: { id, isLocked: !lock, ...(lock ? { finalGrade: { not: null } } : {}) },
        data: { isLocked: lock, lockedBy: lock ? user.id : null },
      })
      if (updated.count !== 1) throw new GradeWriteConflict('L’état de cette note a changé : rechargez-la puis réessayez')
      await tx.auditLog.create({
        data: {
          tenantId, userId: user.id, action: lock ? 'LOCK' : 'UNLOCK', entity: 'Grade', entityId: id,
          details: JSON.stringify({ studentId: existingGrade.studentId, courseElementId: existingGrade.courseElementId, before: existingGrade.isLocked, after: lock, reason: reason || null }),
        },
      })
    })
    return NextResponse.json({ data: { id, isLocked: lock } })
  } catch (error) {
    console.error('Lock grade error:', error)
    if (error instanceof GradeWriteConflict) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    return NextResponse.json(
      { error: 'Failed to lock/unlock grade', details: error instanceof Error ? error.message : 'Unknown error' },
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
    return getTeacherAssignmentsHandler(user, tenantId)
  }
  if (action === 'roster') {
    return getGradeRosterHandler(user, tenantId, request)
  }
  if (action === 'policy') {
    return getGradingPolicyHandler(user, tenantId)
  }

  if (action === 'stats') {
    if (!GRADE_OVERSIGHT_ROLES.has(user.role)) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Accès refusé' }, { status: 403 })
    }
    return getGradeStatsHandler(user, tenantId, request)
  }
  if (action === 'completion') {
    return getGradeCompletionHandler(user, tenantId, request)
  }
  if (!GRADE_OVERSIGHT_ROLES.has(user.role) && user.role !== 'ENSEIGNANT' && !isStudentSelfRole(user.role)) {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Accès refusé' }, { status: 403 })
  }
  return getGradesHandler(user, tenantId, request)
})

export const POST = withTenantAuth(async (user: SessionUser, tenantId: string, request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (action === 'bulk') {
    return bulkGradeEntryHandler(user, tenantId, request)
  }
  if (action === 'calculate') {
    return calculateGradeHandler(user, tenantId, request)
  }
  if (action === 'lock') {
    return lockGradeHandler(user, tenantId, request)
  }
  return createGradeHandler(user, tenantId, request)
}, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE', 'ENSEIGNANT', 'RESPONSABLE_FILIERE'])

export const PUT = withTenantAuth(updateGradeHandler, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE', 'ENSEIGNANT', 'RESPONSABLE_FILIERE'])
