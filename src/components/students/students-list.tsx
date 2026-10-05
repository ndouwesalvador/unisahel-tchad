'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import { useStudents, useStructure } from '@/lib/api-hooks'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { exportToExcel } from '@/lib/export'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  UserPlus,
  FileSpreadsheet,
  FileText,
  Upload,
  ChevronLeft,
  ChevronRight,
  Eye,
  Users,
  UserCheck,
  Calendar,
  Copy,
  Pencil,
  Trash2,
  RotateCcw,
} from 'lucide-react'

// ─── Data Types ───────────────────────────────────────────────────────────────

type StudentStatus = 'INSCRIT' | 'PRE_INSCRIT' | 'SUSPENDU' | 'EXCLU' | 'DIPLOME' | 'ABANDON' | 'TRANSFERE'

interface StudentRow {
  id: string
  matricule: string
  nom: string
  prenom: string
  firstName: string
  lastName: string
  filiere: string
  niveau: string
  statut: StudentStatus
  credits: number
  email: string
  telephone: string
  sexe: 'M' | 'F'
  age: number
  dateOfBirth: string
  placeOfBirth: string
  nationality: string
  currentProgramId: string
  currentLevelId: string
  bacSeries: string
  bacYear: string
}

const statusConfig: Record<StudentStatus, { label: string; className: string }> = {
  INSCRIT: { label: 'Inscrit', className: 'bg-[var(--institution-secondary-15)] text-[var(--institution-secondary)] border-0 hover:bg-[var(--institution-secondary-15)]' },
  PRE_INSCRIT: { label: 'Pré-inscrit', className: 'bg-[var(--institution-accent-15)] text-[var(--institution-accent)] border-0 hover:bg-[var(--institution-accent-15)]' },
  SUSPENDU: { label: 'Suspendu', className: 'bg-[#ef6c0015] text-[#ef6c00] border-0 hover:bg-[#ef6c0015]' },
  EXCLU: { label: 'Exclu', className: 'bg-[#c6282815] text-[#c62828] border-0 hover:bg-[#c6282815]' },
  DIPLOME: { label: 'Diplômé', className: 'bg-[var(--institution-primary-15)] text-[var(--institution-primary)] border-0 hover:bg-[var(--institution-primary-15)]' },
  ABANDON: { label: 'Abandon', className: 'bg-[#6b728015] text-gray-600 border-0 hover:bg-[#6b728015]' },
  TRANSFERE: { label: 'Transféré', className: 'bg-[var(--institution-primary-15)] text-[var(--institution-primary)] border-0 hover:bg-[var(--institution-primary-15)]' },
}

const ITEMS_PER_PAGE = 10

// ─── Animated Count-Up Hook ──────────────────────────────────────────────────

function useCountUp(target: number, duration: number = 1200) {
  const [count, setCount] = useState(0)
  const startTime = useRef<number | null>(null)
  const rafId = useRef<number | null>(null)

  useEffect(() => {
    startTime.current = null

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp
      const progress = Math.min((timestamp - startTime.current) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * target))

      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate)
      }
    }

    rafId.current = requestAnimationFrame(animate)

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current)
    }
  }, [target, duration])

  return count
}

// ─── Stat Card Component ─────────────────────────────────────────────────────

