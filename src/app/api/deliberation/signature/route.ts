import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { getOrganizationScope } from '@/lib/auth/organization-scope'
import { parseJuryMembers } from '@/lib/deliberations/jury'

async function handlePost(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const form = await request.formData()
    const deliberationId = form.get('deliberationId')
    const memberIndex = Number(form.get('memberIndex'))
    const file = form.get('file')
    if (typeof deliberationId !== 'string' || !Number.isInteger(memberIndex) || memberIndex < 0 ||
      !(file instanceof File) || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      file.size === 0 || file.size > 2_000_000) {
      return NextResponse.json({ error: 'Signature PNG, JPEG ou WebP requise (2 Mo maximum).' }, { status: 400 })
    }
    const scope = await getOrganizationScope(user, tenantId)
    if (scope && scope.departmentIds.length === 0) return NextResponse.json({ error: 'Département inaccessible' }, { status: 403 })
    const source = Buffer.from(await file.arrayBuffer())
    const metadata = await sharp(source, { failOn: 'error' }).metadata()
    if (!metadata.width || !metadata.height || metadata.width > 5000 || metadata.height > 5000) {
      return NextResponse.json({ error: 'Dimensions de signature invalides.' }, { status: 400 })
    }
    const png = await sharp(source, { failOn: 'error' }).rotate().resize({ width: 350, height: 140,
      fit: 'inside', withoutEnlargement: true }).png({ palette: true, compressionLevel: 9 }).toBuffer()
    if (png.length > 85_000) return NextResponse.json({ error: 'Signature trop détaillée après optimisation.' }, { status: 400 })
    const signature = `data:image/png;base64,${png.toString('base64')}`
    const result = await db.$transaction(async (tx) => {
      const session = await tx.deliberation.findFirst({ where: { id: deliberationId, tenantId, isLocked: true,
        ...(scope ? { departmentId: { in: scope.departmentIds } } : {}) },
      })
      if (!session) return null
      const members = parseJuryMembers(session.juryMembers)
      if (!members?.[memberIndex]) return null
      const previous = Boolean(members[memberIndex].signature)
      members[memberIndex].signature = signature
      await tx.deliberation.update({ where: { id: session.id }, data: { juryMembers: members } })
      await tx.auditLog.create({ data: { tenantId, userId: user.id, action: 'JURY_SIGNATURE_UPLOADED',
        entity: 'Deliberation', entityId: session.id,
        details: JSON.stringify({ memberIndex, memberName: members[memberIndex].name, replacement: previous }) } })
      return members[memberIndex]
    })
    if (!result) return NextResponse.json({ error: 'Délibération verrouillée ou membre introuvable.' }, { status: 404 })
    return NextResponse.json({ memberIndex, signature })
  } catch (error) {
    if (error instanceof Error && /unsupported|input image|corrupt|invalid/i.test(error.message)) {
      return NextResponse.json({ error: 'Image de signature invalide.' }, { status: 400 })
    }
    // eslint-disable-next-line no-console
    console.error('Jury signature upload error:', error)
    return NextResponse.json({ error: 'Signature non enregistrée.' }, { status: 500 })
  }
}

export const POST = withTenantAuth(handlePost, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'FACULTE', 'DEPARTEMENT', 'JURY'])
