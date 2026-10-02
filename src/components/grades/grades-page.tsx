'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { useStructure, useDashboardStats } from '@/lib/api-hooks'
import { useAppStore } from '@/lib/store'
import { exportToExcel, parseExcelFile } from '@/lib/export'
import { flattenTeachingUnits } from './grade-selection'
import { calculateFinalGrade, type GradingPolicy } from '@/lib/grading-policy'

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
  stage: string
  moyenne: number | null
  isLocked: boolean
  observation: string
}

interface StoredGrade {
  id: string
  studentId: string
  ccGrade: number | null
  examGrade: number | null
  tpGrade: number | null
  stageGrade: number | null
  finalGrade: number | null
  comment: string | null
  isLocked: boolean
}

interface GradeRosterStudent { id: string; matricule: string | null; firstName: string; lastName: string }

type LocalEdit = { cc?: string; exam?: string; tp?: string; stage?: string; observation?: string }

interface GradeCompletionItem {
  teachingUnitId: string
  courseElementId: string | null
  code: string
  name: string
  ecCode: string | null
  ecName: string | null
  semesterName: string
  levelName: string
  programName: string
  expected: number
  entered: number
  locked: number
  missing: number
}

interface IncompleteStudent {
  studentId: string
  name: string
  matricule: string
  expected: number
  entered: number
  locked: number
  missing: number
  missingItems: { teachingUnitId: string; courseElementId: string | null; label: string }[]
}

