'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { useScholarships } from '@/lib/api-hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Award,
  Users,
  Banknote,
  PieChart,
  Plus,
  Download,
  Search,
  MoreHorizontal,
  Eye,
  Edit3,
  Trash2,
  Smartphone,
  Globe,
  Wifi,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  AlertCircle,
  Wallet,
  Landmark,
} from 'lucide-react'

// ─── Demo Data ────────────────────────────────────────────────────────────────

interface Scholarship {
  id: string
  name: string
  type: 'merite' | 'besoin' | 'gouvernemental' | 'international' | 'urgence' | 'recherche' | 'echange' | 'sportif'
  budget: number
  maxBeneficiaires: number
  beneficiaires: number
  status: 'active' | 'cloturee' | 'en_attente'
  duration: string
}

// ─── API Mapping ────────────────────────────────────────────────────────────

const knownScholarshipTypes = ['merite', 'besoin', 'gouvernemental', 'international', 'urgence', 'recherche', 'echange', 'sportif'] as const
type KnownScholarshipType = typeof knownScholarshipTypes[number]

const knownScholarshipStatuses = ['active', 'cloturee', 'en_attente'] as const
type KnownScholarshipStatus = typeof knownScholarshipStatuses[number]

interface ScholarshipRecord {
  id: string
  name: string
  type: string
  budget: number
  currency: string
  duration: string | null
  eligibility: string | null
  maxBeneficiaries: number | null
  currentCount: number
  status: string
  startDate: string | null
  endDate: string | null
}

function isKnownScholarshipType(value: string): value is KnownScholarshipType {
  return (knownScholarshipTypes as readonly string[]).includes(value)
}

function isKnownScholarshipStatus(value: string): value is KnownScholarshipStatus {
  return (knownScholarshipStatuses as readonly string[]).includes(value)
}

function mapScholarship(r: ScholarshipRecord): Scholarship {
  const lowerType = (r.type || '').toLowerCase()
  const type: KnownScholarshipType = isKnownScholarshipType(lowerType) ? lowerType : 'merite'

  const rawStatus = r.status || ''
  const lowerStatus = rawStatus.toLowerCase()
  let status: KnownScholarshipStatus = 'active'
  if (rawStatus.toUpperCase() === 'ACTIVE') {
    status = 'active'
  } else if (isKnownScholarshipStatus(lowerStatus)) {
    status = lowerStatus
  }

  return {
    id: r.id,
    name: r.name,
    type,
    budget: r.budget,
    maxBeneficiaires: r.maxBeneficiaries ?? 0,
    beneficiaires: r.currentCount ?? 0,
    status,
    duration: r.duration || '',
  }
}

interface Beneficiary {
  id: string
  name: string
  matricule: string
  program: string
  level: string
  scholarshipType: string
  amount: number
  status: 'beneficiaire' | 'en_attente' | 'refusee'
  date: string
}

interface ScholarshipApplicationRecord {
  id: string
  applicantName: string
  studentId: string | null
  program: string | null
  level: string | null
  amount: number
  status: string
  createdAt: string
  scholarship: { name: string; type: string } | null
}

function mapBeneficiaryStatus(status: string): Beneficiary['status'] {
  const upper = (status || '').toUpperCase()
  if (upper === 'ACCEPTE' || upper === 'APPROUVE') return 'beneficiaire'
  if (upper === 'REFUSE') return 'refusee'
  return 'en_attente'
}

function formatBeneficiaryDate(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleDateString('fr-FR')
}

function mapBeneficiary(a: ScholarshipApplicationRecord): Beneficiary {
  const rawType = a.scholarship?.type || ''
  const lowerType = rawType.toLowerCase()
  const scholarshipType = typeConfig[lowerType]?.label || rawType

  return {
    id: a.id,
    name: a.applicantName,
    matricule: a.studentId || '',
    program: a.scholarship?.name || a.program || '',
    level: a.level || '',
    scholarshipType,
    amount: a.amount,
    status: mapBeneficiaryStatus(a.status),
    date: formatBeneficiaryDate(a.createdAt),
  }
}

