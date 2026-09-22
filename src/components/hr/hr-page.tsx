'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
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
  WifiOff,
  Banknote,
  Plus,
  ChevronRight,
  Building2,
  GraduationCap,
  Mail,
  Award,
} from 'lucide-react'
import { useHrStaff } from '@/lib/api-hooks'
import { exportToExcel } from '@/lib/export'

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

// ─── API-backed data mapping ─────────────────────────────────────────────────

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

interface ApiStaff {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  department: string
  position: string
  contractType: 'CDI' | 'CDD' | 'Vacataire' | 'Stagiaire'
  status: 'actif' | 'en_conge' | 'suspendu' | 'depart'
  joinDate: string
}

const contractTypeApiToUi: Record<ApiStaff['contractType'], StaffMember['contract']> = {
  CDI: 'cdi',
  CDD: 'cdd',
  Vacataire: 'vacataire',
  Stagiaire: 'stagiaire',
}

function mapStaff(s: ApiStaff): StaffMember {
  return {
    id: s.id,
    name: `${s.lastName} ${s.firstName}`,
    department: s.department,
    position: s.position,
    contract: contractTypeApiToUi[s.contractType],
    status: s.status,
    email: s.email,
    phone: s.phone || '',
    joinDate: new Date(s.joinDate).toLocaleDateString('fr-FR'),
  }
}

interface LeaveRequest {
  id: string
  name: string
  type: string
  startDate: string
  endDate: string
  duration: string
  status: 'en_attente' | 'approuve' | 'refuse'
}

interface ApiLeaveRequest {
  id: string
  type: string
  startDate: string
  endDate: string
  duration: number
  status: 'en_attente' | 'approuve' | 'refuse'
  staff: { firstName: string; lastName: string } | null
}

const leaveTypeLabels: Record<string, string> = {
  conge_annuel: 'Conge annuel',
  conge_maladie: 'Conge maladie',
  conge_maternite: 'Conge maternite',
  permission: 'Permission',
}

function mapLeaveRequest(r: ApiLeaveRequest): LeaveRequest {
  return {
    id: r.id,
    name: r.staff ? `${r.staff.lastName} ${r.staff.firstName}` : 'Inconnu',
    type: leaveTypeLabels[r.type] || r.type,
    startDate: new Date(r.startDate).toLocaleDateString('fr-FR'),
    endDate: new Date(r.endDate).toLocaleDateString('fr-FR'),
    duration: `${r.duration} jour${r.duration > 1 ? 's' : ''}`,
    status: r.status,
  }
}

interface StaffForm {
  firstName: string
  lastName: string
  email: string
  phone: string
  department: string
  position: string
  contractType: 'CDI' | 'CDD' | 'Vacataire' | 'Stagiaire'
  status: 'actif' | 'en_conge' | 'suspendu' | 'depart'
  joinDate: string
}

const initialStaffForm: StaffForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  department: '',
  position: '',
  contractType: 'CDI',
  status: 'actif',
  joinDate: new Date().toISOString().slice(0, 10),
}

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

// ─── Component ────────────────────────────────────────────────────────────────

