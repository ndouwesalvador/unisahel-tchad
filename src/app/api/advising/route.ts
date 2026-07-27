import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'

type AlertLevel = 'Vert' | 'Jaune' | 'Orange' | 'Rouge'

const APPOINTMENT_TYPES = [
  'Orientation',
  'Suivi pedagogique',
  'Projet professionnel',
  'Reorientation',
  'Probleme personnel',
] as const

const APPOINTMENT_STATUSES = ['Planifie', 'En cours', 'Termine', 'Annule'] as const

// Colors kept in sync with the `typeConfig` badge palette in advising-page.tsx
// so the "motifs de consultation" chart uses the same visual language as the
// appointment badges elsewhere on the page.
const TYPE_COLORS: Record<string, string> = {
  'Suivi pedagogique': '#2d7a4f',
  'Orientation': '#1a2744',
  'Probleme personnel': '#d4a853',
  'Reorientation': '#ea580c',
  'Projet professionnel': '#8b5cf6',
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function formatDateFr(date: Date | null | undefined): string {
  if (!date) return ''
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

function formatTimeFr(date: Date | null | undefined): string {
  if (!date) return ''
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date)
}

async function resolveCurrentAcademicYearId(tenantId: string): Promise<string | null> {
  const current = await db.academicYear.findFirst({
    where: { tenantId, isCurrent: true },
    select: { id: true },
  })
  return current?.id ?? null
}

// Same principle as the "Vert/Jaune/Orange/Rouge" demo levels, but anchored to
// the tenant's real passing grade instead of hardcoded 12/10/8 thresholds.
function computeAlertLevel(moyenne: number, passingGrade: number): AlertLevel {
  if (moyenne >= passingGrade + 2) return 'Vert'
  if (moyenne >= passingGrade) return 'Jaune'
  if (moyenne >= passingGrade - 2) return 'Orange'
  return 'Rouge'
}

// GET /api/advising - dashboard data for the "conseil pedagogique" module:
// appointments, advisors, workshops, monitored students and consultation-motif breakdown.
async function handleGet(_user: SessionUser, tenantId: string, _request: NextRequest) {
  try {
    const settings = await db.tenantSettings.findUnique({
      where: { tenantId },
      select: { passingGrade: true, creditsPerYear: true },
    })
    const passingGrade = settings?.passingGrade ?? 10
    const creditsPerYear = settings?.creditsPerYear ?? 60

    const academicYearId = await resolveCurrentAcademicYearId(tenantId)

    const [appointmentRows, advisorRows, workshopRows, appointmentTypeGroups, advisorStudentPairs] = await Promise.all([
      db.advisingAppointment.findMany({
        where: { tenantId },
        include: {
          student: { select: { id: true, firstName: true, lastName: true, matricule: true } },
          advisor: { select: { id: true, name: true } },
        },
        orderBy: { scheduledAt: 'desc' },
      }),
      db.advisor.findMany({
        where: { tenantId },
        orderBy: { name: 'asc' },
      }),
      db.advisingWorkshop.findMany({
        where: { tenantId },
        include: {
          advisor: { select: { name: true } },
          _count: { select: { enrollments: true } },
        },
        orderBy: { scheduledAt: 'asc' },
      }),
      db.advisingAppointment.groupBy({
        by: ['type'],
        where: { tenantId },
        _count: { id: true },
      }),
      // Distinct advisor/student pairs across all appointments - the real
      // "how many different students has this advisor met" count.
      db.advisingAppointment.findMany({
        where: { tenantId },
        select: { advisorId: true, studentId: true },
        distinct: ['advisorId', 'studentId'],
      }),
    ])

    // ─── Appointments ─────────────────────────────────────────────────────
    // scheduledAtIso/createdAtIso are included alongside the pre-formatted
    // French date/time so the frontend can derive real (non-fabricated)
    // aggregates - monthly trend, weekday schedule, average lead time,
    // return rate - without re-fetching or re-parsing the display strings.
    const appointments = appointmentRows.map((a) => ({
      id: a.id,
      studentId: a.studentId,
      advisorId: a.advisorId,
      studentName: a.student ? `${a.student.lastName.toUpperCase()} ${a.student.firstName}` : '—',
      matricule: a.student?.matricule || '—',
      type: a.type,
      date: formatDateFr(a.scheduledAt),
      time: formatTimeFr(a.scheduledAt),
      scheduledAtIso: a.scheduledAt.toISOString(),
      createdAtIso: a.createdAt.toISOString(),
      conseiller: a.advisor?.name || '—',
      status: a.status,
      notes: a.notes,
    }))

    // ─── Advisors ─────────────────────────────────────────────────────────
    const studentCountByAdvisor = new Map<string, number>()
    for (const pair of advisorStudentPairs) {
      studentCountByAdvisor.set(pair.advisorId, (studentCountByAdvisor.get(pair.advisorId) ?? 0) + 1)
    }

    const advisors = advisorRows.map((a) => ({
      id: a.id,
      name: a.name,
      title: a.title || '—',
      department: a.department || '—',
      specialties: a.specialties,
      etudiantsSuivis: studentCountByAdvisor.get(a.id) ?? 0,
      disponibilite: a.availability,
    }))

    // ─── Workshops ────────────────────────────────────────────────────────
    const workshops = workshopRows.map((w) => ({
      id: w.id,
      title: w.title,
      inscrits: w._count.enrollments,
      places: w.capacity,
      salle: w.room || '—',
      date: formatDateFr(w.scheduledAt),
      time: w.duration ? `${formatTimeFr(w.scheduledAt)} (${w.duration})` : formatTimeFr(w.scheduledAt),
      instructor: w.advisor?.name || '—',
    }))

    // ─── Motif breakdown ──────────────────────────────────────────────────
    const totalAppointments = appointmentTypeGroups.reduce((sum, g) => sum + g._count.id, 0)
    const motifData = totalAppointments > 0
      ? appointmentTypeGroups
          .map((g) => ({
            motif: g.type,
            percent: Math.round((g._count.id / totalAppointments) * 100),
            color: TYPE_COLORS[g.type] || '#64748b',
          }))
          .sort((a, b) => b.percent - a.percent)
      : []

    // ─── Monitored students (real Grade aggregation, same formula as /api/results) ──
    let monitoredStudents: Array<{
      id: string
      name: string
      matricule: string
      program: string
      level: string
      moyenne: number
      creditsAcquis: number
      creditsTotal: number
      dettes: number
      alertLevel: AlertLevel
      conseiller: string
      dernierEntretien: string
    }> = []

    if (academicYearId) {
      const gradeRows = await db.grade.findMany({
        where: {
          student: { tenantId },
          academicYearId,
          session: 'NORMALE',
          finalGrade: { not: null },
        },
        select: {
          studentId: true,
          finalGrade: true,
          teachingUnitId: true,
          courseElement: { select: { coefficient: true } },
          teachingUnit: { select: { credits: true } },
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              matricule: true,
              currentProgram: { select: { name: true } },
              currentLevel: { select: { name: true } },
            },
          },
        },
      })

      type StudentAgg = {
        student: {
          id: string
          firstName: string
          lastName: string
          matricule: string | null
          currentProgram: { name: string } | null
          currentLevel: { name: string } | null
        }
        weightedSum: number
        weightTotal: number
        ues: Map<string, { credits: number; weightedSum: number; weightTotal: number }>
      }
      const byStudent = new Map<string, StudentAgg>()

      for (const g of gradeRows) {
        if (g.finalGrade === null) continue
        const coeff = g.courseElement?.coefficient ?? 1

        let agg = byStudent.get(g.studentId)
        if (!agg) {
          agg = { student: g.student, weightedSum: 0, weightTotal: 0, ues: new Map() }
          byStudent.set(g.studentId, agg)
        }
        agg.weightedSum += g.finalGrade * coeff
        agg.weightTotal += coeff

        const ueId = g.teachingUnitId || 'unknown'
        const existingUe = agg.ues.get(ueId)
        if (existingUe) {
          existingUe.weightedSum += g.finalGrade * coeff
          existingUe.weightTotal += coeff
        } else {
          agg.ues.set(ueId, { credits: g.teachingUnit?.credits ?? 0, weightedSum: g.finalGrade * coeff, weightTotal: coeff })
        }
      }

      // Most recent appointment per student (appointmentRows is already sorted desc by scheduledAt).
      const latestAppointmentByStudent = new Map<string, { advisorName: string; date: Date }>()
      for (const a of appointmentRows) {
        if (!latestAppointmentByStudent.has(a.studentId)) {
          latestAppointmentByStudent.set(a.studentId, { advisorName: a.advisor?.name || '—', date: a.scheduledAt })
        }
      }

      const studentIds = Array.from(byStudent.keys())
      const debtGroups = studentIds.length > 0
        ? await db.payment.groupBy({
            by: ['studentId'],
            where: { tenantId, studentId: { in: studentIds }, status: 'PENDING' },
            _count: { id: true },
          })
        : []
      const debtByStudent = new Map(debtGroups.map((d) => [d.studentId, d._count.id]))

      monitoredStudents = Array.from(byStudent.values())
        .map((agg) => {
          const moyenne = agg.weightTotal > 0 ? round2(agg.weightedSum / agg.weightTotal) : 0
          const creditsAcquis = Array.from(agg.ues.values()).reduce((sum, ue) => {
            const ueAverage = ue.weightTotal > 0 ? round2(ue.weightedSum / ue.weightTotal) : 0
            return ueAverage >= passingGrade ? sum + ue.credits : sum
          }, 0)
          const latest = latestAppointmentByStudent.get(agg.student.id)

          return {
            id: agg.student.id,
            name: `${agg.student.lastName.toUpperCase()} ${agg.student.firstName}`,
            matricule: agg.student.matricule || '—',
            program: agg.student.currentProgram?.name || '—',
            level: agg.student.currentLevel?.name || '—',
            moyenne,
            creditsAcquis,
            creditsTotal: creditsPerYear,
            dettes: debtByStudent.get(agg.student.id) ?? 0,
            alertLevel: computeAlertLevel(moyenne, passingGrade),
            conseiller: latest?.advisorName || '—',
            dernierEntretien: latest ? formatDateFr(latest.date) : '—',
          }
        })
        .sort((a, b) => a.name.localeCompare(b.name))
    }

    return NextResponse.json({
      appointments,
      advisors,
      workshops,
      monitoredStudents,
      motifData,
      passingGrade,
      academicYearId,
    })
  } catch (error) {
    console.error('Advising API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch advising data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST /api/advising - schedule a new advising appointment
async function handlePost(_user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const { studentId, advisorId, type, scheduledAt, notes } = body

    if (!studentId || !advisorId || !scheduledAt) {
      return NextResponse.json(
        { error: 'studentId, advisorId and scheduledAt are required' },
        { status: 400 }
      )
    }

    const parsedDate = new Date(scheduledAt)
    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: 'scheduledAt is not a valid date' }, { status: 400 })
    }

    if (type !== undefined && !APPOINTMENT_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${APPOINTMENT_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    const [student, advisor] = await Promise.all([
      db.student.findFirst({ where: { id: studentId, tenantId }, select: { id: true } }),
      db.advisor.findFirst({ where: { id: advisorId, tenantId }, select: { id: true } }),
    ])
    if (!student) {
      return NextResponse.json({ error: 'Student not found in this tenant' }, { status: 404 })
    }
    if (!advisor) {
      return NextResponse.json({ error: 'Advisor not found in this tenant' }, { status: 404 })
    }

    const appointment = await db.advisingAppointment.create({
      data: {
        tenantId,
        studentId,
        advisorId,
        type: type ?? undefined,
        scheduledAt: parsedDate,
        notes: notes ?? null,
      },
      include: {
        student: { select: { firstName: true, lastName: true, matricule: true } },
        advisor: { select: { name: true } },
      },
    })

    return NextResponse.json({ appointment }, { status: 201 })
  } catch (error) {
    console.error('Create advising appointment error:', error)
    return NextResponse.json(
      { error: 'Failed to create appointment', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PUT /api/advising?id=X - update an appointment's status
async function handlePut(_user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 })
    }

    const existing = await db.advisingAppointment.findFirst({ where: { id, tenantId } })
    if (!existing) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    const body = await request.json()
    const { status } = body
    if (!status || !APPOINTMENT_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${APPOINTMENT_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    const appointment = await db.advisingAppointment.update({
      where: { id },
      data: { status },
      include: {
        student: { select: { firstName: true, lastName: true, matricule: true } },
        advisor: { select: { name: true } },
      },
    })

    return NextResponse.json({ appointment })
  } catch (error) {
    console.error('Update advising appointment error:', error)
    return NextResponse.json(
      { error: 'Failed to update appointment', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export const GET = withTenantAuth(handleGet)
export const POST = withTenantAuth(handlePost)
export const PUT = withTenantAuth(handlePut)
