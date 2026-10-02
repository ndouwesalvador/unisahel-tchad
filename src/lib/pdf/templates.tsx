import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { formatDate, formatNumber, getVerificationUrl, TenantInfo, StudentInfo } from './utils'

const colors = {
  primary: '#1a2744',
  secondary: '#176341',
  accent: '#a97624',
  text: '#111827',
  muted: '#475569',
  border: '#cbd5e1',
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 42,
    paddingHorizontal: 48,
    paddingBottom: 95,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: colors.text,
  },
  topRule: { height: 5, backgroundColor: colors.primary, marginBottom: 14 },
  identity: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  monogram: { width: 48, height: 48, borderWidth: 1.5, borderColor: colors.secondary, alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  monogramText: { fontSize: 11, fontWeight: 'bold', color: colors.secondary, textAlign: 'center' },
  identityBody: { flex: 1 },
  country: { fontSize: 8, fontWeight: 'bold', color: colors.primary, letterSpacing: 1.2, marginBottom: 3 },
  ministry: { fontSize: 7.5, color: colors.muted, marginBottom: 3 },
  reference: { maxWidth: 132, alignItems: 'flex-end', marginLeft: 10 },
  referenceLabel: { fontSize: 7, fontWeight: 'bold', color: colors.muted, marginBottom: 3 },
  referenceValue: { fontSize: 7.5, color: colors.primary, textAlign: 'right' },
  contactLine: { paddingVertical: 6, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border, fontSize: 7.5, color: colors.muted, marginBottom: 17 },
  eyebrow: { fontSize: 8, fontWeight: 'bold', color: colors.secondary, letterSpacing: 1.4, textAlign: 'center', marginBottom: 8 },
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
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  institutionSub: {
    fontSize: 8,
    color: colors.muted,
    marginTop: 2,
  },
  docTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    textAlign: 'center',
    color: colors.primary,
    marginTop: 0,
    marginBottom: 7,
    textTransform: 'uppercase',
  },
  docSubtitle: {
    fontSize: 9,
    textAlign: 'center',
    color: colors.muted,
    marginBottom: 21,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.primary,
    backgroundColor: '#edf5f0',
    padding: '7 10',
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
    padding: '8 8',
  },
  tableHeaderCell: {
    color: 'white',
    fontSize: 8.5,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    padding: '6 8',
  },
  tableRowAlt: {
    backgroundColor: '#f9fafb',
  },
  tableCell: {
    fontSize: 8.5,
    color: colors.text,
  },
  tableCellRight: {
    fontSize: 8.5,
    color: colors.text,
    textAlign: 'right',
  },
  tableCellCenter: {
    fontSize: 8.5,
    color: colors.text,
    textAlign: 'center',
  },
  signature: {
    marginTop: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBlock: {
    width: '42%',
    alignItems: 'center',
  },
  signatureLine: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: colors.text,
    marginTop: 34,
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 8.5,
    color: colors.muted,
  },
  footer: {
    position: 'absolute',
    bottom: 19,
    left: 48,
    right: 48,
    textAlign: 'center',
    fontSize: 7.5,
    color: colors.muted,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  verificationBar: {
    position: 'absolute',
    bottom: 48,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 12,
    padding: '8 10',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: colors.border,
  },
  verificationText: {
    fontSize: 7.5,
    color: colors.primary,
  },
  verificationTextGroup: {
    flexDirection: 'column',
    gap: 2,
  },
  qrCode: {
    width: 42,
    height: 42,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 19,
    right: 48,
    fontSize: 7,
    color: colors.muted,
  },
})

