'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
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
  Star,
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
} from 'lucide-react'

// ─── Demo Data ────────────────────────────────────────────────────────────────

type AppointmentType = 'Orientation' | 'Suivi pedagogique' | 'Reorientation' | 'Probleme personnel' | 'Projet professionnel'

type AppointmentStatus = 'Planifie' | 'En cours' | 'Termine' | 'Annule'

interface Appointment {
  id: string
  studentName: string
  matricule: string
  type: AppointmentType
  date: string
  time: string
  conseiller: string
  status: AppointmentStatus
}

const demoAppointments: Appointment[] = [
  { id: '1', studentName: 'ABAKAR Adam', matricule: 'UDN/L2/2024/001', type: 'Orientation', date: '10/03/2025', time: '09:00', conseiller: 'Dr. Ngarba', status: 'Planifie' },
  { id: '2', studentName: 'KHAMIS Fatime', matricule: 'UDN/L3/2024/002', type: 'Suivi pedagogique', date: '10/03/2025', time: '10:30', conseiller: 'Mme. Lea', status: 'Planifie' },
  { id: '3', studentName: 'MAHAMAT Youssouf', matricule: 'UDN/M1/2024/003', type: 'Projet professionnel', date: '10/03/2025', time: '14:00', conseiller: 'Dr. Djimé', status: 'En cours' },
  { id: '4', studentName: 'NGARNDMI Halime', matricule: 'UDN/L1/2024/004', type: 'Reorientation', date: '11/03/2025', time: '08:30', conseiller: 'M. Hassan', status: 'Planifie' },
  { id: '5', studentName: 'HISSEIN Mariam', matricule: 'UDN/L2/2024/005', type: 'Probleme personnel', date: '11/03/2025', time: '11:00', conseiller: 'Mme. Lea', status: 'Planifie' },
  { id: '6', studentName: 'ISSA Mahamat Nour', matricule: 'UDN/L3/2024/006', type: 'Suivi pedagogique', date: '11/03/2025', time: '15:00', conseiller: 'Dr. Ngarba', status: 'Termine' },
  { id: '7', studentName: 'ADAM Khadija', matricule: 'UDN/M2/2024/007', type: 'Orientation', date: '12/03/2025', time: '09:30', conseiller: 'Dr. Saleh', status: 'Planifie' },
  { id: '8', studentName: 'BICHARA Hawa', matricule: 'UDN/L1/2024/008', type: 'Suivi pedagogique', date: '12/03/2025', time: '14:30', conseiller: 'M. Hassan', status: 'Annule' },
]

type AlertLevel = 'Vert' | 'Jaune' | 'Orange' | 'Rouge'

