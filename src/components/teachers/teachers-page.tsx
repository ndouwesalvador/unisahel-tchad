'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
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
  Download,
  MoreVertical,
  Eye,
  BookOpen,
  FileText,
  GraduationCap,
  Clock,
  Briefcase,
  TrendingUp,
  UserCheck,
  Award,
  Mail,
  Phone,
  Building2,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

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

const demoTeachers: Teacher[] = [
  { id: '1', matricule: 'ENS/001', nom: 'Youssouf', prenom: 'Abakar Moussa', grade: 'MCF', departement: 'Droit Prive', specialisation: 'Droit des Obligations', heuresSem: 12, statut: 'Actif', telephone: '+235 66 01 02 03', email: 'a.youssouf@univ.td' },
  { id: '2', matricule: 'ENS/002', nom: 'Hassan Abakar', prenom: 'Fatime', grade: 'MA', departement: 'Droit Public', specialisation: 'Droit Administratif', heuresSem: 14, statut: 'Actif', telephone: '+235 66 04 05 06', email: 'f.hassan@univ.td' },
  { id: '3', matricule: 'ENS/003', nom: 'Adam Brahim', prenom: 'Mahamat', grade: 'Assistant', departement: 'Mathematiques', specialisation: 'Analyse Numerique', heuresSem: 16, statut: 'Actif', telephone: '+235 66 07 08 09', email: 'm.adam@univ.td' },
  { id: '4', matricule: 'ENS/004', nom: 'Aboubakar Oumar', prenom: 'Khadidja', grade: 'MA', departement: 'Lettres Modernes', specialisation: 'Litterature Africaine', heuresSem: 14, statut: 'Actif', telephone: '+235 66 10 11 12', email: 'k.aboubakar@univ.td' },
  { id: '5', matricule: 'ENS/005', nom: 'Deby Itno', prenom: 'Idriss', grade: 'Professeur', departement: 'Informatique', specialisation: 'Intelligence Artificielle', heuresSem: 8, statut: 'Actif', telephone: '+235 66 13 14 15', email: 'i.deby@univ.td' },
  { id: '6', matricule: 'ENS/006', nom: 'Mahamat Nour', prenom: 'Adam', grade: 'MCF', departement: 'Sciences Economiques', specialisation: 'Macroeconomie', heuresSem: 10, statut: 'Actif', telephone: '+235 66 16 17 18', email: 'a.mahamatnour@univ.td' },
  { id: '7', matricule: 'ENS/007', nom: 'Djime', prenom: 'Hawa', grade: 'Assistant', departement: 'Droit Prive', specialisation: 'Droit Commercial', heuresSem: 16, statut: 'Actif', telephone: '+235 66 19 20 21', email: 'h.djime@univ.td' },
  { id: '8', matricule: 'ENS/008', nom: 'Ibrahim Seid', prenom: 'Ousman', grade: 'Vacataire', departement: 'Gestion', specialisation: 'Comptabilite', heuresSem: 6, statut: 'Actif', telephone: '+235 66 22 23 24', email: 'o.ibrahim@univ.td' },
  { id: '9', matricule: 'ENS/009', nom: 'Hissein', prenom: 'Mariam', grade: 'MA', departement: 'Sociologie', specialisation: 'Sociologie Rurale', heuresSem: 14, statut: 'Conge', telephone: '+235 66 25 26 27', email: 'm.hissein@univ.td' },
  { id: '10', matricule: 'ENS/010', nom: 'Bichara', prenom: 'Youssouf', grade: 'Professeur', departement: 'Droit Public', specialisation: 'Droit Constitutionnel', heuresSem: 6, statut: 'Actif', telephone: '+235 66 28 29 30', email: 'y.bichara@univ.td' },
  { id: '11', matricule: 'ENS/011', nom: 'Khamis', prenom: 'Zara', grade: 'Assistant', departement: 'Informatique', specialisation: 'Reseaux et Telecoms', heuresSem: 18, statut: 'Actif', telephone: '+235 66 31 32 33', email: 'z.khamis@univ.td' },
  { id: '12', matricule: 'ENS/012', nom: 'Ngarndmi', prenom: 'Halime', grade: 'Professionnel', departement: 'Gestion', specialisation: 'Ressources Humaines', heuresSem: 4, statut: 'Actif', telephone: '+235 66 34 35 36', email: 'h.ngarndmi@univ.td' },
  { id: '13', matricule: 'ENS/013', nom: 'Issa', prenom: 'Abakar', grade: 'MCF', departement: 'Lettres Modernes', specialisation: 'Linguistique', heuresSem: 10, statut: 'Actif', telephone: '+235 66 37 38 39', email: 'a.issa@univ.td' },
  { id: '14', matricule: 'ENS/014', nom: 'Ahmat', prenom: 'Djibrine', grade: 'Vacataire', departement: 'Sciences Economiques', specialisation: 'Microeconomie', heuresSem: 6, statut: 'Actif', telephone: '+235 66 40 41 42', email: 'd.ahmat@univ.td' },
  { id: '15', matricule: 'ENS/015', nom: 'Adoum', prenom: 'Khadija', grade: 'MA', departement: 'Droit Prive', specialisation: 'Droit de la Famille', heuresSem: 12, statut: 'Actif', telephone: '+235 66 43 44 45', email: 'k.adoum@univ.td' },
  { id: '16', matricule: 'ENS/016', nom: 'Seid', prenom: 'Ibrahim', grade: 'Professeur', departement: 'Sociologie', specialisation: 'Anthropologie', heuresSem: 0, statut: 'Retraite', telephone: '+235 66 46 47 48', email: 'i.seid@univ.td' },
]

