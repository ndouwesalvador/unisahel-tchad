/* eslint-disable jsx-a11y/alt-text -- @react-pdf/renderer Image is not an HTML img */
import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image, Svg, Rect, Path, Ellipse } from '@react-pdf/renderer'
import { formatDate, formatNumber, getVerificationUrl, TenantInfo, StudentInfo } from './utils'
import { PV_COLUMNS_PER_SHEET, PV_ROWS_PER_SHEET, PV_A4_COLUMNS_PER_SHEET, PV_A4_ROWS_PER_SHEET, type PvSection } from './pv-matrix'

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
  reference: { width: 132, alignItems: 'flex-end', marginLeft: 10 },
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

function DocumentHeader({ tenant, docNumber, compact = false, subtle = false }: { tenant: TenantInfo; docNumber?: string; compact?: boolean; subtle?: boolean }) {
  const shortName = tenant.shortName?.trim() || tenant.name.split(/\s+/).map((word) => word[0]).join('').slice(0, 4).toUpperCase()
  const contact = [tenant.address, tenant.city, tenant.phone, tenant.email, tenant.website].filter(Boolean).join('  ·  ')
  const isChad = /tchad|chad/i.test(tenant.country || '')
  const frenchLines = tenant.headerLinesFr ?? [isChad ? 'RÉPUBLIQUE DU TCHAD' : (tenant.country || ''), tenant.ministry || '', tenant.name]
  const primary = tenant.primaryColor || colors.primary
  const accent = tenant.accentColor || '#c7a44b'
  return (
    <View wrap={false}>
      <View style={{ ...styles.topRule, height: subtle ? 2 : 5, backgroundColor: subtle ? accent : primary }} />
      <View style={{ flexDirection: 'row', height: compact ? 72 : 90, alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ width: '37%', height: compact ? 66 : 76, alignItems: 'center', paddingRight: 5, justifyContent: 'space-around' }}>
          {frenchLines.filter(Boolean).slice(0, 10).map((line, index) => <Text key={`${index}-${line}`} style={{ fontSize: Math.max(4.2, Math.min(frenchLines.length > 6 ? 5.2 : frenchLines.length > 4 ? 6 : 7, 330 / line.length)), fontWeight: index === 0 || index === frenchLines.length - 1 ? 'bold' : 'normal', textAlign: 'center', color: primary }}>{line.toUpperCase()}</Text>)}
        </View>
        <View style={{ width: '26%', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 7, fontWeight: 'bold', color: primary, textAlign: 'center' }}>{tenant.motto?.toUpperCase() || (isChad ? 'UNITÉ · TRAVAIL · PROGRÈS' : '')}</Text>
          {tenant.logo?.startsWith('data:image/') ? <Image src={tenant.logo} style={{ width: compact ? 62 : 76, height: compact ? 52 : 66, objectFit: 'contain', marginTop: 3 }} />
            : <View style={{ width: compact ? 52 : 62, height: compact ? 52 : 62, marginTop: 3, borderWidth: 1, borderColor: colors.secondary, borderRadius: 31, justifyContent: 'center' }}><Text style={{ fontSize: 9, color: colors.secondary, textAlign: 'center' }}>{shortName}</Text></View>}
        </View>
        <View style={{ width: '37%', height: compact ? 66 : 76, alignItems: 'center', paddingLeft: 5, justifyContent: 'center' }}>
          {tenant.arabicHeaderImage?.startsWith('data:image/png;base64,') && <Image src={tenant.arabicHeaderImage} style={{ width: '100%', height: compact ? 66 : 76, objectFit: 'fill' }} />}
        </View>
      </View>
      <Text style={{ ...styles.contactLine, marginBottom: 10, textAlign: 'center' }}>{contact || 'Coordonnées de l’établissement non renseignées'}{docNumber ? `  ·  RÉF. ${docNumber.replace(/^[^-]+-/, '')}` : ''}</Text>
    </View>
  )
}

function DocumentHeading({ title, subtitle, isSigned, eyebrow, compact = false, subtle = false }: { title: string; subtitle?: string; isSigned: boolean; eyebrow?: string; compact?: boolean; subtle?: boolean }) {
  return <View wrap={false}>
    <Text style={subtle ? { ...styles.eyebrow, color: '#66727c' } : styles.eyebrow}>{eyebrow ?? (isSigned ? 'DOCUMENT VALIDÉ PAR L’ÉTABLISSEMENT' : 'APERÇU NON VALIDÉ')}</Text>
    <Text style={subtle ? { ...styles.docTitle, color: '#2b3641' } : styles.docTitle}>{title}</Text>
    {subtitle && <Text style={compact ? { ...styles.docSubtitle, marginBottom: 8 } : styles.docSubtitle}>{subtitle}</Text>}
  </View>
}

function SignatureField({ title, name, image }: { title: string; name?: string; image?: string }) {
  return <View style={styles.signatureBlock} wrap={false}>
    {image?.startsWith('data:image/') ? <Image src={image} style={{ height: 43, width: 150, objectFit: 'contain', marginBottom: 3 }} /> : <View style={{ ...styles.signatureLine, marginTop: 40 }} />}
    <Text style={[styles.signatureLabel, { fontWeight: 'bold', color: colors.primary, textAlign: 'center' }]}>{title}</Text>
    {name && <Text style={[styles.signatureLabel, { color: colors.primary, marginTop: 2, textAlign: 'center' }]}>{name}</Text>}
  </View>
}

