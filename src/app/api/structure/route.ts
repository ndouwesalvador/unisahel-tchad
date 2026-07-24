import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'

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

export const GET = withTenantAuth(handler)
