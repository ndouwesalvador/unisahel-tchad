'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { QrDisplay } from '@/components/ui/qr-display'
import { useAppStore } from '@/lib/store'
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
  Printer,
  Shield,
  CheckCircle2,
  Clock,
  Stamp,
  FileCheck,
  Award,
  BookOpen,
  CreditCard,
  ClipboardList,
  GraduationCap,
  ScrollText,
  Briefcase,
  Info,
  ExternalLink,
  Hash,
  TrendingUp,
  Zap,
} from 'lucide-react'

// ─── Demo Data ────────────────────────────────────────────────────────────────

const documentTypeList = [
  { key: 'releve_notes', label: 'Releve de notes', icon: FileText, count: 34, tooltip: 'Releve officiel des notes par semestre, valide par le secretaire academique' },
  { key: 'attestation_inscription', label: 'Attestation d\'inscription', icon: BookOpen, count: 89, tooltip: 'Attestation confirmant l\'inscription administrative de l\'etudiant' },
  { key: 'certificat_scolarite', label: 'Certificat de scolarite', icon: ScrollText, count: 56, tooltip: 'Certificat prouvant la frequention reguliere des cours' },
  { key: 'attestation_reussite', label: 'Attestation de reussite', icon: Award, count: 23, tooltip: 'Attestation officielle de reussite a un examen ou un diplome' },
  { key: 'carte_etudiant', label: 'Carte etudiant', icon: CreditCard, count: 112, tooltip: 'Carte d\'identification etudiante avec photo et QR code' },
  { key: 'recu_paiement', label: 'Recu de paiement', icon: FileCheck, count: 78, tooltip: 'Recu officiel de paiement des frais de scolarite' },
  { key: 'pv_deliberation', label: 'PV de deliberation', icon: ClipboardList, count: 12, tooltip: 'Proces-verbal officiel des deliberations du jury' },
  { key: 'attestation_stage', label: 'Attestation de stage', icon: Briefcase, count: 18, tooltip: 'Attestation confirmant l\'accomplissement d\'un stage professionnel' },
]

interface GeneratedDoc {
  id: string
  type: string
  typeKey: string
  etudiant: string
  matricule: string
  date: string
  statut: 'signe' | 'genere' | 'en_attente'
  codeVerification: string
}

const generatedDocuments: GeneratedDoc[] = [
  { id: '1', type: 'Releve de notes', typeKey: 'releve_notes', etudiant: 'ABAKAR Adam Hassane', matricule: 'UDN/L2/2024/001', date: '20/01/2025', statut: 'signe', codeVerification: 'VER-UDN-2024-RN-001' },
  { id: '2', type: 'Attestation d\'inscription', typeKey: 'attestation_inscription', etudiant: 'ABAKAR Adam Hassane', matricule: 'UDN/L2/2024/001', date: '15/09/2024', statut: 'signe', codeVerification: 'VER-UDN-2024-AI-001' },
  { id: '3', type: 'Certificat de scolarite', typeKey: 'certificat_scolarite', etudiant: 'ABAKAR Adam Hassane', matricule: 'UDN/L2/2024/001', date: '18/09/2024', statut: 'signe', codeVerification: 'VER-UDN-2024-CS-001' },
  { id: '4', type: 'Releve de notes', typeKey: 'releve_notes', etudiant: 'KHAMIS Fatime', matricule: 'UDN/L3/2024/002', date: '20/01/2025', statut: 'signe', codeVerification: 'VER-UDN-2024-RN-002' },
  { id: '5', type: 'Attestation d\'inscription', typeKey: 'attestation_inscription', etudiant: 'KHAMIS Fatime', matricule: 'UDN/L3/2024/002', date: '12/09/2024', statut: 'signe', codeVerification: 'VER-UDN-2024-AI-002' },
  { id: '6', type: 'Attestation de reussite', typeKey: 'attestation_reussite', etudiant: 'DOUMNGAR Zakaria', matricule: 'UDN/L3/2024/006', date: '05/07/2024', statut: 'signe', codeVerification: 'VER-UDN-2024-AR-001' },
  { id: '7', type: 'Certificat de scolarite', typeKey: 'certificat_scolarite', etudiant: 'DJIBRINE Amina', matricule: 'UDN/L1/2024/003', date: '20/09/2024', statut: 'genere', codeVerification: 'VER-UDN-2024-CS-002' },
  { id: '8', type: 'Releve de notes', typeKey: 'releve_notes', etudiant: 'MAHAMAT Youssouf', matricule: 'UDN/L2/2024/004', date: '', statut: 'en_attente', codeVerification: '' },
  { id: '9', type: 'Carte etudiant', typeKey: 'carte_etudiant', etudiant: 'HISSEIN Mariam', matricule: 'UDN/L1/2024/007', date: '15/09/2024', statut: 'signe', codeVerification: 'VER-UDN-2024-CE-001' },
  { id: '10', type: 'Recu de paiement', typeKey: 'recu_paiement', etudiant: 'AHMAT Achta', matricule: 'UDN/M1/2024/016', date: '10/01/2025', statut: 'genere', codeVerification: 'VER-UDN-2025-RP-001' },
  { id: '11', type: 'PV de deliberation', typeKey: 'pv_deliberation', etudiant: 'NGARNDMI Halime', matricule: 'UDN/L3/2024/008', date: '28/06/2024', statut: 'signe', codeVerification: 'VER-UDN-2024-PV-001' },
  { id: '12', type: 'Attestation de stage', typeKey: 'attestation_stage', etudiant: 'SALEH Hassana', matricule: 'UDN/L2/2024/009', date: '15/02/2025', statut: 'genere', codeVerification: 'VER-UDN-2025-AS-001' },
  { id: '13', type: 'Certificat de scolarite', typeKey: 'certificat_scolarite', etudiant: 'BICHARA Hawa', matricule: 'UDN/L1/2024/010', date: '', statut: 'en_attente', codeVerification: '' },
]

