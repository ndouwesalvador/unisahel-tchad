import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer'
import { formatDate, formatNumber, getVerificationUrl, TenantInfo, StudentInfo } from './utils'

Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://fonts.cdnfonts.com/s/29107/Helvetica.woff', fontWeight: 'normal' },
    { src: 'https://fonts.cdnfonts.com/s/29107/Helvetica-Bold.woff', fontWeight: 'bold' },
  ],
})

const colors = {
  primary: '#1a2744',
  secondary: '#2d7a4f',
  accent: '#d4a853',
  text: '#1a1a1a',
  muted: '#6b7280',
  border: '#e5e7eb',
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: colors.text,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: colors.secondary,
  },
  headerLeft: {
    flexDirection: 'column',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  institutionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  institutionSub: {
    fontSize: 9,
    color: colors.muted,
    marginTop: 2,
  },
  docTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    color: colors.primary,
    marginVertical: 15,
    textTransform: 'uppercase',
  },
  docSubtitle: {
    fontSize: 10,
    textAlign: 'center',
    color: colors.muted,
    marginBottom: 15,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.primary,
    backgroundColor: '#f3f4f6',
    padding: '6 10',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: 140,
    fontSize: 9,
    color: colors.muted,
  },
  value: {
    flex: 1,
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.text,
  },
  table: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    padding: '6 8',
  },
  tableHeaderCell: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    padding: '5 8',
  },
  tableRowAlt: {
    backgroundColor: '#f9fafb',
  },
  tableCell: {
    fontSize: 8,
    color: colors.text,
  },
  tableCellRight: {
    fontSize: 8,
    color: colors.text,
    textAlign: 'right',
  },
  tableCellCenter: {
    fontSize: 8,
    color: colors.text,
    textAlign: 'center',
  },
  signature: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBlock: {
    width: '30%',
    alignItems: 'center',
  },
  signatureLine: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: colors.text,
    marginTop: 30,
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 8,
    color: colors.muted,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 7,
    color: colors.muted,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  verificationBar: {
    position: 'absolute',
    bottom: 50,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    padding: '6 10',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: 4,
  },
  verificationText: {
    fontSize: 7,
    color: colors.secondary,
  },
  verificationTextGroup: {
    flexDirection: 'column',
    gap: 2,
  },
  qrCode: {
    width: 40,
    height: 40,
  },
  stamp: {
    position: 'absolute',
    top: 200,
    right: 60,
    width: 100,
    height: 100,
    borderWidth: 3,
    borderColor: colors.accent,
    borderRadius: 8,
    opacity: 0.3,
    transform: 'rotate(-15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stampText: {
    fontSize: 10,
    color: colors.accent,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 20,
    right: 40,
    fontSize: 7,
    color: colors.muted,
  },
})

function Stamp({ text = 'VALIDE' }: { text?: string }) {
  return (
    <View style={styles.stamp}>
      <Text style={styles.stampText}>{text}</Text>
    </View>
  )
}

