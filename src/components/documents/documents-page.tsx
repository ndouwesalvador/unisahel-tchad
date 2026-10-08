'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { QrDisplay } from '@/components/ui/qr-display'
import { useAppStore } from '@/lib/store'
import { useQueryClient } from '@tanstack/react-query'
import { useAcademicYears, useDocuments, useStudents } from '@/lib/api-hooks'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
import {
  Loader2,
  FileText,
  Search,
  Download,
  Eye,
  QrCode,
  Shield,
  CheckCircle2,
  Clock,
  Stamp,
  Award,
  BookOpen,
  ClipboardList,
  GraduationCap,
  ScrollText,
  Info,
  ExternalLink,
  Hash,
  TrendingUp,
  Zap,
} from 'lucide-react'

// Only types that can be generated safely from this screen are selectable.
// Other document templates may exist server-side, but they require a dedicated
// context that this screen does not provide yet.
const documentTypeList = [
  { key: 'releve_notes', apiType: 'RELEVE_NOTES', label: 'Relevé de notes', icon: FileText, implemented: true, requiresStudent: true, tooltip: 'Relevé officiel des notes par semestre, généré pour l\'étudiant sélectionné' },
  { key: 'attestation_inscription', apiType: 'ATTESTATION_INSCRIPTION', label: 'Attestation d\'inscription', icon: BookOpen, implemented: true, requiresStudent: true, tooltip: 'Attestation confirmant l\'inscription administrative de l\'étudiant sélectionné' },
  { key: 'attestation_niveau', apiType: 'ATTESTATION_NIVEAU', label: 'Attestation de niveau', icon: Award, implemented: true, requiresStudent: true, tooltip: 'Exige une année, une délibération finale validée et tous les crédits sans dette' },
  { key: 'diplome', apiType: 'DIPLOME', label: 'Diplôme', icon: GraduationCap, implemented: true, requiresStudent: true, tooltip: 'Exige la validation de tous les niveaux du programme sans dette' },
  { key: 'certificat_scolarite', apiType: 'CERTIFICAT_SCOLARITE', label: 'Certificat de scolarité', icon: ScrollText, implemented: true, requiresStudent: true, tooltip: 'Certificat prouvant la fréquentation régulière de l\'étudiant sélectionné' },
  { key: 'pv_deliberation', apiType: 'PV_DELIBERATION', label: 'PV de délibération', icon: ClipboardList, implemented: false, requiresStudent: false, tooltip: 'À générer depuis une session de jury validée' },
]

interface GeneratedDoc {
  id: string
  type: string
  typeKey: string
  studentId: string | null
  academicYearId: string | null
  etudiant: string
  matricule: string
  date: string
  statut: 'signe' | 'genere' | 'en_attente'
  codeVerification: string
}

// ASCII keys for status config - NO accented characters
const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  signe: { label: 'Validé', className: 'bg-[var(--institution-secondary-15)] text-[var(--institution-secondary)] border-0', icon: CheckCircle2 },
  genere: { label: 'Généré', className: 'bg-[var(--institution-accent-15)] text-[var(--institution-accent)] border-0', icon: Clock },
  en_attente: { label: 'En attente', className: 'bg-gray-100 text-gray-500 border-0', icon: Clock },
}

// ─── Animated Count-Up Hook ──────────────────────────────────────────────────