interface GradeCompletion {
  ready: boolean
  expectedGradeCount: number
  enteredGradeCount: number
  lockedGradeCount: number
  missingGradeCount: number
  studentsTotal: number
  studentsReady: number
  byTeachingUnit: GradeCompletionItem[]
  incompleteStudents: IncompleteStudent[]
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function isGradeReadyForLock(grade: GradeEntry, policy: GradingPolicy) {
  return grade.isLocked || computeMoyenne(grade.cc, grade.exam, grade.tp, grade.stage, policy) !== null
}

function normalizeImportHeader(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function getImportValue(row: Record<string, unknown>, aliases: string[]) {
  const normalizedAliases = new Set(aliases.map(normalizeImportHeader))
  for (const [key, value] of Object.entries(row)) {
    if (normalizedAliases.has(normalizeImportHeader(key))) return value
  }
  return undefined
}

function parseImportedGradeValue(value: unknown, label: string, line: number) {
  if (value === undefined || value === null || String(value).trim() === '') return undefined
  const normalized = String(value).trim().replace(',', '.')
  const parsed = Number(normalized)
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 20) {
    throw new Error(`ligne ${line}: ${label} doit être compris entre 0 et 20`)
  }
  return String(parsed)
}

function computeMoyenne(cc: string, exam: string, tp: string, stage: string, policy: GradingPolicy): number | null {
  const toGrade = (value: string) => value.trim() === '' ? undefined : Number(value)
  return calculateFinalGrade({
    ccGrade: toGrade(cc), examGrade: toGrade(exam),
    tpGrade: toGrade(tp), stageGrade: toGrade(stage),
  }, policy)
}

// ─── Component ────────────────────────────────────────────────────────────────

function StaffGradesPage() {
  const queryClient = useQueryClient()
  const userRole = useAppStore((state) => state.user?.role)
  const canLockGrades = ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE', 'RESPONSABLE_FILIERE'].includes(userRole || '')

  const { data: structureQuery, isLoading: structureLoading } = useStructure()
  const { data: dashboardQuery } = useDashboardStats()
  const academicYearId: string | undefined = dashboardQuery?.currentAcademicYear?.id

  const { data: policyQuery, isPending: policyPending, isError: policyError } = useQuery<{ data: GradingPolicy & { passingGrade: number } }>({
    queryKey: ['grades-policy'],
    enabled: Boolean(userRole),
    queryFn: async () => {
      const res = await fetch('/api/grades?action=policy')
      if (!res.ok) throw new Error('Impossible de charger les coefficients de notation')
      return res.json()
    },
  })
  const policy = policyQuery?.data
  const passingGrade = policy?.passingGrade ?? 10

  const { data: assignmentsQuery, isPending: assignmentsPending, isError: assignmentsError } = useQuery<{ data: { courseElementIds: string[] } }>({
    queryKey: ['grade-assignments'],
    enabled: userRole === 'ENSEIGNANT',
    queryFn: async () => {
      const res = await fetch('/api/grades?action=assignments')
      if (!res.ok) throw new Error('Impossible de charger les enseignements attribués')
      return res.json()
    },
  })

  const ueList = useMemo(() => flattenTeachingUnits(
    structureQuery?.faculties || [],
    userRole === 'ENSEIGNANT' ? new Set(assignmentsQuery?.data.courseElementIds || []) : undefined
  ), [structureQuery, userRole, assignmentsQuery])

  const [selectedUE, setSelectedUE] = useState<string>('')
  const [selectedCourseElementId, setSelectedCourseElementId] = useState<string>('')
  useEffect(() => {
    if (ueList.length > 0 && !ueList.some((ue) => ue.teachingUnitId === selectedUE)) {
      setSelectedUE((ueList.find((ue) => ue.courseElements.length > 0) ?? ueList[0]).teachingUnitId)
    }
    if (ueList.length === 0 && selectedUE) setSelectedUE('')
  }, [ueList, selectedUE])

  const currentUE = ueList.find(u => u.teachingUnitId === selectedUE)
  useEffect(() => {
    if (currentUE?.courseElements.length && !currentUE.courseElements.some((element) => element.id === selectedCourseElementId)) {
      setSelectedCourseElementId(currentUE.courseElements[0].id)
    } else if (!currentUE?.courseElements.length && selectedCourseElementId) {
      setSelectedCourseElementId('')
    }
  }, [currentUE, selectedCourseElementId])
  const currentCourseElement = currentUE?.courseElements.find((element) => element.id === selectedCourseElementId)

  const [selectedSession, setSelectedSession] = useState<'normale' | 'rattrapage'>('normale')
  const apiSession = selectedSession === 'rattrapage' ? 'RATTRAPAGE' : 'NORMALE'

  const [localEdits, setLocalEdits] = useState<Record<string, LocalEdit>>({})
  const [saving, setSaving] = useState(false)
  const [savingAndLocking, setSavingAndLocking] = useState(false)
  const [validatingId, setValidatingId] = useState<string | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  const confirmDiscardEdits = () => {
    if (Object.keys(localEdits).length === 0) return true
    return window.confirm('Des notes non enregistrées seront perdues. Continuer ?')
  }
  const changeSelection = (teachingUnitId: string, courseElementId?: string | null) => {
    const unit = ueList.find((item) => item.teachingUnitId === teachingUnitId)
    if (!unit) return
    const element = unit.courseElements.find((item) => item.id === courseElementId) || unit.courseElements[0]
    if (selectedUE === unit.teachingUnitId && selectedCourseElementId === (element?.id || '')) return
    if (!confirmDiscardEdits()) return
    setLocalEdits({})
    setSelectedUE(unit.teachingUnitId)
    setSelectedCourseElementId(element?.id || '')
  }
  const changeSession = (session: 'normale' | 'rattrapage') => {
    if (session === selectedSession || !confirmDiscardEdits()) return
    setLocalEdits({})
    setSelectedSession(session)
  }

  const { data: studentsQuery, isLoading: studentsLoading, isError: rosterError } = useQuery<{ data: GradeRosterStudent[] }>({
    queryKey: ['grade-roster', selectedCourseElementId, academicYearId],
    enabled: Boolean(currentCourseElement && academicYearId),
    queryFn: async () => {
      const params = new URLSearchParams({ action: 'roster', courseElementId: selectedCourseElementId, academicYearId: academicYearId! })
      const res = await fetch(`/api/grades?${params.toString()}`)
      if (!res.ok) throw new Error('Impossible de charger les étudiants inscrits à cet enseignement')
      return res.json()
    },
  })

  const { data: gradesQuery, isLoading: gradesLoading, isError: gradesError, refetch: retryGrades } = useQuery<{ data: StoredGrade[] }>({
    queryKey: ['grades', selectedUE, selectedCourseElementId, apiSession, academicYearId],
    queryFn: async () => {
      const allGrades: StoredGrade[] = []
      let page = 1
      let hasNext = true
      while (hasNext) {
        const params = new URLSearchParams({ teachingUnitId: selectedUE, session: apiSession, limit: '500', page: String(page) })
        params.set('courseElementId', selectedCourseElementId)
        if (academicYearId) params.set('academicYearId', academicYearId)
        const res = await fetch(`/api/grades?${params.toString()}`)
        if (!res.ok) throw new Error('Impossible de charger les notes de cette matière')
        const result = await res.json() as { data: StoredGrade[]; pagination?: { hasNext: boolean } }
        allGrades.push(...result.data)
        hasNext = Boolean(result.pagination?.hasNext)
        page++
      }
      return { data: allGrades }
    },
    enabled: Boolean(selectedUE && currentCourseElement && academicYearId),
  })
  const { data: completionQuery, isLoading: completionLoading } = useQuery({
    queryKey: ['grades-completion', apiSession, academicYearId],
    queryFn: async () => {
      const params = new URLSearchParams({ action: 'completion', session: apiSession })
      if (academicYearId) params.set('academicYearId', academicYearId)
      const res = await fetch(`/api/grades?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch grade completion')
      return res.json()
    },
    enabled: Boolean(academicYearId && canLockGrades),
  })
  const completion: GradeCompletion | null = completionQuery?.data ?? null
  const selectedCompletionItem = completion?.byTeachingUnit.find((item) =>
    item.teachingUnitId === selectedUE && item.courseElementId === selectedCourseElementId
  ) ?? null

  const dataLoading = structureLoading || (userRole === 'ENSEIGNANT' && assignmentsPending) || policyPending || studentsLoading || gradesLoading

  const grades: GradeEntry[] = useMemo(() => {
    const students = studentsQuery?.data || []
    const existingByStudent = new Map<string, StoredGrade>()
    for (const g of gradesQuery?.data || []) existingByStudent.set(g.studentId, g)

    return students.map((s: GradeRosterStudent) => {
      const existing = existingByStudent.get(s.id)
      const edit = localEdits[s.id] || {}
      const cc = edit.cc !== undefined ? edit.cc : (existing?.ccGrade != null ? String(existing.ccGrade) : '')
      const exam = edit.exam !== undefined ? edit.exam : (existing?.examGrade != null ? String(existing.examGrade) : '')
      const tp = edit.tp !== undefined ? edit.tp : (existing?.tpGrade != null ? String(existing.tpGrade) : '')
      const stage = edit.stage !== undefined ? edit.stage : (existing?.stageGrade != null ? String(existing.stageGrade) : '')
      const observation = edit.observation !== undefined ? edit.observation : (existing?.comment || '')
      const hasLocalEdit = edit.cc !== undefined || edit.exam !== undefined || edit.tp !== undefined || edit.stage !== undefined
      const moyenne = hasLocalEdit ? (policy ? computeMoyenne(cc, exam, tp, stage, policy) : null) :
        (existing?.finalGrade ?? (policy ? computeMoyenne(cc, exam, tp, stage, policy) : null))

      return {
        studentId: s.id,
        gradeId: existing?.id ?? null,
        matricule: s.matricule || '',
        nom: s.lastName,
        prenom: s.firstName,
        cc, exam, tp, stage, observation,
        moyenne,
        isLocked: existing?.isLocked ?? false,
      } as GradeEntry
    })
  }, [studentsQuery, gradesQuery, localEdits, policy])

  const handleGradeChange = (studentId: string, field: 'cc' | 'exam' | 'tp' | 'stage', value: string) => {
    setLocalEdits(prev => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }))
  }

  const refetchGrades = () => {
    queryClient.invalidateQueries({ queryKey: ['grades', selectedUE, selectedCourseElementId, apiSession, academicYearId] })
    queryClient.invalidateQueries({ queryKey: ['grades-completion', apiSession, academicYearId] })
  }

  const parseGradeValue = (value: string, label: string, studentName: string, required: boolean) => {
    if (value === '') {
      if (required) throw new Error(`${label} manquant pour ${studentName}`)
      return undefined
    }
    const parsed = Number(value)
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 20) {
      throw new Error(`${label} doit être compris entre 0 et 20 pour ${studentName}`)
    }
    return parsed
  }

  const buildGradePayload = (requireComplete: boolean) => {
    if (gradesError || rosterError) throw new Error('Les données de notes ou d’inscription n’ont pas été chargées complètement')
    if (!currentUE) return
    if (!currentCourseElement) {
      throw new Error("Aucun élément constitutif (ECUE) configuré pour cette UE")
    }
    if (!academicYearId) {
      throw new Error("Année académique courante introuvable")
    }
    if (!policy) throw new Error('Coefficients de notation indisponibles')

    const toSave = grades.filter(g => !g.isLocked && (requireComplete || g.moyenne !== null))
    const payloadGrades = toSave.map(g => {
      const studentName = `${g.prenom} ${g.nom}`.trim()
      const ccGrade = parseGradeValue(g.cc, 'CC', studentName, requireComplete && policy.ccWeight > 0)
      const examGrade = parseGradeValue(g.exam, 'Examen', studentName, requireComplete && policy.examWeight > 0)
      const tpGrade = parseGradeValue(g.tp, 'TP', studentName, requireComplete && policy.tpWeight > 0)
      const stageGrade = parseGradeValue(g.stage, 'Stage', studentName, requireComplete && policy.stageWeight > 0)

      return {
        studentId: g.studentId,
        teachingUnitId: currentUE.teachingUnitId,
        courseElementId: currentCourseElement.id,
        academicYearId,
        session: apiSession,
        ccGrade,
        examGrade,
        tpGrade,
        stageGrade,
        comment: g.observation || undefined,
      }
    })

    return {
      academicYearId,
      session: apiSession,
      grades: payloadGrades,
      lockAfterSave: requireComplete,
    }
  }

  const saveGrades = async (requireComplete = false) => {
    const payload = buildGradePayload(requireComplete)
    if (!payload || payload.grades.length === 0) {
      if (!requireComplete) {
        return null
      }
      throw new Error('Aucune note non verrouillée à enregistrer pour cette UE')
    }

    const res = await fetch('/api/grades?action=bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Échec de l'enregistrement")
    return data.data
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const r = await saveGrades(false)
      if (!r) {
        toast.info('Aucune note à enregistrer')
        return
      }
      if (r.errors?.length) {
        toast.error('Certaines notes n’ont pas été enregistrées', {
          description: `${r.created} créées, ${r.updated} mises à jour, ${r.errors.length} erreur(s). ${r.errors[0]?.error || ''}`,
        })
        refetchGrades()
        return
      }
      toast.success('Notes enregistrées', {
        description: `${r.created} créées, ${r.updated} mises à jour${r.lockedSkipped ? `, ${r.lockedSkipped} déjà verrouillée(s) ignorée(s)` : ''}`,
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
      const description = `${toValidate.length - failed} note(s) validée(s)${failed ? `, ${failed} échec(s)` : ''}`
      if (failed) toast.error('Validation incomplète', { description })
      else toast.success('Validation terminée', { description })
      refetchGrades()
    } finally {
      setValidatingId(null)
    }
  }

  const handleSaveAndLockCurrentUE = async () => {
    if (!window.confirm("Enregistrer et verrouiller les notes de la matière affichée ? Après verrouillage, elles ne seront plus modifiables.")) return
    setSavingAndLocking(true)
    try {
      const saved = await saveGrades(true)
      setLocalEdits({})
      toast.success('Matière enregistrée et verrouillée', {
        description: `${saved?.created ?? 0} créée(s), ${saved?.updated ?? 0} mise(s) à jour, ${saved?.locked ?? 0} verrouillée(s)`,
      })
      refetchGrades()
    } catch (e) {
      toast.error('Action interrompue', { description: e instanceof Error ? e.message : "Échec de l'enregistrement/verrouillage" })
    } finally {
      setSavingAndLocking(false)
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
        Stage: g.stage,
        Moyenne: g.moyenne ?? '',
        Statut: g.isLocked ? 'Valide' : (g.moyenne !== null ? 'A valider' : '-'),
        UE: currentUE?.code || '',
        ECUE: selectedCompletionItem?.ecCode || '',
      })),
      `notes_${currentUE?.code || 'export'}`
    )
    toast.success('Export généré')
  }

  const handleDownloadImportTemplate = () => {
    if (grades.length === 0) {
      toast.info('Aucun étudiant disponible pour ce modèle')
      return
    }
    exportToExcel(
      grades.map(g => ({
        Matricule: g.matricule,
        Nom: g.nom,
        Prenom: g.prenom,
        CC: g.isLocked ? g.cc : '',
        Examen: g.isLocked ? g.exam : '',
        TP: g.isLocked ? g.tp : '',
        Stage: g.isLocked ? g.stage : '',
        Statut: g.isLocked ? 'Déjà verrouillé - ne pas modifier' : 'À compléter',
        UE: currentUE?.code || '',
        ECUE: selectedCompletionItem?.ecCode || '',
      })),
      `modele_notes_${currentUE?.code || 'ue'}`
    )
    toast.success('Modèle généré', {
      description: 'Complétez les colonnes dont le coefficient est positif, puis réimportez le fichier sur cette même matière.',
    })
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
      let ignoredLocked = 0
      let ignoredEmpty = 0
      let unknownMatricules = 0
      const errors: string[] = []

      rows.forEach((row, index) => {
        const line = index + 2
        const matricule = String(getImportValue(row, ['Matricule', 'Matricule étudiant', 'Numéro', 'Numero', 'Student ID']) ?? '').trim()
        if (!matricule) {
          ignoredEmpty++
          return
        }
        const student = byMatricule.get(matricule)
        if (!student) {
          unknownMatricules++
          return
        }
        if (student.isLocked) {
          ignoredLocked++
          return
        }

        try {
          const cc = parseImportedGradeValue(getImportValue(row, ['CC', 'Controle continu', 'Contrôle continu', 'Devoir']), 'CC', line)
          const exam = parseImportedGradeValue(getImportValue(row, ['Examen', 'Exam', 'Note examen']), 'Examen', line)
          const tp = parseImportedGradeValue(getImportValue(row, ['TP', 'Travaux pratiques']), 'TP', line)
          const stage = parseImportedGradeValue(getImportValue(row, ['Stage', 'Note stage']), 'Stage', line)

          if (cc === undefined && exam === undefined && tp === undefined && stage === undefined) {
            ignoredEmpty++
            return
          }

          edits[student.studentId] = {
            ...(cc !== undefined ? { cc } : {}),
            ...(exam !== undefined ? { exam } : {}),
            ...(tp !== undefined ? { tp } : {}),
            ...(stage !== undefined ? { stage } : {}),
          }
          matched++
        } catch (error) {
          errors.push(error instanceof Error ? error.message : `ligne ${line}: valeur invalide`)
        }
      })

      if (errors.length > 0) {
        toast.error('Import refusé', {
          description: `${errors[0]}${errors.length > 1 ? ` (+${errors.length - 1} autre(s) erreur(s))` : ''}`,
        })
        return
      }

      if (matched === 0) {
        toast.warning('Aucune note importée', {
          description: [
            ignoredLocked ? `${ignoredLocked} ligne(s) verrouillée(s)` : '',
            unknownMatricules ? `${unknownMatricules} matricule(s) inconnu(s)` : '',
            ignoredEmpty ? `${ignoredEmpty} ligne(s) vide(s)` : '',
          ].filter(Boolean).join(' · ') || 'Aucune ligne exploitable trouvée.',
        })
        return
      }

      setLocalEdits(prev => ({ ...prev, ...edits }))
      toast.success('Fichier importé', {
        description: [
          `${matched} étudiant(s) préparé(s) sur ${rows.length} ligne(s)`,
          ignoredLocked ? `${ignoredLocked} verrouillée(s) ignorée(s)` : '',
          unknownMatricules ? `${unknownMatricules} matricule(s) inconnu(s)` : '',
          ignoredEmpty ? `${ignoredEmpty} ligne(s) vide(s)` : '',
          'Cliquez sur Enregistrer pour sauvegarder.',
        ].filter(Boolean).join(' · '),
      })
    } catch (err) {
      toast.error('Erreur import', { description: err instanceof Error ? err.message : 'Fichier illisible' })
    }
  }

  // ─── Computed Stats ──────────────────────────────────────────────────────
  const validGrades = grades.filter(g => g.moyenne !== null)
  const validCount = validGrades.filter(g => g.moyenne! >= passingGrade).length
  const classAverage = validGrades.length > 0
    ? validGrades.reduce((acc, g) => acc + (g.moyenne || 0), 0) / validGrades.length
    : 0
  const validationRate = validGrades.length > 0
    ? Math.round((validCount / validGrades.length) * 100)
    : 0
  const pendingValidation = grades.filter(g => g.moyenne !== null && !g.isLocked).length
  const notesSaisies = validGrades.length
  const notesAttendues = grades.length
  const hasLocalEdits = Object.keys(localEdits).length > 0
  const nextIncompleteUE = useMemo(() => {
    const missing = completion?.byTeachingUnit.filter(item => item.missing > 0) ?? []
    if (missing.length === 0) return null
    return missing.find(item => item.teachingUnitId !== selectedUE || item.courseElementId !== selectedCourseElementId) ?? missing[0]
  }, [completion, selectedUE, selectedCourseElementId])
  const canSave = Boolean(policy && currentCourseElement && academicYearId && !gradesError && !rosterError && hasLocalEdits && !saving && !savingAndLocking)
  const unlockedGrades = grades.filter(g => !g.isLocked)
  const allCurrentUEGradesReadyForLock = Boolean(policy && grades.length > 0 && grades.every((grade) => isGradeReadyForLock(grade, policy)))
  const canSaveAndLockCurrentUE = Boolean(
    canLockGrades &&
    currentCourseElement &&
    policy &&
    academicYearId &&
    !gradesError &&
    !rosterError &&
    grades.length > 0 &&
    unlockedGrades.length > 0 &&
    allCurrentUEGradesReadyForLock &&
    !saving &&
    !savingAndLocking
  )
  const canValidateAll = canLockGrades && !gradesError && !rosterError && grades.some(g => g.gradeId && g.moyenne !== null && !g.isLocked)

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
    if (moyenne >= passingGrade) return 'bg-[#2d7a4f10]'
    if (moyenne >= passingGrade - 2) return 'bg-[#f9a82510]'
    return 'bg-[#c6282810]'
  }

  const getGradeTextColor = (moyenne: number | null) => {
    if (moyenne === null) return 'text-gray-300'
    if (moyenne >= passingGrade) return 'text-[#2d7a4f]'
    if (moyenne >= passingGrade - 2) return 'text-[#f9a825]'
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
        className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Gestion des notes</h1>
          <p className="mt-1 text-sm text-slate-700">Choisissez une UE et une matière, saisissez les notes puis enregistrez-les avant validation.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canLockGrades && <Button
            variant="outline"
            size="sm"
            className="text-sm"
            disabled={!nextIncompleteUE || (nextIncompleteUE.teachingUnitId === selectedUE && nextIncompleteUE.courseElementId === selectedCourseElementId)}
            onClick={() => nextIncompleteUE && changeSelection(nextIncompleteUE.teachingUnitId, nextIncompleteUE.courseElementId)}
          >
            UE suivante
          </Button>}
          <Button variant="outline" size="sm" className="text-sm" disabled={!grades.length} onClick={handleImportClick}>
            <Upload className="size-3.5 mr-1.5" />
            Importer Excel
          </Button>
          <Button variant="outline" size="sm" className="text-sm" disabled={!grades.length} onClick={handleDownloadImportTemplate}>
            Modèle notes
          </Button>
          <Button variant="outline" size="sm" className="text-sm" disabled={!grades.length} onClick={handleExport}>
            <Download className="size-3.5 mr-1.5" />
            Exporter
          </Button>
          <Button size="sm" className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-sm" disabled={!canSave} onClick={handleSave}>
            <Save className="size-3.5 mr-1.5" />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
          {canLockGrades && <Button
            size="sm"
            className="bg-[#1a2744] hover:bg-[#253556] text-white text-sm"
            disabled={!canSaveAndLockCurrentUE}
            onClick={handleSaveAndLockCurrentUE}
          >
            <CheckCircle2 className="size-3.5 mr-1.5" />
            {savingAndLocking ? 'Verrouillage...' : 'Enregistrer + verrouiller la matière'}
          </Button>}
        </div>
      </motion.div>

      {/* ─── Global Completion Gate ───────────────────────────────────────── */}
      {canLockGrades && <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.03 }}
      >
        <Card className={`border-l-4 ${completion?.ready ? 'border-l-[#2d7a4f]' : 'border-l-[#d4a853]'}`}>
          <CardContent className="p-4">
            <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
              <div className="space-y-3 flex-1">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${completion?.ready ? 'bg-[#2d7a4f10]' : 'bg-[#d4a85315]'}`}>
                    {completion?.ready ? (
                      <CheckCircle2 className="size-4 text-[#2d7a4f]" />
                    ) : (
                      <AlertCircle className="size-4 text-[#d4a853]" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-[#1a2744]">
                      {completion && completion.expectedGradeCount === 0 ? 'Aucune note attendue pour cette session' : completion?.ready ? 'Dossier de notes prêt pour délibération' : 'Dossier de notes incomplet pour la délibération'}
                    </h2>
                    <p className="mt-1 text-sm text-slate-700">
                      {completion && completion.expectedGradeCount === 0
                        ? 'Aucune inscription pédagogique active ne produit de note à saisir pour cette session.'
                        : `Cette progression couvre toutes les UE/EC inscrites pédagogiquement pour la session ${selectedSession === 'normale' ? 'normale' : 'de rattrapage'}. Les PV restent bloqués tant que toutes les notes ne sont pas verrouillées.`}
                    </p>
                  </div>
                </div>

                {(!completion || completion.expectedGradeCount > 0) && <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                    <p className="text-sm font-medium text-slate-700">Verrouillées</p>
                    <p className="text-lg font-bold text-[#1a2744]">
                      {completion ? `${completion.lockedGradeCount}/${completion.expectedGradeCount}` : completionLoading ? '...' : '—'}
                    </p>
                    <Progress
                      value={completion?.expectedGradeCount ? (completion.lockedGradeCount / completion.expectedGradeCount) * 100 : 0}
                      className="h-1.5 mt-2"
                    />
                  </div>
                  <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                    <p className="text-sm font-medium text-slate-700">Saisies</p>
                    <p className="text-lg font-bold text-[#1a2744]">
                      {completion ? `${completion.enteredGradeCount}/${completion.expectedGradeCount}` : completionLoading ? '...' : '—'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                    <p className="text-sm font-medium text-slate-700">Manquantes</p>
                    <p className={`text-lg font-bold ${completion?.missingGradeCount ? 'text-[#d4a853]' : 'text-[#2d7a4f]'}`}>
                      {completion?.missingGradeCount ?? (completionLoading ? '...' : '—')}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                    <p className="text-sm font-medium text-slate-700">Étudiants complets</p>
                    <p className="text-lg font-bold text-[#1a2744]">
                      {completion ? `${completion.studentsReady}/${completion.studentsTotal}` : completionLoading ? '...' : '—'}
                    </p>
                  </div>
                </div>}

                {completion && !completion.ready && completion.byTeachingUnit.length > 0 && (
                  <div className="rounded-lg border border-[#d4a85330] bg-[#d4a85308] p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-[#1a2744]">UE / EC à compléter</p>
                      <Badge className="border-0 bg-amber-100 text-xs font-semibold text-amber-950">
                        Cliquez pour ouvrir
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                      {completion.byTeachingUnit
                        .filter((item) => item.missing > 0)
                        .slice(0, 6)
                        .map((item) => (
                          <button
                            key={`${item.teachingUnitId}:${item.courseElementId || 'UE'}`}
                            type="button"
                            onClick={() => changeSelection(item.teachingUnitId, item.courseElementId)}
                            className={`text-left rounded-lg border p-2.5 transition-all hover:shadow-sm ${
                              selectedUE === item.teachingUnitId && selectedCourseElementId === item.courseElementId
                                ? 'border-[#2d7a4f] bg-white'
                                : 'border-[#d4a85325] bg-white/70 hover:border-[#d4a853]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-sm font-semibold text-[#1a2744]">
                                {item.code} {item.ecCode ? `/ ${item.ecCode}` : ''}
                              </span>
                              <Badge className="border-0 bg-red-100 text-xs font-semibold text-red-900">
                                {item.missing} manque
                              </Badge>
                            </div>
                            <p className="mt-1 truncate text-sm text-slate-800">{item.name}</p>
                            <p className="mt-1 text-xs text-slate-700">
                              {item.locked}/{item.expected} verrouillées · {item.programName} {item.levelName}
                            </p>
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {completion && !completion.ready && completion.incompleteStudents.length > 0 && (
                  <p className="text-sm text-slate-700">
                    Étudiants incomplets : {completion.incompleteStudents.slice(0, 3).map((student) => `${student.name} (${student.missing})`).join(', ')}
                    {completion.incompleteStudents.length > 3 ? '…' : ''}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>}

      {!dataLoading && !currentCourseElement && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-5 text-sm text-amber-950">
            {currentUE
              ? 'Cette UE ne possède aucune matière (ECUE). Ajoutez-en une dans la maquette avant de saisir des notes.'
              : 'Aucune UE avec matière n’est disponible. Configurez la structure et la maquette avant la saisie.'}
          </CardContent>
        </Card>
      )}
      {!dataLoading && currentCourseElement && grades.length === 0 && (
        <Card className="border-slate-300 bg-slate-50">
          <CardContent className="p-5 text-sm text-slate-800">
            Aucun étudiant n’est inscrit pédagogiquement à cette UE pour l’année courante. Vérifiez les inscriptions pédagogiques avant de saisir des notes.
          </CardContent>
        </Card>
      )}

      {/* Les indicateurs d'une matière vide ne sont pas des résultats à zéro. */}
      {currentCourseElement && grades.length > 0 && <motion.div
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
            <p className="mt-1 text-sm text-slate-700">Notes saisies pour la matière</p>
            <Progress
              value={notesAttendues > 0 ? (notesSaisies / notesAttendues) * 100 : 0}
              className="h-1.5 mt-2"
            />
            <p className="mt-1 text-sm text-slate-700">
              {Math.round((notesSaisies / notesAttendues) * 100)} % des étudiants inscrits
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
              <Badge className={`text-[10px] border-0 ${classAverage >= passingGrade ? 'bg-[#2d7a4f10] text-[#2d7a4f]' : 'bg-[#c6282810] text-[#c62828]'}`}>
                {validGrades.length === 0 ? 'En attente' : classAverage >= passingGrade ? 'Au-dessus' : 'En dessous'}
              </Badge>
            </div>
            <p className="text-2xl font-bold text-slate-950">{validGrades.length ? classAverage.toFixed(1) : '—'}</p>
            <p className="mt-1 text-sm text-slate-700">Moyenne des notes calculables</p>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#d4a853] rounded-full transition-all"
                style={{ width: `${(classAverage / 20) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-sm text-slate-700">sur 20 · {validGrades.length} note(s)</p>
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
            <p className="text-2xl font-bold text-[#2d7a4f]">{validGrades.length ? `${validationRate} %` : '—'}</p>
            <p className="mt-1 text-sm text-slate-700">Notes au-dessus du seuil</p>
            <Progress
              value={validationRate}
              className="h-1.5 mt-2"
            />
            <p className="mt-1 text-sm text-slate-700">{validCount} / {validGrades.length} calculables</p>
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
            <p className="mt-1 text-sm text-slate-700">En attente de validation</p>
            <Progress
              value={notesSaisies > 0 ? ((notesSaisies - pendingValidation) / notesSaisies) * 100 : 100}
              className="h-1.5 mt-2"
            />
            <p className="mt-1 text-sm text-slate-700">{notesSaisies - pendingValidation} verrouillée(s)</p>
          </CardContent>
        </Card>
      </motion.div>}

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
                  Paramètres de saisie
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="min-w-0 space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700">Unité d&apos;enseignement (UE)</Label>
                <Select value={selectedUE} onValueChange={(value) => changeSelection(value)} disabled={ueList.length === 0}>
                  <SelectTrigger className="h-10 w-full min-w-0 overflow-hidden text-left text-sm [&>span]:truncate">
                    <SelectValue placeholder={structureLoading || assignmentsPending && userRole === 'ENSEIGNANT' ? 'Chargement...' : "Unité d'enseignement"} />
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
              <div className="min-w-0 space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700">Matière / ECUE</Label>
                <Select value={selectedCourseElementId} onValueChange={(value) => changeSelection(selectedUE, value)} disabled={!currentUE?.courseElements.length}>
                  <SelectTrigger className="h-10 w-full min-w-0 overflow-hidden text-left text-sm [&>span]:truncate">
                    <SelectValue placeholder="Matière" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentUE?.courseElements.map((element) => (
                      <SelectItem key={element.id} value={element.id}>{element.code} - {element.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700">Session</Label>
                <Select value={selectedSession} onValueChange={(v) => changeSession(v as 'normale' | 'rattrapage')}>
                  <SelectTrigger className="h-10 w-full min-w-0 overflow-hidden text-left text-sm [&>span]:truncate">
                    <SelectValue placeholder="Session" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normale">Session Normale</SelectItem>
                    <SelectItem value="rattrapage">Session de Rattrapage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {userRole === 'ENSEIGNANT' && assignmentsError && (
              <p className="text-xs text-[#c62828]">Impossible de vérifier vos enseignements attribués. Réessayez ou contactez l&apos;administration.</p>
            )}
            {userRole === 'ENSEIGNANT' && !assignmentsPending && !assignmentsError && ueList.length === 0 && (
              <p className="text-xs text-gray-600">Aucune matière ne vous est attribuée. Contactez l&apos;administration pour configurer votre service d&apos;enseignement.</p>
            )}
            {policyError && (
              <p className="text-xs text-[#c62828]">Les coefficients de notation ne sont pas disponibles ou sont invalides. La saisie et le verrouillage sont désactivés.</p>
            )}
            {!academicYearId && (
              <p className="text-xs text-[#c62828]">Aucune année académique courante n&apos;est configurée. La saisie des notes est indisponible.</p>
            )}
            {rosterError && (
              <p className="text-xs text-[#c62828]">Impossible de charger les étudiants inscrits à cette UE.</p>
            )}
            {gradesError && (
              <div role="alert" className="flex flex-wrap items-center gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-950">
                Impossible de charger les notes existantes. La saisie est suspendue pour éviter d’écraser des données.
                <Button variant="outline" size="sm" onClick={() => retryGrades()}>Réessayer</Button>
              </div>
            )}
            {currentUE && !currentUE.courseElements.length && (
              <div className="p-3 bg-[#c6282808] border border-[#c6282815] rounded-lg">
                <p className="text-xs text-[#c62828] font-medium flex items-center gap-1.5">
                  <AlertCircle className="size-3.5" />
                  Aucun élément constitutif (ECUE) n&apos;est configuré pour cette UE — la saisie de notes n&apos;est pas possible tant qu&apos;un ECUE n&apos;a pas été créé.
                </p>
              </div>
            )}

            <div className="p-3 bg-[#1a274408] border border-[#1a274415] rounded-lg">
              <p className="text-xs text-[#1a2744] font-medium flex items-center gap-1.5">
                <AlertCircle className="size-3.5" />
                Saisissez les composantes dont le coefficient est positif dans le tableau ci-dessous. Les notes validées sont verrouillées et ne peuvent plus être modifiées.
                {selectedCompletionItem && (
                  <span className="ml-1 font-semibold">
                    Cette UE : {selectedCompletionItem.locked}/{selectedCompletionItem.expected} note(s) verrouillée(s), {selectedCompletionItem.missing} manquante(s).
                  </span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Grade Statistics Card ─────────────────────────────────────────── */}
      {validGrades.length > 0 && <motion.div
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
                    <span className="text-[10px] text-gray-500">{passingGrade - 2}–{passingGrade} (Compensation)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-[#2d7a4f25]" />
                    <span className="text-[10px] text-gray-500">&ge; {passingGrade} (Valide)</span>
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
      </motion.div>}

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
                  {currentUE ? `${currentUE.code} - ${currentUE.name}${currentCourseElement ? ` / ${currentCourseElement.name}` : ''}` : 'Aucune UE sélectionnée'}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-sm" disabled={!grades.length} onClick={handleExport}>
                  <Download className="size-3.5 mr-1.5" />
                  Exporter
                </Button>
                {canLockGrades && <Button
                  size="sm"
                  className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs"
                  disabled={!canValidateAll || validatingId === 'all'}
                  onClick={handleValidateAll}
                >
                  <CheckCircle2 className="size-3.5 mr-1.5" />
                  {validatingId === 'all' ? 'Validation...' : canValidateAll ? 'Valider tout' : 'Tout validé'}
                </Button>}
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
                    <TableHead className="text-xs font-semibold text-gray-500 text-center w-24">CC ({Math.round((policy?.ccWeight ?? 0) * 100)}%)</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 text-center w-24">Exam ({Math.round((policy?.examWeight ?? 0) * 100)}%)</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 text-center w-24">TP ({Math.round((policy?.tpWeight ?? 0) * 100)}%)</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 text-center w-24">Stage ({Math.round((policy?.stageWeight ?? 0) * 100)}%)</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 text-center w-24">Moyenne</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 text-center w-20">Statut</TableHead>
                    <TableHead className="text-xs font-semibold text-gray-500 text-center w-24">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataLoading && (
                    <TableRow>
                      <TableCell colSpan={10} className="py-8 text-center text-sm text-slate-700">Chargement des étudiants et des notes…</TableCell>
                    </TableRow>
                  )}
                  {!dataLoading && grades.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="py-8 text-center text-sm text-slate-700">
                        {currentCourseElement ? 'Aucun étudiant inscrit pédagogiquement à cette UE pour cette année.' : 'Sélectionnez une UE contenant une matière.'}
                      </TableCell>
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
                          disabled={grade.isLocked || !policy?.ccWeight || gradesError || rosterError}
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
                          disabled={grade.isLocked || !policy?.examWeight || gradesError || rosterError}
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
                          disabled={grade.isLocked || !policy?.tpWeight || gradesError || rosterError}
                          placeholder="-"
                          className="h-8 text-center text-sm w-20 mx-auto disabled:bg-gray-50"
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        <Input
                          type="number"
                          min="0"
                          max="20"
                          step="0.5"
                          value={grade.stage}
                          onChange={(e) => handleGradeChange(grade.studentId, 'stage', e.target.value)}
                          disabled={grade.isLocked || !policy?.stageWeight || gradesError || rosterError}
                          placeholder="-"
                          className="h-8 text-center text-sm w-20 mx-auto disabled:bg-gray-50"
                        />
                      </TableCell>
                      <TableCell className="py-2 text-center">
                        <span className={`text-sm font-bold ${getGradeTextColor(grade.moyenne)}`}>
                          {grade.moyenne !== null ? grade.moyenne.toFixed(2) : '-'}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 text-center">
                        {grade.moyenne !== null ? (
                          grade.moyenne >= passingGrade ? (
                            <CheckCircle2 className="size-4 text-[#2d7a4f] mx-auto" />
                          ) : (
                            <AlertCircle className="size-4 text-[#c62828] mx-auto" />
                          )
                        ) : (
                          <span className="text-xs text-gray-300">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2 text-center">
                        {canLockGrades && !grade.isLocked && grade.moyenne !== null ? (
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

interface PublishedGrade {
  id: string
  finalGrade: number | null
  session: string
  isLocked: boolean
  student?: { firstName: string; lastName: string; matricule: string | null }
  teachingUnit: { code: string; name: string; semester?: { name: string } } | null
  courseElement: { code: string | null; name: string } | null
}

function OversightGradesPage() {
  const [page, setPage] = useState(1)
  const { data: dashboard } = useDashboardStats()
  const academicYearId = dashboard?.academicYear?.id
  const { data, isLoading, isError, refetch } = useQuery<{ data: PublishedGrade[]; pagination: { total: number; hasNext: boolean; hasPrev: boolean } }>({
    queryKey: ['oversight-grades', academicYearId, page],
    enabled: Boolean(academicYearId),
    queryFn: async () => {
      const params = new URLSearchParams({ academicYearId: academicYearId!, page: String(page), limit: '50' })
      const response = await fetch(`/api/grades?${params}`)
      if (!response.ok) throw new Error('Impossible de charger les notes')
      return response.json()
    },
  })
  return <div className="space-y-5 text-slate-900">
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">Consultation</p><h1 className="mt-1 text-2xl font-bold text-slate-950">Notes de l’établissement</h1><p className="mt-2 text-sm text-slate-700">Vue en lecture seule. La saisie et le verrouillage restent réservés aux personnes habilitées.</p></div>
    {isError ? <Card><CardContent className="flex items-center gap-3 p-5 text-sm">Impossible de charger les notes.<Button variant="outline" onClick={() => refetch()}>Réessayer</Button></CardContent></Card>
      : !academicYearId ? <Card><CardContent className="p-5 text-sm">Aucune année académique active.</CardContent></Card>
      : isLoading ? <Card><CardContent className="p-5 text-sm">Chargement des notes…</CardContent></Card>
      : !data?.data.length ? <Card><CardContent className="p-5 text-sm">Aucune note enregistrée pour cette année.</CardContent></Card>
      : <Card className="border-slate-200 bg-white"><CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3"><CardTitle className="text-lg text-slate-950">{data.pagination.total} note(s) · page {page}</CardTitle><div className="flex gap-2"><Button variant="outline" size="sm" disabled={!data.pagination.hasPrev} onClick={() => setPage(page - 1)}>Précédent</Button><Button variant="outline" size="sm" disabled={!data.pagination.hasNext} onClick={() => setPage(page + 1)}>Suivant</Button></div></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-slate-50"><TableHead className="text-sm font-semibold text-slate-800">Étudiant</TableHead><TableHead className="text-sm font-semibold text-slate-800">UE / matière</TableHead><TableHead className="text-sm font-semibold text-slate-800">Session</TableHead><TableHead className="text-right text-sm font-semibold text-slate-800">Note /20</TableHead><TableHead className="text-sm font-semibold text-slate-800">État</TableHead></TableRow></TableHeader><TableBody>{data.data.map((grade) => <TableRow key={grade.id}><TableCell className="py-3 text-sm font-medium text-slate-900">{grade.student ? `${grade.student.firstName} ${grade.student.lastName}` : '—'}<p className="text-sm font-normal text-slate-700">{grade.student?.matricule}</p></TableCell><TableCell className="min-w-52 py-3 text-sm text-slate-900">{grade.courseElement?.name ?? grade.teachingUnit?.name ?? '—'}<p className="text-sm text-slate-700">{grade.teachingUnit?.code}</p></TableCell><TableCell className="text-sm text-slate-800">{grade.session === 'RATTRAPAGE' ? 'Rattrapage' : 'Normale'}</TableCell><TableCell className="text-right font-bold text-slate-950">{grade.finalGrade === null ? '—' : grade.finalGrade.toFixed(2)}</TableCell><TableCell className="text-sm text-slate-800">{grade.isLocked ? 'Verrouillée' : 'En cours'}</TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>}
  </div>
}

function StudentGradesPage() {
  const { data: dashboard } = useDashboardStats()
  const academicYearId = dashboard?.currentAcademicYear?.id
  const { data, isLoading, isError, refetch } = useQuery<{ data: PublishedGrade[] }>({
    queryKey: ['my-published-grades', academicYearId],
    enabled: Boolean(academicYearId),
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '500', academicYearId: academicYearId! })
      const response = await fetch(`/api/grades?${params}`)
      if (!response.ok) throw new Error('Impossible de charger les notes publiées')
      return response.json()
    },
  })
  const grades = data?.data ?? []

  return <div className="space-y-5 text-slate-900">
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">Espace étudiant</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-950">Mes notes publiées</h1>
      <p className="mt-2 text-sm text-slate-700">Seules vos notes validées apparaissent ici. Pour un document officiel, ouvrez « Mes Documents ».</p>
      <p className="mt-2 text-sm font-medium text-slate-700">{dashboard?.currentAcademicYear ? `Année académique ${dashboard.currentAcademicYear.name}` : 'Aucune année académique active'}</p>
    </div>
    {isError ? <Card><CardContent className="flex flex-wrap items-center gap-3 p-5 text-sm text-slate-800">Impossible de charger vos notes.<Button variant="outline" onClick={() => refetch()}>Réessayer</Button></CardContent></Card>
      : !academicYearId ? <Card><CardContent className="p-5 text-sm text-slate-700">Aucune année académique active n’est configurée.</CardContent></Card>
      : isLoading ? <Card><CardContent className="p-5 text-sm text-slate-700">Chargement des notes…</CardContent></Card>
      : grades.length === 0 ? <Card><CardContent className="p-5 text-sm text-slate-700">Aucune note validée n’a été publiée pour cette année.</CardContent></Card>
      : <Card className="border-slate-200 bg-white"><CardHeader><CardTitle className="text-lg text-slate-950">Résultats par matière</CardTitle></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow className="bg-slate-50"><TableHead className="text-sm font-semibold text-slate-800">UE / matière</TableHead><TableHead className="text-sm font-semibold text-slate-800">Semestre</TableHead><TableHead className="text-sm font-semibold text-slate-800">Session</TableHead><TableHead className="text-right text-sm font-semibold text-slate-800">Note /20</TableHead></TableRow></TableHeader><TableBody>{grades.map((grade) => <TableRow key={grade.id}><TableCell className="min-w-56 py-4"><p className="font-semibold text-slate-950">{grade.courseElement?.name ?? grade.teachingUnit?.name ?? 'Matière'}</p><p className="text-sm text-slate-700">{grade.teachingUnit?.code} {grade.courseElement?.code ? `· ${grade.courseElement.code}` : ''}</p></TableCell><TableCell className="text-sm text-slate-800">{grade.teachingUnit?.semester?.name ?? '—'}</TableCell><TableCell className="text-sm text-slate-800">{grade.session === 'RATTRAPAGE' ? 'Rattrapage' : 'Normale'}</TableCell><TableCell className="text-right text-base font-bold text-slate-950">{grade.finalGrade !== null ? grade.finalGrade.toFixed(2) : '—'}</TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>}
  </div>
}

export function GradesPage() {
  const role = useAppStore((state) => state.user?.role)
  if (role === 'ETUDIANT' || role === 'ETUDIANT_SANTE') return <StudentGradesPage />
  if (role === 'RECTORAT' || role === 'JURY') return <OversightGradesPage />
  if (role === 'FACULTE' || role === 'DEPARTEMENT') return <Card className="border-slate-200 bg-white"><CardContent className="p-6 text-slate-800"><h1 className="text-2xl font-bold text-slate-950">Notes</h1><p className="mt-2 text-sm">L’accès aux notes de cette faculté ou de ce département nécessite une affectation de périmètre. Demandez à l’administration de configurer cet accès.</p></CardContent></Card>
  if (role === 'PARENT' || role === 'MAITRE_STAGE') return <Card className="border-slate-200 bg-white"><CardContent className="p-6 text-slate-800"><h1 className="text-2xl font-bold text-slate-950">Notes</h1><p className="mt-2 text-sm">La consultation des notes n’est pas encore ouverte à ce profil. Aucun dossier étudiant ne vous est associé pour cet accès.</p></CardContent></Card>
  return <StaffGradesPage />
}