function Footer({ docNumber, verificationCode, qrCodeDataUrl }: { docNumber?: string; verificationCode?: string; qrCodeDataUrl?: string }) {
  return (
    <>
      {verificationCode && (
        <View style={styles.verificationBar}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image, not an HTML img */}
          {qrCodeDataUrl && <Image src={qrCodeDataUrl} style={styles.qrCode} />}
          <View style={styles.verificationTextGroup}>
            <Text style={styles.verificationText}>Code de vérification: {verificationCode}</Text>
            <Text style={styles.verificationText}>Scannez le QR code ou vérifiez sur {getVerificationUrl(verificationCode).replace(/^https?:\/\//, '')}</Text>
          </View>
        </View>
      )}
      <View style={styles.footer}>
        <Text>
          UniSahel — Plateforme SaaS de Gestion Universitaire Africaine
          {docNumber ? ` | Document: ${docNumber}` : ''}
        </Text>
        <Text>Document généré électroniquement — Fait foi jusqu&apos;à preuve du contraire</Text>
      </View>
      <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </>
  )
}

export function ReleveNotesPDF({
  tenant, student, semester, ueGrades, academicYear, docNumber, verificationCode, qrCodeDataUrl,
}: {
  tenant: TenantInfo; student: StudentInfo; semester: string; ueGrades: Array<{ ue: string; code: string; credits: number; notes: Array<{ ec: string; coef: number; cc?: number; exam?: number; final?: number }>; moyenne?: number }>; academicYear: string; docNumber: string; verificationCode: string; qrCodeDataUrl?: string
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.institutionName}>{tenant.name}</Text>
            <Text style={styles.institutionSub}>{tenant.address}{tenant.city ? `, ${tenant.city}` : ''}</Text>
            <Text style={styles.institutionSub}>{tenant.phone} | {tenant.email}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={{ fontSize: 8, color: colors.muted }}>N° {docNumber}</Text>
          </View>
        </View>

        <Text style={styles.docTitle}>RELEVÉ DE NOTES</Text>
        <Text style={styles.docSubtitle}>Année académique {academicYear} — {semester}</Text>

        <View style={styles.section}>
          <View style={styles.row}><Text style={styles.label}>Étudiant</Text><Text style={styles.value}>{student.firstName} {student.lastName}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Matricule</Text><Text style={styles.value}>{student.matricule}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Programme</Text><Text style={styles.value}>{student.program}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Niveau</Text><Text style={styles.value}>{student.level}</Text></View>
        </View>

        {ueGrades.map((ue, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionTitle}>{ue.code} — {ue.ue} ({ue.credits} crédits)</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: '40%' }]}>Élément Constitutif</Text>
                <Text style={[styles.tableHeaderCell, { width: '15%', textAlign: 'center' }]}>Coefficient</Text>
                <Text style={[styles.tableHeaderCell, { width: '15%', textAlign: 'center' }]}>CC</Text>
                <Text style={[styles.tableHeaderCell, { width: '15%', textAlign: 'center' }]}>Examen</Text>
                <Text style={[styles.tableHeaderCell, { width: '15%', textAlign: 'center' }]}>Moyenne</Text>
              </View>
              {ue.notes.map((n, j) => (
                <View key={j} style={[styles.tableRow, j % 2 === 1 ? styles.tableRowAlt : {}]}>
                  <Text style={[styles.tableCell, { width: '40%' }]}>{n.ec}</Text>
                  <Text style={[styles.tableCellCenter, { width: '15%' }]}>{n.coef}</Text>
                  <Text style={[styles.tableCellCenter, { width: '15%' }]}>{n.cc != null ? formatNumber(n.cc) : '-'}</Text>
                  <Text style={[styles.tableCellCenter, { width: '15%' }]}>{n.exam != null ? formatNumber(n.exam) : '-'}</Text>
                  <Text style={[styles.tableCellCenter, { width: '15%' }]}>{n.final != null ? formatNumber(n.final) : '-'}</Text>
                </View>
              ))}
              <View style={[styles.tableRow, { backgroundColor: '#f0fdf4' }]}>
                <Text style={[styles.tableCell, { width: '40%', fontWeight: 'bold' }]}>Moyenne UE</Text>
                <Text style={[styles.tableCellCenter, { width: '15%' }]} />
                <Text style={[styles.tableCellCenter, { width: '15%' }]} />
                <Text style={[styles.tableCellCenter, { width: '15%' }]} />
                <Text style={[styles.tableCellCenter, { width: '15%', fontWeight: 'bold' }]}>{ue.moyenne != null ? formatNumber(ue.moyenne) : '-'}</Text>
              </View>
            </View>
          </View>
        ))}

        <Stamp />
        <Footer docNumber={docNumber} verificationCode={verificationCode} qrCodeDataUrl={qrCodeDataUrl} />
      </Page>
    </Document>
  )
}

