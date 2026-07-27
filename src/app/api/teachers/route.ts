import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { isStudentSelfRole } from '@/lib/auth/student-scope'
import { paginationSchema, createTeacherSchema, updateTeacherSchema, validateQuery, validateBody, formatZodError } from '@/lib/validations/api'
import { Prisma } from '@prisma/client'

const teacherQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  departmentId: z.string().cuid().optional(),
  grade: z.enum(['PROFESSEUR_TITULAIRE', 'MAITRE_CONFERENCES', 'MAITRE_ASSISTANT', 'ASSISTANT', 'VACATAIRE']).optional(),
  isActive: z.coerce.boolean().optional(),
  tenantId: z.string().cuid().optional(),
})

// Import z from zod
import { z } from 'zod'

// Full staff roster -- no student-facing UI lists this, so student-tier accounts are blocked.
async function getTeachersHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    if (isStudentSelfRole(user.role)) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Accès refusé' }, { status: 403 })
    }
    const { searchParams } = new URL(request.url)
    const validatedQuery = validateQuery(teacherQuerySchema, searchParams)

    const { search, departmentId, grade, isActive, page, limit } = validatedQuery
    const skip = (page - 1) * limit

    const where: Prisma.TeacherWhereInput = {
      tenantId,
    }

    if (search) {
      where.OR = [
        { user: { firstName: { contains: search } } },
        { user: { lastName: { contains: search } } },
        { employeeId: { contains: search } },
        { user: { email: { contains: search } } },
        { specialization: { contains: search } },
      ]
    }

    if (departmentId) {
      where.departmentId = departmentId
    }

    if (grade) {
      where.grade = grade
    }

    if (isActive !== undefined) {
      where.isActive = isActive
    }

    const [teachers, total] = await Promise.all([
      db.teacher.findMany({
        where,
        include: {
          department: {
            select: { id: true, name: true, shortName: true },
          },
          user: {
            select: { id: true, email: true, phone: true, photo: true, firstName: true, lastName: true },
          },
          assignedElements: {
            select: { id: true, code: true, name: true, coefficient: true, teachingUnit: { select: { id: true, code: true, name: true } } },
          },
          responsibleUnits: {
            select: { id: true, code: true, name: true, credits: true, semester: { select: { id: true, name: true, level: { select: { name: true } } } } },
          },
        },
        orderBy: [{ user: { lastName: 'asc' } }, { user: { firstName: 'asc' } }],
        skip,
        take: limit,
      }),
      db.teacher.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      data: teachers,
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
    console.error('Teachers API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch teachers',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

async function createTeacherHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const validatedBody = validateBody(createTeacherSchema, body)

    // Verify department belongs to tenant
    if (validatedBody.departmentId) {
      const department = await db.department.findFirst({ where: { id: validatedBody.departmentId, tenantId } })
      if (!department) {
        return NextResponse.json(
          { error: 'Department not found in this tenant' },
          { status: 404 }
        )
      }
    }

    // Check employeeId uniqueness if provided
    if (validatedBody.employeeId) {
      const existing = await db.teacher.findFirst({ where: { employeeId: validatedBody.employeeId, tenantId } })
      if (existing) {
        return NextResponse.json(
          { error: 'Employee ID already exists' },
          { status: 409 }
        )
      }
    }

    // Check email uniqueness if provided
    if (validatedBody.email) {
      const existingEmail = await db.user.findFirst({ where: { email: validatedBody.email, tenantId } })
      if (existingEmail) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 409 }
        )
      }
    }

    const teacher = await db.teacher.create({
      data: {
        ...validatedBody,
        tenantId,
      },
      include: {
        department: { select: { id: true, name: true, shortName: true } },
        user: { select: { id: true, email: true, phone: true, photo: true, firstName: true, lastName: true } },
      },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: 'CREATE',
        entity: 'Teacher',
        entityId: teacher.id,
        details: JSON.stringify({ employeeId: teacher.employeeId, firstName: teacher.user?.firstName, lastName: teacher.user?.lastName }),
      },
    })

    return NextResponse.json({ data: teacher }, { status: 201 })
  } catch (error) {
    console.error('Create teacher error:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodError(error as any) },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create teacher', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function updateTeacherHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const validatedBody = validateBody(updateTeacherSchema, body)
    const { id, ...data } = validatedBody

    // Verify teacher belongs to tenant
    const existing = await db.teacher.findFirst({
      where: { id, tenantId },
      include: { user: { select: { firstName: true, lastName: true } } },
    })
    if (!existing) {
      return NextResponse.json(
        { error: 'Teacher not found' },
        { status: 404 }
      )
    }

    // Check department if changed
    if (data.departmentId && data.departmentId !== existing.departmentId) {
      const department = await db.department.findFirst({ where: { id: data.departmentId, tenantId } })
      if (!department) {
        return NextResponse.json(
          { error: 'Department not found in this tenant' },
          { status: 404 }
        )
      }
    }

    // Check employeeId uniqueness if changed
    if (data.employeeId && data.employeeId !== existing.employeeId) {
      const existingEmp = await db.teacher.findFirst({ where: { employeeId: data.employeeId, tenantId, NOT: { id } } })
      if (existingEmp) {
        return NextResponse.json(
          { error: 'Employee ID already exists' },
          { status: 409 }
        )
      }
    }

    const updateData: Prisma.TeacherUpdateInput = {
      ...data,
    }

    const teacher = await db.teacher.update({
      where: { id },
      data: updateData,
      include: {
        department: { select: { id: true, name: true, shortName: true } },
        user: { select: { id: true, email: true, phone: true, photo: true, firstName: true, lastName: true } },
      },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: 'UPDATE',
        entity: 'Teacher',
        entityId: teacher.id,
        details: JSON.stringify({ employeeId: teacher.employeeId, firstName: teacher.user?.firstName, lastName: teacher.user?.lastName }),
      },
    })

    return NextResponse.json({ data: teacher })
  } catch (error) {
    console.error('Update teacher error:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodError(error as any) },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update teacher', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function deleteTeacherHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Teacher ID is required' },
        { status: 400 }
      )
    }

    // Verify teacher belongs to tenant
    const existing = await db.teacher.findFirst({
      where: { id, tenantId },
      include: { user: { select: { firstName: true, lastName: true } } },
    })
    if (!existing) {
      return NextResponse.json(
        { error: 'Teacher not found' },
        { status: 404 }
      )
    }

    // Soft delete - set isActive to false
    const teacher = await db.teacher.update({
      where: { id },
      data: { isActive: false },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: 'DELETE',
        entity: 'Teacher',
        entityId: teacher.id,
        details: JSON.stringify({ employeeId: teacher.employeeId, firstName: existing.user?.firstName, lastName: existing.user?.lastName }),
      },
    })

    return NextResponse.json({ data: { id: teacher.id, isActive: teacher.isActive } })
  } catch (error) {
    console.error('Delete teacher error:', error)
    return NextResponse.json(
      { error: 'Failed to deactivate teacher', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function getTeacherScheduleHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Teacher ID is required' },
        { status: 400 }
      )
    }

    const teacher = await db.teacher.findFirst({
      where: { id, tenantId },
      include: {
        user: { select: { firstName: true, lastName: true } },
        assignedElements: {
          include: {
            teachingUnit: {
              include: {
                semester: {
                  include: {
                    level: {
                      include: {
                        program: { select: { id: true, name: true, code: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responsibleUnits: {
          include: {
            semester: {
              include: {
                level: {
                  include: {
                    program: { select: { id: true, name: true, code: true } },
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!teacher) {
      return NextResponse.json(
        { error: 'Teacher not found' },
        { status: 404 }
      )
    }

    // Calculate total hours
    const totalCM = teacher.assignedElements.reduce((sum, el) => sum + (el.hoursCM || 0), 0)
    const totalTD = teacher.assignedElements.reduce((sum, el) => sum + (el.hoursTD || 0), 0)
    const totalTP = teacher.assignedElements.reduce((sum, el) => sum + (el.hoursTP || 0), 0)
    const totalHours = totalCM + totalTD + totalTP

    return NextResponse.json({
      data: {
        teacher: {
          id: teacher.id,
          firstName: teacher.user?.firstName,
          lastName: teacher.user?.lastName,
          employeeId: teacher.employeeId,
          grade: teacher.grade,
          specialization: teacher.specialization,
          maxHoursPerWeek: teacher.maxHoursPerWeek,
          currentHours: teacher.currentHours,
        },
        assignedElements: teacher.assignedElements.map(el => ({
          id: el.id,
          code: el.code,
          name: el.name,
          coefficient: el.coefficient,
          hoursCM: el.hoursCM,
          hoursTD: el.hoursTD,
          hoursTP: el.hoursTP,
          teachingUnit: {
            id: el.teachingUnit.id,
            code: el.teachingUnit.code,
            name: el.teachingUnit.name,
            credits: el.teachingUnit.credits,
            semester: {
              id: el.teachingUnit.semester.id,
              name: el.teachingUnit.semester.name,
              level: {
                name: el.teachingUnit.semester.level.name,
                program: el.teachingUnit.semester.level.program,
              },
            },
          },
        })),
        responsibleUnits: teacher.responsibleUnits.map(u => ({
          id: u.id,
          code: u.code,
          name: u.name,
          credits: u.credits,
          semester: {
            id: u.semester.id,
            name: u.semester.name,
            level: {
              name: u.semester.level.name,
              program: u.semester.level.program,
            },
          },
        })),
        summary: {
          totalElements: teacher.assignedElements.length,
          totalResponsibleUnits: teacher.responsibleUnits.length,
          totalHoursCM: totalCM,
          totalHoursTD: totalTD,
          totalHoursTP: totalTP,
          totalHours,
          hoursRemaining: Math.max(0, teacher.maxHoursPerWeek - teacher.currentHours),
        },
      },
    })
  } catch (error) {
    console.error('Get teacher schedule error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teacher schedule', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export const GET = withTenantAuth(async (user: SessionUser, tenantId: string, request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const schedule = searchParams.get('schedule')

  if (id && schedule === 'true') {
    return getTeacherScheduleHandler(user, tenantId, request)
  }
  return getTeachersHandler(user, tenantId, request)
})

export const POST = withTenantAuth(createTeacherHandler, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'RECTORAT'])

export const PUT = withTenantAuth(updateTeacherHandler, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'RECTORAT'])

export const DELETE = withTenantAuth(deleteTeacherHandler, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'RECTORAT'])