function DocumentSignatories({ tenant, compact = false, anchored = false, bottom = 98 }: { tenant: TenantInfo; compact?: boolean; anchored?: boolean; bottom?: number }) {
  const signers = [
    { title: tenant.secondarySignerTitle || 'Signataire de gauche', name: tenant.secondarySignerName, image: tenant.secondarySignature },
    { title: tenant.thirdSignerTitle || 'Signataire central', name: tenant.thirdSignerName, image: tenant.thirdSignature },
    { title: tenant.rectorTitle || 'Responsable de l’établissement', name: tenant.rectorName, image: tenant.signature },
  ]
  return <View style={{ ...(anchored ? { position: 'absolute' as const, bottom, left: 31, right: 31, height: 67 } : { marginTop: compact ? 8 : 18, minHeight: compact ? 67 : 76 }), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }} wrap={false} fixed={anchored}>
    {signers.map((signer, index) => <View key={index} style={{ width: '31%', height: compact ? 64 : 72, alignItems: 'center', justifyContent: 'flex-end' }}>
      {signer.image?.startsWith('data:image/')
        ? <Image src={signer.image} style={{ width: index === 2 ? 96 : 125, height: 34, objectFit: 'contain', marginBottom: 2 }} />
        : <View style={{ width: '82%', borderBottomWidth: 0.7, borderBottomColor: '#c7a44b', marginBottom: 5, marginTop: 29 }} />}
      <Text style={{ fontSize: compact ? 7 : 7.5, fontWeight: 'bold', color: colors.primary, textAlign: 'center' }}>{signer.title}</Text>
      <Text style={{ fontSize: compact ? 6.6 : 7.2, color: colors.primary, textAlign: 'center', marginTop: 1 }}>{signer.name || 'À renseigner'}</Text>
      {index === 2 && tenant.stamp?.startsWith('data:image/') && <Image src={tenant.stamp} style={{ width: 50, height: 43, objectFit: 'contain', position: 'absolute', right: -7, top: 0 }} />}
    </View>)}
  </View>
}

// Stable institution-specific guilloché, drawn as light vector strokes.
// It is decorative artwork, not a claim of counterfeit-proof security.
function DiplomaSecurityFrame({ tenant }: { tenant: TenantInfo }) {
  const seed = [...(tenant.id || tenant.name)].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7)
  const petals = 10 + seed % 9
  const loops = Array.from({ length: petals }, (_, index) => {
    const angle = index * Math.PI * 2 / petals
    const x = 420 + Math.cos(angle) * (85 + seed % 16)
    const y = 296 + Math.sin(angle) * (64 + seed % 13)
    return `M 420 296 Q ${x.toFixed(1)} ${(y - 36).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)} Q ${(x + 21).toFixed(1)} ${(y + 27).toFixed(1)} 420 296`
  }).join(' ')
  return <View style={{ position: 'absolute', left: 0, top: 0, width: 842, height: 595 }} fixed>
  <Svg width={842} height={595} viewBox="0 0 842 595">
    <Rect x={15} y={15} width={812} height={565} fill="none" stroke={colors.primary} strokeWidth={2} />
    <Rect x={22} y={22} width={798} height={551} fill="none" stroke={colors.accent} strokeWidth={0.9} />
    <Rect x={29} y={29} width={784} height={537} fill="none" stroke={colors.primary} strokeWidth={0.35} />
    <Path d={loops} fill="none" stroke={colors.secondary} strokeWidth={0.7} opacity={0.11} />
    {[0, 1, 2, 3].map((corner) => {
      const x = corner % 2 ? 776 : 66
      const y = corner > 1 ? 531 : 64
      return <React.Fragment key={corner}>
        <Ellipse cx={x} cy={y} rx={31 + seed % 7} ry={18 + seed % 5} fill="none" stroke={colors.accent} strokeWidth={0.8} opacity={0.5} />
        <Ellipse cx={x} cy={y} rx={19 + seed % 5} ry={29 + seed % 7} fill="none" stroke={colors.secondary} strokeWidth={0.6} opacity={0.4} />
      </React.Fragment>
    })}
    {Array.from({ length: 8 }, (_, index) => <Path key={index}
      d={`M 36 ${80 + index * 58} Q ${110 + seed % 60} ${65 + index * 58} 190 ${80 + index * 58} M 652 ${80 + index * 58} Q ${730 - seed % 60} ${65 + index * 58} 806 ${80 + index * 58}`}
      fill="none" stroke={colors.accent} strokeWidth={0.4} opacity={0.24} />)}
  </Svg>
  </View>
}

function OfficialMarks({ tenant }: { tenant: TenantInfo }) {
  if (!tenant.stamp?.startsWith('data:image/') && !tenant.signature?.startsWith('data:image/')) return null
  return <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', height: 38, marginTop: 5 }} wrap={false}>
    {tenant.stamp?.startsWith('data:image/') && <Image src={tenant.stamp} style={{ height: 37, width: 68, objectFit: 'contain' }} />}
    {tenant.signature?.startsWith('data:image/') && <Image src={tenant.signature} style={{ height: 33, width: 85, objectFit: 'contain' }} />}
  </View>
}

function JurySignatures({ members, tenant, compact = false }: { members: Array<{ name: string; role: string; signature?: string }>; tenant: TenantInfo; compact?: boolean }) {
  return <View style={{ marginTop: compact ? 4 : 9, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: compact ? 3 : 5 }} wrap={false}>
    <Text style={{ fontSize: 7.5, fontWeight: 'bold', color: colors.primary, marginBottom: 4 }}>MEMBRES DU JURY · SIGNATURES</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {members.map((member, index) => <View key={`${member.name}-${index}`} style={{ width: compact ? '16.66%' : '25%', height: compact ? 24 : 37, paddingRight: 8, paddingBottom: 3 }}>
        <Text style={{ fontSize: compact ? 5.6 : 6.8, color: colors.primary }}>{member.role === 'President' ? 'Président' : 'Membre'} · {member.name}</Text>
        {member.signature?.startsWith('data:image/') ? <Image src={member.signature} style={{ height: compact ? 13 : 23, width: compact ? 60 : 95, objectFit: 'contain' }} />
          : <View style={{ borderBottomWidth: 0.6, borderBottomColor: colors.muted, width: compact ? 60 : 95, marginTop: compact ? 11 : 21 }} />}
      </View>)}
    </View>
    {tenant.stamp?.startsWith('data:image/') && <Image src={tenant.stamp} style={{ position: 'absolute', right: 0, bottom: 0, height: 40, width: 60, objectFit: 'contain' }} />}
  </View>
}

