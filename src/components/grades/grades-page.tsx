'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
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
  FileCheck,
  Lock,
  Unlock,
  Download,
  Upload,
  Save,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  ClipboardList,
  GraduationCap,
  Clock,
  Pencil,
  TrendingUp,
} from 'lucide-react'
import { useStructure, useStudents, useDashboardStats } from '@/lib/api-hooks'
import { exportToExcel, parseExcelFile } from '@/lib/export'

// ─── Types ──────────────────────────────────────────────────────────────────

interface GradeEntry {
  studentId: string
  gradeId: string | null
  matricule: string
  nom: string
  prenom: string
  cc: string
  exam: string
  tp: string
  moyenne: number | null
  isLocked: boolean
  observation: string
}

interface FlatUE {
  teachingUnitId: string
  courseElementId: string | null
  code: string
  name: string
  semesterId: string
  semesterName: string
  levelId: string
  levelName: string
  programId: string
  programName: string
}

type LocalEdit = { cc?: string; exam?: string; tp?: string; observation?: string }

// ─── Helpers ────────────────────────────────────────────────────────────────

function flattenTeachingUnits(faculties: any[]): FlatUE[] {
  const result: FlatUE[] = []
  for (const faculty of faculties || []) {
    for (const dept of faculty.departments || []) {
      for (const program of dept.programs || []) {
        for (const level of program.levels || []) {
          for (const semester of level.semesters || []) {
            for (const tu of semester.teachingUnits || []) {
              result.push({
                teachingUnitId: tu.id,
                courseElementId: tu.courseElements?.[0]?.id || null,
                code: tu.code || tu.id,
                name: tu.name,
                semesterId: semester.id,
                semesterName: semester.name,
                levelId: level.id,
                levelName: level.name,
                programId: program.id,
                programName: program.name,
              })
            }
          }
        }
      }
    }
  }
  return result
}

