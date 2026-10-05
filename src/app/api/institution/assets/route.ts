import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'

const ASSET_KINDS = ['logo', 'secondaryLogo', 'thirdLogo', 'stamp', 'signature', 'secondarySignature', 'thirdSignature', 'secondaryStamp', 'thirdStamp'] as const
type AssetKind = typeof ASSET_KINDS[number]

async function handlePost(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const form = await request.formData()
    const kind = form.get('kind')
    const file = form.get('file')
    if (typeof kind !== 'string' || !ASSET_KINDS.includes(kind as AssetKind) || !(file instanceof File)) {
      return NextResponse.json({ error: 'Type de visuel ou fichier invalide.' }, { status: 400 })
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size === 0 || file.size > 2_000_000) {
      return NextResponse.json({ error: 'Utilisez une image PNG, JPEG ou WebP de moins de 2 Mo.' }, { status: 400 })
    }
    const input = Buffer.from(await file.arrayBuffer())
    const metadata = await sharp(input, { failOn: 'error' }).metadata()
    if (!metadata.width || !metadata.height || metadata.width > 5000 || metadata.height > 5000) {
      return NextResponse.json({ error: 'Dimensions de l’image invalides.' }, { status: 400 })
    }
    // Crop wide white/transparent margins: otherwise a real logo or signature
    // appears minuscule inside the document's fixed image box.
    const optimized = await sharp(input, { failOn: 'error' })
      .rotate().trim({ threshold: 12 }).resize({ width: ['logo', 'secondaryLogo', 'thirdLogo', 'stamp', 'secondaryStamp', 'thirdStamp'].includes(kind) ? 520 : 540, height: ['logo', 'secondaryLogo', 'thirdLogo', 'stamp', 'secondaryStamp', 'thirdStamp'].includes(kind) ? 520 : 180,
        fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 9, palette: true }).toBuffer()
    if (optimized.length > 300_000) {
      return NextResponse.json({ error: 'Image trop détaillée après optimisation (300 Ko maximum).' }, { status: 400 })
    }
    const dataUrl = `data:image/png;base64,${optimized.toString('base64')}`
    await db.tenant.update({ where: { id: tenantId }, data: { [kind]: dataUrl } })
    await db.auditLog.create({ data: { tenantId, userId: user.id, action: 'UPDATE', entity: 'Tenant',
      entityId: tenantId, details: JSON.stringify({ field: kind, bytes: optimized.length }) } })
    return NextResponse.json({ kind, dataUrl })
  } catch (error) {
    if (error instanceof Error && /unsupported|input image|corrupt|invalid/i.test(error.message)) {
      return NextResponse.json({ error: 'Le fichier ne contient pas une image exploitable.' }, { status: 400 })
    }
    // eslint-disable-next-line no-console
    console.error('Institution asset upload error:', error)
    return NextResponse.json({ error: 'Impossible de téléverser ce visuel.' }, { status: 500 })
  }
}

export const POST = withTenantAuth(handlePost, ['SUPER_ADMIN', 'ADMIN_INSTITUTION'])
