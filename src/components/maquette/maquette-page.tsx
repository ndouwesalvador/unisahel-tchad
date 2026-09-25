'use client'

import { exportToExcel } from '@/lib/export'
import { useStructure } from '@/lib/api-hooks'
import { useAppStore } from '@/lib/store'
import { useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useRef, Fragment } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BookOpen,
  Plus,
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  GraduationCap,
  Layers,
  Download,
  AlertTriangle,
  CheckCircle2,
  Edit3,
} from 'lucide-react'

// ─── Types and API-backed data mapping ────────────────────────────────────────

type UEType = 'Fondamentale' | 'Complémentaire' | 'Transversale' | 'Méthodologie' | 'Langue' | 'Stage' | 'Mémoire'

interface ECUE {
  id: string
  code: string
  nom: string
  coefficient: number
  cm: number
  td: number
  tp: number
  stage: number
  personal: number
  orderIndex: number
  enseignant: string
}

interface UE {
  id: string
  code: string
  nom: string
  credits: number
  type: UEType
  rawType: string
  compensable: boolean
  orderIndex: number
  responsable: string
  ecues: ECUE[]
}

interface Semester {
  id: string
  label: string
  ues: UE[]
}

interface Level {
  id: string
  label: string
  semesters: Semester[]
}

interface Program {
  id: string
  label: string
  studentCount: number
  levels: Level[]
}

