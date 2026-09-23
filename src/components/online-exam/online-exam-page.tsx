'use client'

import { exportToExcel } from '@/lib/export'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useOnlineExams } from '@/lib/api-hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
  TooltipProvider,
} from '@/components/ui/tooltip'
import {
  Monitor,
  Clock,
  FileCheck,
  TrendingUp,
  Shield,
  AlertTriangle,
  Search,
  Plus,
  Download,
  Eye,
  Wifi,
  Smartphone,
  Save,
  Timer,
  CheckCircle2,
  BarChart3,
  BookOpen,
  Calendar,
  Zap,
  Globe,
  FileText,
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

// ─── Types and API-backed data mapping ────────────────────────────────────────

interface UpcomingExam {
  id: string
  name: string
  course: string
  date: string
  time: string
  duration: string
  questions: number
  type: 'QCM' | 'Dissertation' | 'Mixte'
  status: 'Planifie' | 'En cours' | 'Termine'
  progress?: number
}

interface OnlineExamRecord {
  id: string
  name: string
  course: string
  examDate: string
  duration: string
  questions: number
  type: 'QCM' | 'DISSERTATION' | 'MIXTE'
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED'
  progress: number
}

const examTypeApiToUi: Record<OnlineExamRecord['type'], UpcomingExam['type']> = {
  'QCM': 'QCM',
  'DISSERTATION': 'Dissertation',
  'MIXTE': 'Mixte',
}

const examStatusApiToUi: Record<OnlineExamRecord['status'], UpcomingExam['status']> = {
  'PLANNED': 'Planifie',
  'IN_PROGRESS': 'En cours',
  'COMPLETED': 'Termine',
}

function mapExam(r: OnlineExamRecord): UpcomingExam {
  const examDate = new Date(r.examDate)
  const date = examDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const time = examDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false })
  return {
    id: r.id,
    name: r.name,
    course: r.course,
    date: date.charAt(0).toUpperCase() + date.slice(1),
    time,
    duration: r.duration,
    questions: r.questions,
    type: examTypeApiToUi[r.type] || 'QCM',
    status: examStatusApiToUi[r.status] || 'Planifie',
    progress: r.progress,
  }
}

interface StudentResult {
  id: string
  name: string
  matricule: string
  score: number
  maxScore: number
  timeTaken: string
  status: 'Reussi' | 'Echoue' | 'En correction'
  grade: string
}

interface FlaggedIncident {
  id: string
  studentName: string
  exam: string
  type: 'Changement onglet' | 'Tentative copie' | 'Anomalie temps' | 'IP differente' | 'Fenetre perdue'
  timestamp: string
  severity: 'Critique' | 'Elevee' | 'Moyenne'
}

interface BankQuestion {
  id: string
  text: string
  type: 'QCM' | 'Dissertation' | 'Vrai-Faux'
  difficulty: 'Facile' | 'Moyen' | 'Difficile'
  points: number
  usageCount: number
  course: string
}

// ─── Config Maps ──────────────────────────────────────────────────────────────

