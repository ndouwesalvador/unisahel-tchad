import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import {
  createFacultySchema,
  createDepartmentSchema,
  createProgramSchema,
  createLevelSchema,
  createSemesterSchema,
  createTeachingUnitSchema,
  createCourseElementSchema,
  validateBody,
  formatZodError,
} from '@/lib/validations/api'

async function handler(_user: SessionUser, tenantId: string, _request: NextRequest) {
  try {
    // Get tenant info
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        shortName: true,
        academicSystem: true,
        settings: {
          select: {
            creditsPerSemester: true,
            creditsPerYear: true,
            gradingScale: true,
            passingGrade: true,
          },
        },
      },
    })

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    // Get faculties with nested structure
    const faculties = await db.faculty.findMany({
      where: { tenantId },
      include: {
        departments: {
          where: { isActive: true },
          include: {
            programs: {
              where: { isActive: true },
              include: {
                levels: {
                  where: { isActive: true },
                  orderBy: { orderIndex: 'asc' },
                  include: {
                    semesters: {
                      orderBy: { orderIndex: 'asc' },
                      include: {
                        teachingUnits: {
                          orderBy: { orderIndex: 'asc' },
                          include: {
                            courseElements: {
                              orderBy: { orderIndex: 'asc' },
                              include: {
                                teacher: {
                                  select: {
                                    id: true,
                                    employeeId: true,
                                    grade: true,
                                    specialization: true,
                                    user: {
                                      select: { firstName: true, lastName: true },
                                    },
                                  },
                                },
                              },
                            },
                            responsible: {
                              select: {
                                id: true,
                                employeeId: true,
                                grade: true,
                                user: {
                                  select: { firstName: true, lastName: true },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              orderBy: { name: 'asc' },
            },
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    })

    // Compute summary stats
    const stats = {
      faculties: faculties.length,
      departments: faculties.reduce((acc, f) => acc + f.departments.length, 0),
      programs: faculties.reduce(
        (acc, f) => acc + f.departments.reduce((a, d) => a + d.programs.length, 0),
        0
      ),
      levels: faculties.reduce(
        (acc, f) =>
          acc +
          f.departments.reduce(
            (a, d) => a + d.programs.reduce((b, p) => b + p.levels.length, 0),
            0
          ),
        0
      ),
      semesters: faculties.reduce(
        (acc, f) =>
          acc +
          f.departments.reduce(
            (a, d) =>
              a +
              d.programs.reduce(
                (b, p) =>
                  b + p.levels.reduce((c, l) => c + l.semesters.length, 0),
                0
              ),
            0
          ),
        0
      ),
      teachingUnits: faculties.reduce(
        (acc, f) =>
          acc +
          f.departments.reduce(
            (a, d) =>
              a +
              d.programs.reduce(
                (b, p) =>
                  b +
                  p.levels.reduce(
                    (c, l) =>
                      c +
                      l.semesters.reduce(
                        (d, s) => d + s.teachingUnits.length,
                        0
                      ),
                    0
                  ),
                0
              ),
            0
          ),
        0
      ),
      courseElements: faculties.reduce(
        (acc, f) =>
          acc +
          f.departments.reduce(
            (a, d) =>
              a +
              d.programs.reduce(
                (b, p) =>
                  b +
                  p.levels.reduce(
                    (c, l) =>
                      c +
                      l.semesters.reduce(
                        (d2, s) =>
                          d2 +
                          s.teachingUnits.reduce(
                            (e, u) => e + u.courseElements.length,
                            0
                          ),
                        0
                      ),
                    0
                  ),
                0
              ),
            0
          ),
        0
      ),
    }

    return NextResponse.json({
      tenant,
      faculties,
      stats,
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Structure API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch academic structure',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// POST /api/structure?type=faculty|department - createFacultySchema and
// createDepartmentSchema existed in validations/api.ts but no route ever
// used them; StructurePage/InstitutionPage's "Ajouter" buttons had no
// handler to call.
async function createFacultyHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const data = validateBody(createFacultySchema, body)
    const faculty = await db.faculty.create({ data: { ...data, tenantId } })
    await db.auditLog.create({
      data: { tenantId, userId: user.id, action: 'CREATE', entity: 'Faculty', entityId: faculty.id, details: JSON.stringify({ name: faculty.name }) },
    })
    return NextResponse.json({ data: faculty }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: formatZodError(error as any) }, { status: 400 })
    }
    console.error('Create faculty error:', error)
    return NextResponse.json({ error: 'Failed to create faculty' }, { status: 500 })
  }
}

async function createDepartmentHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const data = validateBody(createDepartmentSchema, body)

    const faculty = await db.faculty.findFirst({ where: { id: data.facultyId, tenantId } })
    if (!faculty) {
      return NextResponse.json({ error: 'Faculty not found in this tenant' }, { status: 404 })
    }

    const department = await db.department.create({ data: { ...data, tenantId } })
    await db.auditLog.create({
      data: { tenantId, userId: user.id, action: 'CREATE', entity: 'Department', entityId: department.id, details: JSON.stringify({ name: department.name, facultyId: department.facultyId }) },
    })
    return NextResponse.json({ data: department }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: formatZodError(error as any) }, { status: 400 })
    }
    console.error('Create department error:', error)
    return NextResponse.json({ error: 'Failed to create department' }, { status: 500 })
  }
}

// The LMD hierarchy below a department -- Program -> Level -> Semester ->
// TeachingUnit (UE) -> CourseElement (EC) -- previously had validation schemas
// (createProgramSchema...createCourseElementSchema) but no route ever used
// them: only the demo seed could build a curriculum, so a real institution
// could create faculties/departments but never its own programs or courses,
// which also blocked student enrolment (a student needs a real programId +
// levelId). These handlers close that gap. Only Program carries a tenantId
// column; ownership for the deeper levels is proven by walking the parent
// chain up to Program.tenantId.

async function createProgramHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const data = validateBody(createProgramSchema, body)

    const faculty = await db.faculty.findFirst({ where: { id: data.facultyId, tenantId } })
    if (!faculty) {
      return NextResponse.json({ error: 'Faculty not found in this tenant' }, { status: 404 })
    }
    const department = await db.department.findFirst({ where: { id: data.departmentId, tenantId, facultyId: data.facultyId } })
    if (!department) {
      return NextResponse.json({ error: 'Department not found in this faculty/tenant' }, { status: 404 })
    }

    // createProgramSchema carries creditsPerYear for the UI, but the Program
    // model has no such column -- build the create input explicitly so Prisma
    // never sees an unknown argument.
    const program = await db.program.create({
      data: {
        tenantId,
        facultyId: data.facultyId,
        departmentId: data.departmentId,
        name: data.name,
        code: data.code,
        cycle: data.cycle,
        diplomaType: data.diplomaType,
        duration: data.duration,
        isActive: data.isActive,
      },
    })
    await db.auditLog.create({
      data: { tenantId, userId: user.id, action: 'CREATE', entity: 'Program', entityId: program.id, details: JSON.stringify({ name: program.name, code: program.code, cycle: program.cycle }) },
    })
    return NextResponse.json({ data: program }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: formatZodError(error as any) }, { status: 400 })
    }
    console.error('Create program error:', error)
    return NextResponse.json({ error: 'Failed to create program' }, { status: 500 })
  }
}

async function createLevelHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const data = validateBody(createLevelSchema, body)

    const program = await db.program.findFirst({ where: { id: data.programId, tenantId } })
    if (!program) {
      return NextResponse.json({ error: 'Program not found in this tenant' }, { status: 404 })
    }

    const level = await db.level.create({
      data: {
        programId: data.programId,
        name: data.name,
        code: data.code,
        orderIndex: data.orderIndex,
        isActive: data.isActive,
      },
    })
    await db.auditLog.create({
      data: { tenantId, userId: user.id, action: 'CREATE', entity: 'Level', entityId: level.id, details: JSON.stringify({ name: level.name, programId: data.programId }) },
    })
    return NextResponse.json({ data: level }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: formatZodError(error as any) }, { status: 400 })
    }
    console.error('Create level error:', error)
    return NextResponse.json({ error: 'Failed to create level' }, { status: 500 })
  }
}