function Footer({ tenant, docNumber, verificationCode, qrCodeDataUrl, isSigned = false, qrInBody = false }: { tenant: TenantInfo; docNumber?: string; verificationCode?: string; qrCodeDataUrl?: string; isSigned?: boolean; qrInBody?: boolean }) {
  return (
    <>
      {verificationCode && !qrInBody && (
        <View style={styles.verificationBar} wrap={false} fixed>
          {qrCodeDataUrl && <Image src={qrCodeDataUrl} style={styles.qrCode} />}
          <View style={styles.verificationTextGroup}>
            <Text style={[styles.verificationText, { fontWeight: 'bold' }]}>{isSigned ? 'Référence institutionnelle' : 'Document non validé'} · {verificationCode}</Text>
            <Text style={styles.verificationText}>{getVerificationUrl(verificationCode).replace(/^https?:\/\//, '')}</Text>
          </View>
        </View>
      )}
      <View style={styles.footer} wrap={false} fixed>
        <Text>
          {tenant.name}{docNumber ? ` · ${docNumber}` : ''}
        </Text>
        <Text>{isSigned ? `Référence consultable par ${qrInBody ? 'le QR du relevé' : 'le code ci-dessus'}. Les visuels de cachet et signature ne sont pas des signatures cryptographiques.` : 'APERÇU NON VALIDÉ - ne constitue pas une pièce officielle.'}</Text>
      </View>
      <Text style={styles.pageNumber} fixed render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </>
  )
}

export function ReleveNotesPDF({
  tenant, student, semester, ueGrades, academicYear, jury, docNumber, verificationCode, qrCodeDataUrl, isSigned = false,
}: {
  tenant: TenantInfo; student: StudentInfo; semester: string; ueGrades: Array<{ ue: string; code: string; credits: number; notes: Array<{ ec: string; code?: string; coef: number; cc?: number; tp?: number; exam?: number; final?: number }>; moyenne?: number }>; academicYear: string; jury?: { average: number; creditsAcquired: number; decision: string; date: string }; docNumber: string; verificationCode: string; qrCodeDataUrl?: string; isSigned?: boolean
}) {
  const rowCount = ueGrades.reduce((sum, ue) => sum + ue.notes.length, 0)
  const density = ueGrades.length + rowCount
  const credits = ueGrades.reduce((sum, ue) => sum + ue.credits, 0)
  const tableFont = density > 42 ? 5.1 : density > 34 ? 5.5 : density > 24 ? 6.1 : density > 18 ? 7.1 : 8.1
  // The table is elastic like the EduSahel bulletin: compact for a complete
  // curriculum, generous for a short one. Final PDF pagination is validated.
  const rowPadding = Math.max(0.3, Math.min(6, (275 - density * tableFont * 1.2) / Math.max(1, density * 2)))
  const note = (value?: number) => value == null ? '—' : formatNumber(value).replace('.', ',')
  const paper = { ink: '#2b3641', muted: '#5f6b75', rule: '#d2b262', tint: '#f8f7f2', tintAlt: '#fafbfb', gold: '#c7a44b' }
  const ueTints = [
    { fill: '#eef3f9', edge: '#90a8c2' },
    { fill: '#eef6f1', edge: '#8bb69a' },
    { fill: '#fbf5e9', edge: '#c7a44b' },
  ]
  const initials = `${student.firstName?.[0] || ''}${student.lastName?.[0] || ''}`.toUpperCase()
  const inlineQr = Boolean(qrCodeDataUrl?.startsWith('data:image/'))
  return (
    <Document>
      <Page size="A4" style={{ ...styles.page, paddingTop: 15, paddingHorizontal: 29, paddingBottom: 104 }}>
        <View style={{ position: 'absolute', top: 12, bottom: 12, left: 17, right: 17, borderWidth: 0.65, borderColor: '#d4b96e' }} fixed />
        <DocumentSignatories tenant={tenant} compact={density > 24} anchored bottom={inlineQr ? 43 : 98} />
        <DocumentHeader tenant={tenant} docNumber={docNumber} compact subtle />
        <DocumentHeading title="RELEVÉ DE NOTES" subtitle={`${semester || 'Année complète'} · ${academicYear}`} isSigned={isSigned} compact subtle />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.8, borderTopColor: paper.gold, backgroundColor: paper.tint, paddingVertical: density > 34 ? 4 : 6, paddingHorizontal: 9, marginBottom: 6 }} wrap={false}>
          <View style={{ width: '23%' }}><Text style={{ fontSize: 6, color: colors.muted }}>ANNÉE ACADÉMIQUE</Text><Text style={{ fontSize: 8.3, color: colors.primary, fontWeight: 'bold', marginTop: 1 }}>{academicYear}</Text></View>
          <View style={{ width: '39%' }}><Text style={{ fontSize: 6, color: colors.muted }}>FILIÈRE</Text><Text style={{ fontSize: 8, color: colors.primary, fontWeight: 'bold', marginTop: 1 }}>{student.program || '—'}</Text></View>
          <View style={{ width: '21%' }}><Text style={{ fontSize: 6, color: colors.muted }}>NIVEAU</Text><Text style={{ fontSize: 8, color: colors.primary, fontWeight: 'bold', marginTop: 1 }}>{student.level || '—'}</Text></View>
          <View style={{ width: '13%' }}><Text style={{ fontSize: 6, color: colors.muted }}>CRÉDITS</Text><Text style={{ fontSize: 8.3, color: colors.primary, fontWeight: 'bold', marginTop: 1 }}>{credits} ECTS</Text></View>
        </View>

        <View style={{ flexDirection: 'row', borderWidth: 0.8, borderColor: paper.rule, borderLeftWidth: 2, borderLeftColor: paper.gold, marginBottom: 7, minHeight: density > 34 ? 60 : 69 }} wrap={false}>
          <View style={{ width: density > 34 ? 57 : 65, padding: 4, borderRightWidth: 0.5, borderRightColor: colors.border, justifyContent: 'center' }}>
            {student.photo?.startsWith('data:image/') ? <Image src={student.photo} style={{ width: density > 34 ? 49 : 57, height: density > 34 ? 49 : 57, objectFit: 'cover' }} />
              : <View style={{ width: density > 34 ? 49 : 57, height: density > 34 ? 49 : 57, backgroundColor: paper.tint, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 18, fontWeight: 'bold', color: paper.ink }}>{initials}</Text></View>}
          </View>
          <View style={{ flexGrow: 1, padding: density > 34 ? 5 : 8, justifyContent: 'center' }}>
            <Text style={{ fontSize: 6.5, color: colors.muted, letterSpacing: 0.9 }}>NOM ET PRÉNOMS</Text>
            <Text style={{ fontSize: density > 34 ? 11 : 13, fontWeight: 'bold', color: colors.primary, marginTop: 2 }}>{student.lastName.toUpperCase()} {student.firstName}</Text>
            <Text style={{ fontSize: 7.2, color: colors.muted, marginTop: 3 }}>Matricule : {student.matricule || '—'}{student.gender ? ` · ${student.gender === 'M' ? 'Masculin' : student.gender === 'F' ? 'Féminin' : student.gender}` : ''}</Text>
            {student.dateOfBirth && <Text style={{ fontSize: 7, color: colors.muted, marginTop: 2 }}>Né(e) le {formatDate(student.dateOfBirth)}{student.placeOfBirth ? ` à ${student.placeOfBirth}` : ''}</Text>}
          </View>
          {qrCodeDataUrl?.startsWith('data:image/') && <View style={{ width: density > 34 ? 62 : 69, padding: 4, borderLeftWidth: 0.5, borderLeftColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
            <Image src={qrCodeDataUrl} style={{ width: density > 34 ? 48 : 55, height: density > 34 ? 48 : 55 }} />
            <Text style={{ fontSize: 5, textAlign: 'center', color: colors.muted }}>Vérifier ce relevé</Text>
          </View>}
        </View>

        <View style={{ borderWidth: 0.7, borderColor: paper.rule }}>
          <View style={{ flexDirection: 'row', backgroundColor: '#edf1f2', borderBottomWidth: 0.8, borderBottomColor: '#cbd4d8', paddingVertical: density > 34 ? 3 : 5, paddingHorizontal: 5 }}>
            <Text style={{ width: '39%', fontSize: tableFont, color: paper.ink, fontWeight: 'bold' }}>ÉLÉMENT CONSTITUTIF / UE</Text>
            <Text style={{ width: '10%', fontSize: tableFont, color: paper.ink, textAlign: 'center' }}>CC</Text>
            <Text style={{ width: '10%', fontSize: tableFont, color: paper.ink, textAlign: 'center' }}>TP</Text>
            <Text style={{ width: '14%', fontSize: tableFont, color: paper.ink, textAlign: 'center' }}>EXAMEN</Text>
            <Text style={{ width: '11%', fontSize: tableFont, color: paper.ink, textAlign: 'center' }}>COEF.</Text>
            <Text style={{ width: '16%', fontSize: tableFont, color: paper.ink, textAlign: 'center' }}>MOY. / 20</Text>
          </View>
          {ueGrades.map((ue, i) => <View key={`${ue.code}-${i}`} wrap={false}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: ueTints[i % ueTints.length].fill, borderTopWidth: 0.55, borderTopColor: paper.rule, borderLeftWidth: 2, borderLeftColor: ueTints[i % ueTints.length].edge, paddingVertical: rowPadding + 0.8, paddingHorizontal: 5 }}>
              <Text style={{ fontSize: tableFont + 0.3, color: paper.ink, fontWeight: 'bold', width: '72%' }}>{ue.code ? `${ue.code} · ` : ''}{ue.ue}</Text>
              <Text style={{ fontSize: tableFont + 0.3, color: paper.ink, fontWeight: 'bold', width: '28%', textAlign: 'right' }}>{ue.credits} ECTS · UE {note(ue.moyenne)}</Text>
            </View>
            {ue.notes.map((entry, j) => <View key={j} style={{ flexDirection: 'row', paddingVertical: rowPadding, paddingHorizontal: 5, backgroundColor: j % 2 ? paper.tintAlt : '#ffffff', borderTopWidth: 0.3, borderTopColor: paper.rule, borderLeftWidth: 2, borderLeftColor: '#e3e8e9' }} wrap={false}>
              <Text style={{ width: '39%', fontSize: tableFont, color: colors.text }}>{entry.code ? `${entry.code} · ` : ''}{entry.ec}</Text>
              <Text style={{ width: '10%', fontSize: tableFont, textAlign: 'center' }}>{note(entry.cc)}</Text>
              <Text style={{ width: '10%', fontSize: tableFont, textAlign: 'center' }}>{note(entry.tp)}</Text>
              <Text style={{ width: '14%', fontSize: tableFont, textAlign: 'center' }}>{note(entry.exam)}</Text>
              <Text style={{ width: '11%', fontSize: tableFont, textAlign: 'center' }}>{entry.coef}</Text>
              <Text style={{ width: '16%', fontSize: tableFont, textAlign: 'center', fontWeight: 'bold', color: entry.final == null ? paper.muted : paper.ink }}>{note(entry.final)}</Text>
            </View>)}
          </View>)}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: density > 34 ? 5 : 8, marginBottom: 4 }} wrap={false}>
          <View style={{ height: 0.7, backgroundColor: colors.border, flexGrow: 1 }} />
          <Text style={{ fontSize: 7, color: colors.muted, fontWeight: 'bold', letterSpacing: 1.1, marginHorizontal: 8 }}>RÉSULTATS ACADÉMIQUES</Text>
          <View style={{ height: 0.7, backgroundColor: colors.border, flexGrow: 1 }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 5 }} wrap={false}>
          <View style={{ width: '34%', borderTopWidth: 1, borderTopColor: paper.gold, backgroundColor: paper.tint, padding: density > 34 ? 5 : 8, alignItems: 'center' }}>
            <Text style={{ fontSize: 6, color: colors.muted, letterSpacing: 0.6 }}>MOYENNE GÉNÉRALE</Text>
            <Text style={{ fontSize: density > 34 ? 13 : 18, fontWeight: 'bold', color: colors.primary, marginTop: 2 }}>{jury ? note(jury.average) : '—'} <Text style={{ fontSize: 8 }}>/ 20</Text></Text>
            {jury && <View style={{ width: '100%', height: 2, backgroundColor: '#e4e9ea', marginTop: 3 }}><View style={{ width: `${Math.max(0, Math.min(100, jury.average * 5))}%`, height: 2, backgroundColor: '#aab9bf' }} /></View>}
          </View>
          <View style={{ width: '26%', borderTopWidth: 1, borderTopColor: paper.gold, borderWidth: 0.5, borderColor: paper.rule, padding: density > 34 ? 5 : 8, alignItems: 'center' }}>
            <Text style={{ fontSize: 6, color: colors.muted, letterSpacing: 0.6 }}>CRÉDITS ACQUIS</Text>
            <Text style={{ fontSize: density > 34 ? 12 : 15, fontWeight: 'bold', color: colors.primary, marginTop: 3 }}>{jury ? jury.creditsAcquired : '—'} <Text style={{ fontSize: 8 }}>/ {credits}</Text></Text>
          </View>
          <View style={{ width: '38%', borderTopWidth: 1, borderTopColor: paper.gold, borderWidth: 0.5, borderColor: paper.rule, padding: density > 34 ? 5 : 8, alignItems: 'center' }}>
            <Text style={{ fontSize: 6, color: colors.muted, letterSpacing: 0.6 }}>DÉCISION DU JURY</Text>
            <Text style={{ fontSize: density > 34 ? 9 : 11, fontWeight: 'bold', color: jury ? paper.ink : paper.muted, marginTop: 4, textAlign: 'center' }}>{jury ? decisionLabel(jury.decision) : 'Non publiée'}</Text>
          </View>
        </View>
        <Text style={{ fontSize: density > 34 ? 6 : 7, color: colors.muted, marginTop: 5 }}>{jury ? `Résultats arrêtés par le jury le ${formatDate(jury.date)}. ` : ''}CC : contrôle continu · TP : travaux pratiques · EC : élément constitutif · UE : unité d’enseignement.</Text>
        <Footer tenant={tenant} docNumber={docNumber} verificationCode={verificationCode} qrCodeDataUrl={qrCodeDataUrl} isSigned={isSigned} qrInBody={inlineQr} />
      </Page>
    </Document>
  )
}

