'use client'

import { exportToExcel } from '@/lib/export'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
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
  ChevronLeft,
  ChevronRight,
  Flag,
  Send,
  Eye,
  Wifi,
  WifiOff,
  Smartphone,
  Save,
  Timer,
  CheckCircle2,
  BarChart3,
  BookOpen,
  Calendar,
  Zap,
  Lock,
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

// ─── Demo Data ────────────────────────────────────────────────────────────────

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

interface ExamQuestion {
  id: number
  text: string
  options: string[]
  correctAnswer: number
}

const demoQuestions: ExamQuestion[] = [
  { id: 1, text: 'Quelle est la complexite temporelle de l\'algorithme de tri rapide dans le pire des cas ?', options: ['O(n log n)', 'O(n^2)', 'O(n)', 'O(log n)'], correctAnswer: 1 },
  { id: 2, text: 'Parmi les structures de donnees suivantes, laquelle permet un acces en temps constant O(1) ?', options: ['Liste chainee', 'Arbre binaire de recherche', 'Table de hachage', 'Pile'], correctAnswer: 2 },
  { id: 3, text: 'Le paradigme "diviser pour regner" est utilise dans lequel de ces algorithmes ?', options: ['Tri a bulles', 'Tri fusion', 'Tri par selection', 'Tri par insertion'], correctAnswer: 1 },
  { id: 4, text: 'Quelle est la difference principale entre une pile et une file ?', options: ['L\'ordre de traitement des elements', 'La taille maximale', 'Le type d\'elements stockes', 'La complexite d\'acces'], correctAnswer: 0 },
  { id: 5, text: 'Dans un graphe non oriente, un cycle eulerien existe si et seulement si :', options: ['Tous les sommets ont un degre pair', 'Le graphe est complet', 'Le graphe est connexe', 'Tous les sommets ont un degre impair'], correctAnswer: 0 },
  { id: 6, text: 'L\'algorithme de Dijkstra est applicable sur un graphe :', options: ['Avec des poids negatifs', 'Avec des poids positifs uniquement', 'Sans poids', 'Oriente uniquement'], correctAnswer: 1 },
  { id: 7, text: 'Quelle technique est utilisee pour resoudre les problemes de programmation dynamique ?', options: ['Backtracking', 'Memoization ou tabulation', 'Branch and bound', 'Glouton'], correctAnswer: 1 },
  { id: 8, text: 'Un arbre AVL est un arbre de recherche binaire :', options: ['Completement equilibre', 'Equilibre en hauteur', 'De degre 2', 'De profondeur minimale'], correctAnswer: 1 },
  { id: 9, text: 'La recherche dichotomique s\'applique sur une structure :', options: ['Non triee', 'Triee', 'Arbitraire', 'Circulaire'], correctAnswer: 1 },
  { id: 10, text: 'Quel algorithme permet de trouver le plus court chemin entre tous les couples de sommets ?', options: ['Dijkstra', 'Bellman-Ford', 'Floyd-Warshall', 'Kruskal'], correctAnswer: 2 },
  { id: 11, text: 'La complexite spatiale du tri fusion est :', options: ['O(1)', 'O(n)', 'O(log n)', 'O(n log n)'], correctAnswer: 1 },
  { id: 12, text: 'Un tas (heap) est une structure de donnees qui respecte la propriete :', options: ['FIFO', 'LIFO', 'Tas-min ou Tas-max', 'Priorite absolue'], correctAnswer: 2 },
  { id: 13, text: 'Lequel de ces algorithmes n\'est pas un algorithme de tri ?', options: ['Heap sort', 'Quick sort', 'Kruskal', 'Merge sort'], correctAnswer: 2 },
  { id: 14, text: 'La programmation gloutonne garantit toujours :', options: ['Une solution optimale', 'Une solution approximative', 'Aucune garantie', 'Un temps lineaire'], correctAnswer: 2 },
  { id: 15, text: 'Dans un arbre rouge-noir, la racine est toujours :', options: ['Rouge', 'Noire', 'Doublement noire', 'De couleur quelconque'], correctAnswer: 1 },
  { id: 16, text: 'L\'algorithme de Kruskal utilise quelle structure pour detecter les cycles ?', options: ['File de priorite', 'Union-Find', 'Table de hachage', 'Arbre AVL'], correctAnswer: 1 },
  { id: 17, text: 'Laquelle de ces propositions est vraie pour un arbre B ?', options: ['Toutes les feuilles sont au meme niveau', 'Il est toujours de degre 2', 'Il ne contient que des valeurs entieres', 'Il est toujours equilibre'], correctAnswer: 0 },
  { id: 18, text: 'Le probleme du voyageur de commerce est un probleme :', options: ['P', 'NP-complet', 'NP-difficile', 'Indecidable'], correctAnswer: 2 },
  { id: 19, text: 'Quelle est la complexite de la recherche dans un arbre binaire de recherche equilibre ?', options: ['O(n)', 'O(log n)', 'O(1)', 'O(n log n)'], correctAnswer: 1 },
  { id: 20, text: 'Le paradigme glouton pour le probleme du sac a dos :', options: ['Donne toujours la solution optimale', 'Donne une solution approchee', 'Ne s\'applique pas', 'Necessite la programmation dynamique'], correctAnswer: 1 },
]

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

