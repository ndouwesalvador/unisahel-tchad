import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { calculateFinalGrade, isValidGradingPolicy, resolveGradingPolicy } from '@/lib/grading-policy'
import { getJuryScope } from '@/lib/auth/jury-scope'

const componentSchema = z.object({
  academicYearId: z.string().cuid(),
  courseElementId: z.string().cuid(),
  studentId: z.string().cuid(),
  session: z.enum(['NORMALE', 'RATTRAPAGE']).default('NORMALE'),
  component: z.enum(['ccGrade', 'tpGrade', 'examGrade']),
  value: z.number().finite().min(0).max(20),
  reason: z.string().trim().max(500).optional(),
})
const lockSchema = z.object({ gradeId: z.string().cuid(), action: z.literal('LOCK') })

class EntryError extends Error {
  constructor(message: string, readonly status: number) { super(message) }
}

async function scope(user: SessionUser, tenantId: string) {
  if (user.role === 'ENSEIGNANT') {
    const teacher = await db.teacher.findFirst({ where: { userId: user.id, tenantId, isActive: true }, select: { id: true } })
    if (!teacher) throw new EntryError('Profil enseignant actif introuvable.', 403)
    return { teacherId: teacher.id, departmentId: null, levelIds: null as string[] | null }
  }
  const jury = await getJuryScope(user, tenantId)
  if (jury.levelIds.length === 0) throw new EntryError('Affectez d’abord ce jury à au moins un programme et un niveau pour l’année courante.', 403)
  return { teacherId: null, departmentId: jury.departmentIds.length === 1 ? jury.departmentIds[0] : null, levelIds: jury.levelIds }
}

async function year(tenantId: string, requestedId: string | null) {
  const found = await db.academicYear.findFirst({
    where: { tenantId, ...(requestedId ? { id: requestedId } : { isCurrent: true }) },
    select: { id: true, name: true },
  })
  if (!found) throw new EntryError('Année académique introuvable.', 404)
  return found
}

async function allowedCourseIds(tenantId: string, academicYearId: string, teacherId: string | null) {
  if (!teacherId) return null
  const services = await db.teachingService.findMany({
    where: { tenantId, academicYearId, teacherId, status: 'APPROVED' },
    select: { courseElementId: true },
  })
  return services.map((service) => service.courseElementId)
}

function errorResponse(error: unknown) {
  if (error instanceof EntryError) return NextResponse.json({ error: error.message }, { status: error.status })
  console.error('Grade entry error:', error)
  return NextResponse.json({ error: 'Saisie des notes indisponible.' }, { status: 500 })
}

async function handleGet(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const params = new URL(request.url).searchParams
    const selectedYear = await year(tenantId, params.get('academicYearId'))
    const allowed = await scope(user, tenantId)
    const serviceIds = await allowedCourseIds(tenantId, selectedYear.id, allowed.teacherId)
    const courses = await db.courseElement.findMany({
      where: {
        ...(serviceIds ? { id: { in: serviceIds } } : {}),
        teachingUnit: { semester: { level: { program: {
          tenantId, departmentId: { not: null },
          ...(allowed.departmentId ? { departmentId: allowed.departmentId } : {}),
        }, ...(allowed.levelIds ? { id: { in: allowed.levelIds } } : {}) } } },
      },
      select: {
        id: true, code: true, name: true, hoursTP: true,
        teachingUnit: { select: { id: true, code: true, name: true,
          semester: { select: { name: true, level: { select: { id: true, name: true, program: { select: { name: true } } } } } },
        } },
      },
      orderBy: { name: 'asc' },
    })
    const courseElementId = params.get('courseElementId')
    if (!courseElementId) return NextResponse.json({ data: { academicYear: selectedYear, courses, students: [] } })
    const course = courses.find((item) => item.id === courseElementId)
    if (!course) throw new EntryError('Matière hors de votre périmètre.', 403)
    const session = params.get('session') === 'RATTRAPAGE' ? 'RATTRAPAGE' : 'NORMALE'
    // The annual registration is the authoritative class roster. Pedagogical
    // UE registrations remain useful for optional choices and history, but a
    // student validated in this level must be immediately visible to the
    // teacher of every course in that level.
    const registrations = await db.student.findMany({
      where: { tenantId, OR: [
        { currentLevelId: course.teachingUnit.semester.level.id },
        { registrations: { some: {
          tenantId, academicYearId: selectedYear.id, status: 'INSCRIT',
          levelId: course.teachingUnit.semester.level.id,
        } } },
      ] },
      select: { id: true, matricule: true, firstName: true, lastName: true },
      orderBy: { lastName: 'asc' },
    })
    const studentIds = registrations.map((student) => student.id)
    const grades = await db.grade.findMany({
      where: { studentId: { in: studentIds }, courseElementId, academicYearId: selectedYear.id, session },
      select: { id: true, studentId: true, ccGrade: true, tpGrade: true, examGrade: true,
        finalGrade: true, isLocked: true },
    })
    return NextResponse.json({ data: {
      academicYear: selectedYear, courses,
      students: registrations.map((student) => ({ ...student,
        grade: grades.find((grade) => grade.studentId === student.id) ?? null,
      })),
    } })
  } catch (error) { return errorResponse(error) }
}

