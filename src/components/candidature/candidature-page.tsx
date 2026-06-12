'use client'

import { useState, useEffect, useRef } from 'react'
import { exportToExcel } from '@/lib/export'
import { toast } from 'sonner'
import { exportToExcel } from '@/lib/export'
import { motion } from 'framer-motion'
import { exportToExcel } from '@/lib/export'
import { toast } from 'sonner'
import { exportToExcel } from '@/lib/export'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { exportToExcel } from '@/lib/export'
import { toast } from 'sonner'
import { exportToExcel } from '@/lib/export'
import { Button } from '@/components/ui/button'
import { exportToExcel } from '@/lib/export'
import { toast } from 'sonner'
import { exportToExcel } from '@/lib/export'
import { Input } from '@/components/ui/input'
import { exportToExcel } from '@/lib/export'
import { toast } from 'sonner'
import { exportToExcel } from '@/lib/export'
import { Label } from '@/components/ui/label'
import { exportToExcel } from '@/lib/export'
import { toast } from 'sonner'
import { exportToExcel } from '@/lib/export'
import { Badge } from '@/components/ui/badge'
import { exportToExcel } from '@/lib/export'
import { toast } from 'sonner'
import { exportToExcel } from '@/lib/export'
import { Checkbox } from '@/components/ui/checkbox'
import { exportToExcel } from '@/lib/export'
import { toast } from 'sonner'
import { exportToExcel } from '@/lib/export'
import { Separator } from '@/components/ui/separator'
import { exportToExcel } from '@/lib/export'
import { toast } from 'sonner'
import { exportToExcel } from '@/lib/export'
import {
import { exportToExcel } from '@/lib/export'
import { toast } from 'sonner'
import { exportToExcel } from '@/lib/export'
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
import { exportToExcel } from '@/lib/export'
import { toast } from 'sonner'
import { exportToExcel } from '@/lib/export'
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
import { exportToExcel } from '@/lib/export'
import { toast } from 'sonner'
import { exportToExcel } from '@/lib/export'
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
import { exportToExcel } from '@/lib/export'
import { toast } from 'sonner'
import { exportToExcel } from '@/lib/export'
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
import { exportToExcel } from '@/lib/export'
import { toast } from 'sonner'
import { exportToExcel } from '@/lib/export'
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

// â”€â”€â”€ Demo Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

const demoCandidatures: Candidature[] = [
  { id: '1', numero: 'CND-2025-001', candidat: 'Abakar Youssouf', filiere: 'Informatique', niveau: 'L1', date: '15/01/2025', statut: 'en_examen', email: 'abakar.y@email.com', telephone: '+235 66 12 34 56', type: 'Premiere inscription' },
  { id: '2', numero: 'CND-2025-002', candidat: 'Hassan Fatime', filiere: 'Droit', niveau: 'L2', date: '16/01/2025', statut: 'admis', email: 'hassan.f@email.com', telephone: '+235 66 23 45 67', type: 'Reinscription' },
  { id: '3', numero: 'CND-2025-003', candidat: 'Adam Brahim Mahamat', filiere: 'Economie', niveau: 'L3', date: '17/01/2025', statut: 'en_attente', email: 'adam.b@email.com', telephone: '+235 66 34 56 78', type: 'Premiere inscription' },
  { id: '4', numero: 'CND-2025-004', candidat: 'Djibrine Amina', filiere: 'Medecine', niveau: 'L1', date: '18/01/2025', statut: 'refuse', email: 'djibrine.a@email.com', telephone: '+235 66 45 67 89', type: 'Premiere inscription' },
  { id: '5', numero: 'CND-2025-005', candidat: 'Hissein Mariam', filiere: 'Informatique', niveau: 'M1', date: '19/01/2025', statut: 'en_examen', email: 'hissein.m@email.com', telephone: '+235 66 56 78 90', type: 'Transfert' },
  { id: '6', numero: 'CND-2025-006', candidat: 'Mahamat Nour', filiere: 'Lettres', niveau: 'L2', date: '20/01/2025', statut: 'en_attente_pieces', email: 'mahamat.n@email.com', telephone: '+235 66 67 89 01', type: 'Premiere inscription' },
  { id: '7', numero: 'CND-2025-007', candidat: 'Ngarndmi Halime', filiere: 'Gestion', niveau: 'L3', date: '21/01/2025', statut: 'admis', email: 'ngarndmi.h@email.com', telephone: '+235 66 78 90 12', type: 'Reinscription' },
  { id: '8', numero: 'CND-2025-008', candidat: 'Saleh Hassana', filiere: 'Informatique', niveau: 'L1', date: '22/01/2025', statut: 'en_attente', email: 'saleh.h@email.com', telephone: '+235 66 89 01 23', type: 'Premiere inscription' },
  { id: '9', numero: 'CND-2025-009', candidat: 'Bichara Hawa', filiere: 'Droit', niveau: 'M2', date: '23/01/2025', statut: 'en_examen', email: 'bichara.h@email.com', telephone: '+235 66 90 12 34', type: 'Equivalence' },
  { id: '10', numero: 'CND-2025-010', candidat: 'Adoum Khadija', filiere: 'Economie', niveau: 'L1', date: '24/01/2025', statut: 'admis', email: 'adoum.k@email.com', telephone: '+235 66 01 23 45', type: 'Premiere inscription' },
  { id: '11', numero: 'CND-2025-011', candidat: 'Ibrahim Seid', filiere: 'Medecine', niveau: 'L2', date: '25/01/2025', statut: 'en_attente_pieces', email: 'ibrahim.s@email.com', telephone: '+235 66 12 23 34', type: 'Transfert' },
  { id: '12', numero: 'CND-2025-012', candidat: 'Zara Oumar', filiere: 'Gestion', niveau: 'M1', date: '26/01/2025', statut: 'refuse', email: 'zara.o@email.com', telephone: '+235 66 23 34 45', type: 'Premiere inscription' },
  { id: '13', numero: 'CND-2025-013', candidat: 'Yaya Djibril', filiere: 'Lettres', niveau: 'Doctorat', date: '27/01/2025', statut: 'en_examen', email: 'yaya.d@email.com', telephone: '+235 66 34 45 56', type: 'Premiere inscription' },
  { id: '14', numero: 'CND-2025-014', candidat: 'Falmata Ali', filiere: 'Informatique', niveau: 'L3', date: '28/01/2025', statut: 'admis', email: 'falmata.a@email.com', telephone: '+235 66 45 56 67', type: 'Reinscription' },
  { id: '15', numero: 'CND-2025-015', candidat: 'Moussa Abdallah', filiere: 'Droit', niveau: 'L1', date: '29/01/2025', statut: 'en_attente', email: 'moussa.a@email.com', telephone: '+235 66 56 67 78', type: 'Premiere inscription' },
  { id: '16', numero: 'CND-2025-016', candidat: 'Kaltouma Mahamat', filiere: 'Economie', niveau: 'M2', date: '30/01/2025', statut: 'en_attente_pieces', email: 'kaltouma.m@email.com', telephone: '+235 66 67 78 89', type: 'Equivalence' },
  { id: '17', numero: 'CND-2025-017', candidat: 'Ousmane DjimÃ©', filiere: 'Gestion', niveau: 'L2', date: '31/01/2025', statut: 'admis', email: 'ousmane.d@email.com', telephone: '+235 66 78 89 90', type: 'Premiere inscription' },
]

interface RequiredDoc {
  id: string
  label: string
  status: 'recu' | 'manquant' | 'en_verification'
}

const defaultDocs: RequiredDoc[] = [
  { id: 'diplome', label: 'DiplÃ´me / BaccalaurÃ©at', status: 'recu' },
  { id: 'releve', label: 'RelevÃ© de notes', status: 'en_verification' },
  { id: 'photo', label: "Photo d'identitÃ©", status: 'recu' },
  { id: 'naissance', label: "Extrait d'acte de naissance", status: 'manquant' },
  { id: 'lettre', label: 'Lettre de motivation', status: 'recu' },
  { id: 'cv', label: 'Curriculum vitae', status: 'manquant' },
]

const statutConfig: Record<CandidatureStatut, { label: string; className: string }> = {
  en_attente: { label: 'En attente', className: 'bg-[#d4a85318] text-[#d4a853] border-0' },
  en_examen: { label: 'En examen', className: 'bg-[#1a274418] text-[#1a2744] border-0' },
  admis: { label: 'Admis', className: 'bg-[#2d7a4f18] text-[#2d7a4f] border-0' },
  refuse: { label: 'RefusÃ©', className: 'bg-[#c6282818] text-[#c62828] border-0' },
  en_attente_pieces: { label: 'En attente de piÃ¨ces', className: 'bg-[#e6510018] text-[#e65100] border-0' },
}

const docStatusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  recu: { label: 'ReÃ§u', className: 'text-[#2d7a4f] bg-[#2d7a4f12]', icon: CheckCircle2 },
  manquant: { label: 'Manquant', className: 'text-[#c62828] bg-[#c6282812]', icon: XCircle },
  en_verification: { label: 'En vÃ©rification', className: 'text-[#d4a853] bg-[#d4a85312]', icon: Clock },
}

