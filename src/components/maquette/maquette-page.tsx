'use client'

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

const demoPrograms: Program[] = [
  {
    id: 'lic-droit',
    label: 'Licence Droit',
    levels: [
      {
        id: 'l1',
        label: 'L1',
        semesters: [
          {
            id: 's1',
            label: 'Semestre 1',
            ues: [
              {
                code: 'UE101',
                nom: 'Introduction au Droit',
                credits: 6,
                type: 'Fondamentale',
                compensable: true,
                responsable: 'Pr. Youssouf Abakar Moussa',
                ecues: [
                  { code: 'ECUE1011', nom: 'Introduction au Droit Civil', coefficient: 2, cm: 30, td: 15, tp: 0, stage: 0, enseignant: 'Pr. Youssouf Abakar Moussa' },
                  { code: 'ECUE1012', nom: 'Sources du Droit', coefficient: 1, cm: 15, td: 10, tp: 0, stage: 0, enseignant: 'Dr. Hassan Abakar Fatimé' },
                  { code: 'ECUE1013', nom: 'Théorie Générale du Droit', coefficient: 1, cm: 15, td: 10, tp: 0, stage: 0, enseignant: 'Pr. Youssouf Abakar Moussa' },
                ],
              },
              {
                code: 'UE102',
                nom: 'Droit Constitutionnel',
                credits: 6,
                type: 'Fondamentale',
                compensable: true,
                responsable: 'Pr. Bichara Youssouf',
                ecues: [
                  { code: 'ECUE1021', nom: 'Institutions Politiques', coefficient: 2, cm: 30, td: 15, tp: 0, stage: 0, enseignant: 'Pr. Bichara Youssouf' },
                  { code: 'ECUE1022', nom: 'Droit Constitutionnel Comparé', coefficient: 1, cm: 15, td: 10, tp: 0, stage: 0, enseignant: 'Dr. Adoum Khadija' },
                ],
              },
              {
                code: 'UE103',
                nom: 'Économie Politique',
                credits: 4,
                type: 'Complémentaire',
                compensable: true,
                responsable: 'Dr. Mahamat Nour Adam',
                ecues: [
                  { code: 'ECUE1031', nom: 'Macroéconomie', coefficient: 2, cm: 25, td: 10, tp: 0, stage: 0, enseignant: 'Dr. Mahamat Nour Adam' },
                  { code: 'ECUE1032', nom: 'Microéconomie', coefficient: 1, cm: 15, td: 10, tp: 0, stage: 0, enseignant: 'M. Ahmat Djibrine' },
                ],
              },
              {
                code: 'UE104',
                nom: 'Méthodologie du Travail Universitaire',
                credits: 2,
                type: 'Transversale',
                compensable: false,
                responsable: 'Mme Aboubakar Oumar Khadidja',
                ecues: [
                  { code: 'ECUE1041', nom: 'Techniques de Rédaction', coefficient: 1, cm: 10, td: 10, tp: 0, stage: 0, enseignant: 'Mme Aboubakar Oumar Khadidja' },
                  { code: 'ECUE1042', nom: 'Recherche Documentaire', coefficient: 1, cm: 10, td: 5, tp: 0, stage: 0, enseignant: 'Mme Aboubakar Oumar Khadidja' },
                ],
              },
              {
                code: 'UE105',
                nom: 'Informatique',
                credits: 2,
                type: 'Transversale',
                compensable: false,
                responsable: 'Dr. Khamis Zara',
                ecues: [
                  { code: 'ECUE1051', nom: 'Initiation à l\'Informatique', coefficient: 1, cm: 10, td: 0, tp: 15, stage: 0, enseignant: 'Dr. Khamis Zara' },
                ],
              },
            ],
          },
          {
            id: 's2',
            label: 'Semestre 2',
            ues: [
              {
                code: 'UE201',
                nom: 'Droit Civil',
                credits: 6,
                type: 'Fondamentale',
                compensable: true,
                responsable: 'Pr. Youssouf Abakar Moussa',
                ecues: [
                  { code: 'ECUE2011', nom: 'Droit des Obligations', coefficient: 2, cm: 30, td: 15, tp: 0, stage: 0, enseignant: 'Pr. Youssouf Abakar Moussa' },
                  { code: 'ECUE2012', nom: 'Droit des Contrats', coefficient: 1, cm: 15, td: 10, tp: 0, stage: 0, enseignant: 'Dr. Djimé Hawa' },
                ],
              },
              {
                code: 'UE202',
                nom: 'Droit Administratif',
                credits: 6,
                type: 'Fondamentale',
                compensable: true,
                responsable: 'Dr. Hassan Abakar Fatimé',
                ecues: [
                  { code: 'ECUE2021', nom: 'Organisation Administrative', coefficient: 2, cm: 30, td: 15, tp: 0, stage: 0, enseignant: 'Dr. Hassan Abakar Fatimé' },
                  { code: 'ECUE2022', nom: 'Actes Administratifs', coefficient: 1, cm: 15, td: 10, tp: 0, stage: 0, enseignant: 'Dr. Hassan Abakar Fatimé' },
                ],
              },
              {
                code: 'UE203',
                nom: 'Sociologie Politique',
                credits: 4,
                type: 'Complémentaire',
                compensable: true,
                responsable: 'Mme Hissein Mariam',
                ecues: [
                  { code: 'ECUE2031', nom: 'Sociologie Générale', coefficient: 2, cm: 25, td: 10, tp: 0, stage: 0, enseignant: 'Mme Hissein Mariam' },
                  { code: 'ECUE2032', nom: 'Sociologie Politique Africaine', coefficient: 1, cm: 15, td: 10, tp: 0, stage: 0, enseignant: 'Mme Hissein Mariam' },
                ],
              },
              {
                code: 'UE204',
                nom: 'Langue Française',
                credits: 2,
                type: 'Transversale',
                compensable: false,
                responsable: 'Mme Aboubakar Oumar Khadidja',
                ecues: [
                  { code: 'ECUE2041', nom: 'Expression Française', coefficient: 1, cm: 10, td: 10, tp: 0, stage: 0, enseignant: 'Mme Aboubakar Oumar Khadidja' },
                ],
              },
              {
                code: 'UE205',
                nom: 'Statistiques',
                credits: 2,
                type: 'Transversale',
                compensable: false,
                responsable: 'Dr. Adam Brahim Mahamat',
                ecues: [
                  { code: 'ECUE2051', nom: 'Statistiques Descriptives', coefficient: 1, cm: 10, td: 5, tp: 10, stage: 0, enseignant: 'Dr. Adam Brahim Mahamat' },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'l2',
        label: 'L2',
        semesters: [
          {
            id: 'l2s1',
            label: 'Semestre 3',
            ues: [
              { code: 'UE301', nom: 'Droit des Obligations Approfondi', credits: 6, type: 'Fondamentale', compensable: true, responsable: 'Pr. Youssouf Abakar Moussa', ecues: [] },
              { code: 'UE302', nom: 'Droit Pénal Général', credits: 6, type: 'Fondamentale', compensable: true, responsable: 'Dr. Djimé Hawa', ecues: [] },
              { code: 'UE303', nom: 'Droit International Public', credits: 4, type: 'Complémentaire', compensable: true, responsable: 'Dr. Hassan Abakar Fatimé', ecues: [] },
            ],
          },
          {
            id: 'l2s2',
            label: 'Semestre 4',
            ues: [
              { code: 'UE401', nom: 'Droit Commercial', credits: 6, type: 'Fondamentale', compensable: true, responsable: 'Dr. Djimé Hawa', ecues: [] },
              { code: 'UE402', nom: 'Droit du Travail', credits: 6, type: 'Fondamentale', compensable: true, responsable: 'Dr. Adoum Khadija', ecues: [] },
            ],
          },
        ],
      },
      {
        id: 'l3',
        label: 'L3',
        semesters: [
          {
            id: 'l3s1',
            label: 'Semestre 5',
            ues: [
              { code: 'UE501', nom: 'Droit de la Famille', credits: 6, type: 'Fondamentale', compensable: true, responsable: 'Dr. Adoum Khadija', ecues: [] },
              { code: 'UE502', nom: 'Droit Foncier', credits: 6, type: 'Fondamentale', compensable: true, responsable: 'Pr. Bichara Youssouf', ecues: [] },
            ],
          },
          {
            id: 'l3s2',
            label: 'Semestre 6',
            ues: [
              { code: 'UE601', nom: 'Mémoire de Licence', credits: 10, type: 'Fondamentale', compensable: false, responsable: 'Pr. Youssouf Abakar Moussa', ecues: [] },
              { code: 'UE602', nom: 'Stage Professionnel', credits: 6, type: 'Complémentaire', compensable: false, responsable: 'M. Ngarndmi Halimé', ecues: [] },
            ],
          },
        ],
      },
    ],
  },
]

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
  const totalUEsCount = useCountUp(42, 1400)
  const programmesActifsCount = useCountUp(8, 1200)
  const [selectedProgram, setSelectedProgram] = useState(demoPrograms[0].id)
  const program = demoPrograms.find(p => p.id === selectedProgram) || demoPrograms[0]

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
              >
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
        <Select value={selectedProgram} onValueChange={setSelectedProgram}>
          <SelectTrigger className="w-[200px] h-9 text-sm">
            <SelectValue placeholder="Programme" />
          </SelectTrigger>
          <SelectContent>
            {demoPrograms.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Level Tabs */}
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
          </TabsContent>
        ))}
      </Tabs>
      </motion.div>
    </motion.div>
  )
}
