'use client'

import { exportToExcel } from '@/lib/export'
import { exportListToPDF } from '@/lib/pdf-list'
import { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { useCandidatures, useStructure, useAcademicYears } from '@/lib/api-hooks'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
  FileText,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Plus,
  CalendarDays,
  ClipboardCheck,
  Eye,
  MoreHorizontal,
  Mail,
  CheckCircle,
  XCircle as XCircleIcon,
  FileCheck,
  GraduationCap,
  ArrowUpRight,
  ArrowDownRight,
  Upload,
  Download,
} from 'lucide-react'

// ─── Demo Data ────────────────────────────────────────────────────────────────

type CandidatureStatut = 'en_attente' | 'en_examen' | 'admis' | 'refuse' | 'en_attente_pieces'

interface Candidature {
  id: string
  numero: string
  candidat: string
  filiere: string
  niveau: string
  date: string
  statut: CandidatureStatut
  email: string
  telephone: string
  type: string
}

// ─── API mapping ────────────────────────────────────────────────────────────

interface AdmissionRecord {
  id: string
  numero: string | null
  candidateFirstName: string | null
  candidateLastName: string | null
  candidateEmail: string | null
  candidatePhone: string | null
  niveau: string | null
  type: string | null
  status: string
  createdAt: string
  program: { name: string } | null
  bacSeries?: string | null
  bacYear?: number | null
}

interface CandidaturesResponse {
  candidatures: AdmissionRecord[]
  stats: { total: number; admis: number; enAttente: number; refuse: number }
}

const VALID_STATUTS: CandidatureStatut[] = ['en_attente', 'en_examen', 'admis', 'refuse', 'en_attente_pieces']

function isCandidatureStatut(value: string): value is CandidatureStatut {
  return (VALID_STATUTS as string[]).includes(value)
}

const typeLabels: Record<string, string> = {
  Premiere_inscription: 'Premiere inscription',
  Reinscription: 'Reinscription',
  Transfert: 'Transfert',
  Equivalence: 'Equivalence',
}

function mapCandidature(r: AdmissionRecord): Candidature {
  return {
    id: r.id,
    numero: r.numero || r.id,
    candidat: `${r.candidateFirstName || ''} ${r.candidateLastName || ''}`.trim(),
    filiere: r.program?.name || 'Non specifie',
    niveau: r.niveau || '',
    date: new Date(r.createdAt).toLocaleDateString('fr-FR'),
    statut: isCandidatureStatut(r.status) ? r.status : 'en_attente',
    email: r.candidateEmail || '',
    telephone: r.candidatePhone || '',
    type: typeLabels[r.type || ''] || 'Premiere inscription',
  }
}

interface RequiredDoc {
  id: string
  label: string
  status: 'recu' | 'manquant' | 'en_verification'
}

const defaultDocs: RequiredDoc[] = [
  { id: 'diplome', label: 'Diplôme / Baccalauréat', status: 'recu' },
  { id: 'releve', label: 'Relevé de notes', status: 'en_verification' },
  { id: 'photo', label: "Photo d'identité", status: 'recu' },
  { id: 'naissance', label: "Extrait d'acte de naissance", status: 'manquant' },
  { id: 'lettre', label: 'Lettre de motivation', status: 'recu' },
  { id: 'cv', label: 'Curriculum vitae', status: 'manquant' },
]

const statutConfig: Record<CandidatureStatut, { label: string; className: string }> = {
  en_attente: { label: 'En attente', className: 'bg-[#d4a85318] text-[#d4a853] border-0' },
  en_examen: { label: 'En examen', className: 'bg-[#1a274418] text-[#1a2744] border-0' },
  admis: { label: 'Admis', className: 'bg-[#2d7a4f18] text-[#2d7a4f] border-0' },
  refuse: { label: 'Refusé', className: 'bg-[#c6282818] text-[#c62828] border-0' },
  en_attente_pieces: { label: 'En attente de pièces', className: 'bg-[#e6510018] text-[#e65100] border-0' },
}

const docStatusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  recu: { label: 'Reçu', className: 'text-[#2d7a4f] bg-[#2d7a4f12]', icon: CheckCircle2 },
  manquant: { label: 'Manquant', className: 'text-[#c62828] bg-[#c6282812]', icon: XCircle },
  en_verification: { label: 'En vérification', className: 'text-[#d4a853] bg-[#d4a85312]', icon: Clock },
}

