'use client'

import { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useInscriptionPedagogique } from '@/lib/api-hooks'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  BookOpenCheck,
  Users,
  UserX,
  TrendingUp,
  Calendar,
  Search,
  Eye,
  CheckCircle2,
  Send,
  MoreHorizontal,
  AlertTriangle,
  CheckSquare,
  GraduationCap,
  Clock,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Info,
  Lock,
  BookOpen,
  Award,
  XCircle,
  FileCheck,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────────

interface StudentRegistration {
  id: string
  name: string
  matricule: string
  filiere: string
  niveau: string
  semestre: string
  ueInscrites: number
  totalUe: number
  statut: 'complete' | 'en-cours' | 'non-commencee' | 'en-attente'
  hasDebt: boolean
}

interface UEItem {
  id: string
  code: string
  name: string
  credits: number
  type: 'obligatoire' | 'optionnelle'
  professor: string
  selected: boolean
}

// ─── Animation Variants ─────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
} as const

// ─── Helper: Status Badge ───────────────────────────────────────────────────────

function StatusBadge({ statut }: { statut: StudentRegistration['statut'] }) {
  const config: Record<StudentRegistration['statut'], { label: string; className: string }> = {
    complete: { label: 'Complete', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-[#2d7a4f30]' },
    'en-cours': { label: 'En cours', className: 'bg-[#d4a85315] text-[#b8922e] border-[#d4a85330]' },
    'non-commencee': { label: 'Non commencee', className: 'bg-gray-100 text-gray-500 border-gray-200' },
    'en-attente': { label: 'En attente de validation', className: 'bg-[#1a274410] text-[#1a2744] border-[#1a274420]' },
  }
  const c = config[statut]
  return (
    <Badge variant="outline" className={`text-[11px] font-medium ${c.className}`}>
      {c.label}
    </Badge>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────────

export function InscriptionPedagogiquePage() {
  // Table state
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [programFilter, setProgramFilter] = useState<string>('all')

  // UE Selection state
  const [selectedStudent, setSelectedStudent] = useState<string>('')
  const [selectedSemestre, setSelectedSemestre] = useState<string>('s2')
  const [selectedSession, setSelectedSession] = useState<string>('normale')
  const [ueSelections, setUeSelections] = useState<Record<string, boolean>>({})
  const [ueSectionExpanded, setUeSectionExpanded] = useState(false)
  const [isSubmittingRegistration, setIsSubmittingRegistration] = useState(false)
  const [isTogglingPeriod, setIsTogglingPeriod] = useState(false)

  const { data: listData, isLoading: isListLoading } = useInscriptionPedagogique()
  const students: StudentRegistration[] = useMemo(() => listData?.students ?? [], [listData])
  const stats = listData?.stats
  const registrationOpen: boolean = listData?.registrationOpen ?? true

  const { data: ueData } = useInscriptionPedagogique(selectedStudent || undefined)
  const availableUEs: UEItem[] = useMemo(() => {
    const raw = (ueData?.availableUEs ?? []) as UEItem[]
    return raw
  }, [ueData])

  // Sync local checkbox state whenever the selected student's real UE list loads
  const ueDataKey = selectedStudent + ':' + availableUEs.length
  const [syncedKey, setSyncedKey] = useState('')
  if (ueDataKey !== syncedKey && availableUEs.length >= 0 && selectedStudent) {
    setSyncedKey(ueDataKey)
    setUeSelections(Object.fromEntries(availableUEs.map((ue) => [ue.id, ue.selected])))
  }

  // Computed: filtered students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch = searchQuery === '' ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.matricule.toLowerCase().includes(searchQuery.toLowerCase())
      const matchStatus = statusFilter === 'all' || s.statut === statusFilter
      const matchLevel = levelFilter === 'all' || s.niveau === levelFilter
      const matchProgram = programFilter === 'all' || s.filiere === programFilter
      return matchSearch && matchStatus && matchLevel && matchProgram
    })
  }, [students, searchQuery, statusFilter, levelFilter, programFilter])

  // Computed: UE credit totals
  const selectedCredits = useMemo(() => {
    return availableUEs
      .filter((ue) => ueSelections[ue.id])
      .reduce((sum, ue) => sum + ue.credits, 0)
  }, [availableUEs, ueSelections])

  const compulsoryCredits = useMemo(() => {
    return availableUEs
      .filter((ue) => ue.type === 'obligatoire')
      .reduce((sum, ue) => sum + ue.credits, 0)
  }, [availableUEs])

  const optionalCreditsSelected = useMemo(() => {
    return availableUEs
      .filter((ue) => ue.type === 'optionnelle' && ueSelections[ue.id])
      .reduce((sum, ue) => sum + ue.credits, 0)
  }, [availableUEs, ueSelections])

  const minCredits = 30
  const maxCredits = 42
  const creditsRemaining = Math.max(0, minCredits - selectedCredits)
  const creditsOver = Math.max(0, selectedCredits - maxCredits)

  // UE toggle
  const handleUeToggle = (ueId: string, ueType: string) => {
    if (ueType === 'obligatoire') return
    setUeSelections((prev) => ({ ...prev, [ueId]: !prev[ueId] }))
  }

  const handleValidateRegistration = async () => {
    if (!selectedStudent) return
    setIsSubmittingRegistration(true)
    try {
      const teachingUnitIds = availableUEs.filter((ue) => ueSelections[ue.id]).map((ue) => ue.id)
      const res = await fetch('/api/inscription-pedagogique', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: selectedStudent, teachingUnitIds }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || "Echec de l'inscription")
      toast.success('Inscription pedagogique enregistree')
      queryClient.invalidateQueries({ queryKey: ['inscriptionPedagogique'] })
    } catch (e) {
      toast.error('Erreur', { description: e instanceof Error ? e.message : "Echec de l'inscription" })
    } finally {
      setIsSubmittingRegistration(false)
    }
  }

  const handleTogglePeriod = async (open: boolean) => {
    setIsTogglingPeriod(true)
    try {
      const res = await fetch('/api/inscription-pedagogique', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ open }),
      })
      if (!res.ok) throw new Error('failed')
      toast.success(open ? 'Inscriptions ouvertes' : 'Inscriptions cloturees')
      queryClient.invalidateQueries({ queryKey: ['inscriptionPedagogique'] })
    } catch {
      toast.error('Echec de la mise a jour de la periode')
    } finally {
      setIsTogglingPeriod(false)
    }
  }

  // Stats data
  const statsData = [
    {
      title: 'Inscriptions completes',
      value: String(stats?.completes ?? 0),
      icon: CheckSquare,
      gradient: 'from-[#2d7a4f] to-[#1a5a38]',
      iconBg: 'bg-white/20',
    },
    {
      title: 'En cours',
      value: String(stats?.enCours ?? 0),
      icon: Clock,
      gradient: 'from-[#d4a853] to-[#b8922e]',
      iconBg: 'bg-white/20',
    },
    {
      title: 'Non inscrites',
      value: String(stats?.nonCommencees ?? 0),
      icon: UserX,
      gradient: 'from-[#6b7280] to-[#4b5563]',
      iconBg: 'bg-white/20',
    },
    {
      title: 'Taux de completion',
      value: `${stats?.completionRate ?? 0}%`,
      icon: TrendingUp,
      gradient: 'from-[#1a2744] to-[#2d3e5e]',
      iconBg: 'bg-white/20',
      hasProgress: true,
      progressValue: stats?.completionRate ?? 0,
    },
  ]

  return (
    <TooltipProvider>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* ─── Page Header ─────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1a2744] flex items-center gap-2">
              <BookOpenCheck className="size-6 text-[#2d7a4f]" />
              Inscription pedagogique
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Gestion des inscriptions pedagogiques par semestre - Systeme LMD
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs border-[#2d7a4f] text-[#2d7a4f] bg-[#2d7a4f08]">
              Annee 2024-2025
            </Badge>
          </div>
        </motion.div>

        {/* ─── Stats Cards ─────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsData.map((stat) => (
            <motion.div
              key={stat.title}
              whileHover={{ scale: 1.02, y: -2 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Card className={`bg-gradient-to-br ${stat.gradient} text-white border-0 shadow-lg overflow-hidden`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/70 text-xs font-medium">{stat.title}</p>
                      <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <div className={`p-2.5 rounded-xl ${stat.iconBg}`}>
                      <stat.icon className="size-5 text-white" />
                    </div>
                  </div>
                  {stat.hasProgress && (
                    <div className="mt-3">
                      <Progress value={(stat as { progressValue?: number }).progressValue ?? 0} className="h-2 bg-white/20 [&>div]:bg-white" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* ─── Registration Period Card ─────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-[#2d7a4f] shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#2d7a4f10]">
                    <Calendar className="size-5 text-[#2d7a4f]" />
                  </div>
                  <div>
                    <CardTitle className="text-base text-[#1a2744]">Periode d&apos;inscription</CardTitle>
                    <p className="text-sm text-gray-500 mt-0.5">Inscriptions pedagogiques S2 2024-2025</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {registrationOpen ? (
                    <Badge className="bg-[#2d7a4f] text-white border-0 text-xs">En cours</Badge>
                  ) : (
                    <Badge className="bg-gray-500 text-white border-0 text-xs">Cloturee</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 pt-1">
                {registrationOpen ? (
                  <Button
                    size="sm"
                    className="bg-[#d4a853] hover:bg-[#c49a48] text-white text-xs"
                    onClick={() => handleTogglePeriod(false)}
                    disabled={isTogglingPeriod}
                  >
                    Cloturer
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs"
                    onClick={() => handleTogglePeriod(true)}
                    disabled={isTogglingPeriod}
                  >
                    Ouvrir les inscriptions
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── Student Registration Status Table ─────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-[#1a2744] flex items-center gap-2">
                    <Users className="size-5 text-[#2d7a4f]" />
                    Statut des inscriptions
                  </CardTitle>
                  <Badge variant="outline" className="text-xs text-gray-500">
                    {filteredStudents.length} etudiants
                  </Badge>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                    <Input
                      placeholder="Rechercher par nom ou matricule..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 text-sm"
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[150px] h-9 text-xs">
                        <SelectValue placeholder="Statut" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les statuts</SelectItem>
                        <SelectItem value="complete">Complete</SelectItem>
                        <SelectItem value="en-cours">En cours</SelectItem>
                        <SelectItem value="non-commencee">Non commencee</SelectItem>
                        <SelectItem value="en-attente">En attente</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={levelFilter} onValueChange={setLevelFilter}>
                      <SelectTrigger className="w-[100px] h-9 text-xs">
                        <SelectValue placeholder="Niveau" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous niveaux</SelectItem>
                        <SelectItem value="L1">L1</SelectItem>
                        <SelectItem value="L2">L2</SelectItem>
                        <SelectItem value="L3">L3</SelectItem>
                        <SelectItem value="M1">M1</SelectItem>
                        <SelectItem value="M2">M2</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={programFilter} onValueChange={setProgramFilter}>
                      <SelectTrigger className="w-[140px] h-9 text-xs">
                        <SelectValue placeholder="Filiere" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes filieres</SelectItem>
                        <SelectItem value="Informatique">Informatique</SelectItem>
                        <SelectItem value="Droit">Droit</SelectItem>
                        <SelectItem value="Gestion">Gestion</SelectItem>
                        <SelectItem value="Lettres">Lettres</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[480px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/80">
                      <TableHead className="text-xs font-semibold text-[#1a2744]">Etudiant</TableHead>
                      <TableHead className="text-xs font-semibold text-[#1a2744]">Matricule</TableHead>
                      <TableHead className="text-xs font-semibold text-[#1a2744] hidden md:table-cell">Filiere</TableHead>
                      <TableHead className="text-xs font-semibold text-[#1a2744] hidden sm:table-cell">Niveau</TableHead>
                      <TableHead className="text-xs font-semibold text-[#1a2744]">Semestre</TableHead>
                      <TableHead className="text-xs font-semibold text-[#1a2744]">UE inscrites</TableHead>
                      <TableHead className="text-xs font-semibold text-[#1a2744]">Statut</TableHead>
                      <TableHead className="text-xs font-semibold text-[#1a2744] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isListLoading && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-6 text-xs text-gray-400">Chargement...</TableCell>
                      </TableRow>
                    )}
                    {filteredStudents.map((student, index) => (
                      <motion.tr
                        key={student.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02, duration: 0.2 }}
                        className="hover:bg-gray-50/50 border-b border-gray-100"
                      >
                        <TableCell className="py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="size-8 rounded-full bg-gradient-to-br from-[#1a2744] to-[#2d3e5e] flex items-center justify-center text-white text-xs font-semibold shrink-0">
                              {student.name.split(' ').map((n) => n[0]).join('')}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[#1a2744] truncate">{student.name}</p>
                              {student.hasDebt && (
                                <div className="flex items-center gap-1">
                                  <AlertTriangle className="size-3 text-[#d4a853]" />
                                  <span className="text-[10px] text-[#d4a853]">Dette anterieure</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-gray-500 font-mono">{student.matricule}</TableCell>
                        <TableCell className="text-xs text-gray-600 hidden md:table-cell">{student.filiere}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline" className="text-[10px] font-medium">{student.niveau}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-gray-600">{student.semestre}</TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#2d7a4f] rounded-full transition-all"
                                style={{ width: `${(student.ueInscrites / student.totalUe) * 100}%` }}
                              />
                            </div>
                            <span className="text-gray-600">{student.ueInscrites}/{student.totalUe}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge statut={student.statut} />
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="size-8 p-0 hover:bg-gray-100">
                                <MoreHorizontal className="size-4 text-gray-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem className="text-xs cursor-pointer">
                                <Eye className="size-3.5 mr-2 text-gray-400" />
                                Voir detail
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs cursor-pointer">
                                <CheckCircle2 className="size-3.5 mr-2 text-[#2d7a4f]" />
                                Valider
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs cursor-pointer">
                                <Send className="size-3.5 mr-2 text-[#d4a853]" />
                                Relancer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    ))}
                    {filteredStudents.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-400 text-sm">
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

        {/* ─── UE Selection & LMD Rules Grid ─────────────────────────────────── */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* UE Selection Card (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle className="text-base text-[#1a2744] flex items-center gap-2">
                    <GraduationCap className="size-5 text-[#2d7a4f]" />
                    Inscription aux UE
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-gray-500 hover:text-[#1a2744]"
                    onClick={() => setUeSectionExpanded(!ueSectionExpanded)}
                  >
                    {ueSectionExpanded ? 'Reduire' : 'Etendre'}
                    {ueSectionExpanded ? (
                      <ChevronUp className="size-4 ml-1" />
                    ) : (
                      <ChevronDown className="size-4 ml-1" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Selection controls */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Etudiant</label>
                    <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                      <SelectTrigger className="w-full h-9 text-xs">
                        <SelectValue placeholder="Selectionner un etudiant" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((s) => (
                          <SelectItem key={s.id} value={s.id} className="text-xs">
                            {s.name} - {s.matricule}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Semestre</label>
                    <Select value={selectedSemestre} onValueChange={setSelectedSemestre}>
                      <SelectTrigger className="w-full h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="s1">S1</SelectItem>
                        <SelectItem value="s2">S2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-600">Session</label>
                    <Select value={selectedSession} onValueChange={setSelectedSession}>
                      <SelectTrigger className="w-full h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normale">Normale</SelectItem>
                        <SelectItem value="rattrapage">Rattrapage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Student info banner */}
                {selectedStudent && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-[#2d7a4f08] border border-[#2d7a4f20] rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-full bg-[#1a2744] flex items-center justify-center text-white text-[10px] font-semibold">
                        {students.find((s) => s.id === selectedStudent)?.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <span className="font-medium text-[#1a2744]">
                        {students.find((s) => s.id === selectedStudent)?.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{students.find((s) => s.id === selectedStudent)?.filiere}</span>
                      <span className="text-gray-300">|</span>
                      <span>{students.find((s) => s.id === selectedStudent)?.niveau}</span>
                      <span className="text-gray-300">|</span>
                      <span>{students.find((s) => s.id === selectedStudent)?.semestre}</span>
                    </div>
                  </motion.div>
                )}

                {/* UE Grid */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <BookOpen className="size-3.5" />
                    <span>Unites d&apos;enseignement disponibles</span>
                  </div>
                  <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${!ueSectionExpanded ? 'max-h-[340px] overflow-y-auto' : ''}`}>
                    {availableUEs.map((ue) => {
                      const isSelected = ueSelections[ue.id]
                      const isObligatoire = ue.type === 'obligatoire'
                      return (
                        <motion.div
                          key={ue.id}
                          whileHover={{ scale: 1.01 }}
                          className={`relative border rounded-lg p-3 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#2d7a4f] bg-[#2d7a4f08] shadow-sm'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          } ${isObligatoire ? 'ring-1 ring-[#2d7a4f10]' : ''}`}
                          onClick={() => handleUeToggle(ue.id, ue.type)}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="pt-0.5">
                              <Checkbox
                                checked={isSelected}
                                disabled={isObligatoire}
                                onCheckedChange={() => handleUeToggle(ue.id, ue.type)}
                                className={isObligatoire ? 'data-[state=checked]:bg-[#2d7a4f] data-[state=checked]:border-[#2d7a4f]' : ''}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-mono font-semibold text-[#1a2744] bg-[#1a274410] px-1.5 py-0.5 rounded">
                                  {ue.code}
                                </span>
                                {isObligatoire ? (
                                  <Badge className="text-[9px] px-1.5 py-0 bg-[#2d7a4f] text-white border-0">
                                    Obligatoire
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-[#d4a853] text-[#b8922e] bg-[#d4a85308]">
                                    Optionnelle
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm font-medium text-gray-800 leading-tight">{ue.name}</p>
                              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
                                <span className="flex items-center gap-1">
                                  <CreditCard className="size-3" />
                                  {ue.credits} credits
                                </span>
                                <span className="flex items-center gap-1">
                                  <Users className="size-3" />
                                  {ue.professor}
                                </span>
                              </div>
                            </div>
                            {isObligatoire && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <Lock className="size-3.5 text-[#2d7a4f] shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">UE obligatoire - selection automatique</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>

                {/* Summary Panel */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#1a2744]">Resume de l&apos;inscription</span>
                    <div className="flex items-center gap-1">
                      <Award className="size-4 text-[#2d7a4f]" />
                      <span className={`text-lg font-bold ${selectedCredits >= minCredits && selectedCredits <= maxCredits ? 'text-[#2d7a4f]' : 'text-[#d4a853]'}`}>
                        {selectedCredits} credits
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="bg-white rounded-lg p-2 border border-gray-100">
                      <p className="text-[10px] text-gray-400 mb-0.5">Obligatoires</p>
                      <p className="text-sm font-bold text-[#2d7a4f]">{compulsoryCredits}</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-gray-100">
                      <p className="text-[10px] text-gray-400 mb-0.5">Optionnelles</p>
                      <p className="text-sm font-bold text-[#d4a853]">{optionalCreditsSelected}</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-gray-100">
                      <p className="text-[10px] text-gray-400 mb-0.5">Minimum requis</p>
                      <p className="text-sm font-bold text-gray-600">{minCredits}</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-gray-100">
                      <p className="text-[10px] text-gray-400 mb-0.5">Maximum autorise</p>
                      <p className="text-sm font-bold text-gray-600">{maxCredits}</p>
                    </div>
                  </div>
                  {/* Warnings */}
                  <div className="space-y-1.5">
                    {creditsRemaining > 0 && (
                      <div className="flex items-center gap-2 text-xs bg-[#d4a85310] border border-[#d4a85330] text-[#b8922e] rounded-md px-3 py-2">
                        <AlertTriangle className="size-3.5 shrink-0" />
                        <span>Il manque {creditsRemaining} credits pour atteindre le minimum de {minCredits} credits</span>
                      </div>
                    )}
                    {creditsOver > 0 && (
                      <div className="flex items-center gap-2 text-xs bg-red-50 border border-red-200 text-red-600 rounded-md px-3 py-2">
                        <XCircle className="size-3.5 shrink-0" />
                        <span>Depassement de {creditsOver} credits (maximum: {maxCredits})</span>
                      </div>
                    )}
                    {selectedCredits >= minCredits && selectedCredits <= maxCredits && (
                      <div className="flex items-center gap-2 text-xs bg-[#2d7a4f10] border border-[#2d7a4f30] text-[#2d7a4f] rounded-md px-3 py-2">
                        <CheckCircle2 className="size-3.5 shrink-0" />
                        <span>Nombre de credits conforme aux regles LMD</span>
                      </div>
                    )}
                  </div>
                  {/* Validate Button */}
                  <div className="flex justify-end pt-1">
                    <Button
                      className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-sm"
                      disabled={!selectedStudent || selectedCredits < minCredits || selectedCredits > maxCredits || isSubmittingRegistration || !registrationOpen}
                      onClick={handleValidateRegistration}
                    >
                      <FileCheck className="size-4 mr-2" />
                      {isSubmittingRegistration ? 'Enregistrement...' : "Valider l'inscription"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* LMD Credit Rules Card (1 col) */}
          <div className="space-y-4">
            <Card className="shadow-sm border-l-4 border-l-[#1a2744]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-[#1a2744] flex items-center gap-2">
                  <Award className="size-5 text-[#d4a853]" />
                  Regles LMD
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Min / Max credits */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Credits minimum / semestre</span>
                    <span className="text-sm font-bold text-[#2d7a4f]">{minCredits}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Credits maximum / semestre</span>
                    <span className="text-sm font-bold text-[#1a2744]">{maxCredits}</span>
                  </div>
                </div>

                {/* Visual credit range */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-gray-600">Plage de credits autorisee</span>
                  <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                    <div className="absolute inset-0 flex">
                      <div className="w-[7/14] bg-gradient-to-r from-red-100 to-red-50 border-r border-red-200" style={{ width: `${((minCredits) / 60) * 100}%` }} />
                      <div className="bg-gradient-to-r from-[#2d7a4f20] to-[#2d7a4f30]" style={{ width: `${((maxCredits - minCredits) / 60) * 100}%` }} />
                      <div className="flex-1 bg-gradient-to-r from-red-50 to-red-100" />
                    </div>
                    {/* Indicator for current selection */}
                    <motion.div
                      className="absolute top-0 bottom-0 w-1 bg-[#1a2744] rounded-full shadow-md"
                      animate={{ left: `${(selectedCredits / 60) * 100}%` }}
                      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    />
                    <div className="absolute inset-0 flex items-center justify-between px-2 text-[9px] font-medium text-gray-500">
                      <span>0</span>
                      <span className="text-[#2d7a4f]">{minCredits}</span>
                      <span className="text-[#1a2744]">{maxCredits}</span>
                      <span>60</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-[9px] text-gray-400">
                    <span>Insuffisant</span>
                    <span className="text-[#2d7a4f]">Zone conforme</span>
                    <span>Exces</span>
                  </div>
                </div>

                {/* Compensation rules */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <span className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                    <Info className="size-3.5 text-[#1a2744]" />
                    Regles de compensation
                  </span>
                  <ul className="space-y-1.5 text-xs text-gray-500">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="size-3.5 text-[#2d7a4f] shrink-0 mt-0.5" />
                      <span>Compensation possible si moyenne generale &ge; 10/20</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="size-3.5 text-[#2d7a4f] shrink-0 mt-0.5" />
                      <span>Aucune UE &lt; 08/20 pour compensation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="size-3.5 text-[#2d7a4f] shrink-0 mt-0.5" />
                      <span>Credits de compensation valides automatiquement</span>
                    </li>
                  </ul>
                </div>

                {/* Debt warning */}
                <div className="bg-[#d4a85310] border border-[#d4a85330] rounded-lg p-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-4 text-[#d4a853]" />
                    <span className="text-xs font-semibold text-[#b8922e]">Dettes anterieures</span>
                  </div>
                  <p className="text-[11px] text-[#b8922e] leading-relaxed">
                    Les etudiants ayant des UE en dette du semestre precedent doivent les re-inscrire en priorite avant de selectionner les nouvelles UE.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <Badge variant="outline" className="text-[10px] border-[#d4a853] text-[#b8922e] bg-[#d4a85308]">
                      12 etudiants concernes
                    </Badge>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <span className="text-xs font-medium text-gray-600">Repartition des credits</span>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-gray-500">UE Obligatoires</span>
                        <span className="font-medium text-[#2d7a4f]">{compulsoryCredits} credits</span>
                      </div>
                      <Progress value={(compulsoryCredits / maxCredits) * 100} className="h-1.5 [&>div]:bg-[#2d7a4f]" />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-gray-500">UE Optionnelles</span>
                        <span className="font-medium text-[#d4a853]">{optionalCreditsSelected} credits</span>
                      </div>
                      <Progress value={(optionalCreditsSelected / (maxCredits - compulsoryCredits)) * 100} className="h-1.5 [&>div]:bg-[#d4a853]" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </motion.div>
    </TooltipProvider>
  )
}
