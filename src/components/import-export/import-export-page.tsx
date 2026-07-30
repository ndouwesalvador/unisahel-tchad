'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useStudents, useTeachers, useImportExport, useResults, usePayments, useDashboardStats, useStructure } from '@/lib/api-hooks'
import { exportToExcel, exportToCSV, parseExcelFile } from '@/lib/export'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  FileDown,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Database,
  ArrowRightLeft,
  Eye,
  Play,
  AlertTriangle,
  Copy,
  Info,
  HardDrive,
  X,
  TableIcon,
  ChevronDown,
} from 'lucide-react'

// ─── Demo Data ────────────────────────────────────────────────────────────────

type ImportType = 'Etudiants' | 'Enseignants' | 'Notes' | 'Paiements' | 'Structure'
type ImportTypeLabel = 'Étudiants' | 'Enseignants' | 'Notes' | 'Paiements' | 'Structure'
type ExportType = 'ListeEtudiants' | 'RelevesNotes' | 'EtatsFinanciers' | 'Statistiques' | 'AnnuaireEnseignants' | 'StructureAcademique'
type ExportTypeLabel = 'Liste des étudiants' | 'Relevés de notes' | 'États financiers' | 'Statistiques' | 'Annuaire enseignants' | 'Structure académique'
type ExportFormat = 'PDF' | 'Excel' | 'CSV'
type ImportStatus = 'Succes' | 'Partiel' | 'Echoue' | 'EnCours' | 'EnAttente'
type ImportStatusLabel = 'Succès' | 'Partiel' | 'Échoué' | 'En cours' | 'En attente'

const importTypeMap: Record<ImportType, ImportTypeLabel> = {
  Etudiants: 'Étudiants',
  Enseignants: 'Enseignants',
  Notes: 'Notes',
  Paiements: 'Paiements',
  Structure: 'Structure',
}

const exportTypeMap: Record<ExportType, ExportTypeLabel> = {
  ListeEtudiants: 'Liste des étudiants',
  RelevesNotes: 'Relevés de notes',
  EtatsFinanciers: 'États financiers',
  Statistiques: 'Statistiques',
  AnnuaireEnseignants: 'Annuaire enseignants',
  StructureAcademique: 'Structure académique',
}

const importStatusConfig: Record<ImportStatus, { label: ImportStatusLabel; className: string; icon: React.ElementType }> = {
  Succes: { label: 'Succès', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0', icon: CheckCircle2 },
  Partiel: { label: 'Partiel', className: 'bg-[#d4a85315] text-[#d4a853] border-0', icon: AlertCircle },
  Echoue: { label: 'Échoué', className: 'bg-[#c6282815] text-[#c62828] border-0', icon: XCircle },
  EnCours: { label: 'En cours', className: 'bg-[#1a274415] text-[#1a2744] border-0', icon: Clock },
  EnAttente: { label: 'En attente', className: 'bg-[#d4a85315] text-[#d4a853] border-0', icon: AlertCircle },
}

// ─── Import Preview ───────────────────────────────────────────────────────────
// Colonnes attendues pour un import "Etudiants" reel (le seul type actuellement pris
// en charge par /api/import-export — voir handleImport). Les autres types (Enseignants,
// Notes, Paiements, Structure) affichent un apercu du fichier mais l'import reste
// desactive tant que le mapping serveur correspondant n'existe pas.
// Expected columns per import type. Students carry a Matricule (auto-filled if
// blank); teachers are keyed by Email (their login identifier) with an
// auto-generated matricule server-side.
const STUDENT_PREVIEW_COLUMNS = ['Matricule', 'Nom', 'Prénom', 'Date naissance', 'Filière', 'Statut']
const TEACHER_PREVIEW_COLUMNS = ['Nom', 'Prénom', 'Email', 'Grade', 'Spécialisation', 'Département']

interface RowIssue {
  line: number
  matricule: string
  issue: string
}

function computeStudentRowIssues(rows: Record<string, unknown>[]): RowIssue[] {
  const seenMatricules = new Map<string, number>()
  const issues: RowIssue[] = []

  rows.forEach((row, index) => {
    const line = index + 2
    const matricule = String(row['Matricule'] ?? '').trim()
    const firstName = String(row['Prénom'] ?? row['Prenom'] ?? '').trim()
    const lastName = String(row['Nom'] ?? '').trim()
    const dob = String(row['Date naissance'] ?? '').trim()

    if (!firstName || !lastName) {
      issues.push({ line, matricule: matricule || '—', issue: 'Nom ou prenom manquant' })
      return
    }
    if (dob && !/^\d{1,2}[/\-]\d{1,2}[/\-]\d{4}$/.test(dob)) {
      issues.push({ line, matricule: matricule || '—', issue: 'Date de naissance invalide' })
      return
    }
    if (matricule) {
      const firstSeenLine = seenMatricules.get(matricule)
      if (firstSeenLine) {
        issues.push({ line, matricule, issue: `Doublon du matricule vu ligne ${firstSeenLine}` })
        return
      }
      seenMatricules.set(matricule, line)
    }
  })

  return issues
}

function computeTeacherRowIssues(rows: Record<string, unknown>[]): RowIssue[] {
  const seenEmails = new Map<string, number>()
  const issues: RowIssue[] = []

  rows.forEach((row, index) => {
    const line = index + 2
    const firstName = String(row['Prénom'] ?? row['Prenom'] ?? '').trim()
    const lastName = String(row['Nom'] ?? '').trim()
    const email = String(row['Email'] ?? row['email'] ?? '').trim()

    if (!firstName || !lastName) {
      issues.push({ line, matricule: email || '—', issue: 'Nom ou prenom manquant' })
      return
    }
    if (!email) {
      issues.push({ line, matricule: '—', issue: "Email manquant (obligatoire — sert d'identifiant de connexion)" })
      return
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      issues.push({ line, matricule: email, issue: 'Email invalide' })
      return
    }
    const firstSeen = seenEmails.get(email.toLowerCase())
    if (firstSeen) {
      issues.push({ line, matricule: email, issue: `Doublon de l'email vu ligne ${firstSeen}` })
      return
    }
    seenEmails.set(email.toLowerCase(), line)
  })

  return issues
}

function computeRowIssues(rows: Record<string, unknown>[], type: string): RowIssue[] {
  return type === 'Enseignants' ? computeTeacherRowIssues(rows) : computeStudentRowIssues(rows)
}

// ─── Custom useCountUp Hook ────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1400) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const startTime = performance.now()
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration])

  return value
}

