import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { isStudentSelfRole } from '@/lib/auth/student-scope'
import { studentQuerySchema, createStudentSchema, updateStudentSchema, validateQuery, validateBody, formatZodError } from '@/lib/validations/api'
import { Prisma } from '@prisma/client'
import { createStudentPortalCredentials } from '@/lib/student-portal'
import { prepareDocumentPhoto } from '@/lib/pdf/artwork'
import { getTeacherScope } from '@/lib/auth/teacher-scope'
import { getOrganizationScope } from '@/lib/auth/organization-scope'
import { getJuryScope } from '@/lib/auth/jury-scope'

// Credits are awarded by a finalized jury, not by the mutable Student cache.
// A second session in the same year may replace the first decision; count the
// best validated credit total for that year only once.
async function validatedCreditsByStudent(tenantId: string, studentIds: string[], academicYearId?: string) {
  const totals = new Map<string, number>()
  if (studentIds.length === 0) return totals
  const decisions = await db.deliberationDecision.findMany({
    where: {
      studentId: { in: studentIds },
      deliberation: { tenantId, isLocked: true, status: 'TERMINEE', ...(academicYearId ? { academicYearId } : {}) },
    },
    select: { studentId: true, creditsAcquired: true, deliberation: { select: { academicYearId: true } } },
  })
  const yearly = new Map<string, number>()
  for (const decision of decisions) {
    const key = `${decision.studentId}:${decision.deliberation.academicYearId}`
    yearly.set(key, Math.max(yearly.get(key) ?? 0, decision.creditsAcquired))
  }
  for (const [key, credits] of yearly) {
    const studentId = key.split(':', 1)[0]
    totals.set(studentId, (totals.get(studentId) ?? 0) + credits)
  }
  return totals
}