const typeConfig: Record<UEType, { label: string; className: string }> = {
  'Fondamentale': { label: 'Fondamentale', className: 'bg-[#1a274415] text-[#1a2744] border-0' },
  'Complémentaire': { label: 'Complémentaire', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' },
  'Transversale': { label: 'Transversale', className: 'bg-[#d4a85315] text-[#d4a853] border-0' },
  'Méthodologie': { label: 'Méthodologie', className: 'bg-[#1a274415] text-[#1a2744] border-0' },
  'Langue': { label: 'Langue', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' },
  'Stage': { label: 'Stage', className: 'bg-[#d4a85315] text-[#d4a853] border-0' },
  'Mémoire': { label: 'Mémoire', className: 'bg-[#1a274415] text-[#1a2744] border-0' },
}

interface StructureTeacherRef {
  user?: { firstName: string; lastName: string } | null
}

interface StructureCourseElement {
  id: string
  code: string | null
  name: string
  coefficient: number
  hoursCM: number
  hoursTD: number
  hoursTP: number
  hoursStage: number
  hoursPersonal?: number
  orderIndex?: number
  teacher?: StructureTeacherRef | null
}

interface StructureTeachingUnit {
  id: string
  code: string | null
  name: string
  credits: number
  type: string
  compensable: boolean
  orderIndex?: number
  responsible?: StructureTeacherRef | null
  courseElements: StructureCourseElement[]
}

interface StructureSemester {
  id: string
  name: string
  teachingUnits: StructureTeachingUnit[]
}

interface StructureLevel {
  id: string
  name: string
  semesters: StructureSemester[]
}

interface StructureProgram {
  id: string
  name: string
  studentCount?: number
  levels: StructureLevel[]
}

interface StructureDepartment {
  programs: StructureProgram[]
}

interface StructureFaculty {
  departments: StructureDepartment[]
}

function teacherName(ref?: StructureTeacherRef | null): string {
  if (!ref?.user) return 'Non attribué'
  return `${ref.user.firstName} ${ref.user.lastName}`.trim() || 'Non attribué'
}

function mapUEType(type: string): UEType {
  const t = (type || '').toUpperCase()
  if (t.startsWith('COMPL')) return 'Complémentaire'
  if (t.startsWith('TRANSV')) return 'Transversale'
  if (t === 'METHODE') return 'Méthodologie'
  if (t === 'LANGUE') return 'Langue'
  if (t === 'STAGE') return 'Stage'
  if (t === 'MEMOIRE') return 'Mémoire'
  return 'Fondamentale'
}

function mapStructureToPrograms(faculties: StructureFaculty[]): Program[] {
  const programs: Program[] = []
  for (const faculty of faculties || []) {
    for (const department of faculty.departments || []) {
      for (const p of department.programs || []) {
        programs.push({
          id: p.id,
          label: p.name,
          studentCount: p.studentCount ?? 0,
          levels: (p.levels || []).map((level) => ({
            id: level.id,
            label: level.name,
            semesters: (level.semesters || []).map((sem) => ({
              id: sem.id,
              label: sem.name,
              ues: (sem.teachingUnits || []).map((tu) => ({
                id: tu.id,
                code: tu.code ?? '',
                nom: tu.name,
                credits: tu.credits,
                type: mapUEType(tu.type),
                rawType: tu.type || 'FONDAMENTALE',
                compensable: tu.compensable,
                orderIndex: tu.orderIndex ?? 0,
                responsable: teacherName(tu.responsible),
                ecues: (tu.courseElements || []).map((ce) => ({
                  id: ce.id,
                  code: ce.code ?? '',
                  nom: ce.name,
                  coefficient: ce.coefficient,
                  cm: ce.hoursCM,
                  td: ce.hoursTD,
                  tp: ce.hoursTP,
                  stage: ce.hoursStage,
                  personal: ce.hoursPersonal ?? 0,
                  orderIndex: ce.orderIndex ?? 0,
                  enseignant: teacherName(ce.teacher),
                })),
              })),
            })),
          })),
        })
      }
    }
  }
  return programs
}

function getSemesterCredits(semester: Semester): number {
  return semester.ues.reduce((acc, ue) => acc + ue.credits, 0)
}

function getSemesterVolume(semester: Semester): { cm: number; td: number; tp: number; stage: number; total: number } {
  const cm = semester.ues.reduce((acc, ue) => acc + ue.ecues.reduce((a, e) => a + e.cm, 0), 0)
  const td = semester.ues.reduce((acc, ue) => acc + ue.ecues.reduce((a, e) => a + e.td, 0), 0)
  const tp = semester.ues.reduce((acc, ue) => acc + ue.ecues.reduce((a, e) => a + e.tp, 0), 0)
  const stage = semester.ues.reduce((acc, ue) => acc + ue.ecues.reduce((a, e) => a + e.stage, 0), 0)
  return { cm, td, tp, stage, total: cm + td + tp + stage }
}

function normalizedLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

function getProgramIssues(program: Program, creditsPerSemester: number): string[] {
  const issues: string[] = []
  const levelCounts = new Map<string, number>()

  for (const level of program.levels) {
    const key = normalizedLabel(level.label)
    levelCounts.set(key, (levelCounts.get(key) ?? 0) + 1)

    if (level.semesters.length === 0) {
      issues.push(`${level.label} n'a aucun semestre configuré.`)
    }

    for (const semester of level.semesters) {
      const credits = getSemesterCredits(semester)
      if (semester.ues.length === 0) {
        issues.push(`${level.label} / ${semester.label} n'a aucune UE.`)
      } else if (credits < creditsPerSemester) {
        issues.push(`${level.label} / ${semester.label} totalise ${credits}/${creditsPerSemester} crédits.`)
      }
      if (semester.ues.some((ue) => ue.ecues.length === 0)) {
        issues.push(`${level.label} / ${semester.label} contient des UE sans EC/matière.`)
      }
    }
  }

  for (const [label, count] of levelCounts.entries()) {
    if (count > 1) {
      issues.push(`Niveau en doublon détecté : ${label} (${count} fois).`)
    }
  }

  if (program.levels.length === 0) {
    issues.push('Aucun niveau configuré pour ce programme.')
  }

  return issues
}

// ─── useCountUp Hook ──────────────────────────────────────────────────────────

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

const UE_TYPE_OPTIONS = [
  { value: 'FONDAMENTALE', label: 'Fondamentale' },
  { value: 'COMPLEMENTAIRE', label: 'Complémentaire' },
  { value: 'TRANSVERSALE', label: 'Transversale' },
  { value: 'METHODE', label: 'Méthodologie' },
  { value: 'LANGUE', label: 'Langue' },
  { value: 'STAGE', label: 'Stage' },
  { value: 'MEMOIRE', label: 'Mémoire' },
]

function validNumber(value: string, minimum: number, integer = false): boolean {
  if (!value.trim()) return false
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= minimum && (!integer || Number.isInteger(parsed))
}

function EditTeachingUnitDialog({ ue }: { ue: UE }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [code, setCode] = useState(ue.code)
  const [name, setName] = useState(ue.nom)
  const [credits, setCredits] = useState(String(ue.credits))
  const [type, setType] = useState(ue.rawType || 'FONDAMENTALE')
  const [orderIndex, setOrderIndex] = useState(String(ue.orderIndex))
  const [compensable, setCompensable] = useState(ue.compensable)

  const reset = () => {
    setCode(ue.code)
    setName(ue.nom)
    setCredits(String(ue.credits))
    setType(ue.rawType || 'FONDAMENTALE')
    setOrderIndex(String(ue.orderIndex))
    setCompensable(ue.compensable)
  }

  const handleSave = async () => {
    if (!name.trim() || name.trim().length > 200 || code.trim().length > 20 || !validNumber(credits, 1, true) || !validNumber(orderIndex, 0, true)) {
      toast.error('Vérifiez l’intitulé, le code (20 caractères maximum), les crédits entiers positifs et l’ordre entier positif ou nul.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/structure?type=teaching-unit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: ue.id,
          code: code.trim(),
          name: name.trim(),
          credits: Number(credits),
          type,
          compensable,
          orderIndex: Number(orderIndex),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Modification impossible')
      toast.success('UE mise à jour')
      queryClient.invalidateQueries({ queryKey: ['structure'] })
      setOpen(false)
    } catch (e) {
      toast.error('Modification impossible', {
        description: e instanceof Error ? e.message : 'Une erreur est survenue.',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (next) reset() }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Modifier l’UE" aria-label={`Modifier l’UE ${ue.nom}`} onClick={(e) => e.stopPropagation()}>
          <Edit3 className="size-3.5 text-[#1a2744]" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="text-[#1a2744]">Modifier l&apos;UE</DialogTitle>
          <DialogDescription>Code, intitulé, crédits, type, compensation et ordre d&apos;affichage.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label>Code UE</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Crédits</Label>
            <Input type="number" min="1" step="1" value={credits} onChange={(e) => setCredits(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Intitulé</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UE_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Ordre</Label>
            <Input type="number" min="0" step="1" value={orderIndex} onChange={(e) => setOrderIndex(e.target.value)} />
          </div>
          <div className="sm:col-span-2 flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Compensable</Label>
              <p className="text-xs text-gray-500">L&apos;UE peut entrer dans les règles de compensation.</p>
            </div>
            <Switch checked={compensable} onCheckedChange={setCompensable} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Annuler</Button>
          <Button className="bg-[#2d7a4f] hover:bg-[#236b40] text-white" onClick={handleSave} disabled={busy}>
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditCourseElementDialog({ ecue }: { ecue: ECUE }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [code, setCode] = useState(ecue.code)
  const [name, setName] = useState(ecue.nom)
  const [coefficient, setCoefficient] = useState(String(ecue.coefficient))
  const [hoursCM, setHoursCM] = useState(String(ecue.cm))
  const [hoursTD, setHoursTD] = useState(String(ecue.td))
  const [hoursTP, setHoursTP] = useState(String(ecue.tp))
  const [hoursStage, setHoursStage] = useState(String(ecue.stage))
  const [hoursPersonal, setHoursPersonal] = useState(String(ecue.personal))
  const [orderIndex, setOrderIndex] = useState(String(ecue.orderIndex))

  const reset = () => {
    setCode(ecue.code)
    setName(ecue.nom)
    setCoefficient(String(ecue.coefficient))
    setHoursCM(String(ecue.cm))
    setHoursTD(String(ecue.td))
    setHoursTP(String(ecue.tp))
    setHoursStage(String(ecue.stage))
    setHoursPersonal(String(ecue.personal))
    setOrderIndex(String(ecue.orderIndex))
  }

  const handleSave = async () => {
    if (!name.trim() || name.trim().length > 200 || code.trim().length > 20 || !validNumber(coefficient, Number.EPSILON) || !validNumber(orderIndex, 0, true) || ![hoursCM, hoursTD, hoursTP, hoursStage, hoursPersonal].every((value) => validNumber(value, 0))) {
      toast.error('Vérifiez l’intitulé, le code, le coefficient positif, les heures positives ou nulles et l’ordre entier.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/structure?type=course-element', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: ecue.id,
          code: code.trim(),
          name: name.trim(),
          coefficient: Number(coefficient),
          hoursCM: Number(hoursCM),
          hoursTD: Number(hoursTD),
          hoursTP: Number(hoursTP),
          hoursStage: Number(hoursStage),
          hoursPersonal: Number(hoursPersonal),
          orderIndex: Number(orderIndex),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Modification impossible')
      toast.success('Matière mise à jour')
      queryClient.invalidateQueries({ queryKey: ['structure'] })
      setOpen(false)
    } catch (e) {
      toast.error('Modification impossible', {
        description: e instanceof Error ? e.message : 'Une erreur est survenue.',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (next) reset() }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Modifier la matière" aria-label={`Modifier la matière ${ecue.nom}`} onClick={(e) => e.stopPropagation()}>
          <Edit3 className="size-3.5 text-[#1a2744]" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="text-[#1a2744]">Modifier la matière / EC</DialogTitle>
          <DialogDescription>Intitulé, coefficient, volumes horaires et ordre d&apos;affichage.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label>Code EC</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Coefficient</Label>
            <Input type="number" min="0" step="any" value={coefficient} onChange={(e) => setCoefficient(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Intitulé</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Heures CM</Label>
            <Input type="number" min="0" step="any" value={hoursCM} onChange={(e) => setHoursCM(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Heures TD</Label>
            <Input type="number" min="0" step="any" value={hoursTD} onChange={(e) => setHoursTD(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Heures TP</Label>
            <Input type="number" min="0" step="any" value={hoursTP} onChange={(e) => setHoursTP(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Stage</Label>
            <Input type="number" min="0" step="any" value={hoursStage} onChange={(e) => setHoursStage(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Travail personnel</Label>
            <Input type="number" min="0" step="any" value={hoursPersonal} onChange={(e) => setHoursPersonal(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Ordre</Label>
            <Input type="number" min="0" step="1" value={orderIndex} onChange={(e) => setOrderIndex(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Annuler</Button>
          <Button className="bg-[#2d7a4f] hover:bg-[#236b40] text-white" onClick={handleSave} disabled={busy}>
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Semester Component ───────────────────────────────────────────────────────

function SemesterView({ semester }: { semester: Semester }) {
  const [expandedUEs, setExpandedUEs] = useState<Set<string>>(new Set())
  const totalCredits = getSemesterCredits(semester)
  const volume = getSemesterVolume(semester)

  const toggleUE = (id: string) => {
    setExpandedUEs(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="space-y-4">
      {/* Semester summary */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50">
          <CreditCard className="size-4 text-[#2d7a4f]" />
          <span className="text-sm text-gray-600">Total crédits :</span>
          <span className="text-sm font-bold text-[#1a2744]">{totalCredits}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50">
          <Clock className="size-4 text-[#1a2744]" />
          <span className="text-sm text-gray-600">CM :</span>
          <span className="text-sm font-bold text-[#1a2744]">{volume.cm}h</span>
          <span className="text-sm text-gray-400 mx-1">|</span>
          <span className="text-sm text-gray-600">TD :</span>
          <span className="text-sm font-bold text-[#2d7a4f]">{volume.td}h</span>
          <span className="text-sm text-gray-400 mx-1">|</span>
          <span className="text-sm text-gray-600">TP :</span>
          <span className="text-sm font-bold text-[#d4a853]">{volume.tp}h</span>
          {volume.stage > 0 && (
            <>
              <span className="text-sm text-gray-400 mx-1">|</span>
              <span className="text-sm text-gray-600">Stage :</span>
              <span className="text-sm font-bold text-[#7b1fa2]">{volume.stage}h</span>
            </>
          )}
          <span className="text-sm text-gray-400 mx-1">|</span>
          <span className="text-sm text-gray-600">Total :</span>
          <span className="text-sm font-bold text-[#1a2744]">{volume.total}h</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50">
          <Layers className="size-4 text-[#d4a853]" />
          <span className="text-sm text-gray-600">UEs :</span>
          <span className="text-sm font-bold text-[#1a2744]">{semester.ues.length}</span>
        </div>
      </div>

      {/* UE Table */}
      <Card>
        <div className="h-1 bg-gradient-to-r from-[#1a2744] via-[#2d7a4f] to-[#d4a853]" />
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-xs font-semibold w-8"></TableHead>
                  <TableHead className="text-xs font-semibold">Code UE</TableHead>
                  <TableHead className="text-xs font-semibold">Nom UE</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Crédits</TableHead>
                  <TableHead className="text-xs font-semibold">Type</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Compensable</TableHead>
                  <TableHead className="text-xs font-semibold">Responsable</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {semester.ues.map((ue) => {
                  const isExpanded = expandedUEs.has(ue.id)
                  const hasEcues = ue.ecues.length > 0
                  return (
                    <Fragment key={ue.id}>
                      <TableRow
                        className={`hover:bg-gray-50/50 cursor-pointer ${hasEcues ? '' : 'opacity-80'}`}
                        onClick={() => hasEcues && toggleUE(ue.id)}
                      >
                        <TableCell className="py-2 w-8">
                          {hasEcues && (
                            isExpanded ? (
                              <ChevronDown className="size-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="size-4 text-gray-400" />
                            )
                          )}
                        </TableCell>
                        <TableCell className="py-2">
                          <span className="text-xs font-mono text-[#2d7a4f] font-semibold">{ue.code}</span>
                        </TableCell>
                        <TableCell className="py-2">
                          <span className="text-sm font-medium text-[#1a2744]">{ue.nom}</span>
                        </TableCell>
                        <TableCell className="py-2 text-center">
                          <span className="text-sm font-bold text-[#1a2744]">{ue.credits}</span>
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge className={`text-[10px] ${typeConfig[ue.type].className}`}>
                            {ue.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 text-center">
                          {ue.compensable ? (
                            <Badge className="text-[10px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">Oui</Badge>
                          ) : (
                            <Badge className="text-[10px] bg-[#c6282815] text-[#c62828] border-0">Non</Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-2">
                          <span className="text-xs text-gray-600">{ue.responsable}</span>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <EditTeachingUnitDialog ue={ue} />
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && hasEcues && (
                        ue.ecues.map((ecue) => (
                          <TableRow key={ecue.id} className="bg-[#f8faf9] hover:bg-[#f0f5f1]">
                            <TableCell className="py-1.5 w-8"></TableCell>
                            <TableCell className="py-1.5">
                              <span className="text-[10px] font-mono text-gray-400 ml-4">{ecue.code}</span>
                            </TableCell>
                            <TableCell className="py-1.5">
                              <span className="text-xs text-gray-600 ml-4">{ecue.nom}</span>
                            </TableCell>
                            <TableCell className="py-1.5 text-center">
                              <span className="text-xs text-gray-500">Coeff. {ecue.coefficient}</span>
                            </TableCell>
                            <TableCell className="py-1.5">
                              <div className="flex gap-1 ml-2">
                                {ecue.cm > 0 && <Badge className="text-[9px] bg-[#1a274410] text-[#1a2744] border-0">CM {ecue.cm}h</Badge>}
                                {ecue.td > 0 && <Badge className="text-[9px] bg-[#2d7a4f10] text-[#2d7a4f] border-0">TD {ecue.td}h</Badge>}
                                {ecue.tp > 0 && <Badge className="text-[9px] bg-[#d4a85310] text-[#d4a853] border-0">TP {ecue.tp}h</Badge>}
                                {ecue.stage > 0 && <Badge className="text-[9px] bg-[#7b1fa210] text-[#7b1fa2] border-0">Stage {ecue.stage}h</Badge>}
                              </div>
                            </TableCell>
                            <TableCell className="py-1.5"></TableCell>
                            <TableCell className="py-1.5">
                              <span className="text-[10px] text-gray-500">{ecue.enseignant}</span>
                            </TableCell>
                            <TableCell className="py-1.5">
                              <div className="flex justify-end gap-1">
                                <EditCourseElementDialog ecue={ecue} />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </Fragment>
                  )
                })}
                {semester.ues.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-sm text-gray-500">
                      Aucune UE n&apos;est encore configurée pour ce semestre.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MaquettePage() {
  const setView = useAppStore((s) => s.setView)
  const { data: structureData, isLoading } = useStructure()
  const programs = mapStructureToPrograms(structureData?.faculties || [])
  const creditsPerSemester = structureData?.tenant?.settings?.creditsPerSemester ?? 30
  const [selectedProgram, setSelectedProgram] = useState<string | undefined>(undefined)
  const program = programs.find(p => p.id === selectedProgram) || programs[0]

  const handleExportMaquette = () => {
    if (!program) return
    const rows = program.levels.flatMap((lvl) =>
      lvl.semesters.flatMap((sem) =>
        sem.ues.flatMap((ue) =>
          (ue.ecues.length > 0 ? ue.ecues : [null]).map((ec) => ({
            Programme: program.label,
            Niveau: lvl.label,
            Semestre: sem.label,
            'Code UE': ue.code,
            UE: ue.nom,
            Credits: ue.credits,
            Type: ue.type,
            'Code ECUE': ec?.code || '',
            ECUE: ec?.nom || '',
            Coefficient: ec?.coefficient ?? '',
            Enseignant: ec?.enseignant || '',
          })),
        ),
      ),
    )
    if (rows.length === 0) {
      toast.info('Aucune donnée à exporter', { description: 'Configurez au moins une UE dans Structure avant export.' })
      return
    }
    exportToExcel(rows, `maquette_${program.label.replace(/\s+/g, '_').replace(/[^\w-]/g, '')}`)
  }

  const totalUEs = programs.reduce(
    (a, p) => a + p.levels.reduce((b, l) => b + l.semesters.reduce((c, s) => c + s.ues.length, 0), 0),
    0
  )
  const totalUEsCount = useCountUp(totalUEs, 1400)
  const programmesActifsCount = useCountUp(programs.length, 1200)
  const selectedProgramUEs = program
    ? program.levels.reduce((a, l) => a + l.semesters.reduce((b, s) => b + s.ues.length, 0), 0)
    : 0
  const selectedProgramCredits = program
    ? program.levels.reduce((a, l) => a + l.semesters.reduce((b, s) => b + getSemesterCredits(s), 0), 0)
    : 0
  const selectedIssues = program ? getProgramIssues(program, creditsPerSemester) : []
  const programsReady = programs.filter((p) => getProgramIssues(p, creditsPerSemester).length === 0).length
  const affectedStudents = programs
    .filter((p) => getProgramIssues(p, creditsPerSemester).length > 0)
    .reduce((sum, p) => sum + p.studentCount, 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-gray-500">
        Chargement des maquettes pédagogiques...
      </div>
    )
  }

  if (!program) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <div>
          <p className="text-sm font-medium text-[#1a2744]">Aucun programme pédagogique configuré</p>
          <p className="text-sm text-gray-500 mt-1">Créez d&apos;abord la structure académique avant d&apos;afficher une maquette.</p>
        </div>
        <Button className="bg-[#2d7a4f] hover:bg-[#236b40] text-white" onClick={() => setView('structure')}>
          <Plus className="size-4 mr-2" />
          Gérer la structure
        </Button>
      </div>
    )
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
              <h1 className="text-xl md:text-2xl font-bold text-white">Maquettes pedagogiques</h1>
              <p className="text-sm text-white/70 mt-1">Programmes, unites d&apos;enseignement et regles de compensation</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                className="bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 text-white text-xs"
                onClick={() => setView('structure')}
              >
                <Plus className="size-3.5 mr-1.5" />
                Gerer la structure
              </Button>
              <Button
                size="sm"
                className="bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 text-white text-xs"
                onClick={handleExportMaquette}
                disabled={selectedProgramUEs === 0}
              >
                <Download className="size-3.5 mr-1.5" />
                Exporter
              </Button>
            </div>
          </div>
          {/* Glass-morphism stat cards */}
          <div className="flex gap-4 mt-4">
            <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }} className="bg-white/10 backdrop-blur border border-white/15 rounded-lg px-4 py-3">
              <div className="text-white/60 text-xs">Total UEs</div>
              <div className="text-white text-2xl font-bold">{totalUEsCount}</div>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }} className="bg-white/10 backdrop-blur border border-white/15 rounded-lg px-4 py-3">
              <div className="text-white/60 text-xs">Programmes actifs</div>
              <div className="text-white text-2xl font-bold">{programmesActifsCount}</div>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }} className="bg-white/10 backdrop-blur border border-white/15 rounded-lg px-4 py-3">
              <div className="text-white/60 text-xs">Prêts inscription</div>
              <div className="text-white text-2xl font-bold">{programsReady}/{programs.length}</div>
            </motion.div>
          </div>
        </div>
      </div>

      <Card className={selectedIssues.length > 0 ? 'border-amber-200 bg-amber-50/70' : 'border-emerald-200 bg-emerald-50/70'}>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 rounded-full p-2 ${selectedIssues.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {selectedIssues.length > 0 ? <AlertTriangle className="size-5" /> : <CheckCircle2 className="size-5" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#1a2744]">
                  {selectedIssues.length > 0 ? 'Maquette à compléter avant inscription pédagogique' : 'Maquette exploitable pour l’inscription pédagogique'}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {program.label} — {selectedProgramUEs} UE, {selectedProgramCredits} crédits, {program.studentCount} étudiant(s) rattaché(s).
                  {affectedStudents > 0 ? ` ${affectedStudents} étudiant(s) sont rattachés à un programme avec anomalie.` : ''}
                </p>
                {selectedIssues.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm text-amber-900">
                    {selectedIssues.slice(0, 5).map((issue) => (
                      <li key={issue}>• {issue}</li>
                    ))}
                    {selectedIssues.length > 5 && <li>• {selectedIssues.length - 5} autre(s) anomalie(s).</li>}
                  </ul>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              className="shrink-0 bg-white"
              onClick={() => setView('structure')}
            >
              Corriger dans Structure
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Program summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
        <Card>
          <div className="h-1 bg-gradient-to-r from-[#1a2744] via-[#2d7a4f] to-[#d4a853]" />
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Niveaux</p>
                <p className="text-2xl font-bold text-[#1a2744] mt-1">{program.levels.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#1a274415] flex items-center justify-center">
                <Layers className="size-5 text-[#1a2744]" />
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>
        <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
        <Card>
          <div className="h-1 bg-gradient-to-r from-[#1a2744] via-[#2d7a4f] to-[#d4a853]" />
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Semestres</p>
                <p className="text-2xl font-bold text-[#2d7a4f] mt-1">{program.levels.reduce((a, l) => a + l.semesters.length, 0)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#2d7a4f15] flex items-center justify-center">
                <BookOpen className="size-5 text-[#2d7a4f]" />
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>
        <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
        <Card>
          <div className="h-1 bg-gradient-to-r from-[#1a2744] via-[#2d7a4f] to-[#d4a853]" />
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Total UEs</p>
                <p className="text-2xl font-bold text-[#d4a853] mt-1">{program.levels.reduce((a, l) => a + l.semesters.reduce((b, s) => b + s.ues.length, 0), 0)}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#d4a85315] flex items-center justify-center">
                <GraduationCap className="size-5 text-[#d4a853]" />
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>
        <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
        <Card>
          <div className="h-1 bg-gradient-to-r from-[#1a2744] via-[#2d7a4f] to-[#d4a853]" />
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Crédits totaux</p>
                <p className="text-2xl font-bold text-[#1a2744] mt-1">{selectedProgramCredits}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#1a274415] flex items-center justify-center">
                <CreditCard className="size-5 text-[#1a2744]" />
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>
      </div>

      {/* Program selector */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-gray-500 uppercase">Programme</span>
        <Select value={program.id} onValueChange={setSelectedProgram}>
          <SelectTrigger className="w-[200px] h-9 text-sm">
            <SelectValue placeholder="Programme" />
          </SelectTrigger>
          <SelectContent>
            {programs.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Level Tabs */}
      {program.levels.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-500">
          Ce programme n&apos;a pas encore de niveaux configurés.
        </div>
      ) : (
      <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
      <Tabs key={program.id} defaultValue={program.levels[0].id}>
        <TabsList className="bg-gray-100">
          {program.levels.map(level => (
            <TabsTrigger key={level.id} value={level.id} className="text-xs">
              {level.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {program.levels.map(level => (
          <TabsContent key={level.id} value={level.id} className="mt-4">
            {level.semesters.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-sm text-gray-500">
                Ce niveau n&apos;a pas encore de semestres configurés.
              </div>
            ) : (
            <Tabs key={level.id} defaultValue={level.semesters[0].id}>
              <TabsList className="bg-gray-50 mb-4">
                {level.semesters.map(sem => (
                  <TabsTrigger key={sem.id} value={sem.id} className="text-xs">
                    {sem.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {level.semesters.map(sem => (
                <TabsContent key={sem.id} value={sem.id} className="mt-4">
                  <SemesterView semester={sem} />
                </TabsContent>
              ))}
            </Tabs>
            )}
          </TabsContent>
        ))}
      </Tabs>
      </motion.div>
      )}
    </motion.div>
  )
}