export function AttestationInscriptionPDF({
  tenant, student, academicYear, issuedAt, docNumber, verificationCode, qrCodeDataUrl, isSigned = false,
}: {
  tenant: TenantInfo; student: StudentInfo; academicYear: string; issuedAt?: string; docNumber: string; verificationCode: string; qrCodeDataUrl?: string; isSigned?: boolean
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
          <SignatureField title={tenant.rectorTitle || 'Responsable de l’établissement'} name={tenant.rectorName} image={tenant.signature} />
        </View>
        <OfficialMarks tenant={{ ...tenant, signature: undefined }} />
        <Text style={{ fontSize: 8, color: colors.muted, marginTop: 13 }}>Émis {tenant.city ? `à ${tenant.city}, ` : ''}le {formatDate(issuedAt || new Date())}</Text>

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
        <DocumentHeading title="ATTESTATION DE NIVEAU" subtitle={`${award.level} · Année académique ${academicYear}`} isSigned />

        <View style={{ marginTop: 19, marginBottom: 18 }}>
          <Text style={{ fontSize: 10, lineHeight: 1.6 }}>
            {tenant.name} atteste, au vu des résultats arrêtés par le jury, que :
          </Text>
        </View>

        <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.primary, textAlign: 'center', marginBottom: 19 }}>
          {student.firstName} {student.lastName}
        </Text>

        <View style={[styles.section, { padding: 16, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 3, borderLeftColor: colors.secondary }]}>
          {student.matricule && <View style={styles.row}><Text style={styles.label}>Matricule</Text><Text style={styles.value}>{student.matricule}</Text></View>}
          {student.dateOfBirth && <View style={styles.row}><Text style={styles.label}>Date de naissance</Text><Text style={styles.value}>{formatDate(student.dateOfBirth)}{student.placeOfBirth ? ` à ${student.placeOfBirth}` : ''}</Text></View>}
          <View style={styles.row}><Text style={styles.label}>Programme</Text><Text style={styles.value}>{award.program}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Niveau validé</Text><Text style={styles.value}>{award.level}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Crédits acquis</Text><Text style={styles.value}>{award.credits}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Décision du jury</Text><Text style={styles.value}>NIVEAU VALIDÉ · {formatDate(award.juryDate)}</Text></View>
        </View>

        <Text style={{ fontSize: 10, lineHeight: 1.6, marginTop: 20 }}>
          L’intéressé(e) a satisfait aux exigences du niveau {award.level} du programme {award.program}, sans dette de crédits pour l’année académique {academicYear}. La présente attestation est délivrée pour servir et valoir ce que de droit.
        </Text>

        <View style={styles.signature} wrap={false}>
          <SignatureField title="Service de la scolarité" />
          <SignatureField title={tenant.rectorTitle || 'Responsable de l’établissement'} name={tenant.rectorName} image={tenant.signature} />
        </View>
        <OfficialMarks tenant={{ ...tenant, signature: undefined }} />
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
      <Page size="A4" orientation="landscape" style={{ ...styles.page, paddingTop: 27, paddingBottom: 87 }}>
        <DiplomaSecurityFrame tenant={tenant} />
        <DocumentHeader tenant={tenant} docNumber={docNumber} />
        <DocumentHeading title="DIPLÔME" subtitle={diploma.program} isSigned={isSigned} compact />

        <View style={{ flexGrow: 1, minHeight: 190, marginVertical: 5, paddingVertical: 15, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.accent, backgroundColor: '#ffffffde' }} wrap={false}>
          <Text style={{ fontSize: 9, color: colors.muted, marginBottom: 8, letterSpacing: 1 }}>DÉCERNÉ À</Text>
          <Text style={{ fontSize: 19, fontWeight: 'bold', color: colors.primary, marginVertical: 8, textAlign: 'center' }}>
            {student.firstName} {student.lastName}
          </Text>
          {student.dateOfBirth && <Text style={{ fontSize: 9, color: colors.muted }}>Né(e) le {formatDate(student.dateOfBirth)}{student.placeOfBirth ? ` à ${student.placeOfBirth}` : ''}</Text>}
          <Text style={{ fontSize: 10, marginTop: 10 }}>A obtenu le diplôme de</Text>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.secondary, marginVertical: 8, textAlign: 'center' }}>
            {diploma.title}
          </Text>
          <Text style={{ fontSize: 10, textAlign: 'center' }}>Après validation des {diploma.credits} crédits requis du cursus</Text>
          {diploma.mention && <Text style={{ fontSize: 10, marginTop: 8 }}>Mention : <Text style={{ fontWeight: 'bold', color: colors.primary }}>{diploma.mention}</Text></Text>}
          <Text style={{ fontSize: 9, color: colors.muted, marginTop: 8 }}>Décision finale du jury du {formatDate(diploma.date)}</Text>
        </View>

        <DocumentSignatories tenant={tenant} compact />

        <Footer tenant={tenant} docNumber={docNumber} verificationCode={verificationCode} qrCodeDataUrl={qrCodeDataUrl} isSigned={isSigned} />
      </Page>
    </Document>
  )
}