async function getStudentsHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const validatedQuery = validateQuery(studentQuerySchema, searchParams)

    const { search, status, programId, levelId, page, limit } = validatedQuery
    const skip = (page - 1) * limit

    const where: Prisma.StudentWhereInput = {
      tenantId,
    }

    if (user.role === 'DEPARTEMENT') {
      const scope = await getOrganizationScope(user, tenantId)
      where.currentProgram = { departmentId: { in: scope?.departmentIds ?? [] } }
    } else if (user.role === 'ENSEIGNANT') {
      const scope = await getTeacherScope(user, tenantId)
      where.pedagogicalRegistrations = { some: { teachingUnitId: { in: scope.teachingUnitIds }, status: 'ACTIVE' } }
    } else if (user.role === 'JURY') {
      const scope = await getJuryScope(user, tenantId)
      where.AND = [{ OR: [
        { currentLevelId: { in: scope.levelIds } },
        { registrations: { some: { tenantId, academicYearId: scope.academicYearId,
          status: 'INSCRIT', levelId: { in: scope.levelIds } } } },
      ] }]
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { middleName: { contains: search, mode: 'insensitive' } },
        { matricule: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (programId) {
      where.currentProgramId = programId
    }

    if (levelId) {
      where.currentLevelId = levelId
    }

    const [students, total, maleCount, femaleCount, preRegisteredCount] = await Promise.all([
      db.student.findMany({
        where,
        // Portraits are stored for official documents, not transported with
        // a potentially 1 000-row administrative roster.
        omit: { photo: true },
        include: {
          currentProgram: {
            select: { id: true, name: true, code: true },
          },
          currentLevel: {
            select: { id: true, name: true, code: true },
          },
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip,
        take: limit,
      }),
      db.student.count({ where }),
      db.student.count({ where: { AND: [where, { gender: 'M' }] } }),
      db.student.count({ where: { AND: [where, { gender: 'F' }] } }),
      db.student.count({ where: { AND: [where, { status: 'PRE_INSCRIT' }] } }),
    ])
    const creditsByStudent = await validatedCreditsByStudent(tenantId, students.map((student) => student.id))

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      data: students.map((student) => ({ ...student, totalCreditsAcquired: creditsByStudent.get(student.id) ?? 0 })),
      stats: { total, maleCount, femaleCount, preRegisteredCount },
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
    console.error('Students API error:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Paramètres de recherche invalides', details: formatZodError(error as Parameters<typeof formatZodError>[0]) },
        { status: 400 },
      )
    }
    return NextResponse.json(
      {
        error: 'Failed to fetch students',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

async function createStudentHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const validatedBody = validateBody(createStudentSchema, body)
    if (validatedBody.photo) {
      const photo = await prepareDocumentPhoto(validatedBody.photo)
      if (!photo) return NextResponse.json({ error: 'Photo invalide ou trop volumineuse.' }, { status: 400 })
      validatedBody.photo = photo
    }

    // A level must belong to the selected active program, not merely to the tenant.
    const [level, program] = await Promise.all([
      db.level.findFirst({ where: { id: validatedBody.currentLevelId, programId: validatedBody.currentProgramId, isActive: true, program: { tenantId } } }),
      db.program.findFirst({ where: { id: validatedBody.currentProgramId, tenantId, isActive: true } }),
    ])

    if (!level || !program) {
      return NextResponse.json(
        { error: 'Filière ou niveau inactif, introuvable ou incohérent.' },
        { status: 400 }
      )
    }

    const settings = await db.tenantSettings.findUnique({ where: { tenantId }, select: { matriculePrefix: true } })
    const stem = `${settings?.matriculePrefix || 'UNSH'}-${new Date().getFullYear()}-${level.code || 'N'}-`
    const credentials = await createStudentPortalCredentials()

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const result = await db.$transaction(async (tx) => {
          let matricule = validatedBody.matricule
          if (!matricule) {
            // Matricule and portal login are globally unique. A count scoped to
            // one level can reuse a number already taken by another program.
            const [students, accounts] = await Promise.all([
              tx.student.findMany({ where: { matricule: { startsWith: stem } }, select: { matricule: true } }),
              tx.user.findMany({ where: { login: { startsWith: stem } }, select: { login: true } }),
            ])
            let maximum = 0
            for (const value of [...students.map((item) => item.matricule), ...accounts.map((item) => item.login)]) {
              const suffix = value?.slice(stem.length) || ''
              if (/^\d{6}$/.test(suffix)) maximum = Math.max(maximum, Number(suffix))
            }
            const next = maximum + 1
            if (next > 999999) throw new Error('MATRICULE_EXHAUSTED')
            matricule = `${stem}${String(next).padStart(6, '0')}`
          }

          const [takenStudent, takenLogin, takenEmail] = await Promise.all([
            tx.student.findFirst({ where: { matricule }, select: { id: true } }),
            tx.user.findUnique({ where: { login: matricule }, select: { id: true } }),
            validatedBody.email ? tx.student.findFirst({ where: { tenantId, email: validatedBody.email }, select: { id: true } }) : null,
          ])
          if (takenStudent || takenLogin) throw new Error('MATRICULE_TAKEN')
          if (takenEmail) throw new Error('EMAIL_TAKEN')

          const student = await tx.student.create({
            data: { ...validatedBody, matricule, tenantId, dateOfBirth: new Date(validatedBody.dateOfBirth) },
            include: {
              currentProgram: { select: { id: true, name: true, code: true } },
              currentLevel: { select: { id: true, name: true, code: true } },
            },
          })
          const account = await tx.user.create({ data: {
            tenantId, login: matricule, pinHash: credentials.pinHash,
            firstName: student.firstName, lastName: student.lastName, role: 'ETUDIANT',
          } })
          await tx.student.update({ where: { id: student.id }, data: { userId: account.id } })
          await tx.auditLog.create({ data: {
            tenantId, userId: user.id, action: 'CREATE', entity: 'Student', entityId: student.id,
            details: JSON.stringify({ matricule }),
          } })
          return { student: { ...student, userId: account.id }, portalAccount: { login: matricule, pin: credentials.pin } }
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
        return NextResponse.json({ data: result.student, portalAccount: result.portalAccount }, { status: 201 })
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError &&
            (error.code === 'P2034' || (error.code === 'P2002' && !validatedBody.matricule)) && attempt < 4) continue
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          return NextResponse.json({ error: 'Matricule ou compte étudiant déjà utilisé.' }, { status: 409 })
        }
        if (error instanceof Error && error.message === 'MATRICULE_TAKEN') {
          return NextResponse.json({ error: 'Ce matricule est déjà utilisé.' }, { status: 409 })
        }
        if (error instanceof Error && error.message === 'EMAIL_TAKEN') {
          return NextResponse.json({ error: 'Cette adresse e-mail est déjà utilisée par un étudiant.' }, { status: 409 })
        }
        if (error instanceof Error && error.message === 'MATRICULE_EXHAUSTED') {
          return NextResponse.json({ error: 'La série des matricules est épuisée.' }, { status: 409 })
        }
        throw error
      }
    }
    return NextResponse.json({ error: 'Conflit de création concurrente, réessayez.' }, { status: 409 })
  } catch (error) {
    console.error('Create student error:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodError(error as any) },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create student', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function updateStudentHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()

    if (request.nextUrl.searchParams.get('action') === 'reset-pin') {
      const id = typeof body?.id === 'string' ? body.id : ''
      if (!id) {
        return NextResponse.json({ error: 'L’identifiant de l’étudiant est requis.' }, { status: 400 })
      }

      const existing = await db.student.findFirst({
        where: { id, tenantId },
        select: {
          id: true,
          userId: true,
          matricule: true,
          firstName: true,
          lastName: true,
          user: { select: { id: true, tenantId: true, role: true } },
        },
      })
      if (!existing) {
        return NextResponse.json({ error: 'Étudiant introuvable.' }, { status: 404 })
      }
      if (!existing.matricule) {
        return NextResponse.json({ error: 'Un matricule est requis avant de créer un accès étudiant.' }, { status: 409 })
      }
      const matricule = existing.matricule
      if (existing.user && (existing.user.tenantId !== tenantId || existing.user.role !== 'ETUDIANT')) {
        return NextResponse.json({ error: 'Le compte lié est incohérent. Contactez l’administrateur de la plateforme.' }, { status: 409 })
      }

      const credentials = await createStudentPortalCredentials()
      try {
        const account = await db.$transaction(async (tx) => {
          if (existing.userId) {
            return tx.user.update({
              where: { id: existing.userId },
              data: {
                tenantId,
                login: matricule,
                pinHash: credentials.pinHash,
                firstName: existing.firstName,
                lastName: existing.lastName,
                isActive: true,
                mustChangePassword: false,
              },
              select: { id: true },
            })
          }

          const loginTaken = await tx.user.findUnique({ where: { login: matricule }, select: { id: true } })
          if (loginTaken) throw new Error('LOGIN_TAKEN')
          const created = await tx.user.create({
            data: {
              tenantId,
              login: matricule,
              pinHash: credentials.pinHash,
              firstName: existing.firstName,
              lastName: existing.lastName,
              role: 'ETUDIANT',
              isActive: true,
              mustChangePassword: false,
            },
            select: { id: true },
          })
          await tx.student.update({ where: { id: existing.id }, data: { userId: created.id } })
          return created
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })

        await db.auditLog.create({
          data: {
            tenantId,
            userId: user.id,
            action: 'UPDATE',
            entity: 'Student',
            entityId: existing.id,
            details: JSON.stringify({ matricule, portalPinReset: true }),
          },
        })

        return NextResponse.json({
          data: { id: existing.id, userId: account.id },
          portalAccount: { login: matricule, pin: credentials.pin },
        })
      } catch (error) {
        if ((error instanceof Error && error.message === 'LOGIN_TAKEN') ||
            (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) {
          return NextResponse.json({ error: 'Ce matricule est déjà utilisé par un autre compte.' }, { status: 409 })
        }
        throw error
      }
    }

    const validatedBody = validateBody(updateStudentSchema, body)
    const { id, ...data } = validatedBody
    if (data.photo) {
      const photo = await prepareDocumentPhoto(data.photo)
      if (!photo) return NextResponse.json({ error: 'Photo invalide ou trop volumineuse.' }, { status: 400 })
      data.photo = photo
    }

    // Verify student belongs to tenant
    const existing = await db.student.findFirst({ where: { id, tenantId } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Étudiant introuvable.' },
        { status: 404 }
      )
    }

    // Check email uniqueness if changed
    if (data.email && data.email !== existing.email) {
      const existingEmail = await db.student.findFirst({ where: { email: data.email, tenantId, NOT: { id } } })
      if (existingEmail) {
        return NextResponse.json(
          { error: 'Cette adresse e-mail est déjà utilisée.' },
          { status: 409 }
        )
      }
    }

    // Check matricule uniqueness if changed
    if (data.matricule && data.matricule !== existing.matricule) {
      const existingMatricule = await db.student.findFirst({ where: { matricule: data.matricule, tenantId, NOT: { id } } })
      if (existingMatricule) {
        return NextResponse.json(
          { error: 'Ce matricule est déjà utilisé.' },
          { status: 409 }
        )
      }
    }

    // Verify level and program belong to tenant if changed
    if (data.currentLevelId || data.currentProgramId) {
      const levelId = data.currentLevelId || existing.currentLevelId || ''
      const programId = data.currentProgramId || existing.currentProgramId || ''
      const [level, program] = await Promise.all([
        db.level.findFirst({ where: { id: levelId, programId, isActive: true, program: { tenantId, isActive: true } } }),
        db.program.findFirst({ where: { id: programId, tenantId, isActive: true } }),
      ])
      if (!level || !program) {
        return NextResponse.json(
          { error: 'La filière ou le niveau sélectionné est invalide pour cette institution.' },
          { status: 400 }
        )
      }
    }

    const student = await db.student.update({
      where: { id },
      data: {
        ...data,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      },
      include: {
        currentProgram: { select: { id: true, name: true, code: true } },
        currentLevel: { select: { id: true, name: true, code: true } },
      },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: 'UPDATE',
        entity: 'Student',
        entityId: student.id,
        details: JSON.stringify({ matricule: student.matricule }),
      },
    })

    return NextResponse.json({ data: student })
  } catch (error) {
    console.error('Update student error:', error)
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Données invalides', details: formatZodError(error as any) },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Impossible de mettre à jour l’étudiant', details: error instanceof Error ? error.message : 'Erreur inconnue' },
      { status: 500 }
    )
  }
}