function StatIndicator({ value, label, icon: Icon, color }: {
  value: number
  label: string
  icon: React.ElementType
  color: string
}) {
  const animatedValue = useCountUp(value, 1400)
  return (
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0`} style={{ backgroundColor: color + '15' }}>
        <Icon className="size-5" style={{ color }} />
      </div>
      <div>
        <p className="text-xl font-bold" style={{ color }}>{animatedValue}</p>
        <p className="text-[11px] text-gray-500">{label}</p>
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ApiLevel { id: string; name: string; code: string | null }
interface ApiProgram { id: string; name: string; levels: ApiLevel[] }
interface ApiDepartment { programs: ApiProgram[] }
interface ApiFaculty { departments: ApiDepartment[] }

const emptyStudentForm = {
  firstName: '', lastName: '', gender: '', dateOfBirth: '', placeOfBirth: '',
  nationality: 'Tchadienne', currentProgramId: '', currentLevelId: '',
  email: '', phone: '', bacSeries: '', bacYear: '', status: 'PRE_INSCRIT', photo: '',
}

export function StudentsList() {
  const { setView, selectStudent } = useAppStore()
  const role = useAppStore((state) => state.user?.role)
  const canManageStudents = ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE'].includes(role ?? '')
  const canImportStudents = canManageStudents
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filiereFilter, setFiliereFilter] = useState('all')
  const [niveauFilter, setNiveauFilter] = useState('all')
  const [statutFilter, setStatutFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  const [showCreate, setShowCreate] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isChangingStatus, setIsChangingStatus] = useState(false)
  const [isExportingPDF, setIsExportingPDF] = useState(false)
  const [form, setForm] = useState(emptyStudentForm)
  const [createdCredentials, setCreatedCredentials] = useState<{ matricule: string; login: string; pin: string; name: string } | null>(null)

  const { data: studentsData, isLoading } = useStudents({ limit: 1000 })
  const { data: structureData } = useStructure() as { data: { faculties?: ApiFaculty[] } | undefined }

  const realPrograms: ApiProgram[] = useMemo(
    () => (structureData?.faculties || []).flatMap((f) => f.departments.flatMap((d) => d.programs)),
    [structureData],
  )
  const selectedProgramLevels = realPrograms.find((p) => p.id === form.currentProgramId)?.levels || []

  const handlePhotoSelection = (file?: File) => {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2_000_000) {
      setForm((current) => ({ ...current, photo: '' }))
      toast.error('Photo non acceptée', { description: 'Utilisez une image JPEG, PNG ou WebP de 2 Mo maximum.' })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const photo = reader.result
      if (typeof photo === 'string') setForm((current) => ({ ...current, photo }))
    }
    reader.onerror = () => toast.error('Impossible de lire la photo')
    reader.readAsDataURL(file)
  }

  const handleCreateStudent = async () => {
    if (!form.firstName || !form.lastName || !form.gender || !form.dateOfBirth || !form.placeOfBirth || !form.currentProgramId || !form.currentLevelId) {
      toast.error('Champs requis', { description: 'Nom, prénom, sexe, date/lieu de naissance, filière et niveau sont obligatoires' })
      return
    }
    setIsCreating(true)
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          gender: form.gender,
          nationality: form.nationality || 'Tchadienne',
          dateOfBirth: new Date(form.dateOfBirth).toISOString(),
          placeOfBirth: form.placeOfBirth,
          currentProgramId: form.currentProgramId,
          currentLevelId: form.currentLevelId,
          status: form.status,
          email: form.email || undefined,
          phone: form.phone || undefined,
          bacSeries: form.bacSeries || undefined,
          bacYear: form.bacYear ? Number(form.bacYear) : undefined,
          photo: form.photo || undefined,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Échec de la création')
      toast.success('Étudiant enregistré', { description: `Matricule ${body.data?.matricule}` })
      queryClient.invalidateQueries({ queryKey: ['students'] })
      setShowCreate(false)
      setForm(emptyStudentForm)
      if (body.portalAccount) {
        setCreatedCredentials({
          matricule: body.data.matricule,
          login: body.portalAccount.login,
          pin: body.portalAccount.pin,
          name: `${form.firstName} ${form.lastName}`,
        })
      }
    } catch (e) {
      toast.error('Erreur', { description: e instanceof Error ? e.message : 'Échec de la création' })
    } finally {
      setIsCreating(false)
    }
  }

  const openEditStudent = (student: StudentRow) => {
    setEditingStudent(student)
    setForm({
      firstName: student.firstName,
      lastName: student.lastName,
      gender: student.sexe,
      dateOfBirth: student.dateOfBirth,
      placeOfBirth: student.placeOfBirth,
      nationality: student.nationality || 'Tchadienne',
      currentProgramId: student.currentProgramId,
      currentLevelId: student.currentLevelId,
      email: student.email,
      phone: student.telephone,
      bacSeries: student.bacSeries,
      bacYear: student.bacYear,
      status: student.statut === 'INSCRIT' ? 'INSCRIT' : 'PRE_INSCRIT',
      photo: '',
    })
  }

  const closeEditDialog = () => {
    setEditingStudent(null)
    setForm(emptyStudentForm)
  }

  const handleUpdateStudent = async () => {
    if (!editingStudent) return
    if (!form.firstName || !form.lastName || !form.gender || !form.dateOfBirth || !form.placeOfBirth || !form.currentProgramId || !form.currentLevelId) {
      toast.error('Champs requis', { description: 'Nom, prénom, sexe, date/lieu de naissance, filière et niveau sont obligatoires' })
      return
    }
    setIsUpdating(true)
    try {
      const updatePayload: Record<string, unknown> = {
        id: editingStudent.id,
        firstName: form.firstName,
        lastName: form.lastName,
        gender: form.gender,
        nationality: form.nationality || 'Tchadienne',
        dateOfBirth: new Date(form.dateOfBirth).toISOString(),
        placeOfBirth: form.placeOfBirth,
        currentProgramId: form.currentProgramId,
        currentLevelId: form.currentLevelId,
        email: form.email || undefined,
        phone: form.phone || undefined,
        bacSeries: form.bacSeries || undefined,
        bacYear: form.bacYear ? Number(form.bacYear) : undefined,
        photo: form.photo || undefined,
      }
      if (editingStudent.statut === 'INSCRIT' || editingStudent.statut === 'PRE_INSCRIT') {
        updatePayload.status = form.status === 'INSCRIT' ? 'INSCRIT' : 'PRE_INSCRIT'
      }

      const res = await fetch('/api/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Échec de la mise à jour')
      toast.success('Dossier étudiant mis à jour')
      queryClient.invalidateQueries({ queryKey: ['students'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      closeEditDialog()
    } catch (e) {
      toast.error('Erreur', { description: e instanceof Error ? e.message : 'Échec de la mise à jour' })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSuspendStudent = async (student: StudentRow) => {
    if (!window.confirm(`Suspendre le dossier de ${student.prenom} ${student.nom} ?`)) return
    setIsChangingStatus(true)
    try {
      const res = await fetch(`/api/students?id=${encodeURIComponent(student.id)}`, { method: 'DELETE' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Échec de la suspension')
      toast.success('Dossier étudiant suspendu')
      queryClient.invalidateQueries({ queryKey: ['students'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (e) {
      toast.error('Erreur', { description: e instanceof Error ? e.message : 'Échec de la suspension' })
    } finally {
      setIsChangingStatus(false)
    }
  }

  const handleReactivateStudent = async (student: StudentRow) => {
    setIsChangingStatus(true)
    try {
      const res = await fetch('/api/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: student.id, status: 'INSCRIT' }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Échec de la réactivation')
      toast.success('Dossier étudiant réactivé')
      queryClient.invalidateQueries({ queryKey: ['students'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (e) {
      toast.error('Erreur', { description: e instanceof Error ? e.message : 'Échec de la réactivation' })
    } finally {
      setIsChangingStatus(false)
    }
  }

  const handleExportPDF = async () => {
    if (filteredStudents.length === 0) return
    setIsExportingPDF(true)
    try {
      const response = await fetch('/api/students/export-pdf', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: filteredStudents.map((student: StudentRow) => student.id) }),
      })
      if (!response.ok) {
        const problem = await response.json().catch(() => ({}))
        throw new Error(problem.error || 'Export PDF impossible')
      }
      const url = URL.createObjectURL(await response.blob())
      const link = document.createElement('a')
      link.href = url
      link.download = 'liste_etudiants.pdf'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
    } catch (error) {
      toast.error('Export PDF impossible', { description: error instanceof Error ? error.message : 'Veuillez réessayer.' })
    } finally {
      setIsExportingPDF(false)
    }
  }

  const copyPin = () => {
    if (!createdCredentials) return
    navigator.clipboard.writeText(createdCredentials.pin).then(
      () => toast.success('Code PIN copie'),
      () => toast.error('Copie impossible'),
    )
  }

  const realStudents = useMemo(() => {
    if (!studentsData?.data) return []
    return studentsData.data.map((s: any) => {
      const birthDate = new Date(s.dateOfBirth)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const m = today.getMonth() - birthDate.getMonth()
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }

      return {
        id: s.id,
        matricule: s.matricule || 'N/A',
        nom: s.lastName,
        prenom: s.firstName,
        firstName: s.firstName,
        lastName: s.lastName,
        filiere: s.currentProgram?.name || 'Non défini',
        niveau: s.currentLevel?.code || 'N/A',
        statut: (s.status || 'PRE_INSCRIT') as StudentStatus,
        credits: s.totalCreditsAcquired || 0,
        email: s.email || '',
        telephone: s.phone || '',
        sexe: (s.gender as 'M' | 'F') || 'M',
        age: age || 0,
        dateOfBirth: s.dateOfBirth ? new Date(s.dateOfBirth).toISOString().slice(0, 10) : '',
        placeOfBirth: s.placeOfBirth || '',
        nationality: s.nationality || 'Tchadienne',
        currentProgramId: s.currentProgram?.id || '',
        currentLevelId: s.currentLevel?.id || '',
        bacSeries: s.bacSeries || '',
        bacYear: s.bacYear ? String(s.bacYear) : '',
      } as StudentRow
    })
  }, [studentsData])

  const filieres = Array.from(new Set<string>(realStudents.map((s: StudentRow) => s.filiere))).sort()
  const niveaux = Array.from(new Set<string>(realStudents.map((s: StudentRow) => s.niveau))).sort()

  const filteredStudents = realStudents.filter((s: StudentRow) => {
    const matchSearch =
      search === '' ||
      s.nom.toLowerCase().includes(search.toLowerCase()) ||
      s.prenom.toLowerCase().includes(search.toLowerCase()) ||
      s.matricule.toLowerCase().includes(search.toLowerCase())
    const matchFiliere = filiereFilter === 'all' || s.filiere === filiereFilter
    const matchNiveau = niveauFilter === 'all' || s.niveau === niveauFilter
    const matchStatut = statutFilter === 'all' || s.statut === statutFilter
    return matchSearch && matchFiliere && matchNiveau && matchStatut
  })

  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE)
  const safeTotalPages = Math.max(1, totalPages)
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const handleRowClick = (studentId: string) => {
    selectStudent(studentId)
    setView('student-detail')
  }

  // ─── Computed Stats ─────────────────────────────────────────────────────
  const totalStudents = filteredStudents.length
  const maleCount = filteredStudents.filter((s: StudentRow) => s.sexe === 'M').length
  const femaleCount = filteredStudents.filter((s: StudentRow) => s.sexe === 'F').length
  const averageAge = filteredStudents.length > 0
    ? Math.round(filteredStudents.reduce((acc: number, s: StudentRow) => acc + s.age, 0) / filteredStudents.length)
    : 0

  // Stagger animation variants for table rows
  const rowVariants = {
    hidden: { opacity: 0, x: -12 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: { duration: 0.3, delay: i * 0.04, ease: 'easeOut' as const },
    }),
  } as const

  return (
    <div className="space-y-4">
      {/* Gradient Header Banner */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-[var(--institution-primary)] via-[var(--institution-primary-light)] to-[var(--institution-secondary)] p-6 text-white relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE0YzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptLTQgMmMtMS4xIDAtMi0uOS0yLTJzLjktMiAyLTIgMiAuOSAyIDItLjkgMi0yIDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <motion.h1
                className="text-2xl font-bold"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                Gestion des étudiants
              </motion.h1>
              <motion.p
                className="text-white/70 text-sm mt-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                {filteredStudents.length} étudiants trouvés
              </motion.p>
            </div>
            <div className="flex items-center gap-2">
              {canImportStudents && <Button
                variant="outline"
                size="sm"
                className="text-xs bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
                onClick={() => setView('import-export')}
              >
                <Upload className="size-3.5 mr-1.5" />
                Importer
              </Button>}
              <Button
                variant="outline"
                size="sm"
                className="text-xs bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
                onClick={() => exportToExcel(filteredStudents, 'liste_etudiants')}
              >
                <FileSpreadsheet className="size-3.5 mr-1.5" />
                Excel
              </Button>
              <Button variant="outline" size="sm" className="text-xs bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white" onClick={() => void handleExportPDF()} disabled={isExportingPDF || filteredStudents.length === 0}>
                <FileText className="size-3.5 mr-1.5" />
                {isExportingPDF ? 'Préparation…' : 'PDF'}
              </Button>
              {canManageStudents && <Button size="sm" className="bg-[var(--institution-secondary)] hover:bg-[var(--institution-secondary-dark)] text-white text-xs border border-white/20" onClick={() => setShowCreate(true)}>
                <UserPlus className="size-3.5 mr-1.5" />
                Nouvel étudiant
              </Button>}
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatIndicator value={totalStudents} label="Total étudiants" icon={Users} color="var(--institution-primary)" />
              <StatIndicator value={maleCount} label="Hommes" icon={UserCheck} color="var(--institution-secondary)" />
              <StatIndicator value={femaleCount} label="Femmes" icon={UserCheck} color="var(--institution-accent)" />
              <StatIndicator value={averageAge} label="Age moyen" icon={Calendar} color="var(--institution-primary)" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                  placeholder="Rechercher par nom, prénom, matricule…"
                className="pl-9 h-9 text-sm"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
              />
            </div>
            <Select value={filiereFilter} onValueChange={(v) => { setFiliereFilter(v); setCurrentPage(1) }}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Filière" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les filieres</SelectItem>
                {filieres.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={niveauFilter} onValueChange={(v) => { setNiveauFilter(v); setCurrentPage(1) }}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Niveau" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les niveaux</SelectItem>
                {niveaux.map((n) => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statutFilter} onValueChange={(v) => { setStatutFilter(v); setCurrentPage(1) }}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50">
                  <TableHead className="text-xs font-semibold text-gray-500 uppercase">Matricule</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-500 uppercase">Nom</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-500 uppercase">Prénom</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-500 uppercase">Filière</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-500 uppercase">Niveau</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-500 uppercase">Statut</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-500 uppercase text-center">Credits</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-500 uppercase text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedStudents.map((student: StudentRow, i: number) => {
                  const status = statusConfig[student.statut] || statusConfig.PRE_INSCRIT
                  return (
                  <motion.tr
                    key={student.id}
                    custom={i}
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    className={`cursor-pointer transition-all duration-200 border-b border-gray-50 group ${
                      i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    } hover:bg-gradient-to-r hover:from-[var(--institution-secondary-08)] hover:via-[var(--institution-secondary-04)] hover:to-[var(--institution-primary-08)]`}
                    onClick={() => handleRowClick(student.id)}
                  >
                    <TableCell className="text-xs font-mono text-gray-600 py-3">{student.matricule}</TableCell>
                    <TableCell className="text-sm font-medium text-[var(--institution-primary)] py-3">{student.nom}</TableCell>
                    <TableCell className="text-sm text-gray-700 py-3">{student.prenom}</TableCell>
                    <TableCell className="text-sm text-gray-600 py-3">{student.filiere}</TableCell>
                    <TableCell className="text-sm text-gray-600 py-3">{student.niveau}</TableCell>
                    <TableCell className="py-3">
                      <Badge className={`text-[10px] px-2 py-0.5 font-medium ${status.className}`}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-center font-medium text-[var(--institution-primary)] py-3">{student.credits}</TableCell>
                    <TableCell className="text-right py-3 whitespace-nowrap">
                      {canManageStudents && <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 opacity-50 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); handleRowClick(student.id) }}
                        title="Voir le dossier"
                      >
                        <Eye className="size-3.5 text-gray-400" />
                      </Button>}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 opacity-50 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); openEditStudent(student) }}
                        title="Modifier le dossier"
                      >
                        <Pencil className="size-3.5 text-gray-400" />
                      </Button>
                      {canManageStudents && (student.statut === 'SUSPENDU' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 opacity-50 group-hover:opacity-100 transition-opacity"
                          disabled={isChangingStatus}
                          onClick={(e) => { e.stopPropagation(); handleReactivateStudent(student) }}
                          title="Réactiver"
                        >
                          <RotateCcw className="size-3.5 text-[var(--institution-secondary)]" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 opacity-50 group-hover:opacity-100 transition-opacity"
                          disabled={isChangingStatus}
                          onClick={(e) => { e.stopPropagation(); handleSuspendStudent(student) }}
                          title="Suspendre"
                        >
                          <Trash2 className="size-3.5 text-[#c62828]" />
                        </Button>
                      ))}
                    </TableCell>
                  </motion.tr>
                )})}
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-sm text-gray-400">Chargement...</TableCell>
                  </TableRow>
                )}
                {!isLoading && paginatedStudents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-sm text-gray-400">Aucun étudiant trouvé</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Affichage {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredStudents.length)} sur {filteredStudents.length}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={page === currentPage ? 'default' : 'outline'}
                  size="sm"
                  className={`h-8 w-8 p-0 text-xs ${page === currentPage ? 'bg-[var(--institution-secondary)] hover:bg-[var(--institution-secondary-dark)]' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={currentPage === safeTotalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* New student dialog */}
      <Dialog open={showCreate} onOpenChange={(o) => { setShowCreate(o); if (!o) setForm(emptyStudentForm) }}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[var(--institution-primary)]">Nouvel étudiant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Nom</Label>
                <Input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Prénom</Label>
                <Input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Sexe</Label>
                <Select value={form.gender} onValueChange={(v) => setForm((f) => ({ ...f, gender: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculin</SelectItem>
                    <SelectItem value="F">Feminin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Nationalite</Label>
                <Input value={form.nationality} onChange={(e) => setForm((f) => ({ ...f, nationality: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Date de naissance</Label>
                <Input type="date" value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Lieu de naissance</Label>
                <Input value={form.placeOfBirth} onChange={(e) => setForm((f) => ({ ...f, placeOfBirth: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Filière</Label>
                <Select value={form.currentProgramId} onValueChange={(v) => setForm((f) => ({ ...f, currentProgramId: v, currentLevelId: '' }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {realPrograms.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Niveau</Label>
                <Select value={form.currentLevelId} onValueChange={(v) => setForm((f) => ({ ...f, currentLevelId: v }))} disabled={!form.currentProgramId}>
                  <SelectTrigger><SelectValue placeholder={form.currentProgramId ? 'Sélectionner' : "Choisir d’abord une filière"} /></SelectTrigger>
                  <SelectContent>
                    {selectedProgramLevels.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Email (optionnel)</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Telephone (optionnel)</Label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Statut initial du dossier</Label>
              <Select value={form.status} onValueChange={(status) => setForm((f) => ({ ...f, status }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRE_INSCRIT">Pré-inscrit - dossier à compléter</SelectItem>
                  <SelectItem value="INSCRIT">Inscrit - dossier vérifié</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-700">L’inscription à l’année académique se valide ensuite dans le dossier, onglet Inscriptions.</p>
            </div>
            <p className="text-xs text-slate-700">Le matricule est généré automatiquement. Un compte étudiant (matricule et code PIN) est créé avec le dossier.</p>
            <div className="space-y-1.5">
              <Label htmlFor="new-student-photo" className="text-sm">Photo d’identité (optionnelle, affichée sur le relevé)</Label>
              <Input id="new-student-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => handlePhotoSelection(event.target.files?.[0])} />
              {form.photo && <p className="text-xs text-emerald-700">Photo prête à enregistrer.</p>}
            </div>
            <Button className="w-full bg-[var(--institution-secondary)] hover:bg-[var(--institution-secondary-dark)] text-white" disabled={isCreating} onClick={handleCreateStudent}>
              {isCreating ? 'Enregistrement…' : 'Enregistrer l’étudiant'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit student dialog */}
      <Dialog open={Boolean(editingStudent)} onOpenChange={(o) => { if (!o) closeEditDialog() }}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[var(--institution-primary)]">Modifier le dossier étudiant</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Nom</Label>
                <Input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Prénom</Label>
                <Input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Sexe</Label>
                <Select value={form.gender} onValueChange={(v) => setForm((f) => ({ ...f, gender: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculin</SelectItem>
                    <SelectItem value="F">Feminin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Statut administratif</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}
                  disabled={editingStudent ? !['INSCRIT', 'PRE_INSCRIT'].includes(editingStudent.statut) : false}
                >
                  <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRE_INSCRIT">Pré-inscrit</SelectItem>
                    <SelectItem value="INSCRIT">Inscrit</SelectItem>
                  </SelectContent>
                </Select>
                {editingStudent && !['INSCRIT', 'PRE_INSCRIT'].includes(editingStudent.statut) && (
                  <p className="text-[11px] text-gray-400">Utilisez l&apos;action Réactiver pour changer ce statut.</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Date de naissance</Label>
                <Input type="date" value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Lieu de naissance</Label>
                <Input value={form.placeOfBirth} onChange={(e) => setForm((f) => ({ ...f, placeOfBirth: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Filière</Label>
                <Select value={form.currentProgramId} onValueChange={(v) => setForm((f) => ({ ...f, currentProgramId: v, currentLevelId: '' }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {realPrograms.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Niveau</Label>
                <Select value={form.currentLevelId} onValueChange={(v) => setForm((f) => ({ ...f, currentLevelId: v }))} disabled={!form.currentProgramId}>
                  <SelectTrigger><SelectValue placeholder={form.currentProgramId ? 'Sélectionner' : "Choisir d’abord une filière"} /></SelectTrigger>
                  <SelectContent>
                    {selectedProgramLevels.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Telephone</Label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Nationalite</Label>
                <Input value={form.nationality} onChange={(e) => setForm((f) => ({ ...f, nationality: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Annee du bac</Label>
                <Input type="number" min="1990" max="2030" value={form.bacYear} onChange={(e) => setForm((f) => ({ ...f, bacYear: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-student-photo" className="text-sm">Remplacer la photo d’identité (optionnel)</Label>
              <Input id="edit-student-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => handlePhotoSelection(event.target.files?.[0])} />
              <p className="text-xs text-slate-700">Sans nouveau fichier, la photo existante est conservée. Elle figure sur le relevé de notes.</p>
              {form.photo && <p className="text-xs text-emerald-700">Nouvelle photo prête à enregistrer.</p>}
            </div>
            <Button className="w-full bg-[var(--institution-secondary)] hover:bg-[var(--institution-secondary-dark)] text-white" disabled={isUpdating} onClick={handleUpdateStudent}>
              {isUpdating ? 'Mise à jour…' : 'Enregistrer les modifications'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* One-time portal credentials reveal */}
      <Dialog open={Boolean(createdCredentials)} onOpenChange={(o) => { if (!o) setCreatedCredentials(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Étudiant enregistré</DialogTitle>
          </DialogHeader>
          {createdCredentials && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-gray-600">
                Le compte Espace Étudiant de <span className="font-semibold text-[var(--institution-primary)]">{createdCredentials.name}</span> est prêt.
                Transmettez ces identifiants — le code PIN ne sera plus jamais affiché.
              </p>
              <div className="rounded-lg border bg-gray-50 p-3 space-y-2">
                <div>
                  <p className="text-[10px] text-gray-400">Matricule / Identifiant</p>
                  <p className="text-sm font-mono text-[var(--institution-primary)]">{createdCredentials.login}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">Code PIN</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono font-semibold text-[var(--institution-secondary)]">{createdCredentials.pin}</p>
                    <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={copyPin}>
                      <Copy className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
              <Button className="w-full" variant="outline" onClick={() => setCreatedCredentials(null)}>Fermer</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
