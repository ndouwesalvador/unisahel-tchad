'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Building2,
  ChevronRight,
  ChevronDown,
  Plus,
  Edit3,
  BookOpen,
  GraduationCap,
  FlaskConical,
  Scale,
  PenTool,
  Globe,
  Microscope,
  Laptop,
  Leaf,
  LayoutGrid,
  List,
  Search,
  Stethoscope,
  Landmark,
  Handshake,
  TrendingUp,
  Layers,
  CalendarRange,
  BookMarked,
  FileText,
  Trash2,
} from 'lucide-react'
import { useStructure } from '@/lib/api-hooks'

// ─── Faculty Data ────────────────────────────────────────────────────────────

interface Department {
  id: string
  name: string
  icon: React.ElementType
  programs: { id: string; name: string; levels: string[] }[]
  teachers: number
  students: number
}

interface Faculty {
  id: string
  name: string
  dean: string
  icon: React.ElementType
  gradientFrom: string
  gradientTo: string
  departments: Department[]
  students: number
  teachers: number
}

// ─── API Response Types (shape returned by GET /api/structure) ────────────

interface ApiTeacherRef {
  id: string
  employeeId: string
  grade: string
  specialization?: string | null
  user: { firstName: string; lastName: string }
}

interface ApiCourseElement {
  id: string
  teacher: ApiTeacherRef | null
}

interface ApiTeachingUnit {
  id: string
  name: string
  code?: string | null
  responsible: ApiTeacherRef | null
  courseElements: ApiCourseElement[]
}

interface ApiSemester {
  id: string
  name: string
  code?: string | null
  teachingUnits: ApiTeachingUnit[]
}

interface ApiLevel {
  id: string
  name: string
  orderIndex: number
  semesters: ApiSemester[]
}

interface ApiProgram {
  id: string
  name: string
  levels: ApiLevel[]
}

interface ApiDepartment {
  id: string
  name: string
  programs: ApiProgram[]
}

export interface ApiFaculty {
  id: string
  name: string
  deanName?: string | null
  deanTitle?: string | null
  departments: ApiDepartment[]
}

// ─── Mapping: API shape → Local UI shape ───────────────────────────────────
//
// Cosmetic fields with no equivalent in the API response (icon, gradient
// colors) are assigned from a fixed palette cycled by index rather than
// fabricated per-entity. Student counts have no data source on this endpoint
// (the Student model isn't included in /api/structure) and default to 0.
// Teacher counts ARE derived from real data: distinct teachers referenced as
// `responsible` or `teacher` on teaching units / course elements nested under
// the faculty or department.

const FACULTY_ICONS: React.ElementType[] = [Scale, FlaskConical, PenTool, Stethoscope, TrendingUp, Building2, Landmark, Globe]
const FACULTY_GRADIENTS: [string, string][] = [
  ['#1a2744', '#2d4a7a'],
  ['#2d7a4f', '#3da66a'],
  ['#d4a853', '#e8c97a'],
  ['#5b8c5a', '#7ab87a'],
  ['#8b5e3c', '#b87a50'],
]
const DEPARTMENT_ICONS: React.ElementType[] = [BookOpen, Laptop, Microscope, TrendingUp, FlaskConical, Globe, Landmark, Handshake, Scale, Leaf]

function collectTeacherIdsFromPrograms(programs: ApiProgram[]): Set<string> {
  const ids = new Set<string>()
  programs.forEach(program => {
    program.levels.forEach(level => {
      level.semesters.forEach(semester => {
        semester.teachingUnits.forEach(unit => {
          if (unit.responsible) ids.add(unit.responsible.id)
          unit.courseElements.forEach(element => {
            if (element.teacher) ids.add(element.teacher.id)
          })
        })
      })
    })
  })
  return ids
}

