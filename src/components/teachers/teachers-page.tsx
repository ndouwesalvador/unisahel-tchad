'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Eye,
  FileText,
  GraduationCap,
  Clock,
  Briefcase,
  TrendingUp,
  UserCheck,
  Award,
  Mail,
  Building2,
  Copy,
  Upload,
  FileSpreadsheet,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { useTeachers, useStructure } from '@/lib/api-hooks'
import { exportToExcel } from '@/lib/export'
import { exportListToPDF } from '@/lib/pdf-list'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

const gradeUiToApi: Record<string, string> = {
  Professeur: 'PROFESSEUR_TITULAIRE',
  MCF: 'MAITRE_CONFERENCES',
  MA: 'MAITRE_ASSISTANT',
  Assistant: 'ASSISTANT',
  Vacataire: 'VACATAIRE',
}

interface NewTeacherForm {
  firstName: string
  lastName: string
  email: string
  phone: string
  employeeId: string
  grade: string
  specialization: string
  departmentId: string
  maxHoursPerWeek: string
}

const emptyNewTeacherForm: NewTeacherForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  employeeId: '',
  grade: '',
  specialization: '',
  departmentId: '',
  maxHoursPerWeek: '20',
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

// ─── Types & Config ────────────────────────────────────────────────────────────

type GradeType = 'Professeur' | 'MCF' | 'MA' | 'Assistant' | 'Vacataire' | 'Professionnel'
type StatutType = 'Actif' | 'Conge' | 'Retraite'

interface Teacher {
  id: string
  matricule: string
  nom: string
  prenom: string
  grade: GradeType
  departement: string
  specialisation: string
  heuresSem: number
  statut: StatutType
  telephone?: string
  email?: string
}