// ─── Animated Stat Component ────────────────────────────────────────────────────

function AnimatedStat({ value, label, icon: Icon }: { value: number; label: string; icon: React.ElementType }) {
  const count = useCountUp(value, 1400)
  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-3 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-white/10">
        <Icon className="size-5 text-white" />
      </div>
      <div>
        <p className="text-xl font-bold text-white">{count}</p>
        <p className="text-[10px] text-white/70">{label}</p>
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ImportExportPage() {
  const [importType, setImportType] = useState<ImportType>('Etudiants')
  const [exportType, setExportType] = useState<ExportType>('ListeEtudiants')
  const [exportFormat, setExportFormat] = useState<ExportFormat>('Excel')
  const [showPreview, setShowPreview] = useState(false)
  const [showValidation, setShowValidation] = useState(false)
  const [activeMainTab, setActiveMainTab] = useState('import')
  const [importProgress, setImportProgress] = useState(0)
  const [isImporting, setIsImporting] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  
  const [dynamicPreviewCols, setDynamicPreviewCols] = useState<string[]>(STUDENT_PREVIEW_COLUMNS)
  const [dynamicPreviewRows, setDynamicPreviewRows] = useState<any[][]>([])
  const [fullParsedRows, setFullParsedRows] = useState<Record<string, unknown>[]>([])
  const [uploadedFileName, setUploadedFileName] = useState('')
  const [validationSummary, setValidationSummary] = useState({ validLines: 0, errorLines: 0, duplicates: 0 })

  const queryClient = useQueryClient()
  const { data: studentsQuery } = useStudents({ limit: 1000 })
  const { data: teachersQuery } = useTeachers({ limit: 1000 })
  const { data: importExportData, isLoading: isImportExportLoading } = useImportExport()
  const { data: resultsQuery } = useResults()
  const { data: paymentsQuery } = usePayments({ limit: 1000 })
  const { data: dashboardStats } = useDashboardStats()
  const { data: structureQuery } = useStructure()

  const rowIssues = useMemo(() => computeRowIssues(fullParsedRows, importType), [fullParsedRows, importType])

  const logExport = async (type: string, format: string, rowCount: number) => {
    try {
      await fetch('/api/import-export?action=export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          format,
          rowCount,
          fileSizeLabel: rowCount > 0 ? `~${Math.max(1, Math.round((rowCount * 0.2)))} Ko` : '0 Ko',
        }),
      })
      queryClient.invalidateQueries({ queryKey: ['importExport'] })
    } catch {
      // L'export a deja ete genere et telecharge cote client a ce stade ; l'echec
      // de la journalisation ne doit pas etre presente comme un echec de l'export.
    }
  }

  const handleExport = () => {
    let dataToExport: any[] = []
    let fileName = ''

    if (exportType === 'ListeEtudiants') {
      dataToExport = (studentsQuery?.data || []).map((s: any) => ({
        Matricule: s.matricule || 'N/A',
        Nom: s.lastName,
        Prénom: s.firstName,
        Filière: s.currentProgram?.name || '',
        Niveau: s.currentLevel?.code || '',
        Statut: s.status,
        Email: s.email || '',
        Sexe: s.gender || 'N/A'
      }))
      fileName = `etudiants_export_${new Date().getTime()}`
    } else if (exportType === 'AnnuaireEnseignants') {
      dataToExport = (teachersQuery?.data || []).map((t: any) => ({
        Matricule: t.employeeId || 'N/A',
        Nom: t.user?.lastName || '',
        Prénom: t.user?.firstName || '',
        Statut: t.isActive ? 'Actif' : 'Inactif',
        Spécialité: t.specialization || '',
        Email: t.user?.email || '',
        Grade: t.grade || ''
      }))
      fileName = `enseignants_export_${new Date().getTime()}`
    } else if (exportType === 'RelevesNotes') {
      dataToExport = (resultsQuery?.results || []).map((r: any) => ({
        Matricule: r.matricule,
        Nom: r.name,
        Moyenne: r.moyenne,
        Mention: r.mention,
        Credits: r.credits,
        Decision: r.decision,
      }))
      fileName = `releves_notes_${new Date().getTime()}`
    } else if (exportType === 'EtatsFinanciers') {
      dataToExport = (paymentsQuery?.data || []).map((p: any) => ({
        Matricule: p.student?.matricule || 'N/A',
        Etudiant: `${p.student?.lastName || ''} ${p.student?.firstName || ''}`.trim(),
        Filiere: p.student?.currentProgram?.name || '',
        Montant: p.amount,
        Methode: p.paymentMethod,
        Statut: p.status,
        Date: p.createdAt ? new Date(p.createdAt).toLocaleDateString('fr-FR') : '',
      }))
      fileName = `etats_financiers_${new Date().getTime()}`
    } else if (exportType === 'StructureAcademique') {
      const faculties = structureQuery?.faculties || []
      dataToExport = faculties.flatMap((f: any) =>
        (f.departments || []).flatMap((d: any) =>
          (d.programs || []).map((p: any) => ({
            Faculte: f.name,
            Departement: d.name,
            Programme: p.name,
            Code: p.code || '',
            Niveaux: (p.levels || []).length,
          }))
        )
      )
      fileName = `structure_academique_${new Date().getTime()}`
    } else {
      dataToExport = [{
        Indicateur: 'Etudiants inscrits', Valeur: dashboardStats?.totalStudents ?? 0,
      }, {
        Indicateur: 'Enseignants actifs', Valeur: dashboardStats?.totalTeachers ?? 0,
      }, {
        Indicateur: 'Programmes', Valeur: dashboardStats?.totalPrograms ?? 0,
      }]
      fileName = `statistiques_${new Date().getTime()}`
    }

    if (dataToExport.length === 0) {
      toast.error('Aucune donnee disponible pour cet export pour le moment.')
      return
    }

    toast.success('Génération lancée', {
      description: `L'export ${exportTypeMap[exportType]} au format ${exportFormat} est en cours de préparation.`
    })

    if (exportFormat === 'Excel') {
      exportToExcel(dataToExport, fileName, exportTypeMap[exportType])
    } else if (exportFormat === 'CSV') {
      exportToCSV(dataToExport, fileName)
    } else {
      toast.info('Export PDF en développement. Format Excel généré en remplacement.')
      exportToExcel(dataToExport, fileName, exportTypeMap[exportType])
    }

    void logExport(exportTypeMap[exportType], exportFormat === 'PDF' ? 'Excel' : exportFormat, dataToExport.length)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    let file: File | undefined
    if ('dataTransfer' in e) {
      file = e.dataTransfer.files[0]
    } else if ('target' in e && e.target.files) {
      file = e.target.files[0]
    }
    
    if (!file) return

    toast.info('Analyse du fichier...', { description: file.name })
    
    try {
      const data = await parseExcelFile(file)
      if (data && data.length > 0) {
        const cols = Object.keys(data[0])
        setDynamicPreviewCols(cols)
        setDynamicPreviewRows(data.slice(0, 10).map(row => cols.map(col => String(row[col] || ''))))
        setFullParsedRows(data)
        setUploadedFileName(file.name)
        const issues = computeRowIssues(data, importType)
        const duplicateCount = issues.filter(i => i.issue.startsWith('Doublon')).length
        setValidationSummary({
          validLines: data.length - issues.length,
          errorLines: issues.length,
          duplicates: duplicateCount,
        })
        setShowPreview(true)
        setShowValidation(true)
        toast.success('Fichier chargé avec succès', { description: `${data.length} lignes trouvées.` })
      } else {
        toast.error('Le fichier est vide ou illisible.')
      }
    } catch {
      toast.error('Erreur lors de la lecture du fichier Excel.')
    }
  }

  const handleImport = useCallback(async () => {
    if (importType !== 'Etudiants' && importType !== 'Enseignants') {
      toast.error(`L'import de type "${importTypeMap[importType]}" n'est pas encore disponible.`, {
        description: 'Types pris en charge : Etudiants et Enseignants.',
      })
      return
    }
    if (fullParsedRows.length === 0) {
      toast.error('Aucun fichier charge.')
      return
    }

    setIsImporting(true)
    setImportProgress(30)
    try {
      const res = await fetch('/api/import-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: importType, fileName: uploadedFileName, rows: fullParsedRows }),
      })
      const result = await res.json()
      setImportProgress(100)
      if (!res.ok) {
        toast.error(result.message || "Echec de l'import")
        return
      }
      if (result.errorRows > 0 && result.successRows > 0) {
        toast.warning('Import partiel', {
          description: `${result.successRows} etudiant(s) importe(s), ${result.errorRows} ligne(s) en erreur.`,
        })
      } else if (result.errorRows > 0) {
        toast.error('Import echoue', { description: `${result.errorRows} ligne(s) en erreur.` })
      } else {
        const noun = importType === 'Enseignants' ? 'enseignant(s)' : 'etudiant(s)'
        toast.success('Import terminé avec succès', {
          description: `${result.successRows} ${noun} importe(s)${result.portalAccountsCreated ? `, ${result.portalAccountsCreated} compte(s) Espace Etudiant cree(s) (PIN a communiquer via la fiche etudiant)` : ''}.`,
        })
      }
      queryClient.invalidateQueries({ queryKey: ['importExport'] })
      queryClient.invalidateQueries({ queryKey: ['students'] })
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
      setShowPreview(false)
      setShowValidation(false)
      setFullParsedRows([])
    } catch {
      toast.error("Erreur reseau lors de l'import")
    } finally {
      setIsImporting(false)
    }
  }, [importType, fullParsedRows, uploadedFileName, queryClient])

  const stats = importExportData?.stats
  const statsCards = [
    { label: 'Imports ce mois', value: stats?.importsThisMonth ?? 0, icon: ArrowRightLeft, color: '#1a2744' },
    { label: 'En attente', value: stats?.pending ?? 0, icon: Clock, color: '#d4a853' },
    { label: 'Exports ce mois', value: stats?.exportsThisMonth ?? 0, icon: Download, color: '#2d7a4f' },
    { label: 'Erreurs', value: stats?.errors ?? 0, icon: XCircle, color: '#c62828' },
  ]

  // Real recent activity: newest import/export log entries, merged.
  const recentActivity = useMemo(() => {
    type Log = { createdAt: string; type: string; fileName?: string; format?: string; status?: string }
    const imports = (importExportData?.importHistory ?? []).map((l: Log) => ({
      icon: Upload,
      label: `Import ${l.type}`,
      file: l.fileName || '',
      date: new Date(l.createdAt),
      status: l.status || '—',
      statusColor: l.status === 'Succes' ? '#2d7a4f' : l.status === 'Partiel' ? '#d4a853' : '#c62828',
    }))
    const exports = (importExportData?.exportHistory ?? []).map((l: Log) => ({
      icon: Download,
      label: `Export ${l.type}`,
      file: `${l.type}.${(l.format || 'xlsx').toLowerCase()}`,
      date: new Date(l.createdAt),
      status: 'Termine',
      statusColor: '#2d7a4f',
    }))
    return [...imports, ...exports].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5)
  }, [importExportData])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.06 },
    },
  } as const

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  } as const

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ─── Gradient Header Banner ─────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="relative overflow-hidden rounded-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a2744] via-[#1f3050] to-[#2d7a4f]" />
        <svg className="absolute inset-0 w-full h-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="import-export-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="40" height="40" fill="none" stroke="white" strokeWidth="0.5" />
              <circle cx="20" cy="20" r="3" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#import-export-pattern)" />
        </svg>
        <div className="relative z-10 px-6 py-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Centre de donnees</h1>
              <p className="text-sm text-white/70 mt-1">Import, export et validation des donnees institutionnelles</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <AnimatedStat value={5} label="Imports du mois" icon={ArrowRightLeft} />
              <AnimatedStat value={12} label="Exports du mois" icon={Download} />
              <AnimatedStat value={96} label="Taux de conformite %" icon={CheckCircle2} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── Recent Activity Ticker ─────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="border-l-4 border-l-[#2d7a4f]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <motion.div
                className="w-2 h-2 rounded-full bg-[#2d7a4f]"
                animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-xs font-semibold text-[#1a2744]">Activite recente</span>
            </div>
            <div className="space-y-2">
              {recentActivity.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-3">Aucune activite d&apos;import/export pour le moment</p>
              )}
              {recentActivity.map((activity, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.08 }}
                  className="flex items-center gap-3 p-2 rounded-lg bg-gray-50/50 hover:bg-gray-100/50 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#1a274410] flex items-center justify-center shrink-0">
                    <activity.icon className="size-3.5 text-[#1a2744]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#1a2744]">{activity.label}</p>
                    <p className="text-[10px] text-gray-400 font-mono truncate">{activity.file}</p>
                  </div>
                  <span className="text-[10px] text-gray-400">{activity.date.toLocaleDateString('fr-FR')}</span>
                  <Badge className="text-[9px] border-0" style={{ backgroundColor: `${activity.statusColor}15`, color: activity.statusColor }}>{activity.status}</Badge>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statsCards.map((stat, _idx) => (
          <motion.div
            key={stat.label}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="overflow-hidden relative border-l-4 hover:shadow-md transition-shadow" style={{ borderLeftColor: stat.color }}>
              <div className="h-1 w-full" style={{ background: `linear-gradient(to right, ${stat.color}, ${stat.color}60)` }} />
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1" style={{ color: stat.color }}>
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${stat.color}15` }}
                  >
                    <stat.icon className="size-5" style={{ color: stat.color }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Main Tabs */}
      <Tabs value={activeMainTab} onValueChange={setActiveMainTab}>
        <TabsList className="bg-gray-100">
          <TabsTrigger value="import" className="text-xs">
            <Upload className="size-3.5 mr-1.5" />
            Import
          </TabsTrigger>
          <TabsTrigger value="export" className="text-xs">
            <Download className="size-3.5 mr-1.5" />
            Export
          </TabsTrigger>
        </TabsList>

        {/* ─── Import Tab ─── */}
        <TabsContent value="import" className="mt-4 space-y-6">
          {/* Import Section with border */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-l-4 border-l-[#2d7a4f]" style={{ borderTop: '3px solid #2d7a4f' }}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#2d7a4f15] flex items-center justify-center">
                    <Upload className="size-4 text-[#2d7a4f]" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold text-[#1a2744]">Importer des donnees</CardTitle>
                    <p className="text-xs text-gray-400 mt-0.5">Chargez vos fichiers pour importer en masse</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left: Configuration */}
                  <div className="space-y-4">
                    {/* Import Type Selector */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Type de données</Label>
                      <Select value={importType} onValueChange={(v) => setImportType(v as ImportType)}>
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.entries(importTypeMap) as [ImportType, ImportTypeLabel][]).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Download Template Buttons -- only the import types actually
                        supported by the server (Etudiants, Enseignants). Each
                        downloads a real .xlsx with the expected header columns. */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Modèles disponibles</Label>
                      <div className="space-y-1.5">
                        {([['Etudiants', 'Étudiants', STUDENT_PREVIEW_COLUMNS], ['Enseignants', 'Enseignants', TEACHER_PREVIEW_COLUMNS]] as [ImportType, string, string[]][]).map(([key, label, cols]) => (
                          <Button
                            key={key}
                            variant="outline"
                            size="sm"
                            className="w-full text-xs h-8 justify-start"
                            onClick={() => {
                              setImportType(key)
                              exportToExcel([Object.fromEntries(cols.map((c) => [c, '']))], `modele_import_${key.toLowerCase()}`)
                              toast.success('Modèle téléchargé', { description: `Remplissez les colonnes puis importez le fichier ${label}.` })
                            }}
                          >
                            <FileDown className="size-3 mr-1.5 text-[#2d7a4f]" />
                            Modèle {label}
                            <Download className="size-3 ml-auto text-gray-400" />
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* File Upload Zone */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Fichier source</Label>
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        transition={{ duration: 0.2 }}
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer ${
                          isDragOver
                            ? 'border-[#2d7a4f] bg-[#2d7a4f08]'
                            : 'border-gray-200 hover:border-[#2d7a4f] hover:bg-gray-50'
                        }`}
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={handleFileUpload}
                      >
                        <motion.div
                          animate={isDragOver ? { scale: 1.05 } : { scale: 1 }}
                          transition={{ duration: 0.15 }}
                        >
                          <Upload className={`size-10 mx-auto mb-3 ${isDragOver ? 'text-[#2d7a4f]' : 'text-gray-300'}`} />
                        </motion.div>
                        <p className="text-sm font-medium text-gray-600 mb-1">
                          Glisser-déposer votre fichier ici
                        </p>
                        <p className="text-xs text-gray-400 mb-3">ou cliquer pour sélectionner</p>
                        <div className="flex items-center justify-center gap-2 flex-wrap mb-4">
                          <Badge variant="outline" className="text-[10px] bg-white">
                            <FileSpreadsheet className="size-3 mr-1 text-[#2d7a4f]" />
                            .xlsx
                          </Badge>
                          <Badge variant="outline" className="text-[10px] bg-white">
                            <FileSpreadsheet className="size-3 mr-1 text-[#2d7a4f]" />
                            .xls
                          </Badge>
                          <Badge variant="outline" className="text-[10px] bg-white">
                            <FileText className="size-3 mr-1 text-[#d4a853]" />
                            .csv
                          </Badge>
                          <Badge variant="outline" className="text-[10px] bg-white">
                            <Database className="size-3 mr-1 text-[#1a2744]" />
                            .json
                          </Badge>
                        </div>
                        <Input 
                          type="file" 
                          id="file-upload"
                          className="hidden" 
                          accept=".xlsx,.xls,.csv,.json" 
                          onChange={handleFileUpload} 
                        />
                        <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => document.getElementById('file-upload')?.click()}>
                          Parcourir les fichiers
                        </Button>
                      </motion.div>
                    </div>

                    {/* Preview Button */}
                    <Button
                      className="w-full bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs h-10"
                      onClick={() => setShowPreview(true)}
                    >
                      <Eye className="size-3.5 mr-1.5" />
                      Prévisualiser les données
                    </Button>
                  </div>

                  {/* Right: Preview & Validation */}
                  <div className="lg:col-span-2 space-y-4">
                    {/* Preview Table */}
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <TableIcon className="size-4 text-[#1a2744]" />
                            <CardTitle className="text-sm font-semibold text-[#1a2744]">
                              Aperçu des données - {importTypeMap[importType]}
                            </CardTitle>
                          </div>
                          {showPreview && (
                            <Badge className="text-[10px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">
                              {dynamicPreviewRows.length} lignes détectées
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <AnimatePresence mode="wait">
                          {showPreview ? (
                            <motion.div
                              key="preview"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-x-auto"
                            >
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-gray-50">
                                    {dynamicPreviewCols.map(col => (
                                      <TableHead key={col} className="text-xs font-semibold">{col}</TableHead>
                                    ))}
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {dynamicPreviewRows.map((row, idx) => (
                                    <TableRow key={idx} className="hover:bg-gray-50/50">
                                      {row.map((cell, cidx) => (
                                        <TableCell key={cidx} className="py-1.5 text-xs text-gray-600">
                                          {cidx === 0 ? (
                                            <span className="font-mono text-[#2d7a4f]">{cell}</span>
                                          ) : cidx === row.length - 1 ? (
                                            <Badge className="text-[9px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">{cell}</Badge>
                                          ) : (
                                            cell
                                          )}
                                        </TableCell>
                                      ))}
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </motion.div>
                          ) : (
                            <motion.div
                              key="empty"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="py-12 text-center"
                            >
                              <FileSpreadsheet className="size-12 text-gray-200 mx-auto mb-3" />
                              <p className="text-sm text-gray-400">Sélectionnez un fichier et cliquez sur Prévisualiser</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </CardContent>
                    </Card>

                    {/* Import Progress */}
                    {isImporting && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <Card className="border-[#2d7a4f30]">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-[#1a2744]">Import en cours...</span>
                              <span className="text-xs font-semibold text-[#2d7a4f]">{importProgress}%</span>
                            </div>
                            <Progress value={importProgress} className="h-2" />
                            <p className="text-[10px] text-gray-400 mt-2">
                              Traitement de {importTypeMap[importType]} - Veuillez patienter...
                            </p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Data Validation Card */}
          {showPreview && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Card className="border-l-4 border-l-[#d4a853]">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#d4a85315] flex items-center justify-center">
                        <AlertTriangle className="size-4 text-[#d4a853]" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold text-[#1a2744]">Validation des données</CardTitle>
                        <p className="text-xs text-gray-400 mt-0.5">Vérifiez les données avant de confirmer l&apos;import</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setShowValidation(!showValidation)}
                    >
                      <ChevronDown className={`size-3.5 mr-1 transition-transform ${showValidation ? 'rotate-180' : ''}`} />
                      Détails
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Validation Summary */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-[#2d7a4f08] border border-[#2d7a4f20]">
                      <CheckCircle2 className="size-5 text-[#2d7a4f] shrink-0" />
                      <div>
                        <p className="text-lg font-bold text-[#2d7a4f]">{validationSummary.validLines}</p>
                        <p className="text-[10px] text-gray-500">Lignes valides</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-[#c6282808] border border-[#c6282820]">
                      <XCircle className="size-5 text-[#c62828] shrink-0" />
                      <div>
                        <p className="text-lg font-bold text-[#c62828]">{validationSummary.errorLines}</p>
                        <p className="text-[10px] text-gray-500">Lignes en erreur</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-[#d4a5308] border border-[#d4a85320]">
                      <Copy className="size-5 text-[#d4a853] shrink-0" />
                      <div>
                        <p className="text-lg font-bold text-[#d4a853]">{validationSummary.duplicates}</p>
                        <p className="text-[10px] text-gray-500">Doublons détectés</p>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {showValidation && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {/* Error preview table */}
                        <div className="mb-4">
                          <p className="text-xs font-medium text-gray-500 mb-2">Aperçu des lignes en erreur :</p>
                          <div className="overflow-x-auto rounded-lg border border-gray-100">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-gray-50">
                                  <TableHead className="text-xs font-semibold">Ligne</TableHead>
                                  <TableHead className="text-xs font-semibold">Matricule</TableHead>
                                  <TableHead className="text-xs font-semibold">Probleme</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {rowIssues.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={3} className="py-3 text-xs text-gray-400 text-center">
                                      Aucun probleme detecte
                                    </TableCell>
                                  </TableRow>
                                ) : rowIssues.slice(0, 20).map((issue, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell className="py-1.5 text-xs text-gray-500">{issue.line}</TableCell>
                                    <TableCell className="py-1.5 text-xs font-mono text-[#c62828]">{issue.matricule}</TableCell>
                                    <TableCell className="py-1.5 text-xs text-[#c62828]">{issue.issue}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                    <Button
                      className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs h-9"
                      onClick={handleImport}
                      disabled={isImporting}
                    >
                      <Play className="size-3.5 mr-1.5" />
                      Confirmer l&apos;import
                    </Button>
                    <Button
                      variant="outline"
                      className="text-xs h-9"
                      onClick={() => { setShowPreview(false); setShowValidation(false) }}
                    >
                      <X className="size-3.5 mr-1.5" />
                      Annuler
                    </Button>
                    <div className="ml-auto flex items-center gap-1 text-xs text-gray-400">
                      <Info className="size-3" />
                      <span>{validationSummary.validLines} lignes seront importées</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Import History Table */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-[#1a2744]">
                    Historique des imports
                  </CardTitle>
                  <Badge className="text-[10px] bg-gray-100 text-gray-500 border-0">
                    {importExportData?.importHistory?.length ?? 0} imports
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="text-xs font-semibold">Date</TableHead>
                        <TableHead className="text-xs font-semibold">Type</TableHead>
                        <TableHead className="text-xs font-semibold">Fichier</TableHead>
                        <TableHead className="text-xs font-semibold text-center">Lignes</TableHead>
                        <TableHead className="text-xs font-semibold">Statut</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isImportExportLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-6 text-center text-xs text-gray-400">Chargement...</TableCell>
                        </TableRow>
                      ) : !importExportData?.importHistory?.length ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-6 text-center text-xs text-gray-400">Aucun import effectue pour le moment</TableCell>
                        </TableRow>
                      ) : importExportData.importHistory.map((record: any) => {
                        const statusConf = importStatusConfig[record.status as ImportStatus] ?? importStatusConfig.EnAttente
                        const StatusIcon = statusConf.icon
                        return (
                          <TableRow key={record.id} className="hover:bg-gray-50/50">
                            <TableCell className="py-2.5">
                              <span className="text-xs text-gray-500">{new Date(record.createdAt).toLocaleString('fr-FR')}</span>
                            </TableCell>
                            <TableCell className="py-2.5">
                              <Badge className="text-[10px] bg-[#1a274410] text-[#1a2744] border-0">{record.type}</Badge>
                            </TableCell>
                            <TableCell className="py-2.5">
                              <div className="flex items-center gap-1.5">
                                <FileSpreadsheet className="size-3.5 text-[#2d7a4f]" />
                                <span className="text-xs text-gray-600 font-mono">{record.fileName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-2.5 text-center">
                              <span className="text-xs font-semibold text-[#1a2744]">{record.totalRows}</span>
                            </TableCell>
                            <TableCell className="py-2.5">
                              <div className="flex items-center gap-1">
                                <StatusIcon className="size-3" />
                                <Badge className={`text-[10px] ${statusConf.className}`}>
                                  {statusConf.label}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-[10px] text-[#2d7a4f]"
                                  onClick={() => {
                                    const rowErrors: string[] = record.errors ? JSON.parse(record.errors) : []
                                    if (rowErrors.length === 0) {
                                      toast.success(`${record.successRows} ligne(s) importee(s) sans erreur.`)
                                    } else {
                                      toast.info(`${rowErrors.length} erreur(s)`, { description: rowErrors.slice(0, 3).join(' • ') })
                                    }
                                  }}
                                >
                                  <Eye className="size-3 mr-1" />
                                  Voir
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* African Context Note */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Card className="bg-[#1a274408] border-[#1a274420]">
              <CardContent className="p-5">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#1a274415] flex items-center justify-center shrink-0">
                    <Info className="size-5 text-[#1a2744]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#1a2744] mb-1">
                      Import adapté aux universités africaines
                    </h3>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      UniSahel prend en charge les fichiers Excel provenant de systèmes legacy courants dans les universités africaines.
                      Le mapping de champs permet d&apos;adapter automatiquement les formats de données (noms en majuscules, dates au format JJ/MM/AAAA,
                      numéros de matricule personnalisés). Les modèles d&apos;import sont préconfigurés pour le système LMD et les structures
                      académiques locales. En cas de doute, utilisez le bouton de prévisualisation pour vérifier vos données avant import.
                    </p>
                    <div className="flex items-center gap-3 mt-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs h-8"
                        onClick={() => toast.info("Ouverture du guide d'importation...")}
                      >
                        <FileDown className="size-3 mr-1.5" />
                        Guide d&apos;import
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs h-8"
                        onClick={() => toast.info("Affichage des formats supportés...")}
                      >
                        <HardDrive className="size-3 mr-1.5" />
                        Formats supportés
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ─── Export Tab ─── */}
        <TabsContent value="export" className="mt-4 space-y-6">
          {/* Export Section with border */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-l-4 border-l-[#1a2744]" style={{ borderTop: '3px solid #1a2744' }}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#1a274415] flex items-center justify-center">
                    <Download className="size-4 text-[#1a2744]" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold text-[#1a2744]">Exporter des donnees</CardTitle>
                    <p className="text-xs text-gray-400 mt-0.5">Générez des rapports et extractions de données</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Export Configuration */}
                  <div className="space-y-4">
                    {/* Export Type */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Type d&apos;export</Label>
                      <Select value={exportType} onValueChange={(v) => setExportType(v as ExportType)}>
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.entries(exportTypeMap) as [ExportType, ExportTypeLabel][]).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Format Selector */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Format de sortie</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['Excel', 'CSV', 'PDF'] as ExportFormat[]).map(fmt => (
                          <motion.button
                            key={fmt}
                            whileHover={{ scale: 1.03 }}
                            transition={{ duration: 0.15 }}
                            onClick={() => setExportFormat(fmt)}
                            className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all text-center ${
                              exportFormat === fmt
                                ? 'border-[#1a2744] bg-[#1a274408]'
                                : 'border-gray-100 hover:border-gray-200 bg-white'
                            }`}
                          >
                            {fmt === 'PDF' ? (
                              <FileText className={`size-5 ${exportFormat === fmt ? 'text-[#c62828]' : 'text-gray-400'}`} />
                            ) : fmt === 'Excel' ? (
                              <FileSpreadsheet className={`size-5 ${exportFormat === fmt ? 'text-[#2d7a4f]' : 'text-gray-400'}`} />
                            ) : (
                              <Database className={`size-5 ${exportFormat === fmt ? 'text-[#d4a853]' : 'text-gray-400'}`} />
                            )}
                            <span className={`text-xs font-medium ${exportFormat === fmt ? 'text-[#1a2744]' : 'text-gray-500'}`}>
                              {fmt}
                            </span>
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Date Range */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Période</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-gray-400">Date début</Label>
                          <Input type="date" className="h-9 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-gray-400">Date fin</Label>
                          <Input type="date" className="h-9 text-xs" />
                        </div>
                      </div>
                    </div>

                    {/* Generate Button */}
                    <Button 
                      className="w-full bg-[#1a2744] hover:bg-[#1a2744]/90 text-white text-xs h-10"
                      onClick={handleExport}
                    >
                      <Download className="size-3.5 mr-1.5" />
                      Générer l&apos;export
                    </Button>
                  </div>

                  {/* Recent Exports Table */}
                  <div className="lg:col-span-2">
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-semibold text-[#1a2744]">
                            Exports récents
                          </CardTitle>
                          <Badge className="text-[10px] bg-gray-100 text-gray-500 border-0">
                            {importExportData?.exportHistory?.length ?? 0} exports
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto max-h-96 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-50 sticky top-0">
                                <TableHead className="text-xs font-semibold">Date</TableHead>
                                <TableHead className="text-xs font-semibold">Type</TableHead>
                                <TableHead className="text-xs font-semibold">Format</TableHead>
                                <TableHead className="text-xs font-semibold">Taille</TableHead>
                                <TableHead className="text-xs font-semibold text-center">Lignes</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {isImportExportLoading ? (
                                <TableRow>
                                  <TableCell colSpan={5} className="py-6 text-center text-xs text-gray-400">Chargement...</TableCell>
                                </TableRow>
                              ) : !importExportData?.exportHistory?.length ? (
                                <TableRow>
                                  <TableCell colSpan={5} className="py-6 text-center text-xs text-gray-400">Aucun export genere pour le moment</TableCell>
                                </TableRow>
                              ) : importExportData.exportHistory.map((record: any) => (
                                <TableRow key={record.id} className="hover:bg-gray-50/50">
                                  <TableCell className="py-2.5">
                                    <span className="text-xs text-gray-500">{new Date(record.createdAt).toLocaleString('fr-FR')}</span>
                                  </TableCell>
                                  <TableCell className="py-2.5">
                                    <span className="text-xs text-gray-600 font-medium">{record.type}</span>
                                  </TableCell>
                                  <TableCell className="py-2.5">
                                    <div className="flex items-center gap-1.5">
                                      {record.format === 'PDF' ? (
                                        <FileText className="size-3.5 text-[#c62828]" />
                                      ) : record.format === 'Excel' ? (
                                        <FileSpreadsheet className="size-3.5 text-[#2d7a4f]" />
                                      ) : (
                                        <Database className="size-3.5 text-[#d4a853]" />
                                      )}
                                      <span className="text-xs text-gray-600">{record.format}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-2.5">
                                    <span className="text-xs text-gray-500">{record.fileSizeLabel ?? '—'}</span>
                                  </TableCell>
                                  <TableCell className="py-2.5 text-center">
                                    <span className="text-xs font-semibold text-[#1a2744]">{record.rowCount}</span>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}