const demoStudentResults: StudentResult[] = [
  { id: '1', name: 'ABAKAR Adam', matricule: 'UDN/L3/2024/001', score: 16.5, maxScore: 20, timeTaken: '1h 45min', status: 'Reussi', grade: 'Tres Bien' },
  { id: '2', name: 'KHAMIS Fatime', matricule: 'UDN/L3/2024/002', score: 14.2, maxScore: 20, timeTaken: '1h 52min', status: 'Reussi', grade: 'Bien' },
  { id: '3', name: 'MAHAMAT Youssouf', matricule: 'UDN/L3/2024/003', score: 11.8, maxScore: 20, timeTaken: '1h 58min', status: 'Reussi', grade: 'Assez Bien' },
  { id: '4', name: 'NGARNDMI Halime', matricule: 'UDN/L2/2024/004', score: 9.5, maxScore: 20, timeTaken: '2h 00min', status: 'Echoue', grade: 'Insuffisant' },
  { id: '5', name: 'HISSEIN Mariam', matricule: 'UDN/L2/2024/005', score: 15.0, maxScore: 20, timeTaken: '1h 30min', status: 'Reussi', grade: 'Bien' },
  { id: '6', name: 'ISSA Mahamat Nour', matricule: 'UDN/M1/2024/006', score: 17.8, maxScore: 20, timeTaken: '1h 20min', status: 'Reussi', grade: 'Tres Bien' },
  { id: '7', name: 'ADAM Khadija', matricule: 'UDN/L3/2024/007', score: 12.5, maxScore: 20, timeTaken: '1h 55min', status: 'Reussi', grade: 'Assez Bien' },
  { id: '8', name: 'BICHARA Hawa', matricule: 'UDN/L2/2024/008', score: 8.2, maxScore: 20, timeTaken: '1h 50min', status: 'Echoue', grade: 'Insuffisant' },
  { id: '9', name: 'SEID Ibrahim', matricule: 'UDN/M1/2024/009', score: 13.2, maxScore: 20, timeTaken: '1h 40min', status: 'Reussi', grade: 'Assez Bien' },
  { id: '10', name: 'DJIMADOUMBER Deubong', matricule: 'UDN/L2/2024/010', score: 10.0, maxScore: 20, timeTaken: '2h 00min', status: 'Reussi', grade: 'Passable' },
  { id: '11', name: 'NASSERINGAR Lea', matricule: 'UDN/L3/2024/011', score: 18.5, maxScore: 20, timeTaken: '1h 15min', status: 'Reussi', grade: 'Excellent' },
  { id: '12', name: 'OUMAR Abdoulaye', matricule: 'UDN/M2/2024/012', score: 7.0, maxScore: 20, timeTaken: '1h 30min', status: 'Echoue', grade: 'Insuffisant' },
  { id: '13', name: 'RAMADAN Halime', matricule: 'UDN/L2/2024/013', score: 14.8, maxScore: 20, timeTaken: '1h 48min', status: 'Reussi', grade: 'Bien' },
  { id: '14', name: 'ZENE Mahamat', matricule: 'UDN/M1/2024/014', score: 0, maxScore: 20, timeTaken: '-', status: 'En correction', grade: '-' },
  { id: '15', name: 'MALLAH Adoum', matricule: 'UDN/L1/2024/015', score: 11.2, maxScore: 20, timeTaken: '1h 59min', status: 'Reussi', grade: 'Assez Bien' },
]

