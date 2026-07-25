import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'

const VALID_STATUSES = ['en_attente', 'en_examen', 'admis', 'refuse', 'en_attente_pieces']
const VALID_TYPES = ['Premiere_inscription', 'Reinscription', 'Transfert', 'Equivalence']

function generateNumero(seq: number): string {
  const year = new Date().getFullYear()
  return `CND-${year}-${String(seq).padStart(3, '0')}`
}

// GET /api/candidature - list admission candidatures for the current academic year
async function handleGet(_user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const academicYearId = searchParams.get('academicYearId') || undefined

    const where = academicYearId ? { tenantId, academicYearId } : { tenantId }

    const [candidatures, total, admis, enAttente, refuse] = await Promise.all([
      db.admission.findMany({
        where,
        include: { program: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      db.admission.count({ where }),
      db.admission.count({ where: { ...where, status: 'admis' } }),
      db.admission.count({ where: { ...where, status: { in: ['en_attente', 'en_attente_pieces'] } } }),
      db.admission.count({ where: { ...where, status: 'refuse' } }),
    ])

    return NextResponse.json({
      candidatures,
      stats: { total, admis, enAttente, refuse },
    })
  } catch (error) {
    console.error('Candidature API error:', error)
    return NextResponse.json({ error: 'Failed to fetch candidatures' }, { status: 500 })
  }
}

// POST /api/candidature - create a new admission candidature
async function handlePost(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const {
      academicYearId, candidateFirstName, candidateLastName, candidateEmail, candidatePhone,
      programId, niveau, type, bacSeries, bacYear,
    } = body

    if (!academicYearId || !candidateFirstName || !candidateLastName) {
      return NextResponse.json(
        { error: 'academicYearId, candidateFirstName, and candidateLastName are required fields' },
        { status: 400 }
      )
    }

    if (type && !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 })
    }

    const year = await db.academicYear.findFirst({ where: { id: academicYearId, tenantId } })
    if (!year) {
      return NextResponse.json({ error: 'academicYearId not found for this tenant' }, { status: 404 })
    }

    if (programId) {
      const program = await db.program.findFirst({ where: { id: programId, tenantId } })
      if (!program) {
        return NextResponse.json({ error: 'programId not found for this tenant' }, { status: 404 })
      }
    }

    const countThisYear = await db.admission.count({
      where: { tenantId, createdAt: { gte: new Date(`${new Date().getFullYear()}-01-01`) } },
    })

    const candidature = await db.admission.create({
      data: {
        tenantId,
        academicYearId,
        candidateFirstName,
        candidateLastName,
        candidateEmail: candidateEmail ?? null,
        candidatePhone: candidatePhone ?? null,
        programId: programId ?? null,
        niveau: niveau ?? null,
        type: type ?? undefined,
        bacSeries: bacSeries ?? null,
        bacYear: typeof bacYear === 'number' ? bacYear : null,
        numero: generateNumero(countThisYear + 1),
        status: 'en_attente',
      },
      include: { program: { select: { name: true } } },
    })

    await db.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: 'CREATE',
        entity: 'Admission',
        entityId: candidature.id,
        details: JSON.stringify({ numero: candidature.numero }),
      },
    })

    return NextResponse.json({ candidature }, { status: 201 })
  } catch (error) {
    console.error('Create candidature error:', error)
    return NextResponse.json({ error: 'Failed to create candidature' }, { status: 500 })
  }
}

// PUT /api/candidature?id=X - update status/decision
async function handlePut(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 })
    }

    const existing = await db.admission.findFirst({ where: { id, tenantId } })
    if (!existing) {
      return NextResponse.json({ error: 'Candidature not found' }, { status: 404 })
    }

    const body = await request.json()
    const { status } = body

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
    }

    const candidature = await db.admission.update({
      where: { id },
      data: {
        status,
        decisionDate: ['admis', 'refuse'].includes(status) ? new Date() : existing.decisionDate,
      },
      include: { program: { select: { name: true } } },
    })

    await db.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: 'UPDATE',
        entity: 'Admission',
        entityId: candidature.id,
        details: JSON.stringify({ status }),
      },
    })

    return NextResponse.json({ candidature })
  } catch (error) {
    console.error('Update candidature error:', error)
    return NextResponse.json({ error: 'Failed to update candidature' }, { status: 500 })
  }
}

export const GET = withTenantAuth(handleGet)
export const POST = withTenantAuth(handlePost)
export const PUT = withTenantAuth(handlePut)