export function AttestationInscriptionPDF({
  tenant, student, academicYear, docNumber, verificationCode, qrCodeDataUrl,
}: {
  tenant: TenantInfo; student: StudentInfo; academicYear: string; docNumber: string; verificationCode: string; qrCodeDataUrl?: string
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.institutionName}>{tenant.name}</Text>
            <Text style={styles.institutionSub}>{tenant.address}{tenant.city ? `, ${tenant.city}` : ''}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={{ fontSize: 8, color: colors.muted }}>N° {docNumber}</Text>
          </View>
        </View>

        <Text style={styles.docTitle}>ATTESTATION D&apos;INSCRIPTION</Text>
        <Text style={styles.docSubtitle}>Année académique {academicYear}</Text>

        <View style={{ marginVertical: 20, lineHeight: 2 }}>
          <Text style={{ fontSize: 10, marginBottom: 10 }}>
            Le <Text style={{ fontWeight: 'bold' }}>{tenant.rectorTitle || 'Recteur'}</Text> de l&apos;<Text style={{ fontWeight: 'bold' }}>{tenant.name}</Text> atteste que :
          </Text>
          <Text style={{ fontSize: 12, fontWeight: 'bold', textAlign: 'center', marginVertical: 15 }}>
            {student.firstName} {student.lastName}
          </Text>
          <View style={{ marginLeft: 20 }}>
            <Text style={{ fontSize: 10 }}>• Né(e) le {student.dateOfBirth || '...'} à {student.placeOfBirth || '...'}</Text>
            <Text style={{ fontSize: 10 }}>• Nationalité : {student.nationality || '...'}</Text>
            <Text style={{ fontSize: 10 }}>• Matricule : {student.matricule || '...'}</Text>
            <Text style={{ fontSize: 10 }}>• Programme : {student.program || '...'}</Text>
            <Text style={{ fontSize: 10 }}>• Niveau : {student.level || '...'}</Text>
          </View>
          <Text style={{ fontSize: 10, marginTop: 15 }}>
            Est régulièrement inscrit(e) pour l&apos;année académique <Text style={{ fontWeight: 'bold' }}>{academicYear}</Text> au sein de notre établissement.
          </Text>
          <Text style={{ fontSize: 10, marginTop: 10 }}>
            La présente attestation est délivrée à l&apos;intéressé(e) pour servir et valoir ce que de droit.
          </Text>
        </View>

        <View style={styles.signature}>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>Le Chef de Scolarité</Text>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={[styles.signatureLine, { borderTopWidth: 0 }]} />
            <Text style={styles.signatureLabel}>Fait à {tenant.city || '...'}, le {formatDate(new Date())}</Text>
            <Text style={styles.signatureLabel}>{tenant.rectorTitle || 'Le Recteur'}</Text>
          </View>
        </View>

        <Footer docNumber={docNumber} verificationCode={verificationCode} qrCodeDataUrl={qrCodeDataUrl} />
      </Page>
    </Document>
  )
}

export function DiplomePDF({
  tenant, student, diploma, docNumber, verificationCode, qrCodeDataUrl,
}: {
  tenant: TenantInfo; student: StudentInfo; diploma: { title: string; mention: string; date: string }; docNumber: string; verificationCode: string; qrCodeDataUrl?: string
}) {
  return (
    <Document>
      <Page size="A4" style={[styles.page, { paddingTop: 60 }]}>
        <View style={{ alignItems: 'center', marginBottom: 30 }}>
          <Text style={{ fontSize: 10, color: colors.muted, letterSpacing: 3 }}>RÉPUBLIQUE DU TCHAD</Text>
          <Text style={{ fontSize: 9, color: colors.muted, marginTop: 2 }}>MINISTÈRE DE L&apos;ENSEIGNEMENT SUPÉRIEUR</Text>
        </View>

        <View style={[styles.header, { borderBottomColor: colors.accent }]}>
          <View style={styles.headerLeft}>
            <Text style={styles.institutionName}>{tenant.name}</Text>
            <Text style={styles.institutionSub}>{tenant.address}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={{ fontSize: 8, color: colors.muted }}>N° {docNumber}</Text>
          </View>
        </View>

        <Text style={[styles.docTitle, { fontSize: 18, marginTop: 25 }]}>DIPLÔME</Text>
        <Text style={styles.docSubtitle}>{diploma.title}</Text>

        <View style={{ marginVertical: 25, alignItems: 'center' }}>
          <Text style={{ fontSize: 9, color: colors.muted, marginBottom: 5 }}>Décerné à</Text>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.primary, marginVertical: 8 }}>
            {student.firstName} {student.lastName}
          </Text>
          <Text style={{ fontSize: 9, color: colors.muted }}>Né(e) le {student.dateOfBirth} à {student.placeOfBirth}</Text>
        </View>

        <View style={{ marginVertical: 15, lineHeight: 2, alignItems: 'center' }}>
          <Text style={{ fontSize: 10 }}>A obtenu le diplôme de</Text>
          <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.secondary, marginVertical: 5 }}>
            {diploma.title}
          </Text>
          <Text style={{ fontSize: 10 }}>Avec la mention <Text style={{ fontWeight: 'bold', color: colors.accent }}>{diploma.mention}</Text></Text>
          <Text style={{ fontSize: 9, color: colors.muted, marginTop: 5 }}>En date du {diploma.date}</Text>
        </View>

        <View style={styles.signature}>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>Le Président du Jury</Text>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>Le {tenant.rectorTitle || 'Recteur'}</Text>
          </View>
        </View>

        <Stamp text="AUTHENTIQUE" />
        <Footer docNumber={docNumber} verificationCode={verificationCode} qrCodeDataUrl={qrCodeDataUrl} />
      </Page>
    </Document>
  )
}

