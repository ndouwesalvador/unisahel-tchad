'use client'

import { useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { QrDisplay } from '@/components/ui/qr-display'
import { Loader2 } from 'lucide-react'
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  CheckSquare,
  Plus,
  FileText,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  Users,
  Shield,
  Gavel,
  TrendingUp,
  Award,
  BookOpen,
  Info,
  Trash2,
  ArrowRight,
  ChevronRight,
  Activity,
} from 'lucide-react'

// ─── Demo Data ────────────────────────────────────────────────────────────────

interface DeliberationSession {
  id: string
  titre: string
  filiere: string
  niveau: string
  semestre: string
  date: string
  statut: 'planifiee' | 'en_cours' | 'terminee'
}

const deliberations: DeliberationSession[] = [
  { id: '1', titre: 'Deliberation L2 Droit S3', filiere: 'Droit', niveau: 'L2', semestre: 'S3', date: '15/07/2025', statut: 'en_cours' },
  { id: '2', titre: 'Deliberation L1 Sciences S2', filiere: 'Sciences', niveau: 'L1', semestre: 'S2', date: '18/07/2025', statut: 'planifiee' },
  { id: '3', titre: 'Deliberation L3 Informatique S5', filiere: 'Informatique', niveau: 'L3', semestre: 'S5', date: '12/07/2025', statut: 'terminee' },
  { id: '4', titre: 'Deliberation M1 Droit S1', filiere: 'Droit', niveau: 'M1', semestre: 'S1', date: '20/07/2025', statut: 'planifiee' },
  { id: '5', titre: 'Deliberation L2 Economie S4', filiere: 'Economie', niveau: 'L2', semestre: 'S4', date: '10/07/2025', statut: 'terminee' },
]

type Decision = 'ADMI' | 'AJOURNE' | 'REDOUBLANT' | 'EXCLU' | 'ADMI_DETTE' | 'COMPENSE'

interface DeliberationStudent {
  id: string
  matricule: string
  nom: string
  prenom: string
  moyenne: number
  credits: number
  creditsTotal: number
  decision: Decision
  observation: string
}

