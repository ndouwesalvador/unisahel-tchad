import { NextRequest, NextResponse } from 'next/server'
import React from 'react'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { renderArabicHeader } from '@/lib/pdf/arabic-header'
import { prepareDocumentArtwork } from '@/lib/pdf/artwork'
import { ListeEtudiantsPDF, paginateStudentList, renderPDF } from '@/lib/pdf/templates'
import { countPdfPages, type TenantInfo } from '@/lib/pdf/utils'

async function handlePost(_user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const ids = body?.studentIds
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 1000 ||
        ids.some((id) => typeof id !== 'string' || !id || id.length > 100)) {
      return NextResponse.json({ error: 'Sélection invalide (1 000 étudiants maximum).' }, { status: 400 })
    }
    const uniqueIds = [...new Set(ids as string[])]
    const [tenantDb, currentYear, studentRows] = await Promise.all([
      db.tenant.findUnique({ where: { id: tenantId }, select: {
        id: true, name: true, shortName: true, address: true, city: true, country: true,
        ministry: true, phone: true, email: true, website: true, logo: true,
        headerLanguageMode: true, arabicCountry: true, arabicName: true, arabicMinistry: true, motto: true,
      } }),
      db.academicYear.findFirst({ where: { tenantId, isCurrent: true }, select: { name: true } }),
      db.student.findMany({ where: { tenantId, id: { in: uniqueIds } },
        select: { id: true, firstName: true, lastName: true, matricule: true, gender: true, status: true,
          currentProgram: { select: { name: true } }, currentLevel: { select: { name: true } } },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
    ])
    if (!tenantDb || studentRows.length !== uniqueIds.length) {
      return NextResponse.json({ error: 'Institution ou sélection d’étudiants introuvable.' }, { status: 404 })
    }
    const tenant: TenantInfo = await prepareDocumentArtwork({
      id: tenantDb.id, name: tenantDb.name, shortName: tenantDb.shortName || '',
      address: tenantDb.address || '', city: tenantDb.city || '', country: tenantDb.country || '',
      ministry: tenantDb.ministry || '', phone: tenantDb.phone || '', email: tenantDb.email || '',
      website: tenantDb.website || '', logo: tenantDb.logo || '', motto: tenantDb.motto || '',
      arabicHeaderImage: renderArabicHeader({ headerLanguageMode: tenantDb.headerLanguageMode,
        arabicCountry: tenantDb.arabicCountry || '', arabicMinistry: tenantDb.arabicMinistry || '',
        arabicName: tenantDb.arabicName || '' }),
    })
    const students = studentRows.map((student) => ({
      name: `${student.lastName} ${student.firstName}`.trim(), matricule: student.matricule || '',
      gender: student.gender || '', status: student.status,
      program: student.currentProgram?.name || '', level: student.currentLevel?.name || '',
    }))
    const programs = new Set(students.map((student) => student.program).filter(Boolean))
    const levels = new Set(students.map((student) => student.level).filter(Boolean))
    const pdf = await renderPDF(React.createElement(ListeEtudiantsPDF, {
      tenant, students, program: programs.size === 1 ? [...programs][0] : '',
      level: levels.size === 1 ? [...levels][0] : '', academicYear: currentYear?.name || '',
    }))
    if (countPdfPages(pdf) !== paginateStudentList(students, programs.size === 1 ? [...programs][0] : '').length) {
      return NextResponse.json({ error: 'La liste dépasse la mise en page prévue ; réduisez la sélection ou les libellés.' }, { status: 409 })
    }
    return new NextResponse(new Uint8Array(pdf), { headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="liste_etudiants.pdf"',
      'Cache-Control': 'private, no-store',
    } })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Student PDF export error:', error)
    return NextResponse.json({ error: 'Export PDF impossible.' }, { status: 500 })
  }
}

export const POST = withTenantAuth(handlePost, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE', 'RECTORAT'])
