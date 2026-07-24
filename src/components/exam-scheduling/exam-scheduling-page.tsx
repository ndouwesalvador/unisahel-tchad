'use client'

import { exportToExcel } from '@/lib/export'
import { useState, useMemo } from 'react'
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

// ─── Demo Data ────────────────────────────────────────────────────────────────

const examEntries: ExamEntry[] = [
  { id: '1', date: '07/07/2025', heure: '08:00 - 10:00', ue: 'Droit Civil', code: 'DR101', programme: 'Droit', niveau: 'L1', salle: 'Amphitheatre A', surveillant: 'Dr. MAHAMAT Ali', effectif: 180, statut: 'confirme' },
  { id: '2', date: '07/07/2025', heure: '10:30 - 12:30', ue: 'Algorithmique', code: 'INFO201', programme: 'Informatique', niveau: 'L2', salle: 'Labo Info 1', surveillant: 'Mme KHAMIS Fatime', effectif: 28, statut: 'confirme' },
  { id: '3', date: '07/07/2025', heure: '14:00 - 16:00', ue: 'Litterature Africaine', code: 'LIT301', programme: 'Lettres', niveau: 'L3', salle: 'Salle 101', surveillant: 'Dr. ADAM Khadija', effectif: 55, statut: 'planifie' },
  { id: '4', date: '09/07/2025', heure: '08:00 - 10:00', ue: 'Macroeconomie', code: 'ECO102', programme: 'Sciences', niveau: 'L1', salle: 'Amphitheatre A', surveillant: 'Prof. HASSAN Djibril', effectif: 195, statut: 'confirme' },
  { id: '5', date: '09/07/2025', heure: '10:30 - 12:30', ue: 'Physique', code: 'SCI201', programme: 'Sciences', niveau: 'L2', salle: 'Salle 102', surveillant: 'Dr. OUMAR Ibrahim', effectif: 38, statut: 'planifie' },
  { id: '6', date: '09/07/2025', heure: '14:00 - 16:00', ue: 'Droit Commercial', code: 'DR202', programme: 'Droit', niveau: 'L2', salle: 'Salle 101', surveillant: 'Mme FATIME Zenab', effectif: 52, statut: 'en_cours' },
  { id: '7', date: '11/07/2025', heure: '08:00 - 10:00', ue: 'Bases de donnees', code: 'INFO301', programme: 'Informatique', niveau: 'L3', salle: 'Labo Info 2', surveillant: 'Dr. BACHAR Ali', effectif: 26, statut: 'planifie' },
  { id: '8', date: '11/07/2025', heure: '10:30 - 12:30', ue: 'Philosophie du droit', code: 'DR301', programme: 'Droit', niveau: 'L3', salle: 'Amphitheatre A', surveillant: 'Prof. ABDALLAH Fadoul', effectif: 145, statut: 'confirme' },
  { id: '9', date: '11/07/2025', heure: '14:00 - 16:00', ue: 'Statistiques', code: 'SCI301', programme: 'Sciences', niveau: 'L3', salle: 'Salle 102', surveillant: 'Mme AHMAT Achta', effectif: 35, statut: 'planifie' },
  { id: '10', date: '14/07/2025', heure: '08:00 - 10:00', ue: 'Reseaux informatiques', code: 'INFO401', programme: 'Informatique', niveau: 'M1', salle: 'Labo Info 1', surveillant: 'Dr. MOUSSA Adoum', effectif: 22, statut: 'planifie' },
  { id: '11', date: '14/07/2025', heure: '10:30 - 12:30', ue: 'Droit international', code: 'DR401', programme: 'Droit', niveau: 'M1', salle: 'Salle de conference', surveillant: 'Prof. ISSA Mahamat', effectif: 85, statut: 'confirme' },
  { id: '12', date: '14/07/2025', heure: '14:00 - 16:00', ue: 'Chimie organique', code: 'SCI102', programme: 'Sciences', niveau: 'L1', salle: 'Salle 101', surveillant: 'Dr. HAMID Oumar', effectif: 48, statut: 'planifie' },
  { id: '13', date: '16/07/2025', heure: '08:00 - 10:00', ue: 'Intelligence artificielle', code: 'INFO501', programme: 'Informatique', niveau: 'M2', salle: 'Labo Info 2', surveillant: 'Dr. KHADIDJA Abakar', effectif: 18, statut: 'planifie' },
  { id: '14', date: '16/07/2025', heure: '10:30 - 12:30', ue: 'Linguistique', code: 'LIT201', programme: 'Lettres', niveau: 'L2', salle: 'Salle 102', surveillant: 'Mme BICHARA Hawa', effectif: 40, statut: 'confirme' },
  { id: '15', date: '16/07/2025', heure: '14:00 - 16:00', ue: 'Microeconomie', code: 'ECO201', programme: 'Sciences', niveau: 'L2', salle: 'Amphitheatre A', surveillant: 'Prof. HAROUN Meriam', effectif: 165, statut: 'termine' },
  { id: '16', date: '18/07/2025', heure: '08:00 - 10:00', ue: 'Droit penal', code: 'DR302', programme: 'Droit', niveau: 'L3', salle: 'Salle de conference', surveillant: 'Dr. ADOUM Abdoulaye', effectif: 92, statut: 'planifie' },
  { id: '17', date: '18/07/2025', heure: '10:30 - 12:30', ue: 'Geologie', code: 'SCI202', programme: 'Sciences', niveau: 'L2', salle: 'Salle 101', surveillant: 'Mme ZAKARIA Mariam', effectif: 44, statut: 'planifie' },
  { id: '18', date: '18/07/2025', heure: '14:00 - 16:00', ue: 'Systemes d exploitation', code: 'INFO202', programme: 'Informatique', niveau: 'L2', salle: 'Labo Info 1', surveillant: 'Dr. KHAMIS Fatime', effectif: 30, statut: 'annule' },
]

