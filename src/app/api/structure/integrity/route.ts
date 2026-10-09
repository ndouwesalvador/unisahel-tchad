import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN_INSTITUTION'] as const
const MAX_GRADE_SCAN = 5000

function pair(studentId: string, teachingUnitId: string) {
  return `${studentId}:${teachingUnitId}`
}

async function handleGet(_user: SessionUser, tenantId: string, _request: NextRequest) {
  const [academicYear, demoPrograms] = await Promise.all([
    db.academicYear.findFirst({
      where: { tenantId, isCurrent: true },
      select: { id: true, name: true },
    }),
    db.program.findMany({
      where: {
        tenantId,
        OR: [
          { name: { contains: 'VALIDATION DEV', mode: 'insensitive' } },
          { code: { startsWith: 'DEV', mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        code: true,
        levels: {
          select: {
            id: true,
            name: true,
            semesters: {
              select: {
                id: true,
                teachingUnits: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    courseElements: { select: { id: true, code: true, name: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
  ])

  const programIds = demoPrograms.map((program) => program.id)
  const levels = demoPrograms.flatMap((program) => program.levels)
  const levelIds = levels.map((level) => level.id)
  const semesters = levels.flatMap((level) => level.semesters)
  const semesterIds = semesters.map((semester) => semester.id)
  const teachingUnits = semesters.flatMap((semester) => semester.teachingUnits)
  const teachingUnitIds = teachingUnits.map((unit) => unit.id)
  const courseElements = teachingUnits.flatMap((unit) => unit.courseElements)
  const courseElementIds = courseElements.map((element) => element.id)

  const demoStudents = programIds.length === 0
    ? []
    : await db.student.findMany({
        where: {
          tenantId,
          OR: [
            { currentProgramId: { in: programIds } },
            { matricule: { contains: 'VALIDATION-DEV', mode: 'insensitive' } },
            { lastName: { contains: 'VALIDATION-DEV', mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          userId: true,
          matricule: true,
          firstName: true,
          lastName: true,
          status: true,
          currentProgramId: true,
          currentLevelId: true,
        },
      })
  const studentIds = demoStudents.map((student) => student.id)
  const userIds = demoStudents.flatMap((student) => student.userId ? [student.userId] : [])

  const zeroDemoCounts = {
    programs: 0, levels: 0, semesters: 0, teachingUnits: 0, courseElements: 0,
    students: 0, linkedPortalUsers: 0, administrativeRegistrations: 0,
    pedagogicalRegistrations: 0, grades: 0, teachingServices: 0,
    timetableSlots: 0, scheduledExams: 0, officialDocuments: 0,
    deliberations: 0, admissions: 0, juryAssignments: 0, feeStructures: 0,
  }

  let demoCounts = zeroDemoCounts
  if (programIds.length > 0) {
    const [
      linkedPortalUsers,
      administrativeRegistrations,
      pedagogicalRegistrations,
      grades,
      teachingServices,
      timetableSlots,
      scheduledExams,
      officialDocuments,
      deliberations,
      admissions,
      juryAssignments,
      feeStructures,
    ] = await Promise.all([
      db.user.count({ where: { tenantId, id: { in: userIds } } }),
      db.administrativeRegistration.count({
        where: {
          tenantId,
          OR: [
            { studentId: { in: studentIds } },
            { programId: { in: programIds } },
            { levelId: { in: levelIds } },
          ],
        },
      }),
      db.pedagogicalRegistration.count({
        where: {
          OR: [
            { studentId: { in: studentIds } },
            { teachingUnitId: { in: teachingUnitIds } },
          ],
        },
      }),
      db.grade.count({
        where: {
          OR: [
            { studentId: { in: studentIds } },
            { teachingUnitId: { in: teachingUnitIds } },
            { courseElementId: { in: courseElementIds } },
          ],
        },
      }),
      db.teachingService.count({ where: { tenantId, courseElementId: { in: courseElementIds } } }),
      db.timetableSlot.count({
        where: {
          tenantId,
          OR: [
            { programId: { in: programIds } },
            { levelId: { in: levelIds } },
            { courseElementId: { in: courseElementIds } },
          ],
        },
      }),
      db.scheduledExam.count({ where: { tenantId, teachingUnitId: { in: teachingUnitIds } } }),
      db.officialDocument.count({ where: { tenantId, studentId: { in: studentIds } } }),
      db.deliberation.count({
        where: { tenantId, OR: [{ programId: { in: programIds } }, { levelId: { in: levelIds } }] },
      }),
      db.admission.count({
        where: {
          tenantId,
          OR: [
            { studentId: { in: studentIds } },
            { programId: { in: programIds } },
            { levelId: { in: levelIds } },
          ],
        },
      }),
      db.juryAssignment.count({
        where: { tenantId, OR: [{ programId: { in: programIds } }, { levelId: { in: levelIds } }] },
      }),
      db.feeStructure.count({
        where: { tenantId, OR: [{ programId: { in: programIds } }, { levelId: { in: levelIds } }] },
      }),
    ])
    demoCounts = {
      programs: demoPrograms.length,
      levels: levelIds.length,
      semesters: semesterIds.length,
      teachingUnits: teachingUnitIds.length,
      courseElements: courseElementIds.length,
      students: studentIds.length,
      linkedPortalUsers,
      administrativeRegistrations,
      pedagogicalRegistrations,
      grades,
      teachingServices,
      timetableSlots,
      scheduledExams,
      officialDocuments,
      deliberations,
      admissions,
      juryAssignments,
      feeStructures,
    }
  }

  let gradeIntegrity = {
    academicYear,
    scannedLockedGrades: 0,
    scanTruncated: false,
    missingAnnualRegistration: 0,
    missingPedagogicalRegistration: 0,
    curriculumMismatch: 0,
    samples: [] as Array<{
      gradeId: string
      studentId: string
      matricule: string | null
      issue: string
      teachingUnitId: string | null
    }>,
  }

  if (academicYear) {
    const lockedGrades = await db.grade.findMany({
      where: {
        academicYearId: academicYear.id,
        isLocked: true,
        student: { tenantId },
      },
      select: {
        id: true,
        studentId: true,
        teachingUnitId: true,
        student: { select: { matricule: true } },
        courseElement: { select: { teachingUnitId: true } },
      },
      orderBy: { id: 'asc' },
      take: MAX_GRADE_SCAN + 1,
    })
    const scanTruncated = lockedGrades.length > MAX_GRADE_SCAN
    const scanned = lockedGrades.slice(0, MAX_GRADE_SCAN)
    const gradeStudentIds = [...new Set(scanned.map((grade) => grade.studentId))]
    const gradeUnitIds = [...new Set(scanned.flatMap((grade) => {
      const unitId = grade.teachingUnitId ?? grade.courseElement?.teachingUnitId
      return unitId ? [unitId] : []
    }))]
    const [registrations, pedagogicalRegistrations, unitContexts] = await Promise.all([
      db.administrativeRegistration.findMany({
        where: { tenantId, academicYearId: academicYear.id, studentId: { in: gradeStudentIds } },
        select: { studentId: true, levelId: true, status: true },
      }),
      db.pedagogicalRegistration.findMany({
        where: {
          academicYearId: academicYear.id,
          status: 'ACTIVE',
          studentId: { in: gradeStudentIds },
          teachingUnitId: { in: gradeUnitIds },
        },
        select: { studentId: true, teachingUnitId: true },
      }),
      db.teachingUnit.findMany({
        where: { id: { in: gradeUnitIds }, semester: { level: { program: { tenantId } } } },
        select: { id: true, semester: { select: { levelId: true } } },
      }),
    ])
    const registrationByStudent = new Map(registrations.map((registration) => [registration.studentId, registration]))
    const activePedagogicalPairs = new Set(pedagogicalRegistrations.map((registration) => pair(registration.studentId, registration.teachingUnitId)))
    const levelByUnit = new Map(unitContexts.map((unit) => [unit.id, unit.semester.levelId]))
    let missingAnnualRegistration = 0
    let missingPedagogicalRegistration = 0
    let curriculumMismatch = 0
    const samples: typeof gradeIntegrity.samples = []

    for (const grade of scanned) {
      const unitId = grade.teachingUnitId ?? grade.courseElement?.teachingUnitId ?? null
      const registration = registrationByStudent.get(grade.studentId)
      let issue: string | null = null
      if (!registration || registration.status !== 'INSCRIT') {
        missingAnnualRegistration += 1
        issue = 'INSCRIPTION_ANNUELLE_ABSENTE'
      }
      if (!unitId || !activePedagogicalPairs.has(pair(grade.studentId, unitId))) {
        missingPedagogicalRegistration += 1
        issue ??= 'INSCRIPTION_PEDAGOGIQUE_ABSENTE'
      }
      if (registration && unitId && levelByUnit.get(unitId) && registration.levelId !== levelByUnit.get(unitId)) {
        curriculumMismatch += 1
        issue ??= 'NIVEAU_INCOHERENT'
      }
      if (issue && samples.length < 25) {
        samples.push({
          gradeId: grade.id,
          studentId: grade.studentId,
          matricule: grade.student.matricule,
          issue,
          teachingUnitId: unitId,
        })
      }
    }

    gradeIntegrity = {
      academicYear,
      scannedLockedGrades: scanned.length,
      scanTruncated,
      missingAnnualRegistration,
      missingPedagogicalRegistration,
      curriculumMismatch,
      samples,
    }
  }

  return NextResponse.json({
    data: {
      gradeIntegrity,
      demoData: {
        programs: demoPrograms.map((program) => ({ id: program.id, name: program.name, code: program.code })),
        students: demoStudents,
        counts: demoCounts,
      },
    },
  })
}

export const GET = withTenantAuth(handleGet, [...ADMIN_ROLES])

const repairSchema = z.object({
  action: z.literal('repair-pedagogical-registrations'),
  academicYearId: z.string().min(1),
})

async function handlePost(user: SessionUser, tenantId: string, request: NextRequest) {
  const parsed = repairSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Action de réparation invalide.' }, { status: 400 })
  }

  const result = await db.$transaction(async (tx) => {
    const year = await tx.academicYear.findFirst({
      where: { id: parsed.data.academicYearId, tenantId, isCurrent: true },
      select: { id: true, name: true },
    })
    if (!year) throw new Error('CURRENT_YEAR_NOT_FOUND')

    const annualRegistrations = await tx.administrativeRegistration.findMany({
      where: { tenantId, academicYearId: year.id, status: 'INSCRIT' },
      select: { studentId: true, levelId: true },
    })
    const studentIds = [...new Set(annualRegistrations.map((registration) => registration.studentId))]
    const levelIds = [...new Set(annualRegistrations.map((registration) => registration.levelId))]
    const levelByStudent = new Map(annualRegistrations.map((registration) => [registration.studentId, registration.levelId]))

    const [units, lockedGrades, existingRegistrations] = await Promise.all([
      tx.teachingUnit.findMany({
        where: { semester: { level: { id: { in: levelIds }, program: { tenantId, isActive: true } } } },
        select: { id: true, type: true, semester: { select: { levelId: true } } },
      }),
      tx.grade.findMany({
        where: { academicYearId: year.id, isLocked: true, studentId: { in: studentIds } },
        select: {
          studentId: true,
          teachingUnitId: true,
          courseElement: { select: { teachingUnitId: true } },
        },
      }),
      tx.pedagogicalRegistration.findMany({
        where: { academicYearId: year.id, studentId: { in: studentIds } },
        select: { id: true, studentId: true, teachingUnitId: true, status: true },
      }),
    ])
    const unitById = new Map(units.map((unit) => [unit.id, unit]))
    const targetPairs = new Map<string, { studentId: string; teachingUnitId: string }>()
    for (const registration of annualRegistrations) {
      for (const unit of units) {
        if (unit.type === 'FONDAMENTALE' && unit.semester.levelId === registration.levelId) {
          targetPairs.set(pair(registration.studentId, unit.id), {
            studentId: registration.studentId,
            teachingUnitId: unit.id,
          })
        }
      }
    }
    for (const grade of lockedGrades) {
      const teachingUnitId = grade.teachingUnitId ?? grade.courseElement?.teachingUnitId
      const unit = teachingUnitId ? unitById.get(teachingUnitId) : null
      if (teachingUnitId && unit?.semester.levelId === levelByStudent.get(grade.studentId)) {
        targetPairs.set(pair(grade.studentId, teachingUnitId), { studentId: grade.studentId, teachingUnitId })
      }
    }

    const existingByPair = new Map(existingRegistrations.map((registration) => [
      pair(registration.studentId, registration.teachingUnitId), registration,
    ]))
    const toCreate = [...targetPairs.entries()]
      .filter(([key]) => !existingByPair.has(key))
      .map(([, value]) => ({
        ...value,
        academicYearId: year.id,
        type: 'OBLIGATOIRE',
        status: 'ACTIVE',
      }))
    const toReactivate = [...targetPairs.keys()]
      .flatMap((key) => {
        const existing = existingByPair.get(key)
        return existing && existing.status !== 'ACTIVE' ? [existing.id] : []
      })

    const [created, reactivated] = await Promise.all([
      toCreate.length > 0
        ? tx.pedagogicalRegistration.createMany({ data: toCreate, skipDuplicates: true })
        : Promise.resolve({ count: 0 }),
      toReactivate.length > 0
        ? tx.pedagogicalRegistration.updateMany({ where: { id: { in: toReactivate } }, data: { status: 'ACTIVE' } })
        : Promise.resolve({ count: 0 }),
    ])
    await tx.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: 'REPAIR',
        entity: 'PedagogicalRegistration',
        entityId: year.id,
        details: JSON.stringify({
          academicYear: year.name,
          annualRegistrations: annualRegistrations.length,
          expectedRegistrations: targetPairs.size,
          created: created.count,
          reactivated: reactivated.count,
        }),
      },
    })
    return {
      academicYear: year,
      annualRegistrations: annualRegistrations.length,
      expectedRegistrations: targetPairs.size,
      created: created.count,
      reactivated: reactivated.count,
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

  return NextResponse.json({ data: result })
}

export const POST = withTenantAuth(handlePost, [...ADMIN_ROLES])

const purgeSchema = z.object({
  action: z.literal('purge-validation-dev'),
  programId: z.string().min(1),
  confirmation: z.literal('SUPPRIMER VALIDATION DEV'),
})

class PurgeRejected extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
  }
}

function isExplicitDemoStudent(student: { matricule: string | null; lastName: string }) {
  return student.lastName.toUpperCase().includes('VALIDATION-DEV') ||
    (student.matricule ?? '').toUpperCase().includes('-DEV-')
}

async function handleDelete(user: SessionUser, tenantId: string, request: NextRequest) {
  const parsed = purgeSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Confirmation de purge invalide.' }, { status: 400 })
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const program = await tx.program.findFirst({
        where: { id: parsed.data.programId, tenantId },
        select: {
          id: true,
          name: true,
          code: true,
          levels: {
            select: {
              id: true,
              semesters: {
                select: {
                  id: true,
                  teachingUnits: {
                    select: { id: true, courseElements: { select: { id: true } } },
                  },
                },
              },
            },
          },
        },
      })
      if (!program) throw new PurgeRejected('Programme introuvable dans cette institution.', 404)
      const explicitProgramMarker = program.name.toUpperCase().includes('VALIDATION DEV') &&
        (program.code ?? '').toUpperCase().includes('DEV')
      if (!explicitProgramMarker) {
        throw new PurgeRejected('La purge est limitée aux programmes explicitement marqués VALIDATION DEV.', 409)
      }

      const students = await tx.student.findMany({
        where: { tenantId, currentProgramId: program.id },
        select: { id: true, userId: true, matricule: true, lastName: true },
      })
      if (students.some((student) => !isExplicitDemoStudent(student))) {
        throw new PurgeRejected('Un étudiant non marqué comme donnée de développement est rattaché à ce programme.', 409)
      }

      const levelIds = program.levels.map((level) => level.id)
      const semesters = program.levels.flatMap((level) => level.semesters)
      const teachingUnits = semesters.flatMap((semester) => semester.teachingUnits)
      const teachingUnitIds = teachingUnits.map((unit) => unit.id)
      const courseElementIds = teachingUnits.flatMap((unit) => unit.courseElements.map((element) => element.id))
      const studentIds = students.map((student) => student.id)
      const userIds = students.flatMap((student) => student.userId ? [student.userId] : [])
      const matricules = students.flatMap((student) => student.matricule ? [student.matricule] : [])

      const [grades, deliberations, onlineExams] = await Promise.all([
        tx.grade.findMany({
          where: {
            OR: [
              { studentId: { in: studentIds } },
              { teachingUnitId: { in: teachingUnitIds } },
              { courseElementId: { in: courseElementIds } },
            ],
          },
          select: { id: true },
        }),
        tx.deliberation.findMany({
          where: { tenantId, OR: [{ programId: program.id }, { levelId: { in: levelIds } }] },
          select: { id: true },
        }),
        tx.onlineExam.findMany({
          where: { tenantId, courseElementId: { in: courseElementIds } },
          select: { id: true },
        }),
      ])
      const gradeIds = grades.map((grade) => grade.id)
      const deliberationIds = deliberations.map((deliberation) => deliberation.id)
      const onlineExamIds = onlineExams.map((exam) => exam.id)

      const deleted = {
        gradeImportItems: (await tx.gradeImportItem.deleteMany({ where: { gradeId: { in: gradeIds } } })).count,
        officialDocuments: (await tx.officialDocument.deleteMany({
          where: {
            tenantId,
            OR: [
              { studentId: { in: studentIds } },
              { studentId: null, content: { contains: program.name, mode: 'insensitive' } },
              { studentId: null, content: { contains: 'VALIDATION-DEV', mode: 'insensitive' } },
            ],
          },
        })).count,
        examIncidents: (await tx.examIncident.deleteMany({
          where: { tenantId, OR: [{ studentId: { in: studentIds } }, { examId: { in: onlineExamIds } }] },
        })).count,
        onlineExams: (await tx.onlineExam.deleteMany({ where: { id: { in: onlineExamIds }, tenantId } })).count,
        examBankQuestions: (await tx.examBankQuestion.deleteMany({ where: { tenantId, courseElementId: { in: courseElementIds } } })).count,
        communications: (await tx.communication.deleteMany({ where: { tenantId, courseElementId: { in: courseElementIds } } })).count,
        attendances: (await tx.attendance.deleteMany({
          where: { tenantId, OR: [{ studentId: { in: studentIds } }, { courseElementId: { in: courseElementIds } }] },
        })).count,
        scholarshipApplications: (await tx.scholarshipApplication.deleteMany({ where: { tenantId, studentId: { in: studentIds } } })).count,
        alumni: (await tx.alumni.deleteMany({ where: { tenantId, studentId: { in: studentIds } } })).count,
        internships: (await tx.internship.deleteMany({ where: { tenantId, matricule: { in: matricules } } })).count,
        notifications: (await tx.notification.deleteMany({ where: { tenantId, recipientUserId: { in: userIds } } })).count,
        deliberationDecisions: (await tx.deliberationDecision.deleteMany({
          where: { OR: [{ deliberationId: { in: deliberationIds } }, { studentId: { in: studentIds } }] },
        })).count,
        deliberations: (await tx.deliberation.deleteMany({ where: { id: { in: deliberationIds }, tenantId } })).count,
        admissions: (await tx.admission.deleteMany({
          where: {
            tenantId,
            OR: [{ studentId: { in: studentIds } }, { programId: program.id }, { levelId: { in: levelIds } }],
          },
        })).count,
        admissionCampaigns: (await tx.admissionCampaign.deleteMany({
          where: { tenantId, OR: [{ programId: program.id }, { levelId: { in: levelIds } }] },
        })).count,
        juryAssignments: (await tx.juryAssignment.deleteMany({
          where: { tenantId, OR: [{ programId: program.id }, { levelId: { in: levelIds } }] },
        })).count,
        timetableSlots: (await tx.timetableSlot.deleteMany({
          where: {
            tenantId,
            OR: [
              { programId: program.id },
              { levelId: { in: levelIds } },
              { courseElementId: { in: courseElementIds } },
            ],
          },
        })).count,
        scheduledExams: (await tx.scheduledExam.deleteMany({ where: { tenantId, teachingUnitId: { in: teachingUnitIds } } })).count,
        feeStructures: (await tx.feeStructure.deleteMany({
          where: { tenantId, OR: [{ programId: program.id }, { levelId: { in: levelIds } }] },
        })).count,
        teachingServices: (await tx.teachingService.deleteMany({ where: { tenantId, courseElementId: { in: courseElementIds } } })).count,
        students: (await tx.student.deleteMany({ where: { id: { in: studentIds }, tenantId } })).count,
        portalUsers: (await tx.user.deleteMany({ where: { id: { in: userIds }, tenantId, role: 'ETUDIANT' } })).count,
      }
      await tx.program.delete({ where: { id: program.id } })
      await tx.auditLog.create({
        data: {
          tenantId,
          userId: user.id,
          action: 'PURGE_DEMO_DATA',
          entity: 'Program',
          entityId: program.id,
          details: JSON.stringify({ program: { name: program.name, code: program.code }, deleted }),
        },
      })
      return { program: { id: program.id, name: program.name, code: program.code }, deleted }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30_000 })
    return NextResponse.json({ data: result })
  } catch (error) {
    if (error instanceof PurgeRejected) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Validation DEV purge error:', error)
    return NextResponse.json({ error: 'La purge transactionnelle a échoué sans modifier partiellement les données.' }, { status: 500 })
  }
}

export const DELETE = withTenantAuth(handleDelete, [...ADMIN_ROLES])