interface MonitoredStudent {
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

const demoMonitoredStudents: MonitoredStudent[] = [
  { id: '1', name: 'ABAKAR Adam', matricule: 'UDN/L2/2024/001', program: 'Informatique', level: 'L2', moyenne: 14.5, creditsAcquis: 58, creditsTotal: 60, dettes: 0, alertLevel: 'Vert', conseiller: 'Dr. Ngarba', dernierEntretien: '05/03/2025' },
  { id: '2', name: 'KHAMIS Fatime', matricule: 'UDN/L3/2024/002', program: 'Droit', level: 'L3', moyenne: 11.2, creditsAcquis: 48, creditsTotal: 60, dettes: 2, alertLevel: 'Jaune', conseiller: 'Mme. Lea', dernierEntretien: '28/02/2025' },
  { id: '3', name: 'MAHAMAT Youssouf', matricule: 'UDN/M1/2024/003', program: 'Economie', level: 'M1', moyenne: 9.8, creditsAcquis: 36, creditsTotal: 60, dettes: 4, alertLevel: 'Orange', conseiller: 'Dr. Djimé', dernierEntretien: '20/02/2025' },
  { id: '4', name: 'NGARNDMI Halime', matricule: 'UDN/L1/2024/004', program: 'Medecine', level: 'L1', moyenne: 7.5, creditsAcquis: 18, creditsTotal: 60, dettes: 6, alertLevel: 'Rouge', conseiller: 'M. Hassan', dernierEntretien: '15/02/2025' },
  { id: '5', name: 'HISSEIN Mariam', matricule: 'UDN/L2/2024/005', program: 'Informatique', level: 'L2', moyenne: 15.2, creditsAcquis: 60, creditsTotal: 60, dettes: 0, alertLevel: 'Vert', conseiller: 'Dr. Saleh', dernierEntretien: '04/03/2025' },
  { id: '6', name: 'ISSA Mahamat Nour', matricule: 'UDN/L3/2024/006', program: 'Mathematiques', level: 'L3', moyenne: 10.5, creditsAcquis: 45, creditsTotal: 60, dettes: 3, alertLevel: 'Jaune', conseiller: 'Mme. Lea', dernierEntretien: '01/03/2025' },
  { id: '7', name: 'ADAM Khadija', matricule: 'UDN/M2/2024/007', program: 'Gestion', level: 'M2', moyenne: 13.8, creditsAcquis: 55, creditsTotal: 60, dettes: 1, alertLevel: 'Vert', conseiller: 'Dr. Ngarba', dernierEntretien: '06/03/2025' },
  { id: '8', name: 'BICHARA Hawa', matricule: 'UDN/L1/2024/008', program: 'Lettres', level: 'L1', moyenne: 8.9, creditsAcquis: 30, creditsTotal: 60, dettes: 5, alertLevel: 'Orange', conseiller: 'M. Hassan', dernierEntretien: '22/02/2025' },
  { id: '9', name: 'SEID Ibrahim', matricule: 'UDN/L2/2024/009', program: 'Physique', level: 'L2', moyenne: 6.8, creditsAcquis: 12, creditsTotal: 60, dettes: 8, alertLevel: 'Rouge', conseiller: 'Dr. Djimé', dernierEntretien: '10/02/2025' },
  { id: '10', name: 'DJIMADOUMBER Deubong', matricule: 'UDN/M1/2024/010', program: 'Informatique', level: 'M1', moyenne: 12.4, creditsAcquis: 50, creditsTotal: 60, dettes: 1, alertLevel: 'Vert', conseiller: 'Dr. Saleh', dernierEntretien: '03/03/2025' },
  { id: '11', name: 'NASSERINGAR Lea', matricule: 'UDN/L3/2024/011', program: 'Droit', level: 'L3', moyenne: 10.1, creditsAcquis: 42, creditsTotal: 60, dettes: 3, alertLevel: 'Jaune', conseiller: 'Mme. Lea', dernierEntretien: '27/02/2025' },
  { id: '12', name: 'OUMAR Abdoulaye', matricule: 'UDN/L1/2024/012', program: 'Economie', level: 'L1', moyenne: 9.2, creditsAcquis: 33, creditsTotal: 60, dettes: 4, alertLevel: 'Orange', conseiller: 'Dr. Ngarba', dernierEntretien: '18/02/2025' },
]

interface Conseiller {
  id: string
  name: string
  title: string
  department: string
  initials: string
  specialties: string[]
  etudiantsSuivis: number
  disponibilite: 'Libre' | 'Occupe' | 'En RDV'
  gradientFrom: string
  gradientTo: string
}

const demoConseillers: Conseiller[] = [
  { id: '1', name: 'Dr. Ngarba Michel', title: 'Conseiller principal', department: 'Sciences', initials: 'NM', specialties: ['Orientation', 'Pedagogie'], etudiantsSuivis: 42, disponibilite: 'En RDV', gradientFrom: '#1a2744', gradientTo: '#2d7a4f' },
  { id: '2', name: 'Mme. Lea Nadjinda', title: 'Psychologue scolaire', department: 'Sante', initials: 'LN', specialties: ['Psychologique', 'Pedagogie'], etudiantsSuivis: 38, disponibilite: 'Libre', gradientFrom: '#2d7a4f', gradientTo: '#3da66a' },
  { id: '3', name: 'Dr. Djimé Soumaine', title: 'Directeur orientation', department: 'Orientation', initials: 'DS', specialties: ['Orientation', 'Professionnel'], etudiantsSuivis: 35, disponibilite: 'Occupe', gradientFrom: '#d4a853', gradientTo: '#c4933e' },
  { id: '4', name: 'M. Hassan Ali', title: 'Conseiller pedagogique', department: 'Lettres', initials: 'HA', specialties: ['Pedagogie'], etudiantsSuivis: 45, disponibilite: 'Libre', gradientFrom: '#1a2744', gradientTo: '#d4a853' },
  { id: '5', name: 'Dr. Saleh Mahamat', title: 'Conseiller professionnel', department: 'Economie', initials: 'SM', specialties: ['Professionnel', 'Orientation'], etudiantsSuivis: 30, disponibilite: 'Occupe', gradientFrom: '#2d7a4f', gradientTo: '#d4a853' },
  { id: '6', name: 'Mme. Fatime Khamis', title: 'Psychologue', department: 'Sciences', initials: 'FK', specialties: ['Psychologique', 'Pedagogie'], etudiantsSuivis: 28, disponibilite: 'Libre', gradientFrom: '#d4a853', gradientTo: '#1a2744' },
]

interface Workshop {
  id: string
  title: string
  inscrits: number
  places: number
  salle: string
  date: string
  time: string
  instructor: string
}

const demoWorkshops: Workshop[] = [
  { id: '1', title: 'Methodologie de recherche bibliographique', inscrits: 30, places: 40, salle: 'Salle B12', date: '15/03/2025', time: '09:00 - 12:00', instructor: 'Dr. Ngarba' },
  { id: '2', title: 'Preparation aux examens: techniques de revision', inscrits: 45, places: 50, salle: 'Amphi 3', date: '18/03/2025', time: '14:00 - 17:00', instructor: 'Mme. Lea' },
  { id: '3', title: 'Orientation professionnelle: metiers du numerique', inscrits: 20, places: 30, salle: 'Salle C5', date: '20/03/2025', time: '10:00 - 12:30', instructor: 'Dr. Saleh' },
  { id: '4', title: 'Gestion du stress et du temps', inscrits: 25, places: 30, salle: 'Salle A8', date: '22/03/2025', time: '09:00 - 11:30', instructor: 'Mme. Fatime' },
]

const motifData = [
  { motif: 'Suivi pedagogique', percent: 35, color: '#2d7a4f' },
  { motif: 'Orientation professionnelle', percent: 25, color: '#1a2744' },
  { motif: 'Problemes personnels', percent: 15, color: '#d4a853' },
  { motif: 'Reorientation', percent: 15, color: '#ea580c' },
  { motif: "Projet d'etudes", percent: 10, color: '#8b5cf6' },
]

const monthlyData = [
  { month: 'Oct', count: 12 },
  { month: 'Nov', count: 18 },
  { month: 'Dec', count: 22 },
  { month: 'Jan', count: 28 },
  { month: 'Fev', count: 35 },
  { month: 'Mar', count: 42 },
]

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
  const [showSchedule, setShowSchedule] = useState(false)
  const [searchMonitored, setSearchMonitored] = useState('')
  const [filterNiveau, setFilterNiveau] = useState('tous')
  const [filterFiliere, setFilterFiliere] = useState('tous')
  const [filterAlerte, setFilterAlerte] = useState('tous')
  const [filterConseiller, setFilterConseiller] = useState('tous')