const rooms: RoomInfo[] = [
  { id: '1', name: 'Salle 101', capacity: 60, occupancy: 55, hasConflict: false },
  { id: '2', name: 'Salle 102', capacity: 40, occupancy: 38, hasConflict: false },
  { id: '3', name: 'Amphitheatre A', capacity: 200, occupancy: 195, hasConflict: true, conflictDetail: 'Macroeconomie + Droit Civil (09/07 08:00)' },
  { id: '4', name: 'Labo Info 1', capacity: 30, occupancy: 28, hasConflict: false },
  { id: '5', name: 'Labo Info 2', capacity: 30, occupancy: 26, hasConflict: false },
  { id: '6', name: 'Salle de conference', capacity: 150, occupancy: 85, hasConflict: true, conflictDetail: 'Droit international + Droit penal (14/07 10:30)' },
]

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

const weekDays = ['Lun 07', 'Mar 08', 'Mer 09', 'Jeu 10', 'Ven 11', 'Sam 12', 'Lun 14']
const weekDates = ['07/07/2025', '08/07/2025', '09/07/2025', '10/07/2025', '11/07/2025', '12/07/2025', '14/07/2025']
const timeSlots = ['08:00 - 10:00', '10:30 - 12:30', '14:00 - 16:00']

// ─── Component ─────────────────────────────────────────────────────────────────

export function ExamSchedulingPage() {
  const [selectedSession, setSelectedSession] = useState('sn-s1')
  const [selectedNiveau, setSelectedNiveau] = useState('all')
  const [filterProgramme, setFilterProgramme] = useState('all')
  const [filterSalle, setFilterSalle] = useState('all')
  const [filterStatut, setFilterStatut] = useState('all')
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0)
  const [dateDebut, setDateDebut] = useState('07/07/2025')
  const [dateFin, setDateFin] = useState('18/07/2025')

  // ─── Filtered Exams ─────────────────────────────────────────────────────
  const filteredExams = useMemo(() => {
    return examEntries.filter(e => {
      if (filterProgramme !== 'all' && e.programme !== filterProgramme) return false
      if (filterSalle !== 'all' && e.salle !== filterSalle) return false
      if (filterStatut !== 'all' && e.statut !== filterStatut) return false
      return true
    })
  }, [filterProgramme, filterSalle, filterStatut])

  // ─── Stats ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: 48,
    enCours: 12,
    termines: 28,
    conflits: 2,
  }), [])

  // ─── Weekly Calendar Data ───────────────────────────────────────────────
  const calendarExams = useMemo(() => {
    const map: Record<string, ExamEntry[]> = {}
    weekDates.forEach(d => { map[d] = [] })
    examEntries.forEach(e => {
      if (map[e.date]) {
        map[e.date].push(e)
      }
    })
    return map
  }, [])

  // ─── Exam per Day Stats ─────────────────────────────────────────────────
  const examsPerDay = useMemo(() => {
    const dayLabels = ['Lun 07', 'Mar 08', 'Mer 09', 'Jeu 10', 'Ven 11', 'Sam 12', 'Lun 14', 'Mer 16', 'Ven 18']
    const dayDateMap: Record<string, string> = {
      'Lun 07': '07/07/2025', 'Mar 08': '08/07/2025', 'Mer 09': '09/07/2025',
      'Jeu 10': '10/07/2025', 'Ven 11': '11/07/2025', 'Sam 12': '12/07/2025',
      'Lun 14': '14/07/2025', 'Mer 16': '16/07/2025', 'Ven 18': '18/07/2025',
    }
    return dayLabels.map(label => {
      const date = dayDateMap[label]
      const count = examEntries.filter(e => e.date === date).length
      return { label, count }
    })
  }, [])
  const maxExamsPerDay = Math.max(...examsPerDay.map(d => d.count), 1)

  // ─── Supervisor Stats ───────────────────────────────────────────────────
  const supervisorStats = useMemo(() => {
    const assigned = new Set(examEntries.filter(e => e.statut !== 'annule').map(e => e.surveillant)).size
    const needed = 52
    return { assigned, needed }
  }, [])

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
                              <DropdownMenuItem className="text-xs text-[#2d7a4f]">
                                <CheckCircle2 className="size-3.5 mr-2" />
                                Confirmer
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs text-[#c62828]">
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
                  <Progress value={Math.round((supervisorStats.assigned / supervisorStats.needed) * 100)} className="h-2.5 flex-1" />
                  <span className="text-[10px] font-medium text-[#2d7a4f]">
                    {Math.round((supervisorStats.assigned / supervisorStats.needed) * 100)}%
                  </span>
                </div>
                <p className="text-[10px] text-[#d4a853] flex items-center gap-1">
                  <AlertTriangle className="size-3" />
                  {supervisorStats.needed - supervisorStats.assigned} surveillants encore necessaires
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}