export function PVDeliberationPDF({
  tenant, session, members, students, academicYear, docNumber, verificationCode, qrCodeDataUrl,
}: {
  tenant: TenantInfo; session: { name: string; date: string; type: string }; members: Array<{ name: string; role: string }>; students: Array<{ name: string; matricule: string; moy: number; decision: string; mention?: string }>; academicYear: string; docNumber: string; verificationCode: string; qrCodeDataUrl?: string
}) {
  const stats = {
    total: students.length,
    admis: students.filter(s => s.decision === 'ADMIS' || s.decision === 'ADMIS_CHANCE').length,
    ajourne: students.filter(s => s.decision === 'AJOURNE').length,
    redoublant: students.filter(s => s.decision === 'REDOUBLANT').length,
    exclu: students.filter(s => s.decision === 'EXCLU').length,
    rate: students.length ? Math.round(students.filter(s => s.decision === 'ADMIS' || s.decision === 'ADMIS_CHANCE' || s.decision === 'ADMIS').length / students.length * 100) : 0,
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.institutionName}>{tenant.name}</Text>
            <Text style={styles.institutionSub}>{tenant.address}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={{ fontSize: 8, color: colors.muted }}>N° {docNumber}</Text>
          </View>
        </View>

        <Text style={styles.docTitle}>PROCÈS-VERBAL DE DÉLIBÉRATION</Text>
        <Text style={styles.docSubtitle}>Année académique {academicYear}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Session</Text>
          <View style={styles.row}><Text style={styles.label}>Intitulé</Text><Text style={styles.value}>{session.name}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Date</Text><Text style={styles.value}>{session.date}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Type</Text><Text style={styles.value}>{session.type}</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Membres du Jury</Text>
          {members.map((m, i) => (
            <View key={i} style={styles.row}>
              <Text style={{ width: 20, fontSize: 9 }}>{i + 1}.</Text>
              <Text style={{ width: 200, fontSize: 9 }}>{m.name}</Text>
              <Text style={{ fontSize: 9, color: colors.muted }}>({m.role})</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Résultats ({stats.total} étudiants)</Text>
          <View style={{ flexDirection: 'row', gap: 20, marginBottom: 10 }}>
            <View style={{ flex: 1, alignItems: 'center', padding: 8, backgroundColor: '#f0fdf4', borderRadius: 4 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.secondary }}>{stats.admis}</Text>
              <Text style={{ fontSize: 8, color: colors.muted }}>Admis</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', padding: 8, backgroundColor: '#fef2f2', borderRadius: 4 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#dc2626' }}>{stats.ajourne}</Text>
              <Text style={{ fontSize: 8, color: colors.muted }}>Ajournés</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', padding: 8, backgroundColor: '#fff7ed', borderRadius: 4 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#c2410c' }}>{stats.redoublant}</Text>
              <Text style={{ fontSize: 8, color: colors.muted }}>Redoublants</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', padding: 8, backgroundColor: '#fdf2f8', borderRadius: 4 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#be185d' }}>{stats.exclu}</Text>
              <Text style={{ fontSize: 8, color: colors.muted }}>Exclus</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', padding: 8, backgroundColor: '#eff6ff', borderRadius: 4 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.primary }}>{stats.rate}%</Text>
              <Text style={{ fontSize: 8, color: colors.muted }}>Taux réussite</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: '8%', textAlign: 'center' }]}>#</Text>
            <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Nom & Prénom</Text>
            <Text style={[styles.tableHeaderCell, { width: '17%' }]}>Matricule</Text>
            <Text style={[styles.tableHeaderCell, { width: '12%', textAlign: 'center' }]}>Moyenne</Text>
            <Text style={[styles.tableHeaderCell, { width: '18%', textAlign: 'center' }]}>Décision</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%', textAlign: 'center' }]}>Mention</Text>
          </View>
          {students.map((s, i) => (
            <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={[styles.tableCellCenter, { width: '8%' }]}>{i + 1}</Text>
              <Text style={[styles.tableCell, { width: '25%' }]}>{s.name}</Text>
              <Text style={[styles.tableCell, { width: '17%' }]}>{s.matricule}</Text>
              <Text style={[styles.tableCellCenter, { width: '12%' }]}>{formatNumber(s.moy)}</Text>
              <Text style={[styles.tableCellCenter, { width: '18%' }]}>{s.decision}</Text>
              <Text style={[styles.tableCellCenter, { width: '20%' }]}>{s.mention || '-'}</Text>
            </View>
          ))}
        </View>

        <View style={styles.signature}>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>Le Président du Jury</Text>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>Le Secrétaire</Text>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>Le {tenant.rectorTitle || 'Recteur'}</Text>
          </View>
        </View>

        <Footer docNumber={docNumber} verificationCode={verificationCode} qrCodeDataUrl={qrCodeDataUrl} />
      </Page>
    </Document>
  )
}