const departements = ['Tous', 'Droit Prive', 'Droit Public', 'Mathematiques', 'Lettres Modernes', 'Informatique', 'Sciences Economiques', 'Gestion', 'Sociologie']
const grades = ['Tous', 'Professeur', 'MCF', 'MA', 'Assistant', 'Vacataire', 'Professionnel']

// ─── Component ────────────────────────────────────────────────────────────────

export function TeachersPage() {
  const { selectTeacher, setView } = useAppStore()
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('Tous')
  const [filterGrade, setFilterGrade] = useState('Tous')
  const [showNewTeacher, setShowNewTeacher] = useState(false)

  const totalEnseignants = demoTeachers.filter(t => t.statut === 'Actif').length
  const totalHeures = demoTeachers.reduce((acc, t) => acc + t.heuresSem, 0)
  const gradeBreakdown = {
    'Professeur': demoTeachers.filter(t => t.grade === 'Professeur').length,
    'MCF': demoTeachers.filter(t => t.grade === 'MCF').length,
    'MA': demoTeachers.filter(t => t.grade === 'MA').length,
    'Assistant': demoTeachers.filter(t => t.grade === 'Assistant').length,
    'Vacataire': demoTeachers.filter(t => t.grade === 'Vacataire').length,
    'Professionnel': demoTeachers.filter(t => t.grade === 'Professionnel').length,
  }

  // Count-up stats
  const countTotal = useCountUp(totalEnseignants, 1400)
  const countProfs = useCountUp(gradeBreakdown['Professeur'], 1200)
  const countHeures = useCountUp(totalHeures, 1300)
  const countVac = useCountUp(gradeBreakdown['Vacataire'], 1000)

  const filteredTeachers = demoTeachers.filter(t => {
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
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs h-9 border-[#1a274430] text-[#1a2744] hover:bg-[#1a274408]">
                  <Download className="size-3.5 mr-1.5" />
                  Export
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
                                <DropdownMenuItem className="text-xs">
                                  <BookOpen className="size-3.5 mr-2" />
                                  Affecter UE
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-xs">
                                  <FileText className="size-3.5 mr-2" />
                                  Export services
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-xs">
                                  <Phone className="size-3.5 mr-2" />
                                  Contacter
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </motion.tr>
                      )
                    })}
                    {filteredTeachers.length === 0 && (
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
                <p className="text-lg font-bold text-[#1a2744]">9</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── New Teacher Dialog ────────────────────────────────────────────────── */}
      <Dialog open={showNewTeacher} onOpenChange={setShowNewTeacher}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#1a2744]">Ajouter un enseignant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Nom</Label>
                <Input placeholder="Nom de famille" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Prenom</Label>
                <Input placeholder="Prenom" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Grade</Label>
                <Select>
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
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {departements.filter(d => d !== 'Tous').map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Specialisation</Label>
              <Input placeholder="Domaine de specialisation" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Telephone</Label>
                <Input placeholder="+235 66 XX XX XX" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Email</Label>
                <Input placeholder="email@univ.td" type="email" />
              </div>
            </div>
            <Button className="w-full bg-[#2d7a4f] hover:bg-[#236b40] text-white" onClick={() => setShowNewTeacher(false)}>
              Enregistrer l&apos;enseignant
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
