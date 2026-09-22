'use client'

import { exportToExcel } from '@/lib/export'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAttendance } from '@/lib/api-hooks'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  Bell,
} from 'lucide-react'

// ─── Real data mapping ────────────────────────────────────────────────────────

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
  date: string
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
    date: record.date,
  }
}

interface JustificationEntry {
  id: string
  studentName: string
  matricule: string
  date: string
  course: string
  reason: string
}

// A "pending justification" is derived from real Attendance data: an ABSENT
// record for which a justification note was submitted but not yet reviewed
// (i.e. not upgraded to status: 'JUSTIFIED'). See GET /api/attendance.
interface ApiPendingJustification {
  id: string
  studentName: string
  matricule: string
  course: string
  justification: string | null
  date: string
}

function mapJustification(record: ApiPendingJustification): JustificationEntry {
  return {
    id: record.id,
    studentName: record.studentName,
    matricule: record.matricule,
    date: new Date(record.date).toLocaleDateString('fr-FR'),
    course: record.course,
    reason: record.justification || 'Motif non precise',
  }
}

interface SanctionEntry {
  id: string
  studentName: string
  matricule: string
  absencesWeek: number
  totalAbsences: number
  level: 'avertissement' | 'mise_en_demeure' | 'exclusion'
  program: string
  latestDate: string
}

interface AttendanceForm {
  studentName: string
  matricule: string
  course: string
  timeSlot: string
  status: 'PRESENT' | 'ABSENT' | 'JUSTIFIED' | 'LATE'
  duration: string
  justification: string
  program: string
  level: string
  date: string
}

