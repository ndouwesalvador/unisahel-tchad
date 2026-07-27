'use client'

import { exportToExcel } from '@/lib/export'
import { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useExamScheduling } from '@/lib/api-hooks'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
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
  Calendar,
  Clock,
  MapPin,
  AlertTriangle,
  FileText,
  Download,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  CheckCircle2,
  XCircle,
  Printer,
  BookOpen,
  GraduationCap,
  BarChart3,
  Building2,
  UserCheck,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type ExamStatus = 'planifie' | 'confirme' | 'en_cours' | 'termine' | 'annule'

interface ExamEntry {
  id: string
  date: string
  heure: string
  ue: string
  code: string
  programme: string
  niveau: string
  salle: string
  surveillant: string
  effectif: number
  statut: ExamStatus
}

interface RoomInfo {
  id: string
  name: string
  capacity: number
  occupancy: number
  hasConflict: boolean
  conflictDetail?: string
}

// ─── Status Config ─────────────────────────────────────────────────────────────

const statusConfig: Record<ExamStatus, { label: string; className: string }> = {
  planifie: { label: 'Planifie', className: 'bg-sky-100 text-sky-700 border-0 hover:bg-sky-100' },
  confirme: { label: 'Confirme', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0 hover:bg-[#2d7a4f15]' },
  en_cours: { label: 'En cours', className: 'bg-[#d4a85315] text-[#d4a853] border-0 hover:bg-[#d4a85315]' },
  termine: { label: 'Termine', className: 'bg-gray-100 text-gray-500 border-0 hover:bg-gray-100' },
  annule: { label: 'Annule', className: 'bg-[#c6282815] text-[#c62828] border-0 hover:bg-[#c6282815]' },
}

const programColorMap: Record<string, { bg: string; border: string; text: string }> = {
  Droit: { bg: 'bg-sky-50', border: 'border-l-sky-400', text: 'text-sky-700' },
  Informatique: { bg: 'bg-emerald-50', border: 'border-l-emerald-400', text: 'text-emerald-700' },
  Lettres: { bg: 'bg-amber-50', border: 'border-l-amber-400', text: 'text-amber-700' },
  Sciences: { bg: 'bg-purple-50', border: 'border-l-purple-400', text: 'text-purple-700' },
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function ExamSchedulingPage() {
  const queryClient = useQueryClient()
  const [selectedSession, setSelectedSession] = useState('sn-s1')
  const [selectedNiveau, setSelectedNiveau] = useState('all')
  const [filterProgramme, setFilterProgramme] = useState('all')
  const [filterSalle, setFilterSalle] = useState('all')
  const [filterStatut, setFilterStatut] = useState('all')
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0)
  const [dateDebut, setDateDebut] = useState('07/07/2025')
  const [dateFin, setDateFin] = useState('18/07/2025')

  const { data, isLoading } = useExamScheduling()
  const examEntries: ExamEntry[] = useMemo(() => data?.examEntries ?? [], [data])
  const rooms: RoomInfo[] = useMemo(() => data?.rooms ?? [], [data])

  // ─── Filtered Exams ─────────────────────────────────────────────────────
  const filteredExams = useMemo(() => {
    return examEntries.filter(e => {
      if (filterProgramme !== 'all' && e.programme !== filterProgramme) return false
      if (filterSalle !== 'all' && e.salle !== filterSalle) return false
      if (filterStatut !== 'all' && e.statut !== filterStatut) return false
      return true
    })
  }, [examEntries, filterProgramme, filterSalle, filterStatut])

  // ─── Stats ──────────────────────────────────────────────────────────────
  const stats = data?.stats ?? { total: 0, enCours: 0, termines: 0, conflits: 0 }

  // ─── Weekly Calendar Data — built from the real distinct exam dates present,
  //     not a hardcoded July 2025 week ─────────────────────────────────────
  const weekDates = useMemo(() => {
    return Array.from(new Set(examEntries.map(e => e.date))).sort((a, b) => {
      const [da, ma, ya] = a.split('/').map(Number)
      const [db, mb, yb] = b.split('/').map(Number)
      return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime()
    }).slice(0, 7)
  }, [examEntries])
  const weekDays = weekDates.map(d => {
    const [day, month] = d.split('/')
    return `${day}/${month}`
  })
  const timeSlots = useMemo(() => {
    return Array.from(new Set(examEntries.map(e => e.heure))).sort()
  }, [examEntries])

  const calendarExams = useMemo(() => {
    const map: Record<string, ExamEntry[]> = {}
    weekDates.forEach(d => { map[d] = [] })
    examEntries.forEach(e => {
      if (map[e.date]) {
        map[e.date].push(e)
      }
    })
    return map
  }, [examEntries, weekDates])

  // ─── Exam per Day Stats — real counts per real date, not a fixed 9-day list ──
  const examsPerDay = useMemo(() => {
    return weekDates.map(date => ({
      label: date.slice(0, 5),
      count: examEntries.filter(e => e.date === date).length,
    }))
  }, [examEntries, weekDates])
  const maxExamsPerDay = Math.max(...examsPerDay.map(d => d.count), 1)

  // ─── Supervisor Stats — real: each non-cancelled exam needs one supervisor ──
  const supervisorStats = useMemo(() => {
    const active = examEntries.filter(e => e.statut !== 'annule')
    const assigned = active.filter(e => e.surveillant !== '—').length
    return { assigned, needed: active.length }
  }, [examEntries])

  // ─── Create / status-update actions ─────────────────────────────────────
  const [showNewExamDialog, setShowNewExamDialog] = useState(false)
  const [isCreatingExam, setIsCreatingExam] = useState(false)
  const [newExam, setNewExam] = useState({ examDate: '', startTime: '08:00', endTime: '10:00', roomId: '', sessionType: 'NORMALE' })

  const handleCreateExam = async () => {
    if (!newExam.examDate || !newExam.startTime || !newExam.endTime) {
      toast.error('Date, heure de debut et heure de fin sont requises.')
      return
    }
    setIsCreatingExam(true)
    try {
      const res = await fetch('/api/exam-scheduling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examDate: newExam.examDate,
          startTime: newExam.startTime,
          endTime: newExam.endTime,
          roomId: newExam.roomId || undefined,
          sessionType: newExam.sessionType,
        }),
      })
      if (!res.ok) throw new Error('failed')
      toast.success('Examen planifie')
      setShowNewExamDialog(false)
      setNewExam({ examDate: '', startTime: '08:00', endTime: '10:00', roomId: '', sessionType: 'NORMALE' })
      queryClient.invalidateQueries({ queryKey: ['examScheduling'] })
    } catch {
      toast.error("Echec de la planification de l'examen")
    } finally {
      setIsCreatingExam(false)
    }
  }

  const updateExamStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/exam-scheduling?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('failed')
      toast.success('Statut mis a jour')
      queryClient.invalidateQueries({ queryKey: ['examScheduling'] })
    } catch {
      toast.error('Echec de la mise a jour du statut')
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-xl font-bold text-[#1a2744]">Planification des Examens</h1>
          <p className="text-sm text-gray-500">Gestion des sessions et planification des examens</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="text-xs bg-[#2d7a4f] hover:bg-[#236b40] text-white" onClick={() => setShowNewExamDialog(true)}>
            <Calendar className="size-3.5 mr-1.5" />
            Planifier un examen
          </Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={() => exportToExcel(filteredExams, 'export_exam-scheduling')}>
            <Download className="size-3.5 mr-1.5" />
            Exporter
          </Button>
        </div>
      </motion.div>

      {/* ─── Stats Cards ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="relative overflow-hidden border-l-4 border-l-[#1a2744]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-[#1a274410]">
                  <Calendar className="size-4 text-[#1a2744]" />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#1a2744]">{stats.total}</p>
              <p className="text-xs text-gray-500 mt-1">Examens planifies</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-l-4 border-l-[#d4a853]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-[#d4a85310]">
                  <Clock className="size-4 text-[#d4a853]" />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#d4a853]">{stats.enCours}</p>
              <p className="text-xs text-gray-500 mt-1">En cours</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-l-4 border-l-[#2d7a4f]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-[#2d7a4f10]">
                  <CheckCircle2 className="size-4 text-[#2d7a4f]" />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#2d7a4f]">{stats.termines}</p>
              <p className="text-xs text-gray-500 mt-1">Termines</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-l-4 border-l-[#c62828]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-[#c6282810]">
                  <AlertTriangle className="size-4 text-[#c62828]" />
                </div>
              </div>
              <p className="text-2xl font-bold text-[#c62828]">{stats.conflits}</p>
              <p className="text-xs text-gray-500 mt-1">Conflits detectes</p>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* ─── Session Configuration Card ───────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="border-l-4 border-l-[#1a2744]">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="size-4 text-[#1a2744]" />
              <CardTitle className="text-sm font-semibold text-[#1a2744]">
                Configuration de la session
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600">Session</Label>
                <Select value={selectedSession} onValueChange={setSelectedSession}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Session" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sn-s1">Session Normale S1</SelectItem>
                    <SelectItem value="sn-s2">Session Normale S2</SelectItem>
                    <SelectItem value="rat-s1">Rattrapage S1</SelectItem>
                    <SelectItem value="rat-s2">Rattrapage S2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600">Debut</Label>
                <Input
                  type="text"
                  placeholder="JJ/MM/AAAA"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600">Fin</Label>
                <Input
                  type="text"
                  placeholder="JJ/MM/AAAA"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600">Niveau</Label>
                <Select value={selectedNiveau} onValueChange={setSelectedNiveau}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Niveau" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les niveaux</SelectItem>
                    <SelectItem value="L1">L1 - Licence 1</SelectItem>
                    <SelectItem value="L2">L2 - Licence 2</SelectItem>
                    <SelectItem value="L3">L3 - Licence 3</SelectItem>
                    <SelectItem value="M1">M1 - Master 1</SelectItem>
                    <SelectItem value="M2">M2 - Master 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                size="sm"
                className="bg-[#1a2744] hover:bg-[#253556] text-white text-xs"
              >
                <Sparkles className="size-3.5 mr-1.5" />
                Generer le planning automatiquement
              </Button>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => exportToExcel(filteredExams, 'export_exam-scheduling')}>
                <FileText className="size-3.5 mr-1.5" />
                Exporter le planning
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Exam Calendar View ───────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-[#1a2744]" />
                <CardTitle className="text-sm font-semibold text-[#1a2744]">
                  Calendrier des examens
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentWeekOffset(prev => prev - 1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-xs font-medium text-gray-600 px-2">Semaine du 07 Juillet 2025{currentWeekOffset !== 0 ? ` (${currentWeekOffset > 0 ? '+' : ''}${currentWeekOffset})` : ''}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentWeekOffset(prev => prev + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="min-w-[700px]">
                {/* Calendar Header */}
                <div className="grid grid-cols-8 border-b border-gray-200 bg-gray-50">
                  <div className="p-2 text-xs font-semibold text-gray-500 border-r border-gray-200">Horaire</div>
                  {weekDays.map(day => (
                    <div key={day} className="p-2 text-xs font-semibold text-gray-500 text-center border-r border-gray-200 last:border-r-0">
                      {day}
                    </div>
                  ))}
                </div>
                {/* Calendar Rows */}
                {timeSlots.map(slot => (
                  <div key={slot} className="grid grid-cols-8 border-b border-gray-100 last:border-b-0">
                    <div className="p-2 text-[11px] font-medium text-gray-500 border-r border-gray-200 flex items-center justify-center bg-gray-50/50">
                      {slot}
                    </div>
                    {weekDates.map(date => {
                      const examsInSlot = calendarExams[date]?.filter(e => e.heure === slot) || []
                      return (
                        <div key={`${date}-${slot}`} className="p-1 border-r border-gray-100 last:border-r-0 min-h-[72px]">
                          {examsInSlot.map(exam => {
                            const colors = programColorMap[exam.programme] || { bg: 'bg-gray-50', border: 'border-l-gray-400', text: 'text-gray-700' }
                            return (
                              <div
                                key={exam.id}
                                className={`${colors.bg} border-l-3 ${colors.border} rounded-r px-1.5 py-1 mb-1 cursor-pointer hover:shadow-sm transition-shadow`}
                              >
                                <p className={`text-[10px] font-semibold ${colors.text} leading-tight truncate`}>{exam.ue}</p>
                                <p className="text-[9px] text-gray-500 leading-tight">{exam.heure}</p>
                                <p className="text-[9px] text-gray-500 leading-tight">{exam.salle}</p>
                                <p className="text-[9px] text-gray-400 leading-tight truncate">{exam.surveillant}</p>
                                <p className="text-[9px] text-gray-400 leading-tight">{exam.effectif} etu.</p>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/50">
              <span className="text-[10px] text-gray-400 font-medium">Programmes :</span>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-sky-50 border-l-3 border-sky-400" />
                <span className="text-[10px] text-gray-500">Droit</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-emerald-50 border-l-3 border-emerald-400" />
                <span className="text-[10px] text-gray-500">Informatique</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-amber-50 border-l-3 border-amber-400" />
                <span className="text-[10px] text-gray-500">Lettres</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-purple-50 border-l-3 border-purple-400" />
                <span className="text-[10px] text-gray-500">Sciences</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Exam Schedule Table ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="size-4 text-[#1a2744]" />
                <CardTitle className="text-sm font-semibold text-[#1a2744]">
                  Planning des examens
                </CardTitle>
                <Badge className="text-[10px] bg-[#1a274410] text-[#1a2744] border-0">
                  {filteredExams.length} examens
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Select value={filterProgramme} onValueChange={setFilterProgramme}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Programme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les programmes</SelectItem>
                  <SelectItem value="Droit">Droit</SelectItem>
                  <SelectItem value="Informatique">Informatique</SelectItem>
                  <SelectItem value="Lettres">Lettres</SelectItem>
                  <SelectItem value="Sciences">Sciences</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterSalle} onValueChange={setFilterSalle}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Salle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les salles</SelectItem>
                  <SelectItem value="Salle 101">Salle 101</SelectItem>
                  <SelectItem value="Salle 102">Salle 102</SelectItem>
                  <SelectItem value="Amphitheatre A">Amphitheatre A</SelectItem>
                  <SelectItem value="Labo Info 1">Labo Info 1</SelectItem>
                  <SelectItem value="Labo Info 2">Labo Info 2</SelectItem>
                  <SelectItem value="Salle de conference">Salle de conference</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatut} onValueChange={setFilterStatut}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="planifie">Planifie</SelectItem>
                  <SelectItem value="confirme">Confirme</SelectItem>
                  <SelectItem value="en_cours">En cours</SelectItem>
                  <SelectItem value="termine">Termine</SelectItem>
                  <SelectItem value="annule">Annule</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center">
                <Input placeholder="Filtrer par date..." className="h-8 text-xs" />
              </div>
            </div>

            <Separator />

            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs font-semibold text-gray-500">Date</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500">Heure</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500">UE</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500">Code</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500">Programme</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500">Niveau</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500">Salle</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500">Surveillant</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 text-center">Effectif</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500">Statut</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-6 text-xs text-gray-400">Chargement...</TableCell>
                    </TableRow>
                  )}
                  {!isLoading && filteredExams.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-6 text-xs text-gray-400">Aucun examen planifie pour le moment</TableCell>
                    </TableRow>
                  )}
                  {filteredExams.map((exam) => {
                    const colors = programColorMap[exam.programme]
                    return (
                      <TableRow key={exam.id} className={`hover:bg-gray-50/50 ${exam.statut === 'annule' ? 'opacity-60' : ''}`}>
                        <TableCell className="text-xs text-gray-600 py-2 whitespace-nowrap">{exam.date}</TableCell>
                        <TableCell className="text-xs text-gray-600 py-2 whitespace-nowrap">{exam.heure}</TableCell>
                        <TableCell className="text-sm font-medium text-[#1a2744] py-2 whitespace-nowrap">{exam.ue}</TableCell>
                        <TableCell className="text-xs font-mono text-gray-500 py-2">{exam.code}</TableCell>
                        <TableCell className="py-2">
                          <Badge className={`text-[10px] border-0 ${colors?.bg || 'bg-gray-50'} ${colors?.text || 'text-gray-700'}`}>
                            {exam.programme}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-gray-600 py-2">{exam.niveau}</TableCell>
                        <TableCell className="text-xs text-gray-600 py-2 whitespace-nowrap">{exam.salle}</TableCell>
                        <TableCell className="text-xs text-gray-600 py-2 whitespace-nowrap max-w-[140px] truncate">{exam.surveillant}</TableCell>
                        <TableCell className="text-xs text-center py-2 font-medium text-[#1a2744]">{exam.effectif}</TableCell>
                        <TableCell className="py-2">
                          <Badge className={`text-[10px] ${statusConfig[exam.statut].className}`}>
                            {statusConfig[exam.statut].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MoreHorizontal className="size-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem className="text-xs">
                                <Pencil className="size-3.5 mr-2" />
                                Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs text-[#2d7a4f]" onClick={() => updateExamStatus(exam.id, 'CONFIRME')}>
                                <CheckCircle2 className="size-3.5 mr-2" />
                                Confirmer
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs text-[#c62828]" onClick={() => updateExamStatus(exam.id, 'ANNULE')}>
                                <XCircle className="size-3.5 mr-2" />
                                Annuler
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs">
                                <Printer className="size-3.5 mr-2" />
                                Imprimer convocation
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
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Bottom Grid: Room Assignment + Exam Statistics ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Room Assignment Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
        >
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-[#1a2744]" />
                <CardTitle className="text-sm font-semibold text-[#1a2744]">
                  Attribution des salles
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {rooms.map(room => {
                const occupancyPercent = Math.round((room.occupancy / room.capacity) * 100)
                const isOverCapacity = occupancyPercent > 90
                return (
                  <div
                    key={room.id}
                    className={`p-3 rounded-lg border ${
                      room.hasConflict
                        ? 'border-[#c6282830] bg-[#c6282808]'
                        : 'border-gray-100 bg-gray-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MapPin className={`size-3.5 ${room.hasConflict ? 'text-[#c62828]' : 'text-gray-400'}`} />
                        <span className="text-sm font-medium text-[#1a2744]">{room.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {room.hasConflict && (
                          <Badge className="text-[9px] bg-[#c6282815] text-[#c62828] border-0">
                            <AlertTriangle className="size-2.5 mr-0.5" />
                            Conflit
                          </Badge>
                        )}
                        <Badge className={`text-[10px] border-0 ${
                          isOverCapacity
                            ? 'bg-[#d4a85315] text-[#d4a853]'
                            : 'bg-[#2d7a4f15] text-[#2d7a4f]'
                        }`}>
                          {occupancyPercent}%
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Progress
                        value={occupancyPercent}
                        className={`h-2 flex-1 ${room.hasConflict ? '[&>div]:bg-[#c62828]' : ''}`}
                      />
                      <span className="text-[10px] text-gray-500 whitespace-nowrap">
                        {room.occupancy}/{room.capacity}
                      </span>
                    </div>
                    {room.hasConflict && room.conflictDetail && (
                      <p className="text-[10px] text-[#c62828] mt-1">{room.conflictDetail}</p>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </motion.div>

        {/* Exam Statistics Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="size-4 text-[#1a2744]" />
                <CardTitle className="text-sm font-semibold text-[#1a2744]">
                  Statistiques des examens
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Examens par jour - CSS Bar Chart */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-gray-400" />
                  <span className="text-xs font-medium text-gray-600">Examens par jour</span>
                </div>
                <div className="flex items-end gap-1.5 h-28 px-1">
                  {examsPerDay.map(day => (
                    <div key={day.label} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[9px] font-medium text-[#1a2744]">{day.count}</span>
                      <div
                        className={`w-full rounded-t transition-all ${
                          day.count >= 4 ? 'bg-[#c62828]' :
                          day.count >= 3 ? 'bg-[#d4a853]' :
                          'bg-[#2d7a4f]'
                        }`}
                        style={{ height: `${(day.count / maxExamsPerDay) * 80}px` }}
                      />
                      <span className="text-[8px] text-gray-400 leading-tight text-center">{day.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Taux de couverture des salles */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-gray-400" />
                    <span className="text-xs font-medium text-gray-600">Taux de couverture des salles</span>
                  </div>
                  <span className="text-sm font-bold text-[#2d7a4f]">72%</span>
                </div>
                <Progress value={72} className="h-3" />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">4 salles sur 6 utilisees</span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-sm bg-[#2d7a4f]" />
                      <span className="text-[10px] text-gray-400">Occupees</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-sm bg-gray-200" />
                      <span className="text-[10px] text-gray-400">Libres</span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Surveillants */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="size-3.5 text-gray-400" />
                    <span className="text-xs font-medium text-gray-600">Surveillants assignes vs. besoins</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-[#2d7a4f08] rounded-lg border border-[#2d7a4f15]">
                    <p className="text-lg font-bold text-[#2d7a4f]">{supervisorStats.assigned}</p>
                    <p className="text-[10px] text-gray-500">Assignes</p>
                  </div>
                  <div className="p-3 bg-[#1a274408] rounded-lg border border-[#1a274415]">
                    <p className="text-lg font-bold text-[#1a2744]">{supervisorStats.needed}</p>
                    <p className="text-[10px] text-gray-500">Besoins total</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={supervisorStats.needed > 0 ? Math.round((supervisorStats.assigned / supervisorStats.needed) * 100) : 0} className="h-2.5 flex-1" />
                  <span className="text-[10px] font-medium text-[#2d7a4f]">
                    {supervisorStats.needed > 0 ? Math.round((supervisorStats.assigned / supervisorStats.needed) * 100) : 0}%
                  </span>
                </div>
                {supervisorStats.needed - supervisorStats.assigned > 0 && (
                  <p className="text-[10px] text-[#d4a853] flex items-center gap-1">
                    <AlertTriangle className="size-3" />
                    {supervisorStats.needed - supervisorStats.assigned} surveillants encore necessaires
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {showNewExamDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowNewExamDialog(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#1a2744] mb-4">Planifier un examen</h3>
            <div className="space-y-3">
              <Input
                type="date"
                className="h-9 text-sm"
                value={newExam.examDate}
                onChange={(e) => setNewExam((f) => ({ ...f, examDate: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="time"
                  className="h-9 text-sm"
                  value={newExam.startTime}
                  onChange={(e) => setNewExam((f) => ({ ...f, startTime: e.target.value }))}
                />
                <Input
                  type="time"
                  className="h-9 text-sm"
                  value={newExam.endTime}
                  onChange={(e) => setNewExam((f) => ({ ...f, endTime: e.target.value }))}
                />
              </div>
              <Select value={newExam.roomId} onValueChange={(v) => setNewExam((f) => ({ ...f, roomId: v }))}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Salle (optionnel)" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name} ({r.capacity} places)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={newExam.sessionType} onValueChange={(v) => setNewExam((f) => ({ ...f, sessionType: v }))}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMALE">Session Normale</SelectItem>
                  <SelectItem value="RATTRAPAGE">Session de Rattrapage</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-gray-400">
                L&apos;association a une UE et l&apos;affectation d&apos;un surveillant se font depuis la fiche de l&apos;examen une fois cree.
              </p>
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="outline" className="flex-1 text-xs" onClick={() => setShowNewExamDialog(false)}>Annuler</Button>
              <Button className="flex-1 text-xs bg-[#2d7a4f] hover:bg-[#236b40] text-white" onClick={handleCreateExam} disabled={isCreatingExam}>
                {isCreatingExam ? 'Creation...' : 'Planifier'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