function DocumentHeader({ tenant, docNumber }: { tenant: TenantInfo; docNumber?: string }) {
  const shortName = tenant.shortName?.trim() || tenant.name.split(/\s+/).map((word) => word[0]).join('').slice(0, 4).toUpperCase()
  const contact = [tenant.address, tenant.city, tenant.phone, tenant.email, tenant.website].filter(Boolean).join('  ·  ')
  return (
    <View wrap={false}>
      <View style={styles.topRule} />
      <View style={styles.identity}>
        <View style={styles.monogram}><Text style={styles.monogramText}>{shortName}</Text></View>
        <View style={styles.identityBody}>
          {tenant.country && <Text style={styles.country}>{tenant.country.toUpperCase()}</Text>}
          {tenant.ministry && <Text style={styles.ministry}>{tenant.ministry.toUpperCase()}</Text>}
          <Text style={styles.institutionName}>{tenant.name}</Text>
          {tenant.motto && <Text style={styles.institutionSub}>{tenant.motto}</Text>}
        </View>
        {docNumber && <View style={styles.reference}>
          <Text style={styles.referenceLabel}>RÉFÉRENCE</Text>
          <Text style={styles.referenceValue}>{docNumber}</Text>
        </View>}
      </View>
      <Text style={styles.contactLine}>{contact || 'Coordonnées de l’établissement non renseignées'}</Text>
    </View>
  )
}

function DocumentHeading({ title, subtitle, isSigned, eyebrow }: { title: string; subtitle?: string; isSigned: boolean; eyebrow?: string }) {
  return <View wrap={false}>
    <Text style={styles.eyebrow}>{eyebrow ?? (isSigned ? 'DOCUMENT VALIDÉ PAR L’ÉTABLISSEMENT' : 'APERÇU NON VALIDÉ')}</Text>
    <Text style={styles.docTitle}>{title}</Text>
    {subtitle && <Text style={styles.docSubtitle}>{subtitle}</Text>}
  </View>
}

function SignatureField({ title, name }: { title: string; name?: string }) {
  return <View style={styles.signatureBlock} wrap={false}>
    <View style={styles.signatureLine} />
    <Text style={styles.signatureLabel}>{title}</Text>
    {name && <Text style={[styles.signatureLabel, { color: colors.primary, marginTop: 3 }]}>{name}</Text>}
  </View>
}

function Footer({ tenant, docNumber, verificationCode, qrCodeDataUrl, isSigned = false }: { tenant: TenantInfo; docNumber?: string; verificationCode?: string; qrCodeDataUrl?: string; isSigned?: boolean }) {
  return (
    <>
      {verificationCode && (
        <View style={styles.verificationBar} wrap={false} fixed>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image, not an HTML img */}
          {qrCodeDataUrl && <Image src={qrCodeDataUrl} style={styles.qrCode} />}
          <View style={styles.verificationTextGroup}>
            <Text style={[styles.verificationText, { fontWeight: 'bold' }]}>{isSigned ? 'Authenticité vérifiable' : 'Document non validé'} · {verificationCode}</Text>
            <Text style={styles.verificationText}>{getVerificationUrl(verificationCode).replace(/^https?:\/\//, '')}</Text>
          </View>
        </View>
      )}
      <View style={styles.footer} wrap={false} fixed>
        <Text>
          {tenant.name}{docNumber ? ` · ${docNumber}` : ''}
        </Text>
        <Text>{isSigned ? 'Validation électronique vérifiable par le code ci-dessus. Aucun cachet ou signature manuscrite n’est simulé.' : 'APERÇU NON VALIDÉ - ne constitue pas une pièce officielle.'}</Text>
      </View>
      <Text style={styles.pageNumber} fixed render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </>
  )
}

export function ReleveNotesPDF({
  tenant, student, semester, ueGrades, academicYear, docNumber, verificationCode, qrCodeDataUrl, isSigned = false,
}: {
  tenant: TenantInfo; student: StudentInfo; semester: string; ueGrades: Array<{ ue: string; code: string; credits: number; notes: Array<{ ec: string; coef: number; cc?: number; exam?: number; final?: number }>; moyenne?: number }>; academicYear: string; docNumber: string; verificationCode: string; qrCodeDataUrl?: string; isSigned?: boolean
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <DocumentHeader tenant={tenant} docNumber={docNumber} />
        <DocumentHeading title="RELEVÉ DE NOTES" subtitle={`Année académique ${academicYear} · ${semester}`} isSigned={isSigned} />

        <View style={styles.section}>
          <View style={styles.row}><Text style={styles.label}>Étudiant</Text><Text style={styles.value}>{student.firstName} {student.lastName}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Matricule</Text><Text style={styles.value}>{student.matricule}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Programme</Text><Text style={styles.value}>{student.program}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Niveau</Text><Text style={styles.value}>{student.level}</Text></View>
        </View>

        <View style={{ flexDirection: 'row', marginBottom: 19, borderWidth: 1, borderColor: colors.border }} wrap={false}>
          <View style={{ flex: 1, padding: 10, borderRightWidth: 1, borderColor: colors.border }}><Text style={{ fontSize: 8, color: colors.muted }}>UNITÉS D’ENSEIGNEMENT</Text><Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.primary, marginTop: 4 }}>{ueGrades.length}</Text></View>
          <View style={{ flex: 1, padding: 10 }}><Text style={{ fontSize: 8, color: colors.muted }}>CRÉDITS INSCRITS</Text><Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.primary, marginTop: 4 }}>{ueGrades.reduce((sum, ue) => sum + ue.credits, 0)}</Text></View>
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

        <Footer tenant={tenant} docNumber={docNumber} verificationCode={verificationCode} qrCodeDataUrl={qrCodeDataUrl} isSigned={isSigned} />
      </Page>
    </Document>
  )
}