const typeConfig: Record<string, { label: string; className: string }> = {
  merite: { label: 'Merite', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' },
  besoin: { label: 'Besoin', className: 'bg-[#d4a85315] text-[#d4a853] border-0' },
  gouvernemental: { label: 'Gouvernemental', className: 'bg-[#1a274415] text-[#1a2744] border-0' },
  international: { label: 'International', className: 'bg-[#6366f115] text-[#6366f1] border-0' },
  urgence: { label: 'Urgence', className: 'bg-[#c6282815] text-[#c62828] border-0' },
  recherche: { label: 'Recherche', className: 'bg-[#8b5cf615] text-[#8b5cf6] border-0' },
  echange: { label: 'Echange', className: 'bg-[#0891b215] text-[#0891b2] border-0' },
  sportif: { label: 'Sportif', className: 'bg-[#ea580c15] text-[#ea580c] border-0' },
}

const scholarshipStatusConfig: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' },
  cloturee: { label: 'Cloturee', className: 'bg-[#c6282815] text-[#c62828] border-0' },
  en_attente: { label: 'En attente', className: 'bg-[#d4a85315] text-[#d4a853] border-0' },
}

const beneficiaryStatusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  beneficiaire: { label: 'Beneficiaire', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0', icon: CheckCircle2 },
  en_attente: { label: 'En attente', className: 'bg-[#d4a85315] text-[#d4a853] border-0', icon: Clock },
  refusee: { label: 'Refusee', className: 'bg-[#c6282815] text-[#c62828] border-0', icon: XCircle },
}

function formatFCFA(amount: number) {
  return amount.toLocaleString('fr-FR') + ' FCFA'
}

