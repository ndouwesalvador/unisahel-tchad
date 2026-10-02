// Local-only visual regression fixtures. Never uses a tenant database or real identities.
import React from 'react'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import QRCode from 'qrcode'
import {
  AttestationInscriptionPDF,
  AttestationNiveauPDF,
  CertificatScolaritePDF,
  DiplomePDF,
  PVDeliberationPDF,
  ReleveNotesPDF,
  renderPDF,
} from '../src/lib/pdf/templates'

const destination = path.resolve('tmp/pdfs/review-v2')
const tenant = {
  name: 'Université Polytechnique de Test et de Recherche Appliquée',
  shortName: 'UPTR',
  country: 'République du Tchad',
  ministry: 'Ministère de l’Enseignement supérieur',
  address: 'Campus principal',
  city: 'Mongo',
  phone: '+235 00 00 00 00',
  email: 'contact@example.test',
  rectorTitle: 'Recteur',
  rectorName: 'Responsable de test',
}
const student = {
  firstName: 'Amina', lastName: 'Hassan', matricule: 'TEST-2026-001',
  dateOfBirth: '2004-01-20', placeOfBirth: 'Mongo', nationality: 'Tchadienne',
  program: 'Licence en Génie informatique et systèmes industriels', level: 'Licence 3',
}
const common = { tenant, student, docNumber: 'TEST-2026-001', verificationCode: 'TESTCODE1234' }

async function main() {
  await mkdir(destination, { recursive: true })
  const qrCodeDataUrl = await QRCode.toDataURL('https://example.test/verify?code=TESTCODE1234')
  const fixtures = [
    ['releve.pdf', <ReleveNotesPDF key="releve" {...common} qrCodeDataUrl={qrCodeDataUrl} academicYear="2026-2027" semester="Semestre 1" isSigned ueGrades={[
      { ue: 'Programmation et algorithmique', code: 'UE-101', credits: 6, notes: [{ ec: 'Programmation avancée', coef: 2, cc: 14, exam: 16, final: 15.2 }], moyenne: 15.2 },
      { ue: 'Mathématiques appliquées', code: 'UE-102', credits: 6, notes: [{ ec: 'Analyse numérique', coef: 2, cc: 12, exam: 13, final: 12.6 }], moyenne: 12.6 },
    ]} />],
    ['attestation-inscription.pdf', <AttestationInscriptionPDF key="attestation-inscription" {...common} qrCodeDataUrl={qrCodeDataUrl} academicYear="2026-2027" isSigned />],
    ['attestation-apercu.pdf', <AttestationInscriptionPDF key="attestation-apercu" {...common} qrCodeDataUrl={qrCodeDataUrl} academicYear="2026-2027" />],
    ['attestation-niveau.pdf', <AttestationNiveauPDF key="attestation-niveau" {...common} qrCodeDataUrl={qrCodeDataUrl} academicYear="2026-2027" award={{ credits: 60, level: 'Licence 3', program: student.program, juryDate: '2026-09-30' }} />],
    ['certificat.pdf', <CertificatScolaritePDF key="certificat" {...common} qrCodeDataUrl={qrCodeDataUrl} academicYear="2026-2027" isSigned />],
    ['diplome.pdf', <DiplomePDF key="diplome" {...common} qrCodeDataUrl={qrCodeDataUrl} isSigned diploma={{ title: 'Licence en Génie informatique', program: student.program, mention: 'Bien', date: '2026-09-30', credits: 180 }} />],
    ['pv.pdf', <PVDeliberationPDF key="pv" tenant={tenant} qrCodeDataUrl={qrCodeDataUrl} docNumber="PV-TEST-2026" verificationCode="TESTCODE1234" isSigned academicYear="2026-2027" session={{ name: 'Délibération annuelle', date: '2026-10-01', type: 'ANNUEL' }} members={[{ name: 'Président de test', role: 'President' }, { name: 'Membre de test', role: 'Membre' }]} students={Array.from({ length: 80 }, (_, index) => ({ name: `Étudiant Exemple ${index + 1}`, matricule: `TEST-2026-${String(index + 1).padStart(3, '0')}`, moy: 15.2, decision: 'ADMIS', mention: 'Bien' }))} />],
  ] as const

  for (const [filename, element] of fixtures) {
    await writeFile(path.join(destination, filename), await renderPDF(element))
    process.stdout.write(`${filename}\n`)
  }
}

main().catch((error) => { process.stderr.write(String(error)); process.exitCode = 1 })
