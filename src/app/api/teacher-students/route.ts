import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'

/**
 * Returns the roster visible to an authenticated teacher.
 *
 * Visibility is derived from approved annual teaching services, not from the
 * legacy CourseElement.teacherId field. A teacher therefore sees every
 * student administratively enrolled in the programme/level of a course they
 * teach (including common-core courses), while grade entry remains
 * course-specific in /api/grade-entry.
 */
async function handleGet(user: SessionUser, tenantId: string, request: NextRequest) {
  const requestedYearId = request.nextUrl.searchParams.get('academicYearId')
  const academicYear = await db.academicYear.findFirst({
    where: { tenantId, ...(requestedYearId ? { id: requestedYearId } : { isCurrent: true }) },
    select: { id: true, name: true },
  })
  if (!academicYear) return NextResponse.json({ error: 'Année académique introuvable.' }, { status: 404 })

  const teacher = await db.teacher.findFirst({
    where: { tenantId, userId: user.id, isActive: true },
    select: { id: true },
  })
  if (!teacher) return NextResponse.json({ error: 'Profil enseignant actif introuvable.' }, { status: 403 })

  const services = await db.teachingService.findMany({
    where: { tenantId, academicYearId: academicYear.id, teacherId: teacher.id, status: 'APPROVED' },
    select: {
      courseElement: {
        select: {
          id: true,
          name: true,
          code: true,
          teachingUnit: {
            select: {
              code: true,
              name: true,
              semester: {
                select: {
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
            },
          },
        },
      },
    },
  })

  const scopeMap = new Map<string, {
    programId: string; program: string; levelId: string; level: string; courses: Array<{ id: string; code: string | null; name: string; unit: string; unitCode: string | null }>
  }>()
  for (const service of services) {
    const course = service.courseElement
    const level = course.teachingUnit.semester.level
    const key = `${level.program.id}:${level.id}`
    const current = scopeMap.get(key) ?? {
      programId: level.program.id, program: level.program.name, levelId: level.id, level: level.name, courses: [],
    }
    current.courses.push({
      id: course.id, code: course.code, name: course.name,
      unit: course.teachingUnit.name, unitCode: course.teachingUnit.code,
    })
    scopeMap.set(key, current)
  }
  const scopes = [...scopeMap.values()].map((scope) => ({
    ...scope,
    courses: scope.courses.sort((a, b) => `${a.unit}${a.name}`.localeCompare(`${b.unit}${b.name}`, 'fr')),
  }))
  if (scopes.length === 0) return NextResponse.json({ data: { academicYear, scopes, students: [] } })

  const registrations = await db.student.findMany({
    where: {
      tenantId,
      registrations: {
        some: {
          tenantId,
          academicYearId: academicYear.id,
          status: 'INSCRIT',
          OR: scopes.map((scope) => ({ programId: scope.programId, levelId: scope.levelId })),
        },
      },
    },
    select: {
      id: true, matricule: true, firstName: true, lastName: true, middleName: true,
      email: true, phone: true,
      registrations: {
        where: {
          tenantId,
          academicYearId: academicYear.id,
          status: 'INSCRIT',
          OR: scopes.map((scope) => ({ programId: scope.programId, levelId: scope.levelId })),
        },
        select: { programId: true, levelId: true },
        take: 1,
      },
    },
    orderBy: { lastName: 'asc' },
  })
  const students = registrations.flatMap((registration) => {
    const annual = registration.registrations[0]
    if (!annual) return []
    const scope = scopes.find((candidate) => candidate.programId === annual.programId && candidate.levelId === annual.levelId)
    if (!scope) return []
    return [{
      id: registration.id,
      matricule: registration.matricule,
      firstName: registration.firstName,
      lastName: registration.lastName,
      middleName: registration.middleName,
      email: registration.email,
      phone: registration.phone,
      program: scope.program,
      level: scope.level,
      programId: annual.programId,
      levelId: annual.levelId,
    }]
  })
  return NextResponse.json({ data: { academicYear, scopes, students } })
}

export const GET = withTenantAuth(handleGet, ['ENSEIGNANT'])
