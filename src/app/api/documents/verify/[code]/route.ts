import { NextRequest, NextResponse } from 'next/server'
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
      valid: true,
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
