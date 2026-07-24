'use client'

import { exportToExcel } from '@/lib/export'
import { useState, useEffect, useRef } from 'react'
import { useAttendance } from '@/lib/api-hooks'
import { motion } from 'framer-motion'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ClipboardCheck,
  UserX,
  TrendingUp,
  AlertTriangle,
  Plus,
  FileCheck,
  Download,
  Search,
  MoreHorizontal,
  Eye,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
  FileText,
  Smartphone,
  Mail,
  Printer,
  BarChart3,
  Sun,
  Moon,
  Shield,
  Bell,
} from 'lucide-react'

// ─── Demo Data ────────────────────────────────────────────────────────────────

type AttendanceStatus = 'Present' | 'Absent' | 'Justifie' | 'Retard'

interface AttendanceRecord {
  id: string
  studentName: string
  matricule: string
  course: string
  timeSlot: string
  status: AttendanceStatus
  duration: string
  justification: string
  program: string
  level: string
}

// ─── API Mapping ────────────────────────────────────────────────────────────

interface ApiAttendanceRecord {
  id: string
  studentName: string
  matricule: string
  course: string
  timeSlot: string
  status: 'PRESENT' | 'ABSENT' | 'JUSTIFIED' | 'LATE'
  duration: string | null
  justification: string | null
  program: string | null
  level: string | null
  date: string
}

const apiStatusToUi: Record<ApiAttendanceRecord['status'], AttendanceStatus> = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  JUSTIFIED: 'Justifie',
  LATE: 'Retard',
}

function mapAttendance(record: ApiAttendanceRecord): AttendanceRecord {
  return {
    id: record.id,
    studentName: record.studentName,
    matricule: record.matricule,
    course: record.course,
    timeSlot: record.timeSlot,
    status: apiStatusToUi[record.status] || 'Present',
    duration: record.duration || '-',
    justification: record.justification || '-',
    program: record.program || '',
    level: record.level || '',
  }
}

interface JustificationEntry {
  id: string
  studentName: string
  matricule: string
  dates: string
  reason: string
  documentType: string
  status: 'en_attente' | 'validee' | 'rejetee'
}

const demoJustifications: JustificationEntry[] = [
  { id: '1', studentName: 'HAWA Ngarndmi', matricule: 'UDN/L1/2024/004', dates: '03-05 Mars 2025', reason: 'Maladie - certificat medical', documentType: 'Certificat', status: 'en_attente' },
  { id: '2', studentName: 'OUMAR Abdoulaye', matricule: 'UDN/L2/2024/010', dates: '10 Mars 2025', reason: 'Deces dans la famille', documentType: 'Attestation', status: 'en_attente' },
  { id: '3', studentName: 'ZENE Mahamat', matricule: 'UDN/L1/2024/016', dates: '07 Mars 2025', reason: 'Convocation officielle', documentType: 'Convocation', status: 'en_attente' },
  { id: '4', studentName: 'ABDOULAYE Ibrahim', matricule: 'UDN/L2/2024/002', dates: '01-02 Mars 2025', reason: 'Probleme de transport', documentType: 'Attestation', status: 'en_attente' },
  { id: '5', studentName: 'KHAMIS Fatime', matricule: 'UDN/L3/2024/014', dates: '25 Fev 2025', reason: 'Consultation medicale', documentType: 'Certificat', status: 'validee' },
  { id: '6', studentName: 'SEID Ibrahim', matricule: 'UDN/L1/2024/012', dates: '20 Fev 2025', reason: 'Raison non justifiee', documentType: 'Aucun', status: 'rejetee' },
]

interface SanctionEntry {
  id: string
  studentName: string
  matricule: string
  absencesWeek: number
  totalAbsences: number
  level: 'avertissement' | 'mise_en_demeure' | 'exclusion'
  program: string
}

const demoSanctions: SanctionEntry[] = [
  { id: '1', studentName: 'ABDOULAYE Ibrahim', matricule: 'UDN/L2/2024/002', absencesWeek: 4, totalAbsences: 12, level: 'mise_en_demeure', program: 'Droit' },
  { id: '2', studentName: 'SEID Ibrahim', matricule: 'UDN/L1/2024/012', absencesWeek: 3, totalAbsences: 9, level: 'avertissement', program: 'Medecine' },
  { id: '3', studentName: 'RAMADAN Halime', matricule: 'UDN/L2/2024/017', absencesWeek: 3, totalAbsences: 7, level: 'avertissement', program: 'Informatique' },
  { id: '4', studentName: 'BICHARA Abdelkerim', matricule: 'UDN/M2/2024/007', absencesWeek: 5, totalAbsences: 15, level: 'mise_en_demeure', program: 'Economie' },
  { id: '5', studentName: 'MALLAH Adoum', matricule: 'UDN/L1/2024/020', absencesWeek: 8, totalAbsences: 22, level: 'exclusion', program: 'Medecine' },
]

