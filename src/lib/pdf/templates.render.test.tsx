import React from 'react'
import { describe, expect, it } from 'vitest'
import { countPdfPages } from './utils'
import { AttestationInscriptionPDF, AttestationNiveauPDF, CertificatScolaritePDF, DiplomePDF, ListeEtudiantsPDF, PVDeliberationPDF, ReleveNotesPDF, renderPDF } from './templates'
import { expectedPvSheetCount, type PvSection } from './pv-matrix'
import { renderArabicHeader, renderArabicMotto } from './arabic-header'
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
    expect(renderArabicMotto({ headerLanguageMode: 'FR_ONLY', arabicMotto: 'وحدة - عمل - تقدم' })).toBeUndefined()
    expect(renderArabicMotto({ headerLanguageMode: 'FR_AR', arabicMotto: 'وحدة - عمل - تقدم' })).toMatch(/^data:image\/png;base64,/)
  })

  it('prints configurable institution lines in both columns on a single A4 page', async () => {
    const arabicLines = Array.from({ length: 8 }, (_, index) => `المؤسسة التعليمية ${index + 1}`)
    const customTenant = { ...tenant,
      headerLinesFr: Array.from({ length: 8 }, (_, index) => `Autorité académique ${index + 1}`),
      headerLinesAr: arabicLines,
      arabicHeaderImage: renderArabicHeader({ headerLanguageMode: 'FR_AR', headerLinesAr: arabicLines }),
      arabicMottoImage: renderArabicMotto({ headerLanguageMode: 'FR_AR', arabicMotto: 'وحدة - عمل - تقدم' }),
      primaryColor: '#374151', accentColor: '#b08c37',
    }
    const pdf = await renderPDF(React.createElement(AttestationInscriptionPDF, {
      tenant: customTenant, student, academicYear: '2026-2027', docNumber: 'DEV-123', verificationCode: 'DEVTEST', isSigned: false,
    }))
    await savePreview('header-configurable-a4.pdf', pdf)
    expect(countPdfPages(pdf)).toBe(1)
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

  it('fits the deployed six-unit curriculum with the real-length labels, QR and three signers', async () => {
    const qrCodeDataUrl = await QRCode.toDataURL('https://unisahel-tchad.vercel.app/verify?code=TEST-LIVE-LENGTH')
    const signatureSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="500" height="160"><path d="M10 118 Q 55 5 82 115 T 162 97 Q 220 18 251 103 T 390 88 L 485 56" fill="none" stroke="#142a52" stroke-width="7"/></svg>')
    const logoSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><circle cx="200" cy="200" r="155" fill="#176341"/><circle cx="200" cy="200" r="125" fill="white"/><path d="M130 240 L200 105 L270 240 Z" fill="#176341"/></svg>')
    const signature = `data:image/png;base64,${(await sharp(signatureSvg).png().toBuffer()).toString('base64')}`
    const logo = `data:image/png;base64,${(await sharp(logoSvg).png().toBuffer()).toString('base64')}`
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
        rectorName: 'Responsable de l’établissement', secondarySignerName: 'Président du jury', secondarySignerTitle: 'Président du jury',
        thirdSignerName: 'Chef du département', thirdSignerTitle: 'Chef du département',
        logo, stamp: logo, signature, secondarySignature: signature, thirdSignature: signature },
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
    const sealSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><circle cx="200" cy="200" r="165" fill="none" stroke="#3b6385" stroke-width="20"/><text x="200" y="220" text-anchor="middle" font-size="60" fill="#3b6385">UPDM</text></svg>')
    const signatureSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="500" height="160"><path d="M10 118 Q 55 5 82 115 T 162 97 Q 220 18 251 103 T 390 88 L 485 56" fill="none" stroke="#142a52" stroke-width="7"/></svg>')
    const seal = `data:image/png;base64,${(await sharp(sealSvg).png().toBuffer()).toString('base64')}`
    const signature = `data:image/png;base64,${(await sharp(signatureSvg).png().toBuffer()).toString('base64')}`
    const qrCodeDataUrl = await QRCode.toDataURL('https://unisahel-tchad.vercel.app/verify?code=DENSETEST')
    const pdf = await renderPDF(React.createElement(ReleveNotesPDF, { tenant: { ...tenant,
      logo: seal, stamp: seal, secondaryStamp: seal, signature, secondarySignature: signature,
      rectorName: 'Responsable de l’établissement', secondarySignerName: 'Président du jury', sealSizeMm: 40,
      address: 'Abéché, Tchad', city: 'Mongo', phone: '+235 63 44 37 31', email: 'insta-abeche@gmail.com' }, student, ueGrades, qrCodeDataUrl,
      semester: 'Deux semestres', academicYear: '2026-2027', docNumber: 'RN-DEV-DENSE',
      verificationCode: 'DENSETEST', isSigned: false,
      jury: { average: 13, creditsAcquired: 60, decision: 'ADMI', date: '2026-10-01' } }))
    await savePreview('releve-design-dense.pdf', pdf)
    expect(countPdfPages(pdf)).toBe(1)
    expect((pdf.toString('latin1').match(/\/Subtype \/Image/g) || []).length).toBeGreaterThanOrEqual(6)
    expect(pdf.toString('latin1')).toMatch(/\/MediaBox \[0 0 595\.28\d* 841\.89\d*\]/)
    const topContactPdf = await renderPDF(React.createElement(ReleveNotesPDF, { tenant: { ...tenant,
      contactPlacement: 'TOP', address: 'Abéché, Tchad', city: 'Mongo', phone: '+235 63 44 37 31',
      email: 'insta-abeche@gmail.com', stamp: seal, secondaryStamp: seal, signature, secondarySignature: signature,
      rectorName: 'Responsable de l’établissement', secondarySignerName: 'Président du jury', sealSizeMm: 40 },
      student, ueGrades, qrCodeDataUrl, semester: 'Deux semestres', academicYear: '2026-2027',
      docNumber: 'RN-DEV-DENSE-TOP', verificationCode: 'DENSETESTTOP', isSigned: false,
      jury: { average: 13, creditsAcquired: 60, decision: 'ADMI', date: '2026-10-01' } }))
    expect(countPdfPages(topContactPdf)).toBe(1)
    await savePreview('releve-design-dense-contact-haut.pdf', topContactPdf)
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

  it('prints cropped institutional logo and three readable signer blocks on the transcript', async () => {
    const logoSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><circle cx="200" cy="200" r="155" fill="#176341"/><circle cx="200" cy="200" r="125" fill="white"/><path d="M130 240 L200 105 L270 240 Z" fill="#176341"/></svg>')
    const signatureSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="500" height="160"><path d="M10 118 Q 55 5 82 115 T 162 97 Q 220 18 251 103 T 390 88 L 485 56" fill="none" stroke="#142a52" stroke-width="7"/></svg>')
    const raw = { ...tenant, id: 'institution-a', rectorName: 'Amina Responsable', rectorTitle: 'Rectrice',
      secondarySignerName: 'Youssouf Président', secondarySignerTitle: 'Président du jury',
      thirdSignerName: 'Fatima Cheffe', thirdSignerTitle: 'Cheffe du département',
      logo: `data:image/png;base64,${(await sharp(logoSvg).png().toBuffer()).toString('base64')}`,
      signature: `data:image/png;base64,${(await sharp(signatureSvg).png().toBuffer()).toString('base64')}`,
      secondarySignature: `data:image/png;base64,${(await sharp(signatureSvg).png().toBuffer()).toString('base64')}`,
      thirdSignature: `data:image/png;base64,${(await sharp(signatureSvg).png().toBuffer()).toString('base64')}`,
      stamp: `data:image/png;base64,${(await sharp(logoSvg).png().toBuffer()).toString('base64')}` }
    const branded = await prepareDocumentArtwork(raw)
    const diploma = await renderPDF(React.createElement(DiplomePDF, { tenant: branded, student,
      diploma: { title: 'Licence en génie industriel', program: 'Génie industriel', date: '2026-10-01', credits: 180 },
      docNumber: 'DIP-BRAND-001', verificationCode: 'BRANDTEST', isSigned: false }))
    const diplomaTwoSigners = await renderPDF(React.createElement(DiplomePDF, {
      tenant: { ...branded, thirdSignerName: undefined, thirdSignerTitle: undefined, thirdSignature: undefined, thirdStamp: undefined },
      student, diploma: { title: 'Licence en génie industriel', program: 'Génie industriel', date: '2026-10-01', credits: 180 },
      docNumber: 'DIP-BRAND-002', verificationCode: 'BRANDTEST2', isSigned: false }))
    const photoSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="#dbe9e2"/><circle cx="120" cy="85" r="40" fill="#176341"/><path d="M35 220 Q40 145 120 145 Q200 145 205 220" fill="#176341"/></svg>')
    const photo = await prepareDocumentPhoto(`data:image/png;base64,${(await sharp(photoSvg).png().toBuffer()).toString('base64')}`)
    const qrCodeDataUrl = await QRCode.toDataURL('https://unisahel-tchad.vercel.app/verify?code=BRANDTEST')
    const transcript = await renderPDF(React.createElement(ReleveNotesPDF, { tenant: branded, student: { ...student, photo }, qrCodeDataUrl,
      ueGrades: [{ ue: 'Génie industriel', code: 'UE1', credits: 30, moyenne: 15,
        notes: [{ ec: 'Mécanique appliquée', coef: 1, cc: 15, exam: 15, final: 15 }] }],
      semester: 'Semestre 1', academicYear: '2026-2027', docNumber: 'RN-BRAND-001',
      verificationCode: 'BRANDTEST', isSigned: false }))
    expect(countPdfPages(diploma)).toBe(1)
    expect(countPdfPages(diplomaTwoSigners)).toBe(1)
    expect(countPdfPages(transcript)).toBe(1)
    expect((diploma.toString('latin1').match(/\/Subtype \/Image/g) || []).length).toBeGreaterThanOrEqual(3)
    expect((transcript.toString('latin1').match(/\/Subtype \/Image/g) || []).length).toBeGreaterThanOrEqual(7)
    await savePreview('diplome-trois-signataires.pdf', diploma)
    await savePreview('diplome-deux-signataires.pdf', diplomaTwoSigners)
    await savePreview('releve-trois-signataires.pdf', transcript)
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

  it('renders sixty students and thirty course elements with every mark component on A3 panels', async () => {
    const columns: PvSection['columns'] = Array.from({ length: 10 }, (_, unit) => [
      ...Array.from({ length: 3 }, (_, course) => ({ key: `EC:${unit}-${course}`,
        ueCode: `UE-${unit + 1}`, code: `EC-${unit + 1}-${course + 1}`,
        label: `Matière technique ${unit + 1}.${course + 1}`, kind: 'EC' as const })),
      { key: `UE:${unit}`, ueCode: `UE-${unit + 1}`, code: `UE-${unit + 1}`,
        label: `Unité d’enseignement ${unit + 1}`, kind: 'UE' as const },
    ]).flat()
    const sections: PvSection[] = [{ program: 'Génie industriel — MAQUETTE DE VALIDATION',
      level: 'Licence 1', columns, students: Array.from({ length: 60 }, (_, index) => ({
        name: `ÉTUDIANT TEST ${String(index + 1).padStart(2, '0')}`,
        matricule: `UPDM-TEST-${String(index + 1).padStart(3, '0')}`,
        grades: Object.fromEntries(columns.map((column) => [column.key, 12 + index % 5])),
        components: Object.fromEntries(columns.filter((column) => column.kind === 'EC').map((column) =>
          [column.key, { cc: 11 + index % 6, tp: 12 + index % 5, exam: 13 + index % 4, final: 12 + index % 5 }])),
        average: 12 + index % 5, decision: index % 7 ? 'ADMI' : 'AJOURNE',
      })) }]
    expect(columns.filter((column) => column.kind === 'EC')).toHaveLength(30)
    expect(expectedPvSheetCount(sections)).toBe(24)
    const pdf = await renderPDF(React.createElement(PVDeliberationPDF, { tenant,
      departmentName: 'Génie industriel', departmentHeadName: 'Chef de département — test',
      session: { name: 'Délibération annuelle', date: '2026-10-01', type: 'ANNUEL' },
      members: Array.from({ length: 12 }, (_, index) => ({ name: `Membre ${index + 1}`, role: index ? 'Membre' : 'President' })),
      sections, students: [], academicYear: '2026-2027', docNumber: 'PV-TEST-60-30',
      verificationCode: 'VALIDATION6030', isSigned: false }))
    await savePreview('pv-validation-60-etudiants-30-matieres-a3.pdf', pdf)
    expect(countPdfPages(pdf)).toBe(expectedPvSheetCount(sections))
    expect(pdf.toString('latin1')).toContain('/MediaBox [0 0 1190.55')
  }, 20_000)

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
