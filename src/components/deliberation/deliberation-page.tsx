'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import { useDeliberation, useAcademicYears } from '@/lib/api-hooks'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { QrDisplay } from '@/components/ui/qr-display'
import { Loader2 } from 'lucide-react'
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
  CheckSquare,
  Plus,
  FileText,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  Users,
  Shield,
  Gavel,
  TrendingUp,
  Award,
  BookOpen,
  Trash2,
  ChevronRight,
  Activity,
} from 'lucide-react'

// ─── Types and API-backed data mapping ────────────────────────────────────────

interface DeliberationSession {
  id: string
  titre: string
  date: string
  statut: 'planifiee' | 'en_cours' | 'terminee'
  type?: string
  academicYearId?: string
}

type Decision = 'ADMI' | 'AJOURNE' | 'REDOUBLANT' | 'EXCLU' | 'ADMI_DETTE' | 'COMPENSE'

interface DeliberationStudent {
  id: string
  matricule: string
  nom: string
  prenom: string
  moyenne: number
  credits: number
  creditsTotal: number
  decision: Decision
  observation: string
  isModified?: boolean
  modificationReason?: string
  updatedAt?: string
  modifiedBy?: string | null
  modifiedAt?: string | null
}

interface MissingGradeItem {
  ueCode: string | null
  ueName: string
  ecCode: string | null
  ecName: string | null
}

interface IncompleteStudent {
  studentId: string
  name: string
  matricule: string
  expected: number
  locked: number
  missing: number
  missingItems: MissingGradeItem[]
}

interface DeliberationReadiness {
  ready: boolean
  expectedGradeCount: number
  lockedGradeCount: number
  missingGradeCount: number
  unexpectedGradeCount?: number
  studentsWithoutRegistration?: number
  studentsTotal: number
  studentsReady: number
  incompleteStudents: IncompleteStudent[]
}

function describeReadinessIssue(readiness: DeliberationReadiness): string {
  const missing = `${readiness.missingGradeCount} note(s) définitive(s) manquante(s) ou incohérente(s).`
  const withoutRegistration = readiness.studentsWithoutRegistration
    ? ` ${readiness.studentsWithoutRegistration} étudiant(s) sans inscription pédagogique active.` : ''
  const unexpected = readiness.unexpectedGradeCount
    ? ` ${readiness.unexpectedGradeCount} note(s) hors inscriptions actives à corriger.` : ''
  return `${missing}${withoutRegistration}${unexpected}`
}

