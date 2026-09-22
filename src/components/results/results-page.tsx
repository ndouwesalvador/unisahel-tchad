'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useResults } from '@/lib/api-hooks'
import { exportToExcel } from '@/lib/export'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  FileText,
  Award,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Search,
  Download,
  Printer,
  Eye,
  BarChart3,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  Shield,
  CircleDot,
  Trophy,
  Star,
  Target,
} from 'lucide-react'

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

// ─── Types ──────────────────────────────────────────────────────────────────────

type Mention = 'Passable' | 'Assez-Bien' | 'Bien' | 'Tres-Bien' | 'Excellent'
type Decision = 'Admis' | 'Compense' | 'Ajourne' | 'Exclu'
interface StudentResult {
  id: string
  name: string
  matricule: string
  moyenne: number
  mention: Mention
  credits: number
  decision: Decision
}

interface UEGrade {
  code: string
  name: string
  credit: number
  note: number
}

interface TranscriptStudent {
  id: string
  name: string
  matricule: string
  dateNaissance: string
  lieuNaissance: string
  filiere: string
  niveau: string
  semester: string
  ueGrades: UEGrade[]
  moyenne: number
  mention: Mention
  totalCredits: number
}

interface AtRiskStudent {
  id: string
  name: string
  matricule: string
  moyenne: number
  creditDebt: number
  risk: 'critical' | 'warning'
}

// ─── Config Maps ────────────────────────────────────────────────────────────────

