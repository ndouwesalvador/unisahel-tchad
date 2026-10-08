type ExportRow = Record<string, unknown>

const MAX_IMPORT_BYTES = 10 * 1024 * 1024
const MAX_IMPORT_ROWS = 10_000

function asRecord(value: object): ExportRow {
  return value as ExportRow
}

function safeSpreadsheetValue(value: unknown): string | number | boolean | Date {
  if (value instanceof Date) return value
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (value === null || value === undefined) return ''

  const text = typeof value === 'object' ? JSON.stringify(value) : String(value)
  // Prevent spreadsheet formula injection when an exported value comes from
  // an imported file or a user-controlled profile field.
  return /^[=+\-@]/.test(text) ? `'${text}` : text
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export async function exportToExcel<T extends object>(data: T[], fileName: string, sheetName: string = 'Feuille 1') {
  if (!data.length) return

  try {
    const { Workbook } = await import('exceljs')
    const workbook = new Workbook()
    const worksheet = workbook.addWorksheet(sheetName.slice(0, 31) || 'Feuille 1')
    const headers = Array.from(new Set(data.flatMap((row) => Object.keys(asRecord(row)))))

    worksheet.columns = headers.map((header) => ({
      header,
      key: header,
      width: Math.min(45, Math.max(12, header.length + 2)),
    }))
    for (const row of data) {
      worksheet.addRow(Object.fromEntries(
        headers.map((header) => [header, safeSpreadsheetValue(asRecord(row)[header])]),
      ))
    }
    worksheet.getRow(1).font = { bold: true }
    worksheet.views = [{ state: 'frozen', ySplit: 1 }]
    worksheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } }

    const buffer = await workbook.xlsx.writeBuffer()
    const bytes = new Uint8Array(buffer)
    const finalFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`
    downloadBlob(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), finalFileName)
  } catch {
    // A CSV remains usable in every spreadsheet program and avoids leaving
    // the export button without a result if the XLSX encoder fails.
    exportToCSV(data, fileName.replace(/\.xlsx$/i, ''))
  }
}

export function exportToCSV<T extends object>(data: T[], fileName: string) {
  if (!data.length) return

  const headers = Array.from(new Set(data.flatMap((row) => Object.keys(asRecord(row)))))
  const escape = (value: unknown) => {
    const text = String(safeSpreadsheetValue(value)).replace(/"/g, '""')
    return `"${text}"`
  }
  const rows = [headers.map(escape).join(';'), ...data.map((row) =>
    headers.map((header) => escape(asRecord(row)[header])).join(';'),
  )]
  const finalFileName = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`
  downloadBlob(new Blob([`\uFEFF${rows.join('\r\n')}`], { type: 'text/csv;charset=utf-8' }), finalFileName)
}

export async function parseExcelFile(file: File): Promise<ExportRow[]> {
  if (file.size > MAX_IMPORT_BYTES) {
    throw new Error('Le fichier dépasse la taille maximale autorisée de 10 Mo.')
  }

  const { Workbook } = await import('exceljs')
  const workbook = new Workbook()
  const bytes = new Uint8Array(await file.arrayBuffer())
  await workbook.xlsx.load(bytes as unknown as Parameters<typeof workbook.xlsx.load>[0])
  const worksheet = workbook.worksheets[0]
  if (!worksheet || worksheet.rowCount < 2) return []
  if (worksheet.rowCount - 1 > MAX_IMPORT_ROWS) {
    throw new Error(`Le fichier dépasse la limite de ${MAX_IMPORT_ROWS.toLocaleString('fr-FR')} lignes.`)
  }

  const headers = (worksheet.getRow(1).values as unknown[])
    .slice(1)
    .map((value, index) => String(value || `Colonne ${index + 1}`).trim())
  const result: ExportRow[] = []

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return
    const record: ExportRow = {}
    headers.forEach((header, index) => {
      const value = row.getCell(index + 1).value
      record[header] = value && typeof value === 'object' && 'text' in value
        ? value.text
        : value ?? ''
    })
    result.push(record)
  })

  return result
}
