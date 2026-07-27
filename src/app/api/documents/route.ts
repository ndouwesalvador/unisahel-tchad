import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { resolveOwnStudentId, isStudentSelfRole } from '@/lib/auth/student-scope'

// GET /api/documents - real generated-document history + stats. Without
// ?studentId, this is the documents-page.tsx dashboard (previously a
// hardcoded demo list/counters). With ?studentId (staff only), it scopes to
// one student's documents for student-detail.tsx. A student account only
// ever sees documents generated for themselves, regardless of the param.
async function handleGet(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const ownStudentId = await resolveOwnStudentId(user)
    const requestedStudentId = ownStudentId ? null : new URL(request.url).searchParams.get('studentId')
    const scopedStudentId = ownStudentId || requestedStudentId
    const where = scopedStudentId ? { tenantId, studentId: scopedStudentId } : { tenantId }

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [recent, thisMonthCount, pendingCount, byType] = await Promise.all([
      db.officialDocument.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { student: { select: { firstName: true, lastName: true, matricule: true } } },
      }),
      db.officialDocument.count({ where: { ...where, createdAt: { gte: monthStart } } }),
      db.officialDocument.count({ where: { ...where, status: 'DRAFT' } }),
      db.officialDocument.groupBy({ by: ['type'], where, _count: { type: true } }),
    ])

    const countByType: Record<string, number> = {}
    for (const row of byType) countByType[row.type] = row._count.type

    const documents = recent.map((d) => ({
      id: d.id,
      type: d.type,
      studentId: d.studentId,
      academicYearId: d.academicYearId,
      etudiant: d.student ? `${d.student.firstName} ${d.student.lastName}` : '—',
      matricule: d.student?.matricule || '—',
      date: d.createdAt,
      statut: d.validatedAt ? 'signe' : d.status === 'DRAFT' ? 'en_attente' : 'genere',
      codeVerification: d.verificationCode || '',
    }))

    return NextResponse.json({
      documents,
      stats: { thisMonth: thisMonthCount, pending: pendingCount },
      countByType,
    })
  } catch (error) {
    console.error('Documents API error:', error)
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }
}

// PUT /api/documents - certify an already-generated document as officially
// validated, without regenerating it. Staff only (a student can never
// self-certify their own document).
async function handlePut(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    if (isStudentSelfRole(user.role)) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Accès refusé' }, { status: 403 })
    }
    const body = await request.json()
    const { id } = body
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }
    const existing = await db.officialDocument.findFirst({ where: { id, tenantId } })
    if (!existing) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }
    const updated = await db.officialDocument.update({
      where: { id },
      data: { validatedBy: user.id, validatedAt: new Date() },
    })
    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Validate document error:', error)
    return NextResponse.json({ error: 'Failed to validate document' }, { status: 500 })
  }
}

export const GET = withTenantAuth(handleGet)
export const PUT = withTenantAuth(handlePut, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE', 'RECTORAT'])
