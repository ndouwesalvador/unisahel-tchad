import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function snapshotFromLevel(level) {
  return {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    program: level.program,
    level: { id: level.id, code: level.code, name: level.name, orderIndex: level.orderIndex },
    semesters: level.semesters.map((semester) => ({
      id: semester.id,
      code: semester.code,
      name: semester.name,
      orderIndex: semester.orderIndex,
      units: semester.teachingUnits.map((unit) => ({
        id: unit.id,
        code: unit.code,
        name: unit.name,
        credits: unit.credits,
        type: unit.type,
        compensable: unit.compensable,
        orderIndex: unit.orderIndex,
        semesterId: semester.id,
        elements: unit.courseElements,
      })),
    })),
  }
}

async function main() {
  const registrations = await prisma.administrativeRegistration.findMany({
    where: { status: 'INSCRIT' },
    select: { id: true, tenantId: true, academicYearId: true, programId: true, levelId: true, studentId: true, curriculumVersionId: true },
    orderBy: { registrationDate: 'asc' },
  })
  const groups = new Map()
  for (const registration of registrations) {
    const key = [registration.tenantId, registration.academicYearId, registration.programId, registration.levelId].join(':')
    const group = groups.get(key) ?? []
    group.push(registration)
    groups.set(key, group)
  }

  let linkedRegistrations = 0
  let linkedGrades = 0
  for (const group of groups.values()) {
    const first = group[0]
    let version = await prisma.curriculumVersion.findFirst({
      where: {
        tenantId: first.tenantId,
        academicYearId: first.academicYearId,
        programId: first.programId,
        levelId: first.levelId,
        status: { in: ['PUBLISHED', 'FROZEN'] },
      },
      orderBy: { version: 'desc' },
    })
    if (!version) {
      const level = await prisma.level.findFirst({
        where: { id: first.levelId, programId: first.programId, program: { tenantId: first.tenantId } },
        select: {
          id: true,
          code: true,
          name: true,
          orderIndex: true,
          program: { select: { id: true, code: true, name: true } },
          semesters: {
            where: { isActive: true },
            orderBy: { orderIndex: 'asc' },
            select: {
              id: true,
              code: true,
              name: true,
              orderIndex: true,
              teachingUnits: {
                where: { isActive: true },
                orderBy: { orderIndex: 'asc' },
                select: {
                  id: true,
                  code: true,
                  name: true,
                  credits: true,
                  type: true,
                  compensable: true,
                  orderIndex: true,
                  courseElements: {
                    where: { isActive: true },
                    orderBy: { orderIndex: 'asc' },
                    select: {
                      id: true,
                      code: true,
                      name: true,
                      coefficient: true,
                      hoursCM: true,
                      hoursTD: true,
                      hoursTP: true,
                      hoursStage: true,
                      hoursPersonal: true,
                      orderIndex: true,
                    },
                  },
                },
              },
            },
          },
        },
      })
      if (!level) continue
      version = await prisma.curriculumVersion.create({
        data: {
          tenantId: first.tenantId,
          academicYearId: first.academicYearId,
          programId: first.programId,
          levelId: first.levelId,
          version: 1,
          status: 'FROZEN',
          snapshot: snapshotFromLevel(level),
        },
      })
    }
    if (version.status !== 'FROZEN') {
      version = await prisma.curriculumVersion.update({ where: { id: version.id }, data: { status: 'FROZEN', frozenAt: new Date() } })
    }

    const registrationIds = group.map((registration) => registration.id)
    const studentIds = group.map((registration) => registration.studentId)
    const registrationUpdate = await prisma.administrativeRegistration.updateMany({
      where: { id: { in: registrationIds }, curriculumVersionId: null },
      data: { curriculumVersionId: version.id },
    })
    const gradeUpdate = await prisma.grade.updateMany({
      where: {
        studentId: { in: studentIds },
        academicYearId: first.academicYearId,
        curriculumVersionId: null,
      },
      data: { curriculumVersionId: version.id },
    })
    linkedRegistrations += registrationUpdate.count
    linkedGrades += gradeUpdate.count
  }
  console.log(`Curriculum history ready: ${linkedRegistrations} enrollment(s), ${linkedGrades} grade(s) linked.`)
}

main().finally(async () => prisma.$disconnect())
