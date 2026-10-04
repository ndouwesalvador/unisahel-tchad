import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'node:crypto'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params

    if (!code || code.length < 6) {
      return NextResponse.json(
        { valid: false, error: 'Code de vérification invalide' },
        { status: 400 }
      )
    }

    const document = await db.officialDocument.findUnique({
      where: { verificationCode: code },
      include: {
        student: {
          select: { firstName: true, lastName: true, matricule: true },
        },
      },
    })

    if (!document) {
      return NextResponse.json({
        valid: false,
        error: 'Document non trouvé',
        message: 'Ce code de vérification ne correspond à aucun document dans notre base de données.',
      })
    }

    const tenant = await db.tenant.findUnique({
      where: { id: document.tenantId },
      select: { name: true },
    })

    let contentTenantName = ''
    try {
      const parsed = JSON.parse(document.content || '{}') as { tenant?: { name?: string } }
      contentTenantName = parsed.tenant?.name || ''
    } catch {
      contentTenantName = ''
    }

    return NextResponse.json({
      valid: Boolean(document.validatedAt) && document.status !== 'REVOKED',
      message: document.validatedAt ? undefined : 'Ce document existe, mais il n’a pas été validé par l’établissement.',
      fileVerificationAvailable: Boolean(document.hash),
      document: {
        type: document.type,
        number: document.number,
        status: document.status,
        institution: tenant?.name || contentTenantName,
        generatedAt: document.createdAt,
        validatedAt: document.validatedAt,
        student: document.student
          ? { name: `${document.student.firstName} ${document.student.lastName}`, matricule: document.student.matricule }
          : null,
      },
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Verification error:', error)
    return NextResponse.json(
      { valid: false, error: 'Erreur lors de la vérification' },
      { status: 500 }
    )
  }
}

// A QR code proves only that a reference exists. The PDF itself must be
// compared byte-for-byte with the SHA-256 digest captured at issuance.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    if (!code || code.length < 6) return NextResponse.json({ valid: false, error: 'Code invalide.' }, { status: 400 })
    const document = await db.officialDocument.findUnique({ where: { verificationCode: code }, select: {
      hash: true, status: true, validatedAt: true,
    } })
    if (!document || !document.validatedAt || document.status === 'REVOKED') {
      return NextResponse.json({ valid: false, error: 'Document non validé ou révoqué.' }, { status: 409 })
    }
    if (!document.hash || !/^[a-f0-9]{64}$/.test(document.hash)) {
      return NextResponse.json({ valid: false, error: 'Ce document historique ne dispose pas d’une empreinte de fichier vérifiable.' }, { status: 409 })
    }
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File) || !file.size || file.size > 4_200_000) {
      return NextResponse.json({ valid: false, error: 'Transmettez un PDF de 4,2 Mo maximum.' }, { status: 400 })
    }
    const bytes = Buffer.from(await file.arrayBuffer())
    if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') {
      return NextResponse.json({ valid: false, error: 'Le fichier transmis n’est pas un PDF.' }, { status: 400 })
    }
    const actual = createHash('sha256').update(bytes).digest()
    const expected = Buffer.from(document.hash, 'hex')
    const matches = timingSafeEqual(actual, expected)
    return NextResponse.json({ valid: matches, fileMatchesOriginal: matches,
      message: matches ? 'Ce fichier est identique au PDF validé par l’établissement.' : 'Ce PDF ne correspond pas à l’original validé. Il peut avoir été modifié.' },
    { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('PDF integrity verification error:', error)
    return NextResponse.json({ valid: false, error: 'Vérification du PDF impossible.' }, { status: 500 })
  }
}
