'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

const demoInternships: InternshipEntry[] = [
  { id: '1', studentName: 'MAHAMAT Youssouf', matricule: 'UDN/L3/2024/001', entreprise: "Hopital General de Reference N'Djamena", type: 'hospitalier', period: '01/03/2025 - 31/08/2025', status: 'en-cours', tuteur: 'Dr. KHAMIS Abdoulaye' },
  { id: '2', studentName: 'FATIME Khamis', matricule: 'UDN/L2/2024/002', entreprise: 'Orange Tchad', type: 'professionnel', period: '15/02/2025 - 15/07/2025', status: 'convention-signee', tuteur: 'M. DJIMARTINOUBA Robert' },
  { id: '3', studentName: 'ISSA Mahamat Nour', matricule: 'UDN/M1/2024/003', entreprise: 'Banque Sahelo-Saharienne', type: 'professionnel', period: '01/01/2025 - 30/06/2025', status: 'en-cours', tuteur: 'Mme. NASSERINGAR Fatime' },
  { id: '4', studentName: 'HAWA Ngarndmi', matricule: 'UDN/L3/2024/004', entreprise: 'Ministere de la Sante', type: 'recherche', period: '01/04/2025 - 30/09/2025', status: 'en-attente', tuteur: 'Dr. HISSEIN Adam' },
  { id: '5', studentName: 'ABAKAR Adam Hassane', matricule: 'UDN/M2/2024/005', entreprise: 'UNICEF Tchad', type: 'fin-etudes', period: '15/01/2025 - 15/07/2025', status: 'en-cours', tuteur: 'M. BICHARA Nathanael' },
  { id: '6', studentName: 'KHAMIS Fatime', matricule: 'UDN/L2/2024/006', entreprise: 'Airtel', type: 'professionnel', period: '01/02/2025 - 31/07/2025', status: 'termine', tuteur: 'M. OUMAR Ibrahim' },
  { id: '7', studentName: 'NGARNDMI Halime', matricule: 'UDN/L3/2024/007', entreprise: 'Bureau Veritas', type: 'professionnel', period: '01/03/2025 - 31/08/2025', status: 'en-cours', tuteur: 'Mme. DJIMADOUMBER Lea' },
  { id: '8', studentName: 'HISSEIN Mariam', matricule: 'UDN/M1/2024/008', entreprise: 'Total Energies Tchad', type: 'fin-etudes', period: '01/02/2025 - 30/07/2025', status: 'convention-signee', tuteur: 'M. SEID Mahamat' },
  { id: '9', studentName: 'ADAM Khadija', matricule: 'UDN/L2/2024/009', entreprise: "Hopital General de Reference N'Djamena", type: 'hospitalier', period: '15/03/2025 - 15/09/2025', status: 'en-cours', tuteur: 'Dr. ABAKAR Youssouf' },
  { id: '10', studentName: 'BICHARA Hawa', matricule: 'UDN/L1/2024/010', entreprise: 'Ministere de la Sante', type: 'hospitalier', period: '01/05/2025 - 31/10/2025', status: 'en-attente', tuteur: 'Dr. FATIME Khamis' },
  { id: '11', studentName: 'SEID Ibrahim', matricule: 'UDN/L3/2024/011', entreprise: 'Orange Tchad', type: 'professionnel', period: '01/01/2025 - 30/06/2025', status: 'annule', tuteur: 'M. ISSA Nour' },
  { id: '12', studentName: 'DJIMADOUMBER Deubong', matricule: 'UDN/M2/2024/012', entreprise: 'UNICEF Tchad', type: 'recherche', period: '15/02/2025 - 15/08/2025', status: 'en-cours', tuteur: 'Mme. HAWA Ngarndmi' },
]

interface PendingConvention {
  id: string
  studentName: string
  entreprise: string
  submittedDate: string
  currentStep: number
}

const demoPendingConventions: PendingConvention[] = [
  { id: 'p1', studentName: 'HAWA Ngarndmi', entreprise: 'Ministere de la Sante', submittedDate: '12/03/2025', currentStep: 1 },
  { id: 'p2', studentName: 'BICHARA Hawa', entreprise: "Hopital General de Reference N'Djamena", submittedDate: '15/03/2025', currentStep: 1 },
  { id: 'p3', studentName: 'HISSEIN Mariam', entreprise: 'Total Energies Tchad', submittedDate: '10/03/2025', currentStep: 2 },
  { id: 'p4', studentName: 'FATIME Khamis', entreprise: 'Orange Tchad', submittedDate: '08/03/2025', currentStep: 2 },
  { id: 'p5', studentName: 'NGARNDMI Halime', entreprise: 'Bureau Veritas', submittedDate: '05/03/2025', currentStep: 1 },
]