const examTypeConfig: Record<string, { label: string; className: string }> = {
  'QCM': { label: 'QCM', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' },
  'Dissertation': { label: 'Dissertation', className: 'bg-[#1a274415] text-[#1a2744] border-0' },
  'Mixte': { label: 'Mixte', className: 'bg-[#d4a85315] text-[#d4a853] border-0' },
  'Vrai-Faux': { label: 'Vrai-Faux', className: 'bg-[#6366f115] text-[#6366f1] border-0' },
}

const examStatusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  'Planifie': { label: 'Planifie', className: 'bg-[#d4a85315] text-[#d4a853] border-0', icon: Clock },
  'En cours': { label: 'En cours', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0', icon: Zap },
  'Termine': { label: 'Termine', className: 'bg-[#1a274415] text-[#1a2744] border-0', icon: CheckCircle2 },
}

const resultStatusConfig: Record<string, { label: string; className: string }> = {
  'Reussi': { label: 'Reussi', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' },
  'Echoue': { label: 'Echoue', className: 'bg-[#c6282815] text-[#c62828] border-0' },
  'En correction': { label: 'En correction', className: 'bg-[#d4a85315] text-[#d4a853] border-0' },
}

const gradeConfig: Record<string, { className: string }> = {
  'Excellent': { className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' },
  'Tres Bien': { className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' },
  'Bien': { className: 'bg-[#1a274415] text-[#1a2744] border-0' },
  'Assez Bien': { className: 'bg-[#d4a85315] text-[#d4a853] border-0' },
  'Passable': { className: 'bg-[#d4a85315] text-[#d4a853] border-0' },
  'Insuffisant': { className: 'bg-[#c6282815] text-[#c62828] border-0' },
  '-': { className: 'bg-gray-100 text-gray-400 border-0' },
}

const severityConfig: Record<string, { label: string; className: string }> = {
  'Critique': { label: 'Critique', className: 'bg-[#c6282815] text-[#c62828] border-0' },
  'Elevee': { label: 'Elevee', className: 'bg-[#ea580c15] text-[#ea580c] border-0' },
  'Moyenne': { label: 'Moyenne', className: 'bg-[#d4a85315] text-[#d4a853] border-0' },
}

const difficultyConfig: Record<string, { label: string; className: string }> = {
  'Facile': { label: 'Facile', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' },
  'Moyen': { label: 'Moyen', className: 'bg-[#d4a85315] text-[#d4a853] border-0' },
  'Difficile': { label: 'Difficile', className: 'bg-[#c6282815] text-[#c62828] border-0' },
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OnlineExamPage() {
  const queryClient = useQueryClient()
  const { data: examsQuery, isLoading: examsLoading } = useOnlineExams()
  const upcomingExams: UpcomingExam[] = (examsQuery?.exams || []).map(mapExam)
  const bankQuestions: BankQuestion[] = (examsQuery?.bankQuestions || []).map((q: any) => ({
    id: q.id,
    text: q.text,
    type: q.type,
    difficulty: q.difficulty,
    points: q.points,
    usageCount: q.usageCount,
    course: q.course || '—',
  }))
  const studentResults: StudentResult[] = (examsQuery?.results || []).map((r: any) => ({
    id: r.id,
    name: r.name,
    matricule: r.matricule,
    score: r.score ?? 0,
    maxScore: r.maxScore,
    timeTaken: r.timeTaken,
    status: r.status === 'REUSSI' ? 'Reussi' : r.status === 'ECHOUE' ? 'Echoue' : 'En correction',
    grade: r.grade,
  }))
  const incidents: FlaggedIncident[] = (examsQuery?.incidents || []).map((i: any) => ({
    id: i.id,
    studentName: i.studentName,
    exam: i.exam,
    type: i.type,
    timestamp: i.timestamp,
    severity: i.severity,
  }))

  const [newQuestionText, setNewQuestionText] = useState('')
  const [newQuestionCourse, setNewQuestionCourse] = useState('')
  const [newQuestionType, setNewQuestionType] = useState<'QCM' | 'Dissertation' | 'Vrai-Faux'>('QCM')
  const [newQuestionDifficulty, setNewQuestionDifficulty] = useState<'Facile' | 'Moyen' | 'Difficile'>('Moyen')
  const [newQuestionOptions, setNewQuestionOptions] = useState(['', '', '', ''])
  const [newQuestionCorrectAnswer, setNewQuestionCorrectAnswer] = useState(0)
  const [isAddingQuestion, setIsAddingQuestion] = useState(false)

  const isAutoGradableType = newQuestionType === 'QCM' || newQuestionType === 'Vrai-Faux'

  const handleAddQuestion = async () => {
    if (!newQuestionText.trim()) {
      toast.error('Le texte de la question est requis.')
      return
    }
    const filledOptions = newQuestionOptions.map((o) => o.trim()).filter(Boolean)
    if (isAutoGradableType && filledOptions.length < 2) {
      toast.error('Au moins 2 options sont requises pour une question a correction automatique.')
      return
    }
    setIsAddingQuestion(true)
    try {
      const res = await fetch('/api/online-exams?entity=question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newQuestionText.trim(),
          type: newQuestionType,
          difficulty: newQuestionDifficulty,
          course: newQuestionCourse.trim() || undefined,
          options: isAutoGradableType ? filledOptions : undefined,
          correctAnswer: isAutoGradableType ? newQuestionCorrectAnswer : undefined,
        }),
      })
      if (!res.ok) throw new Error('failed')
      toast.success('Question ajoutee a la banque.')
      setNewQuestionText('')
      setNewQuestionCourse('')
      setNewQuestionOptions(['', '', '', ''])
      setNewQuestionCorrectAnswer(0)
      queryClient.invalidateQueries({ queryKey: ['onlineExams'] })
    } catch {
      toast.error("Echec de l'ajout de la question.")
    } finally {
      setIsAddingQuestion(false)
    }
  }

  const [showNewExam, setShowNewExam] = useState(false)
  const [isCreatingExam, setIsCreatingExam] = useState(false)
  const [newExam, setNewExam] = useState({ name: '', course: '', examDate: '', duration: '1h00', type: 'QCM' as 'QCM' | 'DISSERTATION' | 'MIXTE' })
  const [newExamQuestionIds, setNewExamQuestionIds] = useState<string[]>([])

  const handleCreateExam = async () => {
    if (!newExam.name.trim() || !newExam.course.trim() || !newExam.examDate) {
      toast.error('Nom, cours et date sont requis.')
      return
    }
    if (newExamQuestionIds.length === 0) {
      toast.error('Selectionnez au moins une question de la banque.')
      return
    }
    setIsCreatingExam(true)
    try {
      const res = await fetch('/api/online-exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newExam.name.trim(),
          course: newExam.course.trim(),
          examDate: new Date(newExam.examDate).toISOString(),
          duration: newExam.duration,
          type: newExam.type,
          questionIds: newExamQuestionIds,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Echec de la creation')
      toast.success('Examen cree avec succes')
      setShowNewExam(false)
      setNewExam({ name: '', course: '', examDate: '', duration: '1h00', type: 'QCM' })
      setNewExamQuestionIds([])
      queryClient.invalidateQueries({ queryKey: ['onlineExams'] })
    } catch (e) {
      toast.error('Erreur', { description: e instanceof Error ? e.message : 'Echec de la creation' })
    } finally {
      setIsCreatingExam(false)
    }
  }

  const examensPrevus = useCountUp(upcomingExams.length, 1400)
  const inProgressCount = examsQuery?.stats?.inProgress ?? upcomingExams.filter(e => e.status === 'En cours').length
  const completedCount = examsQuery?.stats?.completed ?? upcomingExams.filter(e => e.status === 'Termine').length
  const tauxCompletion = useCountUp(
    studentResults.length > 0
      ? Math.round((studentResults.filter((r) => r.status !== 'En correction').length / studentResults.length) * 100)
      : 0,
    1300,
  )

  // Question bank state
  const [showAddQuestionForm, setShowAddQuestionForm] = useState(false)
  const [bankSearch, setBankSearch] = useState('')
  const [bankCourseFilter, setBankCourseFilter] = useState('tous')
  const [bankTypeFilter, setBankTypeFilter] = useState('tous')
  const [bankDiffFilter, setBankDiffFilter] = useState('tous')

  // Results filter
  const [resultSearch, setResultSearch] = useState('')

  // Results statistics
  const validResults = studentResults.filter(r => r.status !== 'En correction')
  const averageScore = validResults.length > 0
    ? validResults.reduce((sum, result) => sum + result.score, 0) / validResults.length
    : 0
  const successRate = validResults.length > 0
    ? Math.round((validResults.filter((result) => result.status === 'Reussi').length / validResults.length) * 100)
    : 0
  const scores = validResults.map(r => r.score)
  const moyenne = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  const sortedScores = [...scores].sort((a, b) => a - b)
  const mediane = sortedScores.length > 0 ? sortedScores[Math.floor(sortedScores.length / 2)] : 0
  const minScore = sortedScores.length > 0 ? sortedScores[0] : 0
  const maxScore = sortedScores.length > 0 ? sortedScores[sortedScores.length - 1] : 0
  const variance = scores.length > 0 ? scores.reduce((sum, s) => sum + Math.pow(s - moyenne, 2), 0) / scores.length : 0
  const ecartType = Math.sqrt(variance)

  // Grade distribution - real histogram bucketed from validResults, not fabricated
  const distBuckets = [
    { range: '0-4', min: 0, max: 4, color: '#c62828' },
    { range: '4-8', min: 4, max: 8, color: '#ea580c' },
    { range: '8-10', min: 8, max: 10, color: '#d4a853' },
    { range: '10-12', min: 10, max: 12, color: '#1a2744' },
    { range: '12-14', min: 12, max: 14, color: '#2d7a4f' },
    { range: '14-16', min: 14, max: 16, color: '#2d7a4f' },
    { range: '16-20', min: 16, max: 20.01, color: '#1a2744' },
  ]
  const gradeDistribution = distBuckets.map(b => ({
    range: b.range,
    color: b.color,
    count: scores.filter(s => s >= b.min && s < b.max).length,
  }))
  const maxDistCount = Math.max(1, ...gradeDistribution.map(d => d.count))

  const bankCourseOptions = Array.from(new Set(bankQuestions.map((q) => q.course).filter((course) => course && course !== '—'))).sort()

  // Filter bank questions
  const filteredBankQuestions = bankQuestions.filter(q => {
    const matchSearch = bankSearch === '' || q.text.toLowerCase().includes(bankSearch.toLowerCase())
    const matchCourse = bankCourseFilter === 'tous' || q.course === bankCourseFilter
    const matchType = bankTypeFilter === 'tous' || q.type === bankTypeFilter
    const matchDiff = bankDiffFilter === 'tous' || q.difficulty === bankDiffFilter
    return matchSearch && matchCourse && matchType && matchDiff
  })

  // Filter results
  const filteredResults = studentResults.filter(r => {
    const matchSearch = resultSearch === '' ||
      r.name.toLowerCase().includes(resultSearch.toLowerCase()) ||
      r.matricule.toLowerCase().includes(resultSearch.toLowerCase())
    return matchSearch
  })

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
        {/* ── Gradient Header Banner ───────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <div className="relative overflow-hidden bg-gradient-to-r from-[#1a2744] via-[#1f3050] to-[#2d7a4f] p-6 md:p-8 rounded-xl mb-2">
            {/* SVG pattern overlay */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                    <Monitor className="size-6" />
                    Examens en Ligne
                  </h1>
                  <p className="text-sm text-white/70 mt-1">Passation, surveillance et correction automatisee</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" className="bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 text-white text-xs" onClick={() => setShowNewExam(true)}>
                    <Plus className="size-3.5 mr-1.5" />
                    Creer un examen
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs bg-white/10 backdrop-blur border-white/20 text-white hover:bg-white/20 hover:text-white" onClick={() => exportToExcel(filteredResults, 'export_resultats_examens_en_ligne')}>
                    <Download className="size-3.5 mr-1.5" />
                    Exporter les resultats
                  </Button>
                </div>
              </div>
              {/* Glass-morphism stat cards */}
              <div className="flex gap-4 mt-4">
                <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }} className="bg-white/10 backdrop-blur border border-white/15 rounded-lg px-4 py-3">
                  <div className="text-white/60 text-xs">Examens prevus</div>
                  <div className="text-white text-2xl font-bold">{examensPrevus}</div>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }} className="bg-white/10 backdrop-blur border border-white/15 rounded-lg px-4 py-3">
                  <div className="text-white/60 text-xs">Taux de completion</div>
                  <div className="text-white text-2xl font-bold">{tauxCompletion}%</div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── 4 Stats Cards ──────────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Examens en cours */}
          <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
            <Card className="overflow-hidden relative border-l-4 border-l-[#2d7a4f] hover:shadow-lg transition-shadow">
              <div className="h-1 bg-gradient-to-r from-[#2d7a4f] to-[#3da66a]" />
              <div className="absolute inset-0 bg-gradient-to-br from-[#2d7a4f08] to-[#2d7a4f00] pointer-events-none" />
              <CardContent className="p-4 relative">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Examens en cours</p>
                    <p className="text-xl font-bold text-[#2d7a4f] mt-1">{inProgressCount}</p>
                    <p className="text-xs text-[#2d7a4f] mt-1 font-medium flex items-center gap-1">
                      <TrendingUp className="size-3" />
                      Actifs maintenant
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#2d7a4f15] flex items-center justify-center">
                    <Monitor className="size-5 text-[#2d7a4f]" />
                  </div>
                </div>
                <div className="mt-3">
                  <Progress value={upcomingExams.length > 0 ? Math.round((inProgressCount / upcomingExams.length) * 100) : 0} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#2d7a4f]" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Examens termines */}
          <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
            <Card className="overflow-hidden relative border-l-4 border-l-[#1a2744] hover:shadow-lg transition-shadow">
              <div className="h-1 bg-gradient-to-r from-[#1a2744] to-[#2d3e5e]" />
              <div className="absolute inset-0 bg-gradient-to-br from-[#1a274408] to-[#1a274400] pointer-events-none" />
              <CardContent className="p-4 relative">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Examens termines</p>
                    <p className="text-xl font-bold text-[#1a2744] mt-1">{completedCount}</p>
                    <p className="text-xs text-gray-400 mt-1">Sessions finalisees</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#1a274415] flex items-center justify-center">
                    <CheckCircle2 className="size-5 text-[#1a2744]" />
                  </div>
                </div>
                <div className="mt-3">
                  <Progress value={upcomingExams.length > 0 ? Math.round((completedCount / upcomingExams.length) * 100) : 0} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#1a2744]" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Notes moyennes */}
          <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
            <Card className="overflow-hidden relative border-l-4 border-l-[#d4a853] hover:shadow-lg transition-shadow">
              <div className="h-1 bg-gradient-to-r from-[#d4a853] to-[#e6c477]" />
              <div className="absolute inset-0 bg-gradient-to-br from-[#d4a85308] to-[#d4a85300] pointer-events-none" />
              <CardContent className="p-4 relative">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Notes moyennes</p>
                    <p className="text-xl font-bold text-[#d4a853] mt-1">{averageScore.toFixed(1)}/20</p>
                    <p className="text-xs text-gray-400 mt-1">Résultats corrigés</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#d4a85315] flex items-center justify-center">
                    <BarChart3 className="size-5 text-[#d4a853]" />
                  </div>
                </div>
                <div className="mt-3">
                  <Progress value={Math.min(100, Math.round((averageScore / 20) * 100))} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#d4a853]" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Taux de reussite */}
          <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
            <Card className="overflow-hidden relative border-l-4 border-l-[#2d7a4f] hover:shadow-lg transition-shadow">
              <div className="h-1 bg-gradient-to-r from-[#2d7a4f] to-[#3da66a]" />
              <div className="absolute inset-0 bg-gradient-to-br from-[#2d7a4f08] to-[#2d7a4f00] pointer-events-none" />
              <CardContent className="p-4 relative">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Taux de reussite</p>
                    <p className="text-xl font-bold text-[#2d7a4f] mt-1">{successRate}%</p>
                    <p className="text-xs text-gray-400 mt-1">Sur les copies corrigees</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#2d7a4f15] flex items-center justify-center">
                    <TrendingUp className="size-5 text-[#2d7a4f]" />
                  </div>
                </div>
                <div className="mt-3">
                  <Progress value={successRate} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#2d7a4f]" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* ── Exam Calendar Card ──────────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-[#1a2744]">
            <div className="h-1 bg-gradient-to-r from-[#1a2744] via-[#2d7a4f] to-[#d4a853]" />
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <Calendar className="size-4" />
                  Calendrier des examens
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className="text-[10px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">
                    {examsQuery?.stats?.inProgress ?? upcomingExams.filter(e => e.status === 'En cours').length} en cours
                  </Badge>
                  <Badge className="text-[10px] bg-[#d4a85315] text-[#d4a853] border-0">
                    {examsQuery?.stats?.planned ?? upcomingExams.filter(e => e.status === 'Planifie').length} planifies
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 sticky top-0 z-10">
                      <TableHead className="text-xs font-semibold">Examen</TableHead>
                      <TableHead className="text-xs font-semibold">Cours</TableHead>
                      <TableHead className="text-xs font-semibold">Date / Heure</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Duree</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Questions</TableHead>
                      <TableHead className="text-xs font-semibold">Type</TableHead>
                      <TableHead className="text-xs font-semibold">Statut</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingExams.map((exam) => {
                      const typeConf = examTypeConfig[exam.type]
                      const statusConf = examStatusConfig[exam.status]
                      const StatusIcon = statusConf?.icon
                      return (
                        <TableRow key={exam.id} className="hover:bg-[#2d7a4f05] transition-colors">
                          <TableCell className="py-2.5">
                            <p className="text-sm font-medium text-[#1a2744]">{exam.name}</p>
                          </TableCell>
                          <TableCell className="text-xs text-gray-600 py-2.5">{exam.course}</TableCell>
                          <TableCell className="py-2.5">
                            <div className="flex items-center gap-1">
                              <Calendar className="size-3 text-gray-400" />
                              <span className="text-xs text-gray-600">{exam.date}</span>
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Clock className="size-3 text-gray-400" />
                              <span className="text-xs text-gray-500">{exam.time}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-xs text-gray-600 py-2.5">{exam.duration}</TableCell>
                          <TableCell className="text-center text-xs font-medium text-[#1a2744] py-2.5">{exam.questions}</TableCell>
                          <TableCell className="py-2.5">
                            {typeConf ? (
                              <Badge className={`text-[10px] ${typeConf.className}`}>{typeConf.label}</Badge>
                            ) : null}
                          </TableCell>
                          <TableCell className="py-2.5">
                            <div className="flex items-center gap-1.5">
                              {statusConf ? (
                                <Badge className={`text-[10px] ${statusConf.className}`}>
                                  {StatusIcon && <StatusIcon className="size-3 mr-1" />}
                                  {statusConf.label}
                                </Badge>
                              ) : null}
                              {exam.status === 'En cours' && exam.progress !== undefined && (
                                <div className="w-16">
                                  <Progress value={exam.progress} className="h-1 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#2d7a4f]" />
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5 text-right">
                            {exam.status === 'Planifie' ? (
                              <Button size="sm" variant="outline" className="h-7 text-[10px] border-[#2d7a4f30] text-[#2d7a4f]" disabled>
                                Disponible cote etudiant
                              </Button>
                            ) : exam.status === 'En cours' ? (
                              <Button size="sm" variant="outline" className="h-7 text-[10px] border-[#d4a85330] text-[#d4a853]" disabled>
                                Session etudiant active
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" className="h-7 text-[10px] text-gray-600" disabled>
                                Resultats ci-dessous
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {examsLoading && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-sm text-gray-400">
                          Chargement...
                        </TableCell>
                      </TableRow>
                    )}
                    {!examsLoading && upcomingExams.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-sm text-gray-400">
                          Aucun examen trouve
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Student Exam Runtime Status ──────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-[#2d7a4f]">
            <div className="h-1 bg-gradient-to-r from-[#2d7a4f] to-[#3da66a]" />
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <Monitor className="size-4 text-[#2d7a4f]" />
                  Interface etudiant reelle
                </CardTitle>
                <Badge className="text-[10px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">
                  Donnees connectees
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4">
                <div className="p-4 rounded-lg bg-[#1a274408] border border-[#1a274415]">
                  <h3 className="text-sm font-bold text-[#1a2744] mb-2">Passation cote etudiant, gestion cote admin</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Ce panneau admin ne simule plus une copie d&apos;examen. Il prepare les examens, gere la banque de questions,
                    affiche les resultats enregistres et liste les incidents remontes par les sessions etudiantes reelles.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                    <div className="p-3 rounded-lg bg-white border border-gray-100">
                      <p className="text-[10px] text-gray-500">Examens planifies</p>
                      <p className="text-xl font-bold text-[#1a2744]">{upcomingExams.filter((exam) => exam.status === 'Planifie').length}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white border border-gray-100">
                      <p className="text-[10px] text-gray-500">Sessions en cours</p>
                      <p className="text-xl font-bold text-[#2d7a4f]">{inProgressCount}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white border border-gray-100">
                      <p className="text-[10px] text-gray-500">Resultats enregistres</p>
                      <p className="text-xl font-bold text-[#d4a853]">{studentResults.length}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-[#2d7a4f08] border border-[#2d7a4f15]">
                  <h4 className="text-xs font-semibold text-[#1a2744] mb-3">Actions admin disponibles</h4>
                  <div className="space-y-2">
                    <Button size="sm" className="w-full justify-start h-8 text-xs bg-[#2d7a4f] hover:bg-[#236b40] text-white" onClick={() => setShowNewExam(true)}>
                      <Plus className="size-3.5 mr-2" />
                      Creer un examen
                    </Button>
                    <Button size="sm" variant="outline" className="w-full justify-start h-8 text-xs border-[#1a274430] text-[#1a2744]" onClick={() => setShowAddQuestionForm(true)}>
                      <BookOpen className="size-3.5 mr-2" />
                      Ajouter une question
                    </Button>
                    <Button size="sm" variant="outline" className="w-full justify-start h-8 text-xs border-[#d4a85330] text-[#d4a853]" onClick={() => exportToExcel(filteredResults, 'export_resultats_examens_en_ligne')}>
                      <Download className="size-3.5 mr-2" />
                      Exporter les resultats
                    </Button>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-3 leading-relaxed">
                    Les actions etudiantes demarrent depuis leur espace personnel, pas depuis ce panneau admin.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Results & Grading Card ──────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-[#d4a853]">
            <div className="h-1 bg-gradient-to-r from-[#d4a853] to-[#e6c477]" />
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <BarChart3 className="size-4" />
                  Resultats & Correction automatique
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
                    <Input
                      placeholder="Rechercher etudiant..."
                      className="pl-8 h-8 text-xs"
                      value={resultSearch}
                      onChange={(e) => setResultSearch(e.target.value)}
                    />
                  </div>
                  <Button size="sm" variant="outline" className="text-xs border-[#1a274430] text-[#1a2744] hover:bg-[#1a274408]" onClick={() => exportToExcel(filteredResults, 'export_resultats_examens_en_ligne')}>
                    <Download className="size-3.5 mr-1.5" />
                    Exporter
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
              {/* Student results table */}
              <div className="overflow-x-auto max-h-80 overflow-y-auto rounded-lg border border-gray-100">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 sticky top-0 z-10">
                      <TableHead className="text-xs font-semibold">Etudiant</TableHead>
                      <TableHead className="text-xs font-semibold">Matricule</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Note</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Temps</TableHead>
                      <TableHead className="text-xs font-semibold">Statut</TableHead>
                      <TableHead className="text-xs font-semibold">Mention</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {examsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-xs text-gray-400">Chargement...</TableCell>
                      </TableRow>
                    ) : filteredResults.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-xs text-gray-400">Aucun resultat publie pour le moment</TableCell>
                      </TableRow>
                    ) : filteredResults.map((result) => {
                      const rsc = resultStatusConfig[result.status]
                      const gc = gradeConfig[result.grade]
                      return (
                        <TableRow key={result.id} className="hover:bg-[#2d7a4f05] transition-colors">
                          <TableCell className="py-2">
                            <span className="text-sm font-medium text-[#1a2744]">{result.name}</span>
                          </TableCell>
                          <TableCell className="text-xs text-gray-500 font-mono py-2">{result.matricule}</TableCell>
                          <TableCell className="text-center py-2">
                            <span className={`text-sm font-bold ${
                              result.score >= 12 ? 'text-[#2d7a4f]' :
                              result.score >= 10 ? 'text-[#d4a853]' :
                              'text-[#c62828]'
                            }`}>
                              {result.score}/{result.maxScore}
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-xs text-gray-600 py-2">{result.timeTaken}</TableCell>
                          <TableCell className="py-2">
                            {rsc ? (
                              <Badge className={`text-[10px] ${rsc.className}`}>{rsc.label}</Badge>
                            ) : null}
                          </TableCell>
                          <TableCell className="py-2">
                            {gc ? (
                              <Badge className={`text-[10px] ${gc.className}`}>{result.grade}</Badge>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Statistics row */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 rounded-lg bg-gray-50 text-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Moyenne</p>
                  <p className="text-lg font-bold text-[#1a2744]">{moyenne.toFixed(1)}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 text-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Mediane</p>
                  <p className="text-lg font-bold text-[#2d7a4f]">{mediane.toFixed(1)}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 text-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Min</p>
                  <p className="text-lg font-bold text-[#c62828]">{minScore.toFixed(1)}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 text-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Max</p>
                  <p className="text-lg font-bold text-[#2d7a4f]">{maxScore.toFixed(1)}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 text-center">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Ecart-type</p>
                  <p className="text-lg font-bold text-[#d4a853]">{ecartType.toFixed(1)}</p>
                </div>
              </div>

              {/* Grade distribution bar chart */}
              <div>
                <h4 className="text-xs font-semibold text-[#1a2744] mb-3">Distribution des notes</h4>
                <div className="flex items-end gap-2 h-32">
                  {gradeDistribution.map((bar, idx) => (
                    <div key={bar.range} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] font-semibold text-[#1a2744]">{bar.count}</span>
                      <div className="w-full relative" style={{ height: '80px' }}>
                        <div className="absolute inset-x-0 bottom-0">
                          <motion.div
                            className="w-full rounded-t"
                            style={{ backgroundColor: bar.color, height: `${maxDistCount > 0 ? (bar.count / maxDistCount) * 80 : 0}px` }}
                            initial={{ height: 0 }}
                            animate={{ height: `${maxDistCount > 0 ? (bar.count / maxDistCount) * 80 : 0}px` }}
                            transition={{ duration: 0.6, delay: idx * 0.1, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                      <span className="text-[9px] text-gray-500 font-mono">{bar.range}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Anti-Cheat & Proctoring + Question Bank Row ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Anti-Cheat Card */}
          <motion.div variants={itemVariants}>
            <Card className="h-full border-l-4 border-l-red-500">
              <div className="h-1 bg-gradient-to-r from-red-500 to-red-400" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                    <Shield className="size-4 text-red-500" />
                    Surveillance connectee et limites
                  </CardTitle>
                  <Badge className="text-[10px] bg-red-500/10 text-red-600 border-0">
                    Incidents reels
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Security features */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: Eye, text: 'Incidents visibles cote admin' },
                    { icon: AlertTriangle, text: 'Sortie de fenetre signalee' },
                    { icon: Timer, text: 'Duree issue de l examen' },
                    { icon: FileCheck, text: 'Soumission finale enregistree' },
                  ].map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded bg-[#2d7a4f08] border border-[#2d7a4f15]">
                      <feature.icon className="size-3.5 text-[#2d7a4f] shrink-0" />
                      <span className="text-[10px] text-gray-700 leading-tight">{feature.text}</span>
                      <CheckCircle2 className="size-3 text-[#2d7a4f] ml-auto shrink-0" />
                    </div>
                  ))}
                </div>

                {/* Operational limits */}
                <div className="p-3 rounded-lg bg-[#d4a85308] border border-[#d4a85315]">
                  <p className="text-xs font-semibold text-[#1a2744] mb-1">Limites operationnelles</p>
                  <p className="text-[10px] text-gray-600 leading-relaxed">
                    Les incidents sont journalises et consultables ici. Ce panneau n&apos;annonce plus de sanction automatique
                    tant qu&apos;une regle de blocage ou de soumission forcee n&apos;est pas configuree cote serveur.
                  </p>
                </div>

                {/* Flagged incidents */}
                <div>
                  <p className="text-xs font-semibold text-[#1a2744] mb-2">Incidents signales</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {incidents.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-4">Aucun incident signale</p>
                    )}
                    {incidents.map((incident) => {
                      const sevConf = severityConfig[incident.severity]
                      return (
                        <div key={incident.id} className="flex items-start gap-2 p-2 rounded-lg border border-gray-100 bg-white">
                          <AlertTriangle className={`size-3.5 mt-0.5 shrink-0 ${
                            incident.severity === 'Critique' ? 'text-red-500' :
                            incident.severity === 'Elevee' ? 'text-orange-500' :
                            'text-[#d4a853]'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-[#1a2744]">{incident.studentName}</span>
                              {sevConf ? (
                                <Badge className={`text-[9px] ${sevConf.className}`}>{sevConf.label}</Badge>
                              ) : null}
                            </div>
                            <p className="text-[10px] text-gray-500">{incident.type} - {incident.exam}</p>
                            <p className="text-[9px] text-gray-400">{incident.timestamp}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Question Bank Card */}
          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <div className="h-1 bg-gradient-to-r from-[#1a2744] to-[#2d7a4f]" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                    <BookOpen className="size-4" />
                    Banque de questions
                  </CardTitle>
                  <Button
                    size="sm"
                    className="h-7 text-[10px] bg-[#2d7a4f] hover:bg-[#236b40] text-white"
                    onClick={() => setShowAddQuestionForm((v) => !v)}
                  >
                    <Plus className="size-3 mr-1" />
                    Ajouter une question
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {showAddQuestionForm && (
                  <div className="p-3 rounded-lg border border-gray-200 bg-gray-50 space-y-2">
                    <Input
                      placeholder="Texte de la question"
                      className="h-8 text-xs bg-white"
                      value={newQuestionText}
                      onChange={(e) => setNewQuestionText(e.target.value)}
                    />
                    <div className="flex gap-2 flex-wrap">
                      <Input
                        placeholder="Cours (optionnel)"
                        className="h-8 text-xs bg-white flex-1 min-w-[140px]"
                        value={newQuestionCourse}
                        onChange={(e) => setNewQuestionCourse(e.target.value)}
                      />
                      <Select value={newQuestionType} onValueChange={(v) => setNewQuestionType(v as typeof newQuestionType)}>
                        <SelectTrigger className="w-[110px] h-8 text-xs bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="QCM">QCM</SelectItem>
                          <SelectItem value="Dissertation">Dissertation</SelectItem>
                          <SelectItem value="Vrai-Faux">Vrai-Faux</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={newQuestionDifficulty} onValueChange={(v) => setNewQuestionDifficulty(v as typeof newQuestionDifficulty)}>
                        <SelectTrigger className="w-[110px] h-8 text-xs bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Facile">Facile</SelectItem>
                          <SelectItem value="Moyen">Moyen</SelectItem>
                          <SelectItem value="Difficile">Difficile</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {isAutoGradableType && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-gray-500">Options (selectionnez la bonne reponse) :</p>
                        {newQuestionOptions.map((opt, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="correct-answer"
                              checked={newQuestionCorrectAnswer === idx}
                              onChange={() => setNewQuestionCorrectAnswer(idx)}
                              className="accent-[#2d7a4f]"
                            />
                            <Input
                              placeholder={`Option ${idx + 1}`}
                              className="h-7 text-xs bg-white"
                              value={opt}
                              onChange={(e) => setNewQuestionOptions((prev) => prev.map((o, i) => i === idx ? e.target.value : o))}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    <Button size="sm" className="h-7 text-[10px] bg-[#1a2744] hover:bg-[#1a2744]/90 text-white" onClick={handleAddQuestion} disabled={isAddingQuestion}>
                      {isAddingQuestion ? 'Ajout...' : 'Enregistrer'}
                    </Button>
                  </div>
                )}
                {/* Search + filters */}
                <div className="flex flex-col gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
                    <Input
                      placeholder="Rechercher une question..."
                      className="pl-8 h-8 text-xs"
                      value={bankSearch}
                      onChange={(e) => setBankSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Select value={bankCourseFilter} onValueChange={setBankCourseFilter}>
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue placeholder="Cours" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tous">Tous les cours</SelectItem>
                        {bankCourseOptions.map((course) => (
                          <SelectItem key={course} value={course}>{course}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={bankTypeFilter} onValueChange={setBankTypeFilter}>
                      <SelectTrigger className="w-[110px] h-8 text-xs">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tous">Tous types</SelectItem>
                        <SelectItem value="QCM">QCM</SelectItem>
                        <SelectItem value="Dissertation">Dissertation</SelectItem>
                        <SelectItem value="Vrai-Faux">Vrai-Faux</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={bankDiffFilter} onValueChange={setBankDiffFilter}>
                      <SelectTrigger className="w-[110px] h-8 text-xs">
                        <SelectValue placeholder="Difficulte" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tous">Tous niveaux</SelectItem>
                        <SelectItem value="Facile">Facile</SelectItem>
                        <SelectItem value="Moyen">Moyen</SelectItem>
                        <SelectItem value="Difficile">Difficile</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Questions list */}
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {filteredBankQuestions.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-6">Aucune question dans la banque pour le moment</p>
                  )}
                  {filteredBankQuestions.map((q) => {
                    const tc = examTypeConfig[q.type]
                    const dc = difficultyConfig[q.difficulty]
                    return (
                      <div key={q.id} className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs text-[#1a2744] font-medium leading-relaxed flex-1">{q.text}</p>
                          <div className="flex items-center gap-1 shrink-0">
                            {tc ? (
                              <Badge className={`text-[9px] ${tc.className}`}>{tc.label}</Badge>
                            ) : null}
                            {dc ? (
                              <Badge className={`text-[9px] ${dc.className}`}>{dc.label}</Badge>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[10px] text-gray-400">{q.course}</span>
                          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                            <FileCheck className="size-2.5" />
                            {q.points} pts
                          </span>
                          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                            <Eye className="size-2.5" />
                            Utilisee {q.usageCount}x
                          </span>
                        </div>
                      </div>
                    )
                  })}
                  {filteredBankQuestions.length === 0 && (
                    <p className="text-center text-xs text-gray-400 py-4">Aucune question trouvee</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* ── Connectivity and Operational Limits Card ────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-[#2d7a4f]">
            <div className="h-1 bg-gradient-to-r from-[#1a2744] via-[#2d7a4f] to-[#d4a853]" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <Globe className="size-4 text-[#2d7a4f]" />
                  Connectivite et limites operationnelles
                </CardTitle>
                <Badge className="text-[10px] bg-[#d4a85315] text-[#d4a853] border-0">Transparent</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-[#2d7a4f08] border border-[#2d7a4f15]">
                  <div className="flex items-center gap-2 mb-2">
                    <Wifi className="size-4 text-[#2d7a4f]" />
                    <span className="text-sm font-semibold text-[#1a2744]">Connexion requise</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    La passation utilise les API du serveur pour demarrer une session, enregistrer les reponses et finaliser la copie.
                    Aucune promesse de fonctionnement hors connexion n&apos;est affichee ici.
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge className="text-[9px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">Serveur requis</Badge>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-[#1a274408] border border-[#1a274415]">
                  <div className="flex items-center gap-2 mb-2">
                    <Save className="size-4 text-[#1a2744]" />
                    <span className="text-sm font-semibold text-[#1a2744]">Sauvegarde des reponses</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Les reponses envoyees par l&apos;interface etudiante sont persistees par l&apos;API. En cas d&apos;echec reseau,
                    l&apos;etudiant doit voir l&apos;erreur et relancer l&apos;enregistrement.
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge className="text-[9px] bg-[#1a274415] text-[#1a2744] border-0">API connectee</Badge>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-[#d4a85308] border border-[#d4a85315]">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="size-4 text-[#d4a853]" />
                    <span className="text-sm font-semibold text-[#1a2744]">Pas de mode deconnecte annonce</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Les questions ne sont pas presentees comme stockees localement. Ce choix evite de promettre une synchronisation
                    automatique qui n&apos;est pas garantie par le panneau admin.
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge className="text-[9px] bg-[#d4a85315] text-[#d4a853] border-0">Limite affichee</Badge>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-[#2d7a4f08] border border-[#2d7a4f15]">
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="size-4 text-[#2d7a4f]" />
                    <span className="text-sm font-semibold text-[#1a2744]">Notifications externes</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Aucun operateur de messages mobiles n&apos;est annonce depuis cet onglet. Les rappels externes devront etre ajoutes via une integration dediee
                    avant d&apos;etre presentes aux administrateurs.
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge className="text-[9px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">Non connecte</Badge>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-[#1a274408] border border-[#1a274415]">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="size-4 text-[#1a2744]" />
                    <span className="text-sm font-semibold text-[#1a2744]">Support papier</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Une copie papier peut etre geree administrativement hors systeme, mais cet onglet ne genere pas automatiquement de sujets
                    ou de copies papier.
                  </p>
                  <div className="mt-2">
                    <Badge className="text-[9px] bg-[#1a274415] text-[#1a2744] border-0">Hors systeme</Badge>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-[#d4a85308] border border-[#d4a85315]">
                  <div className="flex items-center gap-2 mb-2">
                    <Timer className="size-4 text-[#d4a853]" />
                    <span className="text-sm font-semibold text-[#1a2744]">Temps d&apos;examen</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    La duree appliquee est celle configuree dans l&apos;examen. Aucun bonus automatique de temps n&apos;est affiche sans regle explicite.
                  </p>
                  <div className="mt-2">
                    <Badge className="text-[9px] bg-[#d4a85315] text-[#d4a853] border-0">Duree configuree</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {showNewExam && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowNewExam(false)}>
          <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#1a2744] mb-4">Creer un examen</h3>
            <div className="space-y-3">
              <Input
                placeholder="Nom de l'examen"
                className="h-9 text-sm"
                value={newExam.name}
                onChange={(e) => setNewExam((f) => ({ ...f, name: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Cours"
                  className="h-9 text-sm"
                  value={newExam.course}
                  onChange={(e) => setNewExam((f) => ({ ...f, course: e.target.value }))}
                />
                <Input
                  type="datetime-local"
                  className="h-9 text-sm"
                  value={newExam.examDate}
                  onChange={(e) => setNewExam((f) => ({ ...f, examDate: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Duree (ex: 1h30)"
                  className="h-9 text-sm"
                  value={newExam.duration}
                  onChange={(e) => setNewExam((f) => ({ ...f, duration: e.target.value }))}
                />
                <Select value={newExam.type} onValueChange={(v) => setNewExam((f) => ({ ...f, type: v as typeof newExam.type }))}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="QCM">QCM</SelectItem>
                    <SelectItem value="DISSERTATION">Dissertation</SelectItem>
                    <SelectItem value="MIXTE">Mixte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">
                  Questions de la banque ({newExamQuestionIds.length} selectionnee(s)) :
                </p>
                {bankQuestions.length === 0 ? (
                  <p className="text-xs text-gray-400">Ajoutez d&apos;abord des questions a la banque ci-dessous.</p>
                ) : (
                  <div className="space-y-1.5 max-h-52 overflow-y-auto border border-gray-100 rounded-lg p-2">
                    {bankQuestions.map((q) => (
                      <label key={q.id} className="flex items-start gap-2 p-1.5 rounded hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newExamQuestionIds.includes(q.id)}
                          onChange={() => setNewExamQuestionIds((prev) =>
                            prev.includes(q.id) ? prev.filter((id) => id !== q.id) : [...prev, q.id]
                          )}
                          className="mt-0.5 accent-[#2d7a4f]"
                        />
                        <span className="text-xs text-gray-700">{q.text}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="outline" className="flex-1 text-xs" onClick={() => setShowNewExam(false)}>Annuler</Button>
              <Button className="flex-1 text-xs bg-[#1a2744] hover:bg-[#1a2744]/90 text-white" onClick={handleCreateExam} disabled={isCreatingExam}>
                {isCreatingExam ? 'Creation...' : "Creer l'examen"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </TooltipProvider>
  )
}


