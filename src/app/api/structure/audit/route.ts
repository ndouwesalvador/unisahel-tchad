import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { duplicateNameGroups } from '@/lib/structure-duplicates'

async function handleGet(_user: SessionUser, tenantId: string, _request: NextRequest) {
  const programs = await db.program.findMany({
    where: { tenantId, isActive: true },
    select: {
      id: true,
      name: true,
      levels: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          code: true,
          semesters: {
            select: {
              id: true,
              name: true,
              teachingUnits: {
                select: {
                  id: true,
                  credits: true,
                  _count: { select: { courseElements: true } },
                },
              },
            },
          },
        },
      },
    },
  })

  const groups = await Promise.all(programs.flatMap((program) =>
    duplicateNameGroups(program.levels).map(async (levels) => ({
      programId: program.id,
      programName: program.name,
      levels: await Promise.all(levels.map(async (level) => {
        const [students, administrativeRegistrations, admissions, campaigns, deliberations, feeStructures, timetableSlots, pedagogicalRegistrations, grades] = await Promise.all([
          db.student.count({ where: { tenantId, currentLevelId: level.id } }),
          db.administrativeRegistration.count({ where: { tenantId, levelId: level.id } }),
          db.admission.count({ where: { tenantId, levelId: level.id } }),
          db.admissionCampaign.count({ where: { tenantId, levelId: level.id } }),
          db.deliberation.count({ where: { tenantId, levelId: level.id } }),
          db.feeStructure.count({ where: { tenantId, levelId: level.id } }),
          db.timetableSlot.count({ where: { tenantId, levelId: level.id } }),
          db.pedagogicalRegistration.count({ where: { teachingUnit: { semester: { levelId: level.id } } } }),
          db.grade.count({ where: { OR: [
            { teachingUnit: { semester: { levelId: level.id } } },
            { courseElement: { teachingUnit: { semester: { levelId: level.id } } } },
          ] } }),
        ])
        const units = level.semesters.flatMap((semester) => semester.teachingUnits)
        return {
          id: level.id,
          name: level.name,
          code: level.code,
          semesters: level.semesters.map((semester) => semester.name),
          teachingUnits: units.length,
          courseElements: units.reduce((sum, unit) => sum + unit._count.courseElements, 0),
          credits: units.reduce((sum, unit) => sum + unit.credits, 0),
          references: { students, administrativeRegistrations, admissions, campaigns, deliberations, feeStructures, timetableSlots, pedagogicalRegistrations, grades },
        }
      })),
    })),
  ))

  return NextResponse.json({ data: groups })
}

export const GET = withTenantAuth(handleGet, ['SUPER_ADMIN', 'ADMIN_INSTITUTION'])