interface PartnerSite {
  id: string
  name: string
  sector: string
  hostedStudents: number
  capacity: number
  rating: number
  contact: string
  phone: string
}

const demoPartners: PartnerSite[] = [
  { id: 'pt1', name: "Hopital General de Reference N'Djamena", sector: 'Sante', hostedStudents: 24, capacity: 30, rating: 5, contact: 'Dr. KHAMIS Abdoulaye', phone: '+235 66 00 11 22' },
  { id: 'pt2', name: 'Orange Tchad', sector: 'Telecom', hostedStudents: 8, capacity: 12, rating: 4, contact: 'M. DJIMARTINOUBA Robert', phone: '+235 66 33 44 55' },
  { id: 'pt3', name: 'Banque Sahelo-Saharienne', sector: 'Finance', hostedStudents: 6, capacity: 10, rating: 4, contact: 'Mme. NASSERINGAR Fatime', phone: '+235 66 55 66 77' },
  { id: 'pt4', name: 'UNICEF Tchad', sector: 'ONG', hostedStudents: 12, capacity: 15, rating: 5, contact: 'M. BICHARA Nathanael', phone: '+235 66 77 88 99' },
  { id: 'pt5', name: 'Total Energies Tchad', sector: 'Energie', hostedStudents: 5, capacity: 8, rating: 4, contact: 'M. SEID Mahamat', phone: '+235 66 99 00 11' },
  { id: 'pt6', name: 'Ministere de la Sante', sector: 'Public', hostedStudents: 18, capacity: 25, rating: 3, contact: 'Dr. HISSEIN Adam', phone: '+235 66 11 22 33' },
]

interface TimelineStep {
  label: string
  date: string
  status: 'completed' | 'current' | 'upcoming'
}

const demoTimeline: TimelineStep[] = [
  { label: 'Convention signee', date: '10/01/2025', status: 'completed' },
  { label: 'Debut de stage', date: '15/01/2025', status: 'completed' },
  { label: 'Visite de terrain', date: '15/03/2025', status: 'current' },
  { label: 'Rapport remis', date: '15/06/2025', status: 'upcoming' },
  { label: 'Soutenance', date: '30/06/2025', status: 'upcoming' },
  { label: 'Validation', date: '15/07/2025', status: 'upcoming' },
]

interface EvaluationResult {
  id: string
  studentName: string
  grade: 'Excellent' | 'Tres bien' | 'Bien' | 'Assez bien' | 'Insuffisant'
  date: string
}