export function AttestationInscriptionPDF({
  tenant, student, academicYear, docNumber, verificationCode, qrCodeDataUrl, isSigned = false,
}: {
  tenant: TenantInfo; student: StudentInfo; academicYear: string; docNumber: string; verificationCode: string; qrCodeDataUrl?: string; isSigned?: boolean
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <DocumentHeader tenant={tenant} docNumber={docNumber} />
        <DocumentHeading title="ATTESTATION D’INSCRIPTION" subtitle={`Année académique ${academicYear}`} isSigned={isSigned} />

        <View style={{ marginVertical: 15 }}>
          <Text style={{ fontSize: 10, marginBottom: 10 }}>
            L’établissement <Text style={{ fontWeight: 'bold' }}>{tenant.name}</Text> atteste que :
          </Text>
          <Text style={{ fontSize: 12, fontWeight: 'bold', textAlign: 'center', marginVertical: 12 }}>
            {student.firstName} {student.lastName}
          </Text>
          <View style={{ padding: 12, borderLeftWidth: 3, borderLeftColor: colors.secondary, backgroundColor: '#f8fafc', gap: 4 }}>
            {student.dateOfBirth && <Text style={{ fontSize: 10 }}>- Né(e) le {formatDate(student.dateOfBirth)}{student.placeOfBirth ? ` à ${student.placeOfBirth}` : ''}</Text>}
            {student.nationality && <Text style={{ fontSize: 10 }}>- Nationalité : {student.nationality}</Text>}
            {student.matricule && <Text style={{ fontSize: 10 }}>- Matricule : {student.matricule}</Text>}
            {student.program && <Text style={{ fontSize: 10 }}>- Programme : {student.program}</Text>}
            {student.level && <Text style={{ fontSize: 10 }}>- Niveau : {student.level}</Text>}
          </View>
          <Text style={{ fontSize: 10, marginTop: 15 }}>
            Est régulièrement inscrit(e) pour l&apos;année académique <Text style={{ fontWeight: 'bold' }}>{academicYear}</Text> au sein de notre établissement.
          </Text>
          <Text style={{ fontSize: 10, marginTop: 10 }}>
            La présente attestation est délivrée à l&apos;intéressé(e) pour servir et valoir ce que de droit.
          </Text>
        </View>

        <View style={styles.signature} wrap={false}>
          <SignatureField title="Service de la scolarité" />
          <SignatureField title={tenant.rectorTitle || 'Responsable de l’établissement'} name={tenant.rectorName} />
        </View>
        <Text style={{ fontSize: 8, color: colors.muted, marginTop: 13 }}>Émis {tenant.city ? `à ${tenant.city}, ` : ''}le {formatDate(new Date())}</Text>

        <Footer tenant={tenant} docNumber={docNumber} verificationCode={verificationCode} qrCodeDataUrl={qrCodeDataUrl} isSigned={isSigned} />
      </Page>
    </Document>
  )
}

