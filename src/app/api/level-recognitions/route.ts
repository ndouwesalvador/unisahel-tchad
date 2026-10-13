import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'

const recognitionSchema = z.object({
  studentId: z.string().cuid(),
  levelId: z.string().cuid(),
  sourceInstitution: z.string().trim().min(2).max(180),
  sourceReference: z.string().trim().min(2).max(120),
  sourceAcademicYear: z.string().trim().regex(/^\d{4}-\d{4}$/),
  sourceAwardDate: z.coerce.date(),
  creditsAcquired: z.number().int().positive().max(300),
  average: z.number().min(0).max(20),
})

const revocationSchema = z.object({
  id: z.string().cuid(),
  action: z.literal('REVOKE'),
  reason: z.string().trim().min(10).max(500),
})

const studentSelect = {
  id: true,
  currentProgramId: true,
  currentLevelId: true,
  currentLevel: { select: { id: true, name: true, orderIndex: true } },
  currentProgram: {
    select: {
      id: true, name: true,
      levels: { where: { isActive: true }, orderBy: [{ orderIndex: 'asc' }, { id: 'asc' }], select: { id: true, name: true, orderIndex: true } },
    },
  },
} satisfies Prisma.StudentSelect

async function handleGet(_user: SessionUser, tenantId: string, request: NextRequest) {
  const studentId = request.nextUrl.searchParams.get('studentId')
  if (!studentId) return NextResponse.json({ error: 'Étudiant requis.' }, { status: 400 })
  const student = await db.student.findFirst({ where: { id: studentId, tenantId }, select: studentSelect })
  if (!student?.currentProgram || !student.currentLevel) {
    return NextResponse.json({ error: 'Le programme et le niveau courant de l’étudiant sont requis.' }, { status: 409 })
  }
  const recognitions = await db.priorLevelRecognition.findMany({
    where: { tenantId, studentId, programId: student.currentProgram.id },
    orderBy: { validatedAt: 'desc' },
    select: {
      id: true, levelId: true, sourceInstitution: true, sourceReference: true, sourceAcademicYear: true,
      sourceAwardDate: true, creditsAcquired: true, average: true, status: true, validatedAt: true,
      revocationReason: true, revokedAt: true,
    },
  })
  const recognitionByLevel = new Map<string, (typeof recognitions)[number]>()
  for (const recognition of recognitions) {
    if (!recognitionByLevel.has(recognition.levelId)) recognitionByLevel.set(recognition.levelId, recognition)
  }
  const priorLevels = student.currentProgram.levels
    .filter((level) => level.orderIndex < student.currentLevel!.orderIndex)
    .map((level) => ({ ...level, recognition: recognitionByLevel.get(level.id) ?? null }))

  return NextResponse.json({
    student: { id: student.id },
    program: { id: student.currentProgram.id, name: student.currentProgram.name },
    currentLevel: student.currentLevel,
    priorLevels,
  })
}

