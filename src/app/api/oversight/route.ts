import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'

const OVERSIGHT_ROLES = ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE', 'RECTORAT']

async function handleGet(_user: SessionUser, tenantId: string, _request: NextRequest) {
  try {
    const academicYear = await db.academicYear.findFirst({
      where: { tenantId, OR: [{ isCurrent: true }, { isActive: true }] },
      orderBy: [{ isCurrent: 'desc' }, { startDate: 'desc' }],
      select: { id: true, name: true },
    })

    const [students, teachers, programsCount, faculties, departments, statuses, programs, signedPvs] = await Promise.all([
      db.student.count({ where: { tenantId } }),
      db.teacher.count({ where: { tenantId, isActive: true } }),
      db.program.count({ where: { tenantId, isActive: true } }),
      db.faculty.count({ where: { tenantId, isActive: true } }),
      db.department.count({ where: { tenantId, isActive: true } }),
      db.student.groupBy({ by: ['status'], where: { tenantId }, _count: { _all: true }, orderBy: { status: 'asc' } }),
      db.program.findMany({
        where: { tenantId, isActive: true },
        orderBy: { name: 'asc' },
        select: {
          id: true, name: true, cycle: true,
          department: { select: { id: true, name: true, faculty: { select: { id: true, name: true } } } },
          levels: { where: { isActive: true }, orderBy: { orderIndex: 'asc' }, select: { id: true, name: true, _count: { select: { students: true } } } },
          _count: { select: { students: true } },
        },
      }),
      db.officialDocument.count({ where: { tenantId, type: 'PV_DELIBERATION', validatedAt: { not: null } } }),
    ])

    return NextResponse.json({
      academicYear,
      totals: { students, teachers, programs: programsCount, faculties, departments, signedPvs },
      statuses: statuses.map((row) => ({ status: row.status, count: row._count._all })),
      programs: programs.map((program) => ({
        id: program.id,
        name: program.name,
        cycle: program.cycle,
        students: program._count.students,
        departmentId: program.department?.id ?? null,
        department: program.department?.name ?? 'Non rattaché',
        facultyId: program.department?.faculty?.id ?? null,
        faculty: program.department?.faculty?.name ?? 'Non rattachée',
        levels: program.levels.map((level) => ({ id: level.id, name: level.name, students: level._count.students })),
      })),
    })
  } catch (error) {
    console.error('Oversight API error:', error)
    return NextResponse.json({ error: 'Impossible de charger les indicateurs de pilotage.' }, { status: 500 })
  }
}

export const GET = withTenantAuth(handleGet, OVERSIGHT_ROLES)