export function AttestationNiveauPDF({
  tenant, student, academicYear, award, docNumber, verificationCode, qrCodeDataUrl,
}: {
  tenant: TenantInfo
  student: StudentInfo
  academicYear: string
  award: { credits: number; level: string; program: string; juryDate: string }
  docNumber: string
  verificationCode: string
  qrCodeDataUrl?: string
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <DocumentHeader tenant={tenant} docNumber={docNumber} />
        <DocumentHeading title="ATTESTATION DE VALIDATION DE NIVEAU" subtitle={`Année académique ${academicYear}`} isSigned />

        <View style={{ marginTop: 25, marginBottom: 24 }}>
          <Text style={{ fontSize: 10, lineHeight: 1.7 }}>
            {tenant.name} atteste que l’étudiant(e) ci-dessous a validé le niveau indiqué, conformément à la décision finale du jury.
          </Text>
        </View>

        <View style={[styles.section, { padding: 16, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 3, borderLeftColor: colors.secondary }]}>
          <View style={styles.row}><Text style={styles.label}>Étudiant(e)</Text><Text style={styles.value}>{student.firstName} {student.lastName}</Text></View>
          {student.matricule && <View style={styles.row}><Text style={styles.label}>Matricule</Text><Text style={styles.value}>{student.matricule}</Text></View>}
          <View style={styles.row}><Text style={styles.label}>Programme</Text><Text style={styles.value}>{award.program}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Niveau validé</Text><Text style={styles.value}>{award.level}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Crédits acquis</Text><Text style={styles.value}>{award.credits}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Décision du jury</Text><Text style={styles.value}>{formatDate(award.juryDate)}</Text></View>
        </View>

        <Text style={{ fontSize: 10, lineHeight: 1.6, marginTop: 20 }}>
          Cette attestation certifie la validation de ce niveau sans dette de crédits pour l’année académique {academicYear}.
        </Text>

        <View style={styles.signature} wrap={false}>
          <SignatureField title="Service de la scolarité" />
          <SignatureField title={tenant.rectorTitle || 'Responsable de l’établissement'} name={tenant.rectorName} />
        </View>
        <Footer tenant={tenant} docNumber={docNumber} verificationCode={verificationCode} qrCodeDataUrl={qrCodeDataUrl} isSigned />
      </Page>
    </Document>
  )
}

export function DiplomePDF({
  tenant, student, diploma, docNumber, verificationCode, qrCodeDataUrl, isSigned = false,
}: {
  tenant: TenantInfo; student: StudentInfo; diploma: { title: string; program: string; mention?: string; date: string; credits: number }; docNumber: string; verificationCode: string; qrCodeDataUrl?: string; isSigned?: boolean
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <DocumentHeader tenant={tenant} docNumber={docNumber} />
        <DocumentHeading title="DIPLÔME" subtitle={diploma.program} isSigned={isSigned} />

        <View style={{ marginVertical: 22, paddingVertical: 29, paddingHorizontal: 18, alignItems: 'center', borderWidth: 1.5, borderColor: colors.accent }} wrap={false}>
          <Text style={{ fontSize: 9, color: colors.muted, marginBottom: 8, letterSpacing: 1 }}>DÉCERNÉ À</Text>
          <Text style={{ fontSize: 19, fontWeight: 'bold', color: colors.primary, marginVertical: 8, textAlign: 'center' }}>
            {student.firstName} {student.lastName}
          </Text>
          {student.dateOfBirth && <Text style={{ fontSize: 9, color: colors.muted }}>Né(e) le {formatDate(student.dateOfBirth)}{student.placeOfBirth ? ` à ${student.placeOfBirth}` : ''}</Text>}
          <Text style={{ fontSize: 10, marginTop: 25 }}>A obtenu le diplôme de</Text>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.secondary, marginVertical: 8, textAlign: 'center' }}>
            {diploma.title}
          </Text>
          <Text style={{ fontSize: 10, textAlign: 'center' }}>Après validation des {diploma.credits} crédits requis du cursus</Text>
          {diploma.mention && <Text style={{ fontSize: 10, marginTop: 8 }}>Mention : <Text style={{ fontWeight: 'bold', color: colors.primary }}>{diploma.mention}</Text></Text>}
          <Text style={{ fontSize: 9, color: colors.muted, marginTop: 18 }}>Décision finale du jury du {formatDate(diploma.date)}</Text>
        </View>

        <View style={styles.signature} wrap={false}>
          <SignatureField title="Présidence du jury" />
          <SignatureField title={tenant.rectorTitle || 'Responsable de l’établissement'} name={tenant.rectorName} />
        </View>

        <Footer tenant={tenant} docNumber={docNumber} verificationCode={verificationCode} qrCodeDataUrl={qrCodeDataUrl} isSigned={isSigned} />
      </Page>
    </Document>
  )
}

