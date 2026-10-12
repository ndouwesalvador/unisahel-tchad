import { randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, type SessionUser } from '@/lib/auth/helpers'

const ONECS_ROLES = ['ONECS', 'SUPER_ADMIN']

async function handleGet(_user: SessionUser, request: NextRequest) {
  const status = request.nextUrl.searchParams.get('status')
  const search = request.nextUrl.searchParams.get('search')?.trim()
  const documents = await db.officialDocument.findMany({
    where: {
      type: 'DIPLOME',
      validatedAt: { not: null },
      status: { not: 'REVOKED' },
      ...(status && status !== 'ALL' ? { onecsStatus: status } : {}),
      ...(search ? { OR: [
        { number: { contains: search, mode: 'insensitive' } },
        { onecsReference: { contains: search, mode: 'insensitive' } },
        { student: { is: { OR: [
          { matricule: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ] } } },
      ] } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true, tenantId: true, number: true, verificationCode: true, createdAt: true, validatedAt: true,
      onecsStatus: true, onecsReference: true, onecsAuthenticatedAt: true, onecsNote: true,
      student: { select: { firstName: true, lastName: true, matricule: true } },
    },
  })
  const tenants = documents.length ? await db.tenant.findMany({
    where: { id: { in: [...new Set(documents.map((document) => document.tenantId))] } },
    select: { id: true, name: true, shortName: true },
  }) : []
  const tenantsById = new Map(tenants.map((tenant) => [tenant.id, tenant]))
  return NextResponse.json({
    documents: documents.map((document) => ({ ...document, institution: tenantsById.get(document.tenantId) ?? null, onecsStatus: document.onecsStatus ?? 'PENDING' })),
  })
}

async function handlePut(user: SessionUser, request: NextRequest) {
  const body = await request.json().catch(() => null) as { id?: unknown; decision?: unknown; note?: unknown } | null
  const id = typeof body?.id === 'string' ? body.id : ''
  const decision = body?.decision
  const note = typeof body?.note === 'string' ? body.note.trim() : ''
  if (!id || !['AUTHENTICATED', 'REJECTED'].includes(String(decision))) {
    return NextResponse.json({ error: 'Décision ONECS invalide.' }, { status: 400 })
  }
  if (decision === 'REJECTED' && note.length < 10) {
    return NextResponse.json({ error: 'Indiquez un motif de rejet explicite (10 caractères minimum).' }, { status: 400 })
  }

  const document = await db.officialDocument.findFirst({
    where: { id, type: 'DIPLOME', validatedAt: { not: null }, status: { not: 'REVOKED' } },
    select: { id: true, tenantId: true, type: true, validatedAt: true, status: true, onecsStatus: true },
  })
  if (!document) return NextResponse.json({ error: 'Diplôme officiel introuvable.' }, { status: 404 })
  if (document.onecsStatus && document.onecsStatus !== 'PENDING') {
    return NextResponse.json({ error: 'Cette décision ONECS est déjà définitive.' }, { status: 409 })
  }

  const authenticated = decision === 'AUTHENTICATED'
  const reference = authenticated ? `ONECS-${new Date().getFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}` : null
  const updated = await db.officialDocument.update({
    where: { id: document.id },
    data: {
      onecsStatus: String(decision),
      onecsReference: reference,
      onecsAuthenticatedBy: user.id,
      onecsAuthenticatedAt: new Date(),
      onecsNote: note || null,
    },
    select: { id: true, onecsStatus: true, onecsReference: true, onecsAuthenticatedAt: true, onecsNote: true },
  })
  await db.auditLog.create({
    data: {
      tenantId: document.tenantId,
      userId: user.id,
      action: authenticated ? 'ONECS_AUTHENTICATE' : 'ONECS_REJECT',
      entity: 'OfficialDocument',
      entityId: document.id,
      details: JSON.stringify({ decision, reference, note: note || null }),
    },
  })
  return NextResponse.json({ document: updated })
}

export const GET = withAuth(handleGet, ONECS_ROLES)
export const PUT = withAuth(handlePut, ['ONECS'])
