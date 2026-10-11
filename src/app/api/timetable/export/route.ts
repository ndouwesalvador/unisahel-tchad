import { NextRequest, NextResponse } from 'next/server'
import React from 'react'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { readVisibleTimetable, TimetableAccessError } from '@/lib/timetable/visible-timetable'
import { renderArabicHeader, renderArabicMotto } from '@/lib/pdf/arabic-header'
import { parseHeaderLines } from '@/lib/institution-branding'
import { prepareDocumentArtwork } from '@/lib/pdf/artwork'
import { paginateTimetable, renderPDF, TimetablePDF } from '@/lib/pdf/templates'
import { countPdfPages, type TenantInfo } from '@/lib/pdf/utils'

const DRAFT_ROLES = new Set(['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE', 'FACULTE', 'DEPARTEMENT'])

async function handleGet(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const academicYearId = request.nextUrl.searchParams.get('academicYearId') || undefined
    const programId = request.nextUrl.searchParams.get('programId') || undefined
    const levelId = request.nextUrl.searchParams.get('levelId') || undefined
    if (!academicYearId) return NextResponse.json({ error: 'Année académique requise.' }, { status: 400 })
    if (DRAFT_ROLES.has(user.role) && (!programId || !levelId)) {
      return NextResponse.json({ error: 'Sélectionnez une filière et un niveau avant l’export.' }, { status: 400 })
    }

    const timetable = await readVisibleTimetable(user, tenantId, { academicYearId, programId, levelId })
    if (timetable.slots.length === 0) {
      return NextResponse.json({ error: 'Aucun créneau disponible pour cette sélection.' }, { status: 409 })
    }
    const effectiveProgramId = timetable.registration?.programId || programId
    const effectiveLevelId = timetable.registration?.levelId || levelId

    const [tenantDb, academicYear, program, level] = await Promise.all([
      db.tenant.findUnique({ where: { id: tenantId }, select: {
        id: true, name: true, shortName: true, address: true, city: true, country: true,
        ministry: true, phone: true, email: true, website: true, logo: true, secondaryLogo: true, thirdLogo: true,
        headerLanguageMode: true, arabicCountry: true, arabicName: true, arabicMinistry: true, arabicMotto: true,
        contactPlacement: true, headerLinesFr: true, headerLinesAr: true, motto: true,
      } }),
      db.academicYear.findFirst({ where: { id: academicYearId, tenantId }, select: { name: true } }),
      effectiveProgramId ? db.program.findFirst({ where: { id: effectiveProgramId, tenantId }, select: { name: true } }) : null,
      effectiveLevelId ? db.level.findFirst({ where: { id: effectiveLevelId, program: { tenantId } }, select: { name: true } }) : null,
    ])
    if (!tenantDb || !academicYear) return NextResponse.json({ error: 'Institution ou année académique introuvable.' }, { status: 404 })

    const tenant: TenantInfo = await prepareDocumentArtwork({
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
      motto: tenantDb.motto || '',
      headerLinesFr: parseHeaderLines(tenantDb.headerLinesFr) ?? undefined,
      headerLinesAr: parseHeaderLines(tenantDb.headerLinesAr) ?? undefined,
      contactPlacement: tenantDb.contactPlacement,
      arabicMottoImage: renderArabicMotto({
        headerLanguageMode: tenantDb.headerLanguageMode,
        arabicMotto: tenantDb.arabicMotto,
      }),
      arabicHeaderImage: renderArabicHeader({
        headerLanguageMode: tenantDb.headerLanguageMode,
        headerLinesAr: parseHeaderLines(tenantDb.headerLinesAr) ?? undefined,
        arabicCountry: tenantDb.arabicCountry || '',
        arabicMinistry: tenantDb.arabicMinistry || '',
        arabicName: tenantDb.arabicName || '',
      }),
    })
    const scopeLabel = program && level
      ? `${program.name} · ${level.name}`
      : user.role === 'ENSEIGNANT'
        ? `Enseignant : ${`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'compte connecté'}`
        : 'Vue institutionnelle'
    const pdf = await renderPDF(React.createElement(TimetablePDF, {
      tenant,
      slots: timetable.slots,
      academicYear: academicYear.name,
      scopeLabel,
      source: timetable.source,
    }))
    if (countPdfPages(pdf) !== paginateTimetable(timetable.slots).length) {
      return NextResponse.json({ error: 'La mise en page de l’emploi du temps est incohérente.' }, { status: 409 })
    }
    return new NextResponse(new Uint8Array(pdf), { headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="emploi_du_temps.pdf"',
      'Cache-Control': 'private, no-store',
    } })
  } catch (error) {
    if (error instanceof TimetableAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    // eslint-disable-next-line no-console
    console.error('Timetable PDF export error:', error)
    return NextResponse.json({ error: 'Export PDF impossible.' }, { status: 500 })
  }
}

export const GET = withTenantAuth(handleGet)