interface FlaggedIncident {
  id: string
  studentName: string
  exam: string
  type: 'Changement onglet' | 'Tentative copie' | 'Anomalie temps' | 'IP differente' | 'Fenetre perdue'
  timestamp: string
  severity: 'Critique' | 'Elevee' | 'Moyenne'
}

const demoIncidents: FlaggedIncident[] = [
  { id: '1', studentName: 'ABAKAR Adam', exam: 'Examen Final - Algorithmique', type: 'Changement onglet', timestamp: '18/03/2025 09:12:34', severity: 'Elevee' },
  { id: '2', studentName: 'NGARNDMI Halime', exam: 'Examen Final - Algorithmique', type: 'Tentative copie', timestamp: '18/03/2025 09:25:17', severity: 'Critique' },
  { id: '3', studentName: 'BICHARA Hawa', exam: 'Examen TP - Programmation', type: 'Changement onglet', timestamp: '14/03/2025 14:45:22', severity: 'Moyenne' },
  { id: '4', studentName: 'OUMAR Abdoulaye', exam: 'Examen Final - Reseau', type: 'Anomalie temps', timestamp: '15/03/2025 08:10:05', severity: 'Elevee' },
  { id: '5', studentName: 'ZENE Mahamat', exam: 'Examen Final - Algorithmique', type: 'IP differente', timestamp: '18/03/2025 09:05:41', severity: 'Critique' },
]

interface BankQuestion {
  id: string
  text: string
  type: 'QCM' | 'Dissertation' | 'Vrai-Faux'
  difficulty: 'Facile' | 'Moyen' | 'Difficile'
  points: number
  usageCount: number
  course: string
}

