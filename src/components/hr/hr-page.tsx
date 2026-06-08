'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  UserCheck,
  UserX,
  Briefcase,
  Search,
  MoreHorizontal,
  Eye,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  Star,
  Shield,
  Smartphone,
  Globe,
  Wifi,
  WifiOff,
  Landmark,
  Banknote,
  Plus,
  ChevronRight,
  Building2,
  GraduationCap,
  DollarSign,
  Mail,
  Award,
} from 'lucide-react'

// ─── useCountUp Hook ─────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1400) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const targetRef = useRef(target)
  const durationRef = useRef(duration)

  useEffect(() => {
    targetRef.current = target
    durationRef.current = duration
  }, [target, duration])

  useEffect(() => {
    startTimeRef.current = null

    function step(timestamp: number) {
      if (!startTimeRef.current) startTimeRef.current = timestamp
      const elapsed = timestamp - startTimeRef.current
      const progress = Math.min(elapsed / durationRef.current, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * targetRef.current))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      }
    }

    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration])

  return value
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

interface StaffMember {
  id: string
  name: string
  department: string
  position: string
  contract: 'cdi' | 'cdd' | 'vacataire' | 'stagiaire'
  status: 'actif' | 'en_conge' | 'suspendu' | 'depart'
  email: string
  phone: string
  joinDate: string
}

const demoStaff: StaffMember[] = [
  { id: '1', name: 'MAHAMAT Abakar', department: 'Informatique', position: 'Chef de departement', contract: 'cdi', status: 'actif', email: 'abakar.mahamat@univ.td', phone: '+235 66 12 34 56', joinDate: '15/03/2018' },
  { id: '2', name: 'HISSEIN Fatime', department: 'Droit', position: 'Maitre de conferences', contract: 'cdi', status: 'actif', email: 'fatime.hissein@univ.td', phone: '+235 66 23 45 67', joinDate: '01/09/2015' },
  { id: '3', name: 'NGARNDMI Halime', department: 'Sciences', position: 'Professeur titulaire', contract: 'cdi', status: 'en_conge', email: 'halime.ngarndmi@univ.td', phone: '+235 66 34 56 78', joinDate: '10/01/2012' },
  { id: '4', name: 'KHAMIS Youssouf', department: 'Economie', position: 'Charge de cours', contract: 'cdd', status: 'actif', email: 'youssouf.khamis@univ.td', phone: '+235 66 45 67 89', joinDate: '01/10/2023' },
  { id: '5', name: 'ADAM Khadija', department: 'Lettres', position: 'Assistante pedagogique', contract: 'vacataire', status: 'actif', email: 'khadija.adam@univ.td', phone: '+235 66 56 78 90', joinDate: '15/01/2024' },
  { id: '6', name: 'ISSA Mahamat Nour', department: 'Informatique', position: 'Vacataire programmation', contract: 'vacataire', status: 'actif', email: 'nour.issa@univ.td', phone: '+235 66 67 89 01', joinDate: '01/02/2024' },
  { id: '7', name: 'DJIMADOUMBER Deubong', department: 'Administration', position: 'Directrice administrative', contract: 'cdi', status: 'actif', email: 'deubong.djimadoumber@univ.td', phone: '+235 66 78 90 12', joinDate: '05/06/2010' },
  { id: '8', name: 'BICHARA Hawa', department: 'Scolarite', position: 'Chef de scolarite', contract: 'cdi', status: 'actif', email: 'hawa.bichara@univ.td', phone: '+235 66 89 01 23', joinDate: '20/09/2016' },
  { id: '9', name: 'OUMAR Abdoulaye', department: 'Comptabilite', position: 'Comptable', contract: 'cdd', status: 'actif', email: 'abdoulaye.oumar@univ.td', phone: '+235 66 90 12 34', joinDate: '01/11/2022' },
  { id: '10', name: 'SEID Ibrahim', department: 'Medecine', position: 'Professeur agregue', contract: 'cdi', status: 'en_conge', email: 'ibrahim.seid@univ.td', phone: '+235 66 01 23 45', joinDate: '12/04/2014' },
  { id: '11', name: 'NASSERINGAR Lea', department: 'Sciences', position: 'Stagiaire recherche', contract: 'stagiaire', status: 'actif', email: 'lea.nasseringar@univ.td', phone: '+235 66 12 34 57', joinDate: '01/03/2025' },
  { id: '12', name: 'ABAKAR Adam', department: 'Droit', position: 'Vacataire droit civil', contract: 'vacataire', status: 'suspendu', email: 'adam.abakar@univ.td', phone: '+235 66 23 45 68', joinDate: '01/09/2023' },
  { id: '13', name: 'HAROUN Djibrine', department: 'Informatique', position: ' Ingenieur systeme', contract: 'cdi', status: 'actif', email: 'djibrine.haroun@univ.td', phone: '+235 66 34 56 79', joinDate: '08/07/2019' },
  { id: '14', name: 'MALLAHM Zara', department: 'Lettres', position: 'Maitre assistante', contract: 'cdd', status: 'depart', email: 'zara.mallahm@univ.td', phone: '+235 66 45 67 80', joinDate: '01/10/2021' },
  { id: '15', name: 'YAYA Djerabé', department: 'Economie', position: 'Professeur titulaire', contract: 'cdi', status: 'actif', email: 'djerabe.yaya@univ.td', phone: '+235 66 56 78 91', joinDate: '03/02/2011' },
  { id: '16', name: 'Brahim Malloum', department: 'Administration', position: 'Agent d\'accueil', contract: 'cdd', status: 'actif', email: 'malloum.brahim@univ.td', phone: '+235 66 67 89 02', joinDate: '15/06/2024' },
]

