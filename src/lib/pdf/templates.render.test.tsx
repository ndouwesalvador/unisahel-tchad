import React from 'react'
import { describe, expect, it } from 'vitest'
import { countPdfPages } from './utils'
import { AttestationInscriptionPDF, AttestationNiveauPDF, CertificatScolaritePDF, DiplomePDF, ListeEtudiantsPDF, PVDeliberationPDF, ReleveNotesPDF, renderPDF } from './templates'
import type { PvSection } from './pv-matrix'
import { renderArabicHeader } from './arabic-header'
import { prepareDocumentArtwork, prepareDocumentPhoto } from './artwork'
import sharp from 'sharp'
import QRCode from 'qrcode'

const tenant = { name: 'UNIVERSITÉ POLYTECHNIQUE DE MONGO', shortName: 'UPDM',
  country: 'Tchad', ministry: 'Ministère de l’Enseignement supérieur', city: 'Mongo',
  arabicHeaderImage: renderArabicHeader({ headerLanguageMode: 'FR_AR', arabicCountry: 'جمهورية تشاد', arabicMinistry: 'وزارة التعليم العالي', arabicName: 'جامعة مونقو التقنية' }) }
const student = { firstName: 'Leila', lastName: 'VALIDATION-DEV', matricule: 'UPDM-DEV-001',
  program: 'Diplôme universitaire de maintenance numérique — VALIDATION DEV', level: 'Année unique' }

async function savePreview(name: string, data: Buffer) {
  if (!process.env.PDF_PREVIEW_DIR) return
  const { mkdir, writeFile } = await import('node:fs/promises')
  const { join } = await import('node:path')
  await mkdir(process.env.PDF_PREVIEW_DIR, { recursive: true })
  await writeFile(join(process.env.PDF_PREVIEW_DIR, name), data)
}