const demoBankQuestions: BankQuestion[] = [
  { id: '1', text: 'Quelle est la complexite du tri rapide en moyenne ?', type: 'QCM', difficulty: 'Moyen', points: 2, usageCount: 45, course: 'Algorithmique' },
  { id: '2', text: 'Demontrer que le probleme du sac a dos est NP-complet', type: 'Dissertation', difficulty: 'Difficile', points: 5, usageCount: 12, course: 'Algorithmique' },
  { id: '3', text: 'Un arbre binaire de recherche equilibre a une hauteur en O(log n)', type: 'Vrai-Faux', difficulty: 'Facile', points: 1, usageCount: 78, course: 'Algorithmique' },
  { id: '4', text: 'Quelle est la difference entre pile et file ?', type: 'Dissertation', difficulty: 'Facile', points: 3, usageCount: 56, course: 'Structures de donnees' },
  { id: '5', text: 'L\'algorithme de Dijkstra fonctionne avec des poids negatifs', type: 'Vrai-Faux', difficulty: 'Moyen', points: 1, usageCount: 34, course: 'Graphe' },
  { id: '6', text: 'Parmi ces algorithmes, lequel est stable ?', type: 'QCM', difficulty: 'Moyen', points: 2, usageCount: 29, course: 'Algorithmique' },
  { id: '7', text: 'Expliquer le principe de la programmation dynamique', type: 'Dissertation', difficulty: 'Difficile', points: 4, usageCount: 67, course: 'Algorithmique' },
  { id: '8', text: 'Un tas est toujours un arbre complet', type: 'Vrai-Faux', difficulty: 'Facile', points: 1, usageCount: 42, course: 'Structures de donnees' },
  { id: '9', text: 'Quel algorithme de tri a la meilleure complexite dans le pire cas ?', type: 'QCM', difficulty: 'Difficile', points: 3, usageCount: 51, course: 'Algorithmique' },
  { id: '10', text: 'Comparer les approches gloutonnes et la programmation dynamique', type: 'Dissertation', difficulty: 'Difficile', points: 5, usageCount: 23, course: 'Algorithmique' },
]

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
  const { data: examsQuery, isLoading: examsLoading } = useOnlineExams()
  const upcomingExams: UpcomingExam[] = (examsQuery?.exams || []).map(mapExam)

  const examensPrevus = useCountUp(12, 1400)
  const tauxCompletion = useCountUp(87, 1300)

  // Active exam state
  const [currentQuestion, setCurrentQuestion] = useState(11) // 0-indexed, showing question 12
  const [answers, setAnswers] = useState<Record<number, number>>({ 0: 1, 1: 2, 2: 0, 4: 3, 5: 1, 6: 2, 7: 0, 9: 1, 10: 2, 11: 1 })
  const [flagged, setFlagged] = useState<Set<number>>(new Set([3, 8]))
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false)

  // Question bank state
  const [bankSearch, setBankSearch] = useState('')
  const [bankCourseFilter, setBankCourseFilter] = useState('tous')
  const [bankTypeFilter, setBankTypeFilter] = useState('tous')
  const [bankDiffFilter, setBankDiffFilter] = useState('tous')

  // Results filter
  const [resultSearch, setResultSearch] = useState('')

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(9930) // 2h 45m 30s

  useEffect(() => {
    const interval = setInterval(() => {
      setTimerSeconds(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const hours = Math.floor(timerSeconds / 3600)
  const minutes = Math.floor((timerSeconds % 3600) / 60)
  const seconds = timerSeconds % 60
  const timerDisplay = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  const totalQuestions = 20
  const answeredCount = Object.keys(answers).length
  const flaggedCount = flagged.size

  // Results statistics
  const validResults = demoStudentResults.filter(r => r.status !== 'En correction')
  const scores = validResults.map(r => r.score)
  const moyenne = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0
  const sortedScores = [...scores].sort((a, b) => a - b)
  const mediane = sortedScores.length > 0 ? sortedScores[Math.floor(sortedScores.length / 2)] : 0
  const minScore = sortedScores.length > 0 ? sortedScores[0] : 0
  const maxScore = sortedScores.length > 0 ? sortedScores[sortedScores.length - 1] : 0
  const variance = scores.length > 0 ? scores.reduce((sum, s) => sum + Math.pow(s - moyenne, 2), 0) / scores.length : 0
  const ecartType = Math.sqrt(variance)

  // Grade distribution
  const gradeDistribution = [
    { range: '0-4', count: 1, color: '#c62828' },
    { range: '4-8', count: 2, color: '#ea580c' },
    { range: '8-10', count: 1, color: '#d4a853' },
    { range: '10-12', count: 3, color: '#1a2744' },
    { range: '12-14', count: 3, color: '#2d7a4f' },
    { range: '14-16', count: 3, color: '#2d7a4f' },
    { range: '16-20', count: 2, color: '#1a2744' },
  ]
  const maxDistCount = Math.max(...gradeDistribution.map(d => d.count))

  // Filter bank questions
  const filteredBankQuestions = demoBankQuestions.filter(q => {
    const matchSearch = bankSearch === '' || q.text.toLowerCase().includes(bankSearch.toLowerCase())
    const matchCourse = bankCourseFilter === 'tous' || q.course === bankCourseFilter
    const matchType = bankTypeFilter === 'tous' || q.type === bankTypeFilter
    const matchDiff = bankDiffFilter === 'tous' || q.difficulty === bankDiffFilter
    return matchSearch && matchCourse && matchType && matchDiff
  })

  // Filter results
  const filteredResults = demoStudentResults.filter(r => {
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

  const handleAnswerSelect = (questionIndex: number, optionIndex: number) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: optionIndex }))
  }

  const handleFlag = (questionIndex: number) => {
    setFlagged(prev => {
      const next = new Set(prev)
      if (next.has(questionIndex)) {
        next.delete(questionIndex)
      } else {
        next.add(questionIndex)
      }
      return next
    })
  }

  const getQuestionStatus = (index: number): 'answered' | 'current' | 'flagged' | 'unanswered' => {
    if (index === currentQuestion) return 'current'
    if (flagged.has(index)) return 'flagged'
    if (answers[index] !== undefined) return 'answered'
    return 'unanswered'
  }

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
                  <Button size="sm" className="bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 text-white text-xs">
                    <Plus className="size-3.5 mr-1.5" />
                    Creer un examen
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs bg-white/10 backdrop-blur border-white/20 text-white hover:bg-white/20 hover:text-white">
                    <FileCheck className="size-3.5 mr-1.5" />
                    Mes examens
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs bg-white/10 backdrop-blur border-white/20 text-white hover:bg-white/20 hover:text-white" onClick={() => exportToExcel(filteredBankQuestions, 'export_online-exam')}>
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
                    <p className="text-xl font-bold text-[#2d7a4f] mt-1">3</p>
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
                  <Progress value={75} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#2d7a4f]" />
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
                    <p className="text-xl font-bold text-[#1a2744] mt-1">28</p>
                    <p className="text-xs text-gray-400 mt-1">Ce semestre</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#1a274415] flex items-center justify-center">
                    <CheckCircle2 className="size-5 text-[#1a2744]" />
                  </div>
                </div>
                <div className="mt-3">
                  <Progress value={70} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#1a2744]" />
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
                    <p className="text-xl font-bold text-[#d4a853] mt-1">13.2/20</p>
                    <p className="text-xs text-gray-400 mt-1">Tous examens confondus</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#d4a85315] flex items-center justify-center">
                    <BarChart3 className="size-5 text-[#d4a853]" />
                  </div>
                </div>
                <div className="mt-3">
                  <Progress value={66} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#d4a853]" />
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
                    <p className="text-xl font-bold text-[#2d7a4f] mt-1">72%</p>
                    <p className="text-xs text-[#2d7a4f] mt-1 font-medium flex items-center gap-1">
                      <TrendingUp className="size-3" />
                      +4% vs precedent
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#2d7a4f15] flex items-center justify-center">
                    <TrendingUp className="size-5 text-[#2d7a4f]" />
                  </div>
                </div>
                <div className="mt-3">
                  <Progress value={72} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#2d7a4f]" />
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
                              <Button size="sm" className="h-7 text-[10px] bg-[#2d7a4f] hover:bg-[#236b40] text-white">
                                Commencer
                              </Button>
                            ) : exam.status === 'En cours' ? (
                              <Button size="sm" variant="outline" className="h-7 text-[10px] border-[#2d7a4f30] text-[#2d7a4f]">
                                Reprendre
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" className="h-7 text-[10px] text-gray-600">
                                Voir resultats
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

        {/* ── Active Exam Interface Card ──────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-[#2d7a4f]">
            <div className="h-1 bg-gradient-to-r from-[#2d7a4f] to-[#3da66a]" />
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <Monitor className="size-4 text-[#2d7a4f]" />
                  Examen en cours - Interface de passation
                </CardTitle>
                <div className="flex items-center gap-3">
                  {/* Timer */}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1a274410] border border-[#1a274420]">
                    <motion.div
                      className="w-2 h-2 rounded-full bg-[#c62828]"
                      animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <Timer className="size-4 text-[#1a2744]" />
                    <span className="text-sm font-bold text-[#1a2744] font-mono">{timerDisplay}</span>
                  </div>
                  <Badge className="text-[10px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">
                    Auto-sauvegarde active
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Main question area */}
                <div className="flex-1">
                  {/* Exam title */}
                  <div className="mb-4 p-3 rounded-lg bg-[#1a274408] border border-[#1a274415]">
                    <h3 className="text-sm font-bold text-[#1a2744]">Examen Final - Algorithmique Avancee</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Semestre S2 2024-2025 | 20 questions | 2h00</p>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Progression</span>
                      <span className="text-xs font-semibold text-[#2d7a4f]">{answeredCount}/{totalQuestions} repondues</span>
                    </div>
                    <Progress value={(answeredCount / totalQuestions) * 100} className="h-2 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-[#2d7a4f] [&>[data-slot=progress-indicator]]:to-[#3da66a]" />
                  </div>

                  {/* Current question */}
                  <div className="p-4 rounded-lg border border-gray-200 bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-[#1a2744] bg-[#1a274410] px-2 py-1 rounded">
                        Question {currentQuestion + 1} / {totalQuestions}
                      </span>
                      <button
                        onClick={() => handleFlag(currentQuestion)}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                          flagged.has(currentQuestion)
                            ? 'bg-[#d4a85315] text-[#d4a853]'
                            : 'bg-gray-100 text-gray-500 hover:bg-[#d4a85315] hover:text-[#d4a853]'
                        }`}
                      >
                        <Flag className="size-3" />
                        {flagged.has(currentQuestion) ? 'Signalee' : 'Signaler'}
                      </button>
                    </div>
                    <p className="text-sm text-[#1a2744] font-medium mb-4 leading-relaxed">
                      {demoQuestions[currentQuestion]?.text}
                    </p>
                    <div className="space-y-2">
                      {demoQuestions[currentQuestion]?.options.map((option, idx) => (
                        <label
                          key={idx}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            answers[currentQuestion] === idx
                              ? 'border-[#2d7a4f] bg-[#2d7a4f08]'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`question-${currentQuestion}`}
                            checked={answers[currentQuestion] === idx}
                            onChange={() => handleAnswerSelect(currentQuestion, idx)}
                            className="accent-[#2d7a4f]"
                          />
                          <span className="text-sm text-gray-700">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Navigation buttons */}
                  <div className="flex items-center justify-between mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs border-gray-200"
                      onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                      disabled={currentQuestion === 0}
                    >
                      <ChevronLeft className="size-3.5 mr-1" />
                      Precedente
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-[#d4a85330] text-[#d4a853]"
                        onClick={() => handleFlag(currentQuestion)}
                      >
                        <Flag className="size-3.5 mr-1" />
                        Signaler pour revision
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      className="text-xs bg-[#1a2744] hover:bg-[#1a2744]/90 text-white"
                      onClick={() => setCurrentQuestion(prev => Math.min(totalQuestions - 1, prev + 1))}
                      disabled={currentQuestion === totalQuestions - 1}
                    >
                      Suivante
                      <ChevronRight className="size-3.5 ml-1" />
                    </Button>
                  </div>

                  {/* Submit button */}
                  <div className="mt-4 flex justify-end">
                    <div className="relative">
                      <Button
                        size="sm"
                        className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs"
                        onClick={() => setShowConfirmSubmit(true)}
                      >
                        <Send className="size-3.5 mr-1.5" />
                        Soumettre l&apos;examen
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Side panel - Question map */}
                <div className="lg:w-56 shrink-0">
                  <div className="p-3 rounded-lg border border-gray-200 bg-gray-50 sticky top-4">
                    <h4 className="text-xs font-semibold text-[#1a2744] mb-3">Carte des questions</h4>
                    <div className="grid grid-cols-5 gap-1.5">
                      {Array.from({ length: totalQuestions }, (_, i) => {
                        const status = getQuestionStatus(i)
                        const colorMap: Record<string, string> = {
                          answered: 'bg-[#2d7a4f] text-white',
                          current: 'bg-[#1a2744] text-white ring-2 ring-[#1a274430]',
                          flagged: 'bg-[#d4a853] text-white',
                          unanswered: 'bg-gray-200 text-gray-500',
                        }
                        return (
                          <Tooltip key={i}>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => setCurrentQuestion(i)}
                                className={`w-8 h-8 rounded text-[10px] font-bold flex items-center justify-center transition-all hover:scale-110 ${colorMap[status]}`}
                              >
                                {i + 1}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Question {i + 1} - {
                                status === 'answered' ? 'Repondu' :
                                status === 'current' ? 'En cours' :
                                status === 'flagged' ? 'Signale' :
                                'Non repondu'
                              }</p>
                            </TooltipContent>
                          </Tooltip>
                        )
                      })}
                    </div>
                    {/* Legend */}
                    <div className="mt-3 space-y-1.5 pt-3 border-t border-gray-200">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-[#2d7a4f]" />
                        <span className="text-[10px] text-gray-600">Repondu ({answeredCount})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-[#1a2744]" />
                        <span className="text-[10px] text-gray-600">En cours</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-[#d4a853]" />
                        <span className="text-[10px] text-gray-600">Signale ({flaggedCount})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded bg-gray-200" />
                        <span className="text-[10px] text-gray-600">Non repondu ({totalQuestions - answeredCount - 1})</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Submit confirmation modal */}
        <AnimatePresence>
          {showConfirmSubmit && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setShowConfirmSubmit(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-[#d4a85315] flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle className="size-7 text-[#d4a853]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#1a2744] mb-2">Confirmer la soumission</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Vous avez repondu a {answeredCount} questions sur {totalQuestions}.
                    {answeredCount < totalQuestions && (
                      <span className="text-[#c62828] font-medium"> {totalQuestions - answeredCount} questions restent sans reponse.</span>
                    )}
                  </p>
                  {flaggedCount > 0 && (
                    <p className="text-xs text-[#d4a853] mb-3 flex items-center justify-center gap-1">
                      <Flag className="size-3" /> {flaggedCount} question(s) signalee(s) pour revision
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => setShowConfirmSubmit(false)}
                    >
                      Continuer l&apos;examen
                    </Button>
                    <Button
                      className="flex-1 bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs"
                      onClick={() => setShowConfirmSubmit(false)}
                    >
                      <Send className="size-3.5 mr-1.5" />
                      Confirmer
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
                  <Button size="sm" variant="outline" className="text-xs border-[#1a274430] text-[#1a2744] hover:bg-[#1a274408]" onClick={() => exportToExcel(filteredBankQuestions, 'export_online-exam')}>
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
                    {filteredResults.map((result) => {
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
                    Anti-fraude & Surveillance
                  </CardTitle>
                  <Badge className="text-[10px] bg-red-500/10 text-red-600 border-0">
                    <Lock className="size-3 mr-1" />
                    Securise
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Security features */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: Eye, text: 'Navigation entre onglets detectee', active: true },
                    { icon: Lock, text: 'Copie interdite', active: true },
                    { icon: Timer, text: 'Chronometre strict', active: true },
                    { icon: Globe, text: 'IP tracking', active: true },
                  ].map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded bg-[#2d7a4f08] border border-[#2d7a4f15]">
                      <feature.icon className="size-3.5 text-[#2d7a4f] shrink-0" />
                      <span className="text-[10px] text-gray-700 leading-tight">{feature.text}</span>
                      <CheckCircle2 className="size-3 text-[#2d7a4f] ml-auto shrink-0" />
                    </div>
                  ))}
                </div>

                {/* Auto-submit rules */}
                <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                  <p className="text-xs font-semibold text-red-700 mb-1">Regles de soumission automatique</p>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-600">Changements d&apos;onglet maximum</span>
                      <span className="text-[10px] font-bold text-red-600">3 = soumission auto</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-600">Tentatives de copie autorisees</span>
                      <span className="text-[10px] font-bold text-red-600">0</span>
                    </div>
                  </div>
                </div>

                {/* Flagged incidents */}
                <div>
                  <p className="text-xs font-semibold text-[#1a2744] mb-2">Incidents signales</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {demoIncidents.map((incident) => {
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
                  <Button size="sm" className="h-7 text-[10px] bg-[#2d7a4f] hover:bg-[#236b40] text-white">
                    <Plus className="size-3 mr-1" />
                    Ajouter une question
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
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
                        <SelectItem value="Algorithmique">Algorithmique</SelectItem>
                        <SelectItem value="Structures de donnees">Structures de donnees</SelectItem>
                        <SelectItem value="Graphe">Graphe</SelectItem>
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

        {/* ── African Context Card ────────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-[#2d7a4f]">
            <div className="h-1 bg-gradient-to-r from-[#1a2744] via-[#2d7a4f] to-[#d4a853]" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <Globe className="size-4 text-[#2d7a4f]" />
                  Contexte africain - Adaptations
                </CardTitle>
                <Badge className="text-[10px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">Optimise Afrique</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Low bandwidth mode */}
                <div className="p-4 rounded-lg bg-[#2d7a4f08] border border-[#2d7a4f15]">
                  <div className="flex items-center gap-2 mb-2">
                    <Wifi className="size-4 text-[#2d7a4f]" />
                    <span className="text-sm font-semibold text-[#1a2744]">Faible bande passante</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Chargement question par question (et non tout d&apos;un coup). Reduit la consommation de donnees et accelere le chargement sur les connexions lentes.
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge className="text-[9px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">Actif</Badge>
                    <span className="text-[10px] text-gray-400">~50 Ko/question</span>
                  </div>
                </div>

                {/* Auto-save */}
                <div className="p-4 rounded-lg bg-[#1a274408] border border-[#1a274415]">
                  <div className="flex items-center gap-2 mb-2">
                    <Save className="size-4 text-[#1a2744]" />
                    <span className="text-sm font-semibold text-[#1a2744]">Sauvegarde automatique</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Sauvegarde automatique des reponses toutes les 30 secondes. Protection contre les pertes de connexion et les coupures de courant.
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <motion.div
                      className="w-2 h-2 rounded-full bg-[#2d7a4f]"
                      animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <span className="text-[10px] text-[#2d7a4f]">Derniere sauvegarde il y a 12s</span>
                  </div>
                </div>

                {/* Offline mode */}
                <div className="p-4 rounded-lg bg-[#d4a85308] border border-[#d4a85315]">
                  <div className="flex items-center gap-2 mb-2">
                    <WifiOff className="size-4 text-[#d4a853]" />
                    <span className="text-sm font-semibold text-[#1a2744]">Mode hors ligne</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Les questions sont mises en cache localement. En cas de perte de connexion, l&apos;etudiant peut continuer l&apos;examen. Synchronisation automatique au retour de la connexion.
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge className="text-[9px] bg-[#d4a85315] text-[#d4a853] border-0">Pret</Badge>
                    <span className="text-[10px] text-gray-400">Cache local active</span>
                  </div>
                </div>

                {/* SMS notification */}
                <div className="p-4 rounded-lg bg-[#2d7a4f08] border border-[#2d7a4f15]">
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="size-4 text-[#2d7a4f]" />
                    <span className="text-sm font-semibold text-[#1a2744]">Notification SMS</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Envoi de SMS pour le debut et la fin de l&apos;examen, ainsi que les rappels. Compatible avec les reseaux Airtel, Moov et Orange.
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white border border-gray-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      <span className="text-[9px] text-gray-600">Airtel</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white border border-gray-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <span className="text-[9px] text-gray-600">Moov</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white border border-gray-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      <span className="text-[9px] text-gray-600">Orange</span>
                    </div>
                  </div>
                </div>

                {/* Paper fallback */}
                <div className="p-4 rounded-lg bg-[#1a274408] border border-[#1a274415]">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="size-4 text-[#1a2744]" />
                    <span className="text-sm font-semibold text-[#1a2744]">Option papier</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Alternative papier disponible pour les etudiants sans appareil compatible ou en cas de panne technique. Generation automatique des copies.
                  </p>
                  <div className="mt-2">
                    <Badge className="text-[9px] bg-[#1a274415] text-[#1a2744] border-0">Disponible</Badge>
                  </div>
                </div>

                {/* Timer tolerance */}
                <div className="p-4 rounded-lg bg-[#d4a85308] border border-[#d4a85315]">
                  <div className="flex items-center gap-2 mb-2">
                    <Timer className="size-4 text-[#d4a853]" />
                    <span className="text-sm font-semibold text-[#1a2744]">Tolerance horloge</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    +5 minutes supplementaires pour les connexions lentes. Le chronometre s&apos;adapte automatiquement a la qualite de la connexion detectee.
                  </p>
                  <div className="mt-2">
                    <Badge className="text-[9px] bg-[#d4a85315] text-[#d4a853] border-0">+5 min auto</Badge>
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