function mapDepartment(dept: ApiDepartment, index: number): Department {
  return {
    id: dept.id,
    name: dept.name,
    icon: DEPARTMENT_ICONS[index % DEPARTMENT_ICONS.length],
    programs: dept.programs.map(program => ({
      id: program.id,
      name: program.name,
      levels: program.levels.map(level => level.name),
    })),
    teachers: collectTeacherIdsFromPrograms(dept.programs).size,
    students: 0, // no student/enrollment data available from /api/structure
  }
}

function mapFaculty(faculty: ApiFaculty, index: number): Faculty {
  const [gradientFrom, gradientTo] = FACULTY_GRADIENTS[index % FACULTY_GRADIENTS.length]
  const dean = [faculty.deanTitle, faculty.deanName].filter(Boolean).join(' ').trim()
  const allPrograms = faculty.departments.flatMap(d => d.programs)

  return {
    id: faculty.id,
    name: faculty.name,
    dean: dean || 'Non renseigné',
    icon: FACULTY_ICONS[index % FACULTY_ICONS.length],
    gradientFrom,
    gradientTo,
    departments: faculty.departments.map((dept, i) => mapDepartment(dept, i)),
    students: 0, // no student/enrollment data available from /api/structure
    teachers: collectTeacherIdsFromPrograms(allPrograms).size,
  }
}

// ─── Org Chart Tree Data ────────────────────────────────────────────────────

interface OrgNode {
  id: string
  name: string
  type: 'institution' | 'faculte' | 'departement' | 'filiere'
  icon: React.ElementType
  color: string
  count?: number
  // The /api/structure ?type= value used to edit/delete this node (absent on
  // the institution root, which isn't editable here).
  apiType?: 'faculty' | 'department' | 'program'
  children?: OrgNode[]
}

function buildOrgTree(faculties: Faculty[]): OrgNode {
  return {
    id: 'root',
    name: 'Université de N\'Djamena',
    type: 'institution',
    icon: Building2,
    color: '#1a2744',
    count: faculties.length,
    children: faculties.map(f => ({
      id: f.id,
      name: f.name,
      type: 'faculte',
      apiType: 'faculty' as const,
      icon: f.icon,
      color: f.gradientFrom,
      count: f.departments.length,
      children: f.departments.map(d => ({
        id: d.id,
        name: d.name,
        type: 'departement',
        apiType: 'department' as const,
        icon: d.icon,
        color: '#2d7a4f',
        count: d.programs.length,
        children: d.programs.map(p => ({
          id: p.id,
          name: p.name,
          type: 'filiere',
          apiType: 'program' as const,
          icon: GraduationCap,
          color: '#d4a853',
        })),
      })),
    })),
  }
}

// ─── Node edit / delete controls ────────────────────────────────────────────
//
// Rename (PUT) and delete (DELETE) a faculty/department/program straight from
// the org tree. Deletion is soft on the backend (isActive:false) and the API
// refuses to remove anything with real academic data hanging off it, so the
// confirmation copy stays reassuring rather than alarming.

const API_TYPE_LABEL: Record<string, string> = {
  faculty: 'la faculté',
  department: 'le département',
  program: 'le programme',
}