const deliberationStudents: DeliberationStudent[] = [
  { id: '1', matricule: 'UDN/L2/2024/001', nom: 'ABAKAR', prenom: 'Adam Hassane', moyenne: 12.4, credits: 28, creditsTotal: 30, decision: 'ADMI', observation: '' },
  { id: '2', matricule: 'UDN/L2/2024/004', nom: 'MAHAMAT', prenom: 'Youssouf', moyenne: 8.6, credits: 18, creditsTotal: 30, decision: 'REDOUBLANT', observation: 'Credits insuffisants' },
  { id: '3', matricule: 'UDN/L2/2024/017', nom: 'HAMID', prenom: 'Oumar', moyenne: 10.2, credits: 24, creditsTotal: 30, decision: 'ADMI_DETTE', observation: 'Dette de 6 credits' },
  { id: '4', matricule: 'UDN/L2/2024/020', nom: 'HAROUN', prenom: 'Meriam', moyenne: 11.8, credits: 26, creditsTotal: 30, decision: 'ADMI', observation: '' },
  { id: '5', matricule: 'UDN/L2/2024/015', nom: 'ISSA', prenom: 'Mahamat Nour', moyenne: 6.4, credits: 12, creditsTotal: 30, decision: 'EXCLU', observation: 'Moyenne elimatoire' },
  { id: '6', matricule: 'UDN/L2/2024/024', nom: 'BACHAR', prenom: 'Ali', moyenne: 9.2, credits: 22, creditsTotal: 30, decision: 'COMPENSE', observation: 'Compensation par UE validee' },
  { id: '7', matricule: 'UDN/L2/2024/019', nom: 'ABDALLAH', prenom: 'Fadoul', moyenne: 13.6, credits: 30, creditsTotal: 30, decision: 'ADMI', observation: 'Mention Assez-Bien' },
  { id: '8', matricule: 'UDN/L2/2024/011', nom: 'BICHARA', prenom: 'Hawa', moyenne: 10.8, credits: 25, creditsTotal: 30, decision: 'ADMI_DETTE', observation: 'Dette de 5 credits' },
  { id: '9', matricule: 'UDN/M1/2024/010', nom: 'ADOUM', prenom: 'Abdoulaye', moyenne: 7.4, credits: 15, creditsTotal: 30, decision: 'AJOURNE', observation: 'Passage en rattrapage' },
  { id: '10', matricule: 'UDN/M1/2024/016', nom: 'AHMAT', prenom: 'Achta', moyenne: 15.2, credits: 30, creditsTotal: 30, decision: 'ADMI', observation: 'Mention Bien' },
  { id: '11', matricule: 'UDN/L2/2024/002', nom: 'KHAMIS', prenom: 'Fatime', moyenne: 14.8, credits: 30, creditsTotal: 30, decision: 'ADMI', observation: 'Mention Bien' },
  { id: '12', matricule: 'UDN/L2/2024/025', nom: 'OUMAR', prenom: 'Ibrahim', moyenne: 9.8, credits: 20, creditsTotal: 30, decision: 'COMPENSE', observation: 'Compensation validee' },
  { id: '13', matricule: 'UDN/L2/2024/026', nom: 'ZAKARIA', prenom: 'Mariam', moyenne: 11.4, credits: 27, creditsTotal: 30, decision: 'ADMI_DETTE', observation: 'Dette de 3 credits' },
  { id: '14', matricule: 'UDN/L2/2024/027', nom: 'HASSAN', prenom: 'Djibril', moyenne: 5.2, credits: 8, creditsTotal: 30, decision: 'EXCLU', observation: 'Exclusion definitive' },
  { id: '15', matricule: 'UDN/L2/2024/028', nom: 'FATIME', prenom: 'Zenab', moyenne: 13.0, credits: 30, creditsTotal: 30, decision: 'ADMI', observation: 'Mention Assez-Bien' },
  { id: '16', matricule: 'UDN/L2/2024/029', nom: 'MOUSSA', prenom: 'Adoum', moyenne: 8.2, credits: 16, creditsTotal: 30, decision: 'REDOUBLANT', observation: 'Redoublement necessaire' },
  { id: '17', matricule: 'UDN/L2/2024/030', nom: 'KHADIDJA', prenom: 'Abakar', moyenne: 10.6, credits: 28, creditsTotal: 30, decision: 'ADMI_DETTE', observation: 'Dette de 2 credits' },
]