export function CertificatScolaritePDF({
  tenant, student, academicYear, docNumber, verificationCode, qrCodeDataUrl,
}: {
  tenant: TenantInfo; student: StudentInfo; academicYear: string; docNumber: string; verificationCode: string; qrCodeDataUrl?: string
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.institutionName}>{tenant.name}</Text>
            <Text style={styles.institutionSub}>{tenant.address}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={{ fontSize: 8, color: colors.muted }}>N° {docNumber}</Text>
          </View>
        </View>

        <Text style={styles.docTitle}>CERTIFICAT DE SCOLARITÉ</Text>
        <Text style={styles.docSubtitle}>Année académique {academicYear}</Text>

        <View style={{ marginVertical: 20, lineHeight: 2 }}>
          <Text style={{ fontSize: 10, marginBottom: 10 }}>
            Je soussigné, <Text style={{ fontWeight: 'bold' }}>{tenant.rectorTitle || 'Responsable'}</Text> de <Text style={{ fontWeight: 'bold' }}>{tenant.name}</Text>,
            certifie que :
          </Text>
          <Text style={{ fontSize: 12, fontWeight: 'bold', textAlign: 'center', marginVertical: 15 }}>
            {student.firstName} {student.lastName}
          </Text>
          <View style={{ marginLeft: 20 }}>
            <Text style={{ fontSize: 10 }}>• Matricule : {student.matricule || '...'}</Text>
            <Text style={{ fontSize: 10 }}>• Programme : {student.program || '...'}</Text>
            <Text style={{ fontSize: 10 }}>• Niveau d&apos;étude : {student.level || '...'}</Text>
          </View>
          <Text style={{ fontSize: 10, marginTop: 15 }}>
            Est régulièrement inscrit(e) pour l&apos;année académique {academicYear}.
          </Text>
          <Text style={{ fontSize: 10, marginTop: 10, fontStyle: 'italic' }}>
            Délivré à l&apos;intéressé(e) pour servir et valoir ce que de droit.
          </Text>
        </View>

        <View style={styles.signature}>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureLabel}>Fait à {tenant.city || '...'}, le {formatDate(new Date())}</Text>
            <Text style={[styles.signatureLine, { borderTopWidth: 0 }]} />
            <Text style={styles.signatureLabel}>{tenant.rectorTitle || 'Le Recteur'}</Text>
          </View>
        </View>

        <Footer docNumber={docNumber} verificationCode={verificationCode} qrCodeDataUrl={qrCodeDataUrl} />
      </Page>
    </Document>
  )
}