const PROGRAM_CHART_COLORS = ['#2d7a4f', '#1a2744', '#d4a853', '#e65100']

interface ApiProgram {
  id: string
  name: string
}
interface ApiDepartment {
  programs: ApiProgram[]
}
interface ApiFaculty {
  departments: ApiDepartment[]
}

function TrendBadge({ pct }: { pct: number }) {
  if (pct === 0) return <span className="text-xs text-gray-400">stable vs mois dernier</span>
  const positive = pct > 0
  const Icon = positive ? ArrowUpRight : ArrowDownRight
  const color = positive ? 'text-[#2d7a4f]' : 'text-[#c62828]'
  return (
    <>
      <Icon className={`size-3 ${color}`} />
      <span className={`text-xs font-medium ${color}`}>{positive ? '+' : ''}{pct}%</span>
      <span className="text-xs text-gray-400">vs mois dernier</span>
    </>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CandidaturePage() {
  const setView = useAppStore((s) => s.setView)
  const queryClient = useQueryClient()
  const { data: candidaturesQuery, isLoading } = useCandidatures() as {
    data: CandidaturesResponse | undefined
    isLoading: boolean
  }
  const { data: structureQuery } = useStructure() as { data: { faculties?: ApiFaculty[] } | undefined }
  const { data: academicYearsQuery } = useAcademicYears() as {
    data: { data: { id: string; name: string; startDate: string; endDate: string; isCurrent: boolean }[] } | undefined
  }
  const currentYear = (academicYearsQuery?.data || []).find((y) => y.isCurrent) || null
  const realPrograms = (structureQuery?.faculties || []).flatMap((f) => f.departments.flatMap((d) => d.programs))

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [showDocsDialog, setShowDocsDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formType, setFormType] = useState('')
  const [formProgramId, setFormProgramId] = useState('')
  const [formNiveau, setFormNiveau] = useState('')
  const [formNom, setFormNom] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formTelephone, setFormTelephone] = useState('')
  const [docs, setDocs] = useState<RequiredDoc[]>(defaultDocs)

  const candidatures: Candidature[] = (candidaturesQuery?.candidatures || []).map(mapCandidature)

  // Stats
  const totalRecues = candidatures.length
  const enExamen = candidatures.filter(c => c.statut === 'en_examen').length
  const admis = candidatures.filter(c => c.statut === 'admis').length
  const refuses = candidatures.filter(c => c.statut === 'refuse').length

  // Real month-over-month trends, derived from actual submission dates
  // (candidaturesQuery.candidatures carries createdAt as ISO before mapping).
  const trends = useMemo(() => {
    const now = new Date()
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const raw = candidaturesQuery?.candidatures || []

    const countIn = (from: Date, to: Date, statut?: CandidatureStatut) =>
      raw.filter((r) => {
        const created = new Date(r.createdAt)
        if (created < from || created >= to) return false
        if (!statut) return true
        return (isCandidatureStatut(r.status) ? r.status : 'en_attente') === statut
      }).length

    const pct = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0
      return Math.round(((curr - prev) / prev) * 100)
    }

    const thisMonthTotal = countIn(startOfThisMonth, now)
    const lastMonthTotal = countIn(startOfLastMonth, startOfThisMonth)

    return {
      candidaturesThisMonth: thisMonthTotal,
      total: pct(thisMonthTotal, lastMonthTotal),
      enExamen: pct(countIn(startOfThisMonth, now, 'en_examen'), countIn(startOfLastMonth, startOfThisMonth, 'en_examen')),
      admis: pct(countIn(startOfThisMonth, now, 'admis'), countIn(startOfLastMonth, startOfThisMonth, 'admis')),
      refuse: pct(countIn(startOfThisMonth, now, 'refuse'), countIn(startOfLastMonth, startOfThisMonth, 'refuse')),
    }
  }, [candidaturesQuery])

  // Filtered candidatures
  const filteredCandidatures = candidatures.filter(c => {
    const matchSearch = search === '' ||
      c.candidat.toLowerCase().includes(search.toLowerCase()) ||
      c.numero.toLowerCase().includes(search.toLowerCase()) ||
      c.filiere.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || c.statut === statusFilter
    return matchSearch && matchStatus
  })

  // Real distribution by filiere, computed from actual candidatures
  const programStats = useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of candidatures) {
      counts.set(c.filiere, (counts.get(c.filiere) || 0) + 1)
    }
    return Array.from(counts.entries())
      .map(([name, count], i) => ({ name, count, color: PROGRAM_CHART_COLORS[i % PROGRAM_CHART_COLORS.length] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [candidatures])

  // Chart calculations
  const maxProgramCount = Math.max(1, ...programStats.map(p => p.count))
  const admissionRate = totalRecues > 0 ? Math.round((admis / totalRecues) * 100) : 0
  const refusalRate = totalRecues > 0 ? Math.round((refuses / totalRecues) * 100) : 0
  const pendingRate = totalRecues > 0 ? 100 - admissionRate - refusalRate : 0

  // Real timeline, derived from the current academic year and actual submission dates
  const timelineEvents = useMemo(() => {
    const raw = candidaturesQuery?.candidatures || []
    const dates = raw.map((r) => new Date(r.createdAt).getTime())
    const first = dates.length ? new Date(Math.min(...dates)) : null
    const last = dates.length ? new Date(Math.max(...dates)) : null
    const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    const events: { label: string; date: string; status: 'done' | 'current' | 'upcoming' }[] = []
    if (currentYear) {
      events.push({ label: `Année académique ${currentYear.name}`, date: `${fmt(new Date(currentYear.startDate))} au ${fmt(new Date(currentYear.endDate))}`, status: 'current' })
    }
    if (first) events.push({ label: 'Première candidature reçue', date: fmt(first), status: 'done' })
    if (last) events.push({ label: 'Dernière candidature reçue', date: fmt(last), status: 'done' })
    if (events.length === 0) events.push({ label: 'Aucune candidature enregistrée', date: '—', status: 'upcoming' })
    return events
  }, [candidaturesQuery, currentYear])

  const handleSubmit = async () => {
    if (!currentYear) {
      toast.error('Aucune année académique en cours', { description: "Configurez l'année académique en cours depuis la page Institution" })
      return
    }
    if (!formNom.trim() || !formEmail.trim()) {
      toast.error('Champs requis', { description: 'Nom complet et email sont obligatoires' })
      return
    }
    const [prenom, ...rest] = formNom.trim().split(' ')
    const nom = rest.join(' ') || prenom
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/candidature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academicYearId: currentYear.id,
          candidateFirstName: prenom,
          candidateLastName: nom,
          candidateEmail: formEmail.trim(),
          candidatePhone: formTelephone.trim() || undefined,
          programId: formProgramId || undefined,
          niveau: formNiveau ? formNiveau.toUpperCase() : undefined,
          type: formType === 'premiere_inscription' ? 'Premiere_inscription'
            : formType === 'reinscription' ? 'Reinscription'
            : formType === 'transfert' ? 'Transfert'
            : formType === 'equivalence' ? 'Equivalence'
            : undefined,
          documents: JSON.stringify(docs.filter((d) => d.status === 'recu').map((d) => d.label)),
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Échec de la soumission')
      toast.success('Candidature soumise', { description: body.candidature?.numero })
      queryClient.invalidateQueries({ queryKey: ['candidatures'] })
      setShowForm(false)
      setFormType('')
      setFormProgramId('')
      setFormNiveau('')
      setFormNom('')
      setFormEmail('')
      setFormTelephone('')
      setDocs(defaultDocs)
    } catch (e) {
      toast.error('Erreur', { description: e instanceof Error ? e.message : 'Échec de la soumission' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStatusChange = async (id: string, status: CandidatureStatut) => {
    try {
      const res = await fetch(`/api/candidature?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Échec de la mise à jour')
      toast.success(
        status === 'admis' ? 'Candidature validée' : status === 'refuse' ? 'Candidature refusée' : 'Statut mis à jour'
      )
      queryClient.invalidateQueries({ queryKey: ['candidatures'] })
    } catch (e) {
      toast.error('Erreur', { description: e instanceof Error ? e.message : 'Échec de la mise à jour' })
    }
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Gradient Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#1a2744] via-[#1f3050] to-[#2d7a4f] p-6 md:p-8 rounded-xl">
        {/* SVG pattern overlay */}
        <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '24px 24px'}} />
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">Gestion des candidatures</h1>
              <p className="text-sm text-white/70 mt-1">Inscriptions, admissions et suivi des dossiers</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                className="bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 text-white text-xs"
                onClick={() => setShowForm(true)}
              >
                <Plus className="size-3.5 mr-1.5" />
                Nouvelle candidature
              </Button>
              <Button
                size="sm"
                className="bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 text-white text-xs"
                onClick={() => exportToExcel(
                  filteredCandidatures.map((c) => ({
                    Numero: c.numero, Candidat: c.candidat, Filiere: c.filiere, Niveau: c.niveau,
                    Type: c.type, Statut: statutConfig[c.statut].label, Email: c.email, Telephone: c.telephone, Date: c.date,
                  })),
                  'export_candidatures',
                )}>
                <Download className="size-3.5 mr-1.5" />
                Excel
              </Button>
              <Button
                size="sm"
                className="bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 text-white text-xs"
                onClick={() => exportListToPDF(
                  'export_candidatures',
                  'Liste des candidatures',
                  `${filteredCandidatures.length} candidature(s)`,
                  [
                    { header: 'Numero', width: 0.15, value: (c: Candidature) => c.numero },
                    { header: 'Candidat', width: 0.22, value: (c: Candidature) => c.candidat },
                    { header: 'Filiere', width: 0.22, value: (c: Candidature) => c.filiere },
                    { header: 'Niveau', width: 0.1, value: (c: Candidature) => c.niveau },
                    { header: 'Statut', width: 0.16, value: (c: Candidature) => statutConfig[c.statut].label },
                    { header: 'Date', width: 0.15, value: (c: Candidature) => c.date },
                  ],
                  filteredCandidatures,
                )}>
                <FileText className="size-3.5 mr-1.5" />
                PDF
              </Button>
              <Button
                size="sm"
                className="bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 text-white text-xs"
                onClick={() => setView('import-export')}
              >
                <Upload className="size-3.5 mr-1.5" />
                Importer
              </Button>
            </div>
          </div>
          {/* Glass-morphism stat cards */}
          <div className="flex gap-4 mt-4">
            <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }} className="bg-white/10 backdrop-blur border border-white/15 rounded-lg px-4 py-3">
              <div className="text-white/60 text-xs">Candidatures ce mois</div>
              <div className="text-white text-2xl font-bold">{trends.candidaturesThisMonth}</div>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }} className="bg-white/10 backdrop-blur border border-white/15 rounded-lg px-4 py-3">
              <div className="text-white/60 text-xs">Taux d&apos;admission</div>
              <div className="text-white text-2xl font-bold">{admissionRate}%</div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
        <Card>
          <div className="h-1 bg-gradient-to-r from-[#1a2744] to-[#2d7a4f]" />
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Candidatures reçues</p>
                <p className="text-2xl font-bold text-[#1a2744] mt-1">{totalRecues}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendBadge pct={trends.total} />
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#1a274412] flex items-center justify-center">
                <FileText className="size-5 text-[#1a2744]" />
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
        <Card>
          <div className="h-1 bg-gradient-to-r from-[#d4a853] to-[#e6c477]" />
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">En cours d&apos;examen</p>
                <p className="text-2xl font-bold text-[#1a2744] mt-1">{enExamen}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendBadge pct={trends.enExamen} />
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#d4a85315] flex items-center justify-center">
                <ClipboardCheck className="size-5 text-[#d4a853]" />
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
        <Card>
          <div className="h-1 bg-gradient-to-r from-[#2d7a4f] to-[#3da66a]" />
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Admis</p>
                <p className="text-2xl font-bold text-[#2d7a4f] mt-1">{admis}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendBadge pct={trends.admis} />
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#2d7a4f15] flex items-center justify-center">
                <CheckCircle2 className="size-5 text-[#2d7a4f]" />
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
        <Card>
          <div className="h-1 bg-gradient-to-r from-[#c62828] to-[#ef5350]" />
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Refuses</p>
                <p className="text-2xl font-bold text-[#c62828] mt-1">{refuses}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendBadge pct={trends.refuse} />
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#c6282815] flex items-center justify-center">
                <XCircle className="size-5 text-[#c62828]" />
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Form + Documents */}
        <div className="lg:col-span-1 space-y-6">
          {/* Candidature Form Card */}
          <Card className="border-l-4 border-l-[#2d7a4f]">
            <div className="h-1 bg-gradient-to-r from-[#1a2744] via-[#2d7a4f] to-[#d4a853]" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                <FileText className="size-4 text-[#2d7a4f]" />
                Formulaire de candidature
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600">Type de candidature</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Sélectionner le type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="premiere_inscription">Première inscription</SelectItem>
                    <SelectItem value="reinscription">Réinscription</SelectItem>
                    <SelectItem value="transfert">Transfert</SelectItem>
                    <SelectItem value="equivalence">Équivalence</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600">Filière souhaitée</Label>
                <Select value={formProgramId} onValueChange={setFormProgramId}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Sélectionner la filière" />
                  </SelectTrigger>
                  <SelectContent>
                    {realPrograms.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600">Niveau</Label>
                <Select value={formNiveau} onValueChange={setFormNiveau}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Sélectionner le niveau" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="l1">L1</SelectItem>
                    <SelectItem value="l2">L2</SelectItem>
                    <SelectItem value="l3">L3</SelectItem>
                    <SelectItem value="m1">M1</SelectItem>
                    <SelectItem value="m2">M2</SelectItem>
                    <SelectItem value="doctorat">Doctorat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600">Nom complet</Label>
                <Input
                  placeholder="Ex: Abakar Youssouf"
                  className="h-9 text-sm"
                  value={formNom}
                  onChange={(e) => setFormNom(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600">Email</Label>
                <Input
                  type="email"
                  placeholder="candidat@email.com"
                  className="h-9 text-sm"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600">Téléphone</Label>
                <Input
                  type="tel"
                  placeholder="+235 66 XX XX XX"
                  className="h-9 text-sm"
                  value={formTelephone}
                  onChange={(e) => setFormTelephone(e.target.value)}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  className="flex-1 bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs h-9"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Envoi...' : 'Soumettre la candidature'}
                </Button>
                <Button
                  variant="outline"
                  className="text-xs h-9 border-[#d4a853] text-[#d4a853] hover:bg-[#d4a85312]"
                  onClick={() => setShowDocsDialog(true)}
                >
                  <Upload className="size-3.5 mr-1" />
                  Pièces
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Required Documents Checklist Card */}
          <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
          <Card>
            <div className="h-1 bg-gradient-to-r from-[#1a2744] to-[#2d7a4f]" />
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                <FileCheck className="size-4 text-[#d4a853]" />
                Pièces requises
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {docs.map((doc) => {
                const statusCfg = docStatusConfig[doc.status]
                const StatusIcon = statusCfg.icon
                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Checkbox
                        checked={doc.status === 'recu'}
                        onCheckedChange={(checked) => {
                          setDocs(prev => prev.map(d =>
                            d.id === doc.id
                              ? { ...d, status: checked ? 'recu' : 'manquant' }
                              : d
                          ))
                        }}
                        className="shrink-0"
                      />
                      <span className={`text-sm truncate ${doc.status === 'recu' ? 'line-through text-gray-400' : 'text-[#1a2744]'}`}>
                        {doc.label}
                      </span>
                    </div>
                    <Badge className={`text-[10px] px-2 py-0.5 ${statusCfg.className} border-0 shrink-0`}>
                      <StatusIcon className="size-3 mr-1" />
                      {statusCfg.label}
                    </Badge>
                  </div>
                )
              })}
              <div className="pt-2 flex items-center justify-between text-xs text-gray-400">
                <span>{docs.filter(d => d.status === 'recu').length}/{docs.length} documents reçus</span>
                <span>{docs.filter(d => d.status === 'manquant').length} manquant(s)</span>
              </div>
            </CardContent>
          </Card>
          </motion.div>
        </div>

        {/* Right Column - Table + Timeline + Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Applications Table */}
          <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
          <Card>
            <div className="h-1 bg-gradient-to-r from-[#1a2744] to-[#2d7a4f]" />
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <Users className="size-4 text-[#2d7a4f]" />
                  Liste des candidatures
                  <Badge variant="secondary" className="text-[10px] bg-gray-100 text-gray-500 ml-1">
                    {filteredCandidatures.length}
                  </Badge>
                </CardTitle>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-initial">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
                    <Input
                      placeholder="Rechercher..."
                      className="pl-8 h-8 text-xs w-full sm:w-[180px]"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-8 text-xs w-[150px]">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="en_attente">En attente</SelectItem>
                      <SelectItem value="en_examen">En examen</SelectItem>
                      <SelectItem value="admis">Admis</SelectItem>
                      <SelectItem value="refuse">Refusé</SelectItem>
                      <SelectItem value="en_attente_pieces">En attente de pièces</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-xs font-semibold w-[60px]">N°</TableHead>
                      <TableHead className="text-xs font-semibold">Candidat</TableHead>
                      <TableHead className="text-xs font-semibold hidden md:table-cell">Filière</TableHead>
                      <TableHead className="text-xs font-semibold hidden lg:table-cell">Niveau</TableHead>
                      <TableHead className="text-xs font-semibold hidden sm:table-cell">Date</TableHead>
                      <TableHead className="text-xs font-semibold">Statut</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCandidatures.map((c, cIdx) => (
                      <motion.tr
                        key={c.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: cIdx * 0.04, duration: 0.3, ease: 'easeOut' }}
                        className="hover:bg-gray-50/50">
                        <TableCell className="py-2">
                          <span className="text-xs font-mono text-gray-400">{c.numero}</span>
                        </TableCell>
                        <TableCell className="py-2">
                          <div>
                            <p className="text-sm font-medium text-[#1a2744]">{c.candidat}</p>
                            <p className="text-[10px] text-gray-400">{c.type}</p>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 hidden md:table-cell">
                          <span className="text-sm text-gray-600">{c.filiere}</span>
                        </TableCell>
                        <TableCell className="py-2 hidden lg:table-cell">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {c.niveau}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500 py-2 hidden sm:table-cell">
                          {c.date}
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge className={`text-[10px] hover:scale-105 transition-transform cursor-default ${statutConfig[c.statut].className}`}>
                            {statutConfig[c.statut].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right py-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MoreHorizontal className="size-3.5 text-gray-500" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem className="text-xs" onClick={() => handleStatusChange(c.id, 'en_examen')}>
                                <Eye className="size-3.5 mr-2 text-[#1a2744]" />
                                Examiner
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs" onClick={() => handleStatusChange(c.id, 'admis')}>
                                <CheckCircle className="size-3.5 mr-2 text-[#2d7a4f]" />
                                Valider
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs" onClick={() => handleStatusChange(c.id, 'refuse')}>
                                <XCircleIcon className="size-3.5 mr-2 text-[#c62828]" />
                                Refuser
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs" disabled={!c.email} asChild={Boolean(c.email)}>
                                {c.email ? (
                                  <a href={`mailto:${c.email}`}>
                                    <Mail className="size-3.5 mr-2 text-[#d4a853]" />
                                    Contacter
                                  </a>
                                ) : (
                                  <>
                                    <Mail className="size-3.5 mr-2 text-gray-300" />
                                    Contacter
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    ))}
                    {isLoading && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-sm text-gray-400">
                          Chargement...
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {!isLoading && filteredCandidatures.length === 0 && (
                <div className="py-10 text-center text-sm text-gray-400">
                  Aucune candidature trouvée
                </div>
              )}
            </CardContent>
          </Card>
          </motion.div>

          {/* Timeline + Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Admission Calendar/Timeline */}
            <Card>
              <div className="h-1 bg-gradient-to-r from-[#2d7a4f] to-[#3da66a]" />
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <CalendarDays className="size-4 text-[#2d7a4f]" />
                  Calendrier d&apos;admission
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-0">
                  {timelineEvents.map((event, idx) => (
                    <div key={idx} className="flex gap-3">
                      {/* Timeline line and dot */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-3 h-3 rounded-full shrink-0 mt-1 ${
                            event.status === 'done'
                              ? 'bg-[#2d7a4f]'
                              : event.status === 'current'
                              ? 'bg-[#d4a853] ring-2 ring-[#d4a85330]'
                              : 'bg-gray-200'
                          }`}
                        />
                        {idx < timelineEvents.length - 1 && (
                          <div
                            className={`w-0.5 h-10 ${
                              event.status === 'done' ? 'bg-[#2d7a4f]' : 'bg-gray-200'
                            }`}
                          />
                        )}
                      </div>
                      {/* Event content */}
                      <div className="pb-4 min-w-0">
                        <p className={`text-sm font-medium ${
                          event.status === 'done'
                            ? 'text-[#2d7a4f]'
                            : event.status === 'current'
                            ? 'text-[#d4a853]'
                            : 'text-gray-400'
                        }`}>
                          {event.label}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{event.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Admission Statistics */}
            <Card>
              <div className="h-1 bg-gradient-to-r from-[#d4a853] to-[#e6c477]" />
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <GraduationCap className="size-4 text-[#d4a853]" />
                  Statistiques d&apos;admission
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Bar Chart - Applications per program */}
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-3">Candidatures par filière</p>
                  <div className="space-y-2">
                    {programStats.map((program) => (
                      <div key={program.name} className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 w-[70px] truncate shrink-0">
                          {program.name}
                        </span>
                        <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${(program.count / maxProgramCount) * 100}%`,
                              backgroundColor: program.color,
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-medium text-gray-600 w-6 text-right shrink-0">
                          {program.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Donut Chart - Admission Rate */}
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-3">Taux d&apos;admission</p>
                  <div className="flex items-center gap-4">
                    {/* CSS Donut Chart */}
                    <div className="relative w-24 h-24 shrink-0">
                      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                        <circle
                          cx="18"
                          cy="18"
                          r="15.91549430918954"
                          fill="transparent"
                          stroke="#e5e7eb"
                          strokeWidth="3"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="15.91549430918954"
                          fill="transparent"
                          stroke="#2d7a4f"
                          strokeWidth="3"
                          strokeDasharray={`${admissionRate} ${100 - admissionRate}`}
                          strokeDashoffset="0"
                          strokeLinecap="round"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="15.91549430918954"
                          fill="transparent"
                          stroke="#c62828"
                          strokeWidth="3"
                          strokeDasharray={`${refusalRate} ${100 - refusalRate}`}
                          strokeDashoffset={`-${admissionRate}`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-bold text-[#1a2744]">{admissionRate}%</span>
                      </div>
                    </div>
                    {/* Legend */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#2d7a4f] shrink-0" />
                        <span className="text-xs text-gray-600">Admis ({admissionRate}%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#c62828] shrink-0" />
                        <span className="text-xs text-gray-600">Refusés ({refusalRate}%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-gray-200 shrink-0" />
                        <span className="text-xs text-gray-600">En cours ({pendingRate}%)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* New Candidature Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-[#1a2744]">Nouvelle candidature</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm">Type de candidature</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="premiere_inscription">Première inscription</SelectItem>
                  <SelectItem value="reinscription">Réinscription</SelectItem>
                  <SelectItem value="transfert">Transfert</SelectItem>
                  <SelectItem value="equivalence">Équivalence</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Filière souhaitée</Label>
                <Select value={formProgramId} onValueChange={setFormProgramId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filière" />
                  </SelectTrigger>
                  <SelectContent>
                    {realPrograms.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Niveau</Label>
                <Select value={formNiveau} onValueChange={setFormNiveau}>
                  <SelectTrigger>
                    <SelectValue placeholder="Niveau" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="l1">L1</SelectItem>
                    <SelectItem value="l2">L2</SelectItem>
                    <SelectItem value="l3">L3</SelectItem>
                    <SelectItem value="m1">M1</SelectItem>
                    <SelectItem value="m2">M2</SelectItem>
                    <SelectItem value="doctorat">Doctorat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Nom complet</Label>
              <Input
                placeholder="Ex: Abakar Youssouf"
                value={formNom}
                onChange={(e) => setFormNom(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Email</Label>
                <Input
                  type="email"
                  placeholder="candidat@email.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Téléphone</Label>
                <Input
                  type="tel"
                  placeholder="+235 66 XX XX XX"
                  value={formTelephone}
                  onChange={(e) => setFormTelephone(e.target.value)}
                />
              </div>
            </div>
            <Button
              className="w-full bg-[#2d7a4f] hover:bg-[#236b40] text-white"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Envoi...' : 'Soumettre la candidature'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Required Documents Dialog */}
      <Dialog open={showDocsDialog} onOpenChange={setShowDocsDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-[#1a2744]">Pièces requises pour la candidature</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {docs.map((doc) => {
              const statusCfg = docStatusConfig[doc.status]
              const StatusIcon = statusCfg.icon
              return (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={doc.status === 'recu'}
                      onCheckedChange={(checked) => {
                        setDocs(prev => prev.map(d =>
                          d.id === doc.id
                            ? { ...d, status: checked ? 'recu' : 'manquant' }
                            : d
                        ))
                      }}
                    />
                    <span className="text-sm text-[#1a2744]">{doc.label}</span>
                  </div>
                  <Badge className={`text-[10px] px-2 py-0.5 ${statusCfg.className} border-0`}>
                    <StatusIcon className="size-3 mr-1" />
                    {statusCfg.label}
                  </Badge>
                </div>
              )
            })}
            <div className="pt-2">
              <Button
                className="w-full bg-[#2d7a4f] hover:bg-[#236b40] text-white text-sm"
                onClick={() => setShowDocsDialog(false)}
              >
                Fermer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}


