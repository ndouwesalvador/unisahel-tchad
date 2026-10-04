import { NextRequest, NextResponse } from 'next/server'
import React from 'react'
import QRCode from 'qrcode'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { isStudentSelfRole, resolveOwnStudentId } from '@/lib/auth/student-scope'
import { getOrganizationScope } from '@/lib/auth/organization-scope'
import { countPdfPages, getVerificationUrl, type StudentInfo, type TenantInfo } from '@/lib/pdf/utils'
import {
  renderPDF, ReleveNotesPDF, AttestationInscriptionPDF, CertificatScolaritePDF,
  AttestationNiveauPDF, DiplomePDF, PVDeliberationPDF,
} from '@/lib/pdf/templates'
import { expectedPvSheetCount, type PvSection } from '@/lib/pdf/pv-matrix'

const STAFF_ROLES = new Set(['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'RECTORAT', 'SCOLARITE'])

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

// Re-render the immutable saved snapshot with its original reference and QR
// code. A download must never create a second OfficialDocument record.
async function handleGet(user: SessionUser, tenantId: string, request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Document requis.' }, { status: 400 })
  const document = await db.officialDocument.findFirst({ where: { id, tenantId } })
  if (!document) return NextResponse.json({ error: 'Document introuvable.' }, { status: 404 })

  if (!isStudentSelfRole(user.role) && !STAFF_ROLES.has(user.role) &&
      (document.type !== 'PV_DELIBERATION' || !['JURY', 'FACULTE', 'DEPARTEMENT'].includes(user.role))) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
  }
  if (isStudentSelfRole(user.role)) {
    const ownStudentId = await resolveOwnStudentId(user)
    if (!ownStudentId || document.studentId !== ownStudentId) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
    }
  }

  let snapshot: unknown
  try { snapshot = JSON.parse(document.content) } catch {
    return NextResponse.json({ error: 'Contenu historique illisible.' }, { status: 409 })
  }
  if (!record(snapshot) || snapshot.type !== document.type || !record(snapshot.tenant)) {
    return NextResponse.json({ error: 'Contenu historique incohérent.' }, { status: 409 })
  }

  if (!isStudentSelfRole(user.role) && !STAFF_ROLES.has(user.role)) {
    const departmentId = snapshot.departmentId
    if (typeof departmentId !== 'string') {
      return NextResponse.json({ error: 'Département inaccessible.' }, { status: 403 })
    }
    const allowed = user.role === 'JURY'
      ? Boolean(await db.user.findFirst({ where: {
          id: user.id, tenantId, role: 'JURY', isActive: true, departmentId,
          department: { isActive: true },
        }, select: { id: true } }))
      : Boolean((await getOrganizationScope(user, tenantId))?.departmentIds.includes(departmentId))
    if (!allowed) {
      return NextResponse.json({ error: 'Département inaccessible.' }, { status: 403 })
    }
  }

  if (!document.number || !document.verificationCode) {
    return NextResponse.json({ error: 'Référence historique incomplète : PDF non reproductible.' }, { status: 409 })
  }
  const tenant = snapshot.tenant as unknown as TenantInfo
  const student = record(snapshot.student) ? snapshot.student as unknown as StudentInfo : null
  const docNumber = document.number
  const verificationCode = document.verificationCode
  const qrCodeDataUrl = await QRCode.toDataURL(getVerificationUrl(verificationCode), {
    width: 200, margin: 1, color: { dark: '#1a2744', light: '#ffffff' },
  })
  const isSigned = Boolean(document.validatedAt)
  const common = { tenant, docNumber, verificationCode, qrCodeDataUrl, isSigned }
  let pdf: React.ReactElement

  switch (document.type) {
    case 'RELEVE_NOTES': {
      if (!student || !Array.isArray(snapshot.ueGrades) || typeof snapshot.academicYear !== 'string') break
      pdf = React.createElement(ReleveNotesPDF, { ...common, student, semester: String(snapshot.semester ?? ''),
        academicYear: snapshot.academicYear, ueGrades: snapshot.ueGrades as Parameters<typeof ReleveNotesPDF>[0]['ueGrades'],
        jury: record(snapshot.jury) ? snapshot.jury as Parameters<typeof ReleveNotesPDF>[0]['jury'] : undefined })
      const transcript = await renderPDF(pdf)
      if (countPdfPages(transcript) !== 1) {
        return NextResponse.json({ error: 'Ce relevé historique ne tient pas sur une page avec la maquette actuelle.' }, { status: 409 })
      }
      return pdfResponse(transcript, document.type, docNumber)
    }
    case 'ATTESTATION_INSCRIPTION':
    case 'CERTIFICAT_SCOLARITE': {
      if (!student || typeof snapshot.academicYear !== 'string') break
      const Template = document.type === 'ATTESTATION_INSCRIPTION' ? AttestationInscriptionPDF : CertificatScolaritePDF
      pdf = React.createElement(Template, { ...common, student, academicYear: snapshot.academicYear,
        issuedAt: typeof snapshot.issuedAt === 'string' ? snapshot.issuedAt : document.createdAt.toISOString() })
      return pdfResponse(await renderPDF(pdf), document.type, docNumber)
    }
    case 'ATTESTATION_NIVEAU': {
      if (!student || !record(snapshot.award) || !document.academicYearId) break
      const savedYear = typeof snapshot.academicYear === 'string' ? snapshot.academicYear : null
      const historicYear = savedYear ? null : await db.academicYear.findFirst({ where: { id: document.academicYearId, tenantId }, select: { name: true } })
      if (!savedYear && !historicYear) break
      pdf = React.createElement(AttestationNiveauPDF, { ...common, student, academicYear: savedYear || historicYear!.name,
        award: snapshot.award as Parameters<typeof AttestationNiveauPDF>[0]['award'] })
      return pdfResponse(await renderPDF(pdf), document.type, docNumber)
    }
    case 'DIPLOME':
      if (!student || !record(snapshot.diploma)) break
      pdf = React.createElement(DiplomePDF, { ...common, student,
        diploma: snapshot.diploma as Parameters<typeof DiplomePDF>[0]['diploma'] })
      return pdfResponse(await renderPDF(pdf), document.type, docNumber)
    case 'PV_DELIBERATION': {
      if (!record(snapshot.session) || !Array.isArray(snapshot.members) || !Array.isArray(snapshot.students) ||
          typeof snapshot.departmentName !== 'string' || typeof snapshot.academicYear !== 'string') break
      const department = typeof snapshot.departmentId === 'string'
        ? await db.department.findFirst({ where: { id: snapshot.departmentId, tenantId }, select: { headName: true } }) : null
      pdf = React.createElement(PVDeliberationPDF, { ...common, departmentName: snapshot.departmentName,
        departmentHeadName: typeof snapshot.departmentHeadName === 'string' ? snapshot.departmentHeadName : department?.headName ?? undefined,
        session: snapshot.session as Parameters<typeof PVDeliberationPDF>[0]['session'],
        members: snapshot.members as Parameters<typeof PVDeliberationPDF>[0]['members'],
        students: snapshot.students as Parameters<typeof PVDeliberationPDF>[0]['students'],
        sections: Array.isArray(snapshot.sections) ? snapshot.sections as PvSection[] : undefined,
        academicYear: snapshot.academicYear })
      const pv = await renderPDF(pdf)
      if (Array.isArray(snapshot.sections) && countPdfPages(pv) !== expectedPvSheetCount(snapshot.sections as PvSection[])) {
        return NextResponse.json({ error: 'Le PV historique déborde des feuilles A3 prévues.' }, { status: 409 })
      }
      return pdfResponse(pv, document.type, docNumber)
    }
  }
  return NextResponse.json({ error: 'Ce type de document historique ne peut pas être reproduit.' }, { status: 409 })
}

function pdfResponse(buffer: Buffer, type: string, number: string) {
  return new NextResponse(new Uint8Array(buffer), { headers: {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${type}_${number}.pdf"`,
    'X-Doc-Number': number,
    'Cache-Control': 'private, no-store',
  } })
}

export const GET = withTenantAuth(handleGet)