const weeklyData = [
  { day: 'Lun', rate: 95, hours: 24 },
  { day: 'Mar', rate: 92, hours: 22 },
  { day: 'Mer', rate: 88, hours: 20 },
  { day: 'Jeu', rate: 91, hours: 23 },
  { day: 'Ven', rate: 78, hours: 18 },
  { day: 'Sam', rate: 65, hours: 8 },
]

const courseStats = [
  { course: 'Algorithmique avancee', rate: 96, color: '#2d7a4f', students: 45 },
  { course: 'Droit constitutionnel', rate: 88, color: '#1a2744', students: 62 },
  { course: 'Macroeconomie', rate: 82, color: '#d4a853', students: 38 },
  { course: 'Anatomie P1', rate: 91, color: '#2d7a4f', students: 55 },
  { course: 'Bases de donnees', rate: 94, color: '#2d7a4f', students: 42 },
  { course: 'Droit civil', rate: 85, color: '#1a2744', students: 58 },
  { course: 'Physiologie', rate: 79, color: '#d4a853', students: 50 },
  { course: 'Reseau et systeme', rate: 93, color: '#2d7a4f', students: 40 },
]

const monthlyTrend = [
  { month: 'Oct', rate: 89 },
  { month: 'Nov', rate: 91 },
  { month: 'Dec', rate: 85 },
  { month: 'Jan', rate: 92 },
  { month: 'Fev', rate: 90 },
  { month: 'Mar', rate: 93 },
]