async function createSemesterHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const data = validateBody(createSemesterSchema, body)

    const level = await db.level.findFirst({ where: { id: data.levelId, program: { tenantId } } })
    if (!level) {
      return NextResponse.json({ error: 'Level not found in this tenant' }, { status: 404 })
    }

    // startDate/endDate are accepted by the schema but the Semester model has
    // no such columns -- omit them from the create input.
    const semester = await db.semester.create({
      data: {
        levelId: data.levelId,
        name: data.name,
        code: data.code,
        orderIndex: data.orderIndex,
      },
    })
    await db.auditLog.create({
      data: { tenantId, userId: user.id, action: 'CREATE', entity: 'Semester', entityId: semester.id, details: JSON.stringify({ name: semester.name, levelId: data.levelId }) },
    })
    return NextResponse.json({ data: semester }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: formatZodError(error as any) }, { status: 400 })
    }
    console.error('Create semester error:', error)
    return NextResponse.json({ error: 'Failed to create semester' }, { status: 500 })
  }
}

async function createTeachingUnitHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const data = validateBody(createTeachingUnitSchema, body)

    const semester = await db.semester.findFirst({ where: { id: data.semesterId, level: { program: { tenantId } } } })
    if (!semester) {
      return NextResponse.json({ error: 'Semester not found in this tenant' }, { status: 404 })
    }
    if (data.responsibleId) {
      const teacher = await db.teacher.findFirst({ where: { id: data.responsibleId, tenantId } })
      if (!teacher) {
        return NextResponse.json({ error: 'Responsible teacher not found in this tenant' }, { status: 404 })
      }
    }

    const unit = await db.teachingUnit.create({
      data: {
        semesterId: data.semesterId,
        code: data.code,
        name: data.name,
        credits: data.credits,
        type: data.type,
        compensable: data.compensable,
        responsibleId: data.responsibleId,
        orderIndex: data.orderIndex,
      },
    })
    await db.auditLog.create({
      data: { tenantId, userId: user.id, action: 'CREATE', entity: 'TeachingUnit', entityId: unit.id, details: JSON.stringify({ name: unit.name, code: unit.code, credits: unit.credits }) },
    })
    return NextResponse.json({ data: unit }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: formatZodError(error as any) }, { status: 400 })
    }
    console.error('Create teaching unit error:', error)
    return NextResponse.json({ error: 'Failed to create teaching unit' }, { status: 500 })
  }
}