async function handlePost(user: SessionUser, tenantId: string, request: NextRequest) {
  const parsed = recognitionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Les preuves de validation antérieure sont incomplètes ou invalides.' }, { status: 400 })
  }
  const input = parsed.data
  const [student, registration, settings, existing] = await Promise.all([
    db.student.findFirst({ where: { id: input.studentId, tenantId }, select: studentSelect }),
    db.administrativeRegistration.findFirst({
      where: { tenantId, studentId: input.studentId, status: 'INSCRIT' },
      orderBy: { academicYear: { startDate: 'desc' } },
      select: { academicYear: { select: { startDate: true } } },
    }),
    db.tenantSettings.findUnique({ where: { tenantId }, select: { creditsPerYear: true, passingGrade: true } }),
    db.priorLevelRecognition.findFirst({ where: {
      tenantId, studentId: input.studentId, levelId: input.levelId, status: 'APPROVED',
    }, select: { id: true, status: true } }),
  ])
  if (!student?.currentProgram || !student.currentLevel) {
    return NextResponse.json({ error: 'Étudiant ou parcours courant introuvable.' }, { status: 404 })
  }
  const targetLevel = student.currentProgram.levels.find((level) => level.id === input.levelId)
  if (!targetLevel || targetLevel.orderIndex >= student.currentLevel.orderIndex) {
    return NextResponse.json({ error: 'Seul un niveau antérieur du programme courant peut être reconnu. Le niveau terminal reste soumis au jury.' }, { status: 409 })
  }
  if (!registration) {
    return NextResponse.json({ error: 'Une inscription administrative validée au niveau courant est requise.' }, { status: 409 })
  }
  if (input.sourceAwardDate >= registration.academicYear.startDate) {
    return NextResponse.json({ error: 'La date de validation antérieure doit précéder l’année d’inscription au niveau courant.' }, { status: 409 })
  }
  const creditsRequired = settings?.creditsPerYear ?? 60
  const passingGrade = settings?.passingGrade ?? 10
  if (input.creditsAcquired < creditsRequired || input.average < passingGrade) {
    return NextResponse.json({ error: `La reconnaissance doit justifier au moins ${creditsRequired} crédits et une moyenne de ${passingGrade}/20.` }, { status: 409 })
  }
  if (existing) {
    return NextResponse.json({ error: 'Une reconnaissance existe déjà pour cet étudiant et ce niveau.' }, { status: 409 })
  }

  try {
    const recognition = await db.$transaction(async (tx) => {
      const created = await tx.priorLevelRecognition.create({ data: {
        tenantId, studentId: student.id, programId: student.currentProgram!.id, levelId: targetLevel.id,
        sourceInstitution: input.sourceInstitution, sourceReference: input.sourceReference,
        sourceAcademicYear: input.sourceAcademicYear, sourceAwardDate: input.sourceAwardDate,
        creditsAcquired: input.creditsAcquired, average: input.average,
        status: 'APPROVED', validatedById: user.id,
      } })
      await tx.auditLog.create({ data: {
        tenantId, userId: user.id, action: 'APPROVE_EQUIVALENCE', entity: 'PriorLevelRecognition', entityId: created.id,
        details: JSON.stringify({
          studentId: student.id, programId: student.currentProgram!.id, levelId: targetLevel.id,
          sourceInstitution: input.sourceInstitution, sourceReference: input.sourceReference,
          sourceAcademicYear: input.sourceAcademicYear, sourceAwardDate: input.sourceAwardDate.toISOString(),
          creditsAcquired: input.creditsAcquired, average: input.average,
        }),
      } })
      return created
    })
    return NextResponse.json({ recognition }, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Une reconnaissance existe déjà pour cet étudiant et ce niveau.' }, { status: 409 })
    }
    // eslint-disable-next-line no-console
    console.error('Prior level recognition error:', error)
    return NextResponse.json({ error: 'Impossible d’enregistrer la reconnaissance du niveau antérieur.' }, { status: 500 })
  }
}

async function handlePut(user: SessionUser, tenantId: string, request: NextRequest) {
  const parsed = revocationSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Reconnaissance et motif de révocation requis.' }, { status: 400 })
  const existing = await db.priorLevelRecognition.findFirst({
    where: { id: parsed.data.id, tenantId, status: 'APPROVED' },
    select: { id: true, status: true },
  })
  if (!existing) return NextResponse.json({ error: 'Reconnaissance active introuvable.' }, { status: 404 })
  const revokedAt = new Date()
  const recognition = await db.$transaction(async (tx) => {
    const updated = await tx.priorLevelRecognition.update({
      where: { id: existing.id },
      data: {
        status: 'REVOKED', revokedById: user.id, revokedAt,
        revocationReason: parsed.data.reason,
      },
    })
    await tx.auditLog.create({ data: {
      tenantId, userId: user.id, action: 'REVOKE_EQUIVALENCE', entity: 'PriorLevelRecognition', entityId: existing.id,
      details: JSON.stringify({ reason: parsed.data.reason, revokedAt: revokedAt.toISOString() }),
    } })
    return updated
  })
  return NextResponse.json({ recognition })
}

export const GET = withTenantAuth(handleGet, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE'])
export const POST = withTenantAuth(handlePost, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE'])
export const PUT = withTenantAuth(handlePut, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE'])