function formatShort(amount: number) {
  if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M'
  if (amount >= 1000) return (amount / 1000).toFixed(0) + 'K'
  return amount.toString()
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ScholarshipsPage() {
  const [search, setSearch] = useState('')
  const [showNewScholarship, setShowNewScholarship] = useState(false)
  const [programFilter, setProgramFilter] = useState('tous')
  const [levelFilter, setLevelFilter] = useState('tous')
  const [statusFilter, setStatusFilter] = useState('tous')
  const [scholarshipSearch, setScholarshipSearch] = useState('')
  const [newScholarshipForm, setNewScholarshipForm] = useState({ name: '', type: '', budget: '', duree: '', maxBeneficiaires: '' })

  const { data: scholarshipsQuery, isLoading } = useScholarships()
  const scholarships: Scholarship[] = (scholarshipsQuery?.scholarships || []).map(mapScholarship)
  const beneficiaries: Beneficiary[] = (scholarshipsQuery?.beneficiaries || []).map(mapBeneficiary)

  // Stats
  const totalActive = scholarships.filter(s => s.status === 'active').length
  const totalBeneficiaires = scholarships.reduce((acc, s) => acc + s.beneficiaires, 0)
  const totalBudget = scholarships.reduce((acc, s) => acc + s.budget, 0)
  const totalMaxBeneficiaires = scholarships.reduce((acc, s) => acc + s.maxBeneficiaires, 0)
  const tauxCouverture = totalMaxBeneficiaires > 0 ? Math.round((totalBeneficiaires / totalMaxBeneficiaires) * 100) : 0

  // Filter scholarships
  const filteredScholarships = scholarships.filter(s => {
    const matchSearch = scholarshipSearch === '' ||
      s.name.toLowerCase().includes(scholarshipSearch.toLowerCase())
    return matchSearch
  })

  // Filter beneficiaries
  const filteredBeneficiaries = beneficiaries.filter(b => {
    const matchSearch = search === '' ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.matricule.toLowerCase().includes(search.toLowerCase())
    const matchProgram = programFilter === 'tous' || b.program === programFilter
    const matchLevel = levelFilter === 'tous' || b.level === levelFilter
    const matchStatus = statusFilter === 'tous' || b.status === statusFilter
    return matchSearch && matchProgram && matchLevel && matchStatus
  })

  // Financial summary data
  const budgetByType = [
    { type: 'Merite', amount: 15000000, color: '#2d7a4f' },
    { type: 'Gouvernemental', amount: 10000000, color: '#1a2744' },
    { type: 'Besoin', amount: 8000000, color: '#d4a853' },
    { type: 'International', amount: 5000000, color: '#6366f1' },
    { type: 'Urgence', amount: 3000000, color: '#c62828' },
    { type: 'Recherche', amount: 2000000, color: '#8b5cf6' },
    { type: 'Echange', amount: 1500000, color: '#0891b2' },
    { type: 'Sportif', amount: 500000, color: '#ea580c' },
  ].map(item => ({
    ...item,
    percent: totalBudget > 0 ? Math.round((item.amount / totalBudget) * 100) : 0,
  }))

  const totalCommitted = beneficiaries.filter(b => b.status === 'beneficiaire').reduce((acc, b) => acc + b.amount, 0)
  const totalAvailable = scholarships.reduce((acc, s) => {
    const committed = beneficiaries.filter(b => b.status === 'beneficiaire' && b.program === s.name).reduce((sum, b) => sum + b.amount, 0)
    return acc + (s.budget - committed)
  }, 0)

  const maxBudget = Math.max(...budgetByType.map(b => b.amount))

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
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1a2744]">Bourses &amp; Aide financiere</h1>
          <p className="text-sm text-gray-500">Gestion des bourses et de l&apos;aide financiere aux etudiants</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showNewScholarship} onOpenChange={setShowNewScholarship}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs">
                <Plus className="size-3.5 mr-1.5" />
                Nouvelle bourse
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Creer une nouvelle bourse</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-sm">Nom de la bourse</Label>
                  <Input placeholder="Ex: Bourse d'excellence scientifique" value={newScholarshipForm.name} onChange={(e) => setNewScholarshipForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Type</Label>
                  <Select value={newScholarshipForm.type} onValueChange={(v) => setNewScholarshipForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selectionner le type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="merite">Merite</SelectItem>
                      <SelectItem value="besoin">Besoin</SelectItem>
                      <SelectItem value="gouvernemental">Gouvernemental</SelectItem>
                      <SelectItem value="international">International</SelectItem>
                      <SelectItem value="urgence">Urgence</SelectItem>
                      <SelectItem value="recherche">Recherche</SelectItem>
                      <SelectItem value="echange">Echange</SelectItem>
                      <SelectItem value="sportif">Sportif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Budget (FCFA)</Label>
                    <Input type="number" placeholder="5 000 000" value={newScholarshipForm.budget} onChange={(e) => setNewScholarshipForm(f => ({ ...f, budget: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Duree</Label>
                    <Select value={newScholarshipForm.duree} onValueChange={(v) => setNewScholarshipForm(f => ({ ...f, duree: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Duree" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6-mois">6 mois</SelectItem>
                        <SelectItem value="9-mois">9 mois</SelectItem>
                        <SelectItem value="12-mois">12 mois</SelectItem>
                        <SelectItem value="24-mois">24 mois</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Criteres d&apos;eligibilite</Label>
                  <textarea
                    className="w-full min-h-[80px] rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d7a4f] focus:border-transparent resize-none"
                    placeholder="Moyenne minimale, niveau d'etude, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Nombre maximum de beneficiaires</Label>
                  <Input type="number" placeholder="50" value={newScholarshipForm.maxBeneficiaires} onChange={(e) => setNewScholarshipForm(f => ({ ...f, maxBeneficiaires: e.target.value }))} />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1 bg-[#2d7a4f] hover:bg-[#236b40] text-white" onClick={() => { setShowNewScholarship(false); toast.success('Bourse créée', { description: `${newScholarshipForm.name || 'Nouveau programme'} ajouté avec succès` }); setNewScholarshipForm({ name: '', type: '', budget: '', duree: '', maxBeneficiaires: '' }) }}>
                    Creer la bourse
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => setShowNewScholarship(false)}>
                    Annuler
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button size="sm" variant="outline" className="text-xs border-[#1a274430] text-[#1a2744] hover:bg-[#1a274408]" onClick={() => toast.success('Export en cours', { description: 'Fichier des programmes de bourses' })}>
            <Download className="size-3.5 mr-1.5" />
            Exporter
          </Button>
        </div>
      </motion.div>

      {/* ── Stats Cards ──────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Bourses actives */}
        <Card className="overflow-hidden relative border-l-4 border-l-[#2d7a4f]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#2d7a4f08] to-[#2d7a4f00] pointer-events-none" />
          <CardContent className="p-4 relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Bourses actives</p>
                <p className="text-xl font-bold text-[#2d7a4f] mt-1">{totalActive}</p>
                <p className="text-xs text-gray-400 mt-1">sur {scholarships.length} programmes</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#2d7a4f15] flex items-center justify-center">
                <Award className="size-5 text-[#2d7a4f]" />
              </div>
            </div>
            <div className="mt-3">
              <Progress value={scholarships.length > 0 ? (totalActive / scholarships.length) * 100 : 0} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#2d7a4f]" />
            </div>
          </CardContent>
        </Card>

        {/* Beneficiaires */}
        <Card className="overflow-hidden relative border-l-4 border-l-[#1a2744]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a274408] to-[#1a274400] pointer-events-none" />
          <CardContent className="p-4 relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Beneficiaires</p>
                <p className="text-xl font-bold text-[#1a2744] mt-1">{totalBeneficiaires}</p>
                <p className="text-xs text-gray-400 mt-1">etudiats soutenus</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#1a274415] flex items-center justify-center">
                <Users className="size-5 text-[#1a2744]" />
              </div>
            </div>
            <div className="mt-3">
              <Progress value={totalMaxBeneficiaires > 0 ? (totalBeneficiaires / totalMaxBeneficiaires) * 100 : 0} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#1a2744]" />
            </div>
          </CardContent>
        </Card>

        {/* Budget total */}
        <Card className="overflow-hidden relative border-l-4 border-l-[#d4a853]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#d4a85308] to-[#d4a85300] pointer-events-none" />
          <CardContent className="p-4 relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Budget total</p>
                <p className="text-xl font-bold text-[#d4a853] mt-1">{formatFCFA(totalBudget)}</p>
                <p className="text-xs text-gray-400 mt-1">tous programmes confondus</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#d4a85315] flex items-center justify-center">
                <Banknote className="size-5 text-[#d4a853]" />
              </div>
            </div>
            <div className="mt-3">
              <Progress value={totalBudget > 0 ? Math.round((totalCommitted / totalBudget) * 100) : 0} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#d4a853]" />
            </div>
          </CardContent>
        </Card>

        {/* Taux couverture */}
        <Card className="overflow-hidden relative border-l-4 border-l-[#1a2744]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a274408] to-[#1a274400] pointer-events-none" />
          <CardContent className="p-4 relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Taux couverture</p>
                <p className="text-xl font-bold text-[#1a2744] mt-1">{tauxCouverture}%</p>
                <p className="text-xs text-gray-400 mt-1">places pourvues</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#1a274415] flex items-center justify-center">
                <PieChart className="size-5 text-[#1a2744]" />
              </div>
            </div>
            <div className="mt-3">
              <Progress value={tauxCouverture} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#1a2744]" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Scholarship Programs Table ───────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="text-sm font-semibold text-[#1a2744]">Programmes de bourses</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  placeholder="Rechercher un programme..."
                  className="pl-9 h-8 text-xs"
                  value={scholarshipSearch}
                  onChange={(e) => setScholarshipSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs font-semibold">Programme</TableHead>
                    <TableHead className="text-xs font-semibold">Type</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Budget</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Beneficiaires</TableHead>
                    <TableHead className="text-xs font-semibold">Statut</TableHead>
                    <TableHead className="text-xs font-semibold">Occupation</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredScholarships.map((scholarship) => {
                    const typeConf = typeConfig[scholarship.type]
                    const statusConf = scholarshipStatusConfig[scholarship.status]
                    const occupancyPercent = scholarship.maxBeneficiaires > 0
                      ? Math.round((scholarship.beneficiaires / scholarship.maxBeneficiaires) * 100)
                      : 0
                    return (
                      <TableRow
                        key={scholarship.id}
                        className="hover:bg-[#2d7a4f05] transition-colors cursor-pointer"
                      >
                        <TableCell className="py-2.5">
                          <div>
                            <p className="text-sm font-medium text-[#1a2744]">{scholarship.name}</p>
                            <p className="text-[10px] text-gray-400">Duree: {scholarship.duration}</p>
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5">
                          {typeConf ? (
                            <Badge className={`text-[10px] ${typeConf.className}`}>
                              {typeConf.label}
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-sm text-right font-semibold text-[#1a2744] py-2.5">
                          {formatFCFA(scholarship.budget)}
                        </TableCell>
                        <TableCell className="text-center py-2.5">
                          <span className="text-sm font-semibold text-[#1a2744]">{scholarship.beneficiaires}</span>
                          <span className="text-xs text-gray-400">/{scholarship.maxBeneficiaires}</span>
                        </TableCell>
                        <TableCell className="py-2.5">
                          {statusConf ? (
                            <Badge className={`text-[10px] ${statusConf.className}`}>
                              {statusConf.label}
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell className="py-2.5">
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <Progress value={occupancyPercent} className="h-1.5 flex-1 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-[#2d7a4f] [&>[data-slot=progress-indicator]]:to-[#3da66a]" />
                            <span className="text-[10px] font-medium text-gray-500 w-8">{occupancyPercent}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-2.5">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-gray-100">
                                <MoreHorizontal className="size-4 text-gray-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem className="text-xs" onClick={() => toast.info('Détails de la bourse')}>
                                <Eye className="size-3.5 mr-2" />
                                Voir details
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs" onClick={() => toast.info('Mode édition')}>
                                <Edit3 className="size-3.5 mr-2" />
                                Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs text-red-600" onClick={() => toast.error('Bourse supprimée')}>
                                <Trash2 className="size-3.5 mr-2" />
                                Supprimer
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
                  {!isLoading && filteredScholarships.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-sm text-gray-400">
                        Aucun programme trouve
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Beneficiary Management Section ───────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[#1a2744]">Gestion des beneficiaires</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {/* Search + Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par nom, matricule..."
                  className="pl-9 h-9 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select value={programFilter} onValueChange={setProgramFilter}>
                  <SelectTrigger className="w-[180px] h-9 text-xs">
                    <SelectValue placeholder="Programme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous les programmes</SelectItem>
                    <SelectItem value="Bourse d'Excellence">Bourse d&apos;Excellence</SelectItem>
                    <SelectItem value="Bourse du Ministere">Bourse du Ministere</SelectItem>
                    <SelectItem value="Fonds de Solidarite Africaine">Fonds de Solidarite Africaine</SelectItem>
                    <SelectItem value="Bourse Master AUF">Bourse Master AUF</SelectItem>
                    <SelectItem value="Aide d'Urgence Humanitaire">Aide d&apos;Urgence Humanitaire</SelectItem>
                    <SelectItem value="Bourse de Recherche">Bourse de Recherche</SelectItem>
                    <SelectItem value="Programme Erasmus+">Programme Erasmus+</SelectItem>
                    <SelectItem value="Bourse Sportive">Bourse Sportive</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={levelFilter} onValueChange={setLevelFilter}>
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
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px] h-9 text-xs">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous les statuts</SelectItem>
                    <SelectItem value="beneficiaire">Beneficiaire</SelectItem>
                    <SelectItem value="en_attente">En attente</SelectItem>
                    <SelectItem value="refusee">Refusee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Beneficiaries Table */}
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs font-semibold">Etudiant</TableHead>
                    <TableHead className="text-xs font-semibold">Programme</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Niveau</TableHead>
                    <TableHead className="text-xs font-semibold">Type</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Montant</TableHead>
                    <TableHead className="text-xs font-semibold">Statut</TableHead>
                    <TableHead className="text-xs font-semibold">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBeneficiaries.map((beneficiary) => {
                    const bStatusConf = beneficiaryStatusConfig[beneficiary.status]
                    return (
                      <TableRow
                        key={beneficiary.id}
                        className="hover:bg-[#2d7a4f05] transition-colors"
                      >
                        <TableCell className="py-2.5">
                          <div>
                            <p className="text-sm font-medium text-[#1a2744]">{beneficiary.name}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{beneficiary.matricule}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-gray-600 py-2.5 max-w-[180px] truncate">{beneficiary.program}</TableCell>
                        <TableCell className="text-center py-2.5">
                          <Badge variant="outline" className="text-[10px] font-mono border-gray-200 text-gray-600">
                            {beneficiary.level}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-gray-600 py-2.5">{beneficiary.scholarshipType}</TableCell>
                        <TableCell className="text-sm text-right font-semibold text-[#1a2744] py-2.5">{formatFCFA(beneficiary.amount)}</TableCell>
                        <TableCell className="py-2.5">
                          {bStatusConf ? (
                            <Badge className={`text-[10px] ${bStatusConf.className}`}>
                              <bStatusConf.icon className="size-3 mr-1" />
                              {bStatusConf.label}
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-xs text-gray-500 py-2.5">{beneficiary.date}</TableCell>
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
                  {!isLoading && beneficiaries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-sm text-gray-400">
                        Aucun beneficiaire pour le moment
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && beneficiaries.length > 0 && filteredBeneficiaries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-sm text-gray-400">
                        Aucun beneficiaire trouve
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Financial Summary + African Context ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Financial Summary Card */}
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-[#1a2744]">Repartition budgetaire par type</CardTitle>
                <TrendingUp className="size-4 text-[#2d7a4f]" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* CSS Bar Chart */}
              {budgetByType.map((item, index) => {
                const widthPercent = maxBudget > 0 ? (item.amount / maxBudget) * 100 : 0
                return (
                  <div key={item.type} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs font-medium text-[#1a2744]">{item.type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400">{item.percent}%</span>
                        <span className="text-xs font-semibold text-[#1a2744]">{formatShort(item.amount)}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: item.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${widthPercent}%` }}
                        transition={{ duration: 0.6, delay: 0.1 * index, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                )
              })}

              {/* Total breakdown */}
              <div className="pt-3 border-t border-gray-100 mt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">Total engage</span>
                  <span className="text-sm font-bold text-[#c62828]">{formatFCFA(totalCommitted)}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">Disponible</span>
                  <span className="text-sm font-bold text-[#2d7a4f]">{formatFCFA(totalAvailable > 0 ? totalAvailable : 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Budget total</span>
                  <span className="text-sm font-bold text-[#1a2744]">{formatFCFA(totalBudget)}</span>
                </div>
              </div>

              {/* Pie-chart style dots breakdown */}
              <div className="pt-3 border-t border-gray-100">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-2">Repartition visuelle</p>
                <div className="flex flex-wrap gap-2">
                  {budgetByType.map((item) => (
                    <div key={item.type} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-50">
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-[10px] text-gray-600">{item.type}</span>
                      <span className="text-[10px] font-semibold text-[#1a2744]">{item.percent}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* African Context Card */}
        <motion.div variants={itemVariants}>
          <Card className="h-full border-l-4 border-l-[#d4a853]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-[#1a2744]">Contexte africain</CardTitle>
                <Landmark className="size-4 text-[#d4a853]" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mobile Money Integration */}
              <div className="p-3 rounded-lg bg-[#d4a85308] border border-[#d4a85315]">
                <div className="flex items-center gap-2 mb-2">
                  <Smartphone className="size-4 text-[#d4a853]" />
                  <span className="text-sm font-semibold text-[#1a2744]">Versement Mobile Money</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Les fonds sont verses directement sur les comptes Mobile Money des beneficiaires via Airtel Money, Moov Money et Orange Money. Solution adaptee aux zones rurales ou l&apos;acces bancaire est limite.
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

              {/* Multi-currency support */}
              <div className="p-3 rounded-lg bg-[#1a274408] border border-[#1a274415]">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="size-4 text-[#1a2744]" />
                  <span className="text-sm font-semibold text-[#1a2744]">Support multi-devises</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Conversion automatique entre FCFA, USD et EUR pour les bourses internationales. Taux de change mis a jour quotidiennement via la BCEAO.
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="text-center">
                    <p className="text-xs font-bold text-[#1a2744]">FCFA</p>
                    <p className="text-[10px] text-gray-400">Principale</p>
                  </div>
                  <div className="text-gray-200">|</div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-[#1a2744]">USD</p>
                    <p className="text-[10px] text-gray-400">International</p>
                  </div>
                  <div className="text-gray-200">|</div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-[#1a2744]">EUR</p>
                    <p className="text-[10px] text-gray-400">Erasmus+</p>
                  </div>
                </div>
              </div>

              {/* Low-connectivity design */}
              <div className="p-3 rounded-lg bg-[#2d7a4f08] border border-[#2d7a4f15]">
                <div className="flex items-center gap-2 mb-2">
                  <Wifi className="size-4 text-[#2d7a4f]" />
                  <span className="text-sm font-semibold text-[#1a2744]">Conception faible connectivite</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Interface optimisee pour les zones a faible debit. Saisie hors-ligne possible avec synchronisation automatique lors du retour de la connexion. Donnees critiques mises en cache localement.
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="w-2 h-2 rounded-full bg-[#2d7a4f] animate-pulse" />
                  <span className="text-[10px] text-gray-500">Mode hors-ligne disponible</span>
                </div>
              </div>

              {/* Quick summary */}
              <div className="pt-2 border-t border-gray-100">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="w-8 h-8 rounded-full bg-[#d4a85315] flex items-center justify-center mx-auto mb-1">
                      <Wallet className="size-4 text-[#d4a853]" />
                    </div>
                    <p className="text-[10px] text-gray-400">Versement</p>
                    <p className="text-[10px] font-semibold text-[#1a2744]">Mobile Money</p>
                  </div>
                  <div>
                    <div className="w-8 h-8 rounded-full bg-[#1a274415] flex items-center justify-center mx-auto mb-1">
                      <Globe className="size-4 text-[#1a2744]" />
                    </div>
                    <p className="text-[10px] text-gray-400">Devises</p>
                    <p className="text-[10px] font-semibold text-[#1a2744]">3 supportees</p>
                  </div>
                  <div>
                    <div className="w-8 h-8 rounded-full bg-[#2d7a4f15] flex items-center justify-center mx-auto mb-1">
                      <AlertCircle className="size-4 text-[#2d7a4f]" />
                    </div>
                    <p className="text-[10px] text-gray-400">Latence</p>
                    <p className="text-[10px] font-semibold text-[#1a2744]">Optimisee</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}
