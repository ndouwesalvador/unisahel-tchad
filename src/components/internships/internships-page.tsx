'use client'

import { exportToExcel } from '@/lib/export'
import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useInternships, useStudents } from '@/lib/api-hooks'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TooltipProvider } from '@/components/ui/tooltip'
import {
  Briefcase,
  FileCheck,
  TrendingUp,
  Search,
  Plus,
  Download,
  MoreHorizontal,
  Eye,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  Star,
  MapPin,
  ChevronRight,
  UserCheck,
  AlertTriangle,
  Send,
  Award,
  Globe,
  Zap,
} from 'lucide-react'

// ─── useCountUp Hook ──────────────────────────────────────────────────────────

function useCountUp(target: number, duration: number = 1400) {
  const [value, setValue] = useState(0)
  const ref = useRef<number>(0)
  useEffect(() => {
    const start = performance.now()
    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) ref.current = requestAnimationFrame(animate)
    }
    ref.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(ref.current)
  }, [target, duration])
  return value
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

interface InternshipEntry {
  id: string
  studentName: string
  matricule: string
  entreprise: string
  type: 'professionnel' | 'hospitalier' | 'recherche' | 'fin-etudes'
  period: string
  status: 'en-cours' | 'convention-signee' | 'en-attente' | 'termine' | 'annule'
  tuteur: string
}

interface InternshipRecord {
  id: string
  studentName: string
  matricule: string
  entreprise: string
  type: 'PROFESSIONNEL' | 'HOSPITALIER' | 'RECHERCHE' | 'FIN_ETUDES'
  period: string | null
  status: 'EN_ATTENTE' | 'CONVENTION_SIGNEE' | 'EN_COURS' | 'TERMINE' | 'ANNULE'
  tuteur: string | null
  startDate: string | null
  endDate: string | null
  evaluation: string | null
  evaluationDate: string | null
  createdAt: string
}

interface PartnerRecord {
  id: string
  name: string
  sector: string
  hostedStudents: number
  capacity: number
  rating: number
  contactEmail: string | null
  contactPhone: string | null
}