function decisionLabel(decision: string) {
  const labels: Record<string, string> = {
    ADMI: 'ADMIS', ADMI_DETTE: 'ADMIS AVEC DETTE', COMPENSE: 'ADMIS PAR COMPENSATION',
    AJOURNE: 'AJOURNÉ', REDOUBLANT: 'REDOUBLANT', EXCLU: 'EXCLU',
  }
  return labels[decision] || decision
}

function PVMatrixPDF({ tenant, departmentName, departmentHeadName, session, members, sections,
  academicYear, docNumber, verificationCode, qrCodeDataUrl, isSigned, pageFormat = 'A3' }: {
  tenant: TenantInfo; departmentName: string; departmentHeadName?: string
  session: { name: string; date: string; type: string }; members: Array<{ name: string; role: string; signature?: string }>
  sections: PvSection[]; academicYear: string; docNumber: string; verificationCode: string
  qrCodeDataUrl?: string; isSigned: boolean; pageFormat?: 'A3' | 'A4'
}) {
  const maxColumns = pageFormat === 'A4' ? PV_A4_COLUMNS_PER_SHEET : PV_COLUMNS_PER_SHEET
  const maxRows = pageFormat === 'A4' ? PV_A4_ROWS_PER_SHEET : PV_ROWS_PER_SHEET
  const president = members.find(member => member.role === 'President')?.name || 'Non renseigné'
  const totalStudents = sections.reduce((sum, section) => sum + section.students.length, 0)
  const sheets = sections.flatMap((section) => {
    const columnPanels: PvSection['columns'][] = []
    for (let start = 0; start < section.columns.length; start += maxColumns) {
      columnPanels.push(section.columns.slice(start, start + maxColumns))
    }
    const rowPanels: Array<{ start: number; students: PvSection['students'] }> = []
    for (let start = 0; start < section.students.length; start += maxRows) {
      rowPanels.push({ start, students: section.students.slice(start, start + maxRows) })
    }
    return rowPanels.flatMap((rows) => columnPanels.map((columns, panelIndex) => ({
      section, rows, columns, panelIndex, panels: columnPanels.length,
    })))
  })

  return <Document>
    {sheets.map(({ section, rows, columns, panelIndex, panels }, sheetIndex) => {
      const isLastPanel = panelIndex === panels - 1
      const dataWidth = pageFormat === 'A4' ? (isLastPanel ? 370 : 525) : (isLastPanel ? 605 : 780)
      const columnWidth = dataWidth / maxColumns
      const headStyle = { fontSize: 6.5, color: '#ffffff', textAlign: 'center' as const, fontWeight: 'bold' as const }
      const cellStyle = { fontSize: 7.4, color: colors.text, textAlign: 'center' as const }
      return <Page key={sheetIndex} size={pageFormat} orientation="landscape" style={{ ...styles.page, paddingTop: pageFormat === 'A4' ? 17 : 29, paddingHorizontal: 34, paddingBottom: 90 }}>
        <DocumentHeader tenant={tenant} docNumber={docNumber} />
        <DocumentHeading title="PROCÈS-VERBAL DES RÉSULTATS" subtitle={`${departmentName} · ${academicYear} · ${session.name}`} isSigned={isSigned} compact={pageFormat === 'A4'} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: pageFormat === 'A4' ? 4 : 10, padding: pageFormat === 'A4' ? 5 : 9, backgroundColor: '#edf5f0', borderLeftWidth: 3, borderLeftColor: colors.secondary }} wrap={false}>
          <View style={{ width: '58%' }}>
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary }}>{section.program}</Text>
            <Text style={{ fontSize: 8, marginTop: 3, color: colors.muted }}>{section.level} · {section.students.length} étudiants · {session.type} · Jury du {formatDate(session.date)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', width: '42%' }}>
            <Text style={{ fontSize: 9, fontWeight: 'bold', color: colors.primary }}>VOLET {panelIndex + 1}/{panels} · FEUILLE {sheetIndex + 1}/{sheets.length}</Text>
            <Text style={{ fontSize: 7.5, color: colors.muted, marginTop: 3 }}>Lignes {rows.start + 1}–{rows.start + rows.students.length} · {totalStudents} étudiants dans le département</Text>
            {panels > 1 && <Text style={{ fontSize: 7.5, color: colors.secondary, marginTop: 2 }}>Juxtaposer les volets selon le matricule et le numéro de ligne</Text>}
          </View>
        </View>
        <View style={{ borderWidth: 1, borderColor: colors.border }} wrap={false}>
          <View style={{ flexDirection: 'row', minHeight: 33, alignItems: 'center', backgroundColor: colors.primary }}>
            <Text style={{ ...headStyle, width: pageFormat === 'A4' ? 20 : 26 }}>N°</Text>
            <Text style={{ ...headStyle, width: pageFormat === 'A4' ? 80 : 108, textAlign: 'left' }}>MATRICULE</Text>
            <Text style={{ ...headStyle, width: pageFormat === 'A4' ? 130 : 170, textAlign: 'left' }}>NOM ET PRÉNOM</Text>
            {columns.map(column => <View key={column.key} style={{ width: columnWidth, paddingHorizontal: 2, alignItems: 'center' }}>
              <Text style={{ ...headStyle, fontSize: 6 }}>{column.ueCode.slice(0, 13)}</Text>
              <Text style={headStyle}>{column.code.slice(0, 13)}</Text>
              <Text style={{ ...headStyle, fontSize: 5.7, color: '#bce3cc' }}>{column.kind === 'UE' ? 'MOY. UE' : 'MATIÈRE'}</Text>
            </View>)}
            {isLastPanel && <>
              <Text style={{ ...headStyle, width: pageFormat === 'A4' ? 50 : 65 }}>MOY. /20</Text>
              <Text style={{ ...headStyle, width: pageFormat === 'A4' ? 100 : 105 }}>DÉCISION DU JURY</Text>
            </>}
          </View>
          {rows.students.map((student, index) => <View key={student.matricule} style={{ flexDirection: 'row', minHeight: 18, alignItems: 'center', backgroundColor: index % 2 ? '#f5f8fa' : '#ffffff', borderTopWidth: 0.5, borderTopColor: colors.border }} wrap={false}>
            <Text style={{ ...cellStyle, width: pageFormat === 'A4' ? 20 : 26 }}>{rows.start + index + 1}</Text>
            <Text style={{ ...cellStyle, width: pageFormat === 'A4' ? 80 : 108, textAlign: 'left', fontSize: 6.8 }}>{student.matricule}</Text>
            <Text style={{ ...cellStyle, width: pageFormat === 'A4' ? 130 : 170, textAlign: 'left', fontWeight: 'bold' }}>{student.name}</Text>
            {columns.map(column => <Text key={column.key} style={{ ...cellStyle, width: columnWidth,
              fontWeight: column.kind === 'UE' ? 'bold' : 'normal',
              color: column.kind === 'UE' ? colors.secondary : colors.text }}>
              {student.grades[column.key] == null ? '—' : formatNumber(student.grades[column.key])}
            </Text>)}
            {isLastPanel && <>
              <Text style={{ ...cellStyle, width: pageFormat === 'A4' ? 50 : 65, fontWeight: 'bold' }}>{formatNumber(student.average)}</Text>
              <Text style={{ ...cellStyle, width: pageFormat === 'A4' ? 100 : 105, fontWeight: 'bold', color: ['ADMI', 'ADMI_DETTE', 'COMPENSE'].includes(student.decision) ? colors.secondary : '#9b3030', fontSize: 6.8 }}>{decisionLabel(student.decision)}</Text>
            </>}
          </View>)}
        </View>
        <View style={{ marginTop: pageFormat === 'A4' ? 4 : 10, flexDirection: 'row', flexWrap: 'wrap' }} wrap={false}>
          {columns.map(column => <Text key={column.key} style={{ width: '25%', fontSize: 6.7, color: colors.muted, paddingRight: 9, marginBottom: 3 }}>
            <Text style={{ fontWeight: 'bold', color: colors.primary }}>{column.code}</Text> · {column.label}
          </Text>)}
        </View>
        <View style={{ marginTop: 9, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 7, flexDirection: 'row', justifyContent: 'space-between' }} wrap={false}>
          <Text style={{ fontSize: 7.5, color: colors.muted, width: '48%' }}>Présidence du jury : <Text style={{ fontWeight: 'bold', color: colors.primary }}>{president}</Text></Text>
          <Text style={{ fontSize: 7.5, color: colors.muted, width: '48%', textAlign: 'right' }}>Chef de département : <Text style={{ fontWeight: 'bold', color: colors.primary }}>{departmentHeadName || 'Non renseigné'}</Text></Text>
        </View>
        <JurySignatures members={members} tenant={tenant} compact={pageFormat === 'A4'} />
        <Footer tenant={tenant} docNumber={docNumber} verificationCode={verificationCode} qrCodeDataUrl={qrCodeDataUrl} isSigned={isSigned} />
      </Page>
    })}
  </Document>
}