async function deleteStudentHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      )
    }

    // Verify student belongs to tenant
    const existing = await db.student.findFirst({ where: { id, tenantId } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Soft delete - change status to SUSPENDU
    const student = await db.student.update({
      where: { id },
      data: { status: 'SUSPENDU' },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: 'DELETE',
        entity: 'Student',
        entityId: student.id,
        details: JSON.stringify({ matricule: student.matricule }),
      },
    })

    return NextResponse.json({ data: { id: student.id, status: student.status } })
  } catch (error) {
    console.error('Delete student error:', error)
    return NextResponse.json(
      { error: 'Failed to delete student', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function getStudentDetailHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      )
    }

    const scopeFilter = user.role === 'DEPARTEMENT'
      ? { currentProgram: { departmentId: { in: (await getOrganizationScope(user, tenantId))?.departmentIds ?? [] } } }
      : user.role === 'ENSEIGNANT'
        ? { pedagogicalRegistrations: { some: { teachingUnitId: { in: (await getTeacherScope(user, tenantId)).teachingUnitIds }, status: 'ACTIVE' } } }
        : {}
    const student = await db.student.findFirst({
      where: { id, tenantId, ...scopeFilter },
      include: {
        currentProgram: {
          select: { id: true, name: true, code: true, cycle: true, department: { select: { name: true } } },
        },
        currentLevel: {
          select: { id: true, name: true, code: true },
        },
        tenant: {
          select: { name: true, shortName: true, logo: true },
        },
        registrations: {
          include: { academicYear: { select: { name: true } } },
          orderBy: { registrationDate: 'desc' },
        },
      },
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // AdministrativeRegistration.programId/levelId are bare scalars (no FK) --
    // resolve their names with a manual lookup, same pattern used for Deliberation.
    const programIds = [...new Set(student.registrations.map((r) => r.programId))]
    const levelIds = [...new Set(student.registrations.map((r) => r.levelId))]
    const [programs, levels] = await Promise.all([
      db.program.findMany({ where: { id: { in: programIds } }, select: { id: true, name: true } }),
      db.level.findMany({ where: { id: { in: levelIds } }, select: { id: true, name: true } }),
    ])
    const programById = new Map(programs.map((p) => [p.id, p.name]))
    const levelById = new Map(levels.map((l) => [l.id, l.name]))

    const registrations = student.registrations.map((r) => ({
      id: r.id,
      academicYearId: r.academicYearId,
      academicYear: r.academicYear.name,
      program: programById.get(r.programId) || '—',
      level: levelById.get(r.levelId) || '—',
      status: r.status,
      registrationDate: r.registrationDate,
    }))

    const creditsByStudent = await validatedCreditsByStudent(tenantId, [student.id])
    return NextResponse.json({ data: { ...student, totalCreditsAcquired: creditsByStudent.get(student.id) ?? 0, registrations } })
  } catch (error) {
    console.error('Get student detail error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch student', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function getStudentTranscriptHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      )
    }

    const scopeFilter = user.role === 'DEPARTEMENT'
      ? { currentProgram: { departmentId: { in: (await getOrganizationScope(user, tenantId))?.departmentIds ?? [] } } }
      : user.role === 'ENSEIGNANT'
        ? { pedagogicalRegistrations: { some: { teachingUnitId: { in: (await getTeacherScope(user, tenantId)).teachingUnitIds }, status: 'ACTIVE' } } }
        : {}
    const student = await db.student.findFirst({
      where: { id, tenantId, ...scopeFilter },
      include: {
        currentProgram: {
          select: { id: true, name: true, code: true, cycle: true, duration: true },
        },
        currentLevel: {
          select: { id: true, name: true, code: true },
        },
        tenant: {
          select: { name: true, shortName: true, logo: true, rectorName: true, rectorTitle: true },
        },
      },
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    const requestedYearId = searchParams.get('academicYearId')
    const academicYear = await db.academicYear.findFirst({
      where: requestedYearId ? { id: requestedYearId, tenantId } : { tenantId, isCurrent: true },
      select: { id: true, name: true },
    })
    if (requestedYearId && !academicYear) {
      return NextResponse.json({ error: 'Année académique introuvable' }, { status: 404 })
    }
    const annualRegistration = academicYear ? await db.administrativeRegistration.findFirst({
      where: { tenantId, studentId: id, academicYearId: academicYear.id, status: 'INSCRIT' },
      select: { id: true, programId: true, levelId: true },
    }) : null

    // This is an annual published-grade preview, not a dump of historical drafts.
    const grades = annualRegistration && academicYear ? await db.grade.findMany({
      where: { studentId: id, student: { tenantId }, academicYearId: academicYear.id, session: 'NORMALE', isLocked: true,
        teachingUnit: { semester: { levelId: annualRegistration.levelId,
          level: { programId: annualRegistration.programId, program: { tenantId } } } } },
      include: {
        teachingUnit: {
          select: {
            id: true,
            code: true,
            name: true,
            credits: true,
            type: true,
            compensable: true,
            semester: {
              select: {
                id: true,
                name: true,
                code: true,
                level: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                    program: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
        courseElement: {
          select: {
            id: true,
            code: true,
            name: true,
            coefficient: true,
            hoursCM: true,
            hoursTD: true,
            hoursTP: true,
            teacher: {
              select: {
                id: true,
                grade: true,
                specialization: true,
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
      orderBy: [
        { teachingUnit: { semester: { level: { orderIndex: 'asc' } } } },
        { teachingUnit: { semester: { orderIndex: 'asc' } } },
        { teachingUnit: { orderIndex: 'asc' } },
        { courseElement: { orderIndex: 'asc' } },
      ],
    }) : []

    // Group by semester and teaching unit
    const groupedGrades: Record<string, { semester: any; teachingUnits: Record<string, { teachingUnit: any; grades: any[] }> }> = {}

    for (const grade of grades) {
      const semesterKey = grade.teachingUnit?.semester?.id || 'unknown'
      const ueKey = grade.teachingUnit?.id || 'unknown'

      if (!groupedGrades[semesterKey]) {
        groupedGrades[semesterKey] = {
          semester: grade.teachingUnit?.semester || null,
          teachingUnits: {},
        }
      }

      if (!groupedGrades[semesterKey].teachingUnits[ueKey]) {
        groupedGrades[semesterKey].teachingUnits[ueKey] = {
          teachingUnit: grade.teachingUnit
            ? {
                id: grade.teachingUnit.id,
                code: grade.teachingUnit.code,
                name: grade.teachingUnit.name,
                credits: grade.teachingUnit.credits,
                type: grade.teachingUnit.type,
                compensable: grade.teachingUnit.compensable,
              }
            : null,
          grades: [],
        }
      }

      groupedGrades[semesterKey].teachingUnits[ueKey].grades.push({
        id: grade.id,
        courseElement: grade.courseElement,
        ccGrade: grade.ccGrade,
        examGrade: grade.examGrade,
        tpGrade: grade.tpGrade,
        stageGrade: grade.stageGrade,
        oralGrade: grade.oralGrade,
        memoireGrade: grade.memoireGrade,
        projectGrade: grade.projectGrade,
        finalGrade: grade.finalGrade,
        isAbsent: grade.isAbsent,
        isJustified: grade.isJustified,
        isDefaillant: grade.isDefaillant,
        isLocked: grade.isLocked,
        session: grade.session,
        comment: grade.comment,
      })
    }

    const structuredGrades = Object.values(groupedGrades).map((semData) => ({
      semester: semData.semester,
      teachingUnits: Object.values(semData.teachingUnits),
    }))

    // Calculate stats
    const totalGrades = grades.length
    const validatedGrades = grades.filter((g) => g.finalGrade !== null && g.finalGrade >= 10).length
    const averageFinalGrade =
      grades.length > 0
        ? grades
            .filter((g) => g.finalGrade !== null)
            .reduce((sum, g) => sum + (g.finalGrade || 0), 0) /
          Math.max(grades.filter((g) => g.finalGrade !== null).length, 1)
        : 0

    // The transcript and the official PV must expose the same final jury
    // outcome. Restrict the lookup to the exact annual cohort so a decision
    // from another programme or level can never leak into this transcript.
    const finalizedJuryDecision = annualRegistration && academicYear
      ? (await db.deliberationDecision.findMany({
          where: {
            studentId: id,
            deliberation: {
              tenantId,
              academicYearId: academicYear.id,
              programId: annualRegistration.programId,
              levelId: annualRegistration.levelId,
              status: 'TERMINEE',
              isLocked: true,
            },
          },
          select: {
            average: true,
            creditsAcquired: true,
            decision: true,
            deliberation: { select: { date: true } },
          },
          orderBy: { deliberation: { date: 'desc' } },
          take: 1,
        }))[0] ?? null
      : null
    const summary = {
      totalGrades,
      validatedGrades,
      failedGrades: totalGrades - validatedGrades,
      averageFinalGrade: Math.round((finalizedJuryDecision?.average ?? averageFinalGrade) * 100) / 100,
      totalCreditsAcquired: finalizedJuryDecision?.creditsAcquired ?? 0,
      juryDecision: finalizedJuryDecision ? {
        decision: finalizedJuryDecision.decision,
        average: finalizedJuryDecision.average,
        creditsAcquired: finalizedJuryDecision.creditsAcquired,
        date: finalizedJuryDecision.deliberation.date,
      } : null,
    }

    return NextResponse.json({
      data: { student, grades: structuredGrades, summary, academicYear, isEnrolledForYear: Boolean(annualRegistration) },
    })
  } catch (error) {
    console.error('Get student transcript error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transcript', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// No student-facing UI ever browses another student's record (roster, detail,
// or transcript) -- block student-tier accounts from all three up front.
export const GET = withTenantAuth(async (user: SessionUser, tenantId: string, request: NextRequest) => {
  if (isStudentSelfRole(user.role)) {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Accès refusé' }, { status: 403 })
  }
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const transcript = searchParams.get('transcript')

  if (id && transcript === 'true') {
    return getStudentTranscriptHandler(user, tenantId, request)
  }
  if (id) {
    return getStudentDetailHandler(user, tenantId, request)
  }
  return getStudentsHandler(user, tenantId, request)
})

export const POST = withTenantAuth(createStudentHandler, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE'])

export const PUT = withTenantAuth(updateStudentHandler, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE'])

export const DELETE = withTenantAuth(deleteStudentHandler, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE'])