const gradeConfig: Record<GradeType, { label: string; className: string }> = {
  'Professeur': { label: 'Professeur', className: 'bg-[#1a274415] text-[#1a2744] border-0' },
  'MCF': { label: 'MCF', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' },
  'MA': { label: 'MA', className: 'bg-[#d4a85315] text-[#d4a853] border-0' },
  'Assistant': { label: 'Ass.', className: 'bg-[#8b5cf615] text-[#8b5cf6] border-0' },
  'Vacataire': { label: 'Vac.', className: 'bg-[#ea580c15] text-[#ea580c] border-0' },
  'Professionnel': { label: 'Pro.', className: 'bg-[#6b728015] text-[#6b7280] border-0' },
}

const statutConfig: Record<StatutType, { label: string; className: string; dotColor: string }> = {
  'Actif': { label: 'Actif', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0', dotColor: '#2d7a4f' },
  'Conge': { label: 'En conge', className: 'bg-[#d4a85315] text-[#d4a853] border-0', dotColor: '#d4a853' },
  'Retraite': { label: 'Retraite', className: 'bg-[#6b728015] text-[#6b7280] border-0', dotColor: '#6b7280' },
}

const gradeFullNames: Record<GradeType, string> = {
  'Professeur': 'Professeur',
  'MCF': 'Maitre de Conferences',
  'MA': 'Maitre-Assistant',
  'Assistant': 'Assistant',
  'Vacataire': 'Vacataire',
  'Professionnel': 'Professionnel',
}

const gradeApiToUi: Record<string, GradeType> = {
  PROFESSEUR_TITULAIRE: 'Professeur',
  MAITRE_CONFERENCES: 'MCF',
  MAITRE_ASSISTANT: 'MA',
  ASSISTANT: 'Assistant',
  VACATAIRE: 'Vacataire',
}

function mapTeacher(t: any): Teacher {
  return {
    id: t.id,
    matricule: t.employeeId || 'N/A',
    nom: t.user?.lastName || '',
    prenom: t.user?.firstName || '',
    grade: gradeApiToUi[t.grade as string] || 'Professionnel',
    departement: t.department?.name || 'Non affecte',
    specialisation: t.specialization || '',
    heuresSem: t.currentHours ?? t.maxHoursPerWeek ?? 0,
    statut: t.isActive ? 'Actif' : 'Retraite',
    telephone: t.user?.phone || undefined,
    email: t.user?.email || undefined,
  }
}

const grades = ['Tous', 'Professeur', 'MCF', 'MA', 'Assistant', 'Vacataire', 'Professionnel']

// ─── Component ────────────────────────────────────────────────────────────────

export function TeachersPage() {
  const { selectTeacher, setView } = useAppStore()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('Tous')
  const [filterGrade, setFilterGrade] = useState('Tous')
  const [showNewTeacher, setShowNewTeacher] = useState(false)
  const [newTeacherForm, setNewTeacherForm] = useState<NewTeacherForm>(emptyNewTeacherForm)
  const [isCreating, setIsCreating] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; tempPassword: string; name: string } | null>(null)

  const { data: teachersQuery, isLoading } = useTeachers({ limit: 1000 })
  const teachers: Teacher[] = (teachersQuery?.data || []).map(mapTeacher)

  const { data: structureQuery } = useStructure() as { data: { faculties: Array<{ departments: Array<{ id: string; name: string }> }> } | undefined }
  const realDepartments = (structureQuery?.faculties || []).flatMap((f) => f.departments)

  const departements = ['Tous', ...Array.from(new Set(teachers.map(t => t.departement))).sort()]

  const handleCreateTeacher = async () => {
    const f = newTeacherForm
    if (!f.firstName || !f.lastName || !f.email || !f.grade || !f.departmentId) {
      toast.error('Champs requis', { description: 'Nom, prenom, email, grade et departement sont obligatoires' })
      return
    }
    setIsCreating(true)
    try {
      const res = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: f.firstName,
          lastName: f.lastName,
          email: f.email,
          phone: f.phone || undefined,
          employeeId: f.employeeId || undefined, // auto-generated server-side if empty
          grade: gradeUiToApi[f.grade],
          specialization: f.specialization,
          departmentId: f.departmentId,
          maxHoursPerWeek: Number(f.maxHoursPerWeek) || 20,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Echec de la creation')
      toast.success('Enseignant ajoute', { description: `${f.firstName} ${f.lastName}` })
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
      setShowNewTeacher(false)
      setCreatedCredentials({ email: json.data.user.email, tempPassword: json.data.tempPassword, name: `${f.firstName} ${f.lastName}` })
      setNewTeacherForm(emptyNewTeacherForm)
    } catch (error) {
      toast.error('Erreur', { description: error instanceof Error ? error.message : 'Echec de la creation' })
    } finally {
      setIsCreating(false)
    }
  }

  const copyPassword = () => {
    if (!createdCredentials) return
    navigator.clipboard.writeText(createdCredentials.tempPassword).then(
      () => toast.success('Mot de passe copie'),
      () => toast.error('Copie impossible')
    )
  }

  const handleExportExcel = () => {
    exportToExcel(
      filteredTeachers.map((t) => ({
        Matricule: t.matricule, Nom: t.nom, Prenom: t.prenom, Grade: gradeFullNames[t.grade] || t.grade,
        Departement: t.departement, Specialisation: t.specialisation, Statut: t.statut,
        Email: t.email || '', Telephone: t.telephone || '',
      })),
      'annuaire_enseignants',
    )
  }

  const handleExportPDF = () => {
    exportListToPDF(
      'annuaire_enseignants',
      'Annuaire des enseignants',
      `${filteredTeachers.length} enseignant(s)`,
      [
        { header: 'Matricule', width: 0.18, value: (t: Teacher) => t.matricule },
        { header: 'Nom', width: 0.15, value: (t: Teacher) => t.nom },
        { header: 'Prenom', width: 0.15, value: (t: Teacher) => t.prenom },
        { header: 'Grade', width: 0.16, value: (t: Teacher) => gradeFullNames[t.grade] || t.grade },
        { header: 'Departement', width: 0.2, value: (t: Teacher) => t.departement },
        { header: 'Email', width: 0.16, value: (t: Teacher) => t.email || '' },
      ],
      filteredTeachers,
    )
  }

  const totalEnseignants = teachers.filter(t => t.statut === 'Actif').length
  const totalHeures = teachers.reduce((acc, t) => acc + t.heuresSem, 0)
  const gradeBreakdown = {
    'Professeur': teachers.filter(t => t.grade === 'Professeur').length,
    'MCF': teachers.filter(t => t.grade === 'MCF').length,
    'MA': teachers.filter(t => t.grade === 'MA').length,
    'Assistant': teachers.filter(t => t.grade === 'Assistant').length,
    'Vacataire': teachers.filter(t => t.grade === 'Vacataire').length,
    'Professionnel': teachers.filter(t => t.grade === 'Professionnel').length,
  }

  // Count-up stats
  const countTotal = useCountUp(totalEnseignants, 1400)
  const countProfs = useCountUp(gradeBreakdown['Professeur'], 1200)
  const countHeures = useCountUp(totalHeures, 1300)
  const countVac = useCountUp(gradeBreakdown['Vacataire'], 1000)

  const filteredTeachers = teachers.filter(t => {
    const matchSearch = search === '' ||
      `${t.nom} ${t.prenom}`.toLowerCase().includes(search.toLowerCase()) ||
      t.matricule.toLowerCase().includes(search.toLowerCase()) ||
      t.specialisation.toLowerCase().includes(search.toLowerCase())
    const matchDept = filterDept === 'Tous' || t.departement === filterDept
    const matchGrade = filterGrade === 'Tous' || t.grade === filterGrade
    return matchSearch && matchDept && matchGrade
  })

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
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
      {/* ─── Gradient Header Banner ─────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="relative overflow-hidden rounded-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a2744] via-[#1f3050] to-[#2d7a4f]" />
        <svg className="absolute inset-0 w-full h-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="teachers-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#teachers-grid)" />
        </svg>
        <div className="relative z-10 px-6 py-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Gestion des enseignants</h1>
              <p className="text-sm text-white/70 mt-1">Suivi du corps enseignant et de leurs affectations</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/10"><Users className="size-5 text-white" /></div>
                <div>
                  <p className="text-xl font-bold text-white">{countTotal}</p>
                  <p className="text-[10px] text-white/70">Enseignants actifs</p>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/10"><GraduationCap className="size-5 text-white" /></div>
                <div>
                  <p className="text-xl font-bold text-white">{countProfs}</p>
                  <p className="text-[10px] text-white/70">Professeurs</p>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/10"><Clock className="size-5 text-white" /></div>
                <div>
                  <p className="text-xl font-bold text-white">{countHeures}h</p>
                  <p className="text-[10px] text-white/70">Heures/semaine</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── 4 Stats Cards ──────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
          <Card className="overflow-hidden border-l-4 border-l-[#1a2744]">
            <div className="h-1 bg-gradient-to-r from-[#1a2744] to-[#2d4a6f]" />
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total enseignants</p>
                  <p className="text-xl font-bold text-[#1a2744] mt-1">{countTotal}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="size-3 text-[#2d7a4f]" />
                    <span className="text-[10px] text-[#2d7a4f] font-medium">+2 ce semestre</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#1a274415] flex items-center justify-center">
                  <Users className="size-5 text-[#1a2744]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
          <Card className="overflow-hidden border-l-4 border-l-[#2d7a4f]">
            <div className="h-1 bg-gradient-to-r from-[#2d7a4f] to-[#3da66a]" />
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Professeurs</p>
                  <p className="text-xl font-bold text-[#2d7a4f] mt-1">{countProfs}</p>
                  <p className="text-[10px] text-gray-400 mt-1">titulaires</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#2d7a4f15] flex items-center justify-center">
                  <GraduationCap className="size-5 text-[#2d7a4f]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
          <Card className="overflow-hidden border-l-4 border-l-[#d4a853]">
            <div className="h-1 bg-gradient-to-r from-[#d4a853] to-[#e6c477]" />
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Heures/semaine</p>
                  <p className="text-xl font-bold text-[#d4a853] mt-1">{countHeures}h</p>
                  <p className="text-[10px] text-gray-400 mt-1">volume total</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#d4a85315] flex items-center justify-center">
                  <Clock className="size-5 text-[#d4a853]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
          <Card className="overflow-hidden border-l-4 border-l-[#ea580c]">
            <div className="h-1 bg-gradient-to-r from-[#ea580c] to-[#f97316]" />
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Vacataires</p>
                  <p className="text-xl font-bold text-[#ea580c] mt-1">{countVac}</p>
                  <p className="text-[10px] text-gray-400 mt-1">contractuels</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#ea580c15] flex items-center justify-center">
                  <Briefcase className="size-5 text-[#ea580c]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* ─── Grade Breakdown Card ──────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="border-l-4 border-l-[#1a2744]">
          <div className="h-1 bg-gradient-to-r from-[#1a2744] via-[#2d7a4f] to-[#d4a853]" />
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Repartition par grade</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(gradeBreakdown).map(([grade, count]) => {
                const config = gradeConfig[grade as GradeType]
                if (!config) return null
                return (
                  <motion.div
                    key={grade}
                    whileHover={{ scale: 1.05 }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100"
                  >
                    <Badge className={`text-[10px] ${config.className}`}>
                      {config.label}
                    </Badge>
                    <span className="text-sm font-semibold text-[#1a2744]">{count}</span>
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Search & Filters ──────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="border-l-4 border-l-[#2d7a4f]">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par nom, matricule, specialisation..."
                  className="pl-9 h-9 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={filterDept} onValueChange={setFilterDept}>
                <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm">
                  <SelectValue placeholder="Departement" />
                </SelectTrigger>
                <SelectContent>
                  {departements.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterGrade} onValueChange={setFilterGrade}>
                <SelectTrigger className="w-full sm:w-[200px] h-9 text-sm">
                  <SelectValue placeholder="Grade" />
                </SelectTrigger>
                <SelectContent>
                  {grades.map(g => (
                    <SelectItem key={g} value={g}>{g === 'MCF' ? 'Maitre de Conferences' : g === 'MA' ? 'Maitre-Assistant' : g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" className="text-xs h-9 border-[#1a274430] text-[#1a2744] hover:bg-[#1a274408]" onClick={() => setView('import-export')}>
                  <Upload className="size-3.5 mr-1.5" />
                  Importer
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-9 border-[#1a274430] text-[#1a2744] hover:bg-[#1a274408]" onClick={handleExportExcel}>
                  <FileSpreadsheet className="size-3.5 mr-1.5" />
                  Excel
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-9 border-[#1a274430] text-[#1a2744] hover:bg-[#1a274408]" onClick={handleExportPDF}>
                  <FileText className="size-3.5 mr-1.5" />
                  PDF
                </Button>
                <Button size="sm" className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs h-9" onClick={() => setShowNewTeacher(true)}>
                  <Plus className="size-3.5 mr-1.5" />
                  Nouvel enseignant
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Teachers Table ────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card style={{ borderTop: '3px solid #2d7a4f' }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-[#1a2744]">Repertoire des enseignants</CardTitle>
              <Badge className="text-[10px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">{filteredTeachers.length} resultats</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-96">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-xs font-semibold">Matricule</TableHead>
                      <TableHead className="text-xs font-semibold">Enseignant</TableHead>
                      <TableHead className="text-xs font-semibold">Grade</TableHead>
                      <TableHead className="text-xs font-semibold">Departement</TableHead>
                      <TableHead className="text-xs font-semibold">Specialisation</TableHead>
                      <TableHead className="text-xs font-semibold text-center">H/sem</TableHead>
                      <TableHead className="text-xs font-semibold">Statut</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTeachers.map((teacher, idx) => {
                      const sConfig = statutConfig[teacher.statut]
                      return (
                        <motion.tr
                          key={teacher.id}
                          className={`hover:bg-[#2d7a4f05] transition-colors ${idx % 2 === 1 ? 'bg-gray-50/50' : ''}`}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03, duration: 0.25 }}
                        >
                          <TableCell className="py-2.5">
                            <span className="text-xs font-mono text-gray-500">{teacher.matricule}</span>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <div>
                              <p className="text-sm font-medium text-[#1a2744]">{teacher.nom} {teacher.prenom}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {teacher.email && (
                                  <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                    <Mail className="size-2.5" /> {teacher.email}
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <Badge className={`text-[10px] ${gradeConfig[teacher.grade]?.className || 'bg-gray-100 text-gray-800 border-0'}`}>
                              {gradeFullNames[teacher.grade] || teacher.grade}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <span className="text-xs text-gray-600 flex items-center gap-1">
                              <Building2 className="size-3 text-gray-400" />
                              {teacher.departement}
                            </span>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <span className="text-xs text-gray-500">{teacher.specialisation}</span>
                          </TableCell>
                          <TableCell className="py-2.5 text-center">
                            <span className="text-sm font-semibold text-[#1a2744]">{teacher.heuresSem}</span>
                          </TableCell>
                          <TableCell className="py-2.5">
                            {sConfig ? (
                              <div className="flex items-center gap-1.5">
                                <motion.div
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: sConfig.dotColor }}
                                  animate={teacher.statut === 'Actif' ? { scale: [1, 1.3, 1], opacity: [1, 0.7, 1] } : {}}
                                  transition={{ duration: 2, repeat: Infinity }}
                                />
                                <Badge className={`text-[10px] ${sConfig.className}`}>
                                  {sConfig.label}
                                </Badge>
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell className="py-2.5 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-gray-100">
                                  <MoreVertical className="size-3.5 text-gray-400" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem className="text-xs" onClick={() => {
                                  selectTeacher(teacher.id)
                                  setView('teacher-detail')
                                }}>
                                  <Eye className="size-3.5 mr-2" />
                                  Voir profil
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-xs"
                                  disabled={!teacher.email}
                                  onClick={() => { if (teacher.email) window.location.href = `mailto:${teacher.email}` }}
                                >
                                  <Mail className="size-3.5 mr-2" />
                                  Contacter
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </motion.tr>
                      )
                    })}
                    {isLoading && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-sm text-gray-400">
                          Chargement...
                        </TableCell>
                      </TableRow>
                    )}
                    {!isLoading && filteredTeachers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-sm text-gray-400">
                          Aucun enseignant trouve
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

      {/* ─── Quick Stats Row ────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-[#d4a853]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#d4a85315] flex items-center justify-center">
                <Award className="size-4 text-[#d4a853]" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Moyenne heures/enseignant</p>
                <p className="text-lg font-bold text-[#1a2744]">{totalEnseignants > 0 ? (totalHeures / totalEnseignants).toFixed(1) : 0}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-[#2d7a4f]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#2d7a4f15] flex items-center justify-center">
                <UserCheck className="size-4 text-[#2d7a4f]" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Taux d&apos;occupation</p>
                <p className="text-lg font-bold text-[#1a2744]">87%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-[#1a2744]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#1a274415] flex items-center justify-center">
                <Building2 className="size-4 text-[#1a2744]" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Departements couverts</p>
                <p className="text-lg font-bold text-[#1a2744]">{departements.length - 1}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── New Teacher Dialog ────────────────────────────────────────────────── */}
      <Dialog open={showNewTeacher} onOpenChange={(open) => { setShowNewTeacher(open); if (!open) setNewTeacherForm(emptyNewTeacherForm) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#1a2744]">Ajouter un enseignant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Nom</Label>
                <Input placeholder="Nom de famille" value={newTeacherForm.lastName} onChange={(e) => setNewTeacherForm((f) => ({ ...f, lastName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Prenom</Label>
                <Input placeholder="Prenom" value={newTeacherForm.firstName} onChange={(e) => setNewTeacherForm((f) => ({ ...f, firstName: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Matricule (optionnel)</Label>
              <Input placeholder="Genere automatiquement si vide" value={newTeacherForm.employeeId} onChange={(e) => setNewTeacherForm((f) => ({ ...f, employeeId: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Grade</Label>
                <Select value={newTeacherForm.grade} onValueChange={(v) => setNewTeacherForm((f) => ({ ...f, grade: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {grades.filter(g => g !== 'Tous').map(g => (
                      <SelectItem key={g} value={g}>{g === 'MCF' ? 'Maitre de Conferences' : g === 'MA' ? 'Maitre-Assistant' : g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Departement</Label>
                <Select value={newTeacherForm.departmentId} onValueChange={(v) => setNewTeacherForm((f) => ({ ...f, departmentId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {realDepartments.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Specialisation</Label>
              <Input placeholder="Domaine de specialisation" value={newTeacherForm.specialization} onChange={(e) => setNewTeacherForm((f) => ({ ...f, specialization: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Telephone</Label>
                <Input placeholder="+235 66 XX XX XX" value={newTeacherForm.phone} onChange={(e) => setNewTeacherForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Email</Label>
                <Input placeholder="email@univ.td" type="email" value={newTeacherForm.email} onChange={(e) => setNewTeacherForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <p className="text-[11px] text-gray-400">Un compte de connexion sera cree avec un mot de passe temporaire, affiche une seule fois.</p>
            <Button className="w-full bg-[#2d7a4f] hover:bg-[#236b40] text-white" disabled={isCreating} onClick={handleCreateTeacher}>
              {isCreating ? 'Creation...' : "Enregistrer l'enseignant"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── One-time credentials reveal ───────────────────────────────────────── */}
      <Dialog open={Boolean(createdCredentials)} onOpenChange={(open) => { if (!open) setCreatedCredentials(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enseignant ajoute</DialogTitle>
          </DialogHeader>
          {createdCredentials && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-gray-600">
                Le compte de <span className="font-semibold text-[#1a2744]">{createdCredentials.name}</span> est pret.
                Transmettez ces identifiants — ce mot de passe ne sera plus jamais affiche.
              </p>
              <div className="rounded-lg border bg-gray-50 p-3 space-y-2">
                <div>
                  <p className="text-[10px] text-gray-400">Email</p>
                  <p className="text-sm font-mono text-[#1a2744]">{createdCredentials.email}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">Mot de passe temporaire</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono font-semibold text-[#2d7a4f]">{createdCredentials.tempPassword}</p>
                    <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={copyPassword}>
                      <Copy className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-[#d4a853]">Un changement de mot de passe sera demande a la premiere connexion.</p>
              <Button className="w-full" variant="outline" onClick={() => setCreatedCredentials(null)}>Fermer</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
