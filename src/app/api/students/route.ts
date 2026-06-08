import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { studentQuerySchema, createStudentSchema, updateStudentSchema, validateQuery, validateBody, formatZodError } from '@/lib/validations/api'
import { Prisma } from '@prisma/client'

async function getStudentsHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const validatedQuery = validateQuery(studentQuerySchema, searchParams)

    const { search, status, programId, levelId, page, limit } = validatedQuery
    const skip = (page - 1) * limit

    const where: Prisma.StudentWhereInput = {
      tenantId,
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { middleName: { contains: search } },
        { matricule: { contains: search } },
        { email: { contains: search } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (programId) {
      where.currentProgramId = programId
    }

    if (levelId) {
      where.currentLevelId = levelId
    }

    const [students, total] = await Promise.all([
      db.student.findMany({
        where,
        include: {
          currentProgram: {
            select: { id: true, name: true, code: true },
          },
          currentLevel: {
            select: { id: true, name: true, code: true },
          },
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip,
        take: limit,
      }),
      db.student.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      data: students,
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
    console.error('Students API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch students',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

async function createStudentHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const validatedBody = validateBody(createStudentSchema, body)

    // Check if level and program belong to tenant
    const [level, program] = await Promise.all([
      db.level.findFirst({ where: { id: validatedBody.currentLevelId, program: { tenantId } } }),
      db.program.findFirst({ where: { id: validatedBody.currentProgramId, tenantId } }),
    ])

    if (!level || !program) {
      return NextResponse.json(
        { error: 'Invalid level or program for this tenant' },
        { status: 400 }
      )
    }

    // Generate matricule if not provided
    let matricule = validatedBody.matricule
    if (!matricule) {
      const settings = await db.tenantSettings.findUnique({ where: { tenantId } })
      const prefix = settings?.matriculePrefix || 'UNSH'
      const year = new Date().getFullYear()
      const levelCode = level.code
      const count = await db.student.count({ where: { tenantId, currentLevelId: level.id } })
      const seq = String(count + 1).padStart(6, '0')
      matricule = `${prefix}-${year}-${levelCode}-${seq}`
    }

    // Check matricule uniqueness
    const existing = await db.student.findFirst({ where: { matricule, tenantId } })
    if (existing) {
      return NextResponse.json(
        { error: 'Matricule already exists' },
        { status: 409 }
      )
    }

    // Check email uniqueness if provided
    if (validatedBody.email) {
      const existingEmail = await db.student.findFirst({ where: { email: validatedBody.email, tenantId } })
      if (existingEmail) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 409 }
        )
      }
    }

    const student = await db.student.create({
      data: {
        ...validatedBody,
        matricule,
        tenantId,
        dateOfBirth: new Date(validatedBody.dateOfBirth),
      },
      include: {
        currentProgram: { select: { id: true, name: true, code: true } },
        currentLevel: { select: { id: true, name: true, code: true } },
      },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: 'CREATE',
        entity: 'Student',
        entityId: student.id,
        details: JSON.stringify({ matricule: student.matricule }),
      },
    })

    return NextResponse.json({ data: student }, { status: 201 })
  } catch (error) {
    console.error('Create student error:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodError(error as any) },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create student', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function updateStudentHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const validatedBody = validateBody(updateStudentSchema, body)
    const { id, ...data } = validatedBody

    // Verify student belongs to tenant
    const existing = await db.student.findFirst({ where: { id, tenantId } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Check email uniqueness if changed
    if (data.email && data.email !== existing.email) {
      const existingEmail = await db.student.findFirst({ where: { email: data.email, tenantId, NOT: { id } } })
      if (existingEmail) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 409 }
        )
      }
    }

    // Check matricule uniqueness if changed
    if (data.matricule && data.matricule !== existing.matricule) {
      const existingMatricule = await db.student.findFirst({ where: { matricule: data.matricule, tenantId, NOT: { id } } })
      if (existingMatricule) {
        return NextResponse.json(
          { error: 'Matricule already exists' },
          { status: 409 }
        )
      }
    }

    // Verify level and program belong to tenant if changed
    if (data.currentLevelId || data.currentProgramId) {
      const levelId = data.currentLevelId || existing.currentLevelId || ''
      const programId = data.currentProgramId || existing.currentProgramId || ''
      const [level, program] = await Promise.all([
        db.level.findFirst({ where: { id: levelId, program: { tenantId } } }),
        db.program.findFirst({ where: { id: programId, tenantId } }),
      ])
      if (!level || !program) {
        return NextResponse.json(
          { error: 'Invalid level or program for this tenant' },
          { status: 400 }
        )
      }
    }

    const student = await db.student.update({
      where: { id },
      data: {
        ...data,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      },
      include: {
        currentProgram: { select: { id: true, name: true, code: true } },
        currentLevel: { select: { id: true, name: true, code: true } },
      },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: 'UPDATE',
        entity: 'Student',
        entityId: student.id,
        details: JSON.stringify({ matricule: student.matricule }),
      },
    })

    return NextResponse.json({ data: student })
  } catch (error) {
    console.error('Update student error:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodError(error as any) },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update student', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function deleteStudentHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      )
    }

    // Verify student belongs to tenant
    const existing = await db.student.findFirst({ where: { id, tenantId } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Soft delete - change status to SUSPENDU
    const student = await db.student.update({
      where: { id },
      data: { status: 'SUSPENDU' },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: 'DELETE',
        entity: 'Student',
        entityId: student.id,
        details: JSON.stringify({ matricule: student.matricule }),
      },
    })

    return NextResponse.json({ data: { id: student.id, status: student.status } })
  } catch (error) {
    console.error('Delete student error:', error)
    return NextResponse.json(
      { error: 'Failed to delete student', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function getStudentDetailHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      )
    }

    const student = await db.student.findFirst({
      where: { id, tenantId },
      include: {
        currentProgram: {
          select: { id: true, name: true, code: true, cycle: true, department: { select: { name: true } } },
        },
        currentLevel: {
          select: { id: true, name: true, code: true },
        },
        tenant: {
          select: { name: true, shortName: true, logo: true },
        },
      },
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: student })
  } catch (error) {
    console.error('Get student detail error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch student', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function getStudentTranscriptHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      )
    }

    const student = await db.student.findFirst({
      where: { id, tenantId },
      include: {
        currentProgram: {
          select: { id: true, name: true, code: true, cycle: true, duration: true },
        },
        currentLevel: {
          select: { id: true, name: true, code: true },
        },
        tenant: {
          select: { name: true, shortName: true, logo: true, rectorName: true, rectorTitle: true },
        },
      },
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Get all grades grouped by semester and teaching unit
    const grades = await db.grade.findMany({
      where: { studentId: id, student: { tenantId } },
      include: {
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
    })

    // Group by semester and teaching unit
    const groupedGrades: Record<string, { semester: any; teachingUnits: Record<string, { teachingUnit: any; grades: any[] }> }> = {}

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

    // Calculate stats
    const totalGrades = grades.length
    const validatedGrades = grades.filter((g) => g.finalGrade !== null && g.finalGrade >= 10).length
    const averageFinalGrade =
      grades.length > 0
        ? grades
            .filter((g) => g.finalGrade !== null)
            .reduce((sum, g) => sum + (g.finalGrade || 0), 0) /
          Math.max(grades.filter((g) => g.finalGrade !== null).length, 1)
        : 0

    const summary = {
      totalGrades,
      validatedGrades,
      failedGrades: totalGrades - validatedGrades,
      averageFinalGrade: Math.round(averageFinalGrade * 100) / 100,
      totalCreditsAcquired: student.totalCreditsAcquired,
    }

    return NextResponse.json({
      data: { student, grades: structuredGrades, summary },
    })
  } catch (error) {
    console.error('Get student transcript error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transcript', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export const GET = withTenantAuth(async (user: SessionUser, tenantId: string, request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const transcript = searchParams.get('transcript')

  if (id && transcript === 'true') {
    return getStudentTranscriptHandler(user, tenantId, request)
  }
  if (id) {
    return getStudentDetailHandler(user, tenantId, request)
  }
  return getStudentsHandler(user, tenantId, request)
})

export const POST = withTenantAuth(createStudentHandler, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE'])

export const PUT = withTenantAuth(updateStudentHandler, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE'])

export const DELETE = withTenantAuth(deleteStudentHandler, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE'])