function computeMoyenne(cc: string, exam: string, tp: string): number | null {
  if (cc === '' || exam === '') return null
  const ccN = parseFloat(cc) || 0
  const examN = parseFloat(exam) || 0
  const tpN = parseFloat(tp)
  if (tp !== '' && !isNaN(tpN)) {
    return parseFloat((ccN * 0.3 + examN * 0.5 + tpN * 0.2).toFixed(1))
  }
  return parseFloat((ccN * 0.4 + examN * 0.6).toFixed(1))
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GradesPage() {
  const queryClient = useQueryClient()

  const { data: structureQuery, isLoading: structureLoading } = useStructure()
  const { data: dashboardQuery } = useDashboardStats()
  const academicYearId: string | undefined = dashboardQuery?.currentAcademicYear?.id

  const ueList = useMemo(() => flattenTeachingUnits(structureQuery?.faculties || []), [structureQuery])

  const [selectedUE, setSelectedUE] = useState<string>('')
  useEffect(() => {
    if (!selectedUE && ueList.length > 0) setSelectedUE(ueList[0].teachingUnitId)
  }, [ueList, selectedUE])

  const currentUE = ueList.find(u => u.teachingUnitId === selectedUE)

  const [selectedSession, setSelectedSession] = useState<'normale' | 'rattrapage'>('normale')
  const apiSession = selectedSession === 'rattrapage' ? 'RATTRAPAGE' : 'NORMALE'

  const [editingLocked, setEditingLocked] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)
  const [localEdits, setLocalEdits] = useState<Record<string, LocalEdit>>({})
  const [saving, setSaving] = useState(false)
  const [validatingId, setValidatingId] = useState<string | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  const { data: studentsQuery, isLoading: studentsLoading } = useStudents({
    programId: currentUE?.programId,
    levelId: currentUE?.levelId,
    limit: 1000,
  })

  const { data: gradesQuery, isLoading: gradesLoading } = useQuery({
    queryKey: ['grades', selectedUE, apiSession, academicYearId],
    queryFn: async () => {
      const params = new URLSearchParams({ teachingUnitId: selectedUE, session: apiSession, limit: '500' })
      if (academicYearId) params.set('academicYearId', academicYearId)
      const res = await fetch(`/api/grades?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch grades')
      return res.json()
    },
    enabled: !!selectedUE,
  })

  const dataLoading = structureLoading || studentsLoading || gradesLoading

  const grades: GradeEntry[] = useMemo(() => {
    const students = studentsQuery?.data || []
    const existingByStudent = new Map<string, any>()
    for (const g of gradesQuery?.data || []) existingByStudent.set(g.studentId, g)

    return students.map((s: any) => {
      const existing = existingByStudent.get(s.id)
      const edit = localEdits[s.id] || {}
      const cc = edit.cc !== undefined ? edit.cc : (existing?.ccGrade != null ? String(existing.ccGrade) : '')
      const exam = edit.exam !== undefined ? edit.exam : (existing?.examGrade != null ? String(existing.examGrade) : '')
      const tp = edit.tp !== undefined ? edit.tp : (existing?.tpGrade != null ? String(existing.tpGrade) : '')
      const observation = edit.observation !== undefined ? edit.observation : (existing?.comment || '')
      const hasLocalEdit = edit.cc !== undefined || edit.exam !== undefined || edit.tp !== undefined
      const moyenne = hasLocalEdit ? computeMoyenne(cc, exam, tp) : (existing?.finalGrade ?? computeMoyenne(cc, exam, tp))

      return {
        studentId: s.id,
        gradeId: existing?.id ?? null,
        matricule: s.matricule || '',
        nom: s.lastName,
        prenom: s.firstName,
        cc, exam, tp, observation,
        moyenne,
        isLocked: existing?.isLocked ?? false,
      } as GradeEntry
    })
  }, [studentsQuery, gradesQuery, localEdits])

  const handleGradeChange = (studentId: string, field: 'cc' | 'exam' | 'tp', value: string) => {
    setLocalEdits(prev => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }))
  }

  const handleObservationChange = (studentId: string, value: string) => {
    setLocalEdits(prev => ({ ...prev, [studentId]: { ...prev[studentId], observation: value } }))
  }

  const refetchGrades = () => queryClient.invalidateQueries({ queryKey: ['grades', selectedUE, apiSession, academicYearId] })

  const handleSave = async () => {
    if (!currentUE) return
    if (!currentUE.courseElementId) {
      toast.error("Aucun élément constitutif (ECUE) configuré pour cette UE", { description: "Impossible d'enregistrer des notes sans ECUE." })
      return
    }
    if (!academicYearId) {
      toast.error("Année académique courante introuvable")
      return
    }
    const toSave = grades.filter(g => g.moyenne !== null)
    if (toSave.length === 0) {
      toast.info('Aucune note à enregistrer')
      return
    }
    setSaving(true)
    try {
      const payload = {
        academicYearId,
        session: apiSession,
        grades: toSave.map(g => ({
          studentId: g.studentId,
          teachingUnitId: currentUE.teachingUnitId,
          courseElementId: currentUE.courseElementId,
          academicYearId,
          session: apiSession,
          ccGrade: g.cc !== '' ? parseFloat(g.cc) : undefined,
          examGrade: g.exam !== '' ? parseFloat(g.exam) : undefined,
          tpGrade: g.tp !== '' ? parseFloat(g.tp) : undefined,
          comment: g.observation || undefined,
        })),
      }
      const res = await fetch('/api/grades?action=bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Échec de l'enregistrement")
      const r = data.data
      toast.success('Notes enregistrées', {
        description: `${r.created} créées, ${r.updated} mises à jour${r.errors?.length ? `, ${r.errors.length} erreur(s)` : ''}`,
      })
      setLocalEdits({})
      refetchGrades()
    } catch (e) {
      toast.error('Erreur', { description: e instanceof Error ? e.message : "Échec de l'enregistrement" })
    } finally {
      setSaving(false)
    }
  }

  const lockGrade = async (gradeId: string) => {
    const res = await fetch(`/api/grades?action=lock&id=${gradeId}&lock=true`, { method: 'POST' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Échec de la validation')
    }
  }

  const handleValidateGrade = async (gradeId: string | null) => {
    if (!gradeId) {
      toast.error('Enregistrez la note avant de la valider')
      return
    }
    setValidatingId(gradeId)
    try {
      await lockGrade(gradeId)
      toast.success('Note validée')
      refetchGrades()
    } catch (e) {
      toast.error('Erreur', { description: e instanceof Error ? e.message : 'Échec de la validation' })
    } finally {
      setValidatingId(null)
    }
  }

  const handleValidateAll = async () => {
    const toValidate = grades.filter(g => g.gradeId && g.moyenne !== null && !g.isLocked)
    if (toValidate.length === 0) {
      toast.info('Aucune note à valider')
      return
    }
    setValidatingId('all')
    try {
      const results = await Promise.allSettled(toValidate.map(g => lockGrade(g.gradeId as string)))
      const failed = results.filter(r => r.status === 'rejected').length
      toast.success('Validation terminée', {
        description: `${toValidate.length - failed} note(s) validée(s)${failed ? `, ${failed} échec(s)` : ''}`,
      })
      refetchGrades()
    } finally {
      setValidatingId(null)
    }
  }

  const handleExport = () => {
    if (grades.length === 0) {
      toast.info('Aucune donnée à exporter')
      return
    }
    exportToExcel(
      grades.map(g => ({
        Matricule: g.matricule,
        Nom: g.nom,
        Prenom: g.prenom,
        CC: g.cc,
        Examen: g.exam,
        TP: g.tp,
        Moyenne: g.moyenne ?? '',
        Statut: g.isLocked ? 'Valide' : (g.moyenne !== null ? 'A valider' : '-'),
      })),
      `notes_${currentUE?.code || 'export'}`
    )
    toast.success('Export généré')
  }

  const handleImportClick = () => importInputRef.current?.click()

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const rows = await parseExcelFile(file) as Record<string, unknown>[]
      const byMatricule = new Map(grades.map(g => [g.matricule, g]))
      const edits: Record<string, LocalEdit> = {}
      let matched = 0
      for (const row of rows) {
        const matricule = String(row['Matricule'] ?? row['matricule'] ?? '').trim()
        if (!matricule) continue
        const student = byMatricule.get(matricule)
        if (!student) continue
        matched++
        edits[student.studentId] = {
          cc: row['CC'] !== undefined ? String(row['CC']) : undefined,
          exam: row['Examen'] !== undefined ? String(row['Examen']) : (row['Exam'] !== undefined ? String(row['Exam']) : undefined),
          tp: row['TP'] !== undefined ? String(row['TP']) : undefined,
        }
      }
      setLocalEdits(prev => ({ ...prev, ...edits }))
      toast.success('Fichier importé', { description: `${matched} étudiant(s) mis à jour sur ${rows.length} ligne(s) lues. Cliquez sur Enregistrer pour sauvegarder.` })
    } catch (err) {
      toast.error('Erreur import', { description: err instanceof Error ? err.message : 'Fichier illisible' })
    }
  }

  // ─── Computed Stats ──────────────────────────────────────────────────────
  const validGrades = grades.filter(g => g.moyenne !== null)
  const validCount = validGrades.filter(g => g.moyenne! >= 10).length
  const classAverage = validGrades.length > 0
    ? validGrades.reduce((acc, g) => acc + (g.moyenne || 0), 0) / validGrades.length
    : 0
  const validationRate = validGrades.length > 0
    ? Math.round((validCount / validGrades.length) * 100)
    : 0
  const pendingValidation = grades.filter(g => g.moyenne !== null && !g.isLocked).length
  const notesSaisies = validGrades.length
  const notesAttendues = grades.length

  // ─── Distribution ────────────────────────────────────────────────────────
  const distribution = useMemo(() => {
    const ranges = [
      { label: '0-5', min: 0, max: 5, color: '#c62828', count: 0 },
      { label: '5-8', min: 5, max: 8, color: '#e53935', count: 0 },
      { label: '8-10', min: 8, max: 10, color: '#f9a825', count: 0 },
      { label: '10-12', min: 10, max: 12, color: '#66bb6a', count: 0 },
      { label: '12-14', min: 12, max: 14, color: '#2d7a4f', count: 0 },
      { label: '14-16', min: 14, max: 16, color: '#1a2744', count: 0 },
      { label: '16-20', min: 16, max: 20.01, color: '#1a2744', count: 0 },
    ]
    validGrades.forEach(g => {
      const m = g.moyenne!
      for (const range of ranges) {
        if (m >= range.min && (m < range.max || (range.label === '16-20' && m <= 20))) {
          range.count++
          break
        }
      }
    })
    return ranges
  }, [validGrades])

  const hasTP = grades.some(g => g.tp && g.tp !== '')
  const maxDistCount = Math.max(...distribution.map(d => d.count), 1)

  // ─── Mediane & ecart-type ───────────────────────────────────────────────
  const mediane = useMemo(() => {
    const sorted = validGrades.map(g => g.moyenne!).sort((a, b) => a - b)
    if (sorted.length === 0) return 0
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  }, [validGrades])

  const ecartType = useMemo(() => {
    if (validGrades.length === 0) return 0
    const mean = classAverage
    const variance = validGrades.reduce((acc, g) => acc + Math.pow((g.moyenne || 0) - mean, 2), 0) / validGrades.length
    return Math.sqrt(variance)
  }, [validGrades, classAverage])

  // ─── Color Helpers ──────────────────────────────────────────────────────
  const getGradeBgColor = (moyenne: number | null) => {
    if (moyenne === null) return ''
    if (moyenne >= 10) return 'bg-[#2d7a4f10]'
    if (moyenne >= 8) return 'bg-[#f9a82510]'
    return 'bg-[#c6282810]'
  }

  const getGradeTextColor = (moyenne: number | null) => {
    if (moyenne === null) return 'text-gray-300'
    if (moyenne >= 10) return 'text-[#2d7a4f]'
    if (moyenne >= 8) return 'text-[#f9a825]'
    return 'text-[#c62828]'
  }

  return (
    <div className="space-y-5">
      <input ref={importInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportFile} />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-xl font-bold text-[#1a2744]">Gestion des notes</h1>
          <p className="text-sm text-gray-500">Saisie, calcul et validation des notes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={handleImportClick}>
            <Upload className="size-3.5 mr-1.5" />
            Importer Excel
          </Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={handleExport}>
            <Download className="size-3.5 mr-1.5" />
            Exporter
          </Button>
          <Button size="sm" className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs" disabled={saving} onClick={handleSave}>
            <Save className="size-3.5 mr-1.5" />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </motion.div>

      {/* ─── Enhanced Stats Cards ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        {/* Notes saisies / Notes attendues */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-[#1a274410]">
                <ClipboardList className="size-4 text-[#1a2744]" />
              </div>
              <Badge className="text-[10px] bg-[#1a274410] text-[#1a2744] border-0">
                {notesAttendues} attendues
              </Badge>
            </div>
            <p className="text-2xl font-bold text-[#1a2744]">{notesSaisies}</p>
            <p className="text-xs text-gray-500 mt-1">Notes saisies</p>
            <Progress
              value={notesAttendues > 0 ? (notesSaisies / notesAttendues) * 100 : 0}
              className="h-1.5 mt-2"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              {notesAttendues > 0 ? Math.round((notesSaisies / notesAttendues) * 100) : 0}% complete
            </p>
          </CardContent>
        </Card>

        {/* Moyenne generale */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-[#d4a85310]">
                <TrendingUp className="size-4 text-[#d4a853]" />
              </div>
              <Badge className={`text-[10px] border-0 ${classAverage >= 10 ? 'bg-[#2d7a4f10] text-[#2d7a4f]' : 'bg-[#c6282810] text-[#c62828]'}`}>
                {classAverage >= 10 ? 'Au-dessus' : 'En dessous'}
              </Badge>
            </div>
            <p className="text-2xl font-bold text-[#d4a853]">{classAverage.toFixed(1)}</p>
            <p className="text-xs text-gray-500 mt-1">Moyenne generale</p>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#d4a853] rounded-full transition-all"
                style={{ width: `${(classAverage / 20) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">sur 20</p>
          </CardContent>
        </Card>

        {/* Taux de validation */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-[#2d7a4f10]">
                <GraduationCap className="size-4 text-[#2d7a4f]" />
              </div>
              <Badge className="text-[10px] bg-[#2d7a4f10] text-[#2d7a4f] border-0">
                {validCount} etudiants
              </Badge>
            </div>
            <p className="text-2xl font-bold text-[#2d7a4f]">{validationRate}%</p>
            <p className="text-xs text-gray-500 mt-1">Taux de validation</p>
            <Progress
              value={validationRate}
              className="h-1.5 mt-2"
            />
            <p className="text-[10px] text-gray-400 mt-1">{validCount} / {validGrades.length} valides</p>
          </CardContent>
        </Card>

        {/* Notes en attente de validation */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-[#c6282810]">
                <Clock className="size-4 text-[#c62828]" />
              </div>
              <Badge className="text-[10px] bg-[#c6282810] text-[#c62828] border-0">
                {pendingValidation > 0 ? 'Action requise' : 'A jour'}
              </Badge>
            </div>
            <p className="text-2xl font-bold text-[#c62828]">{pendingValidation}</p>
            <p className="text-xs text-gray-500 mt-1">En attente de validation</p>
            <Progress
              value={notesSaisies > 0 ? ((notesSaisies - pendingValidation) / notesSaisies) * 100 : 100}
              className="h-1.5 mt-2"
            />
            <p className="text-[10px] text-gray-400 mt-1">{notesSaisies - pendingValidation} validees</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Grade Entry Card ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="border-l-4 border-l-[#1a2744]">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Pencil className="size-4 text-[#1a2744]" />
                <CardTitle className="text-sm font-semibold text-[#1a2744]">
                  Saisie des notes
                </CardTitle>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch
                    id="bulk-mode"
                    checked={bulkMode}
                    onCheckedChange={setBulkMode}
                  />
                  <Label htmlFor="bulk-mode" className="text-xs text-gray-600 cursor-pointer">
                    Mode saisie en masse
                  </Label>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600">UE / ECUE</Label>
                <Select value={selectedUE} onValueChange={setSelectedUE} disabled={ueList.length === 0}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={structureLoading ? 'Chargement...' : "Unite d'enseignement"} />
                  </SelectTrigger>
                  <SelectContent>
                    {ueList.map(ue => (
                      <SelectItem key={ue.teachingUnitId} value={ue.teachingUnitId}>
                        {ue.code} - {ue.name} ({ue.programName} {ue.levelName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600">Session</Label>
                <Select value={selectedSession} onValueChange={(v) => setSelectedSession(v as 'normale' | 'rattrapage')}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Session" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normale">Session Normale</SelectItem>
                    <SelectItem value="rattrapage">Session de Rattrapage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {currentUE && !currentUE.courseElementId && (
              <div className="p-3 bg-[#c6282808] border border-[#c6282815] rounded-lg">
                <p className="text-xs text-[#c62828] font-medium flex items-center gap-1.5">
                  <AlertCircle className="size-3.5" />
                  Aucun élément constitutif (ECUE) n&apos;est configuré pour cette UE — la saisie de notes n&apos;est pas possible tant qu&apos;un ECUE n&apos;a pas été créé.
                </p>
              </div>
            )}

            {/* Bulk entry note */}
            {bulkMode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 bg-[#1a274408] border border-[#1a274415] rounded-lg"
              >
                <p className="text-xs text-[#1a2744] font-medium flex items-center gap-1.5">
                  <AlertCircle className="size-3.5" />
                  Mode saisie en masse active : les notes sont appliquees automatiquement en passant a la ligne suivante.
                </p>
              </motion.div>
            )}

            {/* Grade Entry Table */}
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#1a274405]">
                    <TableHead className="text-xs font-semibold text-gray-500 w-8">#</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500">Etudiant</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 text-center w-24">Note /20</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 w-40">Observation</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 text-center w-24">Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataLoading && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-sm text-gray-400">Chargement...</TableCell>
                    </TableRow>
                  )}
                  {!dataLoading && grades.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-sm text-gray-400">Aucun étudiant inscrit dans ce programme/niveau</TableCell>
                    </TableRow>
                  )}
                  {!dataLoading && grades.map((grade, i) => (
                    <TableRow key={grade.studentId} className={`hover:bg-gray-50/50 ${getGradeBgColor(grade.moyenne)}`}>
                      <TableCell className="text-xs text-gray-400 py-2">{i + 1}</TableCell>
                      <TableCell className="py-2">
                        <div>
                          <p className="text-sm font-medium text-[#1a2744]">{grade.nom} {grade.prenom}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{grade.matricule}</p>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <Input
                          type="number"
                          min="0"
                          max="20"
                          step="0.5"
                          value={grade.moyenne !== null ? grade.moyenne : ''}
                          readOnly
                          disabled={editingLocked}
                          className={`h-8 text-center text-sm font-bold w-20 mx-auto disabled:bg-gray-50 ${grade.moyenne !== null ? getGradeTextColor(grade.moyenne) : ''}`}
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        <Input
                          value={grade.observation}
                          onChange={(e) => handleObservationChange(grade.studentId, e.target.value)}
                          disabled={editingLocked}
                          placeholder="Observation..."
                          className="h-8 text-xs disabled:bg-gray-50"
                        />
                      </TableCell>
                      <TableCell className="py-2 text-center">
                        {grade.moyenne !== null ? (
                          grade.isLocked ? (
                            <Badge className="text-[10px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">Valide</Badge>
                          ) : grade.moyenne >= 10 ? (
                            <Badge className="text-[10px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">A valider</Badge>
                          ) : grade.moyenne >= 8 ? (
                            <Badge className="text-[10px] bg-[#f9a82515] text-[#f9a825] border-0">Compense</Badge>
                          ) : (
                            <Badge className="text-[10px] bg-[#c6282815] text-[#c62828] border-0">Echec</Badge>
                          )
                        ) : (
                          <Badge className="text-[10px] bg-gray-100 text-gray-400 border-0">-</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant={editingLocked ? 'outline' : 'default'}
                  size="sm"
                  className={`text-xs ${editingLocked ? '' : 'bg-[#d4a853] hover:bg-[#c49a48] text-white'}`}
                  onClick={() => setEditingLocked(!editingLocked)}
                >
                  {editingLocked ? (
                    <Unlock className="size-3.5 mr-1.5" />
                  ) : (
                    <Lock className="size-3.5 mr-1.5" />
                  )}
                  {editingLocked ? 'Deverrouiller' : 'Verrouiller'}
                </Button>
                {editingLocked && (
                  <Badge className="text-[10px] bg-[#c6282815] text-[#c62828] border-0">
                    <Lock className="size-3 mr-1" />
                    Verrouille
                  </Badge>
                )}
              </div>
              <Button
                size="sm"
                className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs"
                disabled={editingLocked || saving}
                onClick={handleSave}
              >
                <Save className="size-3.5 mr-1.5" />
                {saving ? 'Enregistrement...' : 'Enregistrer les notes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Grade Statistics Card ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <Card className="border-l-4 border-l-[#d4a853]">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-[#d4a853]" />
              <CardTitle className="text-sm font-semibold text-[#1a2744]">
                Statistiques des notes
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Distribution Chart */}
              <div className="lg:col-span-2 space-y-3">
                <p className="text-xs font-medium text-gray-500 uppercase">Distribution des notes</p>
                <div className="space-y-2">
                  {distribution.map((range) => (
                    <div key={range.label} className="flex items-center gap-3">
                      <span className="text-xs font-mono text-gray-500 w-10 text-right">{range.label}</span>
                      <div className="flex-1 h-7 bg-gray-50 rounded-md overflow-hidden relative">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(range.count / maxDistCount) * 100}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className="h-full rounded-md flex items-center px-2"
                          style={{ backgroundColor: range.color + '25' }}
                        >
                          <span className="text-[10px] font-bold" style={{ color: range.color }}>
                            {range.count}
                          </span>
                        </motion.div>
                      </div>
                      <span className="text-xs text-gray-400 w-8">
                        {validGrades.length > 0 ? Math.round((range.count / validGrades.length) * 100) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
                {/* Color Legend */}
                <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-[#c6282825]" />
                    <span className="text-[10px] text-gray-500">&lt; 8 (Echec)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-[#f9a82525]" />
                    <span className="text-[10px] text-gray-500">8-10 (Compensation)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-[#2d7a4f25]" />
                    <span className="text-[10px] text-gray-500">&ge; 10 (Valide)</span>
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-gray-500 uppercase">Indicateurs</p>
                <div className="space-y-3">
                  <div className="p-3 bg-[#d4a85308] rounded-lg border border-[#d4a85315]">
                    <p className="text-[10px] text-gray-500 uppercase">Moyenne</p>
                    <p className="text-xl font-bold text-[#d4a853]">{classAverage.toFixed(2)}</p>
                    <p className="text-[10px] text-gray-400">/ 20</p>
                  </div>
                  <div className="p-3 bg-[#1a274408] rounded-lg border border-[#1a274415]">
                    <p className="text-[10px] text-gray-500 uppercase">Mediane</p>
                    <p className="text-xl font-bold text-[#1a2744]">{mediane.toFixed(2)}</p>
                    <p className="text-[10px] text-gray-400">/ 20</p>
                  </div>
                  <div className="p-3 bg-[#2d7a4f08] rounded-lg border border-[#2d7a4f15]">
                    <p className="text-[10px] text-gray-500 uppercase">Ecart-type</p>
                    <p className="text-xl font-bold text-[#2d7a4f]">{ecartType.toFixed(2)}</p>
                    <p className="text-[10px] text-gray-400">dispersion</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-[#2d7a4f08] rounded-lg text-center">
                      <p className="text-[10px] text-gray-500">Note max</p>
                      <p className="text-sm font-bold text-[#2d7a4f]">
                        {validGrades.length > 0 ? Math.max(...validGrades.map(g => g.moyenne!)).toFixed(1) : '-'}
                      </p>
                    </div>
                    <div className="p-2 bg-[#c6282808] rounded-lg text-center">
                      <p className="text-[10px] text-gray-500">Note min</p>
                      <p className="text-sm font-bold text-[#c62828]">
                        {validGrades.length > 0 ? Math.min(...validGrades.map(g => g.moyenne!)).toFixed(1) : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Enhanced Grade Table ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileCheck className="size-4 text-[#1a2744]" />
                <CardTitle className="text-sm font-semibold text-[#1a2744]">
                  {currentUE ? `${currentUE.code} - ${currentUE.name}` : 'Aucune UE sélectionnée'}
                </CardTitle>
                {editingLocked && (
                  <Badge className="text-[10px] bg-[#c6282815] text-[#c62828] border-0">
                    <Lock className="size-3 mr-1" />
                    Verrouille
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-xs" onClick={handleExport}>
                  <Download className="size-3.5 mr-1.5" />
                  Exporter
                </Button>
                <Button
                  size="sm"
                  className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs"
                  disabled={validatingId === 'all'}
                  onClick={handleValidateAll}
                >
                  <CheckCircle2 className="size-3.5 mr-1.5" />
                  {validatingId === 'all' ? 'Validation...' : 'Valider tout'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs font-semibold text-gray-500 w-8">#</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500">Matricule</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500">Nom Prenom</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 text-center w-24">CC ({hasTP ? '30%' : '40%'})</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 text-center w-24">Exam ({hasTP ? '50%' : '60%'})</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 text-center w-24">TP</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 text-center w-24">Moyenne</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 text-center w-20">Statut</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 text-center w-24">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataLoading && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-sm text-gray-400">Chargement...</TableCell>
                    </TableRow>
                  )}
                  {!dataLoading && grades.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-sm text-gray-400">Aucun étudiant inscrit dans ce programme/niveau</TableCell>
                    </TableRow>
                  )}
                  {!dataLoading && grades.map((grade, i) => (
                    <TableRow key={grade.studentId} className={`hover:bg-gray-50/50 ${getGradeBgColor(grade.moyenne)}`}>
                      <TableCell className="text-xs text-gray-400 py-2">{i + 1}</TableCell>
                      <TableCell className="text-xs font-mono text-gray-600 py-2">{grade.matricule}</TableCell>
                      <TableCell className="text-sm font-medium text-[#1a2744] py-2">
                        {grade.nom} {grade.prenom}
                      </TableCell>
                      <TableCell className="py-2">
                        <Input
                          type="number"
                          min="0"
                          max="20"
                          step="0.5"
                          value={grade.cc}
                          onChange={(e) => handleGradeChange(grade.studentId, 'cc', e.target.value)}
                          disabled={editingLocked || grade.isLocked}
                          className="h-8 text-center text-sm w-20 mx-auto disabled:bg-gray-50"
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        <Input
                          type="number"
                          min="0"
                          max="20"
                          step="0.5"
                          value={grade.exam}
                          onChange={(e) => handleGradeChange(grade.studentId, 'exam', e.target.value)}
                          disabled={editingLocked || grade.isLocked}
                          className="h-8 text-center text-sm w-20 mx-auto disabled:bg-gray-50"
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        <Input
                          type="number"
                          min="0"
                          max="20"
                          step="0.5"
                          value={grade.tp}
                          onChange={(e) => handleGradeChange(grade.studentId, 'tp', e.target.value)}
                          disabled={editingLocked || grade.isLocked}
                          placeholder="-"
                          className="h-8 text-center text-sm w-20 mx-auto disabled:bg-gray-50"
                        />
                      </TableCell>
                      <TableCell className="py-2 text-center">
                        <span className={`text-sm font-bold ${getGradeTextColor(grade.moyenne)}`}>
                          {grade.moyenne !== null ? grade.moyenne.toFixed(1) : '-'}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 text-center">
                        {grade.moyenne !== null ? (
                          grade.moyenne >= 10 ? (
                            <CheckCircle2 className="size-4 text-[#2d7a4f] mx-auto" />
                          ) : (
                            <AlertCircle className="size-4 text-[#c62828] mx-auto" />
                          )
                        ) : (
                          <span className="text-xs text-gray-300">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2 text-center">
                        {!grade.isLocked && grade.moyenne !== null ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[10px] text-[#2d7a4f] hover:text-[#236b40] hover:bg-[#2d7a4f10]"
                            disabled={validatingId === grade.gradeId}
                            onClick={() => handleValidateGrade(grade.gradeId)}
                          >
                            <CheckCircle2 className="size-3 mr-1" />
                            {validatingId === grade.gradeId ? '...' : 'Valider'}
                          </Button>
                        ) : grade.isLocked ? (
                          <Badge className="text-[10px] bg-[#2d7a4f10] text-[#2d7a4f] border-0">
                            Valide
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-300">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