export function HrPage() {
  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('tous')
  const [contractFilter, setContractFilter] = useState('tous')
  const [statusFilter, setStatusFilter] = useState('tous')
  const [showAddStaff, setShowAddStaff] = useState(false)
  const [isSubmittingStaff, setIsSubmittingStaff] = useState(false)
  const [staffForm, setStaffForm] = useState<StaffForm>(initialStaffForm)
  const queryClient = useQueryClient()

  const { data: staffQuery, isLoading } = useHrStaff() as {
    data: { data?: ApiStaff[]; leaveRequests?: ApiLeaveRequest[] } | undefined
    isLoading: boolean
  }
  const staff: StaffMember[] = useMemo(() => (staffQuery?.data || []).map(mapStaff), [staffQuery])
  const leaveRequests: LeaveRequest[] = useMemo(() => (staffQuery?.leaveRequests || []).map(mapLeaveRequest), [staffQuery])

  // Count-up stats
  const totalPersonnel = useCountUp(staff.length, 1400)
  const activePersonnel = useCountUp(staff.filter(s => s.status === 'actif').length, 1200)
  const tauxOccupation = useCountUp(staff.length > 0 ? Math.round((staff.filter(s => s.status === 'actif').length / staff.length) * 100) : 0, 1300)
  const adminCount = useCountUp(staff.filter(s => ['Administration', 'Scolarite', 'Comptabilite'].includes(s.department)).length, 1100)
  const permCount = useCountUp(staff.filter(s => s.contract === 'cdi').length, 1200)
  const vacCount = useCountUp(staff.filter(s => s.contract === 'vacataire').length, 1000)
  const enCongeCount = useCountUp(staff.filter(s => s.status === 'en_conge').length, 1000)
  const pendingLeaveCount = leaveRequests.filter(l => l.status === 'en_attente').length

  // Filtered staff
  const filteredStaff = staff.filter(s => {
    const matchSearch = search === '' ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.position.toLowerCase().includes(search.toLowerCase()) ||
      s.department.toLowerCase().includes(search.toLowerCase())
    const matchDept = departmentFilter === 'tous' || s.department === departmentFilter
    const matchContract = contractFilter === 'tous' || s.contract === contractFilter
    const matchStatus = statusFilter === 'tous' || s.status === statusFilter
    return matchSearch && matchDept && matchContract && matchStatus
  })

  const monthlyStaffTrend = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 12 }).map((_, offset) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (11 - offset), 1)
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
      const count = staff.filter((member) => {
        const joinDate = new Date(member.joinDate.split('/').reverse().join('-'))
        return joinDate <= monthEnd
      }).length
      return {
        month: monthDate.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
        count,
      }
    })
  }, [staff])
  const maxStaffTrend = Math.max(1, ...monthlyStaffTrend.map((m) => m.count))

  const contractBreakdown = {
    cdi: staff.filter((member) => member.contract === 'cdi').length,
    cdd: staff.filter((member) => member.contract === 'cdd').length,
    vacataire: staff.filter((member) => member.contract === 'vacataire').length,
    stagiaire: staff.filter((member) => member.contract === 'stagiaire').length,
  }

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

  const leaveBalance = Object.entries(
    leaveRequests.reduce<Record<string, number>>((acc, request) => {
      acc[request.type] = (acc[request.type] || 0) + Number.parseInt(request.duration, 10)
      return acc
    }, {})
  ).map(([type, used], index) => ({
    type,
    used,
    total: Math.max(used, 1),
    color: ['#2d7a4f', '#d4a853', '#1a2744'][index % 3],
  }))

  const upcomingLeaves = leaveRequests
    .filter((request) => request.status !== 'refuse')
    .slice(0, 4)
    .map((request, index) => {
      const [startDay, , startYear] = request.startDate.split('/')
      const [endDay] = request.endDate.split('/')
      const startDate = new Date(request.startDate.split('/').reverse().join('-'))
      return {
        name: request.name,
        start: Number(startDay),
        end: Number(endDay),
        month: startDate.toLocaleDateString('fr-FR', { month: 'short', year: startYear ? 'numeric' : undefined }).replace('.', ''),
        color: ['#2d7a4f', '#d4a853', '#1a2744'][index % 3],
      }
    })

  const updateStaffForm = (updates: Partial<StaffForm>) => {
    setStaffForm((form) => ({ ...form, ...updates }))
  }

  const createStaff = async () => {
    if (!staffForm.firstName.trim() || !staffForm.lastName.trim() || !staffForm.email.trim() || !staffForm.department.trim() || !staffForm.position.trim()) {
      toast.error('Champs requis', { description: 'Nom, prénom, email, département et poste sont obligatoires.' })
      return
    }

    setIsSubmittingStaff(true)
    try {
      const res = await fetch('/api/hr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffForm),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Création impossible')
      toast.success('Membre du personnel ajouté')
      queryClient.invalidateQueries({ queryKey: ['hrStaff'] })
      setShowAddStaff(false)
      setStaffForm(initialStaffForm)
    } catch (e) {
      toast.error('Erreur', { description: e instanceof Error ? e.message : 'Création impossible' })
    } finally {
      setIsSubmittingStaff(false)
    }
  }

  const handleLeaveAction = async (id: string, status: 'approuve' | 'refuse') => {
    try {
      const res = await fetch(`/api/hr?leaveRequestId=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Echec de la mise a jour')
      toast.success(status === 'approuve' ? 'Demande de conge approuvee' : 'Demande de conge refusee')
      queryClient.invalidateQueries({ queryKey: ['hrStaff'] })
    } catch (e) {
      toast.error('Erreur', { description: e instanceof Error ? e.message : 'Echec de la mise a jour' })
    }
  }

  return (
    <>
      <Dialog open={showAddStaff} onOpenChange={setShowAddStaff}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ajouter un membre du personnel</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="staff-first-name">Prénom</Label>
              <Input id="staff-first-name" value={staffForm.firstName} onChange={(e) => updateStaffForm({ firstName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-last-name">Nom</Label>
              <Input id="staff-last-name" value={staffForm.lastName} onChange={(e) => updateStaffForm({ lastName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-email">Email</Label>
              <Input id="staff-email" type="email" value={staffForm.email} onChange={(e) => updateStaffForm({ email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-phone">Téléphone</Label>
              <Input id="staff-phone" value={staffForm.phone} onChange={(e) => updateStaffForm({ phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-department">Département</Label>
              <Input id="staff-department" value={staffForm.department} onChange={(e) => updateStaffForm({ department: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-position">Poste</Label>
              <Input id="staff-position" value={staffForm.position} onChange={(e) => updateStaffForm({ position: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Contrat</Label>
              <Select value={staffForm.contractType} onValueChange={(value) => updateStaffForm({ contractType: value as StaffForm['contractType'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CDI">CDI</SelectItem>
                  <SelectItem value="CDD">CDD</SelectItem>
                  <SelectItem value="Vacataire">Vacataire</SelectItem>
                  <SelectItem value="Stagiaire">Stagiaire</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-join-date">Date d&apos;entrée</Label>
              <Input id="staff-join-date" type="date" value={staffForm.joinDate} onChange={(e) => updateStaffForm({ joinDate: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddStaff(false)}>Annuler</Button>
            <Button disabled={isSubmittingStaff} onClick={createStaff} className="bg-[#2d7a4f] hover:bg-[#236b40] text-white">
              {isSubmittingStaff ? 'Ajout...' : 'Ajouter'}
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

        {/* En conge */}
        <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
          <Card className="overflow-hidden relative border-l-4 border-l-[#c62828]">
            <div className="h-1 bg-gradient-to-r from-[#c62828] to-[#e53935]" />
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Personnel en conge</p>
                  <p className="text-xl font-bold text-[#c62828] mt-1">{enCongeCount}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="size-3 text-[#d4a853]" />
                    <span className="text-[10px] text-[#d4a853] font-medium">{pendingLeaveCount} demande(s) en attente</span>
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
                <Button size="sm" className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs" onClick={() => setShowAddStaff(true)}>
                  <Plus className="size-3.5 mr-1.5" />
                  Ajouter
                </Button>
                <Button size="sm" variant="outline" className="text-xs border-[#1a274430] text-[#1a2744] hover:bg-[#1a274408]" onClick={() => exportToExcel(filteredStaff, 'personnel')}>
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
                                <DropdownMenuItem className="text-xs" onClick={() => toast.info('Profil personnel', { description: `${staff.name} — ${staff.position}` })}>
                                  <Eye className="size-3.5 mr-2" />
                                  Voir profil
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-xs" onClick={() => toast.info('Modification', { description: 'La modification détaillée sera reliée à la fiche personnel complète.' })}>
                                  <Edit3 className="size-3.5 mr-2" />
                                  Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-xs" onClick={() => toast.info('Contact', { description: staff.email })}>
                                  <Mail className="size-3.5 mr-2" />
                                  Envoyer message
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {isLoading && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-sm text-gray-400">
                          Chargement...
                        </TableCell>
                      </TableRow>
                    )}
                    {!isLoading && filteredStaff.length === 0 && (
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
                {leaveRequests.filter(l => l.status === 'en_attente').length} en attente
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
                  {leaveRequests.map((req) => {
                    const lsConf = leaveStatusConfig[req.status]
                    const isPending = req.status === 'en_attente'
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
                  {isLoading && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-sm text-gray-400">
                        Chargement...
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && leaveRequests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-sm text-gray-400">
                        Aucune demande de conge pour le moment
                      </TableCell>
                    </TableRow>
                  )}
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
              <Button size="sm" className="bg-[#1a2744] hover:bg-[#2d4a6f] text-white text-xs" onClick={() => setShowAddStaff(true)}>
                <Plus className="size-3.5 mr-1.5" />
                Ajouter au personnel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
              <Briefcase className="size-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-[#1a2744]">Aucune offre de recrutement réelle n&apos;est enregistrée.</p>
              <p className="text-xs text-gray-500 mt-1">
                Le schéma actuel expose le personnel et les congés, mais pas encore une table d&apos;offres/candidatures RH. Les anciennes offres fictives ont été retirées.
              </p>
              <Button variant="outline" size="sm" className="mt-4 text-xs" onClick={() => exportToExcel(filteredStaff, 'vivier_personnel')}>
                Exporter le personnel existant
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Workforce Structure Card ────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="border-l-4 border-l-[#2d7a4f]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote className="size-4 text-[#2d7a4f]" />
                <CardTitle className="text-sm font-semibold text-[#1a2744]">Structure du personnel</CardTitle>
              </div>
              <Badge className="text-[10px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">
                Données réelles
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-[#2d7a4f08] border border-[#2d7a4f15]">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">CDI</p>
                <p className="text-lg font-bold text-[#2d7a4f]">{contractBreakdown.cdi}</p>
              </div>
              <div className="p-3 rounded-lg bg-[#d4a85308] border border-[#d4a85315]">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">CDD</p>
                <p className="text-lg font-bold text-[#d4a853]">{contractBreakdown.cdd}</p>
              </div>
              <div className="p-3 rounded-lg bg-[#1a274408] border border-[#1a274415]">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Vacataires</p>
                <p className="text-lg font-bold text-[#1a2744]">{contractBreakdown.vacataire}</p>
              </div>
              <div className="p-3 rounded-lg bg-[#6366f108] border border-[#6366f115]">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Stagiaires</p>
                <p className="text-lg font-bold text-[#6366f1]">{contractBreakdown.stagiaire}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-[#1a2744] uppercase tracking-wide">Evolution des effectifs</p>
              <div className="flex items-end gap-1.5 h-32">
                {monthlyStaffTrend.map((m, idx) => {
                  const heightPercent = (m.count / maxStaffTrend) * 100
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                      <motion.div
                        className="w-full rounded-t bg-gradient-to-t from-[#2d7a4f] to-[#3da66a] min-h-[4px]"
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPercent}%` }}
                        transition={{ duration: 0.6, delay: 0.05 * idx, ease: 'easeOut' }}
                        style={{ maxHeight: '100%' }}
                      />
                      <span className="text-[9px] text-gray-600 font-semibold">{m.count}</span>
                      <span className="text-[9px] text-gray-400 font-medium">{m.month}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold text-[#1a2744]">Paie non affichée</p>
              <p className="text-xs text-gray-500 mt-1">
                Le modèle de données actuel ne contient pas de salaire ni de mode de paiement personnel. Les montants FCFA et pourcentages inventés ont été retirés.
              </p>
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
              <Button size="sm" className="bg-[#d4a853] hover:bg-[#c49a48] text-white text-xs" onClick={() => toast.info('Évaluations non configurées', { description: 'Aucune table/API d’évaluation RH n’est encore disponible.' })}>
                <Star className="size-3.5 mr-1.5" />
                Lancer evaluation
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
              <Award className="size-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-[#1a2744]">Aucune évaluation RH réelle enregistrée.</p>
              <p className="text-xs text-gray-500 mt-1">
                Les anciennes notes nominatives codées en dur ont été retirées. Cette section attend une vraie API d’évaluations avant d’afficher des scores.
              </p>
              <Button variant="outline" size="sm" className="mt-4 text-xs" onClick={() => exportToExcel(staff, 'personnel_a_evaluer')}>
                Exporter le personnel à évaluer
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Compliance Readiness Card ───────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="border-l-4 border-l-[#2d7a4f]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="size-4 text-[#2d7a4f]" />
                <CardTitle className="text-sm font-semibold text-[#1a2744]">Conformité RH à configurer</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-[#2d7a4f08] border border-[#2d7a4f15]">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="size-4 text-[#2d7a4f]" />
                  <span className="text-sm font-semibold text-[#1a2744]">Sécurité sociale</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Aucun calcul de cotisations n’est exécuté sans barème officiel configuré. Les intégrations sociales seront activées quand l’institution aura renseigné ses règles et justificatifs.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-gray-100 text-[10px] text-gray-600">
                    <Clock className="size-3 text-[#d4a853]" />
                    Barèmes non configurés
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#1a274408] border border-[#1a274415]">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="size-4 text-[#1a2744]" />
                  <span className="text-sm font-semibold text-[#1a2744]">Règles de travail</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Les contrats, dates d’entrée et statuts du personnel sont réels. Les durées légales, préavis et indemnités restent à paramétrer avant toute automatisation réglementaire.
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-gray-100 text-[10px] text-gray-600">
                    <CheckCircle2 className="size-3 text-[#2d7a4f]" />
                    {staff.length} dossier{staff.length > 1 ? 's' : ''} personnel réel{staff.length > 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#d4a85308] border border-[#d4a85315]">
                <div className="flex items-center gap-2 mb-2">
                  <Smartphone className="size-4 text-[#d4a853]" />
                  <span className="text-sm font-semibold text-[#1a2744]">Paiement des salaires</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Aucun virement ni envoi Mobile Money n’est déclenché depuis cet onglet. Les données bancaires et opérateurs pourront être ajoutés dans un module paie sécurisé.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-gray-100 text-[10px] text-gray-600">
                    <Clock className="size-3 text-[#d4a853]" />
                    Module paie non connecté
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#6366f108] border border-[#6366f115]">
                <div className="flex items-center gap-2 mb-2">
                  <WifiOff className="size-4 text-[#6366f1]" />
                  <span className="text-sm font-semibold text-[#1a2744]">Connectivité</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  L’onglet fonctionne avec les données enregistrées en base. Le mode hors connexion n’est pas activé afin d’éviter une fausse promesse de synchronisation locale.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-gray-100 text-[10px] text-gray-600">
                    <WifiOff className="size-3 text-[#d4a853]" />
                    Synchronisation locale désactivée
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      </motion.div>
    </>
  )
}