export function PVDeliberationPDF({
  tenant, session, members, students, academicYear, docNumber, verificationCode, qrCodeDataUrl, isSigned = false,
}: {
  tenant: TenantInfo; session: { name: string; date: string; type: string }; members: Array<{ name: string; role: string }>; students: Array<{ name: string; matricule: string; moy: number; decision: string; mention?: string }>; academicYear: string; docNumber: string; verificationCode: string; qrCodeDataUrl?: string; isSigned?: boolean
}) {
  const stats = {
    total: students.length,
    admis: students.filter(s => ['ADMIS', 'ADMIS AVEC DETTE', 'ADMIS PAR COMPENSATION'].includes(s.decision)).length,
    ajourne: students.filter(s => s.decision === 'AJOURNE').length,
    redoublant: students.filter(s => s.decision === 'REDOUBLANT').length,
    exclu: students.filter(s => s.decision === 'EXCLU').length,
    rate: students.length ? Math.round(students.filter(s => ['ADMIS', 'ADMIS AVEC DETTE', 'ADMIS PAR COMPENSATION'].includes(s.decision)).length / students.length * 100) : 0,
  }
  const firstPageCapacity = Math.max(3, 9 - members.length)
  const firstPageStudents = students.slice(0, firstPageCapacity)
  const continuationPages: typeof students[] = []
  for (let start = firstPageCapacity; start < students.length; start += 19) {
    continuationPages.push(students.slice(start, start + 19))
  }
  const resultTable = (rows: typeof students, offset: number) => (
    <View style={styles.table} wrap={false}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, { width: '8%', textAlign: 'center' }]}>#</Text>
        <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Nom & Prénom</Text>
        <Text style={[styles.tableHeaderCell, { width: '17%' }]}>Matricule</Text>
        <Text style={[styles.tableHeaderCell, { width: '12%', textAlign: 'center' }]}>Moyenne</Text>
        <Text style={[styles.tableHeaderCell, { width: '18%', textAlign: 'center' }]}>Décision</Text>
        <Text style={[styles.tableHeaderCell, { width: '20%', textAlign: 'center' }]}>Mention</Text>
      </View>
      {rows.map((student, index) => (
        <View key={index} style={[styles.tableRow, (offset + index) % 2 === 1 ? styles.tableRowAlt : {}]}>
          <Text style={[styles.tableCellCenter, { width: '8%' }]}>{offset + index + 1}</Text>
          <Text style={[styles.tableCell, { width: '25%' }]}>{student.name}</Text>
          <Text style={[styles.tableCell, { width: '17%' }]}>{student.matricule}</Text>
          <Text style={[styles.tableCellCenter, { width: '12%' }]}>{formatNumber(student.moy)}</Text>
          <Text style={[styles.tableCellCenter, { width: '18%' }]}>{student.decision}</Text>
          <Text style={[styles.tableCellCenter, { width: '20%' }]}>{student.mention || '-'}</Text>
        </View>
      ))}
    </View>
  )
  const signatures = () => (
    <View style={styles.signature} wrap={false}>
      <SignatureField title="Présidence du jury" name={members.find((member) => member.role === 'President')?.name} />
      <SignatureField title={tenant.rectorTitle || 'Responsable de l’établissement'} name={tenant.rectorName} />
    </View>
  )

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <DocumentHeader tenant={tenant} docNumber={docNumber} />
        <DocumentHeading title="PROCÈS-VERBAL DE DÉLIBÉRATION" subtitle={`Année académique ${academicYear}`} isSigned={isSigned} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Session</Text>
          <View style={styles.row}><Text style={styles.label}>Intitulé</Text><Text style={styles.value}>{session.name}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Date</Text><Text style={styles.value}>{formatDate(session.date)}</Text></View>
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

        {resultTable(firstPageStudents, 0)}
        {continuationPages.length === 0 && signatures()}

        <Footer tenant={tenant} docNumber={docNumber} verificationCode={verificationCode} qrCodeDataUrl={qrCodeDataUrl} isSigned={isSigned} />
      </Page>
      {continuationPages.map((pageStudents, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          <DocumentHeader tenant={tenant} docNumber={docNumber} />
          <DocumentHeading title="PROCÈS-VERBAL · SUITE" subtitle={`${session.name} · ${academicYear}`} isSigned={isSigned} />
          {resultTable(pageStudents, firstPageCapacity + pageIndex * 19)}
          {pageIndex === continuationPages.length - 1 && signatures()}
          <Footer tenant={tenant} docNumber={docNumber} verificationCode={verificationCode} qrCodeDataUrl={qrCodeDataUrl} isSigned={isSigned} />
        </Page>
      ))}
    </Document>
  )
}

