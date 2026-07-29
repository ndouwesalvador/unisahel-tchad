import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { createFacultySchema, createDepartmentSchema, validateBody, formatZodError } from '@/lib/validations/api'

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

export const GET = withTenantAuth(handler)

export const POST = withTenantAuth(async (user: SessionUser, tenantId: string, request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  if (type === 'department') return createDepartmentHandler(user, tenantId, request)
  return createFacultyHandler(user, tenantId, request)
}, ['SUPER_ADMIN', 'ADMIN_INSTITUTION'])