interface LeaveRequest {
  id: string
  name: string
  type: string
  startDate: string
  endDate: string
  duration: string
  status: 'en_attente' | 'approuve' | 'refuse'
}

const demoLeaveRequests: LeaveRequest[] = [
  { id: '1', name: 'NGARNDMI Halime', type: 'Conge annuel', startDate: '01/03/2025', endDate: '15/03/2025', duration: '15 jours', status: 'en_attente' },
  { id: '2', name: 'SEID Ibrahim', type: 'Conge maladie', startDate: '10/02/2025', endDate: '17/02/2025', duration: '7 jours', status: 'en_attente' },
  { id: '3', name: 'HISSEIN Fatime', type: 'Conge annuel', startDate: '20/04/2025', endDate: '05/05/2025', duration: '15 jours', status: 'en_attente' },
  { id: '4', name: 'DJIMADOUMBER Deubong', type: 'Permission', startDate: '15/03/2025', endDate: '17/03/2025', duration: '3 jours', status: 'en_attente' },
  { id: '5', name: 'BICHARA Hawa', type: 'Conge maternite', startDate: '01/06/2025', endDate: '01/09/2025', duration: '90 jours', status: 'en_attente' },
  { id: '6', name: 'HAROUN Djibrine', type: 'Conge annuel', startDate: '10/05/2025', endDate: '25/05/2025', duration: '15 jours', status: 'en_attente' },
]

interface Vacancy {
  id: string
  title: string
  department: string
  contract: string
  postedDate: string
  applications: number
}

const demoVacancies: Vacancy[] = [
  { id: '1', title: 'Maitre de conferences - Informatique', department: 'Informatique', contract: 'CDI', postedDate: '01/02/2025', applications: 23 },
  { id: '2', title: 'Assistant pedagogique - Droit', department: 'Droit', contract: 'CDD', postedDate: '15/02/2025', applications: 18 },
  { id: '3', title: 'Chef de departement - Economie', department: 'Economie', contract: 'CDI', postedDate: '20/01/2025', applications: 12 },
  { id: '4', title: 'Vacataire - Mathematiques', department: 'Sciences', contract: 'Vacataire', postedDate: '10/03/2025', applications: 8 },
  { id: '5', title: 'Agent administratif', department: 'Administration', contract: 'CDD', postedDate: '01/03/2025', applications: 45 },
]

interface Evaluation {
  id: string
  name: string
  position: string
  rating: number
  period: string
  evaluator: string
  status: 'terminee' | 'en_cours' | 'planifiee'
}

const demoEvaluations: Evaluation[] = [
  { id: '1', name: 'MAHAMAT Abakar', position: 'Chef de departement', rating: 4.5, period: 'S1 2024-2025', evaluator: 'Djimadoumber Deubong', status: 'terminee' },
  { id: '2', name: 'HISSEIN Fatime', position: 'Maitre de conferences', rating: 4.0, period: 'S1 2024-2025', evaluator: 'Mahamat Abakar', status: 'terminee' },
  { id: '3', name: 'BICHARA Hawa', position: 'Chef de scolarite', rating: 4.2, period: 'S1 2024-2025', evaluator: 'Djimadoumber Deubong', status: 'terminee' },
  { id: '4', name: 'KHAMIS Youssouf', position: 'Charge de cours', rating: 3.5, period: 'S2 2024-2025', evaluator: 'Yaya Djerabe', status: 'en_cours' },
  { id: '5', name: 'HAROUN Djibrine', position: 'Ingenieur systeme', rating: 4.8, period: 'S2 2024-2025', evaluator: 'Mahamat Abakar', status: 'planifiee' },
]

const monthlyPayroll = [
  { month: 'Jan', amount: 28500000 },
  { month: 'Fev', amount: 28500000 },
  { month: 'Mar', amount: 29200000 },
  { month: 'Avr', amount: 28500000 },
  { month: 'Mai', amount: 29800000 },
  { month: 'Jun', amount: 28500000 },
  { month: 'Jul', amount: 28500000 },
  { month: 'Aou', amount: 27100000 },
  { month: 'Sep', amount: 28500000 },
  { month: 'Oct', amount: 29300000 },
  { month: 'Nov', amount: 28500000 },
  { month: 'Dec', amount: 31200000 },
]

