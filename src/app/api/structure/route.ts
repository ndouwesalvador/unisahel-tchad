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

    // Get faculties with nested structure. isActive:true hides soft-deleted
    // faculties, mirroring the isActive filters already applied to the nested
    // departments/programs/levels below.
    const faculties = await db.faculty.findMany({
      where: { tenantId, isActive: true },
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

// ─── Edit / delete across the hierarchy ─────────────────────────────────────
//
// Shared helpers so PUT and DELETE cover all seven entity types uniformly.
// Only Program carries tenantId directly; ownership for the deeper levels is
// proven by walking the parent chain up to Program.tenantId (same rule as the
// create handlers above).

type EntityType = 'faculty' | 'department' | 'program' | 'level' | 'semester' | 'teaching-unit' | 'course-element'

const ENTITY_LABEL: Record<EntityType, string> = {
  faculty: 'Faculty',
  department: 'Department',
  program: 'Program',
  level: 'Level',
  semester: 'Semester',
  'teaching-unit': 'TeachingUnit',
  'course-element': 'CourseElement',
}

// Fields the client may update, per type. Anything else in the body is ignored.
const UPDATABLE: Record<EntityType, string[]> = {
  faculty: ['name', 'shortName', 'deanName', 'deanTitle', 'email', 'phone', 'isActive'],
  department: ['name', 'shortName', 'headName', 'isActive'],
  program: ['name', 'code', 'cycle', 'diplomaType', 'duration', 'isActive'],
  level: ['name', 'code', 'orderIndex', 'isActive'],
  semester: ['name', 'code', 'orderIndex'],
  'teaching-unit': ['code', 'name', 'credits', 'type', 'compensable', 'responsibleId', 'orderIndex'],
  'course-element': ['code', 'name', 'coefficient', 'hoursCM', 'hoursTD', 'hoursTP', 'teacherId', 'orderIndex'],
}

const NUMERIC_FIELDS = new Set(['duration', 'orderIndex', 'credits', 'coefficient', 'hoursCM', 'hoursTD', 'hoursTP'])
const SOFT_DELETE_TYPES = new Set<EntityType>(['faculty', 'department', 'program', 'level'])

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function delegate(type: EntityType): any {
  switch (type) {
    case 'faculty': return db.faculty
    case 'department': return db.department
    case 'program': return db.program
    case 'level': return db.level
    case 'semester': return db.semester
    case 'teaching-unit': return db.teachingUnit
    case 'course-element': return db.courseElement
  }
}

async function ownsEntity(type: EntityType, id: string, tenantId: string): Promise<boolean> {
  const found = await (async () => {
    switch (type) {
      case 'faculty': return db.faculty.findFirst({ where: { id, tenantId }, select: { id: true } })
      case 'department': return db.department.findFirst({ where: { id, tenantId }, select: { id: true } })
      case 'program': return db.program.findFirst({ where: { id, tenantId }, select: { id: true } })
      case 'level': return db.level.findFirst({ where: { id, program: { tenantId } }, select: { id: true } })
      case 'semester': return db.semester.findFirst({ where: { id, level: { program: { tenantId } } }, select: { id: true } })
      case 'teaching-unit': return db.teachingUnit.findFirst({ where: { id, semester: { level: { program: { tenantId } } } }, select: { id: true } })
      case 'course-element': return db.courseElement.findFirst({ where: { id, teachingUnit: { semester: { level: { program: { tenantId } } } } }, select: { id: true } })
    }
  })()
  return Boolean(found)
}

async function updateEntityHandler(user: SessionUser, tenantId: string, request: NextRequest, type: EntityType) {
  try {
    const body = await request.json()
    const id = body?.id
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }
    if (!(await ownsEntity(type, id, tenantId))) {
      return NextResponse.json({ error: 'Entity not found in this tenant' }, { status: 404 })
    }

    // Optional teacher references must belong to the tenant.
    if (type === 'teaching-unit' && body.responsibleId) {
      const t = await db.teacher.findFirst({ where: { id: body.responsibleId, tenantId }, select: { id: true } })
      if (!t) return NextResponse.json({ error: 'Responsible teacher not found in this tenant' }, { status: 404 })
    }
    if (type === 'course-element' && body.teacherId) {
      const t = await db.teacher.findFirst({ where: { id: body.teacherId, tenantId }, select: { id: true } })
      if (!t) return NextResponse.json({ error: 'Teacher not found in this tenant' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    for (const key of UPDATABLE[type]) {
      if (body[key] !== undefined) {
        data[key] = NUMERIC_FIELDS.has(key) ? Number(body[key]) : body[key]
      }
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
    }

    const updated = await delegate(type).update({ where: { id }, data })
    await db.auditLog.create({
      data: { tenantId, userId: user.id, action: 'UPDATE', entity: ENTITY_LABEL[type], entityId: id, details: JSON.stringify(data) },
    })
    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error(`Update ${type} error:`, error)
    return NextResponse.json({ error: `Failed to update ${type}` }, { status: 500 })
  }
}

async function deleteEntityHandler(user: SessionUser, tenantId: string, request: NextRequest, type: EntityType) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 })
    }
    if (!(await ownsEntity(type, id, tenantId))) {
      return NextResponse.json({ error: 'Entity not found in this tenant' }, { status: 404 })
    }

    // Faculty/Department/Program/Level are deactivated (isActive:false), the
    // same soft-delete used for teachers and reflected by the GET filters, so
    // students/grades that reference them are never destroyed.
    if (SOFT_DELETE_TYPES.has(type)) {
      await delegate(type).update({ where: { id }, data: { isActive: false } })
      await db.auditLog.create({
        data: { tenantId, userId: user.id, action: 'DELETE', entity: ENTITY_LABEL[type], entityId: id, details: JSON.stringify({ soft: true }) },
      })
      return NextResponse.json({ data: { id, isActive: false } })
    }

    // Semester/UE/EC have no isActive column, so they are hard-deleted — but
    // never when real academic data hangs off them (a cascade would silently
    // erase student grades).
    if (type === 'course-element') {
      const grades = await db.grade.count({ where: { courseElementId: id } })
      if (grades > 0) return NextResponse.json({ error: 'Des notes sont rattachées à cette matière (EC).' }, { status: 409 })
    }
    if (type === 'teaching-unit') {
      const grades = await db.grade.count({ where: { teachingUnitId: id } })
      if (grades > 0) return NextResponse.json({ error: 'Des notes sont rattachées à cette UE.' }, { status: 409 })
    }
    if (type === 'semester') {
      const units = await db.teachingUnit.count({ where: { semesterId: id } })
      if (units > 0) return NextResponse.json({ error: "Ce semestre contient des UE ; supprimez-les d'abord." }, { status: 409 })
    }

    await delegate(type).delete({ where: { id } })
    await db.auditLog.create({
      data: { tenantId, userId: user.id, action: 'DELETE', entity: ENTITY_LABEL[type], entityId: id, details: JSON.stringify({ soft: false }) },
    })
    return NextResponse.json({ data: { id, deleted: true } })
  } catch (error) {
    console.error(`Delete ${type} error:`, error)
    return NextResponse.json({ error: `Failed to delete ${type}` }, { status: 500 })
  }
}

const KNOWN_TYPES = new Set<string>(['faculty', 'department', 'program', 'level', 'semester', 'teaching-unit', 'course-element'])

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

// PUT /api/structure?type=<entity> — edit any node in the hierarchy (id in body).
export const PUT = withTenantAuth(async (user: SessionUser, tenantId: string, request: NextRequest) => {
  const type = new URL(request.url).searchParams.get('type') || 'faculty'
  if (!KNOWN_TYPES.has(type)) {
    return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 })
  }
  return updateEntityHandler(user, tenantId, request, type as EntityType)
}, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'RECTORAT'])

// DELETE /api/structure?type=<entity>&id=<id> — soft-delete (faculty/department/
// program/level) or guarded hard-delete (semester/teaching-unit/course-element).
export const DELETE = withTenantAuth(async (user: SessionUser, tenantId: string, request: NextRequest) => {
  const type = new URL(request.url).searchParams.get('type') || 'faculty'
  if (!KNOWN_TYPES.has(type)) {
    return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 })
  }
  return deleteEntityHandler(user, tenantId, request, type as EntityType)
}, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'RECTORAT'])