const demoEvaluations: EvaluationResult[] = [
  { id: 'e1', studentName: 'KHAMIS Fatime', grade: 'Excellent', date: '15/07/2024' },
  { id: 'e2', studentName: 'ABAKAR Adam', grade: 'Tres bien', date: '12/07/2024' },
  { id: 'e3', studentName: 'ISSA Mahamat Nour', grade: 'Bien', date: '18/07/2024' },
  { id: 'e4', studentName: 'NASSERINGAR Lea', grade: 'Tres bien', date: '20/07/2024' },
  { id: 'e5', studentName: 'OUMAR Abdoulaye', grade: 'Assez bien', date: '10/07/2024' },
  { id: 'e6', studentName: 'HISSEIN Mariam', grade: 'Excellent', date: '22/07/2024' },
]

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
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('tous')
  const [statusFilter, setStatusFilter] = useState('tous')
  const [periodFilter, setPeriodFilter] = useState('tous')
  const [entrepriseFilter, setEntrepriseFilter] = useState('tous')

  // Convention validation state
  const [conventionStatuses, setConventionStatuses] = useState<Record<string, 'pending' | 'approved' | 'rejected'>>({})

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

  // Count-up hooks for header stats
  const countStagesActifs = useCountUp(87, 1400)
  const countTauxCompletion = useCountUp(92, 1300)

  // Filter internships
  const filteredInternships = demoInternships.filter(i => {
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

  const uniqueEntreprises = [...new Set(demoInternships.map(i => i.entreprise))]

  const handleValidateConvention = (id: string, action: 'approved' | 'rejected') => {
    setConventionStatuses(prev => ({ ...prev, [id]: action }))
  }

  const handleRatingChange = (criterion: string, value: number) => {
    setRatings(prev => ({ ...prev, [criterion]: value }))
  }

  const handleSubmitEvaluation = () => {
    setEvaluationSubmitted(true)
    setTimeout(() => setEvaluationSubmitted(false), 3000)
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
                <Button size="sm" className="bg-white/10 backdrop-blur border border-white/15 text-white hover:bg-white/20 text-xs">
                  <Plus className="size-3.5 mr-1.5" />
                  Nouveau stage
                </Button>
                <Button size="sm" className="bg-white/10 backdrop-blur border border-white/15 text-white hover:bg-white/20 text-xs">
                  <FileCheck className="size-3.5 mr-1.5" />
                  Valider convention
                </Button>
                <Button size="sm" className="bg-white/10 backdrop-blur border border-white/15 text-white hover:bg-white/20 text-xs">
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
                    <p className="text-2xl font-bold text-[#2d7a4f] mt-1">87</p>
                    <p className="text-xs text-[#2d7a4f] mt-1 flex items-center gap-1">
                      <TrendingUp className="size-3" />
                      +12% vs semestre dernier
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#2d7a4f15] flex items-center justify-center">
                    <Briefcase className="size-5 text-[#2d7a4f]" />
                  </div>
                </div>
                <div className="mt-3">
                  <Progress value={72} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#2d7a4f]" />
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
                    <p className="text-2xl font-bold text-[#1a2744] mt-1">14</p>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Clock className="size-3" />
                      5 a valider cette semaine
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#1a274415] flex items-center justify-center">
                    <FileCheck className="size-5 text-[#1a2744]" />
                  </div>
                </div>
                <div className="mt-3">
                  <Progress value={36} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#1a2744]" />
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
                    <p className="text-2xl font-bold text-[#d4a853] mt-1">92%</p>
                    <p className="text-xs text-[#2d7a4f] mt-1 flex items-center gap-1">
                      <TrendingUp className="size-3" />
                      +3% vs annee derniere
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#d4a85315] flex items-center justify-center">
                    <CheckCircle2 className="size-5 text-[#d4a853]" />
                  </div>
                </div>
                <div className="mt-3">
                  <Progress value={92} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#d4a853]" />
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
                    <p className="text-2xl font-bold text-[#2d7a4f] mt-1">156</p>
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Award className="size-3" />
                      Annee universitaire 2024-2025
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#2d7a4f15] flex items-center justify-center">
                    <Award className="size-5 text-[#2d7a4f]" />
                  </div>
                </div>
                <div className="mt-3">
                  <Progress value={85} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#2d7a4f]" />
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
                      {filteredInternships.length === 0 && (
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
                  {demoPendingConventions.length} en attente
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
                {demoPendingConventions.map((conv) => {
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
                                onClick={() => handleValidateConvention(conv.id, 'approved')}
                              >
                                <CheckCircle2 className="size-3 mr-1" />
                                Valider
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-[#c62828] border-[#c6282830] hover:bg-[#c6282810] text-xs h-7"
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
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#1a2744]">ABAKAR Adam Hassane</p>
                      <p className="text-[10px] text-gray-400">UDN/M2/2024/005 - Stage a UNICEF Tchad</p>
                    </div>
                    <Badge className="bg-[#2d7a4f15] text-[#2d7a4f] border-0 text-[10px]">En cours</Badge>
                  </div>
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
                >
                  <Send className="size-3.5 mr-1.5" />
                  {evaluationSubmitted ? 'Evaluation soumise !' : "Soumettre l'evaluation"}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {demoEvaluations.map((evalItem) => {
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {demoPartners.map((partner) => {
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
                <Badge className="bg-[#2d7a4f15] text-[#2d7a4f] border-0 text-[10px]">
                  ABAKAR Adam Hassane - UNICEF Tchad
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="relative pl-8">
                {/* Vertical connecting line */}
                <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200" />

                <div className="space-y-6">
                  {demoTimeline.map((step, index) => (
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
                      {index < demoTimeline.length - 1 && step.status === 'completed' && (
                        <div className="absolute -left-[13px] top-[28px] w-0.5 h-[calc(100%-4px)] bg-[#2d7a4f]" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
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
    </TooltipProvider>
  )
}