function useCountUp(target: number, duration: number = 1400) {
  const [count, setCount] = useState(0)
  const startTime = useRef<number | null>(null)
  const rafId = useRef<number | null>(null)

  useEffect(() => {
    startTime.current = null

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp
      const progress = Math.min((timestamp - startTime.current) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * target))

      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate)
      }
    }

    rafId.current = requestAnimationFrame(animate)

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current)
    }
  }, [target, duration])

  return count
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DocumentsPage() {
  const { user, setView } = useAppStore()
  const canManageDocuments = ['ADMIN_INSTITUTION', 'RECTORAT', 'SCOLARITE'].includes(user?.role ?? '')
  const canOpenJury = user?.role === 'ADMIN_INSTITUTION'
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedType, setSelectedType] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedYearId, setSelectedYearId] = useState('')
  const [selectedStudentLabel, setSelectedStudentLabel] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGeneratingSigned, setIsGeneratingSigned] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const qrCodeRef = useRef<string | null>(null)

  const { data: docsData } = useDocuments() as {
    data: { documents: Array<{ id: string; type: string; studentId: string | null; academicYearId: string | null; etudiant: string; matricule: string; date: string; statut: 'signe' | 'genere' | 'en_attente'; codeVerification: string }>; stats: { thisMonth: number; pending: number }; countByType: Record<string, number> } | undefined
  }
  const { data: studentMatches } = useStudents({ search: studentSearch, limit: 6 }, { enabled: canManageDocuments })
  const { data: academicYearsResponse } = useAcademicYears()
  const academicYears = useMemo(
    () => (academicYearsResponse?.data ?? []) as Array<{ id: string; name: string; isCurrent: boolean }>,
    [academicYearsResponse?.data]
  )
  useEffect(() => {
    if (!selectedYearId && academicYears.length > 0) {
      setSelectedYearId(academicYears.find((year) => year.isCurrent)?.id ?? academicYears[0].id)
    }
  }, [academicYears, selectedYearId])
  const showStudentDropdown = studentSearch.length >= 2 && !selectedStudentId

  const generatedDocuments: GeneratedDoc[] = (docsData?.documents ?? []).map((d) => ({
    id: d.id,
    type: documentTypeList.find((dt) => dt.apiType === d.type)?.label ?? d.type,
    typeKey: documentTypeList.find((dt) => dt.apiType === d.type)?.key ?? d.type.toLowerCase(),
    studentId: d.studentId,
    academicYearId: d.academicYearId,
    etudiant: d.etudiant,
    matricule: d.matricule,
    date: d.date ? new Date(d.date).toLocaleDateString('fr-FR') : '',
    statut: d.statut,
    codeVerification: d.codeVerification,
  }))

  const animatedDocsMonth = useCountUp(docsData?.stats?.thisMonth ?? 0, 1400)
  const animatedPending = useCountUp(docsData?.stats?.pending ?? 0, 1200)
  const selectedDocumentType = documentTypeList.find((dt) => dt.key === selectedType)
  const signedOnlyDocument = ['ATTESTATION_NIVEAU', 'DIPLOME'].includes(selectedDocumentType?.apiType || '')
  const canGenerateSelectedDocument = Boolean(
    selectedDocumentType?.implemented &&
    selectedDocumentType.apiType &&
    (!selectedDocumentType.requiresStudent || selectedStudentId)
  )

  const generateDoc = useCallback(async (sign: boolean = false) => {
    const docType = documentTypeList.find((dt) => dt.key === selectedType)
    const apiType = docType?.apiType
    if (!apiType || !user) return
    if (['ATTESTATION_NIVEAU', 'DIPLOME'].includes(apiType) && !sign) {
      toast.error('Validation requise', { description: 'Ce document officiel ne peut pas être généré comme brouillon.' })
      return
    }
    if (!docType?.implemented) {
      toast.error('Document non configuré', { description: 'Ce type ne peut pas être généré depuis cet écran.' })
      return
    }
    if (docType.requiresStudent && !selectedStudentId) {
      toast.error('Étudiant requis', { description: 'Sélectionnez un étudiant avant de générer ce document.' })
      return
    }
    const loading = sign ? setIsGeneratingSigned : setIsGenerating
    loading(true)

    try {
      const res = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: apiType,
          tenantId: user.tenantId,
          studentId: selectedStudentId || undefined,
          academicYearId: selectedYearId || undefined,
          sign,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur de génération')
      }

      const verificationCode = res.headers.get('X-Verification-Code') || ''

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${apiType}_${Date.now()}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)

      if (verificationCode) {
        qrCodeRef.current = verificationCode
        setQrCode(verificationCode)
      }

      toast.success(sign ? 'Document généré et validé' : 'Document généré avec succès', {
        description: verificationCode ? `Code: ${verificationCode}` : 'Le fichier PDF a été téléchargé',
      })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    } catch (error) {
      toast.error('Erreur de génération', {
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
      })
    } finally {
      loading(false)
    }
  }, [selectedType, selectedStudentId, selectedYearId, user, queryClient])

  const downloadDoc = useCallback(async (doc: GeneratedDoc) => {
    setDownloadingId(doc.id)
    try {
      const response = await fetch(`/api/documents/download?id=${encodeURIComponent(doc.id)}`)
      if (!response.ok) {
        const problem = await response.json()
        throw new Error(problem.error || 'Document indisponible')
      }
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = url
      link.download = `${doc.typeKey}_${doc.codeVerification || doc.id}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
    } catch (error) {
      toast.error('Téléchargement impossible', {
        description: error instanceof Error ? error.message : 'Veuillez réessayer.',
      })
    } finally {
      setDownloadingId(null)
    }
  }, [])

  const prepareReissue = useCallback((doc: GeneratedDoc) => {
    if (!doc.studentId || !doc.academicYearId) return
    setSelectedType(doc.typeKey)
    setSelectedStudentId(doc.studentId)
    setSelectedStudentLabel(`${doc.etudiant} (${doc.matricule})`)
    setSelectedYearId(doc.academicYearId)
    document.getElementById('document-generator')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    toast.info('Vérifiez les paramètres puis générez une nouvelle pièce. L’original reste conservé.')
  }, [])

  const filteredDocs = generatedDocuments.filter(d => {
    const matchSearch = search === '' ||
      d.etudiant.toLowerCase().includes(search.toLowerCase()) ||
      d.matricule.toLowerCase().includes(search.toLowerCase()) ||
      d.codeVerification.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || d.typeKey === typeFilter
    const matchStatus = statusFilter === 'all' || d.statut === statusFilter
    return matchSearch && matchType && matchStatus
  })

  // Stats
  const totalGenerated = generatedDocuments.filter(d => d.statut === 'genere' || d.statut === 'signe').length
  const totalSigned = generatedDocuments.filter(d => d.statut === 'signe').length
  const totalPending = generatedDocuments.filter(d => d.statut === 'en_attente').length
  const totalQRCodes = generatedDocuments.filter(d => d.codeVerification).length

  // Recent documents for ticker (last 3 signed/generated)
  const recentDocs = generatedDocuments
    .filter(d => d.statut === 'signe' || d.statut === 'genere')
    .slice(0, 3)

  // Pipeline stats
  const pipelineTotal = generatedDocuments.length
  const pipelineSigned = totalSigned
  const pipelineGenerated = generatedDocuments.filter(d => d.statut === 'genere').length
  const pipelinePending = totalPending
  const signedPercent = pipelineTotal > 0 ? Math.round((pipelineSigned / pipelineTotal) * 100) : 0
  const generatedPercent = pipelineTotal > 0 ? Math.round((pipelineGenerated / pipelineTotal) * 100) : 0
  const pendingPercent = pipelineTotal > 0 ? Math.round((pipelinePending / pipelineTotal) * 100) : 0

  return (
    <TooltipProvider>
      <div className="space-y-5">
        {/* Gradient Hero Section */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-[var(--institution-primary)] via-[var(--institution-primary-light)] to-[var(--institution-secondary)] p-6 text-white relative">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE0YzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptLTQgMmMtMS4xIDAtMi0uOS0yLTJzLjktMiAyLTIgMiAuOSAyIDItLjkgMi0yIDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
            <div className="relative">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h1 className="text-2xl font-bold">Centre de génération de documents</h1>
                <p className="text-white/70 text-sm mt-1">Génération, signature et vérification des documents académiques</p>
              </motion.div>

              {/* Hero Stats */}
              <motion.div
                className="grid grid-cols-3 gap-3 mt-5"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/15">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="size-4 text-white/60" />
                    <p className="text-[11px] text-white/70">Documents générés ce mois</p>
                  </div>
                  <p className="text-2xl font-bold text-white">{animatedDocsMonth}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/15">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="size-4 text-white/60" />
                    <p className="text-[11px] text-white/70">En attente</p>
                  </div>
                  <p className="text-2xl font-bold text-white">{animatedPending}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/15">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="size-4 text-white/60" />
                    <p className="text-[11px] text-white/70">Documents validés</p>
                  </div>
                  <p className="text-2xl font-bold text-white">{signedPercent}%</p>
                </div>
              </motion.div>
            </div>
          </div>
        </Card>

        {/* Document Generation Pipeline - Animated Progress */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-[var(--institution-primary)]">Circuit de génération</p>
                <Badge className="text-[10px] bg-[var(--institution-secondary-15)] text-[var(--institution-secondary)] border-0">
                  <Zap className="size-3 mr-1" />
                  En temps réel
                </Badge>
              </div>
              <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
                <motion.div
                  className="bg-[var(--institution-secondary)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${signedPercent}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                />
                <motion.div
                  className="bg-[var(--institution-accent)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${generatedPercent}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.7 }}
                />
                <motion.div
                  className="bg-gray-300"
                  initial={{ width: 0 }}
                  animate={{ width: `${pendingPercent}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.9 }}
                />
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--institution-secondary)]" />
                  <span className="text-[10px] text-gray-500">Signes ({pipelineSigned})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--institution-accent)]" />
                  <span className="text-[10px] text-gray-500">Generes ({pipelineGenerated})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                  <span className="text-[10px] text-gray-500">En attente ({pipelinePending})</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Documents recents ticker */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Card className="border-l-4 border-l-[var(--institution-secondary)]">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-[var(--institution-secondary)] animate-pulse" />
                <span className="text-[11px] font-medium text-[var(--institution-primary)]">Documents recents</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                {recentDocs.map((doc, i) => {
                  const status = statusConfig[doc.statut]
                  const StatusIcon = status?.icon || Clock
                  return (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.5 + i * 0.1 }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 flex-1"
                    >
                      <FileText className="size-3.5 text-[var(--institution-primary)] shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium text-[var(--institution-primary)] truncate">{doc.type}</p>
                        <p className="text-[9px] text-gray-400">{doc.etudiant} - {doc.date}</p>
                      </div>
                      <StatusIcon className="size-3 shrink-0" style={{ color: doc.statut === 'signe' ? 'var(--institution-secondary)' : 'var(--institution-accent)' }} />
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--institution-primary-15)] flex items-center justify-center shrink-0">
                <FileText className="size-5 text-[var(--institution-primary)]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--institution-primary)]">{totalGenerated}</p>
                <p className="text-[11px] text-gray-500">Documents générés</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--institution-secondary-15)] flex items-center justify-center shrink-0">
                <CheckCircle2 className="size-5 text-[var(--institution-secondary)]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--institution-secondary)]">{totalSigned}</p>
                <p className="text-[11px] text-gray-500">Documents validés</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <Clock className="size-5 text-gray-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-500">{totalPending}</p>
                <p className="text-[11px] text-gray-500">En attente</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--institution-accent-15)] flex items-center justify-center shrink-0">
                <QrCode className="size-5 text-[var(--institution-accent)]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--institution-accent)]">{totalQRCodes}</p>
                <p className="text-[11px] text-gray-500">Codes de vérification</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Document Generator Card */}
        {canManageDocuments && <Card id="document-generator" className="border-l-4 border-l-[var(--institution-secondary)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[var(--institution-primary)] flex items-center gap-2">
              <Stamp className="size-4 text-[var(--institution-secondary)]" />
              Generer un document
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="h-9 text-sm w-full">
                  <SelectValue placeholder="Type de document" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypeList.filter((type) => type.implemented).map((type) => (
                    <SelectItem key={type.key} value={type.key}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedYearId} onValueChange={setSelectedYearId}>
                <SelectTrigger className="h-9 text-sm w-full"><SelectValue placeholder="Année académique" /></SelectTrigger>
                <SelectContent>
                  {academicYears.map((year) => <SelectItem key={year.id} value={year.id}>{year.name}{year.isCurrent ? ' (en cours)' : ''}</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedStudentId ? (
                <div className="flex items-center justify-between rounded-md border px-3 h-9 text-sm">
                  <span className="truncate">{selectedStudentLabel}</span>
                  <button type="button" className="text-xs text-[var(--institution-secondary)] hover:underline shrink-0 ml-2" onClick={() => { setSelectedStudentId(''); setSelectedStudentLabel('') }}>
                    Changer
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher un étudiant…"
                    className="pl-9 h-9 text-sm"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                  />
                  {showStudentDropdown && (
                    <div className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow-lg max-h-48 overflow-y-auto">
                      {(studentMatches?.data ?? []).length === 0 ? (
                        <p className="px-3 py-2 text-xs text-gray-400">Aucun étudiant trouvé</p>
                      ) : (
                        studentMatches.data.map((s: { id: string; firstName: string; lastName: string; matricule?: string }) => (
                          <button
                            key={s.id}
                            type="button"
                            className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-gray-50"
                            onClick={() => {
                              setSelectedStudentId(s.id)
                              setSelectedStudentLabel(`${s.lastName.toUpperCase()} ${s.firstName}${s.matricule ? ` (${s.matricule})` : ''}`)
                              setStudentSearch('')
                            }}
                          >
                            <span>{s.lastName.toUpperCase()} {s.firstName}</span>
                            <span className="text-[10px] text-gray-400">{s.matricule || '-'}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs flex-1 h-9"
                  disabled={!canGenerateSelectedDocument || !selectedYearId || signedOnlyDocument || isGenerating}
                  onClick={() => generateDoc(false)}
                >
                  {isGenerating ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Eye className="size-3.5 mr-1.5" />}
                  Générer PDF
                </Button>
              </div>
              <Button
                size="sm"
                className="bg-[var(--institution-secondary)] hover:bg-[var(--institution-secondary-dark)] text-white text-xs h-9"
                disabled={!canGenerateSelectedDocument || !selectedYearId || isGeneratingSigned}
                onClick={() => generateDoc(true)}
              >
                {isGeneratingSigned ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <CheckCircle2 className="size-3.5 mr-1.5" />}
                Générer et valider
              </Button>
            </div>
            {selectedDocumentType?.requiresStudent && !selectedStudentId && (
              <p className="text-xs text-gray-500 mt-2">
                Sélectionnez un étudiant pour activer la génération de ce document.
              </p>
            )}
            {signedOnlyDocument && <p className="text-xs text-gray-500 mt-2">Ce document exige une délibération finale validée, les crédits complets sans dette et une validation par un responsable.</p>}
            <p className="text-xs text-gray-500 mt-2">Le logo et les signatures sont figés lors de l’émission. Après une modification de l’identité visuelle, générez un nouveau document pour l’utiliser ; les pièces déjà délivrées restent inchangées.</p>
            {selectedDocumentType && !selectedDocumentType.implemented && (
              <p className="text-xs text-[var(--institution-accent)] mt-2">
                Ce type n’est pas générable depuis cet écran : {selectedDocumentType.tooltip}.
              </p>
            )}
          </CardContent>
        </Card>}

        {/* Filters Section */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par nom, matricule, code..."
                  className="pl-9 h-9 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 text-sm w-full">
                  <SelectValue placeholder="Type de document" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {documentTypeList.map(dt => (
                    <SelectItem key={dt.key} value={dt.key}>{dt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-sm w-full">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="signe">Valide / Signe</SelectItem>
                  <SelectItem value="genere">Genere</SelectItem>
                  <SelectItem value="en_attente">En attente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Generated Documents Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-[var(--institution-primary)]">
                Documents générés ({filteredDocs.length})
              </CardTitle>
              <Badge className="text-[10px] bg-[var(--institution-secondary-15)] text-[var(--institution-secondary)] border-0">
                <Shield className="size-3 mr-1" />
                Codes de vérification
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs font-semibold">Type</TableHead>
                    <TableHead className="text-xs font-semibold">Etudiant</TableHead>
                    <TableHead className="text-xs font-semibold">Date</TableHead>
                    <TableHead className="text-xs font-semibold">Statut</TableHead>
                    <TableHead className="text-xs font-semibold">Code de vérification</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocs.map((doc) => {
                    const status = statusConfig[doc.statut]
                    const StatusIcon = status?.icon || Clock
                    return (
                      <TableRow key={doc.id} className="hover:bg-gray-50/50">
                        <TableCell className="py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded bg-[var(--institution-primary-10)] flex items-center justify-center shrink-0">
                              <FileText className="size-3.5 text-[var(--institution-primary)]" />
                            </div>
                            <span className="text-sm font-medium text-[var(--institution-primary)] whitespace-nowrap">{doc.type}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <div>
                            <p className="text-sm text-[var(--institution-primary)] font-medium">{doc.etudiant}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{doc.matricule}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500 py-2.5 whitespace-nowrap">{doc.date || '-'}</TableCell>
                        <TableCell className="py-2.5">
                          <Badge className={`text-[10px] ${status?.className || 'bg-gray-100 text-gray-500 border-0'}`}>
                            <StatusIcon className="size-3 mr-1" />
                            {status?.label || doc.statut}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2.5">
                          {doc.codeVerification ? (
                            <div className="flex items-center gap-1.5">
                              <QrCode className="size-3.5 text-[var(--institution-secondary)]" />
                              <span className="text-[10px] font-mono text-gray-500">{doc.codeVerification}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-300">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            {doc.statut !== 'en_attente' && (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-gray-500 hover:text-gray-700"
                                  onClick={() => downloadDoc(doc)}
                                  disabled={downloadingId === doc.id}
                                >
                                  {downloadingId === doc.id ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : <Download className="size-3.5 mr-1" />}
                                  Télécharger
                                </Button>
                              </div>
                            )}
                            {canManageDocuments && doc.studentId && doc.academicYearId && ['releve_notes', 'diplome'].includes(doc.typeKey) && (
                              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => prepareReissue(doc)}>
                                Réémettre
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {filteredDocs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2 text-gray-400">
                          <FileText className="size-8" />
                          <p className="text-sm">Aucun document trouve</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Document Types Reference + Verification Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Document Types Reference Card */}
          {canManageDocuments && <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[var(--institution-primary)] flex items-center gap-2">
                <GraduationCap className="size-4 text-[var(--institution-accent)]" />
                Types de documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {documentTypeList.filter((type) => type.key !== 'pv_deliberation' || canOpenJury).map((dt) => {
                  const Icon = dt.icon
                  const count = dt.apiType ? docsData?.countByType?.[dt.apiType] ?? 0 : 0
                  return (
                    <Tooltip key={dt.key}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="flex w-full flex-col items-center gap-2 rounded-lg border border-gray-200 p-3 transition-colors hover:border-emerald-600 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                          style={{ borderTop: '3px solid var(--institution-secondary)' }}
                          onClick={() => {
                            if (dt.key === 'pv_deliberation') {
                              setView('deliberation')
                            } else {
                              setSelectedType(dt.key)
                              document.getElementById('document-generator')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }
                          }}
                        >
                          <div className="w-9 h-9 rounded-lg bg-[var(--institution-primary-10)] flex items-center justify-center">
                            <Icon className="size-4 text-[var(--institution-primary)]" />
                          </div>
                          <div className="text-center">
                            <p className="text-[11px] font-medium text-[var(--institution-primary)] leading-tight">{dt.label}</p>
                            <p className="text-[10px] text-slate-600 mt-0.5">{dt.key === 'pv_deliberation' ? `${count} générés · ouvrir les jurys` : `${count} générés`}</p>
                          </div>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[220px] text-xs">
                        {dt.tooltip}
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </CardContent>
          </Card>}

          {/* Verification Info Card */}
          <Card className={canManageDocuments ? '' : 'lg:col-span-3'}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[var(--institution-primary)] flex items-center gap-2">
                <Shield className="size-4 text-[var(--institution-secondary)]" />
                Verification QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--institution-secondary-08)] border border-[var(--institution-secondary-15)]">
                <Info className="size-5 text-[var(--institution-secondary)] shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <p className="text-xs text-[var(--institution-primary)] font-medium">Verification par code unique</p>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Chaque document officiel porte un code QR unique pour une vérification immédiate.
                    Scannez-le ou saisissez le code de vérification pour confirmer l’authenticité.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Hash className="size-3.5 text-[var(--institution-secondary)]" />
                  <span>Code unique par document</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <QrCode className="size-3.5 text-[var(--institution-secondary)]" />
                  <span>Code QR ouvrant la page de vérification</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <CheckCircle2 className="size-3.5 text-[var(--institution-secondary)]" />
                  <span>Verification en temps reel</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Shield className="size-3.5 text-[var(--institution-secondary)]" />
                  <span>Validation institutionnelle enregistrée en base</span>
                </div>
              </div>
              <Button variant="outline" className="w-full text-xs h-8 text-[var(--institution-secondary)] border-[var(--institution-secondary-30)] hover:bg-[var(--institution-secondary-10)]" onClick={() => setView('verify')}>
                <ExternalLink className="size-3.5 mr-1.5" />
                Page de vérification
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* QR Code Dialog */}
      <AnimatePresence>
        {qrCode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setQrCode(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 shadow-2xl max-w-xs w-full mx-4 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <QrCode className="size-8 text-[var(--institution-secondary)] mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-[var(--institution-primary)] mb-1">Document généré</h3>
              <p className="text-xs text-gray-400 mb-4">Scannez ce code pour vérifier l&apos;authenticité</p>

              <div className="flex justify-center mb-4">
                <QrDisplay value={`${typeof window !== 'undefined' ? window.location.origin : ''}/verify?code=${qrCode}`} size={160} />
              </div>

              <p className="text-xs font-mono font-bold text-[var(--institution-primary)] mb-4">{qrCode}</p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(qrCode)
                    toast.success('Code copié !')
                  }}
                >
                  Copier le code
                </Button>
                <Button
                  size="sm"
                  className="flex-1 text-xs bg-gradient-to-r from-[var(--institution-secondary)] to-[var(--institution-secondary-bright)]"
                  onClick={() => setQrCode(null)}
                >
                  Fermer
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </TooltipProvider>
  )
}