const decisionConfig: Record<Decision, { label: string; className: string; icon: React.ElementType; tooltip: string }> = {
  ADMI: { label: 'Admis', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0 hover:bg-[#2d7a4f15]', icon: CheckCircle2, tooltip: 'Etudiant admis avec succes' },
  AJOURNE: { label: 'Ajourne', className: 'bg-[#ef6c0015] text-[#ef6c00] border-0 hover:bg-[#ef6c0015]', icon: Clock, tooltip: 'Passage en session de rattrapage' },
  REDOUBLANT: { label: 'Redoublant', className: 'bg-[#c6282815] text-[#c62828] border-0 hover:bg-[#c6282815]', icon: XCircle, tooltip: 'Redoublement du semestre' },
  EXCLU: { label: 'Exclu', className: 'bg-[#8b000015] text-[#8b0000] border-0 hover:bg-[#8b000015]', icon: AlertTriangle, tooltip: 'Exclusion definitive' },
  ADMI_DETTE: { label: 'Admis avec dette', className: 'bg-[#d4a85315] text-[#d4a853] border-0 hover:bg-[#d4a85315]', icon: Award, tooltip: 'Admis mais avec des credits en dette' },
  COMPENSE: { label: 'Compense', className: 'bg-[#1a274415] text-[#1a2744] border-0 hover:bg-[#1a274415]', icon: TrendingUp, tooltip: 'Compensation inter-UE validee' },
}

const sessionStatusConfig: Record<string, { label: string; className: string }> = {
  planifiee: { label: 'Planifiee', className: 'bg-[#d4a85315] text-[#d4a853] border-0' },
  en_cours: { label: 'En cours', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' },
  terminee: { label: 'Terminee', className: 'bg-gray-100 text-gray-500 border-0' },
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DeliberationPage() {
  const [selectedSession, setSelectedSession] = useState<string | null>('1')
  const [selectedSessionType, setSelectedSessionType] = useState('normale')
  const [selectedFiliere, setSelectedFiliere] = useState('droit')
  const [selectedNiveau, setSelectedNiveau] = useState('L2')
  const [selectedSemestre, setSelectedSemestre] = useState('S3')
  const [isExportingPV, setIsExportingPV] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [juryMembers, setJuryMembers] = useState([
    { id: '1', name: 'Dr. MAHAMAT Ali', role: 'President' },
    { id: '2', name: 'Prof. KHAMIS Fatime', role: 'Membre' },
    { id: '3', name: 'Dr. ADAM Khadija', role: 'Membre' },
  ])
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberRole, setNewMemberRole] = useState('Membre')

  const exportPV = useCallback(async () => {
    setIsExportingPV(true)
    try {
      const session = {
        name: deliberations.find(s => s.id === selectedSession)?.titre || 'Délibération',
        date: deliberations.find(s => s.id === selectedSession)?.date || '',
        type: selectedSessionType === 'normale' ? 'Session Normale' : 'Session de Rattrapage',
      }

      const members = juryMembers.map(m => ({ name: m.name, role: m.role }))
      const students = deliberationStudents.map(s => ({
        name: `${s.prenom} ${s.nom}`,
        matricule: s.matricule,
        moy: s.moyenne,
        decision: s.decision === 'ADMI' ? 'ADMIS' : s.decision === 'ADMI_DETTE' ? 'ADMIS_CHANCE' : s.decision === 'COMPENSE' ? 'ADMIS' : s.decision,
        mention: s.moyenne >= 16 ? 'Très Bien' : s.moyenne >= 14 ? 'Bien' : s.moyenne >= 12 ? 'Assez Bien' : s.moyenne >= 10 ? 'Passable' : undefined,
      }))

      const res = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'PV_DELIBERATION',
          tenantId: 'unknown',
          deliberationId: selectedSession,
          data: {
            session, members, students, academicYear: '2024-2025',
            tenant: {
              name: 'Université de N\'Djamena', shortName: 'UND',
              address: 'Avenue du 28 Novembre', city: 'N\'Djamena',
              phone: '+235 66 00 00 00', email: 'contact@univ-ndjamena.td',
              rectorName: 'Pr. Mahamat Ali', rectorTitle: 'Recteur',
            },
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
      a.download = `PV_Deliberation_${Date.now()}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)

      if (verificationCode) {
        setQrCode(verificationCode)
      }

      toast.success('PV exporté avec succès', { description: verificationCode ? `Code: ${verificationCode}` : 'Le procès-verbal a été téléchargé' })
    } catch (error) {
      toast.error('Erreur d\'export', {
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
      })
    } finally {
      setIsExportingPV(false)
    }
  }, [selectedSession, selectedSessionType, juryMembers])

  const currentSession = deliberations.find(d => d.id === selectedSession)

  // ─── Computed Stats ────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const admis = deliberationStudents.filter(s => s.decision === 'ADMI').length
    const compenses = deliberationStudents.filter(s => s.decision === 'COMPENSE').length
    const ajournes = deliberationStudents.filter(s => s.decision === 'AJOURNE' || s.decision === 'REDOUBLANT').length
    const exclus = deliberationStudents.filter(s => s.decision === 'EXCLU').length
    const admisDette = deliberationStudents.filter(s => s.decision === 'ADMI_DETTE').length
    const admissionRate = Math.round(((admis + compenses + admisDette) / deliberationStudents.length) * 100)
    return {
      total: deliberationStudents.length,
      admis,
      compenses,
      ajournes,
      exclus,
      admisDette,
      admissionRate,
    }
  }, [])

  // ─── Jury Members Management ───────────────────────────────────────────
  const addMember = () => {
    if (!newMemberName.trim()) return
    const newMember = {
      id: String(juryMembers.length + 1),
      name: newMemberName.trim(),
      role: newMemberRole,
    }
    setJuryMembers(prev => [...prev, newMember])
    setNewMemberName('')
  }

  const removeMember = (id: string) => {
    setJuryMembers(prev => prev.filter(m => m.id !== id))
  }

  // ─── Get Decision Badge Color for Row ──────────────────────────────────
  const getDecisionRowBg = (decision: Decision) => {
    switch (decision) {
      case 'ADMI': return 'bg-[#2d7a4f05]'
      case 'COMPENSE': return 'bg-[#1a274405]'
      case 'ADMI_DETTE': return 'bg-[#d4a85305]'
      case 'AJOURNE': return 'bg-[#ef6c0005]'
      case 'REDOUBLANT': return 'bg-[#c6282805]'
      case 'EXCLU': return 'bg-[#8b000005]'
      default: return ''
    }
  }

  const getMoyenneColor = (moyenne: number) => {
    if (moyenne >= 10) return 'text-[#2d7a4f]'
    if (moyenne >= 8) return 'text-[#f9a825]'
    return 'text-[#c62828]'
  }

  // Determine jury status based on current session
  const juryStatus = currentSession?.statut === 'en_cours' ? 'active' : currentSession?.statut === 'planifiee' ? 'pending' : 'completed'

  return (
    <TooltipProvider>
      <div className="space-y-5">
        {/* Gradient Header Banner */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-[#1a2744] via-[#1f3050] to-[#2d7a4f] p-6 text-white relative">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE0YzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptLTQgMmMtMS4xIDAtMi0uOS0yLTJzLjktMiAyLTIgMiAuOSAyIDItLjkgMi0yIDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
              <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div>
                    <h1 className="text-2xl font-bold">Session de deliberation</h1>
                    <p className="text-white/70 text-sm mt-1">Deliberations et decisions de jury</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Animated Badge */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.3, type: 'spring', stiffness: 200 }}
                  >
                    <Badge className="bg-white/20 text-white border border-white/30 text-xs px-3 py-1">
                      <Gavel className="size-3 mr-1.5" />
                      {currentSession?.titre || 'L2 Droit S3'}
                    </Badge>
                  </motion.div>
                  <Button variant="outline" size="sm" className="text-xs bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white" onClick={exportPV} disabled={isExportingPV}>
                    {isExportingPV ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Download className="size-3.5 mr-1.5" />}
                    Exporter PV
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Jury Status Indicator */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Activity className="size-4 text-[#1a2744]" />
                  <span className="text-sm font-semibold text-[#1a2744]">Statut du jury</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100">
                    {juryStatus === 'active' && (
                      <motion.div
                        className="w-2.5 h-2.5 rounded-full bg-[#2d7a4f]"
                        animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    )}
                    {juryStatus === 'pending' && (
                      <motion.div
                        className="w-2.5 h-2.5 rounded-full bg-[#d4a853]"
                        animate={{ scale: [1, 1.2, 1], opacity: [1, 0.6, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    )}
                    {juryStatus === 'completed' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                    )}
                    <span className={`text-xs font-medium ${
                      juryStatus === 'active' ? 'text-[#2d7a4f]' :
                      juryStatus === 'pending' ? 'text-[#d4a853]' :
                      'text-gray-400'
                    }`}>
                      {juryStatus === 'active' ? 'Jury actif - Deliberation en cours' :
                       juryStatus === 'pending' ? 'Jury en attente - Planifie' :
                       'Deliberation terminee'}
                    </span>
                  </div>
                  {juryStatus === 'active' && (
                    <Badge className="text-[10px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">
                      {juryMembers.length} membres presents
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── Jury Configuration Card ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="border-l-4 border-l-[#2d7a4f]">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Gavel className="size-4 text-[#2d7a4f]" />
                <CardTitle className="text-sm font-semibold text-[#1a2744]">
                  Configuration du jury
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Selectors Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Session</Label>
                  <Select value={selectedSessionType} onValueChange={setSelectedSessionType}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Session" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normale">Session Normale</SelectItem>
                      <SelectItem value="rattrapage">Session de Rattrapage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Programme / Filiere</Label>
                  <Select value={selectedFiliere} onValueChange={setSelectedFiliere}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Filiere" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="droit">Droit</SelectItem>
                      <SelectItem value="sciences">Sciences</SelectItem>
                      <SelectItem value="informatique">Informatique</SelectItem>
                      <SelectItem value="lettres">Lettres</SelectItem>
                      <SelectItem value="economie">Economie</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Niveau</Label>
                  <Select value={selectedNiveau} onValueChange={setSelectedNiveau}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Niveau" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="L1">L1 - Licence 1</SelectItem>
                      <SelectItem value="L2">L2 - Licence 2</SelectItem>
                      <SelectItem value="L3">L3 - Licence 3</SelectItem>
                      <SelectItem value="M1">M1 - Master 1</SelectItem>
                      <SelectItem value="M2">M2 - Master 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Semestre</Label>
                  <Select value={selectedSemestre} onValueChange={setSelectedSemestre}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Semestre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="S1">Semestre 1</SelectItem>
                      <SelectItem value="S2">Semestre 2</SelectItem>
                      <SelectItem value="S3">Semestre 3</SelectItem>
                      <SelectItem value="S4">Semestre 4</SelectItem>
                      <SelectItem value="S5">Semestre 5</SelectItem>
                      <SelectItem value="S6">Semestre 6</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Jury Members with staggered animation */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                    <Users className="size-3.5" />
                    Membres du jury
                  </Label>
                  <Badge className="text-[10px] bg-[#1a274410] text-[#1a2744] border-0">
                    {juryMembers.length} membres
                  </Badge>
                </div>
                <div className="space-y-2">
                  <AnimatePresence>
                    {juryMembers.map((member, idx) => (
                      <motion.div
                        key={member.id}
                        layout
                        initial={{ opacity: 0, x: -20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 10, scale: 0.95 }}
                        transition={{ duration: 0.35, delay: idx * 0.08, ease: 'easeOut' }}
                        className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <motion.div
                            className="w-8 h-8 rounded-full flex items-center justify-center"
                            style={{
                              background: member.role === 'President'
                                ? 'linear-gradient(135deg, #d4a853, #e0be72)'
                                : 'linear-gradient(135deg, #1a2744, #2a3d5e)'
                            }}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.3, delay: idx * 0.08 + 0.1, type: 'spring', stiffness: 200 }}
                          >
                            <User className="size-3.5 text-white" />
                          </motion.div>
                          <div>
                            <p className="text-sm font-medium text-[#1a2744]">{member.name}</p>
                            <Badge className={`text-[10px] border-0 ${
                              member.role === 'President'
                                ? 'bg-[#d4a85315] text-[#d4a853]'
                                : 'bg-[#2d7a4f15] text-[#2d7a4f]'
                            }`}>
                              {member.role}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-gray-600 hover:text-[#c62828] hover:bg-[#c6282810]"
                          onClick={() => removeMember(member.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                {/* Add Member */}
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Nom du membre..."
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="h-9 text-sm flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && addMember()}
                  />
                  <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                    <SelectTrigger className="h-9 text-sm w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="President">President</SelectItem>
                      <SelectItem value="Membre">Membre</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="h-9 bg-[#1a2744] hover:bg-[#253556] text-white text-xs"
                    onClick={addMember}
                  >
                    <Plus className="size-3.5 mr-1" />
                    Ajouter
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Launch Button */}
              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs"
                  onClick={() => toast.success('Délibération lancée', { description: `Session ${currentSession?.titre || 'en cours'}` })}
                >
                  <Shield className="size-3.5 mr-1.5" />
                  Lancer la deliberation
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── Deliberation Results Section ────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <div className="space-y-4">
            {/* Summary Cards with Gradient Accent Bars */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Admis */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 }}
              >
                <Card className="relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2d7a4f] to-[#3da66a]" />
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 rounded-lg bg-[#2d7a4f10]">
                        <CheckCircle2 className="size-4 text-[#2d7a4f]" />
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge className="text-[10px] bg-[#2d7a4f15] text-[#2d7a4f] border-0 cursor-help">
                            {stats.admis + stats.admisDette}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Admis: {stats.admis} + Admis avec dette: {stats.admisDette}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-2xl font-bold text-[#2d7a4f]">{stats.admis}</p>
                    <p className="text-xs text-gray-500 mt-1">Admis</p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Compenses */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.15 }}
              >
                <Card className="relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1a2744] to-[#3a4d6e]" />
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 rounded-lg bg-[#1a274410]">
                        <TrendingUp className="size-4 text-[#1a2744]" />
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge className="text-[10px] bg-[#1a274415] text-[#1a2744] border-0 cursor-help">
                            {stats.compenses}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Compensation inter-UE validee</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-2xl font-bold text-[#1a2744]">{stats.compenses}</p>
                    <p className="text-xs text-gray-500 mt-1">Compenses</p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Ajournes */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.2 }}
              >
                <Card className="relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#d4a853] to-[#e0be72]" />
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 rounded-lg bg-[#d4a85310]">
                        <Clock className="size-4 text-[#d4a853]" />
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge className="text-[10px] bg-[#d4a85315] text-[#d4a853] border-0 cursor-help">
                            {stats.ajournes}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Ajournes + Redoublants</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-2xl font-bold text-[#d4a853]">{stats.ajournes}</p>
                    <p className="text-xs text-gray-500 mt-1">Ajournes</p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Exclus */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.25 }}
              >
                <Card className="relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#8b0000] to-[#c62828]" />
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 rounded-lg bg-[#8b000010]">
                        <XCircle className="size-4 text-[#8b0000]" />
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge className="text-[10px] bg-[#8b000015] text-[#8b0000] border-0 cursor-help">
                            {stats.exclus}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Exclusion definitive - moyenne eliminatorie</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-2xl font-bold text-[#8b0000]">{stats.exclus}</p>
                    <p className="text-xs text-gray-500 mt-1">Exclus</p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Admission Rate Progress */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Award className="size-4 text-[#2d7a4f]" />
                    <span className="text-sm font-semibold text-[#1a2744]">Taux d&apos;admission</span>
                  </div>
                  <span className="text-2xl font-bold text-[#2d7a4f]">{stats.admissionRate}%</span>
                </div>
                <Progress value={stats.admissionRate} className="h-3" />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[10px] text-gray-400">
                    {stats.admis + stats.admisDette + stats.compenses} reussites sur {stats.total} etudiants
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-sm bg-[#2d7a4f]" />
                      <span className="text-[10px] text-gray-400">Admis</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-sm bg-[#1a2744]" />
                      <span className="text-[10px] text-gray-400">Compense</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-sm bg-[#d4a853]" />
                      <span className="text-[10px] text-gray-400">Dette</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-sm bg-[#c62828]" />
                      <span className="text-[10px] text-gray-400">Ajourne</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* ─── Student Results Table ────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-[#1a2744]" />
                  <CardTitle className="text-sm font-semibold text-[#1a2744]">
                    Resultats des etudiants
                  </CardTitle>
                  <Badge className="text-[10px] bg-[#1a274410] text-[#1a2744] border-0">
                    {deliberationStudents.length} etudiants
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="text-xs" onClick={exportPV} disabled={isExportingPV}>
                    {isExportingPV ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Download className="size-3.5 mr-1.5" />}
                    PV
                  </Button>
                  <Button size="sm" className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs" onClick={() => toast.success('Délibération validée', { description: 'Les résultats sont officialisés' })}>
                    <CheckSquare className="size-3.5 mr-1.5" />
                    Valider deliberation
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-xs font-semibold text-gray-500 w-8">#</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500">Matricule</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500">Nom Prenom</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500 text-center">Moyenne</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500 text-center">Credits valides</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500">Decision</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500">Observation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliberationStudents.map((student, i) => {
                      const config = decisionConfig[student.decision]
                      const DecisionIcon = config.icon
                      return (
                        <motion.tr
                          key={student.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.25, delay: i * 0.025 }}
                          className={`hover:bg-gray-50/50 ${getDecisionRowBg(student.decision)}`}
                        >
                          <TableCell className="text-xs text-gray-400 py-2">{i + 1}</TableCell>
                          <TableCell className="text-xs font-mono text-gray-600 py-2">{student.matricule}</TableCell>
                          <TableCell className="text-sm font-medium text-[#1a2744] py-2">
                            {student.nom} {student.prenom}
                          </TableCell>
                          <TableCell className="text-center py-2">
                            <span className={`text-sm font-bold ${getMoyenneColor(student.moyenne)}`}>
                              {student.moyenne.toFixed(1)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center py-2">
                            <div className="flex items-center justify-center gap-1.5">
                              <span className="text-sm font-medium text-[#1a2744]">{student.credits}</span>
                              <span className="text-xs text-gray-400">/ {student.creditsTotal}</span>
                            </div>
                            <div className="mt-0.5 h-1 bg-gray-100 rounded-full overflow-hidden mx-4">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  student.credits >= student.creditsTotal
                                    ? 'bg-[#2d7a4f]'
                                    : student.credits >= student.creditsTotal * 0.7
                                      ? 'bg-[#d4a853]'
                                      : 'bg-[#c62828]'
                                }`}
                                style={{ width: `${(student.credits / student.creditsTotal) * 100}%` }}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="py-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  <Badge className={`text-[10px] flex items-center gap-1 w-fit cursor-help ${config.className}`}>
                                    <DecisionIcon className="size-3" />
                                    {config.label}
                                  </Badge>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{config.tooltip}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="py-2">
                            <span className="text-xs text-gray-500">{student.observation || '-'}</span>
                          </TableCell>
                        </motion.tr>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── LMD Compensation Rules Card ─────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
        >
          <Card className="border-l-4 border-l-[#d4a853]">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="size-4 text-[#d4a853]" />
                <CardTitle className="text-sm font-semibold text-[#1a2744]">
                  Regles de compensation LMD
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Rules Explanation */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Compensation Rules */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-[#1a2744] uppercase flex items-center gap-1.5">
                    <Info className="size-3.5 text-[#d4a853]" />
                    Regles de compensation
                  </h3>
                  <div className="space-y-2">
                    <div className="p-3 bg-[#2d7a4f08] border border-[#2d7a4f15] rounded-lg">
                      <p className="text-xs font-medium text-[#2d7a4f]">Compensation entre UE</p>
                      <p className="text-[11px] text-gray-600 mt-1">
                        Un etudiant peut compenser une UE dont la moyenne est entre 8 et 9.99 par une autre UE validee avec une moyenne superieure a 10, dans le meme semestre.
                      </p>
                    </div>
                    <div className="p-3 bg-[#d4a85308] border border-[#d4a85315] rounded-lg">
                      <p className="text-xs font-medium text-[#d4a853]">Seuil de credits</p>
                      <p className="text-[11px] text-gray-600 mt-1">
                        L&apos;admission est acquise si l&apos;etudiant obtient au moins 60% des credits du semestre (18/30) avec une moyenne generale &ge; 10/20.
                      </p>
                    </div>
                    <div className="p-3 bg-[#c6282808] border border-[#c6282815] rounded-lg">
                      <p className="text-xs font-medium text-[#c62828]">Notes eliminatories</p>
                      <p className="text-[11px] text-gray-600 mt-1">
                        Toute note inferieure a 8/20 dans une UE est eliminatorie et ne peut pas etre compensee. L&apos;etudiant doit passer en rattrapage.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Visual Compensation Flow */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-[#1a2744] uppercase flex items-center gap-1.5">
                    <TrendingUp className="size-3.5 text-[#d4a853]" />
                    Flux de decision
                  </h3>
                  <div className="space-y-2">
                    {/* Step 1 */}
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-7 h-7 rounded-full bg-[#1a2744] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        1
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-[#1a2744]">Calcul de la moyenne par UE</p>
                        <p className="text-[11px] text-gray-500">Moyenne = CC x 40% + Examen x 60% (+ TP si applicable)</p>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <ArrowRight className="size-4 text-gray-300 rotate-90" />
                    </div>
                    {/* Step 2 */}
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-7 h-7 rounded-full bg-[#2d7a4f] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        2
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-[#2d7a4f]">Verification des seuils</p>
                        <p className="text-[11px] text-gray-500">Note &ge; 10 : valide | 8-9.99 : compensation possible | &lt; 8 : eliminatorie</p>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <ArrowRight className="size-4 text-gray-300 rotate-90" />
                    </div>
                    {/* Step 3 */}
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-7 h-7 rounded-full bg-[#d4a853] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        3
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-[#d4a853]">Compensation inter-UE</p>
                        <p className="text-[11px] text-gray-500">Les UE validees compensent les UE deficitaires si la moyenne du semestre &ge; 10</p>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <ArrowRight className="size-4 text-gray-300 rotate-90" />
                    </div>
                    {/* Step 4 */}
                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-7 h-7 rounded-full bg-[#1a2744] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        4
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-[#1a2744]">Decision du jury</p>
                        <p className="text-[11px] text-gray-500">Admis / Admis avec dette / Compense / Ajourne / Exclu</p>
                      </div>
                    </div>
                  </div>

                  {/* Credit Thresholds Quick Reference */}
                  <div className="mt-3 p-3 bg-[#1a274405] rounded-lg border border-[#1a274410]">
                    <p className="text-[10px] font-semibold text-[#1a2744] uppercase mb-2">Seuils de credits (semestre 30 credits)</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center p-2 bg-white rounded border border-gray-100">
                        <p className="text-sm font-bold text-[#2d7a4f]">30/30</p>
                        <p className="text-[10px] text-gray-500">Admis</p>
                      </div>
                      <div className="text-center p-2 bg-white rounded border border-gray-100">
                        <p className="text-sm font-bold text-[#d4a853]">18-29</p>
                        <p className="text-[10px] text-gray-500">Dette</p>
                      </div>
                      <div className="text-center p-2 bg-white rounded border border-gray-100">
                        <p className="text-sm font-bold text-[#c62828]">&lt;18</p>
                        <p className="text-[10px] text-gray-500">Ajourne</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── Existing Session List ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                <FileText className="size-4" />
                Sessions de deliberation
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs">Titre</TableHead>
                    <TableHead className="text-xs">Filiere</TableHead>
                    <TableHead className="text-xs">Niveau</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Statut</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliberations.map((session) => (
                    <TableRow
                      key={session.id}
                      className={`cursor-pointer transition-colors ${selectedSession === session.id ? 'bg-[#2d7a4f08]' : 'hover:bg-gray-50'}`}
                      onClick={() => setSelectedSession(session.id)}
                    >
                      <TableCell className="text-sm font-medium text-[#1a2744]">{session.titre}</TableCell>
                      <TableCell className="text-sm text-gray-600">{session.filiere}</TableCell>
                      <TableCell className="text-sm text-gray-600">{session.niveau}</TableCell>
                      <TableCell className="text-sm text-gray-500">{session.date}</TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${sessionStatusConfig[session.statut].className}`}>
                          {sessionStatusConfig[session.statut].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-[#2d7a4f]" onClick={() => { setSelectedSession(session.id); toast.success(`Session ${session.titre} sélectionnée`) }}>
                          <ChevronRight className="size-3.5 mr-1" />
                          Detail
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
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
              <div className="w-12 h-12 rounded-full bg-[#2d7a4f15] flex items-center justify-center mx-auto mb-3">
                <Download className="size-6 text-[#2d7a4f]" />
              </div>
              <h3 className="text-lg font-semibold text-[#1a2744] mb-1">PV exporté</h3>
              <p className="text-xs text-gray-400 mb-4">Scannez ce code pour vérifier l&apos;authenticité du PV</p>

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
