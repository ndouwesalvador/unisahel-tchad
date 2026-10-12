import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { resolveOwnStudentId } from '@/lib/auth/student-scope'

const INTERNSHIP_READ_ROLES = ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE', 'MAITRE_STAGE', 'ETUDIANT_SANTE']
const INTERNSHIP_MANAGE_ROLES = ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE']
const INTERNSHIP_EVALUATE_ROLES = [...INTERNSHIP_MANAGE_ROLES, 'MAITRE_STAGE']

// GET /api/internships - List internships with stats
async function handleGet(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    if (request.nextUrl.searchParams.get('supervisors') === 'true') {
      if (!INTERNSHIP_MANAGE_ROLES.includes(user.role)) {
        return NextResponse.json({ error: 'FORBIDDEN', message: 'Accès refusé' }, { status: 403 })
      }
      const supervisors = await db.user.findMany({
        where: { tenantId, role: 'MAITRE_STAGE', isActive: true },
        select: { id: true, firstName: true, lastName: true, email: true },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      })
      return NextResponse.json({ supervisors })
    }
    const ownStudentId = user.role === 'ETUDIANT_SANTE' ? await resolveOwnStudentId(user) : null
    const ownStudent = ownStudentId
      ? await db.student.findFirst({ where: { id: ownStudentId, tenantId }, select: { matricule: true } })
      : null
    const where = user.role === 'ETUDIANT_SANTE'
      ? { tenantId, matricule: ownStudent?.matricule ?? '__AUCUN_STAGE__' }
      : user.role === 'MAITRE_STAGE'
        ? { tenantId, supervisorUserId: user.id }
        : { tenantId }

    const [internships, total, enCours, conventionSignee, enAttente, termine, annule, partners] = await Promise.all([
      db.internship.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      db.internship.count({ where }),
      db.internship.count({ where: { ...where, status: 'EN_COURS' } }),
      db.internship.count({ where: { ...where, status: 'CONVENTION_SIGNEE' } }),
      db.internship.count({ where: { ...where, status: 'EN_ATTENTE' } }),
      db.internship.count({ where: { ...where, status: 'TERMINE' } }),
      db.internship.count({ where: { ...where, status: 'ANNULE' } }),
      user.role === 'ETUDIANT_SANTE' || user.role === 'MAITRE_STAGE'
        ? Promise.resolve([])
        : db.internshipPartner.findMany({ where: { tenantId }, orderBy: { name: 'asc' } }),
    ])

    const stats = {
      total,
      enCours,
      conventionSignee,
      enAttente,
      termine,
      annule,
    }

    return NextResponse.json({ internships, stats, partners })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Internships API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch internships' },
      { status: 500 }
    )
  }
}

// POST /api/internships - Create a new internship
async function handlePost(_user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const {
      studentName,
      matricule,
      entreprise,
      type,
      period,
      status,
      tuteur,
      startDate,
      endDate,
      evaluation,
      evaluationDate,
      supervisorUserId,
    } = body

    if (!studentName || !matricule || !entreprise || !type) {
      return NextResponse.json(
        { error: 'studentName, matricule, entreprise, and type are required fields' },
        { status: 400 }
      )
    }

    const validTypes = ['PROFESSIONNEL', 'HOSPITALIER', 'RECHERCHE', 'FIN_ETUDES']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const supervisor = supervisorUserId ? await db.user.findFirst({
      where: { id: supervisorUserId, tenantId, role: 'MAITRE_STAGE', isActive: true },
      select: { id: true, firstName: true, lastName: true },
    }) : null
    if (supervisorUserId && !supervisor) {
      return NextResponse.json({ error: 'Maître de stage actif introuvable dans cette institution' }, { status: 400 })
    }

    const internship = await db.internship.create({
      data: {
        tenantId,
        studentName,
        matricule,
        entreprise,
        type,
        period: period ?? null,
        status: status ?? 'EN_ATTENTE',
        tuteur: tuteur ?? (supervisor ? `${supervisor.firstName} ${supervisor.lastName}` : null),
        supervisorUserId: supervisor?.id ?? null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        evaluation: evaluation ?? null,
        evaluationDate: evaluationDate ? new Date(evaluationDate) : null,
      },
    })

    return NextResponse.json({ internship }, { status: 201 })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Create internship error:', error)
    return NextResponse.json(
      { error: 'Failed to create internship' },
      { status: 500 }
    )
  }
}

// PUT /api/internships?id=X - update status (convention validation) and/or
// record an evaluation. Convention approve -> CONVENTION_SIGNEE, reject -> ANNULE.
async function handlePut(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 })
    }
    const existing = await db.internship.findFirst({
      where: { id, tenantId, ...(user.role === 'MAITRE_STAGE' ? { supervisorUserId: user.id } : {}) },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Internship not found' }, { status: 404 })
    }

    const body = await request.json()
    const { status, evaluation } = body

    if (user.role === 'MAITRE_STAGE' && status !== undefined) {
      return NextResponse.json({ error: 'Le maître de stage peut enregistrer son évaluation, pas modifier le circuit administratif.' }, { status: 403 })
    }

    const validStatuses = ['EN_ATTENTE', 'CONVENTION_SIGNEE', 'EN_COURS', 'TERMINE', 'ANNULE']
    const data: { status?: string; evaluation?: string; evaluationDate?: Date } = {}
    if (status !== undefined) {
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: `status must be one of: ${validStatuses.join(', ')}` }, { status: 400 })
      }
      data.status = status
    }
    if (evaluation !== undefined) {
      data.evaluation = typeof evaluation === 'string' ? evaluation : JSON.stringify(evaluation)
      data.evaluationDate = new Date()
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No recognized fields to update' }, { status: 400 })
    }

    const internship = await db.internship.update({ where: { id }, data })
    return NextResponse.json({ internship })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Update internship error:', error)
    return NextResponse.json({ error: 'Failed to update internship' }, { status: 500 })
  }
}

export const GET = withTenantAuth(handleGet, INTERNSHIP_READ_ROLES)
export const POST = withTenantAuth(handlePost, INTERNSHIP_MANAGE_ROLES)
export const PUT = withTenantAuth(handlePut, INTERNSHIP_EVALUATE_ROLES)