const initialAttendanceForm: AttendanceForm = {
  studentName: '',
  matricule: '',
  course: '',
  timeSlot: '08:00-10:00',
  status: 'PRESENT',
  duration: '2h',
  justification: '',
  program: '',
  level: '',
  date: new Date().toISOString().slice(0, 10),
}

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
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDate, setFilterDate] = useState('tous')
  const [filterProgram, setFilterProgram] = useState('tous')
  const [filterCourse, setFilterCourse] = useState('tous')
  const [filterStatus, setFilterStatus] = useState('tous')
  const [filterLevel, setFilterLevel] = useState('tous')
  const queryClient = useQueryClient()
  const { data: attendanceQuery, isLoading } = useAttendance()
  const attendanceRecords: AttendanceRecord[] = useMemo(
    () => (attendanceQuery?.records || []).map(mapAttendance),
    [attendanceQuery]
  )
  const justificationEntries: JustificationEntry[] = useMemo(
    () => (attendanceQuery?.pendingJustifications || []).map(mapJustification),
    [attendanceQuery]
  )
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([])
  const [offlineMode, setOfflineMode] = useState(false)
  const [showSignalementDialog, setShowSignalementDialog] = useState(false)
  const [showJustificationDialog, setShowJustificationDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [attendanceForm, setAttendanceForm] = useState<AttendanceForm>(initialAttendanceForm)

  useEffect(() => {
    setAttendanceData(attendanceRecords)
  }, [attendanceRecords])

  const updateAttendanceForm = (updates: Partial<AttendanceForm>) => {
    setAttendanceForm((form) => ({ ...form, ...updates }))
  }

  const fillFormFromRecord = (record: AttendanceRecord) => {
    setAttendanceForm({
      studentName: record.studentName,
      matricule: record.matricule,
      course: record.course,
      timeSlot: record.timeSlot,
      status: record.status === 'Present' ? 'PRESENT' : record.status === 'Absent' ? 'ABSENT' : record.status === 'Justifie' ? 'JUSTIFIED' : 'LATE',
      duration: record.duration === '-' ? '' : record.duration,
      justification: record.justification === '-' ? '' : record.justification,
      program: record.program,
      level: record.level,
      date: new Date(record.date).toISOString().slice(0, 10),
    })
  }

  const createAttendanceRecord = async (forceAbsenceWithJustification = false) => {
    const payload = {
      ...attendanceForm,
      status: forceAbsenceWithJustification ? 'ABSENT' : attendanceForm.status,
      justification: attendanceForm.justification || null,
      program: attendanceForm.program || null,
      level: attendanceForm.level || null,
      duration: attendanceForm.duration || null,
    }

    if (!payload.studentName.trim() || !payload.matricule.trim() || !payload.course.trim() || !payload.timeSlot.trim()) {
      toast.error('Champs requis', { description: 'Etudiant, matricule, cours et plage horaire sont obligatoires.' })
      return
    }
    if (forceAbsenceWithJustification && !attendanceForm.justification.trim()) {
      toast.error('Justification requise', { description: 'Ajoutez le motif de justification.' })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Création impossible')
      toast.success(forceAbsenceWithJustification ? 'Justification enregistrée' : 'Signalement enregistré')
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
      setShowSignalementDialog(false)
      setShowJustificationDialog(false)
      setAttendanceForm(initialAttendanceForm)
    } catch (e) {
      toast.error('Erreur', { description: e instanceof Error ? e.message : 'Création impossible' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Toggle attendance status
  const toggleStatus = async (id: string) => {
    const record = attendanceData.find((item) => item.id === id)
    if (!record) return
    const statusOrder: AttendanceStatus[] = ['Present', 'Absent', 'Justifie', 'Retard']
    const apiStatus: Record<AttendanceStatus, 'PRESENT' | 'ABSENT' | 'JUSTIFIED' | 'LATE'> = {
      Present: 'PRESENT',
      Absent: 'ABSENT',
      Justifie: 'JUSTIFIED',
      Retard: 'LATE',
    }
    const currentIdx = statusOrder.indexOf(record.status)
    const nextStatus = statusOrder[(currentIdx + 1) % statusOrder.length]

    setAttendanceData(prev => prev.map(item => item.id === id ? { ...item, status: nextStatus } : item))
    try {
      const res = await fetch(`/api/attendance?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateStatus', status: apiStatus[nextStatus] }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Mise à jour impossible')
      toast.success('Statut mis à jour')
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
    } catch (e) {
      setAttendanceData(attendanceRecords)
      toast.error('Erreur', { description: e instanceof Error ? e.message : 'Mise à jour impossible' })
    }
  }

  // Approve a pending justification request (Attendance.status -> JUSTIFIED)
  const approveJustification = async (id: string) => {
    try {
      const res = await fetch(`/api/attendance?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Echec de la validation')
      toast.success('Justification validee')
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
    } catch (e) {
      toast.error('Erreur', { description: e instanceof Error ? e.message : 'Echec de la validation' })
    }
  }

  // Reject a pending justification request (clears the submitted note; the
  // absence remains unjustified since there is no "rejected" state in the schema)
  const rejectJustification = async (id: string) => {
    try {
      const res = await fetch(`/api/attendance?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Echec du rejet')
      toast.success('Justification rejetee')
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
    } catch (e) {
      toast.error('Erreur', { description: e instanceof Error ? e.message : 'Echec du rejet' })
    }
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
  const presenceRate = attendanceData.length > 0 ? Math.round(((presentCount + retardCount) / attendanceData.length) * 100) : 0
  void absentCount
  void justifieCount

  // Header stats (real, derived from the loaded attendance records)
  const presencesCount = useCountUp(presentCount, 1400)
  const tauxPresence = useCountUp(presenceRate, 1300)

  const parseHours = (duration: string) => {
    const value = Number.parseFloat(duration.replace(',', '.'))
    return Number.isFinite(value) ? value : 0
  }

  const weekStart = useMemo(() => {
    const now = new Date()
    const day = now.getDay() || 7
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    start.setDate(now.getDate() - day + 1)
    return start
  }, [])
  const weekLabel = useMemo(() => {
    const end = new Date(weekStart)
    end.setDate(weekStart.getDate() + 5)
    return `${weekStart.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`
  }, [weekStart])

  const weeklyData = useMemo(() => {
    const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
    return days.map((day, index) => {
      const dayRecords = attendanceData.filter((record) => {
        const date = new Date(record.date)
        return date >= weekStart && date.getDay() === index + 1
      })
      const presentLike = dayRecords.filter((record) => record.status === 'Present' || record.status === 'Retard').length
      const rate = dayRecords.length > 0 ? Math.round((presentLike / dayRecords.length) * 100) : 0
      const hours = Math.round(dayRecords.reduce((sum, record) => sum + parseHours(record.duration), 0))
      return { day, rate, hours, hasData: dayRecords.length > 0 }
    })
  }, [attendanceData, weekStart])

  const courseStats = useMemo(() => {
    const grouped = new Map<string, { total: number; presentLike: number; students: Set<string> }>()
    for (const record of attendanceData) {
      if (!record.course) continue
      const current = grouped.get(record.course) || { total: 0, presentLike: 0, students: new Set<string>() }
      current.total += 1
      if (record.status === 'Present' || record.status === 'Retard') current.presentLike += 1
      current.students.add(record.matricule)
      grouped.set(record.course, current)
    }
    return Array.from(grouped.entries()).map(([course, data]) => {
      const rate = data.total > 0 ? Math.round((data.presentLike / data.total) * 100) : 0
      return {
        course,
        rate,
        color: rate >= 90 ? '#2d7a4f' : rate >= 80 ? '#d4a853' : '#c62828',
        students: data.students.size,
      }
    }).sort((a, b) => b.students - a.students).slice(0, 8)
  }, [attendanceData])

  const monthlyTrend = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 6 }).map((_, offset) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - offset), 1)
      const month = monthDate.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')
      const records = attendanceData.filter((record) => {
        const date = new Date(record.date)
        return date.getFullYear() === monthDate.getFullYear() && date.getMonth() === monthDate.getMonth()
      })
      const presentLike = records.filter((record) => record.status === 'Present' || record.status === 'Retard').length
      const rate = records.length > 0 ? Math.round((presentLike / records.length) * 100) : 0
      return { month, rate, hasData: records.length > 0 }
    })
  }, [attendanceData])

  const sanctions = useMemo<SanctionEntry[]>(() => {
    const grouped = new Map<string, { studentName: string; matricule: string; program: string; total: number; week: number; latestDate: string }>()
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)
    for (const record of attendanceData) {
      if (record.status !== 'Absent') continue
      const current = grouped.get(record.matricule) || {
        studentName: record.studentName,
        matricule: record.matricule,
        program: record.program || '-',
        total: 0,
        week: 0,
        latestDate: record.date,
      }
      current.total += 1
      const date = new Date(record.date)
      if (date >= weekStart && date < weekEnd) current.week += 1
      if (new Date(record.date) > new Date(current.latestDate)) current.latestDate = record.date
      grouped.set(record.matricule, current)
    }
    return Array.from(grouped.values())
      .filter((item) => item.week >= 3 || item.total >= 7)
      .map((item) => {
        const level: SanctionEntry['level'] = item.week >= 7 || item.total >= 20
          ? 'exclusion'
          : item.week >= 5 || item.total >= 12
            ? 'mise_en_demeure'
            : 'avertissement'
        return {
          id: item.matricule,
          studentName: item.studentName,
          matricule: item.matricule,
          absencesWeek: item.week,
          totalAbsences: item.total,
          latestDate: item.latestDate,
          program: item.program,
          level,
        }
      })
      .sort((a, b) => b.totalAbsences - a.totalAbsences)
  }, [attendanceData, weekStart])

  const totalWeeklyHours = weeklyData.reduce((sum, d) => sum + d.hours, 0)
  const ratedWeeklyDays = weeklyData.filter((d) => d.hasData)
  const avgWeeklyRate = ratedWeeklyDays.length > 0 ? Math.round(ratedWeeklyDays.reduce((sum, d) => sum + d.rate, 0) / ratedWeeklyDays.length) : 0

  // Justification stats (validees = total records already marked JUSTIFIED;
  // there is no "rejetees" concept since a rejected note just clears the
  // justification and the row goes back to a plain unjustified absence)
  const justEnAttente = justificationEntries.length
  const justValidees = attendanceQuery?.stats?.justified ?? 0

  const computeSlotRate = (period: 'morning' | 'afternoon') => {
    const periodRecords = attendanceData.filter((record) => {
      const match = record.timeSlot.match(/\d{1,2}/)
      const hour = match ? Number(match[0]) : 0
      return period === 'morning' ? hour < 12 : hour >= 12
    })
    const presentLike = periodRecords.filter((record) => record.status === 'Present' || record.status === 'Retard').length
    return periodRecords.length > 0 ? Math.round((presentLike / periodRecords.length) * 100) : 0
  }
  const morningRate = computeSlotRate('morning')
  const afternoonRate = computeSlotRate('afternoon')

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
      <Dialog open={showSignalementDialog} onOpenChange={setShowSignalementDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nouveau signalement de présence</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="attendance-student-name">Étudiant</Label>
              <Input id="attendance-student-name" value={attendanceForm.studentName} onChange={(e) => updateAttendanceForm({ studentName: e.target.value })} placeholder="Nom complet" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="attendance-matricule">Matricule</Label>
              <Input id="attendance-matricule" value={attendanceForm.matricule} onChange={(e) => updateAttendanceForm({ matricule: e.target.value })} placeholder="Matricule" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="attendance-course">Cours</Label>
              <Input id="attendance-course" value={attendanceForm.course} onChange={(e) => updateAttendanceForm({ course: e.target.value })} placeholder="Cours / UE" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="attendance-time-slot">Plage horaire</Label>
              <Input id="attendance-time-slot" value={attendanceForm.timeSlot} onChange={(e) => updateAttendanceForm({ timeSlot: e.target.value })} placeholder="08:00-10:00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="attendance-date">Date</Label>
              <Input id="attendance-date" type="date" value={attendanceForm.date} onChange={(e) => updateAttendanceForm({ date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={attendanceForm.status} onValueChange={(value) => updateAttendanceForm({ status: value as AttendanceForm['status'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRESENT">Présent</SelectItem>
                  <SelectItem value="ABSENT">Absent</SelectItem>
                  <SelectItem value="JUSTIFIED">Justifié</SelectItem>
                  <SelectItem value="LATE">Retard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="attendance-program">Programme</Label>
              <Input id="attendance-program" value={attendanceForm.program} onChange={(e) => updateAttendanceForm({ program: e.target.value })} placeholder="Programme" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="attendance-level">Niveau</Label>
              <Input id="attendance-level" value={attendanceForm.level} onChange={(e) => updateAttendanceForm({ level: e.target.value })} placeholder="Niveau" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="attendance-justification">Justification / note</Label>
              <Textarea id="attendance-justification" value={attendanceForm.justification} onChange={(e) => updateAttendanceForm({ justification: e.target.value })} placeholder="Optionnel" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowSignalementDialog(false)}>Annuler</Button>
            <Button disabled={isSubmitting} onClick={() => createAttendanceRecord(false)} className="bg-[#2d7a4f] hover:bg-[#236b40] text-white">
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showJustificationDialog} onOpenChange={setShowJustificationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Justifier une absence</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="justification-student-name">Étudiant</Label>
              <Input id="justification-student-name" value={attendanceForm.studentName} onChange={(e) => updateAttendanceForm({ studentName: e.target.value })} placeholder="Nom complet" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="justification-matricule">Matricule</Label>
              <Input id="justification-matricule" value={attendanceForm.matricule} onChange={(e) => updateAttendanceForm({ matricule: e.target.value })} placeholder="Matricule" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="justification-course">Cours</Label>
              <Input id="justification-course" value={attendanceForm.course} onChange={(e) => updateAttendanceForm({ course: e.target.value })} placeholder="Cours / UE" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="justification-date">Date d&apos;absence</Label>
              <Input id="justification-date" type="date" value={attendanceForm.date} onChange={(e) => updateAttendanceForm({ date: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="justification-reason">Motif</Label>
              <Textarea id="justification-reason" value={attendanceForm.justification} onChange={(e) => updateAttendanceForm({ justification: e.target.value })} placeholder="Motif de l'absence..." />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowJustificationDialog(false)}>Annuler</Button>
            <Button disabled={isSubmitting} onClick={() => createAttendanceRecord(true)} className="bg-[#2d7a4f] hover:bg-[#236b40] text-white">
              {isSubmitting ? 'Enregistrement...' : 'Soumettre la justification'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                  <Button size="sm" className="bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 text-white text-xs" onClick={() => setShowSignalementDialog(true)}>
                    <Plus className="size-3.5 mr-1.5" />
                    Nouveau signalement
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs bg-white/10 backdrop-blur border-white/20 text-white hover:bg-white/20 hover:text-white" onClick={() => setShowJustificationDialog(true)}>
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
                                <DropdownMenuItem
                                  className="text-xs"
                                  onClick={() => toast.info('Détail présence', {
                                    description: `${record.studentName} — ${record.course} — ${statusConfig[record.status]?.label || record.status}`,
                                  })}
                                >
                                  <Eye className="size-3.5 mr-2" />
                                  Voir details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-xs"
                                  onClick={() => {
                                    fillFormFromRecord(record)
                                    setShowJustificationDialog(true)
                                  }}
                                >
                                  <FileCheck className="size-3.5 mr-2" />
                                  Justifier absence
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-xs"
                                  onClick={() => exportToExcel([record], `presence_${record.matricule}`)}
                                >
                                  <Download className="size-3.5 mr-2" />
                                  Exporter ligne
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
                    {weekLabel}
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
                      {justValidees} justifiees
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {isLoading && (
                    <p className="text-center py-8 text-sm text-gray-400">Chargement...</p>
                  )}
                  {!isLoading && justificationEntries.length === 0 && (
                    <p className="text-center py-8 text-sm text-gray-400">Aucune justification en attente</p>
                  )}
                  {justificationEntries.map((just) => (
                    <div
                      key={just.id}
                      className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-[#1a2744] truncate">{just.studentName}</p>
                            <Badge className="text-[10px] shrink-0 bg-[#d4a85315] text-[#d4a853] border-0">En attente</Badge>
                          </div>
                          <p className="text-[10px] text-gray-400 font-mono">{just.matricule}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Calendar className="size-3" />
                              {just.date}
                            </span>
                            <Badge variant="outline" className="text-[10px] border-gray-200 text-gray-500 shrink-0">
                              <FileText className="size-3 mr-1" />
                              {just.course}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{just.reason}</p>
                        </div>
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
                      </div>
                    </div>
                  ))}
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
                    {sanctions.length} alertes actives
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
                    {sanctions.map((sanction) => {
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
                                <DropdownMenuItem
                                  className="text-xs"
                                  onClick={() => toast.info('Alerte absence', {
                                    description: `${sanction.studentName}: ${sanction.totalAbsences} absence(s), niveau ${sanctionConfig[sanction.level]?.label || sanction.level}`,
                                  })}
                                >
                                  <Eye className="size-3.5 mr-2" />
                                  Voir alerte
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-xs"
                                  onClick={() => exportToExcel([sanction], `alerte_absence_${sanction.matricule}`)}
                                >
                                  <Download className="size-3.5 mr-2" />
                                  Exporter alerte
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-xs"
                                  onClick={() => {
                                    updateAttendanceForm({
                                      studentName: sanction.studentName,
                                      matricule: sanction.matricule,
                                      program: sanction.program,
                                      status: 'ABSENT',
                                      justification: `Suivi alerte: ${sanction.totalAbsences} absence(s) cumulées`,
                                    })
                                    setShowJustificationDialog(true)
                                  }}
                                >
                                  <Mail className="size-3.5 mr-2" />
                                  Préparer justification
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {sanctions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-sm text-gray-400">
                          Aucune alerte calculée sur les présences réelles
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Sanction history timeline */}
              <div>
                <p className="text-xs font-semibold text-[#1a2744] mb-3">Historique des sanctions recentes</p>
                <div className="relative pl-6 space-y-3">
                  <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-gray-200" />
                  {sanctions.slice(0, 3).map((entry, idx) => {
                    const scConf = sanctionConfig[entry.level]
                    return (
                      <div key={idx} className="relative">
                        <div
                          className="absolute -left-4 top-1 w-3 h-3 rounded-full border-2 border-white"
                          style={{ backgroundColor: scConf ? scConf.pulseColor : '#999' }}
                        />
                        <div>
                          <p className="text-[10px] text-gray-400">{new Date(entry.latestDate).toLocaleDateString('fr-FR')}</p>
                          <p className="text-xs text-gray-600">{scConf?.label || 'Alerte'} calculée - {entry.studentName} ({entry.program})</p>
                        </div>
                      </div>
                    )
                  })}
                  {sanctions.length === 0 && (
                    <p className="text-xs text-gray-400">Aucun historique de sanction calculé.</p>
                  )}
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
                  {courseStats.length > 0 ? (
                    <>
                      <Badge className="text-[10px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">
                        Meilleur: {courseStats.reduce((best, item) => item.rate > best.rate ? item : best, courseStats[0]).course}
                      </Badge>
                      <Badge className="text-[10px] bg-[#c6282815] text-[#c62828] border-0">
                        Plus bas: {courseStats.reduce((low, item) => item.rate < low.rate ? item : low, courseStats[0]).course}
                      </Badge>
                    </>
                  ) : (
                    <Badge className="text-[10px] bg-gray-100 text-gray-500 border-0">Aucune donnée réelle</Badge>
                  )}
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
                {courseStats.length === 0 && (
                  <p className="text-sm text-gray-400 md:col-span-2 text-center py-6">
                    Aucun cours avec présence enregistrée.
                  </p>
                )}
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
                    Basculer l&apos;écran en mode terrain lorsque la connexion est faible. Les enregistrements restent saisis via l&apos;API dès que la connexion est disponible.
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
                  <Button size="sm" variant="outline" className="h-7 text-[10px] w-full border-[#d4a85330] text-[#d4a853] hover:bg-[#d4a85308]" onClick={() => window.print()}>
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
                    {sanctions.length} alerte(s) à notifier
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
                  <Button size="sm" variant="outline" className="h-7 text-[10px] w-full border-[#2d7a4f30] text-[#2d7a4f] hover:bg-[#2d7a4f08]" onClick={() => exportToExcel(filteredRecords, 'rapport_presences_hebdomadaire')}>
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


