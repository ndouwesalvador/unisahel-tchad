'use client'

import { useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { useAdvising, useStudents } from '@/lib/api-hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Users,
  CalendarCheck,
  TrendingUp,
  UserCheck,
  Calendar,
  Search,
  MoreHorizontal,
  Eye,
  Phone,
  Clock,
  MapPin,
  BookOpen,
  Target,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  GraduationCap,
  Heart,
  ChevronDown,
  ChevronUp,
  Plus,
  PlayCircle,
  Ban,
} from 'lucide-react'

// ─── API Types ──────────────────────────────────────────────────────────────
// Shapes returned by GET /api/advising - see src/app/api/advising/route.ts.

type AppointmentStatus = 'Planifie' | 'En cours' | 'Termine' | 'Annule'
type AlertLevel = 'Vert' | 'Jaune' | 'Orange' | 'Rouge'

interface ApiAppointment {
  id: string
  studentId: string
  advisorId: string
  studentName: string
  matricule: string
  type: string
  date: string
  time: string
  scheduledAtIso: string
  createdAtIso: string
  conseiller: string
  status: string
  notes: string | null
}

interface ApiAdvisor {
  id: string
  name: string
  title: string
  department: string
  specialties: string[]
  etudiantsSuivis: number
  disponibilite: string
}

interface ApiWorkshop {
  id: string
  title: string
  inscrits: number
  places: number
  salle: string
  date: string
  time: string
  instructor: string
}

interface ApiMonitoredStudent {
  id: string
  name: string
  matricule: string
  program: string
  level: string
  moyenne: number
  creditsAcquis: number
  creditsTotal: number
  dettes: number
  alertLevel: AlertLevel
  conseiller: string
  dernierEntretien: string
}

interface ApiMotif {
  motif: string
  percent: number
  color: string
}

interface StudentOption {
  id: string
  firstName: string
  lastName: string
  matricule: string | null
  currentProgram: { name: string } | null
  currentLevel: { name: string } | null
}

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

// ─── Derived-data helpers (all computed from real appointment timestamps) ──────

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEK_DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven']