function NodeActions({ apiType, id, name }: { apiType: 'faculty' | 'department' | 'program'; id: string; name: string }) {
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [newName, setNewName] = useState(name)
  const [busy, setBusy] = useState(false)

  const doEdit = async () => {
    if (!newName.trim()) {
      toast.error('Nom requis')
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/structure?type=${apiType}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: newName.trim() }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Échec de la modification')
      toast.success('Modifié')
      queryClient.invalidateQueries({ queryKey: ['structure'] })
      setEditOpen(false)
    } catch (e) {
      toast.error('Erreur', { description: e instanceof Error ? e.message : 'Échec de la modification' })
    } finally {
      setBusy(false)
    }
  }

  const doDelete = async () => {
    setBusy(true)
    try {
      const res = await fetch(`/api/structure?type=${apiType}&id=${id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Échec de la suppression')
      toast.success('Supprimé')
      queryClient.invalidateQueries({ queryKey: ['structure'] })
      setDeleteOpen(false)
    } catch (e) {
      toast.error('Suppression impossible', { description: e instanceof Error ? e.message : 'Échec de la suppression' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (o) setNewName(name) }}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Renommer">
            <Edit3 className="size-3 text-gray-600" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1a2744]">Renommer</DialogTitle>
            <DialogDescription>Modifier le nom de {API_TYPE_LABEL[apiType]}.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label className="text-sm font-medium">Nom</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="h-10" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} className="text-xs" disabled={busy}>Annuler</Button>
            <Button className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs" onClick={doEdit} disabled={busy}>
              {busy ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Supprimer">
            <Trash2 className="size-3 text-red-500" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1a2744]">Supprimer {API_TYPE_LABEL[apiType]}</DialogTitle>
            <DialogDescription>
              « {name} » sera désactivé et masqué de la structure. Les étudiants et notes déjà rattachés sont conservés. Continuer ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} className="text-xs" disabled={busy}>Annuler</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white text-xs" onClick={doDelete} disabled={busy}>
              {busy ? 'Suppression…' : 'Supprimer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Org Node Component ────────────────────────────────────────────────────

function OrgNodeComponent({ node, depth = 0 }: { node: OrgNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2)
  const hasChildren = node.children && node.children.length > 0
  const Icon = node.icon

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
        style={{ marginLeft: depth > 0 ? 0 : 0, paddingLeft: `${depth * 24 + 12}px` }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {/* Expand/Collapse */}
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="size-4 text-gray-400 shrink-0" />
          ) : (
            <ChevronRight className="size-4 text-gray-400 shrink-0" />
          )
        ) : (
          <div className="w-4 shrink-0" />
        )}

        {/* Icon */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${node.color}15` }}
        >
          <Icon className="size-4" style={{ color: node.color }} />
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <span className={`text-sm ${depth === 0 ? 'font-bold' : 'font-medium'} text-[#1a2744] truncate`}>
            {node.name}
          </span>
        </div>

        {/* Count Badge */}
        {node.count !== undefined && (
          <Badge
            className="text-[10px] px-2 border-0 shrink-0"
            style={{ backgroundColor: `${node.color}15`, color: node.color }}
          >
            {node.count} {node.type === 'faculte' ? 'dépts' : node.type === 'departement' ? 'filières' : ''}
          </Badge>
        )}

        {/* Type Label */}
        <Badge
          className="text-[9px] px-1.5 border-0 shrink-0 capitalize"
          style={{ backgroundColor: `${node.color}10`, color: node.color }}
        >
          {node.type === 'institution' ? 'Institution' : node.type === 'faculte' ? 'Faculté' : node.type === 'departement' ? 'Département' : 'Filière'}
        </Badge>

        {/* Edit / delete (faculties, departments, programs) */}
        {node.apiType && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <NodeActions apiType={node.apiType} id={node.id} name={node.name} />
          </div>
        )}
      </div>

      {/* Children */}
      <AnimatePresence>
        {expanded && hasChildren && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Connector lines */}
            <div className="relative">
              <div
                className="absolute top-0 bottom-0 border-l-2 border-gray-200"
                style={{ left: `${depth * 24 + 24}px` }}
              />
              {node.children!.map((child) => (
                <OrgNodeComponent key={child.id} node={child} depth={depth + 1} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Faculty Card Component ─────────────────────────────────────────────────

function FacultyCard({ faculty, index }: { faculty: Faculty; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = faculty.icon

  const totalPrograms = faculty.departments.reduce((acc, d) => acc + d.programs.length, 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08 }}
    >
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group">
        {/* Gradient Top Border */}
        <div
          className="h-2"
          style={{
            background: `linear-gradient(to right, ${faculty.gradientFrom}, ${faculty.gradientTo})`,
          }}
        />

        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-start gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${faculty.gradientFrom}15` }}
            >
              <Icon className="size-6" style={{ color: faculty.gradientFrom }} />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm font-bold text-[#1a2744] leading-tight">
                {faculty.name}
              </CardTitle>
              <p className="text-xs text-gray-400 mt-0.5">Doyen : {faculty.dean}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[10px] shrink-0"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Réduire' : 'Détails'}
              <ChevronDown className={`size-3 ml-1 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-4">
          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="text-center p-2 rounded-lg bg-gray-50">
              <p className="text-lg font-bold text-[#1a2744]">{faculty.departments.length}</p>
              <p className="text-[10px] text-gray-400">Départements</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-gray-50">
              <p className="text-lg font-bold text-[#2d7a4f]">{totalPrograms}</p>
              <p className="text-[10px] text-gray-400">Programmes</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-gray-50">
              <p className="text-lg font-bold text-[#d4a853]">{faculty.students}</p>
              <p className="text-[10px] text-gray-400">Étudiants</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-gray-50">
              <p className="text-lg font-bold text-[#5b8c5a]">{faculty.teachers}</p>
              <p className="text-[10px] text-gray-400">Enseignants</p>
            </div>
          </div>

          {/* Expanded: Departments */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <p className="text-xs font-semibold text-[#1a2744] mb-2">Départements</p>
                  {faculty.departments.map(dept => {
                    const DeptIcon = dept.icon
                    return (
                      <div
                        key={dept.id}
                        className="flex items-center gap-2.5 p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div
                          className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${faculty.gradientFrom}12` }}
                        >
                          <DeptIcon className="size-3.5" style={{ color: faculty.gradientFrom }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[#1a2744] truncate">{dept.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-gray-400">
                              {dept.programs.length} filière{dept.programs.length > 1 ? 's' : ''}
                            </span>
                            <span className="text-[10px] text-gray-300">|</span>
                            <span className="text-[10px] text-gray-400">
                              {dept.students} étud.
                            </span>
                            <span className="text-[10px] text-gray-300">|</span>
                            <span className="text-[10px] text-gray-400">
                              {dept.teachers} ens.
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {dept.programs.slice(0, 2).map(prog => (
                            <Badge
                              key={prog.id}
                              className="text-[9px] px-1.5 border-0"
                              style={{ backgroundColor: `${faculty.gradientFrom}10`, color: faculty.gradientFrom }}
                            >
                              {prog.name}
                            </Badge>
                          ))}
                          {dept.programs.length > 2 && (
                            <Badge className="text-[9px] px-1.5 bg-gray-100 text-gray-500 border-0">
                              +{dept.programs.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Add Entity Dialog ──────────────────────────────────────────────────────

interface DialogField {
  id: string
  label: string
  type?: string
  placeholder?: string
  numeric?: boolean
  defaultValue?: string
  options?: { value: string; label: string }[]
}

// Real create dialog: controlled inputs, a POST to /api/structure?type=<type>,
// a toast, and a cache invalidation so the tree refreshes. Previously this
// dialog rendered uncontrolled inputs and its "Ajouter" button just closed
// the modal -- faculty/department/program creation looked available in the UI
// but never called the backend at all.
function AddEntityDialog({
  triggerLabel,
  triggerIcon: TriggerIcon,
  title,
  description,
  fields,
  type,
  buildBody,
}: {
  triggerLabel: string
  triggerIcon: React.ElementType
  title: string
  description: string
  fields: DialogField[]
  type: string
  buildBody: (values: Record<string, string>) => Record<string, unknown> | string
}) {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const queryClient = useQueryClient()

  const setField = (id: string, v: string) => setValues(prev => ({ ...prev, [id]: v }))

  const reset = () => setValues({})

  const handleSubmit = async () => {
    const body = buildBody(values)
    if (typeof body === 'string') {
      toast.error('Champs requis', { description: body })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/structure?type=${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || "Échec de l'enregistrement")
      toast.success(`${title} — enregistré`)
      queryClient.invalidateQueries({ queryKey: ['structure'] })
      reset()
      setOpen(false)
    } catch (e) {
      toast.error('Erreur', { description: e instanceof Error ? e.message : "Échec de l'enregistrement" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset() }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs h-9">
          <TriggerIcon className="size-3.5 mr-1.5" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#1a2744]">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {fields.map(field => (
            <div key={field.id} className="space-y-2">
              <Label className="text-sm font-medium">{field.label}</Label>
              {field.options ? (
                <Select value={values[field.id] ?? ''} onValueChange={(v) => setField(field.id, v)}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder={field.placeholder || 'Sélectionner...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type={field.numeric ? 'number' : (field.type || 'text')}
                  placeholder={field.placeholder || ''}
                  className="h-10"
                  value={values[field.id] ?? field.defaultValue ?? ''}
                  onChange={(e) => setField(field.id, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); setOpen(false) }} className="text-xs" disabled={submitting}>
            Annuler
          </Button>
          <Button
            className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs"
            onClick={handleSubmit}
            disabled={submitting}
          >
            <Plus className="size-3.5 mr-1.5" />
            {submitting ? 'Enregistrement…' : 'Ajouter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function StructurePage() {
  const { data: structureQuery, isLoading } = useStructure()
  const [viewMode, setViewMode] = useState<'cards' | 'tree'>('cards')
  const [searchQuery, setSearchQuery] = useState('')

  const faculties: Faculty[] = ((structureQuery?.faculties || []) as ApiFaculty[]).map(
    (faculty, index) => mapFaculty(faculty, index)
  )
  const orgTree = buildOrgTree(faculties)

  const totalDepartments = faculties.reduce((acc, f) => acc + f.departments.length, 0)
  const totalPrograms = faculties.reduce(
    (acc, f) => acc + f.departments.reduce((a, d) => a + d.programs.length, 0),
    0
  )

  const headerStats = [
    { label: 'Facultés', value: faculties.length, icon: Building2, color: '#1a2744' },
    { label: 'Départements', value: totalDepartments, icon: BookOpen, color: '#2d7a4f' },
    { label: 'Programmes', value: totalPrograms, icon: GraduationCap, color: '#d4a853' },
  ]

  // Flat option lists (each carrying the parent ids it needs) built from the
  // raw API tree, so every create dialog can offer the correct parent to
  // attach the new entity to -- faculty -> department -> program -> level ->
  // semester -> teaching unit -> course element.
  const rawFaculties = (structureQuery?.faculties || []) as ApiFaculty[]
  const facultyOptions: { value: string; label: string }[] = []
  const departmentOptions: { value: string; label: string }[] = []
  const deptToFaculty: Record<string, string> = {}
  const programOptions: { value: string; label: string }[] = []
  const levelOptions: { value: string; label: string }[] = []
  const semesterOptions: { value: string; label: string }[] = []
  const unitOptions: { value: string; label: string }[] = []
  rawFaculties.forEach((f) => {
    facultyOptions.push({ value: f.id, label: f.name })
    f.departments.forEach((d) => {
      deptToFaculty[d.id] = f.id
      departmentOptions.push({ value: d.id, label: `${f.name} — ${d.name}` })
      d.programs.forEach((p) => {
        programOptions.push({ value: p.id, label: p.name })
        p.levels.forEach((l) => {
          levelOptions.push({ value: l.id, label: `${p.name} — ${l.name}` })
          l.semesters.forEach((s) => {
            semesterOptions.push({ value: s.id, label: `${p.name} · ${l.name} · ${s.name}` })
            s.teachingUnits.forEach((u) => {
              unitOptions.push({ value: u.id, label: `${s.name} · ${u.code ? u.code + ' ' : ''}${u.name}` })
            })
          })
        })
      })
    })
  })

  const CYCLE_OPTIONS = [
    { value: 'LICENCE', label: 'Licence' },
    { value: 'MASTER', label: 'Master' },
    { value: 'DOCTORAT', label: 'Doctorat' },
    { value: 'INGENIEUR', label: 'Ingénieur' },
    { value: 'DUT', label: 'DUT' },
    { value: 'BTS', label: 'BTS' },
  ]
  const UE_TYPE_OPTIONS = [
    { value: 'FONDAMENTALE', label: 'Fondamentale' },
    { value: 'COMPLEMENTAIRE', label: 'Complémentaire' },
    { value: 'TRANSVERSALE', label: 'Transversale' },
    { value: 'METHODE', label: 'Méthodologie' },
    { value: 'LANGUE', label: 'Langue' },
    { value: 'STAGE', label: 'Stage' },
    { value: 'MEMOIRE', label: 'Mémoire' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl font-bold text-[#1a2744]">Structure académique</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Organisation de l&apos;établissement : Facultés, Départements, Filières
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <AddEntityDialog
            triggerLabel="Faculté"
            triggerIcon={Building2}
            title="Nouvelle faculté"
            description="Ajoutez une nouvelle faculté à l'institution."
            type="faculty"
            fields={[
              { id: 'name', label: 'Nom de la faculté', placeholder: 'Ex: Faculté des Sciences' },
              { id: 'code', label: 'Code', placeholder: 'Ex: FST' },
              { id: 'dean', label: 'Nom du doyen (optionnel)', placeholder: 'Ex: Pr. Nom Prénom' },
            ]}
            buildBody={(v) =>
              v.name?.trim() && v.code?.trim()
                ? { name: v.name.trim(), shortName: v.code.trim(), deanName: v.dean?.trim() || undefined }
                : 'Le nom et le code de la faculté sont requis.'
            }
          />
          <AddEntityDialog
            triggerLabel="Département"
            triggerIcon={BookOpen}
            title="Nouveau département"
            description="Ajoutez un département à une faculté existante."
            type="department"
            fields={[
              { id: 'name', label: 'Nom du département', placeholder: 'Ex: Département d\'Informatique' },
              { id: 'code', label: 'Code', placeholder: 'Ex: INFO' },
              { id: 'faculty', label: 'Faculté rattachée', placeholder: 'Sélectionner la faculté', options: facultyOptions },
              { id: 'head', label: 'Chef de département (optionnel)', placeholder: 'Ex: Dr. Nom Prénom' },
            ]}
            buildBody={(v) =>
              v.name?.trim() && v.code?.trim() && v.faculty
                ? { facultyId: v.faculty, name: v.name.trim(), shortName: v.code.trim(), headName: v.head?.trim() || undefined }
                : 'Le nom, le code et la faculté sont requis.'
            }
          />
          <AddEntityDialog
            triggerLabel="Programme"
            triggerIcon={GraduationCap}
            title="Nouveau programme (filière)"
            description="Ajoutez un programme diplômant à un département existant."
            type="program"
            fields={[
              { id: 'name', label: 'Nom du programme', placeholder: 'Ex: Licence en Informatique' },
              { id: 'code', label: 'Code', placeholder: 'Ex: LINF' },
              { id: 'department', label: 'Département', placeholder: 'Sélectionner le département', options: departmentOptions },
              { id: 'cycle', label: 'Cycle', placeholder: 'Sélectionner le cycle', options: CYCLE_OPTIONS },
              { id: 'diplomaType', label: 'Type de diplôme', placeholder: 'Ex: Licence' },
              { id: 'duration', label: 'Durée (années)', placeholder: 'Ex: 3', numeric: true },
            ]}
            buildBody={(v) => {
              if (!v.name?.trim() || !v.code?.trim() || !v.department || !v.cycle || !v.diplomaType?.trim() || !v.duration) {
                return 'Nom, code, département, cycle, type de diplôme et durée sont requis.'
              }
              return {
                facultyId: deptToFaculty[v.department],
                departmentId: v.department,
                name: v.name.trim(),
                code: v.code.trim(),
                cycle: v.cycle,
                diplomaType: v.diplomaType.trim(),
                duration: Number(v.duration),
              }
            }}
          />
          <AddEntityDialog
            triggerLabel="Niveau"
            triggerIcon={Layers}
            title="Nouveau niveau"
            description="Ajoutez un niveau (ex: Licence 1) à un programme."
            type="level"
            fields={[
              { id: 'program', label: 'Programme', placeholder: 'Sélectionner le programme', options: programOptions },
              { id: 'name', label: 'Nom du niveau', placeholder: 'Ex: Licence 1' },
              { id: 'code', label: 'Code', placeholder: 'Ex: L1' },
              { id: 'orderIndex', label: 'Ordre', placeholder: 'Ex: 1', numeric: true },
            ]}
            buildBody={(v) =>
              v.program && v.name?.trim() && v.code?.trim() && v.orderIndex
                ? { programId: v.program, name: v.name.trim(), code: v.code.trim(), orderIndex: Number(v.orderIndex) }
                : 'Programme, nom, code et ordre sont requis.'
            }
          />
          <AddEntityDialog
            triggerLabel="Semestre"
            triggerIcon={CalendarRange}
            title="Nouveau semestre"
            description="Ajoutez un semestre à un niveau."
            type="semester"
            fields={[
              { id: 'level', label: 'Niveau', placeholder: 'Sélectionner le niveau', options: levelOptions },
              { id: 'name', label: 'Nom du semestre', placeholder: 'Ex: Semestre 1' },
              { id: 'code', label: 'Code', placeholder: 'Ex: S1' },
              { id: 'orderIndex', label: 'Ordre', placeholder: 'Ex: 1', numeric: true },
            ]}
            buildBody={(v) =>
              v.level && v.name?.trim() && v.code?.trim() && v.orderIndex
                ? { levelId: v.level, name: v.name.trim(), code: v.code.trim(), orderIndex: Number(v.orderIndex) }
                : 'Niveau, nom, code et ordre sont requis.'
            }
          />
          <AddEntityDialog
            triggerLabel="UE"
            triggerIcon={BookMarked}
            title="Nouvelle unité d'enseignement (UE)"
            description="Ajoutez une UE à un semestre."
            type="teaching-unit"
            fields={[
              { id: 'semester', label: 'Semestre', placeholder: 'Sélectionner le semestre', options: semesterOptions },
              { id: 'code', label: 'Code', placeholder: 'Ex: INF101' },
              { id: 'name', label: 'Intitulé', placeholder: 'Ex: Algorithmique' },
              { id: 'credits', label: 'Crédits', placeholder: 'Ex: 6', numeric: true },
              { id: 'type', label: 'Type', placeholder: 'Sélectionner le type', options: UE_TYPE_OPTIONS },
              { id: 'orderIndex', label: 'Ordre', placeholder: 'Ex: 1', numeric: true },
            ]}
            buildBody={(v) =>
              v.semester && v.code?.trim() && v.name?.trim() && v.credits && v.type && v.orderIndex
                ? { semesterId: v.semester, code: v.code.trim(), name: v.name.trim(), credits: Number(v.credits), type: v.type, orderIndex: Number(v.orderIndex) }
                : 'Semestre, code, intitulé, crédits, type et ordre sont requis.'
            }
          />
          <AddEntityDialog
            triggerLabel="EC / Matière"
            triggerIcon={FileText}
            title="Nouvel élément constitutif (EC)"
            description="Ajoutez une matière (EC) à une UE."
            type="course-element"
            fields={[
              { id: 'unit', label: 'UE', placeholder: 'Sélectionner l\'UE', options: unitOptions },
              { id: 'code', label: 'Code', placeholder: 'Ex: INF101-1' },
              { id: 'name', label: 'Intitulé de la matière', placeholder: 'Ex: Structures de données' },
              { id: 'coefficient', label: 'Coefficient', placeholder: 'Ex: 2', numeric: true },
              { id: 'hoursCM', label: 'Heures CM', placeholder: 'Ex: 30', numeric: true },
              { id: 'hoursTD', label: 'Heures TD', placeholder: 'Ex: 15', numeric: true },
              { id: 'hoursTP', label: 'Heures TP', placeholder: 'Ex: 0', numeric: true },
              { id: 'orderIndex', label: 'Ordre', placeholder: 'Ex: 1', numeric: true },
            ]}
            buildBody={(v) =>
              v.unit && v.code?.trim() && v.name?.trim() && v.coefficient && v.orderIndex
                ? {
                    teachingUnitId: v.unit,
                    code: v.code.trim(),
                    name: v.name.trim(),
                    coefficient: Number(v.coefficient),
                    hoursCM: Number(v.hoursCM || 0),
                    hoursTD: Number(v.hoursTD || 0),
                    hoursTP: Number(v.hoursTP || 0),
                    orderIndex: Number(v.orderIndex),
                  }
                : 'UE, code, intitulé, coefficient et ordre sont requis.'
            }
          />
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-3 gap-4"
      >
        {headerStats.map((stat) => (
          <Card key={stat.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${stat.color}15` }}
                >
                  <stat.icon className="size-6" style={{ color: stat.color }} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1a2744]">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* View Mode Toggle + Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <Button
            variant={viewMode === 'cards' ? 'default' : 'ghost'}
            size="sm"
            className={`text-xs h-8 ${viewMode === 'cards' ? 'bg-white shadow-sm text-[#1a2744]' : 'text-gray-500'}`}
            onClick={() => setViewMode('cards')}
          >
            <LayoutGrid className="size-3.5 mr-1" />
            Cartes
          </Button>
          <Button
            variant={viewMode === 'tree' ? 'default' : 'ghost'}
            size="sm"
            className={`text-xs h-8 ${viewMode === 'tree' ? 'bg-white shadow-sm text-[#1a2744]' : 'text-gray-500'}`}
            onClick={() => setViewMode('tree')}
          >
            <List className="size-3.5 mr-1" />
            Organigramme
          </Button>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="size-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </motion.div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          Chargement...
        </div>
      ) : (
      <AnimatePresence mode="wait">
        {viewMode === 'cards' ? (
          <motion.div
            key="cards"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {/* Faculty Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {faculties
                .filter(f => !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((faculty, idx) => (
                  <FacultyCard key={faculty.id} faculty={faculty} index={idx} />
                ))}
            </div>

            {/* Summary Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="mt-6"
            >
              <Card className="bg-[#1a274408] border-[#1a274420]">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#1a274415] flex items-center justify-center">
                        <Building2 className="size-5 text-[#1a2744]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#1a2744]">Résumé de la structure</p>
                        <p className="text-xs text-gray-500">
                          {faculties.length} facultés, {totalDepartments} départements, {totalPrograms} programmes
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-lg font-bold text-[#1a2744]">
                          {faculties.reduce((acc, f) => acc + f.students, 0)}
                        </p>
                        <p className="text-[10px] text-gray-400">Étudiants</p>
                      </div>
                      <div className="w-px h-8 bg-gray-200" />
                      <div className="text-center">
                        <p className="text-lg font-bold text-[#2d7a4f]">
                          {faculties.reduce((acc, f) => acc + f.teachers, 0)}
                        </p>
                        <p className="text-[10px] text-gray-400">Enseignants</p>
                      </div>
                      <div className="w-px h-8 bg-gray-200" />
                      <div className="text-center">
                        <p className="text-lg font-bold text-[#d4a853]">LMD</p>
                        <p className="text-[10px] text-gray-400">Système</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="tree"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {/* Visual Organization Chart */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#1a274415] flex items-center justify-center">
                      <Building2 className="size-4 text-[#1a2744]" />
                    </div>
                    <CardTitle className="text-sm font-semibold text-[#1a2744]">
                      Organigramme académique
                    </CardTitle>
                  </div>
                  <Badge className="text-[10px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">
                    Système LMD
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-2">
                <div className="max-h-[600px] overflow-y-auto">
                  <OrgNodeComponent node={orgTree} depth={0} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      )}
    </div>
  )
}