// ─── Config Maps ──────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType; bgColor: string }> = {
  'Present': { label: 'Present', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0', icon: CheckCircle2, bgColor: 'bg-[#2d7a4f05]' },
  'Absent': { label: 'Absent', className: 'bg-[#c6282815] text-[#c62828] border-0', icon: XCircle, bgColor: 'bg-[#c6282808]' },
  'Justifie': { label: 'Justifie', className: 'bg-[#d4a85315] text-[#d4a853] border-0', icon: FileCheck, bgColor: 'bg-[#d4a85308]' },
  'Retard': { label: 'Retard', className: 'bg-[#1a274415] text-[#1a2744] border-0', icon: Clock, bgColor: 'bg-[#1a274408]' },
}

const sanctionConfig: Record<string, { label: string; className: string; pulseColor: string }> = {
  'avertissement': { label: 'Avertissement', className: 'bg-[#d4a85315] text-[#d4a853] border-0', pulseColor: '#d4a853' },
  'mise_en_demeure': { label: 'Mise en demeure', className: 'bg-[#ea580c15] text-[#ea580c] border-0', pulseColor: '#ea580c' },
  'exclusion': { label: 'Exclusion', className: 'bg-[#c6282815] text-[#c62828] border-0', pulseColor: '#c62828' },
}

const justificationStatusConfig: Record<string, { label: string; className: string }> = {
  'en_attente': { label: 'En attente', className: 'bg-[#d4a85315] text-[#d4a853] border-0' },
  'validee': { label: 'Validee', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' },
  'rejetee': { label: 'Rejetee', className: 'bg-[#c6282815] text-[#c62828] border-0' },
}

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

// ─── Component ────────────────────────────────────────────────────────────────

export function AttendancePage() {
  const presencesCount = useCountUp(1247, 1400)
  const tauxPresence = useCountUp(93, 1300)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDate, setFilterDate] = useState('tous')
  const [filterProgram, setFilterProgram] = useState('tous')
  const [filterCourse, setFilterCourse] = useState('tous')
  const [filterStatus, setFilterStatus] = useState('tous')
  const [filterLevel, setFilterLevel] = useState('tous')
  const { data: attendanceQuery, isLoading } = useAttendance()
  const attendanceRecords: AttendanceRecord[] = (attendanceQuery?.records || []).map(mapAttendance)
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([])
  const [justificationData, setJustificationData] = useState(demoJustifications)
  const [offlineMode, setOfflineMode] = useState(false)

  useEffect(() => {
    setAttendanceData(attendanceRecords)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendanceQuery])

  // Toggle attendance status
  const toggleStatus = (id: string) => {
    setAttendanceData(prev => prev.map(record => {
      if (record.id !== id) return record
      const statusOrder: AttendanceStatus[] = ['Present', 'Absent', 'Justifie', 'Retard']
      const currentIdx = statusOrder.indexOf(record.status)
      const nextStatus = statusOrder[(currentIdx + 1) % statusOrder.length]
      return { ...record, status: nextStatus, duration: nextStatus === 'Present' ? '2h' : nextStatus === 'Retard' ? '1h' : '-', justification: nextStatus === 'Justifie' ? 'A justifier' : '-' }
    }))
  }

  // Approve justification
  const approveJustification = (id: string) => {
    setJustificationData(prev => prev.map(j =>
      j.id === id ? { ...j, status: 'validee' as const } : j
    ))
  }

  // Reject justification
  const rejectJustification = (id: string) => {
    setJustificationData(prev => prev.map(j =>
      j.id === id ? { ...j, status: 'rejetee' as const } : j
    ))
  }

  // Filter records
  const filteredRecords = attendanceData.filter(r => {
    const matchSearch = searchTerm === '' ||
      r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.matricule.toLowerCase().includes(searchTerm.toLowerCase())
    const matchProgram = filterProgram === 'tous' || r.program === filterProgram
    const matchCourse = filterCourse === 'tous' || r.course === filterCourse
    const matchStatus = filterStatus === 'tous' || r.status === filterStatus
    const matchLevel = filterLevel === 'tous' || r.level === filterLevel
    return matchSearch && matchProgram && matchCourse && matchStatus && matchLevel
  })

  // Compute stats
  const presentCount = attendanceData.filter(r => r.status === 'Present').length
  const absentCount = attendanceData.filter(r => r.status === 'Absent').length
  const justifieCount = attendanceData.filter(r => r.status === 'Justifie').length
  const retardCount = attendanceData.filter(r => r.status === 'Retard').length
  void Math.round(((presentCount + retardCount) / attendanceData.length) * 100)
  void absentCount

  // Weekly totals
  const totalWeeklyHours = weeklyData.reduce((sum, d) => sum + d.hours, 0)
  const avgWeeklyRate = Math.round(weeklyData.reduce((sum, d) => sum + d.rate, 0) / weeklyData.length)

  // Justification stats
  const justEnAttente = justificationData.filter(j => j.status === 'en_attente').length
  const justValidees = justificationData.filter(j => j.status === 'validee').length
  const justRejetees = justificationData.filter(j => j.status === 'rejetee').length

  // Time slot analysis
  const morningRate = 91
  const afternoonRate = 86

  // Animation variants
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

  // Unique courses for filter
  const uniqueCourses = [...new Set(attendanceData.map(r => r.course))]

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
            <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '24px 24px'}} />
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-white">Suivi des presences en temps reel</h1>
                  <p className="text-sm text-white/70 mt-1">Gestion quotidienne des absences et justifications</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" className="bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 text-white text-xs">
                    <Plus className="size-3.5 mr-1.5" />
                    Nouveau signalement
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs bg-white/10 backdrop-blur border-white/20 text-white hover:bg-white/20 hover:text-white">
                    <FileCheck className="size-3.5 mr-1.5" />
                    Justifier une absence
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs bg-white/10 backdrop-blur border-white/20 text-white hover:bg-white/20 hover:text-white" onClick={() => exportToExcel(filteredRecords, 'export_attendance')}>
                    <Download className="size-3.5 mr-1.5" />
                    Exporter
                  </Button>
                </div>
              </div>
              {/* Glass-morphism stat cards */}
              <div className="flex gap-4 mt-4">
                <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }} className="bg-white/10 backdrop-blur border border-white/15 rounded-lg px-4 py-3">
                  <div className="text-white/60 text-xs">Presences aujourd&apos;hui</div>
                  <div className="text-white text-2xl font-bold">{presencesCount.toLocaleString()}</div>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }} className="bg-white/10 backdrop-blur border border-white/15 rounded-lg px-4 py-3">
                  <div className="text-white/60 text-xs">Taux de presence</div>
                  <div className="text-white text-2xl font-bold">{tauxPresence}%</div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── 4 Stats Cards ──────────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Presences aujourd'hui */}
          <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
          <Card className="overflow-hidden relative border-l-4 border-l-[#2d7a4f] hover:shadow-lg transition-shadow">
            <div className="h-1 bg-gradient-to-r from-[#2d7a4f] to-[#3da66a]" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#2d7a4f08] to-[#2d7a4f00] pointer-events-none" />
            <CardContent className="p-4 relative">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Presences aujourd&apos;hui</p>
                  <p className="text-xl font-bold text-[#2d7a4f] mt-1">1,247</p>
                  <p className="text-xs text-[#2d7a4f] mt-1 font-medium flex items-center gap-1">
                    <TrendingUp className="size-3" />
                    +2.3% vs hier
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#2d7a4f15] flex items-center justify-center">
                  <ClipboardCheck className="size-5 text-[#2d7a4f]" />
                </div>
              </div>
              <div className="mt-3">
                <Progress value={93} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#2d7a4f]" />
              </div>
            </CardContent>
          </Card>
          </motion.div>

          {/* Absences signalees */}
          <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
          <Card className="overflow-hidden relative border-l-4 border-l-[#1a2744] hover:shadow-lg transition-shadow">
            <div className="h-1 bg-gradient-to-r from-[#1a2744] to-[#2d3e5e]" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a274408] to-[#1a274400] pointer-events-none" />
            <CardContent className="p-4 relative">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Absences signalees</p>
                  <p className="text-xl font-bold text-[#1a2744] mt-1">89</p>
                  <p className="text-xs text-[#2d7a4f] mt-1 font-medium flex items-center gap-1">
                    <TrendingUp className="size-3 rotate-180" />
                    -5% vs hier
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#1a274415] flex items-center justify-center">
                  <UserX className="size-5 text-[#1a2744]" />
                </div>
              </div>
              <div className="mt-3">
                <Progress value={7} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#1a2744]" />
              </div>
            </CardContent>
          </Card>
          </motion.div>

          {/* Taux de presence */}
          <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
          <Card className="overflow-hidden relative border-l-4 border-l-[#d4a853] hover:shadow-lg transition-shadow">
            <div className="h-1 bg-gradient-to-r from-[#d4a853] to-[#e6c477]" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#d4a85308] to-[#d4a85300] pointer-events-none" />
            <CardContent className="p-4 relative">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Taux de presence</p>
                  <p className="text-xl font-bold text-[#d4a853] mt-1">93%</p>
                  <p className="text-xs text-[#2d7a4f] mt-1 font-medium flex items-center gap-1">
                    <TrendingUp className="size-3" />
                    +1% vs precedent
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#d4a85315] flex items-center justify-center">
                  <BarChart3 className="size-5 text-[#d4a853]" />
                </div>
              </div>
              <div className="mt-3">
                <Progress value={93} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#d4a853]" />
              </div>
            </CardContent>
          </Card>
          </motion.div>

          {/* Absences non justifiees */}
          <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
          <Card className="overflow-hidden relative border-l-4 border-l-[#ef4444] hover:shadow-lg transition-shadow">
            <div className="h-1 bg-gradient-to-r from-[#ef4444] to-[#f87171]" />
            <div className="absolute inset-0 bg-gradient-to-br from-[#ef444408] to-[#ef444400] pointer-events-none" />
            <CardContent className="p-4 relative">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Absences non justifiees</p>
                  <p className="text-xl font-bold text-[#ef4444] mt-1">34</p>
                  <p className="text-xs text-gray-400 mt-1">A traiter en priorite</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#ef444415] flex items-center justify-center">
                  <AlertTriangle className="size-5 text-[#ef4444]" />
                </div>
              </div>
              <div className="mt-3">
                <Progress value={38} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#ef4444]" />
              </div>
            </CardContent>
          </Card>
          </motion.div>
        </motion.div>

        {/* ── Filter & Search Bar ──────────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher par nom d'etudiant, matricule..."
                    className="pl-9 h-9 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Select value={filterDate} onValueChange={setFilterDate}>
                    <SelectTrigger className="w-[130px] h-9 text-xs">
                      <Calendar className="size-3.5 mr-1 text-gray-400" />
                      <SelectValue placeholder="Date" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tous">Toutes dates</SelectItem>
                      <SelectItem value="aujourdhui">Aujourd&apos;hui</SelectItem>
                      <SelectItem value="semaine">Cette semaine</SelectItem>
                      <SelectItem value="mois">Ce mois</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterProgram} onValueChange={setFilterProgram}>
                    <SelectTrigger className="w-[130px] h-9 text-xs">
                      <SelectValue placeholder="Programme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tous">Tous programmes</SelectItem>
                      <SelectItem value="Informatique">Informatique</SelectItem>
                      <SelectItem value="Droit">Droit</SelectItem>
                      <SelectItem value="Medecine">Medecine</SelectItem>
                      <SelectItem value="Economie">Economie</SelectItem>
                      <SelectItem value="Lettres">Lettres</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterCourse} onValueChange={setFilterCourse}>
                    <SelectTrigger className="w-[160px] h-9 text-xs">
                      <SelectValue placeholder="Cours" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tous">Tous les cours</SelectItem>
                      {uniqueCourses.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[120px] h-9 text-xs">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tous">Tous statuts</SelectItem>
                      <SelectItem value="Present">Present</SelectItem>
                      <SelectItem value="Absent">Absent</SelectItem>
                      <SelectItem value="Justifie">Justifie</SelectItem>
                      <SelectItem value="Retard">Retard</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterLevel} onValueChange={setFilterLevel}>
                    <SelectTrigger className="w-[100px] h-9 text-xs">
                      <SelectValue placeholder="Niveau" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tous">Tous niveaux</SelectItem>
                      <SelectItem value="L1">L1</SelectItem>
                      <SelectItem value="L2">L2</SelectItem>
                      <SelectItem value="L3">L3</SelectItem>
                      <SelectItem value="M1">M1</SelectItem>
                      <SelectItem value="M2">M2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Daily Attendance Table ──────────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-[#2d7a4f]">
            <div className="h-1 bg-gradient-to-r from-[#1a2744] via-[#2d7a4f] to-[#d4a853]" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-[#1a2744]">Presences du jour - {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className="text-[10px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">
                    <CheckCircle2 className="size-3 mr-1" />
                    {presentCount} presents
                  </Badge>
                  <Badge className="text-[10px] bg-[#c6282815] text-[#c62828] border-0">
                    <XCircle className="size-3 mr-1" />
                    {absentCount} absents
                  </Badge>
                  <Badge className="text-[10px] bg-[#d4a85315] text-[#d4a853] border-0">
                    <FileCheck className="size-3 mr-1" />
                    {justifieCount} justifies
                  </Badge>
                  <Badge className="text-[10px] bg-[#1a274415] text-[#1a2744] border-0">
                    <Clock className="size-3 mr-1" />
                    {retardCount} retards
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="overflow-x-auto rounded-lg border border-gray-100 max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 sticky top-0 z-10">
                      <TableHead className="text-xs font-semibold">Etudiant</TableHead>
                      <TableHead className="text-xs font-semibold">Cours</TableHead>
                      <TableHead className="text-xs font-semibold">Creneau</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Statut</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Duree</TableHead>
                      <TableHead className="text-xs font-semibold">Justification</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record, rIdx) => {
                      const sConf = statusConfig[record.status]
                      return (
                        <motion.tr
                          key={record.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: rIdx * 0.04, duration: 0.3, ease: 'easeOut' }}
                          className={`hover:bg-[#2d7a4f05] transition-colors cursor-pointer ${sConf ? sConf.bgColor : ''}`}
                          onClick={() => toggleStatus(record.id)}
                        >
                          <TableCell className="py-2.5">
                            <div>
                              <p className="text-sm font-medium text-[#1a2744]">{record.studentName}</p>
                              <p className="text-[10px] text-gray-400 font-mono">{record.matricule}</p>
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <p className="text-xs text-gray-600">{record.course}</p>
                            <p className="text-[10px] text-gray-400">{record.program}</p>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <div className="flex items-center gap-1">
                              <Clock className="size-3 text-gray-400" />
                              <span className="text-xs text-gray-600">{record.timeSlot}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5 text-center">
                            {sConf ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge className={`text-[10px] cursor-pointer hover:opacity-80 transition-opacity ${sConf.className}`}>
                                    <sConf.icon className="size-3 mr-1" />
                                    {sConf.label}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Cliquer pour changer le statut</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : null}
                          </TableCell>
                          <TableCell className="py-2.5 text-center">
                            <span className="text-xs font-medium text-gray-600">{record.duration}</span>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <span className="text-xs text-gray-500">{record.justification}</span>
                          </TableCell>
                          <TableCell className="py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-gray-100">
                                  <MoreHorizontal className="size-4 text-gray-400" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem className="text-xs">
                                  <Eye className="size-3.5 mr-2" />
                                  Voir details
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-xs">
                                  <FileCheck className="size-3.5 mr-2" />
                                  Justifier absence
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-xs">
                                  <Mail className="size-3.5 mr-2" />
                                  Contacter etudiant
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </motion.tr>
                      )
                    })}
                    {isLoading && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-sm text-gray-400">
                          Chargement...
                        </TableCell>
                      </TableRow>
                    )}
                    {!isLoading && filteredRecords.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-sm text-gray-400">
                          Aucun enregistrement trouve
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="text-[10px] text-gray-400 mt-2 italic">Cliquez sur une ligne pour changer le statut de presence</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Weekly Overview & Absence Justification ──────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Overview Card */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-[#1a2744]">Vue hebdomadaire</CardTitle>
                  <Badge className="text-[10px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">
                    Semaine 11
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-4">
                {/* Weekly calendar grid */}
                <div className="grid grid-cols-6 gap-2">
                  <div className="text-[10px] font-semibold text-gray-400 text-center" />
                  {weeklyData.map(d => (
                    <div key={d.day} className="text-[10px] font-semibold text-gray-500 text-center">{d.day}</div>
                  ))}
                  {/* Rate row */}
                  <div className="text-[10px] font-semibold text-gray-400 text-center self-center">Taux</div>
                  {weeklyData.map(d => (
                    <Tooltip key={`rate-${d.day}`}>
                      <TooltipTrigger asChild>
                        <motion.div
                          className="h-12 rounded-lg flex items-center justify-center cursor-default text-xs font-bold"
                          style={{
                            backgroundColor: d.rate >= 90 ? '#2d7a4f20' : d.rate >= 75 ? '#d4a85320' : '#c6282820',
                            color: d.rate >= 90 ? '#2d7a4f' : d.rate >= 75 ? '#d4a853' : '#c62828',
                          }}
                          whileHover={{ scale: 1.05 }}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          {d.rate}%
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{d.day}: {d.rate}% de presence - {d.hours}h de cours</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  {/* Hours row */}
                  <div className="text-[10px] font-semibold text-gray-400 text-center self-center">Heures</div>
                  {weeklyData.map(d => (
                    <div key={`hours-${d.day}`} className="text-[10px] text-gray-600 text-center self-center">
                      {d.hours}h
                    </div>
                  ))}
                </div>

                {/* Color legend */}
                <div className="flex items-center gap-4 text-[10px]">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-[#2d7a4f20] border border-[#2d7a4f40]" />
                    <span className="text-gray-500">&ge;90%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-[#d4a85320] border border-[#d4a85340]" />
                    <span className="text-gray-500">75-90%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-[#c6282820] border border-[#c6282840]" />
                    <span className="text-gray-500">&lt;75%</span>
                  </div>
                </div>

                {/* Weekly summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase">Total heures</p>
                    <p className="text-lg font-bold text-[#1a2744]">{totalWeeklyHours}h</p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase">Taux moyen</p>
                    <p className="text-lg font-bold text-[#2d7a4f]">{avgWeeklyRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Absence Justification Card */}
          <motion.div variants={itemVariants}>
            <Card className="border-l-4 border-l-[#d4a853]">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-[#1a2744]">Justifications d&apos;absences</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className="text-[10px] bg-[#d4a85315] text-[#d4a853] border-0">
                      {justEnAttente} en attente
                    </Badge>
                    <Badge className="text-[10px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">
                      {justValidees} validees
                    </Badge>
                    <Badge className="text-[10px] bg-[#c6282815] text-[#c62828] border-0">
                      {justRejetees} rejetees
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {justificationData.map((just) => {
                    const jConf = justificationStatusConfig[just.status]
                    return (
                      <div
                        key={just.id}
                        className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-[#1a2744] truncate">{just.studentName}</p>
                              {jConf ? (
                                <Badge className={`text-[10px] shrink-0 ${jConf.className}`}>{jConf.label}</Badge>
                              ) : null}
                            </div>
                            <p className="text-[10px] text-gray-400 font-mono">{just.matricule}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Calendar className="size-3" />
                                {just.dates}
                              </span>
                              <Badge variant="outline" className="text-[10px] border-gray-200 text-gray-500 shrink-0">
                                <FileText className="size-3 mr-1" />
                                {just.documentType}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{just.reason}</p>
                          </div>
                          {just.status === 'en_attente' && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                size="sm"
                                className="h-7 text-[10px] bg-[#2d7a4f] hover:bg-[#236b40] text-white px-2.5"
                                onClick={() => approveJustification(just.id)}
                              >
                                <CheckCircle2 className="size-3 mr-1" />
                                Valider
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] border-[#c6282830] text-[#c62828] hover:bg-[#c6282808] px-2.5"
                                onClick={() => rejectJustification(just.id)}
                              >
                                <XCircle className="size-3 mr-1" />
                                Rejeter
                              </Button>
                            </div>
                          )}
                          {just.status === 'validee' && (
                            <div className="flex items-center gap-1 text-[#2d7a4f] shrink-0">
                              <CheckCircle2 className="size-4" />
                              <span className="text-[10px] font-medium">Approuvee</span>
                            </div>
                          )}
                          {just.status === 'rejetee' && (
                            <div className="flex items-center gap-1 text-[#c62828] shrink-0">
                              <XCircle className="size-4" />
                              <span className="text-[10px] font-medium">Rejetee</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* ── Alerts & Sanctions Card ──────────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-[#ef4444]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-semibold text-[#1a2744]">Alertes & Sanctions</CardTitle>
                  <Badge className="text-[10px] bg-[#ef444415] text-[#ef4444] border-0">
                    <Bell className="size-3 mr-1" />
                    {demoSanctions.length} alertes actives
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
              {/* Warning levels legend */}
              <div className="flex items-center gap-4 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <motion.div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: '#d4a853' }}
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <span className="text-gray-500">Avertissement (3 abs/sem)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <motion.div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: '#ea580c' }}
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                  />
                  <span className="text-gray-500">Mise en demeure (5 abs/sem)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <motion.div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: '#c62828' }}
                    animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <span className="text-gray-500">Exclusion (7+ abs/sem)</span>
                </div>
              </div>

              {/* Sanctions table */}
              <div className="overflow-x-auto rounded-lg border border-gray-100">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-xs font-semibold">Etudiant</TableHead>
                      <TableHead className="text-xs font-semibold">Programme</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Abs. cette sem.</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Total absences</TableHead>
                      <TableHead className="text-xs font-semibold">Niveau d&apos;alerte</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {demoSanctions.map((sanction) => {
                      const scConf = sanctionConfig[sanction.level]
                      return (
                        <TableRow key={sanction.id} className="hover:bg-[#ef444405] transition-colors">
                          <TableCell className="py-2.5">
                            <div>
                              <p className="text-sm font-medium text-[#1a2744]">{sanction.studentName}</p>
                              <p className="text-[10px] text-gray-400 font-mono">{sanction.matricule}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-gray-600 py-2.5">{sanction.program}</TableCell>
                          <TableCell className="text-center py-2.5">
                            <span className="text-sm font-bold text-[#c62828]">{sanction.absencesWeek}</span>
                          </TableCell>
                          <TableCell className="text-center py-2.5">
                            <span className="text-sm font-semibold text-gray-700">{sanction.totalAbsences}</span>
                          </TableCell>
                          <TableCell className="py-2.5">
                            {scConf ? (
                              <div className="flex items-center gap-1.5">
                                <motion.div
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: scConf.pulseColor }}
                                  animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                />
                                <Badge className={`text-[10px] ${scConf.className}`}>{scConf.label}</Badge>
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell className="py-2.5 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-gray-100">
                                  <MoreHorizontal className="size-4 text-gray-400" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem className="text-xs">
                                  <Eye className="size-3.5 mr-2" />
                                  Voir fiche
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-xs">
                                  <Shield className="size-3.5 mr-2" />
                                  Appliquer sanction
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-xs">
                                  <Mail className="size-3.5 mr-2" />
                                  Avertir parent
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Sanction history timeline */}
              <div>
                <p className="text-xs font-semibold text-[#1a2744] mb-3">Historique des sanctions recentes</p>
                <div className="relative pl-6 space-y-3">
                  <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-gray-200" />
                  {[
                    { date: '10/03/2025', text: 'Exclusion notifiee - MALLAH Adoum (Medecine)', type: 'exclusion' },
                    { date: '08/03/2025', text: 'Mise en demeure envoyee - BICHARA Abdelkerim (Economie)', type: 'mise_en_demeure' },
                    { date: '05/03/2025', text: 'Avertissement emis - ABDOULAYE Ibrahim (Droit)', type: 'avertissement' },
                  ].map((entry, idx) => {
                    const scConf = sanctionConfig[entry.type]
                    return (
                      <div key={idx} className="relative">
                        <div
                          className="absolute -left-4 top-1 w-3 h-3 rounded-full border-2 border-white"
                          style={{ backgroundColor: scConf ? scConf.pulseColor : '#999' }}
                        />
                        <div>
                          <p className="text-[10px] text-gray-400">{entry.date}</p>
                          <p className="text-xs text-gray-600">{entry.text}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Course Attendance Statistics Card ──────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-[#1a2744]">Statistiques de presence par cours</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className="text-[10px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">
                    Meilleur: Algorithmique (96%)
                  </Badge>
                  <Badge className="text-[10px] bg-[#c6282815] text-[#c62828] border-0">
                    Plus bas: Physiologie (79%)
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-5">
              {/* Per-course bars */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {courseStats.map((course) => (
                  <div key={course.course} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 truncate">{course.course}</span>
                      <span className="text-xs font-semibold" style={{ color: course.rate >= 90 ? '#2d7a4f' : course.rate >= 80 ? '#d4a853' : '#c62828' }}>
                        {course.rate}% ({course.students} etu.)
                      </span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: course.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${course.rate}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Monthly trend & Time slot analysis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Monthly trend */}
                <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                  <p className="text-xs font-semibold text-[#1a2744] mb-3">Tendance mensuelle</p>
                  <div className="flex items-end gap-2 h-28">
                    {monthlyTrend.map((m, idx) => (
                      <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                        <motion.div
                          className="w-full rounded-t-sm min-h-[4px]"
                          style={{
                            background: `linear-gradient(to top, #1a2744, #2d7a4f)`,
                          }}
                          initial={{ height: 0 }}
                          animate={{ height: `${(m.rate / 100) * 100}%` }}
                          transition={{ duration: 0.6, delay: idx * 0.1, ease: 'easeOut' }}
                        />
                        <span className="text-[9px] text-gray-400">{m.month}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-2 text-[9px] text-gray-400">
                    <span>79%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Time slot analysis */}
                <div className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                  <p className="text-xs font-semibold text-[#1a2744] mb-3">Analyse par creneau</p>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-600 flex items-center gap-1.5">
                          <Sun className="size-3.5 text-[#d4a853]" />
                          Matin (08h - 12h)
                        </span>
                        <span className="text-sm font-bold text-[#2d7a4f]">{morningRate}%</span>
                      </div>
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-[#d4a853] to-[#2d7a4f]"
                          initial={{ width: 0 }}
                          animate={{ width: `${morningRate}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-600 flex items-center gap-1.5">
                          <Moon className="size-3.5 text-[#1a2744]" />
                          Apres-midi (14h - 18h)
                        </span>
                        <span className="text-sm font-bold text-[#1a2744]">{afternoonRate}%</span>
                      </div>
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-[#1a2744] to-[#2d7a4f]"
                          initial={{ width: 0 }}
                          animate={{ width: `${afternoonRate}%` }}
                          transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded bg-white border border-gray-100">
                      <TrendingUp className="size-3.5 text-[#2d7a4f]" />
                      <span className="text-[10px] text-gray-500">Les cours du matin ont un taux de presence superieur de {morningRate - afternoonRate}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── African Context Card ──────────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-[#1a2744]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-[#1a2744]">Contexte africain & Fonctionnalites specifiques</CardTitle>
                <Badge className="text-[10px] bg-[#1a274415] text-[#1a2744] border-0">Adapte</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Low connectivity mode */}
                <motion.div
                  className="p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition-all cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setOfflineMode(!offlineMode)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${offlineMode ? 'bg-[#2d7a4f15]' : 'bg-gray-100'}`}>
                      {offlineMode ? (
                        <WifiOff className="size-5 text-[#2d7a4f]" />
                      ) : (
                        <Wifi className="size-5 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#1a2744]">Mode hors-ligne</p>
                      <p className="text-[10px] text-gray-400">Connectivite limitee</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 mb-2">
                    Marquer les presences sans connexion internet, synchronisation automatique quand le reseau revient
                  </p>
                  <Badge className={`text-[10px] border-0 ${offlineMode ? 'bg-[#2d7a4f15] text-[#2d7a4f]' : 'bg-gray-100 text-gray-400'}`}>
                    {offlineMode ? 'Active' : 'Desactive'}
                  </Badge>
                </motion.div>

                {/* Paper backup */}
                <motion.div
                  className="p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition-all cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-[#d4a85315] flex items-center justify-center">
                      <Printer className="size-5 text-[#d4a853]" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#1a2744]">Sauvegarde papier</p>
                      <p className="text-[10px] text-gray-400">Feuille de presence</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 mb-2">
                    Imprimer les feuilles de presence pour saisie manuelle, puis numerisation
                  </p>
                  <Button size="sm" variant="outline" className="h-7 text-[10px] w-full border-[#d4a85330] text-[#d4a853] hover:bg-[#d4a85308]">
                    <Printer className="size-3 mr-1" />
                    Imprimer
                  </Button>
                </motion.div>

                {/* SMS notification */}
                <motion.div
                  className="p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition-all cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-[#1a274415] flex items-center justify-center">
                      <Smartphone className="size-5 text-[#1a2744]" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#1a2744]">Notification SMS</p>
                      <p className="text-[10px] text-gray-400">Alerte parents</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 mb-2">
                    Envoi automatique de SMS aux parents en cas d&apos;absence repetee (Airtel, Moov, Orange)
                  </p>
                  <Badge className="text-[10px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">
                    89 SMS envoyes ce mois
                  </Badge>
                </motion.div>

                {/* Weekly report */}
                <motion.div
                  className="p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition-all cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-[#2d7a4f15] flex items-center justify-center">
                      <FileText className="size-5 text-[#2d7a4f]" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#1a2744]">Rapport hebdomadaire</p>
                      <p className="text-[10px] text-gray-400">Chefs de departement</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 mb-2">
                    Generation automatique du rapport de presence hebdomadaire pour chaque departement
                  </p>
                  <Button size="sm" variant="outline" className="h-7 text-[10px] w-full border-[#2d7a4f30] text-[#2d7a4f] hover:bg-[#2d7a4f08]">
                    <Download className="size-3 mr-1" />
                    Generer rapport
                  </Button>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </TooltipProvider>
  )
}


