import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { getTeacherScope } from '@/lib/auth/teacher-scope'

const STATUSES = ['PRESENT', 'ABSENT', 'JUSTIFIED', 'LATE']

async function handleGet(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const courseElementId = request.nextUrl.searchParams.get('courseElementId')
    const academicYearId = request.nextUrl.searchParams.get('academicYearId')
    const scope = user.role === 'ENSEIGNANT' ? await getTeacherScope(user, tenantId, academicYearId) : null
    if (scope && courseElementId && !scope.courseElementIds.includes(courseElementId)) {
      return NextResponse.json({ error: 'Matière non attribuée' }, { status: 403 })
    }
    const where = {
      tenantId,
      ...(scope ? { teacherId: scope.teacherId ?? '', courseElementId: { in: scope.courseElementIds } } : {}),
      ...(courseElementId ? { courseElementId } : {}),
      ...((academicYearId || scope?.academicYearId) ? { academicYearId: academicYearId || scope?.academicYearId } : {}),
    }
    const [records, present, absent, justified, late, pendingJustifications] = await Promise.all([
      db.attendance.findMany({ where, orderBy: { date: 'desc' }, take: 200 }),
      db.attendance.count({ where: { ...where, status: 'PRESENT' } }),
      db.attendance.count({ where: { ...where, status: 'ABSENT' } }),
      db.attendance.count({ where: { ...where, status: 'JUSTIFIED' } }),
      db.attendance.count({ where: { ...where, status: 'LATE' } }),
      db.attendance.findMany({ where: { ...where, status: 'ABSENT', justification: { not: null } }, orderBy: { date: 'desc' }, take: 50 }),
    ])
    const total = present + absent + justified + late
    return NextResponse.json({ records, stats: { present, absent, justified, late, total, attendanceRate: total ? Math.round(((present + late) / total) * 100) : 0 }, pendingJustifications })
  } catch (error) {
    console.error('Attendance API error:', error)
    return NextResponse.json({ error: 'Impossible de charger les présences' }, { status: 500 })
  }
}

async function handlePost(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const { studentName, matricule, course, timeSlot, status, duration, justification, program, level, date } = body
    if (!timeSlot || !STATUSES.includes(status)) return NextResponse.json({ error: 'Créneau et statut valides requis' }, { status: 400 })
    const attendanceDate = date ? new Date(date) : new Date()
    if (Number.isNaN(attendanceDate.getTime())) return NextResponse.json({ error: 'Date invalide' }, { status: 400 })

    if (user.role === 'ENSEIGNANT') {
      const courseElementId = typeof body.courseElementId === 'string' ? body.courseElementId : ''
      const studentId = typeof body.studentId === 'string' ? body.studentId : ''
      const academicYearId = typeof body.academicYearId === 'string' ? body.academicYearId : ''
      const scope = await getTeacherScope(user, tenantId, academicYearId)
      if (!scope.linked || !scope.courseElementIds.includes(courseElementId)) return NextResponse.json({ error: 'Matière non attribuée' }, { status: 403 })
      if (!studentId || !academicYearId || !['PRESENT', 'ABSENT', 'LATE'].includes(status)) return NextResponse.json({ error: 'Étudiant, année et statut requis' }, { status: 400 })
      if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !timeSlot.trim() || timeSlot.length > 80) return NextResponse.json({ error: 'Date ou créneau invalide' }, { status: 400 })
      const sessionDate = new Date(`${date}T00:00:00.000Z`)
      if (Number.isNaN(sessionDate.getTime()) || sessionDate.toISOString().slice(0, 10) !== date) return NextResponse.json({ error: 'Date invalide' }, { status: 400 })

      const [element, student, year] = await Promise.all([
        db.courseElement.findFirst({
          where: { id: courseElementId, teachingUnit: { semester: { level: { program: { tenantId } } } } },
          select: {
            name: true,
            teachingUnitId: true,
            teachingUnit: { select: { semester: { select: { level: { select: {
              id: true,
              name: true,
              program: { select: { name: true } },
            } } } } } },
          },
        }),
        db.student.findFirst({ where: { id: studentId, tenantId }, select: { id: true, firstName: true, lastName: true, matricule: true } }),
        db.academicYear.findFirst({ where: { id: academicYearId, tenantId }, select: { id: true } }),
      ])
      if (!element || !student || !year) return NextResponse.json({ error: 'Données académiques introuvables' }, { status: 404 })
      const registration = await db.administrativeRegistration.findFirst({ where: {
        tenantId, studentId, academicYearId, status: 'INSCRIT',
        levelId: element.teachingUnit.semester.level.id,
      }, select: { id: true } })
      if (!registration) return NextResponse.json({ error: 'Étudiant non inscrit à cette UE pour cette année' }, { status: 403 })

      const sessionKey = { tenantId, studentId, courseElementId, academicYearId, date: sessionDate, timeSlot: timeSlot.trim() }
      const duplicate = await db.attendance.findFirst({ where: sessionKey, select: { id: true } })
      if (duplicate) return NextResponse.json({ error: 'Présence déjà enregistrée pour ce créneau' }, { status: 409 })

      const record = await db.attendance.create({ data: {
        tenantId, studentId, courseElementId, academicYearId, teacherId: scope.teacherId,
        studentName: `${student.lastName} ${student.firstName}`.trim(), matricule: student.matricule || '',
        course: element.name, timeSlot: sessionKey.timeSlot, status,
        duration: duration ? String(duration) : null,
        program: element.teachingUnit.semester.level.program.name,
        level: element.teachingUnit.semester.level.name,
        date: sessionDate,
      } })
      return NextResponse.json({ record }, { status: 201 })
    }

    if (!studentName || !matricule || !course) return NextResponse.json({ error: 'Étudiant, matricule et cours requis' }, { status: 400 })
    const record = await db.attendance.create({ data: {
      tenantId, studentName, matricule, course, timeSlot, status,
      duration: duration ?? null, justification: justification ?? null,
      program: program ?? null, level: level ?? null, date: attendanceDate,
    } })
    return NextResponse.json({ record }, { status: 201 })
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') return NextResponse.json({ error: 'Présence déjà enregistrée pour ce créneau' }, { status: 409 })
    console.error('Create attendance error:', error)
    return NextResponse.json({ error: 'Impossible d’enregistrer la présence' }, { status: 500 })
  }
}

