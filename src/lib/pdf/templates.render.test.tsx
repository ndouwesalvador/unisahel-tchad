import React from 'react'
import { describe, expect, it } from 'vitest'
import { countPdfPages } from './utils'
import { AttestationInscriptionPDF, AttestationNiveauPDF, CertificatScolaritePDF, DiplomePDF, PVDeliberationPDF, ReleveNotesPDF, renderPDF } from './templates'
import type { PvSection } from './pv-matrix'
import { renderArabicHeader } from './arabic-header'

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
    expect(countPdfPages(pdf)).toBe(1)
    expect(pdf.toString('latin1')).toMatch(/\/MediaBox \[0 0 595\.28\d* 841\.89\d*\]/)
    await savePreview('releve-design-a4.pdf', pdf)
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
    expect(countPdfPages(pdf)).toBe(1)
    expect(pdf.toString('latin1')).toMatch(/\/MediaBox \[0 0 595\.28\d* 841\.89\d*\]/)
    await savePreview('releve-design-dense.pdf', pdf)
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
    expect(countPdfPages(pdf)).toBe(1)
    await savePreview('releve-design-licence.pdf', pdf)
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
      expect(countPdfPages(pdf), name).toBe(1)
      expect(pdf.toString('latin1')).toContain(name === 'diplome.pdf' ? '/MediaBox [0 0 841.890' : '/MediaBox [0 0 595.280')
      await savePreview(name, pdf)
    }
  })
})