describe('printed academic documents', () => {
  it('never adds Arabic unless the institution explicitly selects and writes it', () => {
    expect(renderArabicHeader({ arabicCountry: 'جمهورية تشاد', arabicName: 'جامعة مونقو التقنية' })).toBeUndefined()
    expect(renderArabicHeader({ headerLanguageMode: 'FR_ONLY', arabicCountry: 'جمهورية تشاد' })).toBeUndefined()
    expect(renderArabicHeader({ headerLanguageMode: 'FR_AR', arabicCountry: 'جمهورية تشاد', arabicName: 'جامعة مونقو التقنية' })).toMatch(/^data:image\/png;base64,/)
  })

  it('keeps a complete annual transcript on one A4 page', async () => {
    const ueGrades = Array.from({ length: 6 }, (_, i) => ({ ue: `Unité ${i + 1} — VALIDATION DEV`,
      code: `DEV-UE${i + 1}`, credits: 10, moyenne: 15,
      notes: [{ ec: `Matière appliquée ${i + 1} — VALIDATION DEV`, code: `DEV-EC${i + 1}`,
        coef: 1, cc: 15, tp: i % 2 ? 14 : undefined, exam: 16, final: 15 }],
    }))
    const pdf = await renderPDF(React.createElement(ReleveNotesPDF, { tenant, student, ueGrades,
      semester: 'Deux semestres', academicYear: '2026-2027', jury: {
        average: 15, creditsAcquired: 60, decision: 'ADMI', date: '2026-10-01',
      }, docNumber: 'RN-DEV-001', verificationCode: 'TESTCODE', isSigned: true }))
    await savePreview('releve-design-a4.pdf', pdf)
    expect(countPdfPages(pdf)).toBe(1)
    expect(pdf.toString('latin1')).toMatch(/\/MediaBox \[0 0 595\.28\d* 841\.89\d*\]/)
  })

  it('fits the deployed six-unit curriculum with the real-length labels, QR and two signers', async () => {
    const qrCodeDataUrl = await QRCode.toDataURL('https://unisahel-tchad.vercel.app/verify?code=TEST-LIVE-LENGTH')
    const units = [
      ['MATHÉMATIQUES APPLIQUÉES', 'Outils mathématiques pour la maintenance'],
      ['ÉLECTRICITÉ INDUSTRIELLE', 'Électricité et mesures'],
      ['PROGRAMMATION DES AUTOMATES', 'Automates programmables'],
      ['MAINTENANCE PRÉVENTIVE', 'Diagnostic et maintenance'],
      ['SYSTÈMES NUMÉRIQUES', 'Réseaux et systèmes embarqués'],
      ['PROJET TUTORÉ', 'Projet de maintenance numérique'],
    ]
    const ueGrades = units.map(([ue, ec], index) => ({
      ue: `${ue} — VALIDATION DEV`, code: `DEV-UE${index + 1}`, credits: 10, moyenne: 15,
      notes: [{ ec: `${ec} — VALIDATION DEV`, coef: 1, cc: 15, tp: 14, exam: 16, final: 15 }],
    }))
    const pdf = await renderPDF(React.createElement(ReleveNotesPDF, {
      tenant: { ...tenant, arabicHeaderImage: renderArabicHeader({ headerLanguageMode: 'FR_AR', arabicCountry: 'جمهورية تشاد',
        arabicMinistry: 'وزارة التعليم العالي', arabicName: 'جامعة مونقو المتعددة التقنيات' }),
        address: '19 Rue Chevreul', city: 'NDJAMENA', phone: '63443731', email: 'test@example.org',
        rectorName: 'Responsable de l’établissement', secondarySignerName: 'Président du jury', secondarySignerTitle: 'Président du jury' },
      student: { ...student, firstName: 'Leila', lastName: 'VALIDATION-DEV', matricule: 'UNSH-2026-DU1-DEV-000001',
        level: 'Année unique — VALIDATION DEV' }, qrCodeDataUrl, ueGrades,
      semester: 'Plusieurs semestres', academicYear: '2026-2027', jury: { average: 15.6, creditsAcquired: 60,
        decision: 'ADMI', date: '2026-10-04' }, docNumber: 'RN-TEST-LIVE-LENGTH', verificationCode: 'TEST-LIVE-LENGTH', isSigned: true,
    }))
    await savePreview('releve-regression-production.pdf', pdf)
    expect(countPdfPages(pdf)).toBe(1)
  })

  it('uses one A4 sheet for a dense transcript', async () => {
    const ueGrades = Array.from({ length: 10 }, (_, i) => ({ ue: `Unité ${i + 1}`,
      code: `UE${i + 1}`, credits: 6, moyenne: 13,
      notes: Array.from({ length: 3 }, (_, j) => ({ ec: `Matière professionnelle ${i + 1}.${j + 1}`,
        code: `EC${i + 1}${j + 1}`, coef: 1, cc: 12, exam: 14, final: 13 })),
    }))
    const pdf = await renderPDF(React.createElement(ReleveNotesPDF, { tenant: { ...tenant,
      logo: tenant.arabicHeaderImage, stamp: tenant.arabicHeaderImage, signature: tenant.arabicHeaderImage }, student, ueGrades,
      semester: 'Deux semestres', academicYear: '2026-2027', docNumber: 'RN-DEV-DENSE',
      verificationCode: 'DENSETEST', isSigned: true }))
    await savePreview('releve-design-dense.pdf', pdf)
    expect(countPdfPages(pdf)).toBe(1)
    expect(pdf.toString('latin1')).toMatch(/\/MediaBox \[0 0 595\.28\d* 841\.89\d*\]/)
  })

  it('keeps a licence-style transcript with twenty subjects on one A4 sheet', async () => {
    const ueGrades = Array.from({ length: 4 }, (_, i) => ({ ue: `Unité de spécialité ${i + 1}`,
      code: `UE${i + 1}`, credits: 15, moyenne: 12.5,
      notes: Array.from({ length: 5 }, (_, j) => ({ ec: `Matière ${i + 1}.${j + 1} et applications industrielles`,
        coef: 1, cc: 12, exam: 13, final: 12.5 })),
    }))
    const pdf = await renderPDF(React.createElement(ReleveNotesPDF, { tenant, student, ueGrades,
      semester: 'Deux semestres', academicYear: '2026-2027', docNumber: 'RN-DEV-LICENCE',
      verificationCode: 'LICENCETEST', isSigned: true }))
    await savePreview('releve-design-licence.pdf', pdf)
    expect(countPdfPages(pdf)).toBe(1)
  })

  it('prints cropped institutional logo and two readable signer blocks on both documents', async () => {
    const logoSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><circle cx="200" cy="200" r="155" fill="#176341"/><circle cx="200" cy="200" r="125" fill="white"/><path d="M130 240 L200 105 L270 240 Z" fill="#176341"/></svg>')
    const signatureSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="500" height="160"><path d="M10 118 Q 55 5 82 115 T 162 97 Q 220 18 251 103 T 390 88 L 485 56" fill="none" stroke="#142a52" stroke-width="7"/></svg>')
    const raw = { ...tenant, id: 'institution-a', rectorName: 'Amina Responsable', rectorTitle: 'Rectrice',
      secondarySignerName: 'Youssouf Président', secondarySignerTitle: 'Président du jury',
      logo: `data:image/png;base64,${(await sharp(logoSvg).png().toBuffer()).toString('base64')}`,
      signature: `data:image/png;base64,${(await sharp(signatureSvg).png().toBuffer()).toString('base64')}`,
      secondarySignature: `data:image/png;base64,${(await sharp(signatureSvg).png().toBuffer()).toString('base64')}` }
    const branded = await prepareDocumentArtwork(raw)
    const diploma = await renderPDF(React.createElement(DiplomePDF, { tenant: branded, student,
      diploma: { title: 'Licence en génie industriel', program: 'Génie industriel', date: '2026-10-01', credits: 180 },
      docNumber: 'DIP-BRAND-001', verificationCode: 'BRANDTEST', isSigned: true }))
    const photoSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="#dbe9e2"/><circle cx="120" cy="85" r="40" fill="#176341"/><path d="M35 220 Q40 145 120 145 Q200 145 205 220" fill="#176341"/></svg>')
    const photo = await prepareDocumentPhoto(`data:image/png;base64,${(await sharp(photoSvg).png().toBuffer()).toString('base64')}`)
    const qrCodeDataUrl = await QRCode.toDataURL('https://unisahel-tchad.vercel.app/verify?code=BRANDTEST')
    const transcript = await renderPDF(React.createElement(ReleveNotesPDF, { tenant: branded, student: { ...student, photo }, qrCodeDataUrl,
      ueGrades: [{ ue: 'Génie industriel', code: 'UE1', credits: 30, moyenne: 15,
        notes: [{ ec: 'Mécanique appliquée', coef: 1, cc: 15, exam: 15, final: 15 }] }],
      semester: 'Semestre 1', academicYear: '2026-2027', docNumber: 'RN-BRAND-001',
      verificationCode: 'BRANDTEST', isSigned: true }))
    expect(countPdfPages(diploma)).toBe(1)
    expect(countPdfPages(transcript)).toBe(1)
    expect((diploma.toString('latin1').match(/\/Subtype \/Image/g) || []).length).toBeGreaterThanOrEqual(3)
    expect((transcript.toString('latin1').match(/\/Subtype \/Image/g) || []).length).toBeGreaterThanOrEqual(5)
    await savePreview('diplome-deux-signataires.pdf', diploma)
    await savePreview('releve-deux-signataires.pdf', transcript)
  })

  it('repeats the same institutional header on every student-list sheet', async () => {
    const entries = Array.from({ length: 39 }, (_, index) => ({
      name: `ÉTUDIANT ${String(index + 1).padStart(2, '0')} TEST DE MAQUETTE`,
      matricule: `UPDM-DEV-${String(index + 1).padStart(3, '0')}`, gender: index % 2 ? 'F' : 'M',
      program: 'Génie industriel et maintenance', level: 'Licence 1', status: 'INSCRIT',
    }))
    const pdf = await renderPDF(React.createElement(ListeEtudiantsPDF, { tenant, students: entries,
      academicYear: '2026-2027', program: 'Génie industriel et maintenance', level: 'Licence 1' }))
    expect(countPdfPages(pdf)).toBe(3)
    expect(pdf.toString('latin1')).toMatch(/\/MediaBox \[0 0 841\.89\d* 595\.28\d*\]/)
    await savePreview('liste-etudiants-institutionnelle.pdf', pdf)
  })

  it('does not spill a student-list sheet when names and programs wrap', async () => {
    const entries = Array.from({ length: 15 }, (_, index) => ({
      name: `NDOUWE SALVADOR ${index + 1} NOM COMPOSÉ DE PLUSIEURS PRÉNOMS TEST DE MISE EN PAGE`,
      matricule: `UPDM-DEV-${index + 1}`, gender: 'M', status: 'INSCRIT', level: 'Licence 3',
      program: 'Sciences et techniques industrielles appliquées aux systèmes de production et de maintenance',
    }))
    const pdf = await renderPDF(React.createElement(ListeEtudiantsPDF, { tenant, students: entries, academicYear: '2026-2027' }))
    expect(countPdfPages(pdf)).toBe(3)
    await savePreview('liste-etudiants-libelles-longs.pdf', pdf)
  })

  it('keeps the institutional emblem centered when Arabic is disabled', async () => {
    const pdf = await renderPDF(React.createElement(ListeEtudiantsPDF, {
      tenant: { ...tenant, arabicHeaderImage: undefined }, students: [], academicYear: '2026-2027',
    }))
    expect(countPdfPages(pdf)).toBe(1)
    await savePreview('liste-etudiants-fr-seul.pdf', pdf)
  })

  it('tiles a department PV by columns and students with matching row numbers', async () => {
    const columns: PvSection['columns'] = Array.from({ length: 14 }, (_, i) => ({
      key: `EC:${i}`, ueCode: `UE${Math.floor(i / 2) + 1}`, code: `MAT${i + 1}`,
      label: `Matière technique ${i + 1}`, kind: i % 2 ? 'UE' : 'EC',
    }))
    const sections: PvSection[] = [{ program: 'Génie industriel et maintenance — VALIDATION DEV',
      level: 'Licence 1', columns, students: Array.from({ length: 21 }, (_, i) => ({
        name: `ÉTUDIANT ${String(i + 1).padStart(2, '0')} VALIDATION DEV`,
        matricule: `UPDM-DEV-${String(i + 1).padStart(3, '0')}`,
        grades: Object.fromEntries(columns.map((column, j) => [column.key, 11 + (j % 6)])),
        average: i % 3 ? 13.5 : 8.75, decision: i % 3 ? 'ADMI' : 'AJOURNE',
      })) }]
    const pdf = await renderPDF(React.createElement(PVDeliberationPDF, { tenant,
      departmentName: 'Génie industriel et maintenance', departmentHeadName: 'Responsable VALIDATION DEV',
      session: { name: 'Délibération annuelle', date: '2026-10-01', type: 'ANNUEL' },
      members: Array.from({ length: 12 }, (_, index) => ({ name: `Membre du jury ${index + 1}`,
        role: index === 0 ? 'President' : 'Membre',
        signature: index % 2 === 0 ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6p8Z8AAAAASUVORK5CYII=' : undefined })), sections,
      students: [], academicYear: '2026-2027', docNumber: 'PV-DEV-001',
      verificationCode: 'PVTESTCODE', isSigned: true }))
    expect(countPdfPages(pdf)).toBe(4)
    expect(pdf.toString('latin1')).toMatch(/\/MediaBox \[0 0 1190\.55\d* 841\.89\d*\]/)
    await savePreview('pv-affichage-a3.pdf', pdf)
  })

  it('prints a compact A4 landscape PV with the complete twelve-member jury', async () => {
    const columns: PvSection['columns'] = Array.from({ length: 6 }, (_, index) => ({ key: `EC:${index}`,
      ueCode: 'UE-1', code: `EC-${index}`, label: `Matière ${index}`, kind: 'EC' }))
    const sections: PvSection[] = [{ program: 'Maintenance industrielle', level: 'Licence 1', columns,
      students: Array.from({ length: 3 }, (_, index) => ({ name: `Étudiant ${index + 1}`,
        matricule: `DEV-${index + 1}`, grades: Object.fromEntries(columns.map((column) => [column.key, 13])),
        average: 13, decision: 'ADMI' })) }]
    const members = Array.from({ length: 12 }, (_, index) => ({ name: `Membre ${index + 1}`, role: index ? 'Membre' : 'President' }))
    const pdf = await renderPDF(React.createElement(PVDeliberationPDF, { tenant, departmentName: 'Génie industriel',
      session: { name: 'Jury annuel', date: '2026-10-01', type: 'ANNUEL' }, members, sections,
      students: [], academicYear: '2026-2027', docNumber: 'PV-A4-001', verificationCode: 'PVTESTA4',
      isSigned: true, pageFormat: 'A4' }))
    expect(countPdfPages(pdf)).toBe(1)
    expect(pdf.toString('latin1')).toContain('/MediaBox [0 0 841.890')
    await savePreview('pv-affichage-a4.pdf', pdf)
  })

  it('keeps attestations and diploma consistent on one A4 sheet each', async () => {
    const common = { tenant, student, verificationCode: 'ATTESTDEV', isSigned: true }
    const documents = [
      ['attestation-inscription.pdf', React.createElement(AttestationInscriptionPDF, { ...common,
        academicYear: '2026-2027', issuedAt: '2026-10-01', docNumber: 'AI-DEV-001' })],
      ['certificat-scolarite.pdf', React.createElement(CertificatScolaritePDF, { ...common,
        academicYear: '2026-2027', issuedAt: '2026-10-01', docNumber: 'CS-DEV-001' })],
      ['attestation-niveau.pdf', React.createElement(AttestationNiveauPDF, { ...common,
        academicYear: '2026-2027', award: { credits: 60, level: 'Master I',
          program: 'Électrotechnique, énergies et automatique', juryDate: '2026-09-30' }, docNumber: 'AN-DEV-001' })],
      ['diplome.pdf', React.createElement(DiplomePDF, { ...common,
        diploma: { title: 'Diplôme universitaire', program: student.program!, mention: 'Bien',
          date: '2026-09-30', credits: 60 }, docNumber: 'DIP-DEV-001' })],
    ] as const
    for (const [name, element] of documents) {
      const pdf = await renderPDF(element)
      await savePreview(name, pdf)
      expect(countPdfPages(pdf), name).toBe(1)
      expect(pdf.toString('latin1')).toContain(name === 'diplome.pdf' ? '/MediaBox [0 0 841.890' : '/MediaBox [0 0 595.280')
      await savePreview(name, pdf)
    }
  })
})