export function PVDeliberationPDF({
  tenant, departmentName, departmentHeadName, session, members, students, sections, academicYear, docNumber, verificationCode, qrCodeDataUrl, isSigned = false, pageFormat = 'A3',
}: {
  tenant: TenantInfo; departmentName: string; departmentHeadName?: string; session: { name: string; date: string; type: string }; members: Array<{ name: string; role: string; signature?: string }>; students: Array<{ name: string; matricule: string; moy: number; decision: string; mention?: string }>; sections?: PvSection[]; academicYear: string; docNumber: string; verificationCode: string; qrCodeDataUrl?: string; isSigned?: boolean; pageFormat?: 'A3' | 'A4'
}) {
  if (sections?.length) return <PVMatrixPDF tenant={tenant} departmentName={departmentName} departmentHeadName={departmentHeadName}
    session={session} members={members} sections={sections} academicYear={academicYear} docNumber={docNumber}
    verificationCode={verificationCode} qrCodeDataUrl={qrCodeDataUrl} isSigned={isSigned} pageFormat={pageFormat} />
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
        <Text style={[styles.tableHeaderCell, { width: '27%' }]}>Matricule</Text>
        <Text style={[styles.tableHeaderCell, { width: '10%', textAlign: 'center' }]}>Moy.</Text>
        <Text style={[styles.tableHeaderCell, { width: '16%', textAlign: 'center' }]}>Décision</Text>
        <Text style={[styles.tableHeaderCell, { width: '14%', textAlign: 'center' }]}>Mention</Text>
      </View>
      {rows.map((student, index) => (
        <View key={index} style={[styles.tableRow, (offset + index) % 2 === 1 ? styles.tableRowAlt : {}]}>
          <Text style={[styles.tableCellCenter, { width: '8%' }]}>{offset + index + 1}</Text>
          <Text style={[styles.tableCell, { width: '25%' }]}>{student.name}</Text>
          <Text style={[styles.tableCell, { width: '27%', fontSize: 7 }]}>{student.matricule}</Text>
          <Text style={[styles.tableCellCenter, { width: '10%' }]}>{formatNumber(student.moy)}</Text>
          <Text style={[styles.tableCellCenter, { width: '16%' }]}>{student.decision}</Text>
          <Text style={[styles.tableCellCenter, { width: '14%' }]}>{student.mention || '-'}</Text>
        </View>
      ))}
    </View>
  )
  const signatures = () => <JurySignatures members={members} tenant={tenant} />

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <DocumentHeader tenant={tenant} docNumber={docNumber} />
        <DocumentHeading title="PROCÈS-VERBAL DE DÉLIBÉRATION" subtitle={`${departmentName} · Année académique ${academicYear}`} isSigned={isSigned} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Session</Text>
          <View style={styles.row}><Text style={styles.label}>Département</Text><Text style={styles.value}>{departmentName}</Text></View>
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
        <Page key={pageIndex} size="A4" orientation="landscape" style={styles.page}>
          <DocumentHeader tenant={tenant} docNumber={docNumber} />
          <DocumentHeading title="PROCÈS-VERBAL · SUITE" subtitle={`${departmentName} · ${session.name} · ${academicYear}`} isSigned={isSigned} />
          {resultTable(pageStudents, firstPageCapacity + pageIndex * 19)}
          {pageIndex === continuationPages.length - 1 && signatures()}
          <Footer tenant={tenant} docNumber={docNumber} verificationCode={verificationCode} qrCodeDataUrl={qrCodeDataUrl} isSigned={isSigned} />
        </Page>
      ))}
    </Document>
  )
}

