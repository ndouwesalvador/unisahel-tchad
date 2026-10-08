import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { resolveOwnStudentId, isStudentSelfRole } from '@/lib/auth/student-scope'
import { getOrganizationScope, isOrganizationManager } from '@/lib/auth/organization-scope'

const DOCUMENT_READ_ROLES = new Set(['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'RECTORAT', 'SCOLARITE', 'FACULTE', 'DEPARTEMENT', 'ETUDIANT', 'ETUDIANT_SANTE'])

function documentDepartmentId(content: string) {
  try {
    const snapshot = JSON.parse(content) as { departmentId?: unknown }
    return typeof snapshot.departmentId === 'string' ? snapshot.departmentId : null
  } catch {
    return null
  }
}

// GET /api/documents - real generated-document history + stats. Without
// ?studentId, this is the documents-page.tsx dashboard (previously a
// hardcoded demo list/counters). With ?studentId (staff only), it scopes to
// one student's documents for student-detail.tsx. A student account only
// ever sees documents generated for themselves, regardless of the param.
async function handleGet(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    if (!DOCUMENT_READ_ROLES.has(user.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }
    const ownStudentId = await resolveOwnStudentId(user)
    if (isStudentSelfRole(user.role) && !ownStudentId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }
    const requestedStudentId = ownStudentId ? null : new URL(request.url).searchParams.get('studentId')
    const scopedStudentId = ownStudentId || requestedStudentId
    const where = scopedStudentId ? { tenantId, studentId: scopedStudentId } : { tenantId }

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    if (isOrganizationManager(user.role)) {
      const scope = await getOrganizationScope(user, tenantId)
      const departmentIds = new Set(scope?.departmentIds ?? [])
      const candidates = departmentIds.size > 0 ? await db.officialDocument.findMany({
        where: { tenantId, type: 'PV_DELIBERATION' },
        orderBy: { createdAt: 'desc' },
        take: 500,
        include: { student: { select: { firstName: true, lastName: true, matricule: true } } },
      }) : []
      const recent = candidates.filter((document) => {
        const departmentId = documentDepartmentId(document.content)
        return Boolean(departmentId && departmentIds.has(departmentId))
      }).slice(0, 100)
      const documents = recent.map((document) => ({
        id: document.id,
        type: document.type,
        studentId: document.studentId,
        academicYearId: document.academicYearId,
        etudiant: document.student ? `${document.student.firstName} ${document.student.lastName}` : '—',
        matricule: document.student?.matricule || '—',
        date: document.createdAt,
        statut: document.validatedAt ? 'signe' : document.status === 'DRAFT' ? 'en_attente' : 'genere',
        codeVerification: document.verificationCode || '',
      }))
      return NextResponse.json({
        documents,
        stats: {
          thisMonth: recent.filter((document) => document.createdAt >= monthStart).length,
          pending: recent.filter((document) => document.status === 'DRAFT').length,
        },
        countByType: { PV_DELIBERATION: recent.length },
      })
    }

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

// A generated PDF is immutable. Updating only the database validation flag
// would make its verification page contradict the PDF that was downloaded.
// Keep PUT as an explicit rejection for older clients; a new PDF must pass
// generation-time checks and be validated atomically with sign=true.
async function handlePut(_user: SessionUser, _tenantId: string, _request: NextRequest) {
  return NextResponse.json(
    { error: 'Ce PDF ne peut pas être validé après génération. Créez un nouveau PDF avec validation.' },
    { status: 409 }
  )
}

export const GET = withTenantAuth(handleGet)
export const PUT = withTenantAuth(handlePut, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE', 'RECTORAT'])
