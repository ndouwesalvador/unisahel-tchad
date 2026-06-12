import * as XLSX from 'xlsx'

export function exportToExcel(data: any[], fileName: string, sheetName: string = 'Sheet1') {
  if (!data || data.length === 0) return

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  // Ensure fileName ends with .xlsx
  const finalFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`
  XLSX.writeFile(workbook, finalFileName)
}

export function exportToCSV(data: any[], fileName: string) {
  if (!data || data.length === 0) return

  const worksheet = XLSX.utils.json_to_sheet(data)
  const csvContent = XLSX.utils.sheet_to_csv(worksheet)

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`
  link.click()
}

export async function parseExcelFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) throw new Error('Lecture du fichier échouée')

        const workbook = XLSX.read(data, { type: 'binary' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet)
        resolve(jsonData)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = (error) => reject(error)
    reader.readAsBinaryString(file)
  })
}