const filieres = [
  'Informatique',
  'Droit',
  'Economie',
  'Medecine',
  'Gestion',
  'Lettres',
  'Sciences',
  'Agronomie',
]

const timelineEvents = [
  { label: 'Ouverture des candidatures', date: '15 Jan 2025', status: 'done' as const },
  { label: 'Date limite de soumission', date: '31 Mars 2025', status: 'current' as const },
  { label: 'DÃ©libÃ©ration', date: '15 Avril 2025', status: 'upcoming' as const },
  { label: "Affichage des rÃ©sultats", date: '25 Avril 2025', status: 'upcoming' as const },
  { label: 'RentrÃ©e acadÃ©mique', date: '15 Septembre 2025', status: 'upcoming' as const },
]

const programStats = [
  { name: 'Informatique', count: 42, color: '#2d7a4f' },
  { name: 'Droit', count: 35, color: '#1a2744' },
  { name: 'Economie', count: 28, color: '#d4a853' },
  { name: 'Medecine', count: 22, color: '#e65100' },
  { name: 'Gestion', count: 31, color: '#2d7a4f' },
  { name: 'Lettres', count: 18, color: '#1a2744' },
  { name: 'Sciences', count: 25, color: '#d4a853' },
  { name: 'Agronomie', count: 15, color: '#e65100' },
]

