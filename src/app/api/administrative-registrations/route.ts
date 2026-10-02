import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'

const registrationSchema = z.object({
  studentId: z.string().cuid(),
  academicYearId: z.string().cuid(),
})

// Validation is an explicit administrative act. Never infer an annual
// enrollment from Student.status or copy the current program into past years.
async function handlePost(user: SessionUser, tenantId: string, request: NextRequest) {
  const parsed = registrationSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Étudiant et année académique requis.' }, { status: 400 })
  const { studentId, academicYearId } = parsed.data
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const registration = await db.$transaction(async tx => {
        const [student, year] = await Promise.all([
          tx.student.findFirst({ where: { id: studentId, tenantId }, select: {
            id: true, status: true, currentProgramId: true, currentLevelId: true,
          } }),
          tx.academicYear.findFirst({ where: { id: academicYearId, tenantId, isCurrent: true }, select: { id: true } }),
        ])
        if (!student) throw new Error('STUDENT_NOT_FOUND')
        if (!year) throw new Error('YEAR_NOT_CURRENT')
        if (student.status !== 'INSCRIT' || !student.currentProgramId || !student.currentLevelId) throw new Error('STUDENT_NOT_READY')
        const [program, level, existing] = await Promise.all([
          tx.program.findFirst({ where: { id: student.currentProgramId, tenantId, isActive: true }, select: { id: true } }),
          tx.level.findFirst({ where: { id: student.currentLevelId, programId: student.currentProgramId }, select: { id: true } }),
          tx.administrativeRegistration.findFirst({ where: { tenantId, studentId, academicYearId }, select: { id: true } }),
        ])
        if (!program || !level) throw new Error('PROGRAM_LEVEL_MISMATCH')
        if (existing) throw new Error('ALREADY_REGISTERED')
        const created = await tx.administrativeRegistration.create({ data: {
          tenantId, studentId, academicYearId, programId: program.id, levelId: level.id,
          status: 'INSCRIT',
        } })
        await tx.auditLog.create({ data: { tenantId, userId: user.id, action: 'CREATE', entity: 'AdministrativeRegistration', entityId: created.id,
          details: JSON.stringify({ studentId, academicYearId, programId: program.id, levelId: level.id, status: 'INSCRIT' }) } })
        return created
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
      return NextResponse.json({ registration }, { status: 201 })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034' && attempt < 2) continue
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return NextResponse.json({ error: 'Une inscription existe déjà pour cet étudiant et cette année.' }, { status: 409 })
      }
      if (error instanceof Error) {
        const failures: Record<string, [string, number]> = {
          STUDENT_NOT_FOUND: ['Étudiant introuvable dans cette institution.', 404],
          YEAR_NOT_CURRENT: ['Seule l’année académique courante peut être validée depuis ce dossier.', 409],
          STUDENT_NOT_READY: ['Le dossier doit être inscrit, avec un programme et un niveau, avant validation annuelle.', 409],
          PROGRAM_LEVEL_MISMATCH: ['Programme ou niveau inactif ou incohérent.', 409],
          ALREADY_REGISTERED: ['Une inscription existe déjà pour cet étudiant et cette année.', 409],
        }
        if (failures[error.message]) return NextResponse.json({ error: failures[error.message][0] }, { status: failures[error.message][1] })
      }
      console.error('Annual registration error:', error)
      return NextResponse.json({ error: 'Validation de l’inscription impossible.' }, { status: 500 })
    }
  }
  return NextResponse.json({ error: 'Conflit concurrent, réessayez.' }, { status: 409 })
}

export const POST = withTenantAuth(handlePost, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE'])
