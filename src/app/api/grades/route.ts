import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { resolveOwnStudentId, isStudentSelfRole } from '@/lib/auth/student-scope'
import { gradeQuerySchema, createGradeSchema, updateGradeSchema, bulkGradeEntrySchema, calculateGradeSchema, validateQuery, validateBody, formatZodError } from '@/lib/validations/api'

async function getGradesHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const validatedQuery = validateQuery(gradeQuerySchema, searchParams)

    const ownStudentId = await resolveOwnStudentId(user)
    if (ownStudentId && validatedQuery.studentId && validatedQuery.studentId !== ownStudentId) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Accès refusé' }, { status: 403 })
    }
    const { academicYearId, semesterId, teachingUnitId, courseElementId, session, page, limit } = validatedQuery
    const studentId = ownStudentId ?? validatedQuery.studentId
    const skip = (page - 1) * limit

    const where: Prisma.GradeWhereInput = {}

    if (studentId) {
      where.studentId = studentId
    } else {
      where.student = { tenantId }
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

async function createGradeHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const validatedBody = validateBody(createGradeSchema, body)

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
    const ccWeight = settings?.ccWeight || 0.4
    const examWeight = settings?.examWeight || 0.6
    const tpWeight = settings?.tpWeight || 0
    const stageWeight = settings?.stageWeight || 0

    const ccGrade = validatedBody.ccGrade ?? 0
    const examGrade = validatedBody.examGrade ?? 0
    const tpGrade = validatedBody.tpGrade ?? 0
    const stageGrade = validatedBody.stageGrade ?? 0
    const oralGrade = validatedBody.oralGrade ?? 0
    const memoireGrade = validatedBody.memoireGrade ?? 0
    const projectGrade = validatedBody.projectGrade ?? 0

    let finalGrade: number | null = null
    if (!validatedBody.isAbsent && !validatedBody.isDefaillant) {
      const grades = [
        { grade: ccGrade, weight: ccWeight },
        { grade: examGrade, weight: examWeight },
        { grade: tpGrade, weight: tpWeight },
        { grade: stageGrade, weight: stageWeight },
        { grade: oralGrade, weight: 0 },
        { grade: memoireGrade, weight: 0 },
        { grade: projectGrade, weight: 0 },
      ].filter(g => g.grade > 0 || g.weight > 0)

      if (grades.length > 0) {
        const totalWeight = grades.reduce((sum, g) => sum + g.weight, 0)
        if (totalWeight > 0) {
          finalGrade = grades.reduce((sum, g) => sum + g.grade * g.weight, 0) / totalWeight
        }
      }
    }

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
      where: { id },
      include: {
        student: { select: { tenantId: true } },
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

    // Check if locked
    if (existingGrade.isLocked && !data.isLocked) {
      return NextResponse.json(
        { error: 'Grade is locked and cannot be modified' },
        { status: 403 }
      )
    }

    // Recalculate final grade if grades changed
    let finalGrade = existingGrade.finalGrade
    if (data.ccGrade !== undefined || data.examGrade !== undefined || data.tpGrade !== undefined || data.stageGrade !== undefined || data.oralGrade !== undefined || data.memoireGrade !== undefined || data.projectGrade !== undefined) {
      const settings = await db.tenantSettings.findUnique({ where: { tenantId } })
      const ccWeight = settings?.ccWeight || 0.4
      const examWeight = settings?.examWeight || 0.6
      const tpWeight = settings?.tpWeight || 0
      const stageWeight = settings?.stageWeight || 0

      const ccGrade = data.ccGrade ?? existingGrade.ccGrade ?? 0
      const examGrade = data.examGrade ?? existingGrade.examGrade ?? 0
      const tpGrade = data.tpGrade ?? existingGrade.tpGrade ?? 0
      const stageGrade = data.stageGrade ?? existingGrade.stageGrade ?? 0
      const oralGrade = data.oralGrade ?? existingGrade.oralGrade ?? 0
      const memoireGrade = data.memoireGrade ?? existingGrade.memoireGrade ?? 0
      const projectGrade = data.projectGrade ?? existingGrade.projectGrade ?? 0
      const isAbsent = data.isAbsent ?? existingGrade.isAbsent
      const isDefaillant = data.isDefaillant ?? existingGrade.isDefaillant

      if (!isAbsent && !isDefaillant) {
        const grades = [
          { grade: ccGrade, weight: ccWeight },
          { grade: examGrade, weight: examWeight },
          { grade: tpGrade, weight: tpWeight },
          { grade: stageGrade, weight: stageWeight },
          { grade: oralGrade, weight: 0 },
          { grade: memoireGrade, weight: 0 },
          { grade: projectGrade, weight: 0 },
        ].filter(g => g.grade > 0 || g.weight > 0)

        if (grades.length > 0) {
          const totalWeight = grades.reduce((sum, g) => sum + g.weight, 0)
          if (totalWeight > 0) {
            finalGrade = grades.reduce((sum, g) => sum + g.grade * g.weight, 0) / totalWeight
          }
        }
      } else {
        finalGrade = null
      }
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
    const { grades, academicYearId, session } = validatedBody

    const results = {
      created: 0,
      updated: 0,
      errors: [] as { studentId: string; courseElementId: string; error: string }[],
    }

    for (const gradeData of grades) {
      try {
        // Verify student belongs to tenant
        const student = await db.student.findFirst({
          where: { id: gradeData.studentId, tenantId },
        })
        if (!student) {
          results.errors.push({ studentId: gradeData.studentId, courseElementId: gradeData.courseElementId, error: 'Student not found' })
          continue
        }

        // Verify course element belongs to tenant
        const courseElement = await db.courseElement.findFirst({
          where: {
            id: gradeData.courseElementId,
            teachingUnit: {
              semester: {
                level: { program: { tenantId } },
              },
            },
          },
        })
        if (!courseElement) {
          results.errors.push({ studentId: gradeData.studentId, courseElementId: gradeData.courseElementId, error: 'Course element not found' })
          continue
        }

        // Check existing
        const existing = await db.grade.findFirst({
          where: {
            studentId: gradeData.studentId,
            courseElementId: gradeData.courseElementId,
            academicYearId,
            session,
          },
        })

        // Calculate final grade
        const settings = await db.tenantSettings.findUnique({ where: { tenantId } })
        const ccWeight = settings?.ccWeight || 0.4
        const examWeight = settings?.examWeight || 0.6
        const tpWeight = settings?.tpWeight || 0
        const stageWeight = settings?.stageWeight || 0

        const ccGrade = gradeData.ccGrade ?? 0
        const examGrade = gradeData.examGrade ?? 0
        const tpGrade = gradeData.tpGrade ?? 0
        const stageGrade = gradeData.stageGrade ?? 0
        const oralGrade = gradeData.oralGrade ?? 0
        const memoireGrade = gradeData.memoireGrade ?? 0
        const projectGrade = gradeData.projectGrade ?? 0

        let finalGrade: number | null = null
        if (!gradeData.isAbsent && !gradeData.isDefaillant) {
          const gradesArr = [
            { grade: ccGrade, weight: ccWeight },
            { grade: examGrade, weight: examWeight },
            { grade: tpGrade, weight: tpWeight },
            { grade: stageGrade, weight: stageWeight },
            { grade: oralGrade, weight: 0 },
            { grade: memoireGrade, weight: 0 },
            { grade: projectGrade, weight: 0 },
          ].filter(g => g.grade > 0 || g.weight > 0)

          if (gradesArr.length > 0) {
            const totalWeight = gradesArr.reduce((sum, g) => sum + g.weight, 0)
            if (totalWeight > 0) {
              finalGrade = gradesArr.reduce((sum, g) => sum + g.grade * g.weight, 0) / totalWeight
            }
          }
        }

        if (existing) {
          await db.grade.update({
            where: { id: existing.id },
            data: { ...gradeData, finalGrade, academicYearId, session },
          })
          results.updated++
        } else {
          await db.grade.create({
            data: { ...gradeData, finalGrade, academicYearId, session },
          })
          results.created++
        }
      } catch (e) {
        results.errors.push({
          studentId: gradeData.studentId,
          courseElementId: gradeData.courseElementId,
          error: e instanceof Error ? e.message : 'Unknown error',
        })
      }
    }

    // Audit log
    await db.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: 'BULK_CREATE',
        entity: 'Grade',
        details: JSON.stringify({ created: results.created, updated: results.updated, errors: results.errors.length }),
      },
    })

    return NextResponse.json({ data: results })
  } catch (error) {
    console.error('Bulk grade entry error:', error)
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
    const ccWeight = validatedBody.ccWeight ?? settings?.ccWeight ?? 0.4
    const examWeight = validatedBody.examWeight ?? settings?.examWeight ?? 0.6
    const tpWeight = validatedBody.tpWeight ?? settings?.tpWeight ?? 0
    const stageWeight = validatedBody.stageWeight ?? settings?.stageWeight ?? 0

    const grades = [
      { grade: validatedBody.ccGrade ?? 0, weight: ccWeight },
      { grade: validatedBody.examGrade ?? 0, weight: examWeight },
      { grade: validatedBody.tpGrade ?? 0, weight: tpWeight },
      { grade: validatedBody.stageGrade ?? 0, weight: stageWeight },
      { grade: validatedBody.oralGrade ?? 0, weight: 0 },
      { grade: validatedBody.memoireGrade ?? 0, weight: 0 },
      { grade: validatedBody.projectGrade ?? 0, weight: 0 },
    ].filter(g => g.grade > 0 || g.weight > 0)

    let finalGrade: number | null = null
    if (grades.length > 0) {
      const totalWeight = grades.reduce((sum, g) => sum + g.weight, 0)
      if (totalWeight > 0) {
        finalGrade = Math.round(grades.reduce((sum, g) => sum + g.grade * g.weight, 0) / totalWeight * 100) / 100
      }
    }

    return NextResponse.json({
      data: {
        finalGrade,
        breakdown: grades.map(g => ({ grade: g.grade, weight: g.weight })),
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
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const lock = searchParams.get('lock') === 'true'

    if (!id) {
      return NextResponse.json(
        { error: 'Grade ID is required' },
        { status: 400 }
      )
    }

    // Verify grade exists and belongs to tenant
    const existingGrade = await db.grade.findFirst({
      where: { id },
      include: { student: { select: { tenantId: true } } },
    })
    if (!existingGrade || existingGrade.student.tenantId !== tenantId) {
      return NextResponse.json(
        { error: 'Grade not found' },
        { status: 404 }
      )
    }

    const grade = await db.grade.update({
      where: { id },
      data: { isLocked: lock },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: lock ? 'LOCK' : 'UNLOCK',
        entity: 'Grade',
        entityId: grade.id,
        details: JSON.stringify({ studentId: grade.studentId, courseElementId: grade.courseElementId }),
      },
    })

    return NextResponse.json({ data: { id: grade.id, isLocked: grade.isLocked } })
  } catch (error) {
    console.error('Lock grade error:', error)
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

  if (action === 'stats') {
    if (isStudentSelfRole(user.role)) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Accès refusé' }, { status: 403 })
    }
    return getGradeStatsHandler(user, tenantId, request)
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