  // Filter monitored students
  const filteredStudents = demoMonitoredStudents.filter(s => {
    const matchSearch = searchMonitored === '' ||
      s.name.toLowerCase().includes(searchMonitored.toLowerCase()) ||
      s.matricule.toLowerCase().includes(searchMonitored.toLowerCase())
    const matchNiveau = filterNiveau === 'tous' || s.level === filterNiveau
    const matchFiliere = filterFiliere === 'tous' || s.program === filterFiliere
    const matchAlerte = filterAlerte === 'tous' || s.alertLevel === filterAlerte
    const matchConseiller = filterConseiller === 'tous' || s.conseiller === filterConseiller
    return matchSearch && matchNiveau && matchFiliere && matchAlerte && matchConseiller
  })

  // Stats (commented stats are kept for reference)
  void demoMonitoredStudents.length
  void demoAppointments.filter(a => a.status !== 'Annule').length

  const maxMonthly = Math.max(...monthlyData.map(m => m.count))

  // Plan d'accompagnement demo student
  const demoStudent = demoMonitoredStudents[2] // MAHAMAT Youssouf - Orange level

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
                  <p className="text-xl font-bold text-white">{useCountUp(456, 1400)}</p>
                  <p className="text-[10px] text-white/70">Etudiants accompagnes</p>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/10"><CalendarCheck className="size-5 text-white" /></div>
                <div>
                  <p className="text-xl font-bold text-white">{useCountUp(89, 1200)}</p>
                  <p className="text-[10px] text-white/70">Sessions ce mois</p>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/10"><TrendingUp className="size-5 text-white" /></div>
                <div>
                  <p className="text-xl font-bold text-white">{useCountUp(18, 1300)}%</p>
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
                <p className="text-xl font-bold text-[#2d7a4f] mt-1">{useCountUp(456, 1400)}</p>
                <p className="text-xs text-[#2d7a4f] mt-1 font-medium">+8.3%</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#2d7a4f15] flex items-center justify-center">
                <Users className="size-5 text-[#2d7a4f]" />
              </div>
            </div>
            <div className="mt-3">
              <Progress value={76} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#2d7a4f]" />
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
                <p className="text-xl font-bold text-[#1a2744] mt-1">{useCountUp(89, 1200)}</p>
                <p className="text-xs text-gray-400 mt-1">7 cette semaine</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#1a274415] flex items-center justify-center">
                <CalendarCheck className="size-5 text-[#1a2744]" />
              </div>
            </div>
            <div className="mt-3">
              <Progress value={65} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#1a2744]" />
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
                <p className="text-xl font-bold text-[#d4a853] mt-1">{useCountUp(78, 1300)}%</p>
                <p className="text-xs text-[#2d7a4f] mt-1 font-medium">+5% vs precedent</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#d4a85315] flex items-center justify-center">
                <TrendingUp className="size-5 text-[#d4a853]" />
              </div>
            </div>
            <div className="mt-3">
              <Progress value={78} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#d4a853]" />
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
                <p className="text-xl font-bold text-[#1a2744] mt-1">{useCountUp(12, 1000)}</p>
                <p className="text-xs text-gray-400 mt-1">3 disponibles</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#1a274415] flex items-center justify-center">
                <UserCheck className="size-5 text-[#1a2744]" />
              </div>
            </div>
            <div className="mt-3">
              <Progress value={85} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#1a2744]" />
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
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs font-semibold">Etudiant</TableHead>
                    <TableHead className="text-xs font-semibold">Type</TableHead>
                    <TableHead className="text-xs font-semibold">Date &amp; Heure</TableHead>
                    <TableHead className="text-xs font-semibold">Conseiller</TableHead>
                    <TableHead className="text-xs font-semibold">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {demoAppointments.map((appt) => {
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
                          ) : null}
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
                          ) : null}
                        </TableCell>
                      </TableRow>
                    )
                  })}
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
                <p className="text-xs font-semibold text-[#1a2744] mb-3">Emploi du temps de la semaine</p>
                <div className="grid grid-cols-5 gap-2">
                  {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'].map(day => (
                    <div key={day} className="text-center">
                      <p className="text-[10px] font-semibold text-gray-500 mb-2">{day}</p>
                      <div className="space-y-1">
                        {demoAppointments
                          .filter((_, i) => i % 5 === ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'].indexOf(day))
                          .map(appt => (
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
                    <SelectItem value="L1">L1</SelectItem>
                    <SelectItem value="L2">L2</SelectItem>
                    <SelectItem value="L3">L3</SelectItem>
                    <SelectItem value="M1">M1</SelectItem>
                    <SelectItem value="M2">M2</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterFiliere} onValueChange={setFilterFiliere}>
                  <SelectTrigger className="w-[130px] h-9 text-xs">
                    <SelectValue placeholder="Filiere" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Toutes filieres</SelectItem>
                    <SelectItem value="Informatique">Informatique</SelectItem>
                    <SelectItem value="Droit">Droit</SelectItem>
                    <SelectItem value="Economie">Economie</SelectItem>
                    <SelectItem value="Medecine">Medecine</SelectItem>
                    <SelectItem value="Mathematiques">Mathematiques</SelectItem>
                    <SelectItem value="Gestion">Gestion</SelectItem>
                    <SelectItem value="Lettres">Lettres</SelectItem>
                    <SelectItem value="Physique">Physique</SelectItem>
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
                    <SelectItem value="Dr. Ngarba">Dr. Ngarba</SelectItem>
                    <SelectItem value="Mme. Lea">Mme. Lea</SelectItem>
                    <SelectItem value="Dr. Djimé">Dr. Djime</SelectItem>
                    <SelectItem value="M. Hassan">M. Hassan</SelectItem>
                    <SelectItem value="Dr. Saleh">Dr. Saleh</SelectItem>
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
                            student.moyenne >= 12 ? 'text-[#2d7a4f]' :
                            student.moyenne >= 10 ? 'text-[#d4a853]' :
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
                              <DropdownMenuItem className="text-xs">
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
                  {filteredStudents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-sm text-gray-400">
                        Aucun etudiant trouve
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
              <Badge className="text-[10px] bg-[#d4a85315] text-[#d4a853] border-0">
                <Target className="size-3 mr-1" />
                Suivi en cours
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-5">
            {/* Student Info Header */}
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: `linear-gradient(135deg, #ea580c, #c62828)` }}
                  >
                    MY
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1a2744]">{demoStudent.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{demoStudent.matricule} - {demoStudent.program} - {demoStudent.level}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-[10px] text-gray-400 uppercase">Moyenne</p>
                    <p className="text-sm font-bold text-[#ea580c]">{demoStudent.moyenne.toFixed(1)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-gray-400 uppercase">Credits</p>
                    <p className="text-sm font-bold text-[#1a2744]">{demoStudent.creditsAcquis}/{demoStudent.creditsTotal}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-gray-400 uppercase">Dettes</p>
                    <p className="text-sm font-bold text-[#c62828]">{demoStudent.dettes}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Objectifs definis */}
            <div>
              <p className="text-xs font-semibold text-[#1a2744] mb-3">Objectifs definis</p>
              <div className="space-y-3">
                {[
                  { objectif: 'Remonter la moyenne au-dessus de 10/20', progress: 45, color: '#2d7a4f' },
                  { objectif: 'Valider au moins 45 credits ce semestre', progress: 60, color: '#1a2744' },
                  { objectif: 'Reduire les dettes a moins de 2 UE', progress: 30, color: '#d4a853' },
                ].map((obj, idx) => (
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
                        animate={{ width: `${obj.progress}%` }}
                        transition={{ duration: 0.8, delay: 0.1 * idx, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions planifiees */}
            <div>
              <p className="text-xs font-semibold text-[#1a2744] mb-3">Actions planifiees</p>
              <div className="space-y-2">
                {[
                  { action: 'Rencontre hebdomadaire avec le conseiller', date: 'Chaque lundi', done: true },
                  { action: 'Participation aux tutorats de mathematiques', date: 'Mercredi 14h-16h', done: true },
                  { action: 'Inscription atelier methodologie', date: '15/03/2025', done: false },
                  { action: 'Suivi avec psychologue scolaire', date: '20/03/2025', done: false },
                  { action: 'Evaluation point mi-semestre', date: '01/04/2025', done: false },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <Checkbox checked={item.done} className={item.done ? 'data-[state=checked]:bg-[#2d7a4f] data-[state=checked]:border-[#2d7a4f]' : ''} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs ${item.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{item.action}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0">{item.date}</span>
                    {item.done ? (
                      <Badge className="text-[9px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">Fait</Badge>
                    ) : (
                      <Badge className="text-[9px] bg-[#1a274415] text-[#1a2744] border-0">A faire</Badge>
                    )}
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
              <div className="space-y-3">
                {[
                  { date: '05/03/2025', notes: 'Point sur les resultats du S1. 3 dettes identifiees. Plan de rattrapage mis en place. Etudiant motive mais besoin de soutien en methodologie.', conseiller: 'Dr. Djimé' },
                  { date: '19/02/2025', notes: 'Premier entretien. Evaluation de la situation academique. Etudiant en difficulte depuis le debut du semestre. Orientation vers tutorat.', conseiller: 'Dr. Djimé' },
                  { date: '10/02/2025', notes: 'Discussion sur les motivations et les obstacles. Problemes de concentration en cours. Recommandation suivi psychologique.', conseiller: 'Mme. Lea' },
                  { date: '28/01/2025', notes: 'Accueil et evaluation initiale. Identification des besoins: soutien pedagogique, gestion du temps, orientation professionnelle.', conseiller: 'Dr. Djimé' },
                ].map((entretien, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#2d7a4f] mt-1 shrink-0" />
                      {idx < 3 && <div className="w-0.5 flex-1 bg-gray-200 mt-1" />}
                    </div>
                    <div className="flex-1 pb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-[#1a2744]">{entretien.date}</span>
                        <Badge variant="outline" className="text-[9px] border-gray-200 text-gray-500 py-0">{entretien.conseiller}</Badge>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{entretien.notes}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {demoConseillers.map((conseiller) => {
                const dConf = disponibiliteConfig[conseiller.disponibilite]
                return (
                  <motion.div
                    key={conseiller.id}
                    whileHover={{ scale: 1.01 }}
                    className="p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                        style={{ background: `linear-gradient(135deg, ${conseiller.gradientFrom}, ${conseiller.gradientTo})` }}
                      >
                        {conseiller.initials}
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
                        return sConf ? (
                          <Badge key={spec} className={`text-[9px] ${sConf.className}`}>
                            {sConf.label}
                          </Badge>
                        ) : null
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

                    <Button size="sm" variant="outline" className="w-full text-xs border-[#1a274420] text-[#1a2744] hover:bg-[#1a274408]">
                      <Calendar className="size-3 mr-1.5" />
                      Prendre rendez-vous
                    </Button>
                  </motion.div>
                )
              })}
            </div>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {demoWorkshops.map((workshop) => {
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
                    >
                      {isFull ? 'Complet' : "S'inscrire"}
                      {!isFull && <ArrowRight className="size-3 ml-1.5" />}
                    </Button>
                  </motion.div>
                )
              })}
            </div>
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
              {/* Left column: Motifs + Satisfaction */}
              <div className="space-y-5">
                {/* Distribution des motifs */}
                <div>
                  <p className="text-xs font-semibold text-[#1a2744] mb-3">Distribution des motifs de consultation</p>
                  <div className="space-y-3">
                    {motifData.map((item, idx) => (
                      <div key={item.motif} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-xs font-medium text-[#1a2744]">{item.motif}</span>
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
                </div>

                {/* Satisfaction + Temps moyen */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-center">
                    <p className="text-[10px] text-gray-400 uppercase mb-1">Satisfaction etudiants</p>
                    <div className="flex items-center justify-center gap-0.5 mb-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={`size-4 ${star <= 4 ? 'text-[#d4a853] fill-[#d4a853]' : star <= 4.2 ? 'text-[#d4a853] fill-[#d4a853]/20' : 'text-gray-200'}`}
                        />
                      ))}
                    </div>
                    <p className="text-lg font-bold text-[#1a2744]">4.2<span className="text-xs text-gray-400">/5</span></p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-center">
                    <p className="text-[10px] text-gray-400 uppercase mb-1">Temps moyen demande-RV</p>
                    <p className="text-lg font-bold text-[#2d7a4f]">2.3<span className="text-xs text-gray-400"> jours</span></p>
                    <p className="text-[10px] text-[#2d7a4f] font-medium">-0.5j vs precedent</p>
                  </div>
                </div>
              </div>

              {/* Right column: Evolution mensuelle */}
              <div>
                <p className="text-xs font-semibold text-[#1a2744] mb-3">Evolution mensuelle des consultations</p>
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

                {/* Summary stats */}
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="p-3 rounded-lg bg-[#2d7a4f08] border border-[#2d7a4f15]">
                    <p className="text-[10px] text-gray-500">Total consultations</p>
                    <p className="text-sm font-bold text-[#1a2744]">157</p>
                    <p className="text-[10px] text-[#2d7a4f] font-medium">+23% ce semestre</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#d4a85308] border border-[#d4a85315]">
                    <p className="text-[10px] text-gray-500">Taux de retour</p>
                    <p className="text-sm font-bold text-[#1a2744]">62%</p>
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