const mentionConfig: Record<Mention, { color: string; bgClass: string }> = {
  'Passable': { color: '#6b7280', bgClass: 'bg-gray-100 text-gray-700 border-0' },
  'Assez-Bien': { color: '#1a2744', bgClass: 'bg-[#1a274410] text-[#1a2744] border-0' },
  'Bien': { color: '#2d7a4f', bgClass: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' },
  'Tres-Bien': { color: '#d4a853', bgClass: 'bg-[#d4a85315] text-[#d4a853] border-0' },
  'Excellent': { color: '#c62828', bgClass: 'bg-[#c6282810] text-[#c62828] border-0' },
}

const decisionConfig: Record<Decision, { color: string; className: string; icon: React.ElementType }> = {
  'Admis': { color: '#2d7a4f', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0', icon: CheckCircle2 },
  'Compense': { color: '#d4a853', className: 'bg-[#d4a85315] text-[#d4a853] border-0', icon: CircleDot },
  'Ajourne': { color: '#c62828', className: 'bg-[#c6282815] text-[#c62828] border-0', icon: XCircle },
  'Exclu': { color: '#4a0000', className: 'bg-[#4a000010] text-[#4a0000] border-0', icon: AlertTriangle },
}

// ─── Animated Stat Component ────────────────────────────────────────────────────

function AnimatedStat({ value, label, icon: Icon, suffix = '' }: { value: number; label: string; icon: React.ElementType; suffix?: string }) {
  const count = useCountUp(value, 1400)
  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-3 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-white/10">
        <Icon className="size-5 text-white" />
      </div>
      <div>
        <p className="text-xl font-bold text-white">{count}{suffix}</p>
        <p className="text-[10px] text-white/70">{label}</p>
      </div>
    </div>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────────

export function ResultsPage() {
  const [activeTab, setActiveTab] = useState('session-results')
  const [selectedSession, setSelectedSession] = useState('NORMALE')
  const [searchStudent, setSearchStudent] = useState('')
  const [searchTranscript, setSearchTranscript] = useState('')
  const [selectedTranscriptStudentId, setSelectedTranscriptStudentId] = useState('')
  const [searchProgression, setSearchProgression] = useState('')

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
  } as const

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  } as const

  // ─── Real data: session results, built from the Grade model ────────────────
  const resultsQuery = useResults({ session: selectedSession })
  const passingGrade: number = resultsQuery.data?.passingGrade ?? 10
  const creditsPerYear: number = resultsQuery.data?.creditsPerYear ?? 60

  const results: StudentResult[] = useMemo(() => {
    const raw = resultsQuery.data?.results as StudentResult[] | undefined
    return raw ?? []
  }, [resultsQuery.data])

  // Filtered results
  const filteredResults = useMemo(() => {
    return results.filter(r => {
      const matchSearch = searchStudent === '' ||
        r.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
        r.matricule.toLowerCase().includes(searchStudent.toLowerCase())
      return matchSearch
    })
  }, [results, searchStudent])

  // Session stats
  const sessionStats = useMemo(() => {
    const admis = results.filter(r => r.decision === 'Admis').length
    const ajournes = results.filter(r => r.decision === 'Ajourne').length
    const compenses = results.filter(r => r.decision === 'Compense').length
    const totalMoyenne = results.length > 0 ? results.reduce((sum, r) => sum + r.moyenne, 0) / results.length : 0
    return { admis, ajournes, compenses, moyenneGenerale: totalMoyenne.toFixed(1) }
  }, [results])

  const averageDistribution = useMemo(() => {
    const ranges = [
      { range: '0-8', min: 0, max: 8, color: '#c62828' },
      { range: '8-10', min: 8, max: 10, color: '#d4a853' },
      { range: '10-12', min: 10, max: 12, color: '#6b7280' },
      { range: '12-14', min: 12, max: 14, color: '#1a2744' },
      { range: '14-16', min: 14, max: 16, color: '#2d7a4f' },
      { range: '16-20', min: 16, max: 20.01, color: '#d4a853' },
    ]
    return ranges.map((range) => ({
      range: range.range,
      color: range.color,
      count: results.filter((result) => result.moyenne >= range.min && result.moyenne < range.max).length,
    }))
  }, [results])

  const mentionDistribution = useMemo(() => {
    const mentions: Mention[] = ['Passable', 'Assez-Bien', 'Bien', 'Tres-Bien', 'Excellent']
    return mentions.map((mention) => {
      const count = results.filter((result) => result.mention === mention).length
      return {
        mention,
        count,
        percent: results.length > 0 ? Math.round((count / results.length) * 100) : 0,
        color: mentionConfig[mention].color,
      }
    })
  }, [results])

  const sessionLabel = selectedSession === 'RATTRAPAGE' ? 'Session de rattrapage' : 'Session normale'

  // ─── Real data: progression tab (searched student + at-risk list) ──────────
  const progressionStudent: StudentResult | null = useMemo(() => {
    if (searchProgression === '') return null
    const q = searchProgression.toLowerCase()
    return results.find(r => r.name.toLowerCase().includes(q) || r.matricule.toLowerCase().includes(q)) ?? null
  }, [results, searchProgression])

  const atRiskStudents: AtRiskStudent[] = useMemo(() => {
    return results
      .filter(r => r.moyenne < passingGrade)
      .map(r => ({
        id: r.id,
        name: r.name,
        matricule: r.matricule,
        moyenne: r.moyenne,
        creditDebt: Math.max(0, creditsPerYear - r.credits),
        risk: r.moyenne < passingGrade - 3 ? 'critical' as const : 'warning' as const,
      }))
      .sort((a, b) => a.moyenne - b.moyenne)
  }, [results, passingGrade, creditsPerYear])

  // ─── Real data: transcript for a selected student ───────────────────────────
  const transcriptCandidates = useMemo(() => {
    if (searchTranscript === '') return results
    const q = searchTranscript.toLowerCase()
    return results.filter(r => r.name.toLowerCase().includes(q) || r.matricule.toLowerCase().includes(q))
  }, [results, searchTranscript])

  // Derive the effective selection instead of syncing it via an effect: fall back to the
  // first matching candidate whenever the explicit selection is empty or no longer matches.
  const effectiveTranscriptStudentId = useMemo(() => {
    if (selectedTranscriptStudentId && transcriptCandidates.some(c => c.id === selectedTranscriptStudentId)) {
      return selectedTranscriptStudentId
    }
    return transcriptCandidates[0]?.id ?? ''
  }, [transcriptCandidates, selectedTranscriptStudentId])

  const transcriptQuery = useResults(effectiveTranscriptStudentId ? { studentId: effectiveTranscriptStudentId, session: selectedSession } : undefined)

  const transcript: TranscriptStudent | null = useMemo(() => {
    const raw = transcriptQuery.data?.transcript as TranscriptStudent | null | undefined
    return raw ?? null
  }, [transcriptQuery.data])

  // Stats for header -- all derived from the real results already loaded above
  const resultatsPublies = useCountUp(results.length, 1400)
  const tauxReussiteGlobal = useCountUp(results.length > 0 ? Math.round((sessionStats.admis / results.length) * 100) : 0, 1300)
  const mentionsTresBien = useCountUp(results.filter(r => r.mention === 'Tres-Bien' || r.mention === 'Excellent').length, 1100)

  const viewTranscript = (student: StudentResult) => {
    setSelectedTranscriptStudentId(student.id)
    setSearchTranscript(student.name)
    setActiveTab('transcripts')
  }

  const exportResults = () => {
    if (filteredResults.length === 0) {
      toast.info('Aucun résultat à exporter')
      return
    }
    exportToExcel(filteredResults, `resultats_${selectedSession.toLowerCase()}`)
  }

  const printTranscript = () => {
    if (!transcript) {
      toast.info('Aucun relevé sélectionné')
      return
    }
    window.print()
  }

  const downloadTranscript = () => {
    if (!transcript) {
      toast.info('Aucun relevé à télécharger')
      return
    }
    exportToExcel(
      transcript.ueGrades.map((ue) => ({
        étudiant: transcript.name,
        matricule: transcript.matricule,
        filière: transcript.filiere,
        niveau: transcript.niveau,
        session: sessionLabel,
        code: ue.code,
        unité: ue.name,
        crédits: ue.credit,
        note: ue.note,
        moyenne: transcript.moyenne,
        mention: transcript.mention,
        crédits_obtenus: transcript.totalCredits,
      })),
      `releve_${transcript.matricule.replace(/[^a-z0-9_-]/gi, '_')}`
    )
  }

  return (
    <TooltipProvider>
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
              <pattern id="results-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <rect x="0" y="0" width="40" height="40" fill="none" stroke="white" strokeWidth="0.5" />
                <circle cx="20" cy="20" r="3" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#results-pattern)" />
          </svg>
          <div className="relative z-10 px-6 py-8">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white">Gestion des Resultats Academiques</h1>
                <p className="text-sm text-white/70 mt-1">Publication, releves et suivi de la progression des etudiants</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <AnimatedStat value={results.length} label="Resultats publies" icon={FileText} />
                <AnimatedStat value={results.length > 0 ? Math.round((sessionStats.admis / results.length) * 100) : 0} label="Taux reussite %" icon={TrendingUp} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─── Stats Cards -- all real, derived from the results already loaded above ── */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Resultats publies', value: resultatsPublies, color: '#2d7a4f', icon: FileText },
            { label: 'Taux de reussite global', value: tauxReussiteGlobal, color: '#d4a853', icon: TrendingUp, suffix: '%' },
            { label: 'Mentions Tres Bien', value: mentionsTresBien, color: '#2d7a4f', icon: Trophy },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="overflow-hidden relative border-l-4 hover:shadow-md transition-shadow" style={{ borderLeftColor: stat.color }}>
                <div className="h-1 w-full" style={{ background: `linear-gradient(to right, ${stat.color}, ${stat.color}60)` }} />
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.label}</p>
                      <p className="text-2xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}{stat.suffix || ''}</p>
                    </div>
                    <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${stat.color}15` }}>
                      <stat.icon className="size-5" style={{ color: stat.color }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* ─── Tab Navigation ───────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 bg-gray-100 h-auto p-1">
              <TabsTrigger value="session-results" className="text-xs data-[state=active]:bg-[#1a2744] data-[state=active]:text-white">
                <BookOpen className="size-3.5 mr-1.5" />
                Resultats par Session
              </TabsTrigger>
              <TabsTrigger value="transcripts" className="text-xs data-[state=active]:bg-[#1a2744] data-[state=active]:text-white">
                <FileText className="size-3.5 mr-1.5" />
                Releves de Notes
              </TabsTrigger>
              <TabsTrigger value="progression" className="text-xs data-[state=active]:bg-[#1a2744] data-[state=active]:text-white">
                <TrendingUp className="size-3.5 mr-1.5" />
                Progression Academique
              </TabsTrigger>
              <TabsTrigger value="statistics" className="text-xs data-[state=active]:bg-[#1a2744] data-[state=active]:text-white">
                <BarChart3 className="size-3.5 mr-1.5" />
                Statistiques
              </TabsTrigger>
            </TabsList>

            {/* ─── Tab 1: Resultats par Session ──────────────────────────────────── */}
            <TabsContent value="session-results" className="mt-4 space-y-4">
              {/* Filters */}
              <Card className="border-l-4 border-l-[#1a2744]">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <Search className="size-4 text-gray-400 shrink-0" />
                      <Input
                        placeholder="Rechercher par nom ou matricule..."
                        className="h-9 text-sm"
                        value={searchStudent}
                        onChange={(e) => setSearchStudent(e.target.value)}
                      />
                    </div>
                    <Select value={selectedSession} onValueChange={setSelectedSession}>
                      <SelectTrigger className="w-[180px] h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NORMALE">Session normale</SelectItem>
                        <SelectItem value="RATTRAPAGE">Session de rattrapage</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" className="h-9 text-xs" onClick={exportResults}>
                      <Download className="size-3.5 mr-1.5" />
                      Exporter
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Results Table */}
              <Card>
                <CardContent className="p-0">
                  <ScrollArea className="max-h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Nom</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Matricule</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-center">Moyenne</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Mention</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-center">Credits</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Decision</TableHead>
                          <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {resultsQuery.isLoading ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-sm text-gray-400">Chargement...</TableCell>
                          </TableRow>
                        ) : filteredResults.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-sm text-gray-400">Aucun resultat publie pour le moment</TableCell>
                          </TableRow>
                        ) : filteredResults.map((student, index) => {
                          const mConfig = mentionConfig[student.mention]
                          const dConfig = decisionConfig[student.decision]
                          const DecisionIcon = dConfig.icon
                          return (
                            <motion.tr
                              key={student.id}
                              className={`border-b border-gray-50 hover:bg-gradient-to-r hover:from-[#2d7a4f04] hover:to-transparent transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                              initial={{ opacity: 0, x: -12 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.04, duration: 0.3 }}
                            >
                              <TableCell className="py-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-[#1a274410] flex items-center justify-center text-[10px] font-bold text-[#1a2744]">
                                    {student.name.split(' ').map(n => n[0]).join('')}
                                  </div>
                                  <span className="text-sm font-medium text-[#1a2744]">{student.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-2.5 text-xs text-gray-500 font-mono">{student.matricule}</TableCell>
                              <TableCell className="py-2.5 text-center">
                                <span className={`text-sm font-bold ${student.moyenne >= passingGrade ? 'text-[#2d7a4f]' : student.moyenne >= passingGrade - 2 ? 'text-[#d4a853]' : 'text-[#c62828]'}`}>
                                  {student.moyenne.toFixed(1)}
                                </span>
                              </TableCell>
                              <TableCell className="py-2.5">
                                <Badge className={`text-[10px] ${mConfig.bgClass}`}>
                                  {student.mention}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-2.5 text-center">
                                <span className={`text-xs font-semibold ${student.credits >= creditsPerYear ? 'text-[#2d7a4f]' : student.credits >= creditsPerYear * 0.66 ? 'text-[#d4a853]' : 'text-[#c62828]'}`}>
                                  {student.credits}/{creditsPerYear}
                                </span>
                              </TableCell>
                              <TableCell className="py-2.5">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div>
                                      <Badge className={`text-[10px] ${dConfig.className}`}>
                                        <DecisionIcon className="size-2.5 mr-1" />
                                        {student.decision}
                                      </Badge>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{student.decision === 'Admis' ? 'Etudiant admis a la session' : student.decision === 'Ajourne' ? 'Etudiant ajourne, rattrapage necessaire' : 'Decision calculee depuis les notes publiees'}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                              <TableCell className="py-2.5 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-[#2d7a4f10]" onClick={() => viewTranscript(student)}>
                                        <Eye className="size-3.5 text-gray-600" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Ouvrir le relevé</TooltipContent>
                                  </Tooltip>
                                </div>
                              </TableCell>
                            </motion.tr>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Summary Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                  <Card className="border-l-4 border-l-[#2d7a4f]">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-[#2d7a4f15]">
                        <CheckCircle2 className="size-5 text-[#2d7a4f]" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Admis</p>
                        <p className="text-xl font-bold text-[#2d7a4f]">{sessionStats.admis}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                  <Card className="border-l-4 border-l-[#d4a853]">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-[#d4a85315]">
                        <CircleDot className="size-5 text-[#d4a853]" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Compenses</p>
                        <p className="text-xl font-bold text-[#d4a853]">{sessionStats.compenses}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                  <Card className="border-l-4 border-l-[#c62828]">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-[#c6282810]">
                        <XCircle className="size-5 text-[#c62828]" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Ajournes</p>
                        <p className="text-xl font-bold text-[#c62828]">{sessionStats.ajournes}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                  <Card className="border-l-4 border-l-[#1a2744]">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-[#1a274410]">
                        <BarChart3 className="size-5 text-[#1a2744]" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Moyenne generale</p>
                        <p className="text-xl font-bold text-[#1a2744]">{sessionStats.moyenneGenerale}/20</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </TabsContent>

            {/* ─── Tab 2: Releves de Notes ───────────────────────────────────────── */}
            <TabsContent value="transcripts" className="mt-4 space-y-4">
              {/* Search + Student selection */}
              <Card className="border-l-4 border-l-[#2d7a4f]">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="flex items-center gap-2 flex-1 w-full">
                      <Search className="size-4 text-gray-400 shrink-0" />
                      <Input
                        placeholder="Rechercher par nom ou matricule de l'etudiant..."
                        className="h-9 text-sm flex-1"
                        value={searchTranscript}
                        onChange={(e) => setSearchTranscript(e.target.value)}
                      />
                    </div>
                    <Select value={effectiveTranscriptStudentId} onValueChange={setSelectedTranscriptStudentId}>
                      <SelectTrigger className="w-full sm:w-[260px] h-9 text-sm">
                        <SelectValue placeholder="Choisir un etudiant" />
                      </SelectTrigger>
                      <SelectContent>
                        {transcriptCandidates.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name} ({s.matricule})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Transcript Preview */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 text-[#1a2744]" />
                      <CardTitle className="text-sm font-semibold text-[#1a2744]">Releve de Notes</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="text-xs h-8" disabled={!transcript} onClick={printTranscript}>
                        <Printer className="size-3.5 mr-1.5" />
                        Imprimer
                      </Button>
                      <Button size="sm" className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs h-8" disabled={!transcript} onClick={downloadTranscript}>
                        <Download className="size-3.5 mr-1.5" />
                        Exporter
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {transcriptQuery.isLoading ? (
                    <div className="border-2 border-gray-200 rounded-lg p-8 text-center text-sm text-gray-400">
                      Chargement du releve...
                    </div>
                  ) : !transcript ? (
                    <div className="border-2 border-gray-200 rounded-lg p-8 text-center text-sm text-gray-400">
                      Aucun resultat publie pour le moment
                    </div>
                  ) : (
                  <div className="border-2 border-gray-200 rounded-lg p-5">
                    {/* University Header */}
                    <div className="text-center mb-4">
                      <h3 className="text-sm font-bold text-[#1a2744] uppercase tracking-wide">Relevé institutionnel</h3>
                      <p className="text-[10px] text-gray-500">Établissement connecté au compte administrateur</p>
                      <Separator className="my-2 bg-[#1a2744] h-0.5" />
                      <p className="text-xs font-semibold text-[#1a2744]">RELEVE DE NOTES ET DE CREDITS</p>
                    </div>

                    {/* Student Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-gray-500 w-24">Nom complet :</span>
                          <span className="text-xs font-medium text-[#1a2744]">{transcript.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-gray-500 w-24">Matricule :</span>
                          <span className="text-xs font-mono text-[#1a2744]">{transcript.matricule}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-gray-500 w-24">Date naissance :</span>
                          <span className="text-xs text-gray-700">{transcript.dateNaissance}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-gray-500 w-24">Filiere :</span>
                          <span className="text-xs font-medium text-[#1a2744]">{transcript.filiere}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-gray-500 w-24">Niveau :</span>
                          <span className="text-xs text-gray-700">{transcript.niveau}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-gray-500 w-24">Semestre :</span>
                          <span className="text-xs text-gray-700">{transcript.semester}</span>
                        </div>
                      </div>
                    </div>

                    {/* Grades Table */}
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#1a2744] hover:bg-[#1a2744]">
                          <TableHead className="text-[10px] text-white font-semibold">Code</TableHead>
                          <TableHead className="text-[10px] text-white font-semibold">Unite d&apos;enseignement</TableHead>
                          <TableHead className="text-[10px] text-white font-semibold text-center">Credits</TableHead>
                          <TableHead className="text-[10px] text-white font-semibold text-center">Note/20</TableHead>
                          <TableHead className="text-[10px] text-white font-semibold text-center">Validation</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transcript.ueGrades.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-6 text-sm text-gray-400">
                              Aucune note publiee pour cet etudiant sur cette periode
                            </TableCell>
                          </TableRow>
                        ) : transcript.ueGrades.map((ue) => (
                          <TableRow key={ue.code} className="hover:bg-gray-50">
                            <TableCell className="py-2 text-xs font-mono text-gray-500">{ue.code}</TableCell>
                            <TableCell className="py-2 text-xs font-medium text-[#1a2744]">{ue.name}</TableCell>
                            <TableCell className="py-2 text-center text-xs font-semibold">{ue.credit}</TableCell>
                            <TableCell className="py-2 text-center">
                              <span className={`text-sm font-bold ${ue.note >= passingGrade ? 'text-[#2d7a4f]' : 'text-[#c62828]'}`}>
                                {ue.note}
                              </span>
                            </TableCell>
                            <TableCell className="py-2 text-center">
                              {ue.note >= passingGrade ? (
                                <CheckCircle2 className="size-4 text-[#2d7a4f] inline" />
                              ) : (
                                <XCircle className="size-4 text-[#c62828] inline" />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-gray-50 font-semibold">
                          <TableCell colSpan={2} className="py-2 text-xs text-[#1a2744]">TOTAL</TableCell>
                          <TableCell className="py-2 text-center text-xs">{transcript.totalCredits}</TableCell>
                          <TableCell className="py-2 text-center">
                            <span className="text-sm font-bold text-[#2d7a4f]">{transcript.moyenne}</span>
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      </TableBody>
                    </Table>

                    {/* Mention and document status */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500">Mention :</span>
                        <Badge className={`text-xs ${mentionConfig[transcript.mention].bgClass}`}>
                          <Star className="size-3 mr-1" />
                          {transcript.mention}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 bg-[#d4a85308] border border-[#d4a85320] rounded-lg px-3 py-1.5">
                        <Shield className="size-4 text-[#d4a853]" />
                        <div>
                          <p className="text-[9px] font-semibold text-[#1a2744] uppercase">Vérification non activée</p>
                          <p className="text-[9px] text-gray-500">Aucun QR code officiel n’est généré ici</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ─── Tab 3: Progression Academique ─────────────────────────────────── */}
            <TabsContent value="progression" className="mt-4 space-y-4">
              {/* Student Search */}
              <Card className="border-l-4 border-l-[#d4a853]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Search className="size-4 text-gray-400 shrink-0" />
                    <Input
                      placeholder="Rechercher un etudiant pour suivre sa progression..."
                      className="h-9 text-sm flex-1"
                      value={searchProgression}
                      onChange={(e) => setSearchProgression(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Progress Tracker */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Student Info & Progress */}
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Target className="size-4 text-[#1a2744]" />
                      <CardTitle className="text-sm font-semibold text-[#1a2744]">Progression vers le diplome</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-4">
                    {progressionStudent ? (
                      <>
                        {/* Student Header */}
                        <div className="flex items-center gap-3 p-3 bg-[#1a274405] rounded-lg">
                          <div className="w-10 h-10 rounded-full bg-[#1a2744] flex items-center justify-center text-sm font-bold text-white">
                            {progressionStudent.name.split(' ').map(p => p[0]).slice(0, 2).join('')}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#1a2744]">{progressionStudent.name}</p>
                            <p className="text-xs text-gray-500">{progressionStudent.matricule}</p>
                          </div>
                        </div>

                        {/* Credits Progress (session en cours) */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold text-gray-600">Credits valides (session en cours)</span>
                            <span className="text-xs font-bold text-[#2d7a4f]">{progressionStudent.credits} / {creditsPerYear}</span>
                          </div>
                          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-[#1a2744] to-[#2d7a4f]"
                              initial={{ width: 0 }}
                              animate={{ width: `${creditsPerYear > 0 ? Math.min(100, Math.round((progressionStudent.credits / creditsPerYear) * 100)) : 0}%` }}
                              transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                            />
                          </div>
                        </div>

                        {/* Session average & decision */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-gray-50 rounded-lg text-center">
                            <p className="text-[10px] text-gray-500">Moyenne de la session</p>
                            <p className={`text-lg font-bold ${progressionStudent.moyenne >= passingGrade ? 'text-[#2d7a4f]' : 'text-[#c62828]'}`}>{progressionStudent.moyenne.toFixed(1)}</p>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-lg text-center">
                            <p className="text-[10px] text-gray-500">Decision</p>
                            <p className="text-lg font-bold text-[#1a2744]">{progressionStudent.decision}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-8">
                        {searchProgression ? 'Aucun etudiant trouve' : 'Recherchez un etudiant pour voir sa progression'}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* At Risk Students -- derived from real results below the passing grade */}
                <Card className="border-l-4 border-l-[#c62828]">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="size-4 text-[#c62828]" />
                      <CardTitle className="text-sm font-semibold text-[#c62828]">Etudiants en difficulte</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <ScrollArea className="max-h-80">
                      <div className="space-y-2.5">
                        {atRiskStudents.length === 0 && (
                          <p className="text-xs text-gray-400 text-center py-6">Aucun etudiant en difficulte pour la session en cours</p>
                        )}
                        {atRiskStudents.map((student) => (
                          <motion.div
                            key={student.id}
                            className={`p-3 rounded-lg border ${student.risk === 'critical' ? 'bg-[#c6282808] border-[#c6282820]' : 'bg-[#d4a85308] border-[#d4a85320]'}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-xs font-semibold text-[#1a2744]">{student.name}</p>
                                <p className="text-[10px] text-gray-500 font-mono">{student.matricule}</p>
                              </div>
                              <Badge className={`text-[9px] border-0 ${student.risk === 'critical' ? 'bg-[#c6282815] text-[#c62828]' : 'bg-[#d4a85315] text-[#d4a853]'}`}>
                                {student.risk === 'critical' ? 'Critique' : 'Attention'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="text-[10px] text-gray-500">Moy: <span className={`font-bold ${student.moyenne < 10 ? 'text-[#c62828]' : 'text-[#d4a853]'}`}>{student.moyenne}</span></span>
                              <span className="text-[10px] text-gray-500">Dette: <span className="font-bold text-[#c62828]">{student.creditDebt} credits</span></span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ─── Tab 4: Statistiques des Resultats ──────────────────────────────── */}
            <TabsContent value="statistics" className="mt-4 space-y-4">
              {/* Distribution Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Moyenne Distribution */}
                <Card className="border-l-4 border-l-[#1a2744]">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="size-4 text-[#1a2744]" />
                      <CardTitle className="text-sm font-semibold text-[#1a2744]">Distribution des moyennes</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="space-y-2.5">
                      {averageDistribution.map((item, i) => {
                        const maxCount = Math.max(1, ...averageDistribution.map(d => d.count))
                        return (
                          <div key={item.range} className="flex items-center gap-3">
                            <span className="text-xs font-medium text-gray-600 w-10 text-right">{item.range}</span>
                            <div className="flex-1 h-6 bg-gray-50 rounded overflow-hidden relative">
                              <motion.div
                                className="h-full rounded"
                                style={{ backgroundColor: item.color }}
                                initial={{ width: 0 }}
                                animate={{ width: `${(item.count / maxCount) * 100}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 * i }}
                              />
                            </div>
                            <span className="text-xs font-bold text-gray-700 w-6">{item.count}</span>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Mention Distribution */}
                <Card className="border-l-4 border-l-[#d4a853]">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Award className="size-4 text-[#d4a853]" />
                      <CardTitle className="text-sm font-semibold text-[#1a2744]">Repartition par mention</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="space-y-3">
                      {mentionDistribution.map((item, i) => (
                        <div key={item.mention}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-600">{item.mention}</span>
                            <span className="text-xs font-bold" style={{ color: item.color }}>{item.count} ({item.percent}%)</span>
                          </div>
                          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: item.color }}
                              initial={{ width: 0 }}
                              animate={{ width: `${item.percent}%` }}
                              transition={{ duration: 0.9, ease: 'easeOut', delay: 0.12 * i }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Current Session Summary Table */}
              <Card className="border-l-4 border-l-[#2d7a4f]">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-[#2d7a4f]" />
                    <CardTitle className="text-sm font-semibold text-[#1a2744]">Synthèse de la session courante</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 hover:bg-gray-50">
                        <TableHead className="text-[10px] font-semibold uppercase">Session</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase text-center">Admis</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase text-center">Compenses</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase text-center">Ajournes</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase text-center">Taux reussite</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase text-center">Moyenne</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="hover:bg-gray-50">
                        <TableCell className="py-2.5 text-xs font-semibold text-[#1a2744]">{sessionLabel}</TableCell>
                        <TableCell className="py-2.5 text-center text-xs text-[#2d7a4f] font-semibold">{sessionStats.admis}</TableCell>
                        <TableCell className="py-2.5 text-center text-xs text-[#d4a853] font-semibold">{sessionStats.compenses}</TableCell>
                        <TableCell className="py-2.5 text-center text-xs text-[#c62828] font-semibold">{sessionStats.ajournes}</TableCell>
                        <TableCell className="py-2.5 text-center">
                          <span className="text-xs font-bold text-[#2d7a4f]">{results.length > 0 ? Math.round((sessionStats.admis / results.length) * 100) : 0}%</span>
                        </TableCell>
                        <TableCell className="py-2.5 text-center text-xs font-semibold text-[#1a2744]">{sessionStats.moyenneGenerale}/20</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Advanced breakdowns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border-l-4 border-l-[#1a2744]">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="size-4 text-[#1a2744]" />
                      <CardTitle className="text-sm font-semibold text-[#1a2744]">Taux par filière/faculté</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-5 text-center">
                      <GraduationCap className="size-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm font-medium text-[#1a2744]">Ventilation non disponible dans l’API actuelle.</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Les résultats renvoyés ne contiennent pas encore la filière ou la faculté. Les anciens taux Sciences/Droit/Médecine codés en dur ont été retirés.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-[#d4a853]">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-[#d4a853]" />
                      <CardTitle className="text-sm font-semibold text-[#1a2744]">Comparaison par genre</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-5 text-center">
                      <Users className="size-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm font-medium text-[#1a2744]">Données de genre non exposées par ce module.</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Les pourcentages Hommes/Femmes inventés ont été retirés. Cette comparaison sera affichée quand l’API transmettra un champ de genre fiable.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>


        {/* ─── Configuration Card ───────────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-[#2d7a4f]">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Shield className="size-4 text-[#2d7a4f]" />
                <CardTitle className="text-sm font-semibold text-[#1a2744]">Configuration réelle du module résultats</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-3 bg-[#1a274405] rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <GraduationCap className="size-4 text-[#1a2744]" />
                    <p className="text-xs font-semibold text-[#1a2744]">Paramètres utilisés</p>
                  </div>
                  <ul className="space-y-1">
                    <li className="text-[11px] text-gray-600 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3 text-[#2d7a4f] shrink-0" />
                      Seuil de validation : {passingGrade}/20
                    </li>
                    <li className="text-[11px] text-gray-600 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3 text-[#2d7a4f] shrink-0" />
                      Crédits annuels attendus : {creditsPerYear}
                    </li>
                    <li className="text-[11px] text-gray-600 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3 text-[#2d7a4f] shrink-0" />
                      Moyennes calculées depuis les notes publiées
                    </li>
                  </ul>
                </div>

                <div className="p-3 bg-[#2d7a4f05] rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CircleDot className="size-4 text-[#2d7a4f]" />
                    <p className="text-xs font-semibold text-[#1a2744]">Décisions</p>
                  </div>
                  <ul className="space-y-1">
                    <li className="text-[11px] text-gray-600 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3 text-[#2d7a4f] shrink-0" />
                      Admis si moyenne ≥ {passingGrade}/20
                    </li>
                    <li className="text-[11px] text-gray-600 flex items-center gap-1.5">
                      <AlertTriangle className="size-3 text-[#d4a853] shrink-0" />
                      Compensation fine non exposée par l’API actuelle
                    </li>
                    <li className="text-[11px] text-gray-600 flex items-center gap-1.5">
                      <AlertTriangle className="size-3 text-[#d4a853] shrink-0" />
                      Exclusion non calculée dans ce module
                    </li>
                  </ul>
                </div>

                <div className="p-3 bg-[#d4a85305] rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="size-4 text-[#d4a853]" />
                    <p className="text-xs font-semibold text-[#1a2744]">Sessions connectées</p>
                  </div>
                  <ul className="space-y-1">
                    <li className="text-[11px] text-gray-600 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3 text-[#2d7a4f] shrink-0" />
                      Session normale
                    </li>
                    <li className="text-[11px] text-gray-600 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3 text-[#2d7a4f] shrink-0" />
                      Session de rattrapage
                    </li>
                    <li className="text-[11px] text-gray-600 flex items-center gap-1.5">
                      <AlertTriangle className="size-3 text-[#d4a853] shrink-0" />
                      Calendrier de session à connecter séparément
                    </li>
                  </ul>
                </div>

                <div className="p-3 bg-[#1a274405] rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Download className="size-4 text-[#1a2744]" />
                    <p className="text-xs font-semibold text-[#1a2744]">Exports</p>
                  </div>
                  <ul className="space-y-1">
                    <li className="text-[11px] text-gray-600 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3 text-[#2d7a4f] shrink-0" />
                      Export des résultats affichés
                    </li>
                    <li className="text-[11px] text-gray-600 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3 text-[#2d7a4f] shrink-0" />
                      Export du relevé sélectionné
                    </li>
                    <li className="text-[11px] text-gray-600 flex items-center gap-1.5">
                      <AlertTriangle className="size-3 text-[#d4a853] shrink-0" />
                      PDF officiel à signer non généré
                    </li>
                  </ul>
                </div>

                <div className="p-3 bg-[#2d7a4f05] rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Printer className="size-4 text-[#2d7a4f]" />
                    <p className="text-xs font-semibold text-[#1a2744]">Impression</p>
                  </div>
                  <ul className="space-y-1">
                    <li className="text-[11px] text-gray-600 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3 text-[#2d7a4f] shrink-0" />
                      Impression du relevé sélectionné
                    </li>
                    <li className="text-[11px] text-gray-600 flex items-center gap-1.5">
                      <AlertTriangle className="size-3 text-[#d4a853] shrink-0" />
                      Cachet numérique non configuré
                    </li>
                    <li className="text-[11px] text-gray-600 flex items-center gap-1.5">
                      <AlertTriangle className="size-3 text-[#d4a853] shrink-0" />
                      QR code de vérification non activé ici
                    </li>
                  </ul>
                </div>

                <div className="p-3 bg-[#d4a85305] rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="size-4 text-[#d4a853]" />
                    <p className="text-xs font-semibold text-[#1a2744]">Langue</p>
                  </div>
                  <ul className="space-y-1">
                    <li className="text-[11px] text-gray-600 flex items-center gap-1.5">
                      <CheckCircle2 className="size-3 text-[#2d7a4f] shrink-0" />
                      Interface et relevé en français
                    </li>
                    <li className="text-[11px] text-gray-600 flex items-center gap-1.5">
                      <AlertTriangle className="size-3 text-[#d4a853] shrink-0" />
                      Relevés bilingues non connectés
                    </li>
                    <li className="text-[11px] text-gray-600 flex items-center gap-1.5">
                      <AlertTriangle className="size-3 text-[#d4a853] shrink-0" />
                      Traductions avancées non activées
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </TooltipProvider>
  )
}
