'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  FileText,
  Award,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Search,
  Plus,
  Pencil,
  Trash2,
  Download,
  Printer,
  Eye,
  BarChart3,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  Shield,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  CircleDot,
  Target,
  Trophy,
  Star,
} from 'lucide-react'

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

// ─── Types ──────────────────────────────────────────────────────────────────────

type Mention = 'Passable' | 'Assez-Bien' | 'Bien' | 'Tres-Bien' | 'Excellent'
type Decision = 'Admis' | 'Compense' | 'Ajourne' | 'Exclu'
interface StudentResult {
  id: string
  name: string
  matricule: string
  moyenne: number
  mention: Mention
  credits: number
  decision: Decision
}

interface UEGrade {
  code: string
  name: string
  credit: number
  note: number
}

interface TranscriptStudent {
  id: string
  name: string
  matricule: string
  dateNaissance: string
  lieuNaissance: string
  filiere: string
  niveau: string
  semester: string
  ueGrades: UEGrade[]
  moyenne: number
  mention: Mention
  totalCredits: number
}

interface AtRiskStudent {
  id: string
  name: string
  matricule: string
  moyenne: number
  creditDebt: number
  risk: 'critical' | 'warning'
}

// ─── Config Maps ────────────────────────────────────────────────────────────────

const mentionConfig: Record<Mention, { color: string; bgClass: string }> = {
  'Passable': { color: '#6b7280', bgClass: 'bg-gray-100 text-gray-700 border-0' },
  'Assez-Bien': { color: '#1a2744', bgClass: 'bg-[#1a274410] text-[#1a2744] border-0' },
  'Bien': { color: '#2d7a4f', bgClass: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' },
  'Tres-Bien': { color: '#d4a853', bgClass: 'bg-[#d4a85315] text-[#d4a853] border-0' },
  'Excellent': { color: '#c62828', bgClass: 'bg-[#c6282810] text-[#c62828] border-0' },
}

const decisionConfig: Record<Decision, { color: string; className: string; icon: React.ElementType }> = {
  'Admis': { color: '#2d7a4f', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0', icon: CheckCircle2 },
  'Compense': { color: '#d4a853', className: 'bg-[#d4a85315] text-[#d4a853] border-0', icon: CircleDot },
  'Ajourne': { color: '#c62828', className: 'bg-[#c6282815] text-[#c62828] border-0', icon: XCircle },
  'Exclu': { color: '#4a0000', className: 'bg-[#4a000010] text-[#4a0000] border-0', icon: AlertTriangle },
}

// ─── Demo Data ──────────────────────────────────────────────────────────────────

const demoStudentResults: StudentResult[] = [
  { id: '1', name: 'MAHAMAT Ali', matricule: 'UDN-2021-0234', moyenne: 16.5, mention: 'Tres-Bien', credits: 30, decision: 'Admis' },
  { id: '2', name: 'KHAMIS Fatime', matricule: 'UDN-2021-0235', moyenne: 14.2, mention: 'Bien', credits: 30, decision: 'Admis' },
  { id: '3', name: 'ABDALLAH Fadoul', matricule: 'UDN-2021-0236', moyenne: 12.8, mention: 'Assez-Bien', credits: 30, decision: 'Admis' },
  { id: '4', name: 'ISSA Mahamat', matricule: 'UDN-2021-0237', moyenne: 11.3, mention: 'Assez-Bien', credits: 28, decision: 'Compense' },
  { id: '5', name: 'AHMAT Achta', matricule: 'UDN-2021-0238', moyenne: 18.1, mention: 'Excellent', credits: 30, decision: 'Admis' },
  { id: '6', name: 'BACHAR Oumar', matricule: 'UDN-2021-0239', moyenne: 10.5, mention: 'Passable', credits: 26, decision: 'Compense' },
  { id: '7', name: 'HAROUN Meriam', matricule: 'UDN-2021-0240', moyenne: 15.7, mention: 'Bien', credits: 30, decision: 'Admis' },
  { id: '8', name: 'DJIMADOUM Adoum', matricule: 'UDN-2021-0241', moyenne: 9.2, mention: 'Passable', credits: 18, decision: 'Ajourne' },
  { id: '9', name: 'NGARLEITA Nathalie', matricule: 'UDN-2021-0242', moyenne: 13.4, mention: 'Assez-Bien', credits: 30, decision: 'Admis' },
  { id: '10', name: 'MOUSSA Khadija', matricule: 'UDN-2021-0243', moyenne: 7.8, mention: 'Passable', credits: 12, decision: 'Ajourne' },
  { id: '11', name: 'HASSAN Djibril', matricule: 'UDN-2021-0244', moyenne: 11.9, mention: 'Assez-Bien', credits: 28, decision: 'Compense' },
  { id: '12', name: 'ADAM Zakaria', matricule: 'UDN-2021-0245', moyenne: 17.3, mention: 'Tres-Bien', credits: 30, decision: 'Admis' },
  { id: '13', name: 'BICHARA Hawa', matricule: 'UDN-2021-0246', moyenne: 6.4, mention: 'Passable', credits: 8, decision: 'Exclu' },
  { id: '14', name: 'OUMAR Ibrahim', matricule: 'UDN-2021-0247', moyenne: 12.1, mention: 'Assez-Bien', credits: 30, decision: 'Admis' },
  { id: '15', name: 'FATIME Zenab', matricule: 'UDN-2021-0248', moyenne: 14.8, mention: 'Bien', credits: 30, decision: 'Admis' },
  { id: '16', name: 'TOLLI Hamid', matricule: 'UDN-2021-0249', moyenne: 10.1, mention: 'Passable', credits: 24, decision: 'Compense' },
  { id: '17', name: 'NDJIKOUMBA Armel', matricule: 'UDN-2021-0250', moyenne: 15.2, mention: 'Bien', credits: 30, decision: 'Admis' },
]

const demoTranscript: TranscriptStudent = {
  id: '1',
  name: 'MAHAMAT Ali',
  matricule: 'UDN-2021-0234',
  dateNaissance: '15/03/2002',
  lieuNaissance: 'N\'Djamena, Tchad',
  filiere: 'Informatique',
  niveau: 'Licence 3',
  semester: 'Semestre 1 - 2024-2025',
  ueGrades: [
    { code: 'UE301', name: 'Programmation avancee', credit: 6, note: 17 },
    { code: 'UE302', name: 'Bases de donnees II', credit: 5, note: 15 },
    { code: 'UE303', name: 'Reseaux informatiques', credit: 5, note: 16 },
    { code: 'UE304', name: 'Intelligence artificielle', credit: 6, note: 18 },
    { code: 'UE305', name: 'Genie logiciel', credit: 4, note: 14 },
    { code: 'UE306', name: 'Anglais technique', credit: 4, note: 16 },
  ],
  moyenne: 16.5,
  mention: 'Tres-Bien',
  totalCredits: 30,
}

const demoAtRiskStudents: AtRiskStudent[] = [
  { id: '8', name: 'DJIMADOUM Adoum', matricule: 'UDN-2021-0241', moyenne: 9.2, creditDebt: 12, risk: 'critical' },
  { id: '10', name: 'MOUSSA Khadija', matricule: 'UDN-2021-0243', moyenne: 7.8, creditDebt: 18, risk: 'critical' },
  { id: '13', name: 'BICHARA Hawa', matricule: 'UDN-2021-0246', moyenne: 6.4, creditDebt: 22, risk: 'critical' },
  { id: '6', name: 'BACHAR Oumar', matricule: 'UDN-2021-0239', moyenne: 10.5, creditDebt: 4, risk: 'warning' },
  { id: '11', name: 'HASSAN Djibril', matricule: 'UDN-2021-0244', moyenne: 11.9, creditDebt: 2, risk: 'warning' },
  { id: '16', name: 'TOLLI Hamid', matricule: 'UDN-2021-0249', moyenne: 10.1, creditDebt: 6, risk: 'warning' },
]

const semesterGPA: { semester: string; gpa: number }[] = [
  { semester: 'S1 L1', gpa: 11.2 },
  { semester: 'S2 L1', gpa: 11.8 },
  { semester: 'S1 L2', gpa: 12.5 },
  { semester: 'S2 L2', gpa: 13.1 },
  { semester: 'S1 L3', gpa: 14.0 },
  { semester: 'S2 L3', gpa: 14.6 },
]

const distributionRanges = [
  { range: '0-8', count: 3, color: '#c62828' },
  { range: '8-10', count: 4, color: '#d4a853' },
  { range: '10-12', count: 5, color: '#6b7280' },
  { range: '12-14', count: 8, color: '#1a2744' },
  { range: '14-16', count: 6, color: '#2d7a4f' },
  { range: '16-20', count: 4, color: '#d4a853' },
]

const mentionDistribution = [
  { mention: 'Passable', count: 5, percent: 15, color: '#6b7280' },
  { mention: 'Assez-Bien', count: 6, percent: 18, color: '#1a2744' },
  { mention: 'Bien', count: 8, percent: 24, color: '#2d7a4f' },
  { mention: 'Tres-Bien', count: 5, percent: 15, color: '#d4a853' },
  { mention: 'Excellent', count: 2, percent: 6, color: '#c62828' },
]

const yearComparison = [
  { year: '2021-2022', admis: 245, compenses: 42, ajournes: 68, tauxReussite: 68 },
  { year: '2022-2023', admis: 268, compenses: 38, ajournes: 55, tauxReussite: 73 },
  { year: '2023-2024', admis: 289, compenses: 35, ajournes: 48, tauxReussite: 77 },
  { year: '2024-2025', admis: 298, compenses: 32, ajournes: 42, tauxReussite: 80 },
]

const facultySuccess = [
  { name: 'Sciences', rate: 82, students: 520, color: '#2d7a4f' },
  { name: 'Droit', rate: 71, students: 480, color: '#1a2744' },
  { name: 'Lettres', rate: 75, students: 350, color: '#d4a853' },
  { name: 'Economie', rate: 78, students: 410, color: '#2d7a4f' },
  { name: 'Medecine', rate: 88, students: 290, color: '#1a2744' },
]

// ─── Animated Stat Component ────────────────────────────────────────────────────

function AnimatedStat({ value, label, icon: Icon, suffix = '' }: { value: number; label: string; icon: React.ElementType; suffix?: string }) {
  const count = useCountUp(value, 1400)
  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-3 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-white/10">
        <Icon className="size-5 text-white" />
      </div>
      <div>
        <p className="text-xl font-bold text-white">{count}{suffix}</p>
        <p className="text-[10px] text-white/70">{label}</p>
      </div>
    </div>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────────

export function ResultsPage() {
  const [activeTab, setActiveTab] = useState('session-results')
  const [selectedSession, setSelectedSession] = useState('S1-2024-2025')
  const [selectedLevel, setSelectedLevel] = useState('all')
  const [selectedFiliere, setSelectedFiliere] = useState('all')
  const [searchStudent, setSearchStudent] = useState('')
  const [searchTranscript, setSearchTranscript] = useState('')
  const [searchProgression, setSearchProgression] = useState('')
  const [isPublished, setIsPublished] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newResultSession, setNewResultSession] = useState('')
  const [newResultStudent, setNewResultStudent] = useState('')
  const [ue1Note, setUe1Note] = useState('')
  const [ue2Note, setUe2Note] = useState('')
  const [ue3Note, setUe3Note] = useState('')
  const [ue4Note, setUe4Note] = useState('')
  const [ue5Note, setUe5Note] = useState('')
  const [ue6Note, setUe6Note] = useState('')

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
  } as const

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  } as const

  // Compute auto moyenne for new result dialog
  const newResultMoyenne = useMemo(() => {
    const notes = [ue1Note, ue2Note, ue3Note, ue4Note, ue5Note, ue6Note]
      .map(n => parseFloat(n))
      .filter(n => !isNaN(n))
    if (notes.length === 0) return 0
    return Math.round((notes.reduce((a, b) => a + b, 0) / notes.length) * 100) / 100
  }, [ue1Note, ue2Note, ue3Note, ue4Note, ue5Note, ue6Note])

  // Compute credits validated for new result
  const newResultCredits = useMemo(() => {
    const notes = [ue1Note, ue2Note, ue3Note, ue4Note, ue5Note, ue6Note]
      .map(n => parseFloat(n))
      .filter(n => !isNaN(n) && n >= 10)
    const credits = [6, 5, 5, 6, 4, 4]
    let total = 0
    notes.forEach((_, i) => {
      total += credits[i] || 0
    })
    return total
  }, [ue1Note, ue2Note, ue3Note, ue4Note, ue5Note, ue6Note])

  // Filtered results
  const filteredResults = useMemo(() => {
    return demoStudentResults.filter(r => {
      const matchSearch = searchStudent === '' ||
        r.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
        r.matricule.toLowerCase().includes(searchStudent.toLowerCase())
      return matchSearch
    })
  }, [searchStudent])

  // Session stats
  const sessionStats = useMemo(() => {
    const admis = demoStudentResults.filter(r => r.decision === 'Admis').length
    const ajournes = demoStudentResults.filter(r => r.decision === 'Ajourne').length
    const compenses = demoStudentResults.filter(r => r.decision === 'Compense').length
    const totalMoyenne = demoStudentResults.reduce((sum, r) => sum + r.moyenne, 0) / demoStudentResults.length
    return { admis, ajournes, compenses, moyenneGenerale: totalMoyenne.toFixed(1) }
  }, [])

  // Stats for header
  const sessionsValidees = useCountUp(12, 1200)
  const resultatsPublies = useCountUp(287, 1400)
  const tauxReussiteGlobal = useCountUp(80, 1300)
  const mentionsTresBien = useCountUp(23, 1100)

  return (
    <TooltipProvider>
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
              <pattern id="results-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <rect x="0" y="0" width="40" height="40" fill="none" stroke="white" strokeWidth="0.5" />
                <circle cx="20" cy="20" r="3" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#results-pattern)" />
          </svg>
          <div className="relative z-10 px-6 py-8">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white">Gestion des Resultats Academiques</h1>
                <p className="text-sm text-white/70 mt-1">Publication, releves et suivi de la progression des etudiants</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <AnimatedStat value={12} label="Sessions validees" icon={Calendar} />
                <AnimatedStat value={287} label="Resultats publies" icon={FileText} />
                <AnimatedStat value={80} label="Taux reussite %" icon={TrendingUp} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─── 4 Stats Cards ────────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Sessions validees', value: sessionsValidees, color: '#1a2744', icon: Calendar, trend: '+2', trendUp: true },
            { label: 'Resultats publies', value: resultatsPublies, color: '#2d7a4f', icon: FileText, trend: '+28', trendUp: true },
            { label: 'Taux de reussite global', value: tauxReussiteGlobal, color: '#d4a853', icon: TrendingUp, trend: '+3%', trendUp: true, suffix: '%' },
            { label: 'Mentions Tres Bien', value: mentionsTresBien, color: '#2d7a4f', icon: Trophy, trend: '+5', trendUp: true },
          ].map((stat) => (
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
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.label}</p>
                      <p className="text-2xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}{stat.suffix || ''}</p>
                      {stat.trend && (
                        <div className="flex items-center gap-1 mt-1">
                          {stat.trendUp ? (
                            <TrendingUp className="size-3 text-[#2d7a4f]" />
                          ) : (
                            <TrendingDown className="size-3 text-[#2d7a4f]" />
                          )}
                          <span className="text-xs text-[#2d7a4f] font-medium">{stat.trend}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${stat.color}15` }}>
                      <stat.icon className="size-5" style={{ color: stat.color }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* ─── Tab Navigation ───────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 bg-gray-100 h-auto p-1">
              <TabsTrigger value="session-results" className="text-xs data-[state=active]:bg-[#1a2744] data-[state=active]:text-white">
                <BookOpen className="size-3.5 mr-1.5" />
                Resultats par Session
              </TabsTrigger>
              <TabsTrigger value="transcripts" className="text-xs data-[state=active]:bg-[#1a2744] data-[state=active]:text-white">
                <FileText className="size-3.5 mr-1.5" />
                Releves de Notes
              </TabsTrigger>
              <TabsTrigger value="progression" className="text-xs data-[state=active]:bg-[#1a2744] data-[state=active]:text-white">
                <TrendingUp className="size-3.5 mr-1.5" />
                Progression Academique
              </TabsTrigger>
              <TabsTrigger value="statistics" className="text-xs data-[state=active]:bg-[#1a2744] data-[state=active]:text-white">
                <BarChart3 className="size-3.5 mr-1.5" />
                Statistiques
              </TabsTrigger>
            </TabsList>

            {/* ─── Tab 1: Resultats par Session ──────────────────────────────────── */}
            <TabsContent value="session-results" className="mt-4 space-y-4">
              {/* Filters */}
              <Card className="border-l-4 border-l-[#1a2744]">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <Search className="size-4 text-gray-400 shrink-0" />
                      <Input
                        placeholder="Rechercher par nom ou matricule..."
                        className="h-9 text-sm"
                        value={searchStudent}
                        onChange={(e) => setSearchStudent(e.target.value)}
                      />
                    </div>
                    <Select value={selectedSession} onValueChange={setSelectedSession}>
                      <SelectTrigger className="w-[180px] h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="S1-2024-2025">S1 2024-2025</SelectItem>
                        <SelectItem value="S2-2024-2025">S2 2024-2025</SelectItem>
                        <SelectItem value="S1-2023-2024">S1 2023-2024</SelectItem>
                        <SelectItem value="S2-2023-2024">S2 2023-2024</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                      <SelectTrigger className="w-[140px] h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous niveaux</SelectItem>
                        <SelectItem value="L1">Licence 1</SelectItem>
                        <SelectItem value="L2">Licence 2</SelectItem>
                        <SelectItem value="L3">Licence 3</SelectItem>
                        <SelectItem value="M1">Master 1</SelectItem>
                        <SelectItem value="M2">Master 2</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={selectedFiliere} onValueChange={setSelectedFiliere}>
                      <SelectTrigger className="w-[160px] h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes filieres</SelectItem>
                        <SelectItem value="info">Informatique</SelectItem>
                        <SelectItem value="droit">Droit</SelectItem>
                        <SelectItem value="eco">Economie</SelectItem>
                        <SelectItem value="lettres">Lettres</SelectItem>
                        <SelectItem value="medecine">Medecine</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">Publier</span>
                      <button
                        onClick={() => setIsPublished(!isPublished)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isPublished ? 'bg-[#2d7a4f]' : 'bg-gray-300'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isPublished ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs">
                          <Plus className="size-3.5 mr-1.5" />
                          Nouveau resultat
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>

              {/* Results Table */}
              <Card>
                <CardContent className="p-0">
                  <ScrollArea className="max-h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Nom</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Matricule</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-center">Moyenne</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Mention</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-center">Credits</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Decision</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredResults.map((student, index) => {
                          const mConfig = mentionConfig[student.mention]
                          const dConfig = decisionConfig[student.decision]
                          const DecisionIcon = dConfig.icon
                          return (
                            <motion.tr
                              key={student.id}
                              className={`border-b border-gray-50 hover:bg-gradient-to-r hover:from-[#2d7a4f04] hover:to-transparent transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                              initial={{ opacity: 0, x: -12 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.04, duration: 0.3 }}
                            >
                              <TableCell className="py-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-[#1a274410] flex items-center justify-center text-[10px] font-bold text-[#1a2744]">
                                    {student.name.split(' ').map(n => n[0]).join('')}
                                  </div>
                                  <span className="text-sm font-medium text-[#1a2744]">{student.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-2.5 text-xs text-gray-500 font-mono">{student.matricule}</TableCell>
                              <TableCell className="py-2.5 text-center">
                                <span className={`text-sm font-bold ${student.moyenne >= 10 ? 'text-[#2d7a4f]' : student.moyenne >= 8 ? 'text-[#d4a853]' : 'text-[#c62828]'}`}>
                                  {student.moyenne.toFixed(1)}
                                </span>
                              </TableCell>
                              <TableCell className="py-2.5">
                                <Badge className={`text-[10px] ${mConfig.bgClass}`}>
                                  {student.mention}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-2.5 text-center">
                                <span className={`text-xs font-semibold ${student.credits >= 30 ? 'text-[#2d7a4f]' : student.credits >= 20 ? 'text-[#d4a853]' : 'text-[#c62828]'}`}>
                                  {student.credits}/30
                                </span>
                              </TableCell>
                              <TableCell className="py-2.5">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div>
                                      <Badge className={`text-[10px] ${dConfig.className}`}>
                                        <DecisionIcon className="size-2.5 mr-1" />
                                        {student.decision}
                                      </Badge>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{student.decision === 'Admis' ? 'Etudiant admis a la session' : student.decision === 'Compense' ? 'Admis avec compensation entre UEs' : student.decision === 'Ajourne' ? 'Etudiant ajourne, rattrapage necessaire' : 'Exclu du programme'}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                              <TableCell className="py-2.5 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-[#2d7a4f10]">
                                        <Eye className="size-3.5 text-gray-600" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Voir les details</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-[#1a274410]">
                                        <Pencil className="size-3.5 text-gray-600" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Modifier</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-[#c6282810]">
                                        <Trash2 className="size-3.5 text-gray-600" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Supprimer</TooltipContent>
                                  </Tooltip>
                                </div>
                              </TableCell>
                            </motion.tr>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Summary Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                  <Card className="border-l-4 border-l-[#2d7a4f]">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-[#2d7a4f15]">
                        <CheckCircle2 className="size-5 text-[#2d7a4f]" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Admis</p>
                        <p className="text-xl font-bold text-[#2d7a4f]">{sessionStats.admis}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                  <Card className="border-l-4 border-l-[#d4a853]">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-[#d4a85315]">
                        <CircleDot className="size-5 text-[#d4a853]" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Compenses</p>
                        <p className="text-xl font-bold text-[#d4a853]">{sessionStats.compenses}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                  <Card className="border-l-4 border-l-[#c62828]">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-[#c6282810]">
                        <XCircle className="size-5 text-[#c62828]" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Ajournes</p>
                        <p className="text-xl font-bold text-[#c62828]">{sessionStats.ajournes}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                  <Card className="border-l-4 border-l-[#1a2744]">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-[#1a274410]">
                        <BarChart3 className="size-5 text-[#1a2744]" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Moyenne generale</p>
                        <p className="text-xl font-bold text-[#1a2744]">{sessionStats.moyenneGenerale}/20</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </TabsContent>

            {/* ─── Tab 2: Releves de Notes ───────────────────────────────────────── */}
            <TabsContent value="transcripts" className="mt-4 space-y-4">
              {/* Search */}
              <Card className="border-l-4 border-l-[#2d7a4f]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Search className="size-4 text-gray-400 shrink-0" />
                    <Input
                      placeholder="Rechercher par nom ou matricule de l'etudiant..."
                      className="h-9 text-sm flex-1"
                      value={searchTranscript}
                      onChange={(e) => setSearchTranscript(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Transcript Preview */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 text-[#1a2744]" />
                      <CardTitle className="text-sm font-semibold text-[#1a2744]">Releve de Notes</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="text-xs h-8">
                        <Printer className="size-3.5 mr-1.5" />
                        Imprimer
                      </Button>
                      <Button size="sm" className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs h-8">
                        <Download className="size-3.5 mr-1.5" />
                        Generer PDF
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="border-2 border-gray-200 rounded-lg p-5">
                    {/* University Header */}
                    <div className="text-center mb-4">
                      <h3 className="text-sm font-bold text-[#1a2744] uppercase tracking-wide">Universite de N&apos;Djamena</h3>
                      <p className="text-[10px] text-gray-500">BP 1117 N&apos;Djamena, Tchad - www.univ-ndjamena.td</p>
                      <Separator className="my-2 bg-[#1a2744] h-0.5" />
                      <p className="text-xs font-semibold text-[#1a2744]">RELEVE DE NOTES ET DE CREDITS</p>
                    </div>

                    {/* Student Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-gray-500 w-24">Nom complet :</span>
                          <span className="text-xs font-medium text-[#1a2744]">{demoTranscript.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-gray-500 w-24">Matricule :</span>
                          <span className="text-xs font-mono text-[#1a2744]">{demoTranscript.matricule}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-gray-500 w-24">Date naissance :</span>
                          <span className="text-xs text-gray-700">{demoTranscript.dateNaissance}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-gray-500 w-24">Filiere :</span>
                          <span className="text-xs font-medium text-[#1a2744]">{demoTranscript.filiere}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-gray-500 w-24">Niveau :</span>
                          <span className="text-xs text-gray-700">{demoTranscript.niveau}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-gray-500 w-24">Semestre :</span>
                          <span className="text-xs text-gray-700">{demoTranscript.semester}</span>
                        </div>
                      </div>
                    </div>

                    {/* Grades Table */}
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#1a2744] hover:bg-[#1a2744]">
                          <TableHead className="text-[10px] text-white font-semibold">Code</TableHead>
                          <TableHead className="text-[10px] text-white font-semibold">Unite d&apos;enseignement</TableHead>
                          <TableHead className="text-[10px] text-white font-semibold text-center">Credits</TableHead>
                          <TableHead className="text-[10px] text-white font-semibold text-center">Note/20</TableHead>
                          <TableHead className="text-[10px] text-white font-semibold text-center">Validation</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {demoTranscript.ueGrades.map((ue) => (
                          <TableRow key={ue.code} className="hover:bg-gray-50">
                            <TableCell className="py-2 text-xs font-mono text-gray-500">{ue.code}</TableCell>
                            <TableCell className="py-2 text-xs font-medium text-[#1a2744]">{ue.name}</TableCell>
                            <TableCell className="py-2 text-center text-xs font-semibold">{ue.credit}</TableCell>
                            <TableCell className="py-2 text-center">
                              <span className={`text-sm font-bold ${ue.note >= 10 ? 'text-[#2d7a4f]' : 'text-[#c62828]'}`}>
                                {ue.note}
                              </span>
                            </TableCell>
                            <TableCell className="py-2 text-center">
                              {ue.note >= 10 ? (
                                <CheckCircle2 className="size-4 text-[#2d7a4f] inline" />
                              ) : (
                                <XCircle className="size-4 text-[#c62828] inline" />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-gray-50 font-semibold">
                          <TableCell colSpan={2} className="py-2 text-xs text-[#1a2744]">TOTAL</TableCell>
                          <TableCell className="py-2 text-center text-xs">{demoTranscript.totalCredits}</TableCell>
                          <TableCell className="py-2 text-center">
                            <span className="text-sm font-bold text-[#2d7a4f]">{demoTranscript.moyenne}</span>
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      </TableBody>
                    </Table>

                    {/* Mention and QR badge */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500">Mention :</span>
                        <Badge className={`text-xs ${mentionConfig[demoTranscript.mention].bgClass}`}>
                          <Star className="size-3 mr-1" />
                          {demoTranscript.mention}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 bg-[#2d7a4f08] border border-[#2d7a4f20] rounded-lg px-3 py-1.5">
                        <Shield className="size-4 text-[#2d7a4f]" />
                        <div>
                          <p className="text-[9px] font-semibold text-[#2d7a4f] uppercase">Document verifiable</p>
                          <p className="text-[9px] text-gray-500">QR Code: VRF-UDN-2024-S1-0234</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ─── Tab 3: Progression Academique ─────────────────────────────────── */}
            <TabsContent value="progression" className="mt-4 space-y-4">
              {/* Student Search */}
              <Card className="border-l-4 border-l-[#d4a853]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Search className="size-4 text-gray-400 shrink-0" />
                    <Input
                      placeholder="Rechercher un etudiant pour suivre sa progression..."
                      className="h-9 text-sm flex-1"
                      value={searchProgression}
                      onChange={(e) => setSearchProgression(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Progress Tracker */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Student Info & Progress */}
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Target className="size-4 text-[#1a2744]" />
                      <CardTitle className="text-sm font-semibold text-[#1a2744]">Progression vers le diplome</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-4">
                    {/* Student Header */}
                    <div className="flex items-center gap-3 p-3 bg-[#1a274405] rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-[#1a2744] flex items-center justify-center text-sm font-bold text-white">
                        MA
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#1a2744]">MAHAMAT Ali</p>
                        <p className="text-xs text-gray-500">UDN-2021-0234 - Licence 3 Informatique</p>
                      </div>
                    </div>

                    {/* Credits Progress */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-gray-600">Credits accumules</span>
                        <span className="text-xs font-bold text-[#2d7a4f]">150 / 180</span>
                      </div>
                      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-[#1a2744] to-[#2d7a4f]"
                          initial={{ width: 0 }}
                          animate={{ width: '83.3%' }}
                          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">30 credits restants pour obtenir la Licence (systeme LMD)</p>
                    </div>

                    {/* Semesters Completed */}
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-2">Semestres completes</p>
                      <div className="flex items-center gap-1.5">
                        {['S1 L1', 'S2 L1', 'S1 L2', 'S2 L2', 'S1 L3', 'S2 L3'].map((sem, i) => (
                          <div key={sem} className="flex-1 text-center">
                            <motion.div
                              className={`h-8 rounded-md flex items-center justify-center text-[9px] font-bold ${i < 5 ? 'bg-[#2d7a4f15] text-[#2d7a4f]' : 'bg-gray-100 text-gray-400'}`}
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: 0.1 * i, duration: 0.3 }}
                            >
                              {i < 5 ? <CheckCircle2 className="size-3.5" /> : <CircleDot className="size-3.5" />}
                            </motion.div>
                            <p className="text-[8px] text-gray-500 mt-0.5">{sem}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Semester GPA Chart */}
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-2">Moyenne par semestre</p>
                      <div className="flex items-end gap-2 h-32">
                        {semesterGPA.map((item, i) => (
                          <div key={item.semester} className="flex-1 flex flex-col items-center">
                            <span className="text-[9px] font-bold text-[#1a2744] mb-1">{item.gpa}</span>
                            <motion.div
                              className="w-full rounded-t-md bg-gradient-to-t from-[#1a2744] to-[#2d7a4f]"
                              initial={{ height: 0 }}
                              animate={{ height: `${(item.gpa / 20) * 100}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.15 * i }}
                            />
                            <p className="text-[8px] text-gray-500 mt-1">{item.semester}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* At Risk Students */}
                <Card className="border-l-4 border-l-[#c62828]">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="size-4 text-[#c62828]" />
                      <CardTitle className="text-sm font-semibold text-[#c62828]">Etudiants en difficulte</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <ScrollArea className="max-h-80">
                      <div className="space-y-2.5">
                        {demoAtRiskStudents.map((student) => (
                          <motion.div
                            key={student.id}
                            className={`p-3 rounded-lg border ${student.risk === 'critical' ? 'bg-[#c6282808] border-[#c6282820]' : 'bg-[#d4a85308] border-[#d4a85320]'}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-xs font-semibold text-[#1a2744]">{student.name}</p>
                                <p className="text-[10px] text-gray-500 font-mono">{student.matricule}</p>
                              </div>
                              <Badge className={`text-[9px] border-0 ${student.risk === 'critical' ? 'bg-[#c6282815] text-[#c62828]' : 'bg-[#d4a85315] text-[#d4a853]'}`}>
                                {student.risk === 'critical' ? 'Critique' : 'Attention'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="text-[10px] text-gray-500">Moy: <span className={`font-bold ${student.moyenne < 10 ? 'text-[#c62828]' : 'text-[#d4a853]'}`}>{student.moyenne}</span></span>
                              <span className="text-[10px] text-gray-500">Dette: <span className="font-bold text-[#c62828]">{student.creditDebt} credits</span></span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ─── Tab 4: Statistiques des Resultats ──────────────────────────────── */}
            <TabsContent value="statistics" className="mt-4 space-y-4">
              {/* Distribution Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Moyenne Distribution */}
                <Card className="border-l-4 border-l-[#1a2744]">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="size-4 text-[#1a2744]" />
                      <CardTitle className="text-sm font-semibold text-[#1a2744]">Distribution des moyennes</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="space-y-2.5">
                      {distributionRanges.map((item, i) => {
                        const maxCount = Math.max(...distributionRanges.map(d => d.count))
                        return (
                          <div key={item.range} className="flex items-center gap-3">
                            <span className="text-xs font-medium text-gray-600 w-10 text-right">{item.range}</span>
                            <div className="flex-1 h-6 bg-gray-50 rounded overflow-hidden relative">
                              <motion.div
                                className="h-full rounded"
                                style={{ backgroundColor: item.color }}
                                initial={{ width: 0 }}
                                animate={{ width: `${(item.count / maxCount) * 100}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 * i }}
                              />
                            </div>
                            <span className="text-xs font-bold text-gray-700 w-6">{item.count}</span>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Mention Distribution */}
                <Card className="border-l-4 border-l-[#d4a853]">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Award className="size-4 text-[#d4a853]" />
                      <CardTitle className="text-sm font-semibold text-[#1a2744]">Repartition par mention</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="space-y-3">
                      {mentionDistribution.map((item, i) => (
                        <div key={item.mention}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-600">{item.mention}</span>
                            <span className="text-xs font-bold" style={{ color: item.color }}>{item.count} ({item.percent}%)</span>
                          </div>
                          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: item.color }}
                              initial={{ width: 0 }}
                              animate={{ width: `${item.percent}%` }}
                              transition={{ duration: 0.9, ease: 'easeOut', delay: 0.12 * i }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Year-over-Year Comparison Table */}
              <Card className="border-l-4 border-l-[#2d7a4f]">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-[#2d7a4f]" />
                    <CardTitle className="text-sm font-semibold text-[#1a2744]">Comparaison annuelle</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 hover:bg-gray-50">
                        <TableHead className="text-[10px] font-semibold uppercase">Annee</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase text-center">Admis</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase text-center">Compenses</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase text-center">Ajournes</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase text-center">Taux reussite</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase text-center">Tendance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {yearComparison.map((year) => (
                        <TableRow key={year.year} className="hover:bg-gray-50">
                          <TableCell className="py-2.5 text-xs font-semibold text-[#1a2744]">{year.year}</TableCell>
                          <TableCell className="py-2.5 text-center text-xs text-[#2d7a4f] font-semibold">{year.admis}</TableCell>
                          <TableCell className="py-2.5 text-center text-xs text-[#d4a853] font-semibold">{year.compenses}</TableCell>
                          <TableCell className="py-2.5 text-center text-xs text-[#c62828] font-semibold">{year.ajournes}</TableCell>
                          <TableCell className="py-2.5 text-center">
                            <span className="text-xs font-bold text-[#2d7a4f]">{year.tauxReussite}%</span>
                          </TableCell>
                          <TableCell className="py-2.5 text-center">
                            {year.tauxReussite >= 75 ? (
                              <ArrowUpRight className="size-4 text-[#2d7a4f] inline" />
                            ) : (
                              <ArrowDownRight className="size-4 text-[#c62828] inline" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Faculty Success + Gender Comparison */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Faculty Success Rate */}
                <Card className="border-l-4 border-l-[#1a2744]">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="size-4 text-[#1a2744]" />
                      <CardTitle className="text-sm font-semibold text-[#1a2744]">Taux de reussite par faculte</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-3">
                    {facultySuccess.map((fac, i) => (
                      <div key={fac.name}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-600">{fac.name}</span>
                            <span className="text-[10px] text-gray-400">({fac.students} etud.)</span>
                          </div>
                          <span className="text-xs font-bold" style={{ color: fac.color }}>{fac.rate}%</span>
                        </div>
                        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: fac.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${fac.rate}%` }}
                            transition={{ duration: 0.9, ease: 'easeOut', delay: 0.12 * i }}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Gender Comparison */}
                <Card className="border-l-4 border-l-[#d4a853]">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-[#d4a853]" />
                      <CardTitle className="text-sm font-semibold text-[#1a2744]">Comparaison par genre</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Homme */}
                      <div className="text-center p-4 bg-[#1a274408] rounded-xl">
                        <div className="w-12 h-12 rounded-full bg-[#1a274410] flex items-center justify-center mx-auto mb-2">
                          <Users className="size-5 text-[#1a2744]" />
                        </div>
                        <p className="text-xs font-semibold text-gray-600 mb-1">Hommes</p>
                        <p className="text-2xl font-bold text-[#1a2744]">78%</p>
                        <p className="text-[10px] text-gray-500 mt-1">Taux de reussite</p>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
                          <motion.div
                            className="h-full rounded-full bg-[#1a2744]"
                            initial={{ width: 0 }}
                            animate={{ width: '78%' }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                      {/* Femme */}
                      <div className="text-center p-4 bg-[#2d7a4f08] rounded-xl">
                        <div className="w-12 h-12 rounded-full bg-[#2d7a4f10] flex items-center justify-center mx-auto mb-2">
                          <Users className="size-5 text-[#2d7a4f]" />
                        </div>
                        <p className="text-xs font-semibold text-gray-600 mb-1">Femmes</p>
                        <p className="text-2xl font-bold text-[#2d7a4f]">83%</p>
                        <p className="text-[10px] text-gray-500 mt-1">Taux de reussite</p>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
                          <motion.div
                            className="h-full rounded-full bg-[#2d7a4f]"
                            initial={{ width: 0 }}
                            animate={{ width: '83%' }}
                            transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                          />
                        </div>
                      </div>
                    </div>
                    <Separator className="my-3" />
                    <div className="text-center">
                      <p className="text-[10px] text-gray-500">
                        Les femmes presentent un taux de reussite superieur de <span className="font-bold text-[#2d7a4f]">+5 points</span> par rapport aux hommes
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* ─── New Result Dialog ────────────────────────────────────────────────── */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[#1a2744] flex items-center gap-2">
                <Plus className="size-5" />
                Nouveau resultat
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Session</Label>
                  <Select value={newResultSession} onValueChange={setNewResultSession}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Choisir une session" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="S1-2024-2025">S1 2024-2025</SelectItem>
                      <SelectItem value="S2-2024-2025">S2 2024-2025</SelectItem>
                      <SelectItem value="S1-2023-2024">S1 2023-2024</SelectItem>
                      <SelectItem value="S2-2023-2024">S2 2023-2024</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Etudiant</Label>
                  <Select value={newResultStudent} onValueChange={setNewResultStudent}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Choisir un etudiant" />
                    </SelectTrigger>
                    <SelectContent>
                      {demoStudentResults.map(s => (
                        <SelectItem key={s.id} value={s.matricule}>{s.name} ({s.matricule})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />
              <p className="text-xs font-semibold text-gray-600">Notes par UE (sur 20)</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-gray-500">UE301 - Prog. avancee (6 cr.)</Label>
                  <Input type="number" min="0" max="20" step="0.5" placeholder="0" className="h-9 text-sm" value={ue1Note} onChange={(e) => setUe1Note(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-gray-500">UE302 - BDD II (5 cr.)</Label>
                  <Input type="number" min="0" max="20" step="0.5" placeholder="0" className="h-9 text-sm" value={ue2Note} onChange={(e) => setUe2Note(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-gray-500">UE303 - Reseaux (5 cr.)</Label>
                  <Input type="number" min="0" max="20" step="0.5" placeholder="0" className="h-9 text-sm" value={ue3Note} onChange={(e) => setUe3Note(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-gray-500">UE304 - IA (6 cr.)</Label>
                  <Input type="number" min="0" max="20" step="0.5" placeholder="0" className="h-9 text-sm" value={ue4Note} onChange={(e) => setUe4Note(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-gray-500">UE305 - Genie log. (4 cr.)</Label>
                  <Input type="number" min="0" max="20" step="0.5" placeholder="0" className="h-9 text-sm" value={ue5Note} onChange={(e) => setUe5Note(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-gray-500">UE306 - Anglais tech. (4 cr.)</Label>
                  <Input type="number" min="0" max="20" step="0.5" placeholder="0" className="h-9 text-sm" value={ue6Note} onChange={(e) => setUe6Note(e.target.value)} />
                </div>
              </div>

              {/* Auto-calculated moyenne & credits */}
              <div className="p-3 bg-[#1a274405] rounded-lg border border-[#1a274410]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="size-4 text-[#2d7a4f]" />
                    <span className="text-xs font-semibold text-gray-600">Calcul automatique</span>
                  </div>
                </div>
                <div className="flex items-center gap-6 mt-2">
                  <div>
                    <p className="text-[10px] text-gray-500">Moyenne</p>
                    <p className={`text-lg font-bold ${newResultMoyenne >= 10 ? 'text-[#2d7a4f]' : 'text-[#c62828]'}`}>{newResultMoyenne || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500">Credits valides</p>
                    <p className={`text-lg font-bold ${newResultCredits >= 30 ? 'text-[#2d7a4f]' : newResultCredits >= 20 ? 'text-[#d4a853]' : 'text-[#c62828]'}`}>{newResultCredits}/30</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500">Mention</p>
                    <p className="text-sm font-semibold text-[#1a2744]">
                      {newResultMoyenne >= 16 ? 'Tres-Bien' : newResultMoyenne >= 14 ? 'Bien' : newResultMoyenne >= 12 ? 'Assez-Bien' : newResultMoyenne >= 10 ? 'Passable' : '—'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button size="sm" className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs" disabled={!newResultSession || !newResultStudent || newResultMoyenne === 0}>
                  <CheckCircle2 className="size-3.5 mr-1.5" />
                  Enregistrer le resultat
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ─── African Context Card ──────────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-[#2d7a4f]">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Shield className="size-4 text-[#2d7a4f]" />
                <CardTitle className="text-sm font-semibold text-[#1a2744]">Contexte africain et specifications LMD</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* LMD Compliance */}
                <div className="p-3 bg-[#1a274405] rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <GraduationCap className="size-4 text-[#1a2744]" />
                    <p className="text-xs font-semibold text-[#1a2744]">Systeme LMD</p>
                  </div>
                  <ul className="space-y-1">
                    <li className="text-[11px] text-gray-600 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3 text-[#2d7a4f] shrink-0" />
                      Licence : 180 credits (6 semestres)
                    </li>
                    <li className="text-[11px] text-gray-600 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3 text-[#2d7a4f] shrink-0" />
                      Master : 120 credits (4 semestres)
                    </li>
                    <li className="text-[11px] text-gray-600 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3 text-[#2d7a4f] shrink-0" />
                      Doctorat : 360 credits total
                    </li>
                  </ul>
                </div>

                {/* Compensation Rules */}
                <div className="p-3 bg-[#2d7a4f05] rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CircleDot className="size-4 text-[#2d7a4f]" />
                    <p className="text-xs font-semibold text-[#1a2744]">Regles de compensation</p>
                  </div>
                  <ul className="space-y-1">
                    <li className="text-[11px] text-gray-600 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3 text-[#2d7a4f] shrink-0" />
                      Compensation entre UEs du meme semestre
                    </li>
                    <li className="text-[11px] text-gray-600 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3 text-[#2d7a4f] shrink-0" />
                      Note eliminatoire : 6/20 par UE
                    </li>
                    <li className="text-[11px] text-gray-600 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3 text-[#2d7a4f] shrink-0" />
                      Dette max 12 credits pour compensation
                    </li>
                  </ul>
                </div>

                {/* Multi-session Support */}
                <div className="p-3 bg-[#d4a85305] rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="size-4 text-[#d4a853]" />
                    <p className="text-xs font-semibold text-[#1a2744]">Sessions multiples</p>
                  </div>
                  <ul className="space-y-1">
                    <li className="text-[11px] text-gray-600 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3 text-[#2d7a4f] shrink-0" />
                      Session normale (janvier-fevrier)
                    </li>
                    <li className="text-[11px] text-gray-600 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3 text-[#2d7a4f] shrink-0" />
                      Session de rattrapage (mars-avril)
                    </li>
                    <li className="text-[11px] text-gray-600 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3 text-[#2d7a4f] shrink-0" />
                      Conservation de la meilleure note
                    </li>
                  </ul>
                </div>

                {/* Low Connectivity */}
                <div className="p-3 bg-[#1a274405] rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="size-4 text-[#1a2744]" />
                    <p className="text-xs font-semibold text-[#1a2744]">Faible connectivite</p>
                  </div>
                  <ul className="space-y-1">
                    <li className="text-[11px] text-gray-600 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3 text-[#2d7a4f] shrink-0" />
                      Publication par lot des resultats
                    </li>
                    <li className="text-[11px] text-gray-600 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3 text-[#2d7a4f] shrink-0" />
                      Validation hors ligne possible
                    </li>
                    <li className="text-[11px] text-gray-600 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3 text-[#2d7a4f] shrink-0" />
                      Synchronisation automatique
                    </li>
                  </ul>
                </div>

                {/* Print Format */}
                <div className="p-3 bg-[#2d7a4f05] rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Printer className="size-4 text-[#2d7a4f]" />
                    <p className="text-xs font-semibold text-[#1a2744]">Format imprimable</p>
                  </div>
                  <ul className="space-y-1">
                    <li className="text-[11px] text-gray-600 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3 text-[#2d7a4f] shrink-0" />
                      Releves officiels conformes
                    </li>
                    <li className="text-[11px] text-gray-600 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3 text-[#2d7a4f] shrink-0" />
                      Cachet et signature numerique
                    </li>
                    <li className="text-[11px] text-gray-600 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3 text-[#2d7a4f] shrink-0" />
                      QR Code de verification
                    </li>
                  </ul>
                </div>

                {/* Multi-language */}
                <div className="p-3 bg-[#d4a85305] rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="size-4 text-[#d4a853]" />
                    <p className="text-xs font-semibold text-[#1a2744]">Multilinguisme</p>
                  </div>
                  <ul className="space-y-1">
                    <li className="text-[11px] text-gray-600 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3 text-[#2d7a4f] shrink-0" />
                      Francais (langue principale)
                    </li>
                    <li className="text-[11px] text-gray-600 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3 text-[#2d7a4f] shrink-0" />
                      Anglais (releves bilingues)
                    </li>
                    <li className="text-[11px] text-gray-600 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3 text-[#2d7a4f] shrink-0" />
                      Arabe (pays francophones arabes)
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </TooltipProvider>
  )
}
