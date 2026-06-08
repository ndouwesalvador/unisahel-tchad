'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
} from 'lucide-react'

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

const faculties: Faculty[] = [
  {
    id: 'f1',
    name: 'Faculté de Droit et Sciences Politiques',
    dean: 'Pr. Youssouf Abakar',
    icon: Scale,
    gradientFrom: '#1a2744',
    gradientTo: '#2d4a7a',
    departments: [
      {
        id: 'd1', name: 'Droit Privé', icon: Scale, teachers: 12, students: 340,
        programs: [
          { id: 'fi1', name: 'Droit Privé', levels: ['Licence 1', 'Licence 2', 'Licence 3', 'Master 1', 'Master 2'] },
          { id: 'fi2', name: 'Droit des Affaires', levels: ['Master 1', 'Master 2'] },
        ],
      },
      {
        id: 'd2', name: 'Droit Public', icon: Landmark, teachers: 10, students: 280,
        programs: [
          { id: 'fi3', name: 'Droit Public', levels: ['Licence 1', 'Licence 2', 'Licence 3', 'Master 1', 'Master 2'] },
          { id: 'fi4', name: 'Relations Internationales', levels: ['Master 1', 'Master 2'] },
        ],
      },
      {
        id: 'd3', name: 'Sciences Politiques', icon: Handshake, teachers: 6, students: 150,
        programs: [
          { id: 'fi5', name: 'Sciences Politiques', levels: ['Licence 1', 'Licence 2', 'Licence 3'] },
        ],
      },
      {
        id: 'd4', name: 'Sciences Criminelles', icon: Scale, teachers: 4, students: 90,
        programs: [
          { id: 'fi6', name: 'Sciences Criminelles', levels: ['Licence 1', 'Licence 2', 'Licence 3'] },
        ],
      },
    ],
    students: 860,
    teachers: 32,
  },
  {
    id: 'f2',
    name: 'Faculté des Sciences et Techniques',
    dean: 'Dr. Mahamat Nour Ibrahim',
    icon: FlaskConical,
    gradientFrom: '#2d7a4f',
    gradientTo: '#3da66a',
    departments: [
      {
        id: 'd5', name: 'Informatique', icon: Laptop, teachers: 8, students: 220,
        programs: [
          { id: 'fi7', name: 'Informatique', levels: ['Licence 1', 'Licence 2', 'Licence 3', 'Master 1'] },
          { id: 'fi8', name: 'Systèmes d\'Information', levels: ['Master 1', 'Master 2'] },
        ],
      },
      {
        id: 'd6', name: 'Biologie', icon: Microscope, teachers: 7, students: 180,
        programs: [
          { id: 'fi9', name: 'Biologie Animale', levels: ['Licence 1', 'Licence 2', 'Licence 3'] },
          { id: 'fi10', name: 'Biologie Végétale', levels: ['Licence 1', 'Licence 2', 'Licence 3'] },
        ],
      },
      {
        id: 'd7', name: 'Mathématiques', icon: TrendingUp, teachers: 6, students: 130,
        programs: [
          { id: 'fi11', name: 'Mathématiques', levels: ['Licence 1', 'Licence 2', 'Licence 3'] },
        ],
      },
      {
        id: 'd8', name: 'Physique-Chimie', icon: FlaskConical, teachers: 5, students: 110,
        programs: [
          { id: 'fi12', name: 'Physique', levels: ['Licence 1', 'Licence 2', 'Licence 3'] },
          { id: 'fi13', name: 'Chimie', levels: ['Licence 1', 'Licence 2', 'Licence 3'] },
        ],
      },
    ],
    students: 640,
    teachers: 26,
  },
  {
    id: 'f3',
    name: 'Faculté des Lettres, Langues et Arts',
    dean: 'Dr. Hassan Fatimé',
    icon: PenTool,
    gradientFrom: '#d4a853',
    gradientTo: '#e8c97a',
    departments: [
      {
        id: 'd9', name: 'Français', icon: BookOpen, teachers: 8, students: 200,
        programs: [
          { id: 'fi14', name: 'Lettres Modernes', levels: ['Licence 1', 'Licence 2', 'Licence 3'] },
          { id: 'fi15', name: 'Linguistique', levels: ['Master 1', 'Master 2'] },
        ],
      },
      {
        id: 'd10', name: 'Anglais', icon: Globe, teachers: 6, students: 160,
        programs: [
          { id: 'fi16', name: 'Anglais', levels: ['Licence 1', 'Licence 2', 'Licence 3'] },
        ],
      },
      {
        id: 'd11', name: 'Arabe', icon: BookOpen, teachers: 5, students: 140,
        programs: [
          { id: 'fi17', name: 'Langue et Littérature Arabes', levels: ['Licence 1', 'Licence 2', 'Licence 3'] },
        ],
      },
      {
        id: 'd12', name: 'Géographie', icon: Globe, teachers: 4, students: 100,
        programs: [
          { id: 'fi18', name: 'Géographie', levels: ['Licence 1', 'Licence 2', 'Licence 3'] },
        ],
      },
    ],
    students: 600,
    teachers: 23,
  },
  {
    id: 'f4',
    name: 'Faculté des Sciences de la Santé',
    dean: 'Dr. Khamis Seid',
    icon: Stethoscope,
    gradientFrom: '#5b8c5a',
    gradientTo: '#7ab87a',
    departments: [
      {
        id: 'd13', name: 'Médecine', icon: Stethoscope, teachers: 15, students: 180,
        programs: [
          { id: 'fi19', name: 'Médecine Générale', levels: ['1ère année', '2ème année', '3ème année', '4ème année', '5ème année', '6ème année', '7ème année'] },
        ],
      },
      {
        id: 'd14', name: 'Pharmacie', icon: FlaskConical, teachers: 8, students: 80,
        programs: [
          { id: 'fi20', name: 'Pharmacie', levels: ['1ère année', '2ème année', '3ème année', '4ème année', '5ème année'] },
        ],
      },
      {
        id: 'd15', name: 'Santé Publique', icon: Leaf, teachers: 4, students: 60,
        programs: [
          { id: 'fi21', name: 'Santé Publique', levels: ['Master 1', 'Master 2'] },
        ],
      },
    ],
    students: 320,
    teachers: 27,
  },
  {
    id: 'f5',
    name: 'Faculté des Sciences Économiques et de Gestion',
    dean: 'Mme Khamis Caisse',
    icon: TrendingUp,
    gradientFrom: '#8b5e3c',
    gradientTo: '#b87a50',
    departments: [
      {
        id: 'd16', name: 'Économie', icon: TrendingUp, teachers: 8, students: 260,
        programs: [
          { id: 'fi22', name: 'Sciences Économiques', levels: ['Licence 1', 'Licence 2', 'Licence 3', 'Master 1'] },
          { id: 'fi23', name: 'Économie Appliquée', levels: ['Master 1', 'Master 2'] },
        ],
      },
      {
        id: 'd17', name: 'Gestion', icon: Building2, teachers: 7, students: 240,
        programs: [
          { id: 'fi24', name: 'Sciences de Gestion', levels: ['Licence 1', 'Licence 2', 'Licence 3'] },
          { id: 'fi25', name: 'Comptabilité-Contrôle', levels: ['Master 1', 'Master 2'] },
        ],
      },
      {
        id: 'd18', name: 'Commerce International', icon: Globe, teachers: 4, students: 100,
        programs: [
          { id: 'fi26', name: 'Commerce International', levels: ['Licence 1', 'Licence 2', 'Licence 3'] },
        ],
      },
    ],
    students: 600,
    teachers: 19,
  },
]