async function createCourseElementHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const data = validateBody(createCourseElementSchema, body)

    const unit = await db.teachingUnit.findFirst({ where: { id: data.teachingUnitId, semester: { level: { program: { tenantId } } } } })
    if (!unit) {
      return NextResponse.json({ error: 'Teaching unit not found in this tenant' }, { status: 404 })
    }
    if (data.teacherId) {
      const teacher = await db.teacher.findFirst({ where: { id: data.teacherId, tenantId } })
      if (!teacher) {
        return NextResponse.json({ error: 'Teacher not found in this tenant' }, { status: 404 })
      }
    }

    const element = await db.courseElement.create({
      data: {
        teachingUnitId: data.teachingUnitId,
        code: data.code,
        name: data.name,
        coefficient: data.coefficient,
        hoursCM: data.hoursCM,
        hoursTD: data.hoursTD,
        hoursTP: data.hoursTP,
        teacherId: data.teacherId,
        orderIndex: data.orderIndex,
      },
    })
    await db.auditLog.create({
      data: { tenantId, userId: user.id, action: 'CREATE', entity: 'CourseElement', entityId: element.id, details: JSON.stringify({ name: element.name, code: element.code, coefficient: element.coefficient }) },
    })
    return NextResponse.json({ data: element }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation failed', details: formatZodError(error as any) }, { status: 400 })
    }
    console.error('Create course element error:', error)
    return NextResponse.json({ error: 'Failed to create course element' }, { status: 500 })
  }
}

export const GET = withTenantAuth(handler)

// One POST endpoint fans out by ?type= across the whole academic hierarchy so
// an institution can build its structure top-down: faculty -> department ->
// program -> level -> semester -> teaching-unit -> course-element.
export const POST = withTenantAuth(async (user: SessionUser, tenantId: string, request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  switch (type) {
    case 'department': return createDepartmentHandler(user, tenantId, request)
    case 'program': return createProgramHandler(user, tenantId, request)
    case 'level': return createLevelHandler(user, tenantId, request)
    case 'semester': return createSemesterHandler(user, tenantId, request)
    case 'teaching-unit': return createTeachingUnitHandler(user, tenantId, request)
    case 'course-element': return createCourseElementHandler(user, tenantId, request)
    case 'faculty':
    default: return createFacultyHandler(user, tenantId, request)
  }
}, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'RECTORAT'])