export function CertificatScolaritePDF({
  tenant, student, academicYear, issuedAt, docNumber, verificationCode, qrCodeDataUrl, isSigned = false,
}: {
  tenant: TenantInfo; student: StudentInfo; academicYear: string; issuedAt?: string; docNumber: string; verificationCode: string; qrCodeDataUrl?: string; isSigned?: boolean
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
          <SignatureField title={tenant.rectorTitle || 'Responsable de l’établissement'} name={tenant.rectorName} image={tenant.signature} />
        </View>
        <OfficialMarks tenant={{ ...tenant, signature: undefined }} />
        <Text style={{ fontSize: 8, color: colors.muted, marginTop: 13 }}>Émis {tenant.city ? `à ${tenant.city}, ` : ''}le {formatDate(issuedAt || new Date())}</Text>

        <Footer tenant={tenant} docNumber={docNumber} verificationCode={verificationCode} qrCodeDataUrl={qrCodeDataUrl} isSigned={isSigned} />
      </Page>
    </Document>
  )
}

export interface StudentListEntry { name: string; matricule: string; gender: string; program?: string; level?: string; status?: string }

export function paginateStudentList(students: StudentListEntry[], program = ''): Array<{ rows: StudentListEntry[]; start: number }> {
  const pages: Array<{ rows: StudentListEntry[]; start: number }> = []
  let rows: StudentListEntry[] = []
  let usedHeight = 0
  let start = 0
  for (const entry of students) {
    const lines = Math.max(1, Math.ceil(entry.name.length / 50), Math.ceil((entry.program || program || '').length / 40))
    const estimatedHeight = 17 + Math.max(0, lines - 1) * 9
    if (rows.length >= 15 || (rows.length > 0 && usedHeight + estimatedHeight > 255)) {
      pages.push({ rows, start })
      start += rows.length
      rows = []
      usedHeight = 0
    }
    rows.push(entry)
    usedHeight += estimatedHeight
  }
  pages.push({ rows, start })
  return pages
}