export function ListeEtudiantsPDF({
  tenant, students, program, level, academicYear,
}: {
  tenant: TenantInfo; students: Array<{ name: string; matricule: string; gender: string; phone?: string; email?: string }>; program?: string; level?: string; academicYear: string
}) {
  return (
    <Document>
      <Page size="A4" style={[styles.page]} orientation="landscape">
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.institutionName}>{tenant.name}</Text>
          </View>
        </View>

        <Text style={styles.docTitle}>LISTE DES ÉTUDIANTS</Text>
        <Text style={styles.docSubtitle}>
          {program ? `${program} — ` : ''}{level || ''} — {academicYear}
          <Text style={{ fontSize: 9, color: colors.muted }}> | Total: {students.length} étudiants</Text>
        </Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: '6%', textAlign: 'center' }]}>#</Text>
            <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Nom & Prénom</Text>
            <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Matricule</Text>
            <Text style={[styles.tableHeaderCell, { width: '8%', textAlign: 'center' }]}>Sexe</Text>
            <Text style={[styles.tableHeaderCell, { width: '18%' }]}>Téléphone</Text>
            <Text style={[styles.tableHeaderCell, { width: '18%' }]}>Email</Text>
          </View>
          {students.map((s, i) => (
            <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={[styles.tableCellCenter, { width: '6%' }]}>{i + 1}</Text>
              <Text style={[styles.tableCell, { width: '30%' }]}>{s.name}</Text>
              <Text style={[styles.tableCell, { width: '20%' }]}>{s.matricule}</Text>
              <Text style={[styles.tableCellCenter, { width: '8%' }]}>{s.gender === 'M' ? 'M' : 'F'}</Text>
              <Text style={[styles.tableCell, { width: '18%' }]}>{s.phone || '-'}</Text>
              <Text style={[styles.tableCell, { width: '18%' }]}>{s.email || '-'}</Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 15, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 8, color: colors.muted }}>Généré le {formatDate(new Date())}</Text>
          <Text style={{ fontSize: 8, color: colors.muted }}>Total: {students.length} étudiants</Text>
        </View>

        <View style={styles.footer}>
          <Text>UniSahel — Plateforme SaaS de Gestion Universitaire Africaine</Text>
        </View>
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </Page>
    </Document>
  )
}

export async function renderPDF(element: React.ReactElement): Promise<Buffer> {
  const { renderToBuffer } = await import('@react-pdf/renderer')
  return renderToBuffer(element as React.ReactElement<Record<string, unknown>>)
}

export const documentTypes = [
  { id: 'RELEVE_NOTES', label: 'Relevé de notes', prefix: 'RN' },
  { id: 'ATTESTATION_INSCRIPTION', label: "Attestation d'inscription", prefix: 'AI' },
  { id: 'DIPLOME', label: 'Diplôme', prefix: 'DIP' },
  { id: 'PV_DELIBERATION', label: 'Procès-verbal de délibération', prefix: 'PV' },
  { id: 'CERTIFICAT_SCOLARITE', label: 'Certificat de scolarité', prefix: 'CS' },
  { id: 'LISTE_ETUDIANTS', label: "Liste d'étudiants", prefix: 'LE' },
  { id: 'BULLETIN', label: 'Bulletin de notes', prefix: 'BN' },
  { id: 'RECU_PAIEMENT', label: 'Reçu de paiement', prefix: 'RP' },
]