// ─── Org Chart Tree Data ────────────────────────────────────────────────────

interface OrgNode {
  id: string
  name: string
  type: 'institution' | 'faculte' | 'departement' | 'filiere'
  icon: React.ElementType
  color: string
  count?: number
  children?: OrgNode[]
}

function buildOrgTree(): OrgNode {
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
      icon: f.icon,
      color: f.gradientFrom,
      count: f.departments.length,
      children: f.departments.map(d => ({
        id: d.id,
        name: d.name,
        type: 'departement',
        icon: d.icon,
        color: '#2d7a4f',
        count: d.programs.length,
        children: d.programs.map(p => ({
          id: p.id,
          name: p.name,
          type: 'filiere',
          icon: GraduationCap,
          color: '#d4a853',
        })),
      })),
    })),
  }
}

const orgTree = buildOrgTree()

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

        {/* Edit */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <Edit3 className="size-3 text-gray-600" />
          </Button>
        </div>
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

function AddEntityDialog({
  triggerLabel,
  triggerIcon: TriggerIcon,
  title,
  description,
  fields,
}: {
  triggerLabel: string
  triggerIcon: React.ElementType
  title: string
  description: string
  fields: { id: string; label: string; type?: string; placeholder?: string; options?: { value: string; label: string }[] }[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
                <Select>
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
                  type={field.type || 'text'}
                  placeholder={field.placeholder || ''}
                  className="h-10"
                />
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="text-xs">
            Annuler
          </Button>
          <Button
            className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs"
            onClick={() => setOpen(false)}
          >
            <Plus className="size-3.5 mr-1.5" />
            Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function StructurePage() {
  const [viewMode, setViewMode] = useState<'cards' | 'tree'>('cards')
  const [searchQuery, setSearchQuery] = useState('')

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
            triggerLabel="Ajouter une faculté"
            triggerIcon={Building2}
            title="Nouvelle faculté"
            description="Ajoutez une nouvelle faculté à l'institution."
            fields={[
              { id: 'name', label: 'Nom de la faculté', placeholder: 'Ex: Faculté des Sciences' },
              { id: 'dean', label: 'Nom du doyen', placeholder: 'Ex: Pr. Nom Prénom' },
              { id: 'code', label: 'Code', placeholder: 'Ex: FST' },
            ]}
          />
          <AddEntityDialog
            triggerLabel="Ajouter un département"
            triggerIcon={BookOpen}
            title="Nouveau département"
            description="Ajoutez un département à une faculté existante."
            fields={[
              { id: 'name', label: 'Nom du département', placeholder: 'Ex: Département d\'Informatique' },
              {
                id: 'faculty',
                label: 'Faculté rattachée',
                placeholder: 'Sélectionner la faculté',
                options: faculties.map(f => ({ value: f.id, label: f.name })),
              },
              { id: 'head', label: 'Chef de département', placeholder: 'Ex: Dr. Nom Prénom' },
            ]}
          />
          <AddEntityDialog
            triggerLabel="Ajouter une filière"
            triggerIcon={GraduationCap}
            title="Nouvelle filière"
            description="Ajoutez une filière à un département existant."
            fields={[
              { id: 'name', label: 'Nom de la filière', placeholder: 'Ex: Informatique' },
              {
                id: 'faculty',
                label: 'Faculté',
                placeholder: 'Sélectionner la faculté',
                options: faculties.map(f => ({ value: f.id, label: f.name })),
              },
              {
                id: 'department',
                label: 'Département',
                placeholder: 'Sélectionner le département',
                options: faculties.flatMap(f => f.departments.map(d => ({ value: d.id, label: d.name }))),
              },
              { id: 'code', label: 'Code', placeholder: 'Ex: INF' },
            ]}
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
    </div>
  )
}