// â”€â”€â”€ useCountUp Hook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function CandidaturePage() {
  const candidaturesMoisCount = useCountUp(127, 1400)
  const tauxAdmissionCount = useCountUp(68, 1300)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [showDocsDialog, setShowDocsDialog] = useState(false)
  const [formType, setFormType] = useState('')
  const [formFiliere, setFormFiliere] = useState('')
  const [formNiveau, setFormNiveau] = useState('')
  const [formNom, setFormNom] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formTelephone, setFormTelephone] = useState('')
  const [docs, setDocs] = useState<RequiredDoc[]>(defaultDocs)

  // Stats
  const totalRecues = demoCandidatures.length
  const enExamen = demoCandidatures.filter(c => c.statut === 'en_examen').length
  const admis = demoCandidatures.filter(c => c.statut === 'admis').length
  const refuses = demoCandidatures.filter(c => c.statut === 'refuse').length

  // Filtered candidatures
  const filteredCandidatures = demoCandidatures.filter(c => {
    const matchSearch = search === '' ||
      c.candidat.toLowerCase().includes(search.toLowerCase()) ||
      c.numero.toLowerCase().includes(search.toLowerCase()) ||
      c.filiere.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || c.statut === statusFilter
    return matchSearch && matchStatus
  })

  // Chart calculations
  const maxProgramCount = Math.max(...programStats.map(p => p.count))
  const admissionRate = Math.round((admis / totalRecues) * 100)
  const refusalRate = Math.round((refuses / totalRecues) * 100)
  const pendingRate = 100 - admissionRate - refusalRate

  const handleSubmit = () => {
    setShowForm(false)
    setFormType('')
    setFormFiliere('')
    setFormNiveau('')
    setFormNom('')
    setFormEmail('')
    setFormTelephone('')
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
               onClick={() => exportToExcel(filteredCandidatures, 'export_candidature')}>
                <Download className="size-3.5 mr-1.5" />
                Exporter
              </Button>
              <Button
                size="sm"
                className="bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 text-white text-xs"
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
              <div className="text-white text-2xl font-bold">{candidaturesMoisCount}</div>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }} className="bg-white/10 backdrop-blur border border-white/15 rounded-lg px-4 py-3">
              <div className="text-white/60 text-xs">Taux d&apos;admission</div>
              <div className="text-white text-2xl font-bold">{tauxAdmissionCount}%</div>
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
                <p className="text-xs font-medium text-gray-500 uppercase">Candidatures reÃ§ues</p>
                <p className="text-2xl font-bold text-[#1a2744] mt-1">{totalRecues}</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="size-3 text-[#2d7a4f]" />
                  <span className="text-xs text-[#2d7a4f] font-medium">+12%</span>
                  <span className="text-xs text-gray-400">vs mois dernier</span>
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
                  <ArrowUpRight className="size-3 text-[#d4a853]" />
                  <span className="text-xs text-[#d4a853] font-medium">+5%</span>
                  <span className="text-xs text-gray-400">vs mois dernier</span>
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
                  <ArrowUpRight className="size-3 text-[#2d7a4f]" />
                  <span className="text-xs text-[#2d7a4f] font-medium">+8%</span>
                  <span className="text-xs text-gray-400">vs mois dernier</span>
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
                  <ArrowDownRight className="size-3 text-[#c62828]" />
                  <span className="text-xs text-[#c62828] font-medium">-3%</span>
                  <span className="text-xs text-gray-400">vs mois dernier</span>
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
                    <SelectValue placeholder="SÃ©lectionner le type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="premiere_inscription">PremiÃ¨re inscription</SelectItem>
                    <SelectItem value="reinscription">RÃ©inscription</SelectItem>
                    <SelectItem value="transfert">Transfert</SelectItem>
                    <SelectItem value="equivalence">Ã‰quivalence</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600">FiliÃ¨re souhaitÃ©e</Label>
                <Select value={formFiliere} onValueChange={setFormFiliere}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="SÃ©lectionner la filiÃ¨re" />
                  </SelectTrigger>
                  <SelectContent>
                    {filieres.map((f) => (
                      <SelectItem key={f} value={f.toLowerCase()}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600">Niveau</Label>
                <Select value={formNiveau} onValueChange={setFormNiveau}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="SÃ©lectionner le niveau" />
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
                <Label className="text-xs font-medium text-gray-600">TÃ©lÃ©phone</Label>
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
                >
                  Soumettre la candidature
                </Button>
                <Button
                  variant="outline"
                  className="text-xs h-9 border-[#d4a853] text-[#d4a853] hover:bg-[#d4a85312]"
                  onClick={() => setShowDocsDialog(true)}
                >
                  <Upload className="size-3.5 mr-1" />
                  PiÃ¨ces
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
                PiÃ¨ces requises
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
                <span>{docs.filter(d => d.status === 'recu').length}/{docs.length} documents reÃ§us</span>
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
                      <SelectItem value="refuse">RefusÃ©</SelectItem>
                      <SelectItem value="en_attente_pieces">En attente de piÃ¨ces</SelectItem>
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
                      <TableHead className="text-xs font-semibold w-[60px]">NÂ°</TableHead>
                      <TableHead className="text-xs font-semibold">Candidat</TableHead>
                      <TableHead className="text-xs font-semibold hidden md:table-cell">FiliÃ¨re</TableHead>
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
                              <DropdownMenuItem className="text-xs">
                                <Eye className="size-3.5 mr-2 text-[#1a2744]" />
                                Examiner
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs">
                                <CheckCircle className="size-3.5 mr-2 text-[#2d7a4f]" />
                                Valider
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs">
                                <XCircleIcon className="size-3.5 mr-2 text-[#c62828]" />
                                Refuser
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs">
                                <Mail className="size-3.5 mr-2 text-[#d4a853]" />
                                Contacter
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {filteredCandidatures.length === 0 && (
                <div className="py-10 text-center text-sm text-gray-400">
                  Aucune candidature trouvÃ©e
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
                  <p className="text-xs font-medium text-gray-500 mb-3">Candidatures par filiÃ¨re</p>
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
                        <span className="text-xs text-gray-600">RefusÃ©s ({refusalRate}%)</span>
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
                  <SelectValue placeholder="SÃ©lectionner le type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="premiere_inscription">PremiÃ¨re inscription</SelectItem>
                  <SelectItem value="reinscription">RÃ©inscription</SelectItem>
                  <SelectItem value="transfert">Transfert</SelectItem>
                  <SelectItem value="equivalence">Ã‰quivalence</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">FiliÃ¨re souhaitÃ©e</Label>
                <Select value={formFiliere} onValueChange={setFormFiliere}>
                  <SelectTrigger>
                    <SelectValue placeholder="FiliÃ¨re" />
                  </SelectTrigger>
                  <SelectContent>
                    {filieres.map((f) => (
                      <SelectItem key={f} value={f.toLowerCase()}>{f}</SelectItem>
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
                <Label className="text-sm">TÃ©lÃ©phone</Label>
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
            >
              Soumettre la candidature
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Required Documents Dialog */}
      <Dialog open={showDocsDialog} onOpenChange={setShowDocsDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-[#1a2744]">PiÃ¨ces requises pour la candidature</DialogTitle>
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