async function handlePut(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Identifiant requis' }, { status: 400 })
    const existing = await db.attendance.findFirst({ where: { id, tenantId } })
    if (!existing) return NextResponse.json({ error: 'Présence introuvable' }, { status: 404 })
    const body = await request.json()
    if (user.role === 'ENSEIGNANT') {
      if (!existing.academicYearId) return NextResponse.json({ error: 'Présence sans année académique : correction réservée à la scolarité' }, { status: 403 })
      const scope = await getTeacherScope(user, tenantId, existing.academicYearId)
      if (!scope.linked || existing.teacherId !== scope.teacherId || !existing.courseElementId || !scope.courseElementIds.includes(existing.courseElementId)) {
        return NextResponse.json({ error: 'Présence hors de votre périmètre' }, { status: 403 })
      }
      if (body.action !== 'updateStatus' || !['PRESENT', 'ABSENT', 'LATE'].includes(body.status)) return NextResponse.json({ error: 'Action non autorisée' }, { status: 403 })
    } else if (!['approve', 'reject', 'updateStatus'].includes(body.action) || body.action === 'updateStatus' && !STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Action ou statut invalide' }, { status: 400 })
    }
    const data = body.action === 'approve' ? { status: 'JUSTIFIED' } : body.action === 'reject' ? { justification: null } : { status: body.status }
    const record = await db.attendance.update({ where: { id }, data })
    return NextResponse.json({ record })
  } catch (error) {
    console.error('Update attendance error:', error)
    return NextResponse.json({ error: 'Impossible de modifier la présence' }, { status: 500 })
  }
}

const MANAGEMENT_ROLES = ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE', 'FACULTE', 'DEPARTEMENT']
export const GET = withTenantAuth(handleGet, [...MANAGEMENT_ROLES, 'ENSEIGNANT'])
export const POST = withTenantAuth(handlePost, [...MANAGEMENT_ROLES, 'ENSEIGNANT'])
export const PUT = withTenantAuth(handlePut, [...MANAGEMENT_ROLES, 'ENSEIGNANT'])
