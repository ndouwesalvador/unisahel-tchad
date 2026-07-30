import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

// Reusable client-side PDF export for tabular lists (students, teachers, ...).
// Uses @react-pdf/renderer's browser-capable pdf().toBlob() so we don't need a
// server round-trip or an extra dependency. Kept intentionally generic: pass a
// title, a column spec (header + accessor), and the rows.

export interface PdfColumn<T> {
  header: string
  // Fractional width (e.g. 0.2 = 20% of the row). Should sum to ~1.
  width: number
  value: (row: T) => string
  align?: 'left' | 'center' | 'right'
}

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 9, fontFamily: 'Helvetica', color: '#1a1a1a' },
  title: { fontSize: 15, fontWeight: 'bold', color: '#1a2744', marginBottom: 2 },
  subtitle: { fontSize: 9, color: '#6b7280', marginBottom: 12 },
  headerRow: { flexDirection: 'row', backgroundColor: '#1a2744', paddingVertical: 5, paddingHorizontal: 4 },
  headerCell: { color: '#ffffff', fontWeight: 'bold', fontSize: 8, paddingHorizontal: 3 },
  row: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb' },
  rowAlt: { backgroundColor: '#f9fafb' },
  cell: { fontSize: 8, paddingHorizontal: 3 },
  footer: { position: 'absolute', bottom: 16, left: 28, right: 28, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: '#9ca3af' },
})

function ListDocument<T>({ title, subtitle, columns, rows }: { title: string; subtitle: string; columns: PdfColumn<T>[]; rows: T[] }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page} wrap>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.headerRow} fixed>
          {columns.map((c, i) => (
            <Text key={i} style={[styles.headerCell, { width: `${c.width * 100}%`, textAlign: c.align || 'left' }]}>
              {c.header}
            </Text>
          ))}
        </View>

        {rows.map((row, ri) => (
          <View key={ri} style={ri % 2 === 1 ? [styles.row, styles.rowAlt] : styles.row} wrap={false}>
            {columns.map((c, ci) => (
              <Text key={ci} style={[styles.cell, { width: `${c.width * 100}%`, textAlign: c.align || 'left' }]}>
                {c.value(row)}
              </Text>
            ))}
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text>UniSahel — Document genere le {new Date().toLocaleDateString('fr-FR')}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

export async function exportListToPDF<T>(
  fileName: string,
  title: string,
  subtitle: string,
  columns: PdfColumn<T>[],
  rows: T[],
): Promise<void> {
  const blob = await pdf(<ListDocument title={title} subtitle={subtitle} columns={columns} rows={rows} />).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