const statusConfig: Record<string, { label: string; className: string }> = {
  actif: { label: 'Actif', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' },
  en_conge: { label: 'En conge', className: 'bg-[#d4a85315] text-[#d4a853] border-0' },
  suspendu: { label: 'Suspendu', className: 'bg-[#c6282815] text-[#c62828] border-0' },
  depart: { label: 'Depart', className: 'bg-[#6b728015] text-[#6b7280] border-0' },
}

const contractConfig: Record<string, { label: string; className: string }> = {
  cdi: { label: 'CDI', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' },
  cdd: { label: 'CDD', className: 'bg-[#1a274415] text-[#1a2744] border-0' },
  vacataire: { label: 'Vacataire', className: 'bg-[#d4a85315] text-[#d4a853] border-0' },
  stagiaire: { label: 'Stagiaire', className: 'bg-[#6366f115] text-[#6366f1] border-0' },
}

const leaveStatusConfig: Record<string, { label: string; className: string }> = {
  en_attente: { label: 'En attente', className: 'bg-[#d4a85315] text-[#d4a853] border-0' },
  approuve: { label: 'Approuve', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' },
  refuse: { label: 'Refuse', className: 'bg-[#c6282815] text-[#c62828] border-0' },
}

function formatFCFA(amount: number) {
  return amount.toLocaleString('fr-FR') + ' FCFA'
}

// ─── Star Rating Component ───────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`size-3.5 ${
            star <= Math.floor(rating)
              ? 'fill-[#d4a853] text-[#d4a853]'
              : star - 0.5 <= rating
              ? 'fill-[#d4a853]/50 text-[#d4a853]'
              : 'text-gray-300'
          }`}
        />
      ))}
      <span className="text-xs font-semibold text-[#1a2744] ml-1">{rating.toFixed(1)}</span>
    </div>
  )
}

// ─── Animated Progress Circle ─────────────────────────────────────────────────

function ProgressCircle({ value, size = 80, strokeWidth = 6 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e5e7eb" strokeWidth={strokeWidth} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#2d7a4f"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-[#1a2744]">{value.toFixed(1)}</span>
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HrPage() {
  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('tous')
  const [contractFilter, setContractFilter] = useState('tous')
  const [statusFilter, setStatusFilter] = useState('tous')
  const [leaveActions, setLeaveActions] = useState<Record<string, 'approuve' | 'refuse' | null>>({})
  const [showNewOffer, setShowNewOffer] = useState(false)

  // Count-up stats
  const totalPersonnel = useCountUp(demoStaff.length, 1400)
  const activePersonnel = useCountUp(demoStaff.filter(s => s.status === 'actif').length, 1200)
  const tauxOccupation = useCountUp(Math.round((demoStaff.filter(s => s.status === 'actif').length / demoStaff.length) * 100), 1300)
  const adminCount = useCountUp(demoStaff.filter(s => ['Administration', 'Scolarite', 'Comptabilite'].includes(s.department)).length, 1100)
  const permCount = useCountUp(demoStaff.filter(s => s.contract === 'cdi').length, 1200)
  const vacCount = useCountUp(demoStaff.filter(s => s.contract === 'vacataire').length, 1000)
  const vacantPosts = useCountUp(5, 1000)

  // Filtered staff
  const filteredStaff = demoStaff.filter(s => {
    const matchSearch = search === '' ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.position.toLowerCase().includes(search.toLowerCase()) ||
      s.department.toLowerCase().includes(search.toLowerCase())
    const matchDept = departmentFilter === 'tous' || s.department === departmentFilter
    const matchContract = contractFilter === 'tous' || s.contract === contractFilter
    const matchStatus = statusFilter === 'tous' || s.status === statusFilter
    return matchSearch && matchDept && matchContract && matchStatus
  })

  // Payroll stats
  const totalPayroll = monthlyPayroll.reduce((acc, m) => acc + m.amount, 0)
  const maxPayroll = Math.max(...monthlyPayroll.map(m => m.amount))
  const avgPayroll = totalPayroll / monthlyPayroll.length
  const chargesPatronales = Math.round(avgPayroll * 0.22)
  const netAPayer = avgPayroll - chargesPatronales

  // Average evaluation rating
  const avgRating = demoEvaluations.reduce((acc, e) => acc + e.rating, 0) / demoEvaluations.length

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

  // Leave balance data
  const leaveBalance = [
    { type: 'Conges annuels', used: 45, total: 90, color: '#2d7a4f' },
    { type: 'Conges maladie', used: 12, total: 30, color: '#d4a853' },
    { type: 'Conges maternite', used: 1, total: 3, color: '#1a2744' },
  ]

  // Upcoming leaves for calendar strip
  const upcomingLeaves = [
    { name: 'Halime N.', start: 1, end: 15, month: 'Mars', color: '#2d7a4f' },
    { name: 'Ibrahim S.', start: 10, end: 17, month: 'Fev', color: '#d4a853' },
    { name: 'Fatime H.', start: 20, end: 30, month: 'Avr', color: '#2d7a4f' },
    { name: 'Hawa B.', start: 1, end: 30, month: 'Jun', color: '#1a2744' },
  ]

  const handleLeaveAction = (id: string, action: 'approuve' | 'refuse') => {
    setLeaveActions(prev => ({ ...prev, [id]: action }))
  }

  const getLeaveStatus = (request: LeaveRequest) => {
    if (leaveActions[request.id]) return leaveActions[request.id]
    return request.status
  }

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Gradient Header Banner ──────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="relative overflow-hidden rounded-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a2744] via-[#1f3050] to-[#2d7a4f]" />
        <svg className="absolute inset-0 w-full h-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hr-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hr-grid)" />
        </svg>
        <div className="relative p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white">Gestion du Personnel</h1>
              <p className="text-sm text-white/70 mt-1">Administration et suivi des ressources humaines</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Glass-morphism stat cards */}
              <div className="bg-white/10 backdrop-blur border border-white/15 rounded-lg px-4 py-3 text-center">
                <p className="text-[10px] text-white/60 uppercase tracking-wider">Personnel total</p>
                <p className="text-xl font-bold text-white">{totalPersonnel}</p>
              </div>
              <div className="bg-white/10 backdrop-blur border border-white/15 rounded-lg px-4 py-3 text-center">
                <p className="text-[10px] text-white/60 uppercase tracking-wider">En activite</p>
                <p className="text-xl font-bold text-white">{activePersonnel}</p>
              </div>
              <div className="bg-white/10 backdrop-blur border border-white/15 rounded-lg px-4 py-3 text-center">
                <p className="text-[10px] text-white/60 uppercase tracking-wider">Taux occupation</p>
                <p className="text-xl font-bold text-white">{tauxOccupation}%</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── 4 Stats Cards ──────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Personnel administratif */}
        <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
          <Card className="overflow-hidden relative border-l-4 border-l-[#1a2744]">
            <div className="h-1 bg-gradient-to-r from-[#1a2744] to-[#2d4a6f]" />
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Personnel administratif</p>
                  <p className="text-xl font-bold text-[#1a2744] mt-1">{adminCount}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="size-3 text-[#2d7a4f]" />
                    <span className="text-[10px] text-[#2d7a4f] font-medium">+2 ce semestre</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#1a274415] flex items-center justify-center">
                  <Building2 className="size-5 text-[#1a2744]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Enseignants permanents */}
        <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
          <Card className="overflow-hidden relative border-l-4 border-l-[#2d7a4f]">
            <div className="h-1 bg-gradient-to-r from-[#2d7a4f] to-[#3da66a]" />
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Enseignants permanents</p>
                  <p className="text-xl font-bold text-[#2d7a4f] mt-1">{permCount}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="size-3 text-[#2d7a4f]" />
                    <span className="text-[10px] text-[#2d7a4f] font-medium">+1 cette annee</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#2d7a4f15] flex items-center justify-center">
                  <GraduationCap className="size-5 text-[#2d7a4f]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Vacataires */}
        <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
          <Card className="overflow-hidden relative border-l-4 border-l-[#d4a853]">
            <div className="h-1 bg-gradient-to-r from-[#d4a853] to-[#e6c477]" />
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Vacataires</p>
                  <p className="text-xl font-bold text-[#d4a853] mt-1">{vacCount}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingDown className="size-3 text-[#c62828]" />
                    <span className="text-[10px] text-[#c62828] font-medium">-1 vs S1</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#d4a85315] flex items-center justify-center">
                  <UserCheck className="size-5 text-[#d4a853]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Postes vacants */}
        <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
          <Card className="overflow-hidden relative border-l-4 border-l-[#c62828]">
            <div className="h-1 bg-gradient-to-r from-[#c62828] to-[#e53935]" />
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Postes vacants</p>
                  <p className="text-xl font-bold text-[#c62828] mt-1">{vacantPosts}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="size-3 text-[#d4a853]" />
                    <span className="text-[10px] text-[#d4a853] font-medium">3 en recrutement</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#c6282815] flex items-center justify-center">
                  <UserX className="size-5 text-[#c62828]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* ── Personnel Directory Table ────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="text-sm font-semibold text-[#1a2744]">Repertoire du personnel</CardTitle>
              <div className="flex items-center gap-2">
                <Button size="sm" className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs">
                  <Plus className="size-3.5 mr-1.5" />
                  Ajouter
                </Button>
                <Button size="sm" variant="outline" className="text-xs border-[#1a274430] text-[#1a2744] hover:bg-[#1a274408]">
                  Exporter
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {/* Search + Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par nom, poste, departement..."
                  className="pl-9 h-9 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-[150px] h-9 text-xs">
                    <SelectValue placeholder="Departement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous les departements</SelectItem>
                    <SelectItem value="Informatique">Informatique</SelectItem>
                    <SelectItem value="Droit">Droit</SelectItem>
                    <SelectItem value="Sciences">Sciences</SelectItem>
                    <SelectItem value="Economie">Economie</SelectItem>
                    <SelectItem value="Lettres">Lettres</SelectItem>
                    <SelectItem value="Medecine">Medecine</SelectItem>
                    <SelectItem value="Administration">Administration</SelectItem>
                    <SelectItem value="Scolarite">Scolarite</SelectItem>
                    <SelectItem value="Comptabilite">Comptabilite</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={contractFilter} onValueChange={setContractFilter}>
                  <SelectTrigger className="w-[120px] h-9 text-xs">
                    <SelectValue placeholder="Contrat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous contrats</SelectItem>
                    <SelectItem value="cdi">CDI</SelectItem>
                    <SelectItem value="cdd">CDD</SelectItem>
                    <SelectItem value="vacataire">Vacataire</SelectItem>
                    <SelectItem value="stagiaire">Stagiaire</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[120px] h-9 text-xs">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous statuts</SelectItem>
                    <SelectItem value="actif">Actif</SelectItem>
                    <SelectItem value="en_conge">En conge</SelectItem>
                    <SelectItem value="suspendu">Suspendu</SelectItem>
                    <SelectItem value="depart">Depart</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Staff Table */}
            <ScrollArea className="max-h-96">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-xs font-semibold">Nom</TableHead>
                      <TableHead className="text-xs font-semibold">Departement</TableHead>
                      <TableHead className="text-xs font-semibold">Poste</TableHead>
                      <TableHead className="text-xs font-semibold">Contrat</TableHead>
                      <TableHead className="text-xs font-semibold">Statut</TableHead>
                      <TableHead className="text-xs font-semibold">Date entree</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStaff.map((staff) => {
                      const sConf = statusConfig[staff.status]
                      const cConf = contractConfig[staff.contract]
                      return (
                        <TableRow
                          key={staff.id}
                          className="hover:bg-[#2d7a4f05] transition-colors cursor-pointer"
                        >
                          <TableCell className="py-2.5">
                            <div>
                              <p className="text-sm font-medium text-[#1a2744]">{staff.name}</p>
                              <p className="text-[10px] text-gray-400">{staff.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-gray-600 py-2.5">{staff.department}</TableCell>
                          <TableCell className="text-xs text-gray-600 py-2.5 max-w-[180px] truncate">{staff.position}</TableCell>
                          <TableCell className="py-2.5">
                            {cConf ? (
                              <Badge className={`text-[10px] ${cConf.className}`}>{cConf.label}</Badge>
                            ) : null}
                          </TableCell>
                          <TableCell className="py-2.5">
                            {sConf ? (
                              <Badge className={`text-[10px] ${sConf.className}`}>{sConf.label}</Badge>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-xs text-gray-500 py-2.5">{staff.joinDate}</TableCell>
                          <TableCell className="text-right py-2.5">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-gray-100">
                                  <MoreHorizontal className="size-4 text-gray-400" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem className="text-xs">
                                  <Eye className="size-3.5 mr-2" />
                                  Voir profil
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-xs">
                                  <Edit3 className="size-3.5 mr-2" />
                                  Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-xs">
                                  <Mail className="size-3.5 mr-2" />
                                  Envoyer message
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-xs text-red-600">
                                  <Trash2 className="size-3.5 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {filteredStaff.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-sm text-gray-400">
                          Aucun personnel trouve
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

      {/* ── Leave Management Card ───────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="border-l-4 border-l-[#d4a853]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-[#d4a853]" />
                <CardTitle className="text-sm font-semibold text-[#1a2744]">Gestion des conges</CardTitle>
              </div>
              <Badge className="text-[10px] bg-[#d4a85315] text-[#d4a853] border-0">
                {demoLeaveRequests.filter(l => l.status === 'en_attente').length} en attente
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Pending leave requests table */}
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs font-semibold">Employe</TableHead>
                    <TableHead className="text-xs font-semibold">Type</TableHead>
                    <TableHead className="text-xs font-semibold">Debut</TableHead>
                    <TableHead className="text-xs font-semibold">Fin</TableHead>
                    <TableHead className="text-xs font-semibold">Duree</TableHead>
                    <TableHead className="text-xs font-semibold">Statut</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {demoLeaveRequests.map((req) => {
                    const currentStatus = getLeaveStatus(req) || 'en_attente'
                    const lsConf = leaveStatusConfig[currentStatus]
                    const isPending = currentStatus === 'en_attente'
                    return (
                      <TableRow key={req.id} className="hover:bg-[#d4a85305] transition-colors">
                        <TableCell className="text-sm font-medium text-[#1a2744] py-2.5">{req.name}</TableCell>
                        <TableCell className="text-xs text-gray-600 py-2.5">{req.type}</TableCell>
                        <TableCell className="text-xs text-gray-500 py-2.5">{req.startDate}</TableCell>
                        <TableCell className="text-xs text-gray-500 py-2.5">{req.endDate}</TableCell>
                        <TableCell className="text-xs text-gray-600 py-2.5">{req.duration}</TableCell>
                        <TableCell className="py-2.5">
                          {lsConf ? (
                            <Badge className={`text-[10px] ${lsConf.className}`}>{lsConf.label}</Badge>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right py-2.5">
                          {isPending ? (
                            <div className="flex items-center gap-1 justify-end">
                              <Button
                                size="sm"
                                className="h-7 text-[10px] px-2 bg-[#2d7a4f] hover:bg-[#236b40] text-white"
                                onClick={() => handleLeaveAction(req.id, 'approuve')}
                              >
                                <CheckCircle2 className="size-3 mr-0.5" />
                                Oui
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] px-2 text-[#c62828] border-[#c6282830] hover:bg-[#c6282808]"
                                onClick={() => handleLeaveAction(req.id, 'refuse')}
                              >
                                <XCircle className="size-3 mr-0.5" />
                                Non
                              </Button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-400">Traite</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Leave balance + Calendar strip */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Leave balance summary */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-[#1a2744] uppercase tracking-wide">Solde de conges</p>
                {leaveBalance.map((lb) => (
                  <div key={lb.type} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">{lb.type}</span>
                      <span className="text-xs font-semibold text-[#1a2744]">{lb.used}/{lb.total} jours</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: lb.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(lb.used / lb.total) * 100}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Calendar strip */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-[#1a2744] uppercase tracking-wide">Prochains conges</p>
                <div className="space-y-2">
                  {upcomingLeaves.map((leave, idx) => (
                    <motion.div
                      key={idx}
                      className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <div
                        className="w-2 h-8 rounded-full shrink-0"
                        style={{ backgroundColor: leave.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#1a2744]">{leave.name}</p>
                        <p className="text-[10px] text-gray-400">{leave.month} {leave.start}-{leave.end}</p>
                      </div>
                      <ChevronRight className="size-3.5 text-gray-400 shrink-0" />
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Recruitment & Vacancies Card ────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="border-l-4 border-l-[#1a2744]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="size-4 text-[#1a2744]" />
                <CardTitle className="text-sm font-semibold text-[#1a2744]">Recrutement & Postes vacants</CardTitle>
              </div>
              <Dialog open={showNewOffer} onOpenChange={setShowNewOffer}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-[#1a2744] hover:bg-[#2d4a6f] text-white text-xs">
                    <Plus className="size-3.5 mr-1.5" />
                    Nouvelle offre
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Creer une offre d&apos;emploi</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Titre du poste</Label>
                      <Input placeholder="Ex: Maitre de conferences - Physique" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm">Departement</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Choisir" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="informatique">Informatique</SelectItem>
                            <SelectItem value="droit">Droit</SelectItem>
                            <SelectItem value="sciences">Sciences</SelectItem>
                            <SelectItem value="economie">Economie</SelectItem>
                            <SelectItem value="lettres">Lettres</SelectItem>
                            <SelectItem value="medecine">Medecine</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Type de contrat</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Contrat" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cdi">CDI</SelectItem>
                            <SelectItem value="cdd">CDD</SelectItem>
                            <SelectItem value="vacataire">Vacataire</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Description du poste</Label>
                      <textarea
                        className="w-full min-h-[80px] rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2744] focus:border-transparent resize-none"
                        placeholder="Missions, qualifications requises, competences..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Date limite</Label>
                      <Input type="date" />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button className="flex-1 bg-[#1a2744] hover:bg-[#2d4a6f] text-white" onClick={() => setShowNewOffer(false)}>
                        Publier l&apos;offre
                      </Button>
                      <Button variant="outline" className="flex-1" onClick={() => setShowNewOffer(false)}>
                        Annuler
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Vacancies table */}
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs font-semibold">Poste</TableHead>
                    <TableHead className="text-xs font-semibold">Departement</TableHead>
                    <TableHead className="text-xs font-semibold">Contrat</TableHead>
                    <TableHead className="text-xs font-semibold">Date publication</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Candidatures</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {demoVacancies.map((vac) => (
                    <TableRow key={vac.id} className="hover:bg-[#1a274405] transition-colors">
                      <TableCell className="text-sm font-medium text-[#1a2744] py-2.5">{vac.title}</TableCell>
                      <TableCell className="text-xs text-gray-600 py-2.5">{vac.department}</TableCell>
                      <TableCell className="py-2.5">
                        <Badge variant="outline" className="text-[10px] border-gray-200 text-gray-600">{vac.contract}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500 py-2.5">{vac.postedDate}</TableCell>
                      <TableCell className="text-center py-2.5">
                        <span className="text-sm font-semibold text-[#1a2744]">{vac.applications}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Application pipeline */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-[#1a2744] uppercase tracking-wide">Pipeline de recrutement</p>
              <div className="flex items-center gap-0">
                {[
                  { label: 'Candidatures', count: 106, color: '#1a2744', percent: 100 },
                  { label: 'Presel.', count: 42, color: '#2d7a4f', percent: 40 },
                  { label: 'Entretien', count: 18, color: '#d4a853', percent: 17 },
                  { label: 'Selectionne', count: 5, color: '#2d7a4f', percent: 5 },
                ].map((step, idx) => (
                  <div key={step.label} className="flex-1">
                    <div className="h-3 bg-gray-100 overflow-hidden relative">
                      <motion.div
                        className="h-full"
                        style={{ backgroundColor: step.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${step.percent}%` }}
                        transition={{ duration: 0.8, delay: 0.2 * idx, ease: 'easeOut' }}
                      />
                    </div>
                    <div className="mt-1 text-center">
                      <p className="text-[10px] font-medium text-[#1a2744]">{step.label}</p>
                      <p className="text-xs font-bold" style={{ color: step.color }}>{step.count}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Payroll Overview Card ───────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="border-l-4 border-l-[#2d7a4f]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote className="size-4 text-[#2d7a4f]" />
                <CardTitle className="text-sm font-semibold text-[#1a2744]">Masse salariale</CardTitle>
              </div>
              <Badge className="text-[10px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">
                Exercice 2024-2025
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Key metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-[#2d7a4f08] border border-[#2d7a4f15]">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Masse salariale mensuelle</p>
                <p className="text-lg font-bold text-[#2d7a4f]">{formatFCFA(Math.round(avgPayroll))}</p>
              </div>
              <div className="p-3 rounded-lg bg-[#d4a85308] border border-[#d4a85315]">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Charges patronales</p>
                <p className="text-lg font-bold text-[#d4a853]">{formatFCFA(chargesPatronales)}</p>
              </div>
              <div className="p-3 rounded-lg bg-[#1a274408] border border-[#1a274415]">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Net a payer</p>
                <p className="text-lg font-bold text-[#1a2744]">{formatFCFA(netAPayer)}</p>
              </div>
            </div>

            {/* Monthly bar chart */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-[#1a2744] uppercase tracking-wide">Evolution mensuelle</p>
              <div className="flex items-end gap-1.5 h-32">
                {monthlyPayroll.map((m, idx) => {
                  const heightPercent = (m.amount / maxPayroll) * 100
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                      <motion.div
                        className="w-full rounded-t bg-gradient-to-t from-[#2d7a4f] to-[#3da66a] min-h-[4px]"
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPercent}%` }}
                        transition={{ duration: 0.6, delay: 0.05 * idx, ease: 'easeOut' }}
                        style={{ maxHeight: '100%' }}
                      />
                      <span className="text-[9px] text-gray-400 font-medium">{m.month}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Payment method breakdown */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-[#1a2744] uppercase tracking-wide">Modes de paiement</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-gray-100">
                  <div className="w-9 h-9 rounded-lg bg-[#1a274415] flex items-center justify-center shrink-0">
                    <Landmark className="size-4 text-[#1a2744]" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#1a2744]">Virement bancaire</p>
                    <p className="text-lg font-bold text-[#1a2744]">65%</p>
                    <p className="text-[10px] text-gray-400">BECAC, BCC, Ecobank</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-gray-100">
                  <div className="w-9 h-9 rounded-lg bg-[#2d7a4f15] flex items-center justify-center shrink-0">
                    <Smartphone className="size-4 text-[#2d7a4f]" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#2d7a4f]">Mobile Money</p>
                    <p className="text-lg font-bold text-[#2d7a4f]">28%</p>
                    <p className="text-[10px] text-gray-400">Airtel, Moov, Orange</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-gray-100">
                  <div className="w-9 h-9 rounded-lg bg-[#d4a85315] flex items-center justify-center shrink-0">
                    <DollarSign className="size-4 text-[#d4a853]" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#d4a853]">Especes</p>
                    <p className="text-lg font-bold text-[#d4a853]">7%</p>
                    <p className="text-[10px] text-gray-400">Caisse principale</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Performance Evaluation Card ─────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="border-l-4 border-l-[#d4a853]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="size-4 text-[#d4a853]" />
                <CardTitle className="text-sm font-semibold text-[#1a2744]">Evaluation des performances</CardTitle>
              </div>
              <Button size="sm" className="bg-[#d4a853] hover:bg-[#c49a48] text-white text-xs">
                <Star className="size-3.5 mr-1.5" />
                Lancer evaluation
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Evaluation table + Average indicator */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <div className="overflow-x-auto rounded-lg border border-gray-100">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="text-xs font-semibold">Employe</TableHead>
                        <TableHead className="text-xs font-semibold">Poste</TableHead>
                        <TableHead className="text-xs font-semibold">Periode</TableHead>
                        <TableHead className="text-xs font-semibold">Evaluateur</TableHead>
                        <TableHead className="text-xs font-semibold">Note</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {demoEvaluations.map((ev) => (
                        <TableRow key={ev.id} className="hover:bg-[#d4a85305] transition-colors">
                          <TableCell className="text-sm font-medium text-[#1a2744] py-2.5">{ev.name}</TableCell>
                          <TableCell className="text-xs text-gray-600 py-2.5">{ev.position}</TableCell>
                          <TableCell className="text-xs text-gray-500 py-2.5">{ev.period}</TableCell>
                          <TableCell className="text-xs text-gray-600 py-2.5">{ev.evaluator}</TableCell>
                          <TableCell className="py-2.5">
                            <StarRating rating={ev.rating} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Average rating indicator */}
              <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-gray-50">
                <p className="text-xs font-semibold text-[#1a2744] uppercase tracking-wide mb-3">Note moyenne</p>
                <ProgressCircle value={avgRating * 20} size={100} strokeWidth={8} />
                <p className="text-sm font-bold text-[#1a2744] mt-2">{avgRating.toFixed(1)}/5.0</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="size-3 text-[#2d7a4f]" />
                  <span className="text-[10px] text-[#2d7a4f] font-medium">+0.3 vs S1</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── African Context Card ────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="border-l-4 border-l-[#2d7a4f]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="size-4 text-[#2d7a4f]" />
                <CardTitle className="text-sm font-semibold text-[#1a2744]">Contexte africain</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* CNPS / Social Security */}
              <div className="p-3 rounded-lg bg-[#2d7a4f08] border border-[#2d7a4f15]">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="size-4 text-[#2d7a4f]" />
                  <span className="text-sm font-semibold text-[#1a2744]">CNPS & Securite sociale</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Integration automatique des cotisations CNPS (Caisse Nationale de Prevoyance Sociale). Calcul des cotisations patronales et salariales selon les taux en vigueur. Generation des bordereaux de declaration mensuelle.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-gray-100">
                    <CheckCircle2 className="size-3 text-[#2d7a4f]" />
                    <span className="text-[10px] text-gray-600">CNPS Tchad</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-gray-100">
                    <CheckCircle2 className="size-3 text-[#2d7a4f]" />
                    <span className="text-[10px] text-gray-600">CNPS Cameroun</span>
                  </div>
                </div>
              </div>

              {/* Multi-country labor law */}
              <div className="p-3 rounded-lg bg-[#1a274408] border border-[#1a274415]">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="size-4 text-[#1a2744]" />
                  <span className="text-sm font-semibold text-[#1a2744]">Droit du travail multi-pays</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Conformite avec les legislations du travail de chaque pays d&apos;implantation. Gestion automatique des specificites locales (duree du travail, conges, preavis, indemnites).
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {['Tchad', 'Cameroun', 'Senegal', 'Niger'].map((country) => (
                    <div key={country} className="flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-gray-100">
                      <div className="w-2 h-2 rounded-full bg-[#2d7a4f]" />
                      <span className="text-[10px] text-gray-600">{country}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile Money salary */}
              <div className="p-3 rounded-lg bg-[#d4a85308] border border-[#d4a85315]">
                <div className="flex items-center gap-2 mb-2">
                  <Smartphone className="size-4 text-[#d4a853]" />
                  <span className="text-sm font-semibold text-[#1a2744]">Paiement Mobile Money</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Versement des salaires via Mobile Money pour le personnel sans compte bancaire. Compatible Airtel Money, Moov Money et Orange Money. Confirmation SMS automatique du virement.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-gray-100">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-[10px] text-gray-600">Airtel Money</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-gray-100">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-[10px] text-gray-600">Moov Money</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-gray-100">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <span className="text-[10px] text-gray-600">Orange Money</span>
                  </div>
                </div>
              </div>

              {/* Low-connectivity offline mode */}
              <div className="p-3 rounded-lg bg-[#6366f108] border border-[#6366f115]">
                <div className="flex items-center gap-2 mb-2">
                  <WifiOff className="size-4 text-[#6366f1]" />
                  <span className="text-sm font-semibold text-[#1a2744]">Mode hors connexion</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Fonctionnement hors ligne pour les sites a faible connectivite. Synchronisation automatique des donnees lorsque la connexion est retablie. Stockage local securise des informations du personnel.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-gray-100">
                    <Wifi className="size-3 text-[#2d7a4f]" />
                    <span className="text-[10px] text-gray-600">Sync auto</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-gray-100">
                    <WifiOff className="size-3 text-[#d4a853]" />
                    <span className="text-[10px] text-gray-600">Mode offline</span>
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