function buildMonthlyTrend(appointments: ApiAppointment[]) {
  const now = new Date()
  const months: { key: string; label: string }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTH_LABELS[d.getMonth()] })
  }
  const counts = new Map<string, number>()
  for (const a of appointments) {
    const d = new Date(a.scheduledAtIso)
    if (Number.isNaN(d.getTime())) continue
    const key = `${d.getFullYear()}-${d.getMonth()}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return months.map((m) => ({ month: m.label, count: counts.get(m.key) ?? 0 }))
}

function buildWeekSchedule(appointments: ApiAppointment[]): Record<string, ApiAppointment[]> {
  const now = new Date()
  const diffToMonday = (now.getDay() + 6) % 7
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday)
  const buckets: Record<string, ApiAppointment[]> = { Lun: [], Mar: [], Mer: [], Jeu: [], Ven: [] }
  for (const a of appointments) {
    const d = new Date(a.scheduledAtIso)
    if (Number.isNaN(d.getTime())) continue
    const diffDays = Math.floor((d.getTime() - monday.getTime()) / 86400000)
    if (diffDays >= 0 && diffDays < 5) {
      buckets[WEEK_DAYS[diffDays]].push(a)
    }
  }
  return buckets
}

function getInitials(name: string): string {
  const cleaned = name.replace(/^(Dr\.|Mme\.|M\.)\s*/i, '').trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  return parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('')
}

const AVATAR_GRADIENTS: [string, string][] = [
  ['#1a2744', '#2d7a4f'],
  ['#2d7a4f', '#3da66a'],
  ['#d4a853', '#c4933e'],
  ['#1a2744', '#d4a853'],
  ['#2d7a4f', '#d4a853'],
  ['#d4a853', '#1a2744'],
]

function getAvatarGradient(index: number): [string, string] {
  return AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length]
}

const ALERT_GRADIENTS: Record<AlertLevel, [string, string]> = {
  Vert: ['#2d7a4f', '#3da66a'],
  Jaune: ['#d4a853', '#c4933e'],
  Orange: ['#ea580c', '#c2410c'],
  Rouge: ['#c62828', '#8f1d1d'],
}

const ALERT_SEVERITY: Record<AlertLevel, number> = { Rouge: 0, Orange: 1, Jaune: 2, Vert: 3 }

const APPOINTMENT_TYPE_OPTIONS = [
  'Orientation',
  'Suivi pedagogique',
  'Projet professionnel',
  'Reorientation',
  'Probleme personnel',
]

// ─── Config Maps ──────────────────────────────────────────────────────────────

const typeConfig: Record<string, { label: string; className: string }> = {
  'Orientation': { label: 'Orientation', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' },
  'Suivi pedagogique': { label: 'Suivi ped.', className: 'bg-[#1a274415] text-[#1a2744] border-0' },
  'Reorientation': { label: 'Reorientation', className: 'bg-[#ea580c15] text-[#ea580c] border-0' },
  'Probleme personnel': { label: 'Perso.', className: 'bg-[#d4a85315] text-[#d4a853] border-0' },
  'Projet professionnel': { label: 'Projet pro.', className: 'bg-[#8b5cf615] text-[#8b5cf6] border-0' },
}

const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  'Planifie': { label: 'Planifie', className: 'bg-[#1a274415] text-[#1a2744] border-0', icon: Clock },
  'En cours': { label: 'En cours', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0', icon: CalendarCheck },
  'Termine': { label: 'Termine', className: 'bg-[#d4a85315] text-[#d4a853] border-0', icon: CheckCircle2 },
  'Annule': { label: 'Annule', className: 'bg-[#c6282815] text-[#c62828] border-0', icon: XCircle },
}

const alertConfig: Record<string, { label: string; className: string; bgClass: string; icon: React.ElementType }> = {
  'Vert': { label: 'Vert', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0', bgClass: 'bg-[#2d7a4f08]', icon: CheckCircle2 },
  'Jaune': { label: 'Jaune', className: 'bg-[#d4a85315] text-[#d4a853] border-0', bgClass: 'bg-[#d4a85308]', icon: AlertTriangle },
  'Orange': { label: 'Orange', className: 'bg-[#ea580c15] text-[#ea580c] border-0', bgClass: 'bg-[#ea580c08]', icon: AlertTriangle },
  'Rouge': { label: 'Rouge', className: 'bg-[#c6282815] text-[#c62828] border-0', bgClass: 'bg-[#c6282808]', icon: XCircle },
}

const disponibiliteConfig: Record<string, { label: string; className: string; dotColor: string }> = {
  'Libre': { label: 'Libre', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0', dotColor: '#2d7a4f' },
  'Occupe': { label: 'Occupe', className: 'bg-[#d4a85315] text-[#d4a853] border-0', dotColor: '#d4a853' },
  'En RDV': { label: 'En RDV', className: 'bg-[#1a274415] text-[#1a2744] border-0', dotColor: '#1a2744' },
}

const specialtyConfig: Record<string, { label: string; className: string }> = {
  'Orientation': { label: 'Orientation', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' },
  'Pedagogie': { label: 'Pedagogie', className: 'bg-[#1a274415] text-[#1a2744] border-0' },
  'Professionnel': { label: 'Professionnel', className: 'bg-[#d4a85315] text-[#d4a853] border-0' },
  'Psychologique': { label: 'Psychologique', className: 'bg-[#8b5cf615] text-[#8b5cf6] border-0' },
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AdvisingPage() {
  const queryClient = useQueryClient()
  const { data: advisingData, isLoading } = useAdvising()
  const { data: studentsData } = useStudents({ limit: 1000 })

  const appointments: ApiAppointment[] = advisingData?.appointments || []
  const advisors: ApiAdvisor[] = advisingData?.advisors || []
  const workshops: ApiWorkshop[] = advisingData?.workshops || []
  const monitoredStudents: ApiMonitoredStudent[] = advisingData?.monitoredStudents || []
  const motifData: ApiMotif[] = advisingData?.motifData || []
  const passingGrade: number = advisingData?.passingGrade ?? 10
  const studentOptions: StudentOption[] = studentsData?.data || []

  const [showSchedule, setShowSchedule] = useState(false)
  const [searchMonitored, setSearchMonitored] = useState('')
  const [filterNiveau, setFilterNiveau] = useState('tous')
  const [filterFiliere, setFilterFiliere] = useState('tous')
  const [filterAlerte, setFilterAlerte] = useState('tous')
  const [filterConseiller, setFilterConseiller] = useState('tous')

  const [showNewAppointment, setShowNewAppointment] = useState(false)
  const [isSubmittingAppt, setIsSubmittingAppt] = useState(false)
  const [newAppt, setNewAppt] = useState({ studentId: '', advisorId: '', type: 'Suivi pedagogique', date: '', time: '', notes: '' })

  // ── Real derived aggregates (no fabricated numbers) ──────────────────────
  const now = new Date()

  const distinctAdvisedStudents = new Set(appointments.map((a) => a.studentId))
  const etudiantsAccompagnes = distinctAdvisedStudents.size

  const sessionsThisMonth = appointments.filter((a) => {
    const d = new Date(a.scheduledAtIso)
    return a.status !== 'Annule' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const diffToMonday = (now.getDay() + 6) % 7
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday)
  const endOfWeek = new Date(startOfWeek.getTime() + 7 * 86400000)
  const sessionsThisWeek = appointments.filter((a) => {
    const d = new Date(a.scheduledAtIso)
    return a.status !== 'Annule' && d >= startOfWeek && d < endOfWeek
  }).length

  const reorientationCount = appointments.filter((a) => a.type === 'Reorientation').length
  const tauxReorientation = appointments.length > 0 ? Math.round((reorientationCount / appointments.length) * 100) : 0

  const successCount = monitoredStudents.filter((s) => s.moyenne >= passingGrade).length
  const tauxReussite = monitoredStudents.length > 0 ? Math.round((successCount / monitoredStudents.length) * 100) : 0

  const advisorsDisponibles = advisors.filter((a) => a.disponibilite === 'Libre').length

  const advisedMonitoredCount = monitoredStudents.filter((s) => s.conseiller !== '—').length
  const coverageRate = monitoredStudents.length > 0 ? Math.round((advisedMonitoredCount / monitoredStudents.length) * 100) : 0

  const cancelledCount = appointments.filter((a) => a.status === 'Annule').length
  const cancellationRate = appointments.length > 0 ? Math.round((cancelledCount / appointments.length) * 100) : 0

  const leadTimes = appointments
    .map((a) => (new Date(a.scheduledAtIso).getTime() - new Date(a.createdAtIso).getTime()) / 86400000)
    .filter((v) => Number.isFinite(v) && v >= 0)
  const avgLeadTimeDays = leadTimes.length > 0 ? leadTimes.reduce((sum, v) => sum + v, 0) / leadTimes.length : 0

  const apptCountByStudent = new Map<string, number>()
  for (const a of appointments) {
    apptCountByStudent.set(a.studentId, (apptCountByStudent.get(a.studentId) ?? 0) + 1)
  }
  const returningStudents = Array.from(apptCountByStudent.values()).filter((c) => c >= 2).length
  const returnRate = apptCountByStudent.size > 0 ? Math.round((returningStudents / apptCountByStudent.size) * 100) : 0

  const monthlyData = buildMonthlyTrend(appointments)
  const maxMonthly = Math.max(1, ...monthlyData.map((m) => m.count))
  const weekSchedule = buildWeekSchedule(appointments)

  // Filter dropdown options derived from real monitored-student / advisor data
  const niveauOptions = Array.from(new Set(monitoredStudents.map((s) => s.level).filter((l) => l && l !== '—'))).sort()
  const filiereOptions = Array.from(new Set(monitoredStudents.map((s) => s.program).filter((p) => p && p !== '—'))).sort()
  const conseillerOptions = Array.from(new Set(advisors.map((a) => a.name)))

  // Filter monitored students
  const filteredStudents = monitoredStudents.filter(s => {
    const matchSearch = searchMonitored === '' ||
      s.name.toLowerCase().includes(searchMonitored.toLowerCase()) ||
      s.matricule.toLowerCase().includes(searchMonitored.toLowerCase())
    const matchNiveau = filterNiveau === 'tous' || s.level === filterNiveau
    const matchFiliere = filterFiliere === 'tous' || s.program === filterFiliere
    const matchAlerte = filterAlerte === 'tous' || s.alertLevel === filterAlerte
    const matchConseiller = filterConseiller === 'tous' || s.conseiller === filterConseiller
    return matchSearch && matchNiveau && matchFiliere && matchAlerte && matchConseiller
  })

  // Plan d'accompagnement: the most urgent monitored student (Rouge > Orange > Jaune > Vert)
  const priorityStudent = monitoredStudents.length > 0
    ? [...monitoredStudents].sort((a, b) => ALERT_SEVERITY[a.alertLevel] - ALERT_SEVERITY[b.alertLevel])[0]
    : null

  const objectifs = priorityStudent ? [
    {
      objectif: `Atteindre la moyenne minimale de ${passingGrade}/20`,
      progress: Math.max(0, Math.min(100, Math.round((priorityStudent.moyenne / passingGrade) * 100))),
      color: '#2d7a4f',
    },
    {
      objectif: `Valider les ${priorityStudent.creditsTotal} credits de l'annee`,
      progress: priorityStudent.creditsTotal > 0 ? Math.round((priorityStudent.creditsAcquis / priorityStudent.creditsTotal) * 100) : 0,
      color: '#1a2744',
    },
    {
      objectif: 'Regulariser les paiements en attente',
      progress: priorityStudent.dettes === 0 ? 100 : Math.max(0, 100 - priorityStudent.dettes * 25),
      color: '#d4a853',
    },
  ] : []

  const priorityStudentAppointments = priorityStudent
    ? appointments
        .filter((a) => a.studentId === priorityStudent.id)
        .slice()
        .sort((a, b) => new Date(b.scheduledAtIso).getTime() - new Date(a.scheduledAtIso).getTime())
    : []

  // ── Mutations ─────────────────────────────────────────────────────────────

  const openNewAppointment = (prefill?: { studentId?: string; advisorId?: string }) => {
    setNewAppt((f) => ({ ...f, studentId: prefill?.studentId ?? f.studentId, advisorId: prefill?.advisorId ?? f.advisorId }))
    setShowNewAppointment(true)
  }

  const createAppointment = async () => {
    if (!newAppt.studentId || !newAppt.advisorId || !newAppt.date || !newAppt.time) {
      toast.error('Champs requis manquants', { description: 'Etudiant, conseiller, date et heure sont obligatoires' })
      return
    }
    setIsSubmittingAppt(true)
    try {
      const scheduledAt = new Date(`${newAppt.date}T${newAppt.time}`)
      if (Number.isNaN(scheduledAt.getTime())) {
        throw new Error('Date ou heure invalide')
      }
      const res = await fetch('/api/advising', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: newAppt.studentId,
          advisorId: newAppt.advisorId,
          type: newAppt.type,
          scheduledAt: scheduledAt.toISOString(),
          notes: newAppt.notes || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Echec de la planification')
      toast.success('Rendez-vous planifie')
      queryClient.invalidateQueries({ queryKey: ['advising'] })
      setShowNewAppointment(false)
      setNewAppt({ studentId: '', advisorId: '', type: 'Suivi pedagogique', date: '', time: '', notes: '' })
    } catch (e) {
      toast.error('Erreur', { description: e instanceof Error ? e.message : 'Echec de la planification' })
    } finally {
      setIsSubmittingAppt(false)
    }
  }

  const updateAppointmentStatus = async (id: string, status: AppointmentStatus) => {
    try {
      const res = await fetch(`/api/advising?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Echec de la mise a jour')
      toast.success('Statut mis a jour')
      queryClient.invalidateQueries({ queryKey: ['advising'] })
    } catch (e) {
      toast.error('Erreur', { description: e instanceof Error ? e.message : 'Echec de la mise a jour' })
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.06 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
  } as const

  const noAdvisors = !isLoading && advisors.length === 0

  const newAppointmentDialog = (
    <Dialog open={showNewAppointment} onOpenChange={setShowNewAppointment}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="text-xs bg-[#2d7a4f] hover:bg-[#236b40] text-white"
          disabled={noAdvisors}
          onClick={() => openNewAppointment()}
        >
          <Plus className="size-3.5 mr-1.5" />
          Nouveau rendez-vous
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Planifier un rendez-vous de conseil</DialogTitle>
        </DialogHeader>
        {noAdvisors ? (
          <div className="py-6 text-center">
            <p className="text-sm text-gray-500">
              Aucun conseiller enregistre — contactez un administrateur pour en ajouter avant de pouvoir planifier un rendez-vous.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm">Etudiant</Label>
              <Select value={newAppt.studentId} onValueChange={(v) => setNewAppt((f) => ({ ...f, studentId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner un etudiant" />
                </SelectTrigger>
                <SelectContent>
                  {studentOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.lastName.toUpperCase()} {s.firstName} {s.matricule ? `(${s.matricule})` : ''}
                    </SelectItem>
                  ))}
                  {studentOptions.length === 0 && (
                    <div className="px-2 py-1.5 text-xs text-gray-400">Aucun etudiant trouve</div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Conseiller</Label>
              <Select value={newAppt.advisorId} onValueChange={(v) => setNewAppt((f) => ({ ...f, advisorId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner un conseiller" />
                </SelectTrigger>
                <SelectContent>
                  {advisors.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Motif</Label>
              <Select value={newAppt.type} onValueChange={(v) => setNewAppt((f) => ({ ...f, type: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Motif" />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>{typeConfig[t]?.label || t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Date</Label>
                <Input type="date" value={newAppt.date} onChange={(e) => setNewAppt((f) => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Heure</Label>
                <Input type="time" value={newAppt.time} onChange={(e) => setNewAppt((f) => ({ ...f, time: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Notes (optionnel)</Label>
              <Textarea
                placeholder="Contexte, objectifs de la rencontre..."
                value={newAppt.notes}
                onChange={(e) => setNewAppt((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1 bg-[#2d7a4f] hover:bg-[#236b40] text-white" disabled={isSubmittingAppt} onClick={createAppointment}>
                {isSubmittingAppt ? 'Planification...' : 'Planifier'}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowNewAppointment(false)}>
                Annuler
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )

  return (
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
            <pattern id="advising-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="40" height="40" fill="none" stroke="white" strokeWidth="0.5" />
              <circle cx="20" cy="20" r="3" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#advising-pattern)" />
        </svg>
        <div className="relative z-10 px-6 py-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Orientation &amp; Accompagnement</h1>
              <p className="text-sm text-white/70 mt-1">Conseil et suivi des parcours academiques</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/10"><Users className="size-5 text-white" /></div>
                <div>
                  <p className="text-xl font-bold text-white">{useCountUp(etudiantsAccompagnes, 1400)}</p>
                  <p className="text-[10px] text-white/70">Etudiants accompagnes</p>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/10"><CalendarCheck className="size-5 text-white" /></div>
                <div>
                  <p className="text-xl font-bold text-white">{useCountUp(sessionsThisMonth, 1200)}</p>
                  <p className="text-[10px] text-white/70">Sessions ce mois</p>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/10"><TrendingUp className="size-5 text-white" /></div>
                <div>
                  <p className="text-xl font-bold text-white">{useCountUp(tauxReorientation, 1300)}%</p>
                  <p className="text-[10px] text-white/70">Taux de reorientation</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Stats Cards ──────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Etudiants suivis */}
        <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
        <Card className="overflow-hidden relative border-l-4 border-l-[#2d7a4f]">
          <div className="h-1 bg-gradient-to-r from-[#2d7a4f] to-[#3da66a]" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#2d7a4f08] to-[#2d7a4f00] pointer-events-none" />
          <CardContent className="p-4 relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Etudiants suivis</p>
                <p className="text-xl font-bold text-[#2d7a4f] mt-1">{useCountUp(monitoredStudents.length, 1400)}</p>
                <p className="text-xs text-gray-400 mt-1">{advisedMonitoredCount} avec conseiller assigne</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#2d7a4f15] flex items-center justify-center">
                <Users className="size-5 text-[#2d7a4f]" />
              </div>
            </div>
            <div className="mt-3">
              <Progress value={coverageRate} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#2d7a4f]" />
            </div>
          </CardContent>
        </Card>
        </motion.div>

        {/* Rendez-vous ce mois */}
        <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
        <Card className="overflow-hidden relative border-l-4 border-l-[#1a2744]">
          <div className="h-1 bg-gradient-to-r from-[#1a2744] to-[#2d3e5e]" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a274408] to-[#1a274400] pointer-events-none" />
          <CardContent className="p-4 relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Rendez-vous ce mois</p>
                <p className="text-xl font-bold text-[#1a2744] mt-1">{useCountUp(sessionsThisMonth, 1200)}</p>
                <p className="text-xs text-gray-400 mt-1">{sessionsThisWeek} cette semaine</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#1a274415] flex items-center justify-center">
                <CalendarCheck className="size-5 text-[#1a2744]" />
              </div>
            </div>
            <div className="mt-3">
              <Progress value={appointments.length > 0 ? Math.round((sessionsThisMonth / appointments.length) * 100) : 0} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#1a2744]" />
            </div>
          </CardContent>
        </Card>
        </motion.div>

        {/* Taux de reussite */}
        <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
        <Card className="overflow-hidden relative border-l-4 border-l-[#d4a853]">
          <div className="h-1 bg-gradient-to-r from-[#d4a853] to-[#e6c477]" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#d4a85308] to-[#d4a85300] pointer-events-none" />
          <CardContent className="p-4 relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Taux de reussite</p>
                <p className="text-xl font-bold text-[#d4a853] mt-1">{useCountUp(tauxReussite, 1300)}%</p>
                <p className="text-xs text-gray-400 mt-1">{successCount}/{monitoredStudents.length} suivis au-dessus de {passingGrade}/20</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#d4a85315] flex items-center justify-center">
                <TrendingUp className="size-5 text-[#d4a853]" />
              </div>
            </div>
            <div className="mt-3">
              <Progress value={tauxReussite} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#d4a853]" />
            </div>
          </CardContent>
        </Card>
        </motion.div>

        {/* Conseillers actifs */}
        <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
        <Card className="overflow-hidden relative border-l-4 border-l-[#1a2744]">
          <div className="h-1 bg-gradient-to-r from-[#1a2744] to-[#2d3e5e]" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a274408] to-[#1a274400] pointer-events-none" />
          <CardContent className="p-4 relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Conseillers actifs</p>
                <p className="text-xl font-bold text-[#1a2744] mt-1">{useCountUp(advisors.length, 1000)}</p>
                <p className="text-xs text-gray-400 mt-1">{advisorsDisponibles} disponibles</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#1a274415] flex items-center justify-center">
                <UserCheck className="size-5 text-[#1a2744]" />
              </div>
            </div>
            <div className="mt-3">
              <Progress value={advisors.length > 0 ? Math.round((advisorsDisponibles / advisors.length) * 100) : 0} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#1a2744]" />
            </div>
          </CardContent>
        </Card>
        </motion.div>
      </motion.div>

      {/* ── Rendez-vous de Conseils Card ──────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="border-l-4 border-l-[#1a2744]">
          <div className="h-1 bg-gradient-to-r from-[#1a2744] via-[#2d7a4f] to-[#d4a853]" />
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="text-sm font-semibold text-[#1a2744]">Rendez-vous de conseils</CardTitle>
              <div className="flex items-center gap-2">
                {newAppointmentDialog}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-[#2d7a4f] hover:text-[#236b40] hover:bg-[#2d7a4f10]"
                  onClick={() => setShowSchedule(!showSchedule)}
                >
                  {showSchedule ? (
                    <>
                      <ChevronUp className="size-3.5 mr-1.5" />
                      Masquer emploi du temps
                    </>
                  ) : (
                    <>
                      <ChevronDown className="size-3.5 mr-1.5" />
                      Voir emploi du temps
                    </>
                  )}
                </Button>
              </div>
            </div>
            {noAdvisors && (
              <p className="text-xs text-gray-400 mt-1">
                Aucun conseiller enregistre — contactez un administrateur pour en ajouter avant de planifier un rendez-vous.
              </p>
            )}
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="overflow-x-auto rounded-lg border border-gray-100 max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 sticky top-0 z-10">
                    <TableHead className="text-xs font-semibold">Etudiant</TableHead>
                    <TableHead className="text-xs font-semibold">Type</TableHead>
                    <TableHead className="text-xs font-semibold">Date &amp; Heure</TableHead>
                    <TableHead className="text-xs font-semibold">Conseiller</TableHead>
                    <TableHead className="text-xs font-semibold">Statut</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((appt) => {
                    const tConf = typeConfig[appt.type]
                    const sConf = statusConfig[appt.status]
                    return (
                      <TableRow key={appt.id} className="hover:bg-[#2d7a4f05] transition-colors">
                        <TableCell className="py-2.5">
                          <div>
                            <p className="text-sm font-medium text-[#1a2744]">{appt.studentName}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{appt.matricule}</p>
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5">
                          {tConf ? (
                            <Badge className={`text-[10px] ${tConf.className}`}>{tConf.label}</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">{appt.type}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-2.5">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="size-3 text-gray-400" />
                            <span className="text-xs text-gray-600">{appt.date}</span>
                            <Clock className="size-3 text-gray-400 ml-1" />
                            <span className="text-xs text-gray-600">{appt.time}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-gray-600 py-2.5">{appt.conseiller}</TableCell>
                        <TableCell className="py-2.5">
                          {sConf ? (
                            <div className="flex items-center gap-1.5">
                              <motion.div
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: appt.status === 'En cours' ? '#2d7a4f' : appt.status === 'Planifie' ? '#d4a853' : 'transparent' }}
                                animate={appt.status === 'En cours' || appt.status === 'Planifie' ? { scale: [1, 1.4, 1], opacity: [1, 0.6, 1] } : {}}
                                transition={{ duration: 2, repeat: Infinity }}
                              />
                              <Badge className={`text-[10px] ${sConf.className}`}>
                                <sConf.icon className="size-3 mr-1" />
                                {sConf.label}
                              </Badge>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">{appt.status}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right py-2.5">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-gray-100" disabled={appt.status === 'Termine' || appt.status === 'Annule'}>
                                <MoreHorizontal className="size-4 text-gray-600" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              {appt.status === 'Planifie' && (
                                <DropdownMenuItem className="text-xs" onClick={() => updateAppointmentStatus(appt.id, 'En cours')}>
                                  <PlayCircle className="size-3.5 mr-2" />
                                  Demarrer
                                </DropdownMenuItem>
                              )}
                              {appt.status === 'En cours' && (
                                <DropdownMenuItem className="text-xs" onClick={() => updateAppointmentStatus(appt.id, 'Termine')}>
                                  <CheckCircle2 className="size-3.5 mr-2" />
                                  Terminer
                                </DropdownMenuItem>
                              )}
                              {(appt.status === 'Planifie' || appt.status === 'En cours') && (
                                <DropdownMenuItem className="text-xs text-red-600" onClick={() => updateAppointmentStatus(appt.id, 'Annule')}>
                                  <Ban className="size-3.5 mr-2" />
                                  Annuler
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {isLoading && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-sm text-gray-400">
                        Chargement...
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && appointments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-sm text-gray-400">
                        Aucun rendez-vous planifie pour le moment
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Schedule view toggle */}
            {showSchedule && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-4 rounded-lg bg-gray-50 border border-gray-100"
              >
                <p className="text-xs font-semibold text-[#1a2744] mb-3">Emploi du temps de la semaine en cours</p>
                <div className="grid grid-cols-5 gap-2">
                  {WEEK_DAYS.map(day => (
                    <div key={day} className="text-center">
                      <p className="text-[10px] font-semibold text-gray-500 mb-2">{day}</p>
                      <div className="space-y-1">
                        {weekSchedule[day].length === 0 && (
                          <p className="text-[9px] text-gray-300 italic">Aucun RV</p>
                        )}
                        {weekSchedule[day].map(appt => (
                            <div key={appt.id} className="p-1.5 rounded bg-white border border-gray-100 text-left">
                              <p className="text-[9px] font-medium text-[#1a2744] truncate">{appt.studentName}</p>
                              <p className="text-[8px] text-gray-400">{appt.time}</p>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Suivi Pedagogique Table ────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="border-l-4 border-l-[#2d7a4f]">
          <div className="h-1 bg-gradient-to-r from-[#2d7a4f] to-[#3da66a]" />
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[#1a2744]">Suivi pedagogique</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {/* Search + Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par nom, matricule..."
                  className="pl-9 h-9 text-sm"
                  value={searchMonitored}
                  onChange={(e) => setSearchMonitored(e.target.value)}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select value={filterNiveau} onValueChange={setFilterNiveau}>
                  <SelectTrigger className="w-[100px] h-9 text-xs">
                    <SelectValue placeholder="Niveau" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous niveaux</SelectItem>
                    {niveauOptions.map((n) => (
                      <SelectItem key={n} value={n}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterFiliere} onValueChange={setFilterFiliere}>
                  <SelectTrigger className="w-[150px] h-9 text-xs">
                    <SelectValue placeholder="Filiere" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Toutes filieres</SelectItem>
                    {filiereOptions.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterAlerte} onValueChange={setFilterAlerte}>
                  <SelectTrigger className="w-[130px] h-9 text-xs">
                    <SelectValue placeholder="Alerte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous niveaux</SelectItem>
                    <SelectItem value="Vert">Vert</SelectItem>
                    <SelectItem value="Jaune">Jaune</SelectItem>
                    <SelectItem value="Orange">Orange</SelectItem>
                    <SelectItem value="Rouge">Rouge</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterConseiller} onValueChange={setFilterConseiller}>
                  <SelectTrigger className="w-[150px] h-9 text-xs">
                    <SelectValue placeholder="Conseiller" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous conseillers</SelectItem>
                    {conseillerOptions.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Students Table */}
            <div className="overflow-x-auto rounded-lg border border-gray-100 max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 sticky top-0 z-10">
                    <TableHead className="text-xs font-semibold">Etudiant</TableHead>
                    <TableHead className="text-xs font-semibold">Filiere</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Niveau</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Moyenne</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Credits</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Dettes</TableHead>
                    <TableHead className="text-xs font-semibold">Alerte</TableHead>
                    <TableHead className="text-xs font-semibold">Conseiller</TableHead>
                    <TableHead className="text-xs font-semibold">Dernier RV</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => {
                    const aConf = alertConfig[student.alertLevel]
                    return (
                      <TableRow
                        key={student.id}
                        className={`hover:bg-[#2d7a4f05] transition-colors ${aConf ? aConf.bgClass : ''}`}
                      >
                        <TableCell className="py-2.5">
                          <div>
                            <p className="text-sm font-medium text-[#1a2744]">{student.name}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{student.matricule}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-gray-600 py-2.5">{student.program}</TableCell>
                        <TableCell className="text-center py-2.5">
                          <Badge variant="outline" className="text-[10px] font-mono border-gray-200 text-gray-600">
                            {student.level}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center py-2.5">
                          <span className={`text-sm font-semibold ${
                            student.moyenne >= passingGrade + 2 ? 'text-[#2d7a4f]' :
                            student.moyenne >= passingGrade ? 'text-[#d4a853]' :
                            'text-[#c62828]'
                          }`}>
                            {student.moyenne.toFixed(1)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center py-2.5">
                          <div className="flex items-center gap-1 justify-center">
                            <span className="text-xs font-semibold text-[#1a2744]">{student.creditsAcquis}</span>
                            <span className="text-[10px] text-gray-400">/{student.creditsTotal}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center py-2.5">
                          <span className={`text-xs font-semibold ${
                            student.dettes === 0 ? 'text-[#2d7a4f]' :
                            student.dettes <= 3 ? 'text-[#d4a853]' :
                            'text-[#c62828]'
                          }`}>
                            {student.dettes}
                          </span>
                        </TableCell>
                        <TableCell className="py-2.5">
                          {aConf ? (
                            <Badge className={`text-[10px] ${aConf.className}`}>
                              <aConf.icon className="size-3 mr-1" />
                              {aConf.label}
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-xs text-gray-600 py-2.5">{student.conseiller}</TableCell>
                        <TableCell className="text-xs text-gray-500 py-2.5">{student.dernierEntretien}</TableCell>
                        <TableCell className="text-right py-2.5">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-gray-100">
                                <MoreHorizontal className="size-4 text-gray-600" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem className="text-xs">
                                <Eye className="size-3.5 mr-2" />
                                Voir fiche
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-xs"
                                disabled={noAdvisors}
                                onClick={() => openNewAppointment({ studentId: student.id })}
                              >
                                <Calendar className="size-3.5 mr-2" />
                                Planifier RV
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs">
                                <Phone className="size-3.5 mr-2" />
                                Contacter
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {isLoading && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-sm text-gray-400">
                        Chargement...
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && monitoredStudents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-sm text-gray-400">
                        Aucun etudiant suivi pour le moment (aucune note enregistree pour l&apos;annee en cours)
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && monitoredStudents.length > 0 && filteredStudents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-sm text-gray-400">
                        Aucun etudiant trouve avec ces filtres
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Plan d'Accompagnement Card ─────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="border-l-4 border-l-[#d4a853]">
          <div className="h-1 bg-gradient-to-r from-[#d4a853] to-[#e6c477]" />
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-[#1a2744]">Plan d&apos;accompagnement</CardTitle>
              {priorityStudent && (
                <Badge className="text-[10px] bg-[#d4a85315] text-[#d4a853] border-0">
                  <Target className="size-3 mr-1" />
                  Suivi prioritaire
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-5">
            {!priorityStudent ? (
              <p className="text-sm text-gray-400 text-center py-6">
                Aucun etudiant suivi pour le moment — un plan d&apos;accompagnement apparaitra ici des qu&apos;un etudiant aura des notes enregistrees.
              </p>
            ) : (
              <>
                {/* Student Info Header */}
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm"
                        style={{ background: `linear-gradient(135deg, ${ALERT_GRADIENTS[priorityStudent.alertLevel][0]}, ${ALERT_GRADIENTS[priorityStudent.alertLevel][1]})` }}
                      >
                        {getInitials(priorityStudent.name)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#1a2744]">{priorityStudent.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{priorityStudent.matricule} - {priorityStudent.program} - {priorityStudent.level}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400 uppercase">Moyenne</p>
                        <p className="text-sm font-bold" style={{ color: ALERT_GRADIENTS[priorityStudent.alertLevel][0] }}>{priorityStudent.moyenne.toFixed(1)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400 uppercase">Credits</p>
                        <p className="text-sm font-bold text-[#1a2744]">{priorityStudent.creditsAcquis}/{priorityStudent.creditsTotal}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400 uppercase">Dettes</p>
                        <p className="text-sm font-bold text-[#c62828]">{priorityStudent.dettes}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Objectifs definis */}
                <div>
                  <p className="text-xs font-semibold text-[#1a2744] mb-3">Objectifs definis</p>
                  <div className="space-y-3">
                    {objectifs.map((obj, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">{obj.objectif}</span>
                          <span className="text-[10px] font-semibold" style={{ color: obj.color }}>{obj.progress}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: obj.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, obj.progress)}%` }}
                            transition={{ duration: 0.8, delay: 0.1 * idx, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ressources recommandees */}
                <div>
                  <p className="text-xs font-semibold text-[#1a2744] mb-3">Ressources recommandees</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { title: 'Tutorat individuel', desc: 'Renforcement en UE deficitaires', icon: GraduationCap, color: '#2d7a4f' },
                      { title: 'Atelier methode', desc: 'Techniques de travail efficaces', icon: BookOpen, color: '#1a2744' },
                      { title: 'Suivi psychologique', desc: 'Accompagnement personnel', icon: Heart, color: '#d4a853' },
                    ].map((res, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-gray-50 border border-gray-100 hover:border-gray-200 transition-colors">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${res.color}15` }}>
                            <res.icon className="size-3.5" style={{ color: res.color }} />
                          </div>
                          <span className="text-xs font-semibold text-[#1a2744]">{res.title}</span>
                        </div>
                        <p className="text-[10px] text-gray-500">{res.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Historique des entretiens */}
                <div>
                  <p className="text-xs font-semibold text-[#1a2744] mb-3">Historique des entretiens</p>
                  {priorityStudentAppointments.length === 0 ? (
                    <p className="text-xs text-gray-400">Aucun entretien enregistre pour cet etudiant.</p>
                  ) : (
                    <div className="space-y-3">
                      {priorityStudentAppointments.map((entretien, idx) => (
                        <div key={entretien.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#2d7a4f] mt-1 shrink-0" />
                            {idx < priorityStudentAppointments.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 mt-1" />}
                          </div>
                          <div className="flex-1 pb-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-[#1a2744]">{entretien.date}</span>
                              <Badge variant="outline" className="text-[9px] border-gray-200 text-gray-500 py-0">{entretien.conseiller}</Badge>
                              {statusConfig[entretien.status] && (
                                <Badge className={`text-[9px] py-0 ${statusConfig[entretien.status].className}`}>{statusConfig[entretien.status].label}</Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed">{entretien.notes || 'Aucune note enregistree pour cet entretien.'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Equipe de Conseillers Card ─────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="border-l-4 border-l-[#1a2744]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[#1a2744]">Equipe de conseillers</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {noAdvisors ? (
              <p className="text-sm text-gray-400 text-center py-6">
                Aucun conseiller enregistre — contactez un administrateur pour en ajouter.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {advisors.map((conseiller, index) => {
                  const dConf = disponibiliteConfig[conseiller.disponibilite]
                  const [gradFrom, gradTo] = getAvatarGradient(index)
                  return (
                    <motion.div
                      key={conseiller.id}
                      whileHover={{ scale: 1.01 }}
                      className="p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div
                          className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                          style={{ background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})` }}
                        >
                          {getInitials(conseiller.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#1a2744] truncate">{conseiller.name}</p>
                          <p className="text-[10px] text-gray-400">{conseiller.title}</p>
                          <p className="text-[10px] text-gray-400">{conseiller.department}</p>
                        </div>
                      </div>

                      {/* Specialties */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {conseiller.specialties.map(spec => {
                          const sConf = specialtyConfig[spec]
                          return (
                            <Badge key={spec} className={`text-[9px] ${sConf ? sConf.className : 'bg-gray-100 text-gray-600 border-0'}`}>
                              {sConf ? sConf.label : spec}
                            </Badge>
                          )
                        })}
                      </div>

                      {/* Stats row */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                          <Users className="size-3 text-gray-400" />
                          <span className="text-xs text-gray-600">{conseiller.etudiantsSuivis} suivis</span>
                        </div>
                        {dConf ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dConf.dotColor }} />
                            <Badge className={`text-[9px] ${dConf.className}`}>{dConf.label}</Badge>
                          </div>
                        ) : null}
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs border-[#1a274420] text-[#1a2744] hover:bg-[#1a274408]"
                        onClick={() => openNewAppointment({ advisorId: conseiller.id })}
                      >
                        <Calendar className="size-3 mr-1.5" />
                        Prendre rendez-vous
                      </Button>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Ateliers & Seances Collectives Card ────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="border-l-4 border-l-[#2d7a4f]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[#1a2744]">Ateliers &amp; Seances collectives</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {!isLoading && workshops.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Aucun atelier planifie pour le moment.</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {workshops.map((workshop) => {
                  const occupancyPercent = workshop.places > 0 ? Math.round((workshop.inscrits / workshop.places) * 100) : 0
                  const isFull = occupancyPercent >= 90
                  return (
                    <motion.div
                      key={workshop.id}
                      whileHover={{ scale: 1.005 }}
                      className="p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-[#2d7a4f15] flex items-center justify-center shrink-0">
                          <BookOpen className="size-5 text-[#2d7a4f]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#1a2744]">{workshop.title}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <div className="flex items-center gap-1">
                              <Calendar className="size-3 text-gray-400" />
                              <span className="text-[10px] text-gray-500">{workshop.date}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="size-3 text-gray-400" />
                              <span className="text-[10px] text-gray-500">{workshop.time}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="size-3 text-gray-400" />
                          <span className="text-xs text-gray-600">{workshop.salle}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <GraduationCap className="size-3 text-gray-400" />
                          <span className="text-xs text-gray-600">{workshop.instructor}</span>
                        </div>
                      </div>

                      {/* Capacity progress */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] text-gray-400">Inscriptions</span>
                          <span className="text-[10px] font-semibold text-[#1a2744]">{workshop.inscrits}/{workshop.places} places</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: isFull ? '#ea580c' : '#2d7a4f' }}
                            initial={{ width: 0 }}
                            animate={{ width: `${occupancyPercent}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                          />
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant={isFull ? 'outline' : 'default'}
                        className={`w-full text-xs ${isFull ? 'border-[#ea580c30] text-[#ea580c] hover:bg-[#ea580c08]' : 'bg-[#2d7a4f] hover:bg-[#236b40] text-white'}`}
                        disabled={isFull}
                        onClick={() => toast.info('Inscription en ligne bientot disponible', { description: 'Contactez le conseiller responsable pour inscrire un etudiant a cet atelier.' })}
                      >
                        {isFull ? 'Complet' : "S'inscrire"}
                        {!isFull && <ArrowRight className="size-3 ml-1.5" />}
                      </Button>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Statistiques d'Orientation Card ────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="border-l-4 border-l-[#d4a853]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[#1a2744]">Statistiques d&apos;orientation</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left column: Motifs + Delais */}
              <div className="space-y-5">
                {/* Distribution des motifs */}
                <div>
                  <p className="text-xs font-semibold text-[#1a2744] mb-3">Distribution des motifs de consultation</p>
                  {motifData.length === 0 ? (
                    <p className="text-xs text-gray-400">Aucune consultation enregistree pour le moment.</p>
                  ) : (
                    <div className="space-y-3">
                      {motifData.map((item, idx) => (
                        <div key={item.motif} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="text-xs font-medium text-[#1a2744]">{typeConfig[item.motif]?.label || item.motif}</span>
                            </div>
                            <span className="text-xs font-semibold" style={{ color: item.color }}>{item.percent}%</span>
                          </div>
                          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: item.color }}
                              initial={{ width: 0 }}
                              animate={{ width: `${item.percent}%` }}
                              transition={{ duration: 0.8, delay: 0.1 * idx, ease: 'easeOut' }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Delai moyen + Taux d'annulation */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-center">
                    <p className="text-[10px] text-gray-400 uppercase mb-1">Delai moyen demande-RV</p>
                    <p className="text-lg font-bold text-[#2d7a4f]">{appointments.length > 0 ? avgLeadTimeDays.toFixed(1) : '—'}<span className="text-xs text-gray-400"> jours</span></p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-center">
                    <p className="text-[10px] text-gray-400 uppercase mb-1">Taux d&apos;annulation</p>
                    <p className="text-lg font-bold text-[#1a2744]">{cancellationRate}%</p>
                    <p className="text-[10px] text-gray-400">{cancelledCount} rendez-vous annules</p>
                  </div>
                </div>
              </div>

              {/* Right column: Evolution mensuelle */}
              <div>
                <p className="text-xs font-semibold text-[#1a2744] mb-3">Evolution mensuelle des consultations</p>
                {appointments.length === 0 ? (
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 h-40 flex items-center justify-center">
                    <p className="text-xs text-gray-400">Aucune consultation enregistree</p>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="flex items-end justify-between gap-3 h-40">
                      {monthlyData.map((item, idx) => {
                        const heightPercent = maxMonthly > 0 ? (item.count / maxMonthly) * 100 : 0
                        return (
                          <div key={item.month} className="flex-1 flex flex-col items-center justify-end h-full">
                            <span className="text-[10px] font-semibold text-[#1a2744] mb-1">{item.count}</span>
                            <motion.div
                              className="w-full rounded-t-md max-w-[40px]"
                              style={{
                                background: `linear-gradient(to top, #1a2744, #2d7a4f)`,
                                height: 0,
                              }}
                              animate={{ height: `${heightPercent}%` }}
                              transition={{ duration: 0.6, delay: 0.1 * idx, ease: 'easeOut' }}
                            />
                            <span className="text-[10px] text-gray-500 mt-1.5">{item.month}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Summary stats */}
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="p-3 rounded-lg bg-[#2d7a4f08] border border-[#2d7a4f15]">
                    <p className="text-[10px] text-gray-500">Total consultations</p>
                    <p className="text-sm font-bold text-[#1a2744]">{appointments.length}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#d4a85308] border border-[#d4a85315]">
                    <p className="text-[10px] text-gray-500">Taux de retour</p>
                    <p className="text-sm font-bold text-[#1a2744]">{returnRate}%</p>
                    <p className="text-[10px] text-[#d4a853] font-medium">Etudiants revenus</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