const decisionConfig: Record<Decision, { label: string; className: string; icon: React.ElementType; tooltip: string }> = {
  ADMI: { label: 'Admis', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0 hover:bg-[#2d7a4f15]', icon: CheckCircle2, tooltip: 'Etudiant admis avec succes' },
  AJOURNE: { label: 'Ajourne', className: 'bg-[#ef6c0015] text-[#ef6c00] border-0 hover:bg-[#ef6c0015]', icon: Clock, tooltip: 'Passage en session de rattrapage' },
  REDOUBLANT: { label: 'Redoublant', className: 'bg-[#c6282815] text-[#c62828] border-0 hover:bg-[#c6282815]', icon: XCircle, tooltip: 'Redoublement du semestre' },
  EXCLU: { label: 'Exclu', className: 'bg-[#8b000015] text-[#8b0000] border-0 hover:bg-[#8b000015]', icon: AlertTriangle, tooltip: 'Exclusion definitive' },
  ADMI_DETTE: { label: 'Admis avec dette', className: 'bg-[#d4a85315] text-[#d4a853] border-0 hover:bg-[#d4a85315]', icon: Award, tooltip: 'Admis mais avec des credits en dette' },
  COMPENSE: { label: 'Compense', className: 'bg-[#1a274415] text-[#1a2744] border-0 hover:bg-[#1a274415]', icon: TrendingUp, tooltip: 'Compensation inter-UE validee' },
}

const sessionStatusConfig: Record<string, { label: string; className: string }> = {
  planifiee: { label: 'Planifiee', className: 'bg-[#d4a85315] text-[#d4a853] border-0' },
  en_cours: { label: 'En cours', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' },
  terminee: { label: 'Terminee', className: 'bg-gray-100 text-gray-500 border-0' },
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DeliberationPage() {
  const queryClient = useQueryClient()
  const tenantId = useAppStore((s) => s.user?.tenantId)
  const userRole = useAppStore((s) => s.user?.role)
  const setView = useAppStore((s) => s.setView)
  const { data: academicYearsQuery } = useAcademicYears() as {
    data: { data: { id: string; name: string; isCurrent: boolean }[] } | undefined
  }
  const currentYearName = (academicYearsQuery?.data || []).find((y) => y.isCurrent)?.name || ''
  const currentYearId = (academicYearsQuery?.data || []).find((y) => y.isCurrent)?.id || ''
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null)
  const [selectedSessionType, setSelectedSessionType] = useState('normale')
  const [isExportingPV, setIsExportingPV] = useState(false)
  const [pvPageFormat, setPvPageFormat] = useState<'A3' | 'A4'>('A3')
  const [isLaunching, setIsLaunching] = useState(false)
  const [isLocking, setIsLocking] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [juryMembers, setJuryMembers] = useState<{ id: string; name: string; role: string; signature?: string }[]>([])
  const [uploadingMember, setUploadingMember] = useState<number | null>(null)
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberRole, setNewMemberRole] = useState('Membre')
  const [editingStudent, setEditingStudent] = useState<DeliberationStudent | null>(null)
  const [editedDecision, setEditedDecision] = useState<Decision>('AJOURNE')
  const [correctionReason, setCorrectionReason] = useState('')
  const [isSavingCorrection, setIsSavingCorrection] = useState(false)

  const apiSessionType = selectedSessionType === 'normale' ? 'NORMALE' : 'RATTRAPAGE'
  const { data: deliberationData, isLoading: isDeliberationLoading } = useDeliberation(
    selectedSession ? { id: selectedSession, departmentId: selectedDepartmentId || undefined } :
      { session: apiSessionType, departmentId: selectedDepartmentId || undefined }
  )
  const departments: { id: string; name: string; shortName: string | null }[] = useMemo(
    () => deliberationData?.departments ?? [], [deliberationData?.departments]
  )
  useEffect(() => {
    if (!selectedDepartmentId && departments.length > 0) setSelectedDepartmentId(departments[0].id)
  }, [departments, selectedDepartmentId])
  const selectedDepartment = departments.find((department) => department.id === selectedDepartmentId)
  const deliberations: DeliberationSession[] = useMemo(
    () => (deliberationData?.sessions ?? []).map((s: { id: string; titre: string; date: string; statut: string; type?: string; academicYearId?: string }) => ({
      id: s.id, titre: s.titre, date: s.date, statut: s.statut as DeliberationSession['statut'], type: s.type, academicYearId: s.academicYearId,
    })),
    [deliberationData]
  )

  useEffect(() => {
    const expectedType = apiSessionType === 'RATTRAPAGE' ? 'RATTRAPAGE' : 'ANNUEL'
    const latestSession = deliberations.find((session) => session.type === expectedType && session.academicYearId === currentYearId)
    if (!selectedSession && latestSession) {
      setSelectedSession(latestSession.id)
    }
  }, [apiSessionType, deliberations, selectedSession, currentYearId])

  const deliberationStudents: DeliberationStudent[] = useMemo(() => deliberationData?.students ?? [], [deliberationData])
  const readiness: DeliberationReadiness | null = deliberationData?.readiness ?? null
  const isReadyForJury = Boolean(readiness?.ready)
  const isLocked: boolean = deliberationData?.selected?.isLocked ?? false
  useEffect(() => {
    const stored = deliberationData?.selected?.juryMembers
    if (isLocked && Array.isArray(stored)) {
      setJuryMembers(stored.map((member: { name: string; role: string; signature?: string }, index: number) => ({
        id: `${selectedSession}-${index}`, name: member.name, role: member.role, signature: member.signature,
      })))
    }
  }, [isLocked, deliberationData?.selected?.juryMembers, selectedSession])
  const currentSession = deliberations.find(d => d.id === selectedSession)
  const hasStudents = deliberationStudents.length > 0
  const canExportPV = Boolean(selectedSession && isLocked && hasStudents && isReadyForJury &&
    juryMembers.length > 0 && juryMembers.every((member) => Boolean(member.signature)))
  const canLock = Boolean(selectedSession && !isLocked && hasStudents && isReadyForJury && juryMembers.filter((member) => member.role === 'President').length === 1)

  const uploadJurySignature = async (memberIndex: number, file?: File) => {
    if (!selectedSession || !file) return
    setUploadingMember(memberIndex)
    try {
      const payload = new FormData()
      payload.set('deliberationId', selectedSession)
      payload.set('memberIndex', String(memberIndex))
      payload.set('file', file)
      const response = await fetch('/api/deliberation/signature', { method: 'POST', body: payload })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Signature non enregistrée')
      setJuryMembers((current) => current.map((member, index) => index === memberIndex ? { ...member, signature: result.signature } : member))
      await queryClient.invalidateQueries({ queryKey: ['deliberation'] })
      toast.success('Image de signature enregistrée')
    } catch (error) {
      toast.error('Erreur', { description: error instanceof Error ? error.message : 'Signature invalide' })
    } finally {
      setUploadingMember(null)
    }
  }

  const openDecisionEditor = (student: DeliberationStudent) => {
    if (!selectedSession || isLocked || !student.updatedAt) return
    setEditingStudent(student)
    setEditedDecision(student.decision)
    setCorrectionReason('')
  }

  const saveDecisionCorrection = async () => {
    if (!editingStudent || !selectedSession || !editingStudent.updatedAt || isSavingCorrection) return
    const reason = correctionReason.trim()
    if (editedDecision === editingStudent.decision || reason.length < 10 || reason.length > 1000) {
      toast.error('Correction incomplète', { description: 'Choisissez une autre décision et justifiez-la en 10 à 1000 caractères.' })
      return
    }
    setIsSavingCorrection(true)
    try {
      const response = await fetch(`/api/deliberation?id=${encodeURIComponent(selectedSession)}&decisionId=${encodeURIComponent(editingStudent.id)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: editedDecision, reason, expectedUpdatedAt: editingStudent.updatedAt }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Correction impossible')
      setEditingStudent(null)
      await queryClient.invalidateQueries({ queryKey: ['deliberation'] })
      toast.success('Décision corrigée', { description: 'Le motif et l’auteur sont enregistrés dans l’historique du jury.' })
    } catch (error) {
      await queryClient.invalidateQueries({ queryKey: ['deliberation'] })
      toast.error('Correction refusée', { description: error instanceof Error ? error.message : 'Veuillez réessayer.' })
    } finally {
      setIsSavingCorrection(false)
    }
  }

  const handleLaunch = async () => {
    if (isDeliberationLoading) return
    if (!isReadyForJury) {
      toast.error('Délibération bloquée', {
        description: readiness
          ? `${describeReadinessIssue(readiness)} Complétez et verrouillez les notes avant le jury.`
          : 'La complétude des notes est en cours de vérification.',
      })
      return
    }
    if (!hasStudents) {
      toast.error('Aucune note à délibérer', { description: "Saisissez d'abord les notes de l'année académique en cours." })
      return
    }
    if (!window.confirm('Lancer une nouvelle délibération avec les décisions calculées depuis les notes réelles ?')) return
    setIsLaunching(true)
    try {
      const res = await fetch('/api/deliberation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: apiSessionType, departmentId: selectedDepartmentId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Echec du lancement')
      toast.success('Deliberation lancee', { description: `${json.deliberation?.decisions?.length ?? 0} etudiant(s) evalue(s)` })
      setSelectedSession(json.deliberation?.id ?? null)
      queryClient.invalidateQueries({ queryKey: ['deliberation'] })
    } catch (e) {
      toast.error('Erreur', { description: e instanceof Error ? e.message : 'Echec du lancement' })
    } finally {
      setIsLaunching(false)
    }
  }

  const handleLock = async () => {
    if (!selectedSession) return
    if (!isReadyForJury) {
      toast.error('Validation bloquée', {
        description: readiness
          ? describeReadinessIssue(readiness)
          : 'La complétude des notes est en cours de vérification.',
      })
      return
    }
    if (!hasStudents) {
      toast.error('Aucun résultat à valider')
      return
    }
    if (!window.confirm('Valider officiellement cette délibération ? Cette action officialise les résultats.')) return
    setIsLocking(true)
    try {
      const res = await fetch(`/api/deliberation?id=${selectedSession}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ juryMembers: juryMembers.map(({ name, role }) => ({ name, role })) }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Echec de la validation')
      toast.success('Deliberation validee', { description: 'Les resultats sont officialises' })
      queryClient.invalidateQueries({ queryKey: ['deliberation'] })
    } catch (error) {
      toast.error('Echec de la validation', {
        description: error instanceof Error ? error.message : undefined,
      })
    } finally {
      setIsLocking(false)
    }
  }

  const exportPV = useCallback(async () => {
    if (!tenantId) {
      toast.error('Session invalide', { description: 'Impossible de determiner votre etablissement' })
      return
    }
    if (!selectedSession) {
      toast.error('Sélection requise', { description: 'Sélectionnez ou lancez une délibération avant de générer un PV.' })
      return
    }
    if (!isLocked) {
      toast.error('Délibération non validée', { description: 'Validez officiellement la délibération avant de générer le PV.' })
      return
    }
    if (!isReadyForJury) {
      toast.error('PV bloqué', {
        description: readiness
          ? `${describeReadinessIssue(readiness)} Le PV officiel exige une délibération complète.`
          : 'La complétude des notes est en cours de vérification.',
      })
      return
    }
    if (!hasStudents) {
      toast.error('PV indisponible', { description: 'Aucun étudiant ne figure dans cette délibération.' })
      return
    }
    setIsExportingPV(true)
    try {
      const res = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'PV_DELIBERATION',
          tenantId,
          deliberationId: selectedSession,
          sign: true,
          pageFormat: pvPageFormat,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur de génération')
      }

      const verificationCode = res.headers.get('X-Verification-Code') || ''

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `PV_${(selectedDepartment?.shortName || selectedDepartment?.name || 'Departement').replace(/[^a-zA-Z0-9-]/g, '_')}_${Date.now()}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)

      if (verificationCode) {
        setQrCode(verificationCode)
      }

      toast.success('PV exporté avec succès', { description: verificationCode ? `Code: ${verificationCode}` : 'Le procès-verbal a été téléchargé' })
    } catch (error) {
      toast.error('Erreur d\'export', {
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
      })
    } finally {
      setIsExportingPV(false)
    }
  }, [selectedSession, tenantId, isLocked, hasStudents, isReadyForJury, readiness, selectedDepartment, pvPageFormat])

  // ─── Computed Stats ────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const admis = deliberationStudents.filter(s => s.decision === 'ADMI').length
    const compenses = deliberationStudents.filter(s => s.decision === 'COMPENSE').length
    const ajournes = deliberationStudents.filter(s => s.decision === 'AJOURNE' || s.decision === 'REDOUBLANT').length
    const exclus = deliberationStudents.filter(s => s.decision === 'EXCLU').length
    const admisDette = deliberationStudents.filter(s => s.decision === 'ADMI_DETTE').length
    const admissionRate = deliberationStudents.length > 0
      ? Math.round(((admis + compenses + admisDette) / deliberationStudents.length) * 100)
      : 0
    return {
      total: deliberationStudents.length,
      admis,
      compenses,
      ajournes,
      exclus,
      admisDette,
      admissionRate,
    }
  }, [deliberationStudents])

  // ─── Jury Members Management ───────────────────────────────────────────
  const addMember = () => {
    if (!newMemberName.trim()) {
      toast.error('Nom du membre requis')
      return
    }
    if (newMemberRole === 'President' && juryMembers.some((member) => member.role === 'President')) {
      toast.error('Président déjà défini', { description: 'Un seul président est attendu sur le PV.' })
      return
    }
    const newMember = {
      id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${juryMembers.length}`,
      name: newMemberName.trim(),
      role: newMemberRole,
    }
    setJuryMembers(prev => [...prev, newMember])
    setNewMemberName('')
  }

  const removeMember = (id: string) => {
    setJuryMembers(prev => prev.filter(m => m.id !== id))
  }

  // ─── Get Decision Badge Color for Row ──────────────────────────────────
  const getDecisionRowBg = (decision: Decision) => {
    switch (decision) {
      case 'ADMI': return 'bg-[#2d7a4f05]'
      case 'COMPENSE': return 'bg-[#1a274405]'
      case 'ADMI_DETTE': return 'bg-[#d4a85305]'
      case 'AJOURNE': return 'bg-[#ef6c0005]'
      case 'REDOUBLANT': return 'bg-[#c6282805]'
      case 'EXCLU': return 'bg-[#8b000005]'
      default: return ''
    }
  }

  const getMoyenneColor = (moyenne: number) => {
    if (moyenne >= 10) return 'text-[#2d7a4f]'
    if (moyenne >= 8) return 'text-[#f9a825]'
    return 'text-[#c62828]'
  }

  // Determine jury status based on current session
  const juryStatus = !currentSession ? 'pending' : currentSession.statut === 'en_cours' ? 'active' : currentSession.statut === 'planifiee' ? 'pending' : 'completed'

  return (
    <TooltipProvider>
      <div className="space-y-5">
        {/* Gradient Header Banner */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-[#1a2744] via-[#1f3050] to-[#2d7a4f] p-6 text-white relative">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE0YzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptLTQgMmMtMS4xIDAtMi0uOS0yLTJzLjktMiAyLTIgMiAuOSAyIDItLjkgMi0yIDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
              <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div>
                    <h1 className="text-2xl font-bold">Session de deliberation</h1>
                    <p className="text-white/70 text-sm mt-1">Deliberations et decisions de jury</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Select value={pvPageFormat} onValueChange={(value) => setPvPageFormat(value as 'A3' | 'A4')}>
                    <SelectTrigger aria-label="Format du procès-verbal" className="w-24 h-8 bg-white text-[#1a2744]"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="A3">A3</SelectItem><SelectItem value="A4">A4</SelectItem></SelectContent>
                  </Select>
                  {/* Animated Badge */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.3, type: 'spring', stiffness: 200 }}
                  >
                    <Badge className="bg-white/20 text-white border border-white/30 text-xs px-3 py-1">
                      <Gavel className="size-3 mr-1.5" />
                      {currentSession?.titre || 'Aucune session selectionnee'}
                    </Badge>
                  </motion.div>
                  <Button variant="outline" size="sm" className="text-xs bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white disabled:opacity-50" onClick={exportPV} disabled={isExportingPV || !canExportPV}>
                    {isExportingPV ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Download className="size-3.5 mr-1.5" />}
                    Exporter PV
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Jury Status Indicator */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Activity className="size-4 text-[#1a2744]" />
                  <span className="text-sm font-semibold text-[#1a2744]">Statut du jury</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100">
                    {juryStatus === 'active' && (
                      <motion.div
                        className="w-2.5 h-2.5 rounded-full bg-[#2d7a4f]"
                        animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    )}
                    {juryStatus === 'pending' && (
                      <motion.div
                        className="w-2.5 h-2.5 rounded-full bg-[#d4a853]"
                        animate={{ scale: [1, 1.2, 1], opacity: [1, 0.6, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    )}
                    {juryStatus === 'completed' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                    )}
                    <span className={`text-xs font-medium ${
                      juryStatus === 'active' ? 'text-[#2d7a4f]' :
                      juryStatus === 'pending' ? 'text-[#d4a853]' :
                      'text-gray-400'
                    }`}>
                      {!currentSession ? 'Aucune délibération sélectionnée' :
                       juryStatus === 'active' ? 'Jury actif - Deliberation en cours' :
                       juryStatus === 'pending' ? 'Jury en attente - Planifie' :
                       'Deliberation terminee'}
                    </span>
                  </div>
                  {juryStatus === 'active' && (
                    <Badge className="text-[10px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">
                      {juryMembers.length} membres presents
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── Grade Readiness Gate ───────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08 }}
        >
          <Card className={`border-l-4 ${isReadyForJury ? 'border-l-[#2d7a4f]' : 'border-l-[#d4a853]'}`}>
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${isReadyForJury ? 'bg-[#2d7a4f10]' : 'bg-[#d4a85315]'}`}>
                      {isReadyForJury ? (
                        <CheckCircle2 className="size-4 text-[#2d7a4f]" />
                      ) : (
                        <AlertTriangle className="size-4 text-[#d4a853]" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-[#1a2744]">
                        {isReadyForJury ? 'Notes prêtes pour jury' : 'Délibération bloquée : notes incomplètes ou incohérentes'}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Le jury utilise uniquement les notes verrouillées des UE réellement inscrites. Les PV officiels sont bloqués tant que cette vérification n&apos;est pas complète.
                      </p>
                    </div>
                  </div>

                  {Boolean(readiness?.unexpectedGradeCount) && (
                    <p className="text-xs text-[#b45f14]">
                      {readiness?.unexpectedGradeCount} note(s) hors inscriptions actives : corrigez ces lignes avant la validation du jury.
                    </p>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">Notes verrouillées</p>
                      <p className="text-lg font-bold text-[#1a2744]">
                        {readiness ? `${readiness.lockedGradeCount}/${readiness.expectedGradeCount}` : '—'}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">Manquantes</p>
                      <p className={`text-lg font-bold ${readiness?.missingGradeCount ? 'text-[#d4a853]' : 'text-[#2d7a4f]'}`}>
                        {readiness?.missingGradeCount ?? '—'}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">Étudiants complets</p>
                      <p className="text-lg font-bold text-[#1a2744]">
                        {readiness ? `${readiness.studentsReady}/${readiness.studentsTotal}` : '—'}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">Session</p>
                      <p className="text-lg font-bold text-[#1a2744]">
                        {selectedSessionType === 'normale' ? 'Normale' : 'Rattrapage'}
                      </p>
                    </div>
                  </div>

                  {!isReadyForJury && readiness && readiness.incompleteStudents.length > 0 && (
                    <div className="rounded-lg border border-[#d4a85330] bg-[#d4a85308] p-3 space-y-2">
                      <p className="text-xs font-medium text-[#1a2744]">Éléments à compléter en priorité</p>
                      <div className="space-y-2">
                        {readiness.incompleteStudents.slice(0, 3).map((student) => (
                          <div key={student.studentId} className="text-xs text-gray-600">
                            <span className="font-semibold text-[#1a2744]">{student.name}</span>
                            <span className="text-gray-400"> ({student.matricule}) — </span>
                            <span>{student.missing} note(s) manquante(s) : </span>
                            <span className="text-gray-500">
                              {student.missingItems.slice(0, 4).map((item) => (
                                item.ecCode || item.ecName
                                  ? `${item.ueCode || item.ueName} / ${item.ecCode || item.ecName}`
                                  : `${item.ueCode || item.ueName}`
                              )).join(', ')}
                              {student.missingItems.length > 4 ? '…' : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {!['FACULTE', 'DEPARTEMENT'].includes(userRole || '') && (
                  <div className="flex lg:flex-col gap-2">
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => setView('grades')}>
                      <BookOpen className="size-3.5 mr-1.5" />Ouvrir Notes
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── Jury Configuration Card ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="border-l-4 border-l-[#2d7a4f]">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Gavel className="size-4 text-[#2d7a4f]" />
                <CardTitle className="text-sm font-semibold text-[#1a2744]">
                  Configuration du jury
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600">Département responsable du PV</Label>
                {departments.length === 0 && !isDeliberationLoading && (
                  <p className="text-xs text-[#b45f14]">Aucun département actif accessible. Vérifiez votre affectation dans Utilisateurs et la Structure.</p>
                )}
                <Select value={selectedDepartmentId || ''} onValueChange={(value) => {
                  setSelectedDepartmentId(value)
                  setSelectedSession(null)
                  setJuryMembers([])
                }}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Choisir un département" /></SelectTrigger>
                  <SelectContent>
                    {departments.map((department) => <SelectItem key={department.id} value={department.id}>{department.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-gray-500">Seuls les inscrits de ce département sont délibérés. Les autres départements n&apos;affectent pas son PV.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Session</Label>
                  <Select
                    value={selectedSessionType}
                    onValueChange={(value) => {
                      setSelectedSessionType(value)
                      setSelectedSession(null)
                      setJuryMembers([])
                    }}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Session" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normale">Session Normale</SelectItem>
                      <SelectItem value="rattrapage">Session de Rattrapage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end pb-2">
                  <p className="text-[11px] text-gray-400">
                    Portée : inscrits du département {selectedDepartment?.name || 'à sélectionner'} · {currentYearName || 'année en cours'}
                  </p>
                </div>
              </div>

              {/* Jury Members with staggered animation */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                    <Users className="size-3.5" />
                    Membres du jury
                  </Label>
                  <Badge className="text-[10px] bg-[#1a274410] text-[#1a2744] border-0">
                    {juryMembers.length} membres
                  </Badge>
                </div>
                <div className="space-y-2">
                  <AnimatePresence>
                    {juryMembers.length === 0 && (
                      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3 text-xs text-gray-500">
                        Aucun membre ajouté. Ajoutez au moins un président avant de générer un PV officiel.
                      </div>
                    )}
                    {juryMembers.map((member, idx) => (
                      <motion.div
                        key={member.id}
                        layout
                        initial={{ opacity: 0, x: -20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 10, scale: 0.95 }}
                        transition={{ duration: 0.35, delay: idx * 0.08, ease: 'easeOut' }}
                        className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center gap-2.5">
                          <motion.div
                            className="w-8 h-8 rounded-full flex items-center justify-center"
                            style={{
                              background: member.role === 'President'
                                ? 'linear-gradient(135deg, #d4a853, #e0be72)'
                                : 'linear-gradient(135deg, #1a2744, #2a3d5e)'
                            }}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.3, delay: idx * 0.08 + 0.1, type: 'spring', stiffness: 200 }}
                          >
                            <User className="size-3.5 text-white" />
                          </motion.div>
                          <div>
                            <p className="text-sm font-medium text-[#1a2744]">{member.name}</p>
                            <Badge className={`text-[10px] border-0 ${
                              member.role === 'President'
                                ? 'bg-[#d4a85315] text-[#d4a853]'
                                : 'bg-[#2d7a4f15] text-[#2d7a4f]'
                            }`}>
                              {member.role}
                            </Badge>
                            {isLocked && <div className="mt-1 space-y-1">
                              <span className="text-[10px] text-gray-600">{member.signature ? 'Signature scannée enregistrée' : 'Signature à apposer sur le PV'}</span>
                              {['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'FACULTE', 'DEPARTEMENT'].includes(userRole || '') && <Input type="file" accept="image/png,image/jpeg,image/webp" aria-label={`Signature de ${member.name}`} disabled={uploadingMember !== null} onChange={(event) => void uploadJurySignature(idx, event.target.files?.[0])} className="h-8 text-xs max-w-52" />}
                            </div>}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-gray-600 hover:text-[#c62828] hover:bg-[#c6282810]"
                          onClick={() => removeMember(member.id)}
                          disabled={isLocked}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                {/* Add Member */}
                <p className="text-[11px] text-gray-400">
                  La composition du jury est enregistrée lors de la validation. Après validation, téléversez la signature scannée de chaque membre pour permettre l’émission du PV officiel. Ces images ne constituent pas une signature cryptographique.
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Nom du membre..."
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="h-9 text-sm flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && addMember()}
                    disabled={isLocked}
                  />
                  <Select value={newMemberRole} onValueChange={setNewMemberRole} disabled={isLocked}>
                    <SelectTrigger className="h-9 text-sm w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="President">President</SelectItem>
                      <SelectItem value="Membre">Membre</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="h-9 bg-[#1a2744] hover:bg-[#253556] text-white text-xs"
                    onClick={addMember}
                    disabled={isLocked}
                  >
                    <Plus className="size-3.5 mr-1" />
                    Ajouter
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Launch Button */}
              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs"
                  onClick={handleLaunch}
                  disabled={isLaunching || isDeliberationLoading || !hasStudents || !isReadyForJury || Boolean(selectedSession)}
                >
                  <Shield className="size-3.5 mr-1.5" />
                  {selectedSession
                    ? 'Session deja lancee'
                    : isLaunching
                      ? 'Lancement...'
                      : !isReadyForJury
                        ? 'Notes incompletes'
                        : 'Lancer la deliberation'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── Deliberation Results Section ────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <div className="space-y-4">
            {/* Summary Cards with Gradient Accent Bars */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Reussites */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 }}
              >
                <Card className="relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2d7a4f] to-[#3da66a]" />
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 rounded-lg bg-[#2d7a4f10]">
                        <CheckCircle2 className="size-4 text-[#2d7a4f]" />
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge className="text-[10px] bg-[#2d7a4f15] text-[#2d7a4f] border-0 cursor-help">
                            {stats.admis + stats.admisDette}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Admis: {stats.admis} + Admis avec dette: {stats.admisDette}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-2xl font-bold text-[#2d7a4f]">{stats.admis + stats.admisDette}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {isReadyForJury ? 'Reussites' : 'Reussites provisoires'}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Compenses */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.15 }}
              >
                <Card className="relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1a2744] to-[#3a4d6e]" />
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 rounded-lg bg-[#1a274410]">
                        <TrendingUp className="size-4 text-[#1a2744]" />
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge className="text-[10px] bg-[#1a274415] text-[#1a2744] border-0 cursor-help">
                            {stats.compenses}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Compensation inter-UE validee</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-2xl font-bold text-[#1a2744]">{stats.compenses}</p>
                    <p className="text-xs text-gray-500 mt-1">Compenses</p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Ajournes */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.2 }}
              >
                <Card className="relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#d4a853] to-[#e0be72]" />
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 rounded-lg bg-[#d4a85310]">
                        <Clock className="size-4 text-[#d4a853]" />
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge className="text-[10px] bg-[#d4a85315] text-[#d4a853] border-0 cursor-help">
                            {stats.ajournes}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Ajournes + Redoublants</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-2xl font-bold text-[#d4a853]">{stats.ajournes}</p>
                    <p className="text-xs text-gray-500 mt-1">Ajournes</p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Exclus */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.25 }}
              >
                <Card className="relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#8b0000] to-[#c62828]" />
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-2 rounded-lg bg-[#8b000010]">
                        <XCircle className="size-4 text-[#8b0000]" />
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge className="text-[10px] bg-[#8b000015] text-[#8b0000] border-0 cursor-help">
                            {stats.exclus}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Exclusion definitive - moyenne eliminatorie</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-2xl font-bold text-[#8b0000]">{stats.exclus}</p>
                    <p className="text-xs text-gray-500 mt-1">Exclus</p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Admission Rate Progress */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Award className="size-4 text-[#2d7a4f]" />
                    <span className="text-sm font-semibold text-[#1a2744]">
                      {isReadyForJury ? 'Taux d\u2019admission' : 'Taux provisoire non officialisable'}
                    </span>
                  </div>
                  <span className="text-2xl font-bold text-[#2d7a4f]">{stats.admissionRate}%</span>
                </div>
                <Progress value={stats.admissionRate} className="h-3" />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[10px] text-gray-400">
                    {isReadyForJury
                      ? `${stats.admis + stats.admisDette + stats.compenses} reussites sur ${stats.total} etudiants`
                      : 'Calcul indicatif uniquement : des notes sont incomplètes ou incohérentes, aucun PV officiel ne peut être généré.'}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-sm bg-[#2d7a4f]" />
                      <span className="text-[10px] text-gray-400">Admis</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-sm bg-[#1a2744]" />
                      <span className="text-[10px] text-gray-400">Compense</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-sm bg-[#d4a853]" />
                      <span className="text-[10px] text-gray-400">Dette</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2.5 rounded-sm bg-[#c62828]" />
                      <span className="text-[10px] text-gray-400">Ajourne</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* ─── Student Results Table ────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-[#1a2744]" />
                  <CardTitle className="text-sm font-semibold text-[#1a2744]">
                    Resultats des etudiants
                  </CardTitle>
                  {!isReadyForJury && (
                    <Badge className="text-[10px] bg-[#d4a85315] text-[#d4a853] border-0">
                      Provisoire
                    </Badge>
                  )}
                  <Badge className="text-[10px] bg-[#1a274410] text-[#1a2744] border-0">
                    {deliberationStudents.length} etudiants
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="text-xs" onClick={exportPV} disabled={isExportingPV || !canExportPV}>
                    {isExportingPV ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Download className="size-3.5 mr-1.5" />}
                    PV
                  </Button>
                  <Button
                    size="sm"
                    className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs"
                    onClick={handleLock}
                    disabled={!canLock || isLocking}
                  >
                    <CheckSquare className="size-3.5 mr-1.5" />
                    {isLocked ? 'Deliberation validee' : isLocking ? 'Validation...' : 'Valider deliberation'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            {selectedSession && !isLocked && hasStudents && (
              <p className="px-5 pb-3 text-xs text-gray-600">Les décisions ci-dessous sont proposées automatiquement. Le jury peut les corriger avec un motif avant la validation finale ; moyenne et crédits restent issus des notes verrouillées.</p>
            )}
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-xs font-semibold text-gray-500 w-8">#</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500">Matricule</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500">Nom Prenom</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500 text-center">Moyenne</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500 text-center">Credits valides</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500">Decision</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500">Observation</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500 text-right">Action du jury</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isDeliberationLoading && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-6 text-xs text-gray-400">Chargement...</TableCell>
                      </TableRow>
                    )}
                    {!isDeliberationLoading && deliberationStudents.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-6 text-xs text-gray-400">
                          Aucune note trouvee pour l&apos;annee academique en cours
                        </TableCell>
                      </TableRow>
                    )}
                    {deliberationStudents.map((student, i) => {
                      const config = decisionConfig[student.decision]
                      const DecisionIcon = config.icon
                      return (
                        <motion.tr
                          key={student.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.25, delay: i * 0.025 }}
                          className={`hover:bg-gray-50/50 ${getDecisionRowBg(student.decision)}`}
                        >
                          <TableCell className="text-xs text-gray-400 py-2">{i + 1}</TableCell>
                          <TableCell className="text-xs font-mono text-gray-600 py-2">{student.matricule}</TableCell>
                          <TableCell className="text-sm font-medium text-[#1a2744] py-2">
                            {student.nom} {student.prenom}
                          </TableCell>
                          <TableCell className="text-center py-2">
                            <span className={`text-sm font-bold ${getMoyenneColor(student.moyenne)}`}>
                              {student.moyenne.toFixed(1)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center py-2">
                            <div className="flex items-center justify-center gap-1.5">
                              <span className="text-sm font-medium text-[#1a2744]">{student.credits}</span>
                              <span className="text-xs text-gray-400">/ {student.creditsTotal}</span>
                            </div>
                            <div className="mt-0.5 h-1 bg-gray-100 rounded-full overflow-hidden mx-4">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  student.credits >= student.creditsTotal
                                    ? 'bg-[#2d7a4f]'
                                    : student.credits >= student.creditsTotal * 0.7
                                      ? 'bg-[#d4a853]'
                                      : 'bg-[#c62828]'
                                }`}
                                style={{ width: `${(student.credits / student.creditsTotal) * 100}%` }}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="py-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  <Badge className={`text-[10px] flex items-center gap-1 w-fit cursor-help ${config.className}`}>
                                    <DecisionIcon className="size-3" />
                                    {config.label}
                                  </Badge>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{config.tooltip}</p>
                              </TooltipContent>
                            </Tooltip>
                            {student.isModified && <span className="mt-1 block text-[10px] font-medium text-[#1a2744]">Corrigée par le jury</span>}
                          </TableCell>
                          <TableCell className="py-2">
                            <span className="text-xs text-gray-500">{student.modificationReason || student.observation || '-'}</span>
                            {student.modifiedAt && (
                              <span className="mt-1 block text-[10px] text-gray-500">
                                {student.modifiedBy || 'Compte non disponible'} · {new Date(student.modifiedAt).toLocaleString('fr-FR')}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-2 text-right">
                            {!isLocked && selectedSession ? (
                              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => openDecisionEditor(student)} disabled={isDeliberationLoading}>
                                Corriger
                              </Button>
                            ) : <span className="text-xs text-gray-500">{isLocked ? 'Finale' : '—'}</span>}
                          </TableCell>
                        </motion.tr>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.25 }}>
          <Card className="border-l-4 border-l-[#d4a853]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#1a2744]">Méthode et responsabilité du jury</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-gray-700">
              <p>Les moyennes et crédits affichés proviennent des notes verrouillées. Les décisions initiales sont des propositions calculées ; le jury peut les corriger avec un motif avant leur validation définitive.</p>
              {deliberationData?.rules && (
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Seuil de passage : {deliberationData.rules.passingGrade}/20</Badge>
                  <Badge variant="outline">Crédits annuels configurés : {deliberationData.rules.creditsPerYear}</Badge>
                  <Badge variant="outline">Compensation : {deliberationData.rules.compensationEnabled ? 'activée' : 'désactivée'}</Badge>
                </div>
              )}
              <p className="text-gray-500">Les règles particulières d’un programme doivent être examinées par le jury ; cet écran ne déduit pas à lui seul une compensation réglementaire entre UE.</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── Existing Session List ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                <FileText className="size-4" />
                Sessions de deliberation
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs">Titre</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Statut</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliberations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-xs text-gray-400">
                        Aucune deliberation lancee pour le moment
                      </TableCell>
                    </TableRow>
                  )}
                  {deliberations.map((session) => (
                    <TableRow
                      key={session.id}
                      className={`cursor-pointer transition-colors ${selectedSession === session.id ? 'bg-[#2d7a4f08]' : 'hover:bg-gray-50'}`}
                      onClick={() => { setSelectedSession(session.id); setJuryMembers([]) }}
                    >
                      <TableCell className="text-sm font-medium text-[#1a2744]">{session.titre}</TableCell>
                      <TableCell className="text-sm text-gray-500">{session.date}</TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${sessionStatusConfig[session.statut].className}`}>
                          {sessionStatusConfig[session.statut].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-[#2d7a4f]" onClick={(event) => { event.stopPropagation(); setSelectedSession(session.id); setJuryMembers([]); toast.success(`Session ${session.titre} sélectionnée`) }}>
                          <ChevronRight className="size-3.5 mr-1" />
                          Detail
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Dialog open={Boolean(editingStudent)} onOpenChange={(open) => { if (!open && !isSavingCorrection) setEditingStudent(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Corriger une décision du jury</DialogTitle>
            <DialogDescription>
              {editingStudent ? `${editingStudent.prenom} ${editingStudent.nom} · ${editingStudent.matricule}` : ''}
            </DialogDescription>
          </DialogHeader>
          {editingStudent && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-gray-50 p-3 text-sm text-[#1a2744]">
                <p>Proposition actuelle : <span className="font-semibold">{decisionConfig[editingStudent.decision].label}</span></p>
                <p className="mt-1 text-xs text-gray-600">Moyenne {editingStudent.moyenne.toFixed(2)}/20 · {editingStudent.credits}/{editingStudent.creditsTotal} crédits. Ces valeurs ne sont pas modifiées par la décision.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="jury-decision">Décision retenue</Label>
                <Select value={editedDecision} onValueChange={(value) => setEditedDecision(value as Decision)} disabled={isSavingCorrection}>
                  <SelectTrigger id="jury-decision"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(decisionConfig) as Decision[]).map((decision) => (
                      <SelectItem key={decision} value={decision}>{decisionConfig[decision].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="jury-reason">Motif de la correction</Label>
                <Textarea id="jury-reason" value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)}
                  maxLength={1000} rows={4} disabled={isSavingCorrection}
                  placeholder="Expliquez la décision prise par le jury (10 caractères minimum)." />
                <p className="text-xs text-gray-500">{correctionReason.trim().length}/1000 caractères · motif et auteur conservés dans le journal.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStudent(null)} disabled={isSavingCorrection}>Annuler</Button>
            <Button onClick={saveDecisionCorrection} disabled={isSavingCorrection || !editingStudent || editedDecision === editingStudent.decision || correctionReason.trim().length < 10}>
              {isSavingCorrection ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}Enregistrer la correction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <AnimatePresence>
        {qrCode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setQrCode(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 shadow-2xl max-w-xs w-full mx-4 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full bg-[#2d7a4f15] flex items-center justify-center mx-auto mb-3">
                <Download className="size-6 text-[#2d7a4f]" />
              </div>
              <h3 className="text-lg font-semibold text-[#1a2744] mb-1">PV exporté</h3>
              <p className="text-xs text-gray-400 mb-4">Scannez ce code pour vérifier l&apos;authenticité du PV</p>

              <div className="flex justify-center mb-4">
                <QrDisplay value={`${typeof window !== 'undefined' ? window.location.origin : ''}/verify?code=${qrCode}`} size={160} />
              </div>

              <p className="text-xs font-mono font-bold text-[#1a2744] mb-4">{qrCode}</p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(qrCode)
                    toast.success('Code copié !')
                  }}
                >
                  Copier le code
                </Button>
                <Button
                  size="sm"
                  className="flex-1 text-xs bg-gradient-to-r from-[#2d7a4f] to-[#3da66a]"
                  onClick={() => setQrCode(null)}
                >
                  Fermer
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </TooltipProvider>
  )
}