export function ListeEtudiantsPDF({
  tenant, students, program, level, academicYear,
}: {
  tenant: TenantInfo; students: StudentListEntry[]; program?: string; level?: string; academicYear: string
}) {
  const pages = paginateStudentList(students, program)
  const statusLabels: Record<string, string> = { INSCRIT: 'Inscrit', PRE_INSCRIT: 'Pré-inscrit', SUSPENDU: 'Suspendu', EXCLU: 'Exclu', DIPLOME: 'Diplômé', ABANDON: 'Abandon', TRANSFERE: 'Transféré' }
  return (
    <Document>
      {pages.map(({ rows: pageStudents, start: pageStart }, pageIndex) => <Page key={pageIndex} size="A4" orientation="landscape" style={{ ...styles.page, paddingTop: 17, paddingHorizontal: 34, paddingBottom: 35 }}>
        <DocumentHeader tenant={tenant} compact />
        <DocumentHeading title="LISTE DES ÉTUDIANTS" subtitle={`${program ? `${program} · ` : ''}${level ? `${level} · ` : ''}${academicYear} · ${students.length} étudiant(s)`} isSigned={false} eyebrow="EXPORT ADMINISTRATIF" compact />
        <View style={{ borderTopWidth: 2, borderTopColor: colors.accent, marginTop: 2, marginBottom: 5, paddingVertical: 5, paddingHorizontal: 9, backgroundColor: '#eef2f6', flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 7.5, color: colors.primary, fontWeight: 'bold' }}>Année académique : {academicYear || 'Non précisée'}</Text>
          <Text style={{ fontSize: 7.5, color: colors.primary }}>Effectif exporté : {students.length}</Text>
        </View>
        <View style={{ borderWidth: 0.7, borderColor: colors.border }}>
          <View style={{ ...styles.tableHeader, paddingVertical: 5 }}>
            {[['#', '5%'], ['Matricule', '18%'], ['Nom et prénoms', '28%'], ['Filière', '22%'], ['Niveau', '12%'], ['Statut', '10%'], ['Sexe', '5%']].map(([label, width]) =>
              <Text key={label} style={{ ...styles.tableHeaderCell, width, fontSize: 7 }}>{label}</Text>)}
          </View>
          {pageStudents.length === 0 && <Text style={{ padding: 10, fontSize: 8, color: colors.muted }}>Aucun étudiant dans cette sélection.</Text>}
          {pageStudents.map((entry, rowIndex) => <View key={`${entry.matricule}-${rowIndex}`} wrap={false} style={{ ...styles.tableRow, paddingVertical: 4.2, backgroundColor: rowIndex % 2 ? '#f5f7fa' : '#ffffff' }}>
            <Text style={{ ...styles.tableCell, width: '5%', fontSize: 7.4 }}>{pageStart + rowIndex + 1}</Text>
            <Text style={{ ...styles.tableCell, width: '18%', fontSize: 7.4 }}>{entry.matricule || '—'}</Text>
            <Text style={{ ...styles.tableCell, width: '28%', fontSize: 7.4, fontWeight: 'bold', color: colors.primary }}>{entry.name}</Text>
            <Text style={{ ...styles.tableCell, width: '22%', fontSize: 7.2 }}>{entry.program || program || '—'}</Text>
            <Text style={{ ...styles.tableCell, width: '12%', fontSize: 7.2 }}>{entry.level || level || '—'}</Text>
            <Text style={{ ...styles.tableCell, width: '10%', fontSize: 7.2 }}>{statusLabels[entry.status || ''] || entry.status || '—'}</Text>
            <Text style={{ ...styles.tableCell, width: '5%', fontSize: 7.2 }}>{entry.gender === 'M' || entry.gender === 'F' ? entry.gender : '—'}</Text>
          </View>)}
        </View>
        <View style={{ position: 'absolute', bottom: 14, left: 34, right: 34, borderTopWidth: 0.8, borderTopColor: colors.border, paddingTop: 4, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 7, color: colors.muted }}>{tenant.name} · Export administratif du {formatDate(new Date())}</Text>
          <Text style={{ fontSize: 7, color: colors.muted }}>{pageIndex + 1} / {pages.length}</Text>
        </View>
      </Page>)}
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