async function handlePost(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const raw: unknown = await request.json().catch(() => null)
    if (user.role === 'JURY' && lockSchema.safeParse(raw).success) {
      const { gradeId } = lockSchema.parse(raw)
      const allowed = await scope(user, tenantId)
      const grade = await db.grade.findFirst({ where: { id: gradeId, student: { tenantId },
        teachingUnit: { semester: { level: { id: { in: allowed.levelIds ?? [] }, program: { tenantId,
          ...(allowed.departmentId ? { departmentId: allowed.departmentId } : {}),
        } } } },
      }, select: { id: true, finalGrade: true, isLocked: true, academicYearId: true,
        ccGrade: true, tpGrade: true, examGrade: true, courseElement: { select: { hoursTP: true } } } })
      if (!grade) throw new EntryError('Note hors du département du jury.', 403)
      if (grade.finalGrade === null || grade.ccGrade === null || grade.examGrade === null ||
          (grade.courseElement && grade.courseElement.hoursTP > 0 && grade.tpGrade === null)) {
        throw new EntryError('Contrôle, examen et TP éventuel doivent être saisis avant validation.', 409)
      }
      if (grade.isLocked) return NextResponse.json({ data: grade })
      const locked = await db.deliberation.findFirst({ where: { tenantId, academicYearId: grade.academicYearId,
        departmentId: allowed.departmentId!, isLocked: true }, select: { id: true } })
      if (locked) throw new EntryError('Le PV du département est déjà verrouillé.', 409)
      const result = await db.grade.updateMany({ where: { id: gradeId, isLocked: false, finalGrade: { not: null } },
        data: { isLocked: true, lockedBy: user.id, validatedBy: user.id } })
      if (result.count !== 1) throw new EntryError('La note a changé ; actualisez la page.', 409)
      await db.auditLog.create({ data: { tenantId, userId: user.id, action: 'VALIDATE', entity: 'Grade', entityId: gradeId } })
      return NextResponse.json({ data: { gradeId, isLocked: true } })
    }
    const parsed = componentSchema.safeParse(raw)
    if (!parsed.success) throw new EntryError('Saisie invalide : matière, étudiant, composante et note de 0 à 20 requis.', 400)
    const input = parsed.data
    if (user.role === 'ENSEIGNANT' && input.component === 'examGrade') throw new EntryError('La note d’examen est réservée au jury.', 403)
    const allowed = await scope(user, tenantId)
    await year(tenantId, input.academicYearId)
    const serviceIds = await allowedCourseIds(tenantId, input.academicYearId, allowed.teacherId)
    if (serviceIds && !serviceIds.includes(input.courseElementId)) throw new EntryError('Service annuel non approuvé pour cette matière.', 403)
    const course = await db.courseElement.findFirst({ where: {
      id: input.courseElementId,
      teachingUnit: { semester: { level: { ...(allowed.levelIds ? { id: { in: allowed.levelIds } } : {}), program: { tenantId,
        ...(allowed.departmentId ? { departmentId: allowed.departmentId } : {}),
      } } } },
    }, select: { teachingUnitId: true, hoursTP: true, hoursStage: true, teachingUnit: { select: {
      semester: { select: { levelId: true, level: { select: { programId: true, program: { select: { departmentId: true } } } } } },
    } } } })
    if (!course) throw new EntryError('Matière hors de votre périmètre.', 403)
    if (!course.teachingUnit.semester.level.program.departmentId) {
      throw new EntryError('Rattachez le programme à un département avant la saisie.', 409)
    }
    if (input.component === 'tpGrade' && course.hoursTP <= 0) throw new EntryError('Cette matière ne comporte pas de TP.', 409)
    const studentEnrollment = await db.student.findFirst({ where: {
      id: input.studentId,
      tenantId,
      OR: [
        { currentLevelId: course.teachingUnit.semester.levelId },
        { registrations: { some: {
          tenantId, academicYearId: input.academicYearId, status: 'INSCRIT',
          programId: course.teachingUnit.semester.level.programId,
          levelId: course.teachingUnit.semester.levelId,
        } } },
      ],
    }, select: { id: true } })
    if (!studentEnrollment) throw new EntryError('Étudiant hors du niveau de cette matière.', 403)
    const settings = await db.tenantSettings.findUnique({ where: { tenantId } })
    const policy = resolveGradingPolicy(settings)
    const applicablePolicy = { ...policy, tpWeight: course.hoursTP > 0 ? policy.tpWeight : 0,
      stageWeight: course.hoursStage > 0 ? policy.stageWeight : 0 }
    if (!isValidGradingPolicy(applicablePolicy)) throw new EntryError('Coefficients de notation invalides pour cette matière.', 409)
    const result = await db.$transaction(async (tx) => {
      // Serialize edits to this student's grade, including the first component.
      const key = `${input.studentId}:${input.courseElementId}:${input.academicYearId}:${input.session}`
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))::text`
      const rows = await tx.grade.findMany({ where: { studentId: input.studentId,
        courseElementId: input.courseElementId, academicYearId: input.academicYearId, session: input.session } })
      if (rows.length > 1) throw new EntryError('Plusieurs fiches de notes existent : régularisation requise.', 409)
      const existing = rows[0]
      const previous = existing?.[input.component] ?? null
      if (user.role === 'ENSEIGNANT' && previous !== null && previous === input.value) return existing
      if (user.role === 'JURY' && input.component !== 'examGrade' && previous === null) {
        throw new EntryError('Le jury peut corriger une note de contrôle ou de TP existante, mais sa première saisie revient à l’enseignant.', 403)
      }
      if (user.role === 'ENSEIGNANT' && (previous !== null || existing?.isLocked)) {
        throw new EntryError('Cette composante a déjà été saisie ou validée. Seul le jury peut la corriger.', 409)
      }
      if (user.role === 'JURY' && previous !== null && (!input.reason || input.reason.length < 10)) {
        throw new EntryError('Une correction du jury exige un motif d’au moins 10 caractères.', 400)
      }
      if (user.role === 'JURY' && previous !== null && previous === input.value) {
        throw new EntryError('La nouvelle note doit être différente de l’ancienne.', 409)
      }
      const departmentId = course.teachingUnit.semester.level.program.departmentId
      const lockedPv = departmentId ? await tx.deliberation.findFirst({ where: { tenantId,
        academicYearId: input.academicYearId, departmentId, isLocked: true,
      }, select: { id: true } }) : null
      if (lockedPv) throw new EntryError('Le PV de ce département est verrouillé : saisie suspendue.', 409)
      const components = { ccGrade: existing?.ccGrade ?? null, tpGrade: existing?.tpGrade ?? null,
        examGrade: existing?.examGrade ?? null, stageGrade: existing?.stageGrade ?? null,
        isAbsent: existing?.isAbsent ?? false, isDefaillant: existing?.isDefaillant ?? false,
        [input.component]: input.value }
      const finalGrade = calculateFinalGrade(components, applicablePolicy)
      const saved = existing
        ? await tx.grade.update({ where: { id: existing.id }, data: { [input.component]: input.value,
          finalGrade, isLocked: false, lockedBy: null, validatedBy: null } })
        : await tx.grade.create({ data: { studentId: input.studentId, teachingUnitId: course.teachingUnitId,
          courseElementId: input.courseElementId, academicYearId: input.academicYearId,
          session: input.session, [input.component]: input.value, finalGrade, enteredBy: user.id } })
      await tx.gradeChangeLog.create({ data: { gradeId: saved.id, field: input.component,
        oldValue: previous === null ? null : String(previous), newValue: String(input.value),
        reason: previous === null ? (user.role === 'JURY' ? 'Première saisie par le jury' : 'Première saisie par l’enseignant') : input.reason!,
        changedBy: user.id } })
      await tx.auditLog.create({ data: { tenantId, userId: user.id,
        action: previous === null ? 'CREATE_COMPONENT' : 'CORRECT_COMPONENT', entity: 'Grade', entityId: saved.id,
        details: JSON.stringify({ academicYearId: input.academicYearId, courseElementId: input.courseElementId,
          studentId: input.studentId, component: input.component, oldValue: previous, newValue: input.value,
          reason: previous === null ? null : input.reason }) } })
      return saved
    })
    return NextResponse.json({ data: result })
  } catch (error) { return errorResponse(error) }
}

export const GET = withTenantAuth(handleGet, ['ENSEIGNANT', 'JURY'])
export const POST = withTenantAuth(handlePost, ['ENSEIGNANT', 'JURY'])
