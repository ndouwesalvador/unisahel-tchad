import React from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { DIPLOMA_TEMPLATE_TYPE, parseDiplomaDesign } from '@/lib/diploma-design'
import { parseHeaderLines } from '@/lib/institution-branding'
import { renderArabicHeader, renderArabicMotto } from '@/lib/pdf/arabic-header'
import { prepareDocumentArtwork } from '@/lib/pdf/artwork'
import { DiplomePDF, renderPDF } from '@/lib/pdf/templates'

async function handleGet(_user: SessionUser, tenantId: string, _request: NextRequest) {
  const tenantDb = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true, name: true, shortName: true, address: true, city: true, country: true, ministry: true,
      phone: true, email: true, website: true, logo: true, secondaryLogo: true, thirdLogo: true,
      stamp: true, signature: true, secondarySignature: true, thirdSignature: true,
      secondaryStamp: true, thirdStamp: true, secondarySignerName: true, secondarySignerTitle: true,
      thirdSignerName: true, thirdSignerTitle: true, headerLanguageMode: true, arabicCountry: true,
      arabicName: true, arabicMinistry: true, arabicMotto: true, contactPlacement: true, sealSizeMm: true,
      headerLinesFr: true, headerLinesAr: true, rectorName: true, rectorTitle: true, motto: true,
      documentTemplates: {
        where: { type: DIPLOMA_TEMPLATE_TYPE, isActive: true }, orderBy: { updatedAt: 'desc' }, take: 1,
        select: { template: true },
      },
    },
  })
  if (!tenantDb) return NextResponse.json({ error: 'Établissement introuvable' }, { status: 404 })

  const headerLinesFr = parseHeaderLines(tenantDb.headerLinesFr) ?? undefined
  const headerLinesAr = parseHeaderLines(tenantDb.headerLinesAr) ?? undefined
  const tenant = await prepareDocumentArtwork({
    id: tenantDb.id,
    name: tenantDb.name,
    shortName: tenantDb.shortName || '',
    address: tenantDb.address || '',
    city: tenantDb.city || '',
    country: tenantDb.country || '',
    ministry: tenantDb.ministry || '',
    phone: tenantDb.phone || '',
    email: tenantDb.email || '',
    website: tenantDb.website || '',
    logo: tenantDb.logo || '',
    secondaryLogo: tenantDb.secondaryLogo || '',
    thirdLogo: tenantDb.thirdLogo || '',
    stamp: tenantDb.stamp || '',
    secondaryStamp: tenantDb.secondaryStamp || '',
    thirdStamp: tenantDb.thirdStamp || '',
    signature: tenantDb.signature || '',
    secondarySignature: tenantDb.secondarySignature || '',
    thirdSignature: tenantDb.thirdSignature || '',
    secondarySignerName: tenantDb.secondarySignerName || '',
    secondarySignerTitle: tenantDb.secondarySignerTitle || '',
    thirdSignerName: tenantDb.thirdSignerName || '',
    thirdSignerTitle: tenantDb.thirdSignerTitle || '',
    arabicName: tenantDb.arabicName || '',
    arabicMinistry: tenantDb.arabicMinistry || '',
    arabicCountry: tenantDb.arabicCountry || '',
    headerLanguageMode: tenantDb.headerLanguageMode,
    arabicMotto: tenantDb.arabicMotto || '',
    arabicMottoImage: renderArabicMotto({ headerLanguageMode: tenantDb.headerLanguageMode, arabicMotto: tenantDb.arabicMotto }),
    contactPlacement: tenantDb.contactPlacement,
    sealSizeMm: tenantDb.sealSizeMm,
    headerLinesFr,
    headerLinesAr,
    arabicHeaderImage: renderArabicHeader({
      headerLanguageMode: tenantDb.headerLanguageMode, headerLinesAr,
      arabicCountry: tenantDb.arabicCountry || '', arabicMinistry: tenantDb.arabicMinistry || '', arabicName: tenantDb.arabicName || '',
    }),
    rectorName: tenantDb.rectorName || '',
    rectorTitle: tenantDb.rectorTitle || 'Recteur',
    motto: tenantDb.motto || '',
    diplomaDesign: parseDiplomaDesign(tenantDb.documentTemplates?.[0]?.template),
  })

  const pdf = await renderPDF(React.createElement(DiplomePDF, {
    tenant,
    student: {
      firstName: 'PRÉNOMS', lastName: 'NOM DU LAURÉAT', matricule: 'MATRICULE',
      dateOfBirth: '2000-01-01', placeOfBirth: tenant.city || tenant.country || '',
      program: 'Intitulé officiel du programme', level: 'Niveau terminal',
    },
    diploma: {
      title: 'INTITULÉ DU DIPLÔME', program: 'Intitulé officiel du programme',
      date: new Date().toISOString(), credits: 180, mention: 'Bien',
    },
    docNumber: 'APERÇU-INSTITUTION', verificationCode: 'APERÇU', isSigned: false,
  }))

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="apercu-diplome.pdf"',
      'Cache-Control': 'private, no-store, max-age=0',
    },
  })
}

export const GET = withTenantAuth(handleGet, ['SUPER_ADMIN', 'ADMIN_INSTITUTION'])