// ASCII keys for status config - NO accented characters
const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  signe: { label: 'Valide', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0', icon: CheckCircle2 },
  genere: { label: 'Genere', className: 'bg-[#d4a85315] text-[#d4a853] border-0', icon: Clock },
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
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedType, setSelectedType] = useState('')
  const [selectedStudent, setSelectedStudent] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGeneratingSigned, setIsGeneratingSigned] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const qrCodeRef = useRef<string | null>(null)

  const animatedDocsMonth = useCountUp(127, 1400)
  const animatedPending = useCountUp(8, 1200)

  const mapTypeToApi = useCallback((key: string) => {
    const map: Record<string, string> = {
      releve_notes: 'RELEVE_NOTES',
      attestation_inscription: 'ATTESTATION_INSCRIPTION',
      certificat_scolarite: 'CERTIFICAT_SCOLARITE',
      attestation_reussite: 'ATTESTATION_INSCRIPTION',
      recu_paiement: 'RELEVE_NOTES',
      pv_deliberation: 'PV_DELIBERATION',
      attestation_stage: 'ATTESTATION_INSCRIPTION',
      carte_etudiant: 'CERTIFICAT_SCOLARITE',
    }
    return map[key] || 'RELEVE_NOTES'
  }, [])

  const generateDoc = useCallback(async (sign: boolean = false) => {
    if (!selectedType || !user) return
    const loading = sign ? setIsGeneratingSigned : setIsGenerating
    loading(true)

    try {
      const res = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: mapTypeToApi(selectedType),
          tenantId: user.tenantId,
          studentId: selectedStudent || undefined,
          academicYearId: undefined,
          data: {
            tenant: {
              name: user.tenantName || 'Université',
              shortName: user.tenantName,
              address: '', city: '', phone: '', email: '',
              rectorName: '', rectorTitle: 'Recteur',
            },
            student: {
              firstName: selectedStudent || 'Étudiant', lastName: '',
              matricule: 'MAT-001', program: 'Programme', level: 'L1',
            },
            academicYear: '2024-2025',
            semester: 'Semestre 1',
            students: [],
          },
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
      a.download = `${selectedType}_${Date.now()}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)

      if (verificationCode) {
        qrCodeRef.current = verificationCode
        setQrCode(verificationCode)
      }

      toast.success(sign ? 'Document généré et signé' : 'Document généré avec succès', {
        description: verificationCode ? `Code: ${verificationCode}` : 'Le fichier PDF a été téléchargé',
      })
    } catch (error) {
      toast.error('Erreur de génération', {
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
      })
    } finally {
      loading(false)
    }
  }, [selectedType, selectedStudent, user, mapTypeToApi])

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
  const signedPercent = Math.round((pipelineSigned / pipelineTotal) * 100)
  const generatedPercent = Math.round((pipelineGenerated / pipelineTotal) * 100)
  const pendingPercent = Math.round((pipelinePending / pipelineTotal) * 100)

  return (
    <TooltipProvider>
      <div className="space-y-5">
        {/* Gradient Hero Section */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-[#1a2744] via-[#1f3050] to-[#2d7a4f] p-6 text-white relative">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE0YzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptLTQgMmMtMS4xIDAtMi0uOS0yLTJzLjktMiAyLTIgMiAuOSAyIDItLjkgMi0yIDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
            <div className="relative">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h1 className="text-2xl font-bold">Centre de generation de documents</h1>
                <p className="text-white/70 text-sm mt-1">Generation, signature et verification des documents academiques</p>
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
                    <p className="text-[11px] text-white/70">Documents generes ce mois</p>
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
                    <p className="text-[11px] text-white/70">Taux de conformite</p>
                  </div>
                  <p className="text-2xl font-bold text-white">98,5%</p>
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
                <p className="text-sm font-medium text-[#1a2744]">Pipeline de generation</p>
                <Badge className="text-[10px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">
                  <Zap className="size-3 mr-1" />
                  En temps reel
                </Badge>
              </div>
              <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
                <motion.div
                  className="bg-[#2d7a4f]"
                  initial={{ width: 0 }}
                  animate={{ width: `${signedPercent}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                />
                <motion.div
                  className="bg-[#d4a853]"
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
                  <div className="w-2.5 h-2.5 rounded-full bg-[#2d7a4f]" />
                  <span className="text-[10px] text-gray-500">Signes ({pipelineSigned})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#d4a853]" />
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
          <Card className="border-l-4 border-l-[#2d7a4f]">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-[#2d7a4f] animate-pulse" />
                <span className="text-[11px] font-medium text-[#1a2744]">Documents recents</span>
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
                      <FileText className="size-3.5 text-[#1a2744] shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium text-[#1a2744] truncate">{doc.type}</p>
                        <p className="text-[9px] text-gray-400">{doc.etudiant} - {doc.date}</p>
                      </div>
                      <StatusIcon className="size-3 shrink-0" style={{ color: doc.statut === 'signe' ? '#2d7a4f' : '#d4a853' }} />
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
              <div className="w-10 h-10 rounded-lg bg-[#1a274415] flex items-center justify-center shrink-0">
                <FileText className="size-5 text-[#1a2744]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#1a2744]">{totalGenerated}</p>
                <p className="text-[11px] text-gray-500">Documents generes</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#2d7a4f15] flex items-center justify-center shrink-0">
                <CheckCircle2 className="size-5 text-[#2d7a4f]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#2d7a4f]">{totalSigned}</p>
                <p className="text-[11px] text-gray-500">Documents signes</p>
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
              <div className="w-10 h-10 rounded-lg bg-[#d4a85315] flex items-center justify-center shrink-0">
                <QrCode className="size-5 text-[#d4a853]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#d4a853]">{totalQRCodes}</p>
                <p className="text-[11px] text-gray-500">QR codes actifs</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Document Generator Card */}
        <Card className="border-l-4 border-l-[#2d7a4f]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
              <Stamp className="size-4 text-[#2d7a4f]" />
              Generer un document
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="h-9 text-sm w-full">
                  <SelectValue placeholder="Type de document" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypeList.map(dt => (
                    <SelectItem key={dt.key} value={dt.key}>{dt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  placeholder="Rechercher un etudiant..."
                  className="pl-9 h-9 text-sm"
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs flex-1 h-9"
                  disabled={!selectedType}
                  onClick={() => generateDoc(false)}
                >
                  <Eye className="size-3.5 mr-1.5" />
                  Apercu
                </Button>
                <Button
                  size="sm"
                  className="bg-[#1a2744] hover:bg-[#1a2744]/90 text-white text-xs flex-1 h-9"
                  disabled={!selectedType || isGenerating}
                  onClick={() => generateDoc(false)}
                >
                  {isGenerating ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Printer className="size-3.5 mr-1.5" />}
                  Generer
                </Button>
              </div>
              <Button
                size="sm"
                className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs h-9"
                disabled={!selectedType || isGeneratingSigned}
                onClick={() => generateDoc(true)}
              >
                {isGeneratingSigned ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <CheckCircle2 className="size-3.5 mr-1.5" />}
                Generer et signer
              </Button>
            </div>
          </CardContent>
        </Card>

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
              <CardTitle className="text-sm font-semibold text-[#1a2744]">
                Documents generes ({filteredDocs.length})
              </CardTitle>
              <Badge className="text-[10px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">
                <Shield className="size-3 mr-1" />
                QR Code anti-fraude
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
                    <TableHead className="text-xs font-semibold">Code verification</TableHead>
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
                            <div className="w-7 h-7 rounded bg-[#1a274410] flex items-center justify-center shrink-0">
                              <FileText className="size-3.5 text-[#1a2744]" />
                            </div>
                            <span className="text-sm font-medium text-[#1a2744] whitespace-nowrap">{doc.type}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <div>
                            <p className="text-sm text-[#1a2744] font-medium">{doc.etudiant}</p>
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
                              <QrCode className="size-3.5 text-[#2d7a4f]" />
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
                                <Button variant="ghost" size="sm" className="h-7 text-xs text-[#2d7a4f] hover:text-[#2d7a4f] hover:bg-[#2d7a4f10]" onClick={() => generateDoc(false)}>
                                  <Eye className="size-3.5 mr-1" />
                                  Voir
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 text-xs text-gray-500 hover:text-gray-700" onClick={() => generateDoc(false)}>
                                  <Download className="size-3.5 mr-1" />
                                  PDF
                                </Button>
                              </div>
                            )}
                            {doc.statut === 'genere' && (
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-[#2d7a4f] hover:text-[#2d7a4f] hover:bg-[#2d7a4f10]">
                                <CheckCircle2 className="size-3.5 mr-1" />
                                Valider
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
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                <GraduationCap className="size-4 text-[#d4a853]" />
                Types de documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {documentTypeList.map((dt) => {
                  const Icon = dt.icon
                  return (
                    <Tooltip key={dt.key}>
                      <TooltipTrigger asChild>
                        <div
                          className="flex flex-col items-center gap-2 p-3 rounded-lg border border-gray-100 hover:border-[#2d7a4f30] hover:bg-[#2d7a4f05] transition-colors cursor-pointer"
                          style={{ borderTop: '3px solid #2d7a4f' }}
                        >
                          <div className="w-9 h-9 rounded-lg bg-[#1a274410] flex items-center justify-center">
                            <Icon className="size-4 text-[#1a2744]" />
                          </div>
                          <div className="text-center">
                            <p className="text-[11px] font-medium text-[#1a2744] leading-tight">{dt.label}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{dt.count} generes</p>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[220px] text-xs">
                        {dt.tooltip}
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Verification Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                <Shield className="size-4 text-[#2d7a4f]" />
                Verification QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-[#2d7a4f08] border border-[#2d7a4f15]">
                <Info className="size-5 text-[#2d7a4f] shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <p className="text-xs text-[#1a2744] font-medium">Systeme de verification securise</p>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Chaque document officiel est muni d un code QR unique permettant sa verification instantanee. 
                    Scannez le code ou saisissez le code de verification pour confirmer l authenticite.
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Hash className="size-3.5 text-[#2d7a4f]" />
                  <span>Code unique par document</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <QrCode className="size-3.5 text-[#2d7a4f]" />
                  <span>QR code crypte anti-fraude</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <CheckCircle2 className="size-3.5 text-[#2d7a4f]" />
                  <span>Verification en temps reel</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Shield className="size-3.5 text-[#2d7a4f]" />
                  <span>Signature numerique conforme</span>
                </div>
              </div>
              <Button variant="outline" className="w-full text-xs h-8 text-[#2d7a4f] border-[#2d7a4f30] hover:bg-[#2d7a4f10]" onClick={() => setView('verify')}>
                <ExternalLink className="size-3.5 mr-1.5" />
                Page de verification
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
              <QrCode className="size-8 text-[#2d7a4f] mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-[#1a2744] mb-1">Document généré</h3>
              <p className="text-xs text-gray-400 mb-4">Scannez ce code pour vérifier l&apos;authenticité</p>

              <div className="flex justify-center mb-4">
                <QrDisplay value={`${typeof window !== 'undefined' ? window.location.origin : ''}/verify?code=${qrCode}`} size={160} />
              </div>

              <p className="text-xs font-mono font-bold text-[#1a2744] mb-4">{qrCode}</p>

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
                  className="flex-1 text-xs bg-gradient-to-r from-[#2d7a4f] to-[#3da66a]"
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