export function CertificatScolaritePDF({
  tenant, student, academicYear, docNumber, verificationCode, qrCodeDataUrl, isSigned = false,
}: {
  tenant: TenantInfo; student: StudentInfo; academicYear: string; docNumber: string; verificationCode: string; qrCodeDataUrl?: string; isSigned?: boolean
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <DocumentHeader tenant={tenant} docNumber={docNumber} />
        <DocumentHeading title="CERTIFICAT DE SCOLARITÉ" subtitle={`Année académique ${academicYear}`} isSigned={isSigned} />

        <View style={{ marginVertical: 15 }}>
          <Text style={{ fontSize: 10, marginBottom: 10 }}>
            L’établissement <Text style={{ fontWeight: 'bold' }}>{tenant.name}</Text> certifie que :
          </Text>
          <Text style={{ fontSize: 12, fontWeight: 'bold', textAlign: 'center', marginVertical: 12 }}>
            {student.firstName} {student.lastName}
          </Text>
          <View style={{ padding: 12, borderLeftWidth: 3, borderLeftColor: colors.secondary, backgroundColor: '#f8fafc', gap: 4 }}>
            {student.matricule && <Text style={{ fontSize: 10 }}>- Matricule : {student.matricule}</Text>}
            {student.program && <Text style={{ fontSize: 10 }}>- Programme : {student.program}</Text>}
            {student.level && <Text style={{ fontSize: 10 }}>- Niveau d&apos;étude : {student.level}</Text>}
          </View>
          <Text style={{ fontSize: 10, marginTop: 15 }}>
            Est régulièrement inscrit(e) pour l&apos;année académique {academicYear}.
          </Text>
          <Text style={{ fontSize: 10, marginTop: 10, fontStyle: 'italic' }}>
            Délivré à l&apos;intéressé(e) pour servir et valoir ce que de droit.
          </Text>
        </View>

        <View style={styles.signature} wrap={false}>
          <SignatureField title="Service de la scolarité" />
          <SignatureField title={tenant.rectorTitle || 'Responsable de l’établissement'} name={tenant.rectorName} />
        </View>
        <Text style={{ fontSize: 8, color: colors.muted, marginTop: 13 }}>Émis {tenant.city ? `à ${tenant.city}, ` : ''}le {formatDate(new Date())}</Text>

        <Footer tenant={tenant} docNumber={docNumber} verificationCode={verificationCode} qrCodeDataUrl={qrCodeDataUrl} isSigned={isSigned} />
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
        <DocumentHeader tenant={tenant} />
        <DocumentHeading title="LISTE DES ÉTUDIANTS" subtitle={`${program ? `${program} · ` : ''}${level ? `${level} · ` : ''}${academicYear} · ${students.length} étudiants`} isSigned={false} eyebrow="EXPORT ADMINISTRATIF" />

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
          <Text>{tenant.name} · liste administrative générée le {formatDate(new Date())}</Text>
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
  { id: 'ATTESTATION_NIVEAU', label: 'Attestation de validation de niveau', prefix: 'AN' },
  { id: 'DIPLOME', label: 'Diplôme', prefix: 'DIP' },
  { id: 'PV_DELIBERATION', label: 'Procès-verbal de délibération', prefix: 'PV' },
  { id: 'CERTIFICAT_SCOLARITE', label: 'Certificat de scolarité', prefix: 'CS' },
  { id: 'LISTE_ETUDIANTS', label: "Liste d'étudiants", prefix: 'LE' },
]
