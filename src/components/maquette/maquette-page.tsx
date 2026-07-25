'use client'

import { exportToExcel } from '@/lib/export'
import { useStructure } from '@/lib/api-hooks'
import { useState, useEffect, useRef, Fragment } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  Upload,
} from 'lucide-react'

// ─── Demo Data ────────────────────────────────────────────────────────────────

type UEType = 'Fondamentale' | 'Complémentaire' | 'Transversale'

interface ECUE {
  code: string
  nom: string
  coefficient: number
  cm: number
  td: number
  tp: number
  stage: number
  enseignant: string
}

interface UE {
  code: string
  nom: string
  credits: number
  type: UEType
  compensable: boolean
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
  levels: Level[]
}

const typeConfig: Record<UEType, { label: string; className: string }> = {
  'Fondamentale': { label: 'Fondamentale', className: 'bg-[#1a274415] text-[#1a2744] border-0' },
  'Complémentaire': { label: 'Complémentaire', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' },
  'Transversale': { label: 'Transversale', className: 'bg-[#d4a85315] text-[#d4a853] border-0' },
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
  teacher?: StructureTeacherRef | null
}

interface StructureTeachingUnit {
  id: string
  code: string | null
  name: string
  credits: number
  type: string
  compensable: boolean
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
  levels: StructureLevel[]
}

interface StructureDepartment {
  programs: StructureProgram[]
}

interface StructureFaculty {
  departments: StructureDepartment[]
}

function teacherName(ref?: StructureTeacherRef | null): string {
  if (!ref?.user) return ''
  return `${ref.user.firstName} ${ref.user.lastName}`.trim()
}

function mapUEType(type: string): UEType {
  const t = (type || '').toUpperCase()
  if (t.startsWith('COMPL')) return 'Complémentaire'
  if (t.startsWith('TRANSV')) return 'Transversale'
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
          levels: (p.levels || []).map((level) => ({
            id: level.id,
            label: level.name,
            semesters: (level.semesters || []).map((sem) => ({
              id: sem.id,
              label: sem.name,
              ues: (sem.teachingUnits || []).map((tu) => ({
                code: tu.code || tu.id,
                nom: tu.name,
                credits: tu.credits,
                type: mapUEType(tu.type),
                compensable: tu.compensable,
                responsable: teacherName(tu.responsible),
                ecues: (tu.courseElements || []).map((ce) => ({
                  code: ce.code || ce.id,
                  nom: ce.name,
                  coefficient: ce.coefficient,
                  cm: ce.hoursCM,
                  td: ce.hoursTD,
                  tp: ce.hoursTP,
                  stage: ce.hoursStage,
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

function getSemesterVolume(semester: Semester): { cm: number; td: number; tp: number; total: number } {
  const cm = semester.ues.reduce((acc, ue) => acc + ue.ecues.reduce((a, e) => a + e.cm, 0), 0)
  const td = semester.ues.reduce((acc, ue) => acc + ue.ecues.reduce((a, e) => a + e.td, 0), 0)
  const tp = semester.ues.reduce((acc, ue) => acc + ue.ecues.reduce((a, e) => a + e.tp, 0), 0)
  return { cm, td, tp, total: cm + td + tp }
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

// ─── Semester Component ───────────────────────────────────────────────────────

function SemesterView({ semester }: { semester: Semester }) {
  const [expandedUEs, setExpandedUEs] = useState<Set<string>>(new Set())
  const totalCredits = getSemesterCredits(semester)
  const volume = getSemesterVolume(semester)

  const toggleUE = (code: string) => {
    setExpandedUEs(prev => {
      const next = new Set(prev)
      if (next.has(code)) {
        next.delete(code)
      } else {
        next.add(code)
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {semester.ues.map((ue) => {
                  const isExpanded = expandedUEs.has(ue.code)
                  const hasEcues = ue.ecues.length > 0
                  return (
                    <Fragment key={ue.code}>
                      <TableRow
                        className={`hover:bg-gray-50/50 cursor-pointer ${hasEcues ? '' : 'opacity-80'}`}
                        onClick={() => hasEcues && toggleUE(ue.code)}
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
                      </TableRow>
                      {isExpanded && hasEcues && (
                        ue.ecues.map((ecue) => (
                          <TableRow key={ecue.code} className="bg-[#f8faf9] hover:bg-[#f0f5f1]">
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
                          </TableRow>
                        ))
                      )}
                    </Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button size="sm" className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs">
          <Plus className="size-3.5 mr-1.5" />
          Ajouter UE
        </Button>
        <Button variant="outline" size="sm" className="text-xs">
          <Plus className="size-3.5 mr-1.5" />
          Ajouter ECUE
        </Button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MaquettePage() {
  const { data: structureData, isLoading } = useStructure()
  const programs = mapStructureToPrograms(structureData?.faculties || [])
  const [selectedProgram, setSelectedProgram] = useState<string | undefined>(undefined)
  const program = programs.find(p => p.id === selectedProgram) || programs[0]

  const totalUEs = programs.reduce(
    (a, p) => a + p.levels.reduce((b, l) => b + l.semesters.reduce((c, s) => c + s.ues.length, 0), 0),
    0
  )
  const totalUEsCount = useCountUp(totalUEs, 1400)
  const programmesActifsCount = useCountUp(programs.length, 1200)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-gray-500">
        Chargement des maquettes pédagogiques...
      </div>
    )
  }

  if (!program) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-gray-500">
        Aucun programme pédagogique n&apos;a encore été configuré. Rendez-vous dans Structure pour en créer un.
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
              >
                <Plus className="size-3.5 mr-1.5" />
                Nouvelle maquette
              </Button>
              <Button
                size="sm"
                className="bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 text-white text-xs"
               onClick={() => exportToExcel([{ 'Message': 'Données en cours de synchronisation' }], 'export_maquette')}>
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
              <div className="text-white/60 text-xs">Total UEs</div>
              <div className="text-white text-2xl font-bold">{totalUEsCount}</div>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }} className="bg-white/10 backdrop-blur border border-white/15 rounded-lg px-4 py-3">
              <div className="text-white/60 text-xs">Programmes actifs</div>
              <div className="text-white text-2xl font-bold">{programmesActifsCount}</div>
            </motion.div>
          </div>
        </div>
      </div>

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
                <p className="text-2xl font-bold text-[#1a2744] mt-1">{program.levels.reduce((a, l) => a + l.semesters.reduce((b, s) => b + getSemesterCredits(s), 0), 0)}</p>
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
      <Tabs defaultValue={program.levels[0].id}>
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
            <Tabs defaultValue={level.semesters[0].id}>
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