// Formats an ISO date string as a French dd/mm/yyyy string, or a fallback when absent.
function formatDateFr(value: string | null | undefined): string {
  if (!value) return 'Non renseignee'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Non renseignee'
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const internshipTypeApiToUi: Record<InternshipRecord['type'], InternshipEntry['type']> = {
  PROFESSIONNEL: 'professionnel',
  HOSPITALIER: 'hospitalier',
  RECHERCHE: 'recherche',
  FIN_ETUDES: 'fin-etudes',
}

const internshipStatusApiToUi: Record<InternshipRecord['status'], InternshipEntry['status']> = {
  EN_COURS: 'en-cours',
  CONVENTION_SIGNEE: 'convention-signee',
  EN_ATTENTE: 'en-attente',
  TERMINE: 'termine',
  ANNULE: 'annule',
}

function mapInternship(r: InternshipRecord): InternshipEntry {
  return {
    id: r.id,
    studentName: r.studentName,
    matricule: r.matricule,
    entreprise: r.entreprise,
    type: internshipTypeApiToUi[r.type],
    period: r.period || '',
    status: internshipStatusApiToUi[r.status],
    tuteur: r.tuteur || '',
  }
}

interface PendingConvention {
  id: string
  studentName: string
  entreprise: string
  submittedDate: string
  currentStep: number
}

// Derives the list of conventions awaiting validation from internships whose status is
// EN_ATTENTE. The Internship model only tracks a single "pending" bucket (no per-step
// actor/date columns), so every derived entry is honestly placed at step 1 (Soumission) —
// we have no data to distinguish finer sub-steps of the approval workflow.
function derivePendingConventions(records: InternshipRecord[]): PendingConvention[] {
  return records
    .filter((r) => r.status === 'EN_ATTENTE')
    .map((r) => ({
      id: r.id,
      studentName: r.studentName,
      entreprise: r.entreprise,
      submittedDate: formatDateFr(r.createdAt),
      currentStep: 1,
    }))
}

interface PartnerDisplay {
  id: string
  name: string
  sector: string
  hostedStudents: number
  capacity: number
  rating: number
  contact: string
  phone: string
}

function mapPartner(p: PartnerRecord): PartnerDisplay {
  return {
    id: p.id,
    name: p.name,
    sector: p.sector,
    hostedStudents: p.hostedStudents,
    capacity: p.capacity,
    rating: p.rating,
    contact: p.contactEmail || 'Non renseigne',
    phone: p.contactPhone || 'Non renseigne',
  }
}

interface TimelineStep {
  label: string
  date: string
  status: 'completed' | 'current' | 'upcoming'
}

const TIMELINE_LABELS = ['Convention signee', 'Stage en cours', 'Stage termine'] as const

// The Internship model only exposes a coarse `status` field, not a dated multi-step
// approval/monitoring workflow (no site-visit, report, or defense dates are captured).
// We derive an honest 3-step status-based indicator instead of fabricating the richer
// steps (visite de terrain, rapport remis, soutenance) that used to be hardcoded here.
function buildTimelineSteps(internship: InternshipRecord): TimelineStep[] {
  const stepIndexByStatus: Record<string, number> = {
    EN_ATTENTE: 0,
    CONVENTION_SIGNEE: 1,
    EN_COURS: 1,
    TERMINE: TIMELINE_LABELS.length,
  }
  const currentIndex = stepIndexByStatus[internship.status] ?? 0
  const dates = [
    formatDateFr(internship.startDate),
    formatDateFr(internship.startDate),
    formatDateFr(internship.endDate),
  ]
  return TIMELINE_LABELS.map((label, index) => ({
    label,
    date: dates[index],
    status: index < currentIndex ? 'completed' : index === currentIndex ? 'current' : 'upcoming',
  }))
}

interface EvaluationResult {
  id: string
  studentName: string
  grade: 'Excellent' | 'Tres bien' | 'Bien' | 'Assez bien' | 'Insuffisant'
  date: string
}

const evaluationGradeMap: Record<string, EvaluationResult['grade']> = {
  EXCELLENT: 'Excellent',
  TRES_BIEN: 'Tres bien',
  BIEN: 'Bien',
  ASSEZ_BIEN: 'Assez bien',
  INSUFFISANT: 'Insuffisant',
}

// Derives recent evaluation results from internships that already carry a non-null
// `evaluation` value — no new query needed, the field is already selected by /api/internships.
function deriveEvaluations(records: InternshipRecord[]): EvaluationResult[] {
  return records
    .filter((r): r is InternshipRecord & { evaluation: string } => Boolean(r.evaluation && evaluationGradeMap[r.evaluation]))
    .map((r) => ({
      id: r.id,
      studentName: r.studentName,
      grade: evaluationGradeMap[r.evaluation],
      date: formatDateFr(r.evaluationDate),
    }))
}

// ─── Status & Type Configs ────────────────────────────────────────────────────

const typeConfig: Record<string, { label: string; className: string }> = {
  professionnel: { label: 'Stage professionnel', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' },
  hospitalier: { label: 'Stage hospitalier', className: 'bg-[#c6282815] text-[#c62828] border-0' },
  recherche: { label: 'Stage de recherche', className: 'bg-[#1a274415] text-[#1a2744] border-0' },
  'fin-etudes': { label: "Stage de fin d'etudes", className: 'bg-[#d4a85315] text-[#d4a853] border-0' },
}

const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  'en-cours': { label: 'En cours', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0', icon: Clock },
  'convention-signee': { label: 'Convention signee', className: 'bg-[#1a274415] text-[#1a2744] border-0', icon: FileCheck },
  'en-attente': { label: 'En attente', className: 'bg-[#d4a85315] text-[#d4a853] border-0', icon: AlertTriangle },
  termine: { label: 'Termine', className: 'bg-gray-100 text-gray-600 border-0', icon: CheckCircle2 },
  annule: { label: 'Annule', className: 'bg-[#c6282815] text-[#c62828] border-0', icon: XCircle },
}

const gradeConfig: Record<string, { className: string; bgClass: string }> = {
  Excellent: { className: 'text-[#2d7a4f]', bgClass: 'bg-[#2d7a4f15]' },
  'Tres bien': { className: 'text-[#1a2744]', bgClass: 'bg-[#1a274415]' },
  Bien: { className: 'text-[#d4a853]', bgClass: 'bg-[#d4a85315]' },
  'Assez bien': { className: 'text-orange-600', bgClass: 'bg-orange-50' },
  Insuffisant: { className: 'text-[#c62828]', bgClass: 'bg-[#c6282815]' },
}

const sectorConfig: Record<string, { className: string; icon: React.ElementType }> = {
  Sante: { className: 'bg-[#c6282815] text-[#c62828] border-0', icon: Building2 },
  Telecom: { className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0', icon: Globe },
  Finance: { className: 'bg-[#d4a85315] text-[#d4a853] border-0', icon: TrendingUp },
  ONG: { className: 'bg-[#1a274415] text-[#1a2744] border-0', icon: Award },
  Energie: { className: 'bg-orange-50 text-orange-600 border-0', icon: Zap },
  Public: { className: 'bg-gray-100 text-gray-600 border-0', icon: Building2 },
}

const workflowSteps = ['Soumission', 'Validation etablissement', 'Signature entreprise']

// ─── Component ────────────────────────────────────────────────────────────────

export function InternshipsPage() {
  const queryClient = useQueryClient()
  const { data: internshipsQuery, isLoading } = useInternships()
  const { data: studentsData } = useStudents({ limit: 1000 })
  const realStudents = (studentsData?.data || []) as Array<{ id: string; firstName: string; lastName: string; matricule: string | null }>
  const rawInternships: InternshipRecord[] = internshipsQuery?.internships || []
  const internships: InternshipEntry[] = rawInternships.map(mapInternship)
  const partners: PartnerDisplay[] = (internshipsQuery?.partners || []).map(mapPartner)
  const pendingConventions: PendingConvention[] = derivePendingConventions(rawInternships)
  const evaluations: EvaluationResult[] = deriveEvaluations(rawInternships)
  const timelineInternship: InternshipRecord | null =
    rawInternships.find((r) => r.status === 'EN_COURS') ||
    rawInternships.find((r) => r.status === 'CONVENTION_SIGNEE') ||
    rawInternships.find((r) => r.status === 'EN_ATTENTE') ||
    rawInternships.find((r) => r.status === 'TERMINE') ||
    rawInternships[0] ||
    null
  const timelineSteps: TimelineStep[] = timelineInternship ? buildTimelineSteps(timelineInternship) : []

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('tous')
  const [statusFilter, setStatusFilter] = useState('tous')
  const [periodFilter, setPeriodFilter] = useState('tous')
  const [entrepriseFilter, setEntrepriseFilter] = useState('tous')

  // Convention validation state (mirrors persisted status for optimistic UI)
  const [conventionStatuses, setConventionStatuses] = useState<Record<string, 'pending' | 'approved' | 'rejected'>>({})
  const [validatingId, setValidatingId] = useState<string | null>(null)

  // Evaluation state
  const [ratings, setRatings] = useState<Record<string, number>>({
    competence: 0,
    integration: 0,
    initiative: 0,
    respect: 0,
    qualite: 0,
  })
  const [appreciation, setAppreciation] = useState('')
  const [commentaire, setCommentaire] = useState('')
  const [evaluationSubmitted, setEvaluationSubmitted] = useState(false)
  const [evalInternshipId, setEvalInternshipId] = useState('')
  const [isSubmittingEval, setIsSubmittingEval] = useState(false)

  // New internship dialog
  const [showNewStage, setShowNewStage] = useState(false)
  const [isCreatingStage, setIsCreatingStage] = useState(false)
  const [stageForm, setStageForm] = useState({ studentId: '', entreprise: '', type: '', period: '', tuteur: '', startDate: '', endDate: '' })

  // Default the evaluation target to the first in-progress internship
  const evalTarget = rawInternships.find((r) => r.id === evalInternshipId)
    || rawInternships.find((r) => r.status === 'EN_COURS' || r.status === 'CONVENTION_SIGNEE')
    || rawInternships[0]
    || null

  // Real stats derived from the actual internship records
  const total = internships.length
  const stagesActifs = internships.filter(i => i.status === 'en-cours' || i.status === 'convention-signee').length
  const stagesTermines = internships.filter(i => i.status === 'termine').length
  const conventionsEnAttente = internships.filter(i => i.status === 'en-attente').length
  const nonAnnules = internships.filter(i => i.status !== 'annule').length
  const tauxValidation = total > 0 ? Math.round((nonAnnules / total) * 100) : 0
  const tauxCompletion = total > 0 ? Math.round((stagesTermines / total) * 100) : 0

  // Count-up hooks for header stats (real values)
  const countStagesActifs = useCountUp(stagesActifs, 1400)
  const countTauxCompletion = useCountUp(tauxCompletion, 1300)

  // Filter internships
  const filteredInternships = internships.filter(i => {
    const matchSearch = search === '' ||
      i.studentName.toLowerCase().includes(search.toLowerCase()) ||
      i.matricule.toLowerCase().includes(search.toLowerCase()) ||
      i.entreprise.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'tous' || i.type === typeFilter
    const matchStatus = statusFilter === 'tous' || i.status === statusFilter
    const matchPeriod = periodFilter === 'tous' || i.period.includes(periodFilter)
    const matchEntreprise = entrepriseFilter === 'tous' || i.entreprise === entrepriseFilter
    return matchSearch && matchType && matchStatus && matchPeriod && matchEntreprise
  })

  const uniqueEntreprises = [...new Set(internships.map(i => i.entreprise))]

  const handleValidateConvention = async (id: string, action: 'approved' | 'rejected') => {
    setValidatingId(id)
    try {
      const res = await fetch(`/api/internships?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action === 'approved' ? 'CONVENTION_SIGNEE' : 'ANNULE' }),
      })
      if (!res.ok) throw new Error('failed')
      setConventionStatuses(prev => ({ ...prev, [id]: action }))
      toast.success(action === 'approved' ? 'Convention validee' : 'Convention rejetee')
      queryClient.invalidateQueries({ queryKey: ['internships'] })
    } catch {
      toast.error('Echec de la mise a jour de la convention')
    } finally {
      setValidatingId(null)
    }
  }

  const handleRatingChange = (criterion: string, value: number) => {
    setRatings(prev => ({ ...prev, [criterion]: value }))
  }

  const handleSubmitEvaluation = async () => {
    if (!evalTarget) {
      toast.error('Aucun stage a evaluer')
      return
    }
    if (!appreciation) {
      toast.error('Selectionnez une appreciation globale')
      return
    }
    setIsSubmittingEval(true)
    try {
      const res = await fetch(`/api/internships?id=${evalTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'TERMINE',
          evaluation: JSON.stringify({ ratings, appreciation, commentaire }),
        }),
      })
      if (!res.ok) throw new Error('failed')
      setEvaluationSubmitted(true)
      toast.success('Evaluation enregistree')
      queryClient.invalidateQueries({ queryKey: ['internships'] })
      setTimeout(() => setEvaluationSubmitted(false), 3000)
    } catch {
      toast.error("Echec de l'enregistrement de l'evaluation")
    } finally {
      setIsSubmittingEval(false)
    }
  }

  const handleCreateStage = async () => {
    const f = stageForm
    const student = realStudents.find((s) => s.id === f.studentId)
    if (!student || !f.entreprise || !f.type) {
      toast.error('Champs requis', { description: 'Etudiant, entreprise et type sont obligatoires' })
      return
    }
    setIsCreatingStage(true)
    try {
      const res = await fetch('/api/internships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: `${student.lastName} ${student.firstName}`,
          matricule: student.matricule || '—',
          entreprise: f.entreprise,
          type: f.type,
          period: f.period || undefined,
          tuteur: f.tuteur || undefined,
          startDate: f.startDate || undefined,
          endDate: f.endDate || undefined,
          status: 'EN_ATTENTE',
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Echec de la creation')
      toast.success('Stage enregistre', { description: `${student.lastName} ${student.firstName} — ${f.entreprise}` })
      queryClient.invalidateQueries({ queryKey: ['internships'] })
      setShowNewStage(false)
      setStageForm({ studentId: '', entreprise: '', type: '', period: '', tuteur: '', startDate: '', endDate: '' })
    } catch (e) {
      toast.error('Erreur', { description: e instanceof Error ? e.message : 'Echec de la creation' })
    } finally {
      setIsCreatingStage(false)
    }
  }

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
    <TooltipProvider>
      <motion.div
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ── 1. Gradient Header Banner ──────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="relative overflow-hidden rounded-xl">
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, #1a2744 0%, #1f3050 40%, #2d7a4f 100%)',
            }}
          />
          {/* SVG Pattern Overlay */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="internship-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#internship-grid)" />
          </svg>
          <div className="relative p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                  <Briefcase className="size-8" />
                  Gestion des Stages
                </h1>
                <p className="text-white/70 text-sm mt-2">
                  Suivi des stages professionnels, hospitaliers et de recherche
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" className="bg-white/10 backdrop-blur border border-white/15 text-white hover:bg-white/20 text-xs" onClick={() => setShowNewStage(true)}>
                  <Plus className="size-3.5 mr-1.5" />
                  Nouveau stage
                </Button>
                <Button size="sm" className="bg-white/10 backdrop-blur border border-white/15 text-white hover:bg-white/20 text-xs" onClick={() => exportToExcel(filteredInternships, 'export_internships')}>
                  <Download className="size-3.5 mr-1.5" />
                  Exporter
                </Button>
              </div>
            </div>

            {/* Glass-morphism stat cards in header */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
              <div className="bg-white/10 backdrop-blur border border-white/15 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-xs uppercase tracking-wide">Stages actifs</p>
                    <p className="text-2xl font-bold text-white mt-1">{countStagesActifs}</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <Briefcase className="size-5 text-white" />
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur border border-white/15 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/60 text-xs uppercase tracking-wide">Taux completion</p>
                    <p className="text-2xl font-bold text-white mt-1">{countTauxCompletion}%</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <TrendingUp className="size-5 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── 2. Stats Cards ────────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Stages actifs */}
          <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
            <Card className="overflow-hidden relative border-l-4 border-l-[#2d7a4f]">
              <div className="h-1 bg-gradient-to-r from-[#2d7a4f] to-[#3da66a]" />
              <div className="absolute inset-0 bg-gradient-to-br from-[#2d7a4f08] to-[#2d7a4f00] pointer-events-none" />
              <CardContent className="p-4 relative">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Stages actifs</p>
                    <p className="text-2xl font-bold text-[#2d7a4f] mt-1">{stagesActifs}</p>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Briefcase className="size-3" />
                      En cours ou convention signee
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#2d7a4f15] flex items-center justify-center">
                    <Briefcase className="size-5 text-[#2d7a4f]" />
                  </div>
                </div>
                <div className="mt-3">
                  <Progress value={total > 0 ? (stagesActifs / total) * 100 : 0} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#2d7a4f]" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Conventions en attente */}
          <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
            <Card className="overflow-hidden relative border-l-4 border-l-[#1a2744]">
              <div className="h-1 bg-gradient-to-r from-[#1a2744] to-[#2a3d5f]" />
              <div className="absolute inset-0 bg-gradient-to-br from-[#1a274408] to-[#1a274400] pointer-events-none" />
              <CardContent className="p-4 relative">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Conventions en attente</p>
                    <p className="text-2xl font-bold text-[#1a2744] mt-1">{conventionsEnAttente}</p>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Clock className="size-3" />
                      Stages en attente de validation
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#1a274415] flex items-center justify-center">
                    <FileCheck className="size-5 text-[#1a2744]" />
                  </div>
                </div>
                <div className="mt-3">
                  <Progress value={total > 0 ? (conventionsEnAttente / total) * 100 : 0} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#1a2744]" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Taux de validation */}
          <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
            <Card className="overflow-hidden relative border-l-4 border-l-[#d4a853]">
              <div className="h-1 bg-gradient-to-r from-[#d4a853] to-[#e6c477]" />
              <div className="absolute inset-0 bg-gradient-to-br from-[#d4a85308] to-[#d4a85300] pointer-events-none" />
              <CardContent className="p-4 relative">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Taux de validation</p>
                    <p className="text-2xl font-bold text-[#d4a853] mt-1">{tauxValidation}%</p>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="size-3" />
                      Stages non annules
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#d4a85315] flex items-center justify-center">
                    <CheckCircle2 className="size-5 text-[#d4a853]" />
                  </div>
                </div>
                <div className="mt-3">
                  <Progress value={tauxValidation} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#d4a853]" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Stages termines */}
          <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
            <Card className="overflow-hidden relative border-l-4 border-l-[#2d7a4f]">
              <div className="h-1 bg-gradient-to-r from-[#2d7a4f] to-[#3da66a]" />
              <div className="absolute inset-0 bg-gradient-to-br from-[#2d7a4f08] to-[#2d7a4f00] pointer-events-none" />
              <CardContent className="p-4 relative">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Stages termines</p>
                    <p className="text-2xl font-bold text-[#2d7a4f] mt-1">{stagesTermines}</p>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Award className="size-3" />
                      {tauxCompletion}% des stages
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#2d7a4f15] flex items-center justify-center">
                    <Award className="size-5 text-[#2d7a4f]" />
                  </div>
                </div>
                <div className="mt-3">
                  <Progress value={tauxCompletion} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#2d7a4f]" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* ── 3. Stage Convention Tracker Card ───────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-[#1a2744]">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <FileCheck className="size-4" />
                  Suivi des conventions de stage
                </CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher par nom, matricule, entreprise..."
                    className="pl-9 h-8 text-xs"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[180px] h-8 text-xs">
                    <SelectValue placeholder="Type de stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous les types</SelectItem>
                    <SelectItem value="professionnel">Stage professionnel</SelectItem>
                    <SelectItem value="hospitalier">Stage hospitalier</SelectItem>
                    <SelectItem value="recherche">Stage de recherche</SelectItem>
                    <SelectItem value="fin-etudes">Stage de fin d&apos;etudes</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[160px] h-8 text-xs">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous les statuts</SelectItem>
                    <SelectItem value="en-cours">En cours</SelectItem>
                    <SelectItem value="convention-signee">Convention signee</SelectItem>
                    <SelectItem value="en-attente">En attente</SelectItem>
                    <SelectItem value="termine">Termine</SelectItem>
                    <SelectItem value="annule">Annule</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={periodFilter} onValueChange={setPeriodFilter}>
                  <SelectTrigger className="w-full sm:w-[160px] h-8 text-xs">
                    <SelectValue placeholder="Periode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Toutes periodes</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={entrepriseFilter} onValueChange={setEntrepriseFilter}>
                  <SelectTrigger className="w-full sm:w-[200px] h-8 text-xs">
                    <SelectValue placeholder="Entreprise" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Toutes les entreprises</SelectItem>
                    {uniqueEntreprises.map(ent => (
                      <SelectItem key={ent} value={ent}>{ent}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <ScrollArea className="max-h-96">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="text-xs font-semibold">Etudiant</TableHead>
                        <TableHead className="text-xs font-semibold">Entreprise</TableHead>
                        <TableHead className="text-xs font-semibold">Type</TableHead>
                        <TableHead className="text-xs font-semibold">Periode</TableHead>
                        <TableHead className="text-xs font-semibold">Statut</TableHead>
                        <TableHead className="text-xs font-semibold">Tuteur</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInternships.map((internship) => {
                        const typeConf = typeConfig[internship.type]
                        const sConf = statusConfig[internship.status]
                        return (
                          <TableRow key={internship.id} className="hover:bg-[#2d7a4f05] transition-colors">
                            <TableCell className="py-2.5">
                              <div>
                                <p className="text-sm font-medium text-[#1a2744]">{internship.studentName}</p>
                                <p className="text-[10px] text-gray-400 font-mono">{internship.matricule}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-gray-600 py-2.5 max-w-[180px] truncate">
                              <div className="flex items-center gap-1.5">
                                <Building2 className="size-3 shrink-0 text-gray-400" />
                                <span className="truncate">{internship.entreprise}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-2.5">
                              {typeConf ? (
                                <Badge className={`text-[10px] ${typeConf.className}`}>
                                  {typeConf.label}
                                </Badge>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-xs text-gray-600 py-2.5 whitespace-nowrap">{internship.period}</TableCell>
                            <TableCell className="py-2.5">
                              {sConf ? (
                                <Badge className={`text-[10px] ${sConf.className}`}>
                                  <sConf.icon className="size-3 mr-1" />
                                  {sConf.label}
                                </Badge>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-xs text-gray-600 py-2.5 whitespace-nowrap">{internship.tuteur}</TableCell>
                            <TableCell className="text-right py-2.5">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-gray-100">
                                    <MoreHorizontal className="size-4 text-gray-400" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                  <DropdownMenuItem className="text-xs">
                                    <Eye className="size-3.5 mr-2" />
                                    Voir les details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-xs">
                                    <FileCheck className="size-3.5 mr-2" />
                                    Voir convention
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-xs">
                                    <UserCheck className="size-3.5 mr-2" />
                                    Contacter tuteur
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-xs">
                                    <Calendar className="size-3.5 mr-2" />
                                    Planifier visite
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {isLoading && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-sm text-gray-400">
                            Chargement...
                          </TableCell>
                        </TableRow>
                      )}
                      {!isLoading && filteredInternships.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-sm text-gray-400">
                            Aucun stage trouve
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── 4. Convention Validation Workflow Card ─────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-[#d4a853]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <FileCheck className="size-4" />
                  Workflow de validation des conventions
                </CardTitle>
                <Badge className="bg-[#d4a85315] text-[#d4a853] border-0 text-xs">
                  {pendingConventions.length} en attente
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {/* 3-step visual workflow */}
              <div className="flex items-center justify-center gap-2 mb-6 p-4 bg-gray-50 rounded-lg">
                {workflowSteps.map((step, index) => (
                  <div key={step} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-[#1a2744] text-white flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                      <p className="text-[10px] text-gray-600 mt-1 text-center max-w-[120px]">{step}</p>
                    </div>
                    {index < workflowSteps.length - 1 && (
                      <ChevronRight className="size-4 text-gray-400 mx-2 shrink-0" />
                    )}
                  </div>
                ))}
              </div>

              {/* Pending conventions */}
              <div className="space-y-3">
                {isLoading && (
                  <p className="text-center py-8 text-sm text-gray-400">Chargement...</p>
                )}
                {!isLoading && pendingConventions.length === 0 && (
                  <p className="text-center py-8 text-sm text-gray-400">Aucune convention en attente</p>
                )}
                {pendingConventions.map((conv) => {
                  const convStatus = conventionStatuses[conv.id]
                  return (
                    <div
                      key={conv.id}
                      className={`p-4 rounded-lg border transition-all ${
                        convStatus === 'approved'
                          ? 'border-[#2d7a4f] bg-[#2d7a4f08]'
                          : convStatus === 'rejected'
                          ? 'border-[#c62828] bg-[#c6282808]'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-[#1a2744]">{conv.studentName}</p>
                            <Badge variant="outline" className="text-[10px] border-gray-200 text-gray-500">
                              {conv.entreprise}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                            <Calendar className="size-3" />
                            Soumise le {conv.submittedDate}
                          </p>
                          {/* Progress indicator */}
                          <div className="flex items-center gap-2 mt-2">
                            {workflowSteps.map((step, index) => {
                              const isCompleted = index < conv.currentStep
                              const isCurrent = index === conv.currentStep - 1
                              return (
                                <div key={step} className="flex items-center">
                                  <div className={`w-3 h-3 rounded-full transition-all ${
                                    isCompleted
                                      ? 'bg-[#2d7a4f]'
                                      : isCurrent
                                      ? 'bg-[#d4a853] ring-2 ring-[#d4a85330]'
                                      : 'bg-gray-200'
                                  }`} />
                                  <span className={`text-[9px] ml-1 ${
                                    isCompleted ? 'text-[#2d7a4f] font-medium' : 'text-gray-400'
                                  }`}>
                                    {step.split(' ')[0]}
                                  </span>
                                  {index < workflowSteps.length - 1 && (
                                    <div className={`w-6 h-0.5 mx-1 ${
                                      isCompleted ? 'bg-[#2d7a4f]' : 'bg-gray-200'
                                    }`} />
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {convStatus === undefined && (
                            <>
                              <Button
                                size="sm"
                                className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs h-7"
                                disabled={validatingId === conv.id}
                                onClick={() => handleValidateConvention(conv.id, 'approved')}
                              >
                                <CheckCircle2 className="size-3 mr-1" />
                                Valider
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-[#c62828] border-[#c6282830] hover:bg-[#c6282810] text-xs h-7"
                                disabled={validatingId === conv.id}
                                onClick={() => handleValidateConvention(conv.id, 'rejected')}
                              >
                                <XCircle className="size-3 mr-1" />
                                Rejeter
                              </Button>
                            </>
                          )}
                          {convStatus === 'approved' && (
                            <Badge className="bg-[#2d7a4f15] text-[#2d7a4f] border-0 text-xs">
                              <CheckCircle2 className="size-3 mr-1" />
                              Validee
                            </Badge>
                          )}
                          {convStatus === 'rejected' && (
                            <Badge className="bg-[#c6282815] text-[#c62828] border-0 text-xs">
                              <XCircle className="size-3 mr-1" />
                              Rejetee
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── 5. Stage Evaluation Card ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <motion.div variants={itemVariants}>
            <Card className="border-l-4 border-l-[#2d7a4f] h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <Star className="size-4" />
                  Evaluation de stage
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="p-3 bg-gray-50 rounded-lg mb-4">
                  {evalTarget ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[#1a2744]">{evalTarget.studentName}</p>
                        <p className="text-[10px] text-gray-400">{evalTarget.matricule} - Stage a {evalTarget.entreprise}</p>
                      </div>
                      {rawInternships.length > 1 && (
                        <Select value={evalTarget.id} onValueChange={setEvalInternshipId}>
                          <SelectTrigger className="h-7 text-[10px] w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {rawInternships.map((r) => (
                              <SelectItem key={r.id} value={r.id} className="text-xs">{r.studentName} — {r.entreprise}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">Aucun stage a evaluer pour le moment</p>
                  )}
                </div>

                {/* Evaluation criteria with star ratings */}
                <div className="space-y-4">
                  {[
                    { key: 'competence', label: 'Competence professionnelle' },
                    { key: 'integration', label: 'Integration dans l\'equipe' },
                    { key: 'initiative', label: 'Initiative et autonomie' },
                    { key: 'respect', label: 'Respect des regles' },
                    { key: 'qualite', label: 'Qualite du travail' },
                  ].map((criterion) => (
                    <div key={criterion.key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-[#1a2744]">{criterion.label}</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => handleRatingChange(criterion.key, star)}
                              className="focus:outline-none transition-transform hover:scale-110"
                            >
                              <Star
                                className={`size-4 ${
                                  star <= (ratings[criterion.key] || 0)
                                    ? 'text-[#d4a853] fill-[#d4a853]'
                                    : 'text-gray-200'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                {/* Overall appreciation */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#1a2744]">Appreciation globale</label>
                  <Select value={appreciation} onValueChange={setAppreciation}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Selectionner l'appreciation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="tres-bien">Tres bien</SelectItem>
                      <SelectItem value="bien">Bien</SelectItem>
                      <SelectItem value="assez-bien">Assez bien</SelectItem>
                      <SelectItem value="insuffisant">Insuffisant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Commentaire */}
                <div className="space-y-2 mt-3">
                  <label className="text-xs font-medium text-[#1a2744]">Commentaire</label>
                  <Textarea
                    placeholder="Commentaire sur le stage de l'etudiant..."
                    className="min-h-[80px] text-xs"
                    value={commentaire}
                    onChange={(e) => setCommentaire(e.target.value)}
                  />
                </div>

                <Button
                  className="w-full mt-4 bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs"
                  onClick={handleSubmitEvaluation}
                  disabled={!evalTarget || isSubmittingEval}
                >
                  <Send className="size-3.5 mr-1.5" />
                  {evaluationSubmitted ? 'Evaluation soumise !' : isSubmittingEval ? 'Enregistrement...' : "Soumettre l'evaluation"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent evaluation results */}
          <motion.div variants={itemVariants}>
            <Card className="border-l-4 border-l-[#2d7a4f] h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <Award className="size-4" />
                  Evaluations recentes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {isLoading && (
                  <p className="text-center py-8 text-sm text-gray-400">Chargement...</p>
                )}
                {!isLoading && evaluations.length === 0 && (
                  <p className="text-center py-8 text-sm text-gray-400">Aucune evaluation disponible pour le moment</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {evaluations.map((evalItem) => {
                    const gConf = gradeConfig[evalItem.grade]
                    return (
                      <motion.div
                        key={evalItem.id}
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                        className={`p-3 rounded-lg border border-gray-100 ${gConf ? gConf.bgClass : ''}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-[#1a2744]">{evalItem.studentName}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{evalItem.date}</p>
                          </div>
                          <Badge className={`text-[10px] border-0 ${gConf ? gConf.className : 'text-gray-600'}`}>
                            {evalItem.grade}
                          </Badge>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* ── 6. Stage Sites & Partenaires Card ──────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-[#1a2744]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <Building2 className="size-4" />
                  Sites de stage &amp; Partenaires
                </CardTitle>
                <Button size="sm" className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs h-7">
                  <Plus className="size-3 mr-1" />
                  Ajouter un partenaire
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {isLoading && (
                <p className="text-center py-8 text-sm text-gray-400">Chargement des partenaires...</p>
              )}
              {!isLoading && partners.length === 0 && (
                <p className="text-center py-8 text-sm text-gray-400">Aucun partenaire enregistre pour le moment</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {partners.map((partner) => {
                  const sConf = sectorConfig[partner.sector]
                  const occupancyPercent = partner.capacity > 0 ? Math.round((partner.hostedStudents / partner.capacity) * 100) : 0
                  return (
                    <motion.div
                      key={partner.id}
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="overflow-hidden h-full">
                        <div className="h-1 bg-gradient-to-r from-[#1a2744] to-[#2d7a4f]" />
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-[#1a2744] truncate">{partner.name}</p>
                              {sConf ? (
                                <Badge className={`text-[10px] mt-1 ${sConf.className}`}>
                                  {partner.sector}
                                </Badge>
                              ) : null}
                            </div>
                            <MapPin className="size-4 text-gray-400 shrink-0 ml-2" />
                          </div>

                          <div className="space-y-2 mt-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500">Stagiaires accueillis</span>
                              <span className="font-semibold text-[#1a2744]">{partner.hostedStudents}/{partner.capacity}</span>
                            </div>
                            <Progress
                              value={occupancyPercent}
                              className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#2d7a4f]"
                            />

                            {/* Star rating */}
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`size-3 ${
                                    star <= partner.rating
                                      ? 'text-[#d4a853] fill-[#d4a853]'
                                      : 'text-gray-200'
                                  }`}
                                />
                              ))}
                              <span className="text-[10px] text-gray-400 ml-1">{partner.rating}/5</span>
                            </div>

                            <Separator />

                            <div className="text-[10px] text-gray-500">
                              <p>Contact: {partner.contact}</p>
                              <p>Tel: {partner.phone}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── 7. Timeline de Stage Card ──────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-[#2d7a4f]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <Calendar className="size-4" />
                  Timeline de stage
                </CardTitle>
                {timelineInternship && (
                  <Badge className="bg-[#2d7a4f15] text-[#2d7a4f] border-0 text-[10px]">
                    {timelineInternship.studentName} - {timelineInternship.entreprise}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {isLoading && (
                <p className="text-center py-8 text-sm text-gray-400">Chargement...</p>
              )}
              {!isLoading && !timelineInternship && (
                <p className="text-center py-8 text-sm text-gray-400">Aucun stage a afficher</p>
              )}
              {!isLoading && timelineInternship && timelineInternship.status === 'ANNULE' && (
                <p className="text-center py-8 text-sm text-gray-400">
                  Ce stage a ete annule, aucune timeline a afficher
                </p>
              )}
              {timelineInternship && timelineInternship.status !== 'ANNULE' && (
              <div className="relative pl-8">
                {/* Vertical connecting line */}
                <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200" />

                <div className="space-y-6">
                  {timelineSteps.map((step, index) => (
                    <div key={step.label} className="relative">
                      {/* Dot on line */}
                      <div className="absolute -left-5 top-1">
                        {step.status === 'completed' && (
                          <div className="w-5 h-5 rounded-full bg-[#2d7a4f] flex items-center justify-center">
                            <CheckCircle2 className="size-3 text-white" />
                          </div>
                        )}
                        {step.status === 'current' && (
                          <motion.div
                            className="w-5 h-5 rounded-full bg-[#d4a853] flex items-center justify-center"
                            animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                          >
                            <div className="w-2 h-2 rounded-full bg-white" />
                          </motion.div>
                        )}
                        {step.status === 'upcoming' && (
                          <div className="w-5 h-5 rounded-full bg-gray-200 border-2 border-gray-300" />
                        )}
                      </div>

                      <div className={`p-3 rounded-lg ${
                        step.status === 'completed'
                          ? 'bg-[#2d7a4f08] border border-[#2d7a4f20]'
                          : step.status === 'current'
                          ? 'bg-[#d4a85308] border border-[#d4a85320]'
                          : 'bg-gray-50 border border-gray-100'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`text-sm font-medium ${
                              step.status === 'completed'
                                ? 'text-[#2d7a4f]'
                                : step.status === 'current'
                                ? 'text-[#d4a853]'
                                : 'text-gray-400'
                            }`}>
                              {step.label}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                              <Clock className="size-3" />
                              {step.date}
                            </p>
                          </div>
                          {step.status === 'current' && (
                            <Badge className="bg-[#d4a85315] text-[#d4a853] border-0 text-[10px]">
                              En cours
                            </Badge>
                          )}
                          {step.status === 'completed' && (
                            <Badge className="bg-[#2d7a4f15] text-[#2d7a4f] border-0 text-[10px]">
                              Realise
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Connector to next step */}
                      {index < timelineSteps.length - 1 && step.status === 'completed' && (
                        <div className="absolute -left-[13px] top-[28px] w-0.5 h-[calc(100%-4px)] bg-[#2d7a4f]" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ── 8. African Context Card ────────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-[#d4a853]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <Globe className="size-4" />
                  Contexte africain - Adaptations locales
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Convention numerique */}
                <div className="p-4 rounded-lg bg-[#1a274408] border border-[#1a274415]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-[#1a274415] flex items-center justify-center">
                      <FileCheck className="size-4 text-[#1a2744]" />
                    </div>
                    <span className="text-sm font-semibold text-[#1a2744]">Convention numerique</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Signature electronique des conventions pour les etudiants en zones eloignees. Plus besoin de deplacement physique pour valider les documents de stage.
                  </p>
                </div>

                {/* Stage en milieu rural */}
                <div className="p-4 rounded-lg bg-[#2d7a4f08] border border-[#2d7a4f15]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-[#2d7a4f15] flex items-center justify-center">
                      <MapPin className="size-4 text-[#2d7a4f]" />
                    </div>
                    <span className="text-sm font-semibold text-[#1a2744]">Stage en milieu rural</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Accompgnement specifique pour les stages en hopitaux et centres de sante ruraux. Suivi adapte aux contraintes de connectivite et de ressources.
                  </p>
                </div>

                {/* Verification entreprises */}
                <div className="p-4 rounded-lg bg-[#d4a85308] border border-[#d4a85315]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-[#d4a85315] flex items-center justify-center">
                      <UserCheck className="size-4 text-[#d4a853]" />
                    </div>
                    <span className="text-sm font-semibold text-[#1a2744]">Verification entreprises</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Systeme de verification des entreprises partenaires pour garantir la qualite des stages et la securite des etudiants. Audit regulier des conditions d&apos;accueil.
                  </p>
                </div>

                {/* Rapport simplifie */}
                <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <AlertTriangle className="size-4 text-gray-500" />
                    </div>
                    <span className="text-sm font-semibold text-[#1a2744]">Rapport simplifie</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Modeles de rapports de stage simplifies pour les contextes a faibles ressources. Formats adaptes pour impression et partage hors ligne.
                  </p>
                </div>
              </div>

              {/* Budget conventions */}
              <div className="mt-4 p-4 rounded-lg border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="size-4 text-[#2d7a4f]" />
                    <span className="text-sm font-semibold text-[#1a2744]">Budget conventions</span>
                  </div>
                  <Badge className="bg-[#2d7a4f15] text-[#2d7a4f] border-0 text-[10px]">
                    Exercice 2024-2025
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Budget total</p>
                    <p className="text-lg font-bold text-[#1a2744]">5,200,000</p>
                    <p className="text-[10px] text-gray-400">FCFA</p>
                  </div>
                  <div className="text-center p-3 bg-[#c6282808] rounded-lg">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Depense</p>
                    <p className="text-lg font-bold text-[#c62828]">3,640,000</p>
                    <p className="text-[10px] text-gray-400">FCFA</p>
                  </div>
                  <div className="text-center p-3 bg-[#2d7a4f08] rounded-lg">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Disponible</p>
                    <p className="text-lg font-bold text-[#2d7a4f]">1,560,000</p>
                    <p className="text-[10px] text-gray-400">FCFA</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Taux d&apos;execution</span>
                    <span className="font-semibold text-[#1a2744]">70%</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-[#2d7a4f] to-[#3da66a]"
                      initial={{ width: 0 }}
                      animate={{ width: '70%' }}
                      transition={{ duration: 1.2, ease: 'easeOut' }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                    <span>0 FCFA</span>
                    <span>5,200,000 FCFA</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* New internship dialog */}
      <Dialog open={showNewStage} onOpenChange={(o) => { setShowNewStage(o); if (!o) setStageForm({ studentId: '', entreprise: '', type: '', period: '', tuteur: '', startDate: '', endDate: '' }) }}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#1a2744]">Nouveau stage</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm">Etudiant</Label>
              <Select value={stageForm.studentId} onValueChange={(v) => setStageForm((f) => ({ ...f, studentId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selectionner un etudiant" /></SelectTrigger>
                <SelectContent>
                  {realStudents.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.lastName} {s.firstName} ({s.matricule || '—'})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Entreprise / Structure</Label>
                <Input value={stageForm.entreprise} onChange={(e) => setStageForm((f) => ({ ...f, entreprise: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Type</Label>
                <Select value={stageForm.type} onValueChange={(v) => setStageForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PROFESSIONNEL">Professionnel</SelectItem>
                    <SelectItem value="HOSPITALIER">Hospitalier</SelectItem>
                    <SelectItem value="RECHERCHE">Recherche</SelectItem>
                    <SelectItem value="FIN_ETUDES">Fin d&apos;etudes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Periode (optionnel)</Label>
                <Input placeholder="Ex: Semestre 2 2024-2025" value={stageForm.period} onChange={(e) => setStageForm((f) => ({ ...f, period: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Tuteur (optionnel)</Label>
                <Input value={stageForm.tuteur} onChange={(e) => setStageForm((f) => ({ ...f, tuteur: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Date de debut (optionnel)</Label>
                <Input type="date" value={stageForm.startDate} onChange={(e) => setStageForm((f) => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Date de fin (optionnel)</Label>
                <Input type="date" value={stageForm.endDate} onChange={(e) => setStageForm((f) => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <Button className="w-full bg-[#2d7a4f] hover:bg-[#236b40] text-white" disabled={isCreatingStage} onClick={handleCreateStage}>
              {isCreatingStage ? 'Enregistrement...' : 'Enregistrer le stage'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}


