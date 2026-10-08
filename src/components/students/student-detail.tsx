'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import { useStudentDetail, useStudentTranscript, usePayments, useDocuments, useHealth, useAcademicYears } from '@/lib/api-hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Download,
  FileText,
  CreditCard,
  Calendar,
  User,
  BookOpen,
  Clock,
  Printer,
  Award,
  IdCard,
  CheckCircle2,
  AlertCircle,
  Shield,
  Stethoscope,
  ClipboardList,
  UserCheck,
  Receipt,
  GraduationCap,
  Loader2,
  Megaphone,
} from 'lucide-react'

const statusConfig: Record<string, { label: string; className: string }> = {
  INSCRIT: { label: 'Inscrit', className: 'bg-[var(--institution-secondary-15)] text-[var(--institution-secondary)] border-0 hover:bg-[var(--institution-secondary-15)]' },
  PRE_INSCRIT: { label: 'Pré-inscrit', className: 'border border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-50' },
  SUSPENDU: { label: 'Suspendu', className: 'bg-[#ef6c0015] text-[#ef6c00] border-0 hover:bg-[#ef6c0015]' },
  EXCLU: { label: 'Exclu', className: 'bg-[#c6282815] text-[#c62828] border-0 hover:bg-[#c6282815]' },
  DIPLOME: { label: 'Diplôme', className: 'bg-[var(--institution-primary-15)] text-[var(--institution-primary)] border-0 hover:bg-[var(--institution-primary-15)]' },
}

const mentionConfig: Record<string, string> = {
  'Excellent': 'text-[var(--institution-primary)] font-semibold',
  'Tres Bien': 'text-[var(--institution-primary)] font-semibold',
  'Bien': 'text-[var(--institution-secondary)] font-semibold',
  'Assez Bien': 'text-[#5b8c5a] font-medium',
  'Passable': 'text-[var(--institution-accent)] font-medium',
  'Insuffisant': 'text-red-600 font-medium',
}

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Especes',
  MOBILE_MONEY: 'Mobile Money',
  BANK_TRANSFER: 'Virement',
  CARD: 'Carte',
}

const juryDecisionLabels: Record<string, string> = {
  ADMI: 'Admis',
  ADMI_DETTE: 'Admis avec dette',
  COMPENSE: 'Admis par compensation',
  AJOURNE: 'Ajourné',
  REDOUBLANT: 'Redoublant',
  EXCLU: 'Exclu',
}

const documentTypeLabels: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  RELEVE_NOTES: { label: 'Relevé de notes', icon: FileText, color: 'var(--institution-secondary)' },
  ATTESTATION_INSCRIPTION: { label: "Attestation d'inscription", icon: Award, color: 'var(--institution-primary)' },
  CERTIFICAT_SCOLARITE: { label: 'Certificat de scolarite', icon: FileText, color: 'var(--institution-accent)' },
  PV_DELIBERATION: { label: 'PV de deliberation', icon: ClipboardList, color: '#5b8c5a' },
}

// Passing grade threshold used app-wide as the fallback when TenantSettings
// isn't loaded on this page (see the same `?? 10` default in the API routes).
const PASSING_GRADE = 10

function computeMention(note: number): string {
  if (note < PASSING_GRADE) return 'Insuffisant'
  if (note >= 18) return 'Excellent'
  if (note >= 16) return 'Tres Bien'
  if (note >= 14) return 'Bien'
  if (note >= 12) return 'Assez Bien'
  return 'Passable'
}

function formatFCFA(amount: number) {
  return amount.toLocaleString('fr-FR') + ' FCFA'
}

function formatDateFr(iso: string | null | undefined) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR')
}

interface TranscriptGrade {
  id: string
  courseElement: { name: string; coefficient: number } | null
  ccGrade: number | null
  examGrade: number | null
  finalGrade: number | null
}

interface TranscriptTeachingUnit {
  teachingUnit: { id: string; name: string; credits: number } | null
  grades: TranscriptGrade[]
}

interface TranscriptSemester {
  semester: { id: string; name: string } | null
  teachingUnits: TranscriptTeachingUnit[]
}

interface StudentDashboardPreviewData {
  isStudentView: true
  isEnrolledForYear: boolean
  student: { status: string; program: string | null; level: string | null } | null
  stats: {
    moyenneGenerale: number | null
    passingGrade: number
    totalPaid: number
    pendingPaymentsCount: number
    lastPaymentStatus: string | null
  }
  currentAcademicYear: { name: string } | null
  recentActivity: { id: string; description: string; time: string }[]
  upcomingEvents: { id: string; title: string; date: string }[]
}

function StudentDashboardPreview({ studentId, onNavigate }: { studentId: string; onNavigate: (tab: string) => void }) {
  const academicYearId = useAppStore((state) => state.selectedAcademicYearId)
  const { data, isPending, isError, refetch } = useQuery<StudentDashboardPreviewData>({
    queryKey: ['studentDashboardPreview', studentId, academicYearId],
    queryFn: async () => {
      const params = new URLSearchParams({ studentId })
      if (academicYearId) params.set('academicYearId', academicYearId)
      const response = await fetch(`/api/dashboard?${params}`)
      if (!response.ok) throw new Error('Impossible de charger le tableau de bord étudiant')
      return response.json()
    },
  })

  if (isPending) return <div role="status" className="flex items-center gap-2 py-10 text-sm text-slate-700"><Loader2 className="size-5 animate-spin" />Chargement du tableau de bord…</div>
  if (isError || !data?.isStudentView || !data.student) return (
    <Card className="border-red-200 bg-red-50"><CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
      <p role="alert" className="text-sm font-medium text-red-900">Le tableau de bord de cet étudiant est indisponible.</p>
      <Button type="button" variant="outline" onClick={() => refetch()}>Réessayer</Button>
    </CardContent></Card>
  )

  const paymentStatus: Record<string, string> = {
    VALIDATED: 'Validé', PENDING: 'En attente de validation', CANCELLED: 'Annulé', REFUNDED: 'Remboursé',
  }
  return <div className="space-y-4 text-slate-900">
    {data.currentAcademicYear && !data.isEnrolledForYear && (
      <div role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-950">
        Inscription administrative non validée pour {data.currentAcademicYear.name} : aucune moyenne ni emploi du temps annuel ne doit être affiché à cet étudiant.
      </div>
    )}
    <Card className="border-emerald-200 bg-emerald-50"><CardContent className="p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-emerald-900">Aperçu du tableau de bord étudiant</p>
      <h2 className="mt-1 text-xl font-bold text-slate-950">{data.student.program ?? 'Programme non affecté'}{data.student.level ? ` · ${data.student.level}` : ''}</h2>
      <p className="mt-1 text-sm text-slate-800">{data.currentAcademicYear ? `Année académique ${data.currentAcademicYear.name}` : 'Aucune année académique active'} · {statusConfig[data.student.status]?.label ?? data.student.status}</p>
      <p className="mt-2 text-xs text-slate-700">Données du dossier consultables par l’administration. La moyenne affichée nécessite une inscription annuelle validée et des notes publiées de la session normale.</p>
    </CardContent></Card>
    <div className="grid gap-3 sm:grid-cols-3">
      <Card className="border-slate-200"><CardContent className="p-5"><p className="text-sm font-semibold text-slate-700">Moyenne des notes publiées</p><p className="mt-2 text-2xl font-bold text-slate-950">{data.stats.moyenneGenerale === null ? 'Aucune note' : `${data.stats.moyenneGenerale.toFixed(2)}/20`}</p><p className="mt-1 text-xs text-slate-700">Seuil : {data.stats.passingGrade}/20</p></CardContent></Card>
      <Card className="border-slate-200"><CardContent className="p-5"><p className="text-sm font-semibold text-slate-700">Dernier paiement</p><p className="mt-2 text-lg font-bold text-slate-950">{data.stats.lastPaymentStatus ? paymentStatus[data.stats.lastPaymentStatus] ?? data.stats.lastPaymentStatus : 'Aucun paiement enregistré'}</p><p className="mt-1 text-xs text-slate-700">{formatFCFA(data.stats.totalPaid)} validés · {data.stats.pendingPaymentsCount} en attente</p></CardContent></Card>
      <Card className="border-slate-200"><CardContent className="p-5"><p className="text-sm font-semibold text-slate-700">Statut administratif</p><p className="mt-2 text-lg font-bold text-slate-950">{statusConfig[data.student.status]?.label ?? data.student.status}</p><p className="mt-1 text-xs text-slate-700">{data.currentAcademicYear?.name ?? 'Année non définie'}</p></CardContent></Card>
    </div>
    <div className="grid gap-3 sm:grid-cols-3">
      <Button type="button" variant="outline" className="min-h-11 border-slate-300 text-slate-900" onClick={() => onNavigate('releve')}>Voir les notes</Button>
      <Button type="button" variant="outline" className="min-h-11 border-slate-300 text-slate-900" onClick={() => onNavigate('paiements')}>Voir les paiements</Button>
      <Button type="button" variant="outline" className="min-h-11 border-slate-300 text-slate-900" onClick={() => onNavigate('documents')}>Voir les documents</Button>
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-slate-200"><CardHeader><CardTitle className="flex items-center gap-2 text-base text-slate-950"><Megaphone className="size-4" />Annonces publiées</CardTitle></CardHeader><CardContent>{data.recentActivity.length ? <ul className="divide-y divide-slate-200">{data.recentActivity.map((item) => <li key={item.id} className="py-2 text-sm"><p className="font-medium text-slate-950">{item.description}</p><p className="text-slate-700">{formatDateFr(item.time)}</p></li>)}</ul> : <p className="text-sm text-slate-700">Aucune annonce publiée.</p>}</CardContent></Card>
      <Card className="border-slate-200"><CardHeader><CardTitle className="flex items-center gap-2 text-base text-slate-950"><Calendar className="size-4" />Examens à venir</CardTitle></CardHeader><CardContent>{data.upcomingEvents.length ? <ul className="divide-y divide-slate-200">{data.upcomingEvents.map((item) => <li key={item.id} className="py-2 text-sm"><p className="font-medium text-slate-950">{item.title}</p><p className="text-slate-700">{formatDateFr(item.date)}</p></li>)}</ul> : <p className="text-sm text-slate-700">Aucun examen planifié.</p>}</CardContent></Card>
    </div>
  </div>
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StudentDetail() {
  const { goBack, selectedStudentId, user } = useAppStore()
  const canPreviewDashboard = user?.role === 'ADMIN_INSTITUTION'
  const queryClient = useQueryClient()
  const selectedAcademicYearId = useAppStore((state) => state.selectedAcademicYearId)
  const [activeTab, setActiveTab] = useState(canPreviewDashboard ? 'dashboard' : 'informations')
  const [isGenerating, setIsGenerating] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState<string | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)

  const { data: detailData, isLoading: isLoadingDetail, isError: isDetailError, refetch: refetchDetail } = useStudentDetail(selectedStudentId || undefined)
  const { data: transcriptData } = useStudentTranscript(selectedStudentId || undefined, selectedAcademicYearId)
  const { data: paymentsData } = usePayments(selectedStudentId ? { studentId: selectedStudentId, limit: 200 } : undefined)
  const { data: documentsData } = useDocuments(selectedStudentId || undefined)
  const { data: yearsData } = useAcademicYears()
  const currentYear: { id: string; name: string } | undefined = yearsData?.data?.find((year: { isCurrent?: boolean }) => year.isCurrent)

  const s = detailData?.data

  const isHealthStudent = Boolean(
    s?.currentProgram?.name && /medecine|infirmier|pharmacie|sante/i.test(s.currentProgram.name)
  )
  const { data: healthData } = useHealth(isHealthStudent ? selectedStudentId || undefined : undefined)

  const generateDocument = async (type: string) => {
    if (!selectedStudentId || !s) return
    setIsGenerating(type)
    try {
      const res = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, tenantId: s.tenantId, studentId: selectedStudentId,
          ...(type === 'RELEVE_NOTES' && selectedAcademicYearId ? { academicYearId: selectedAcademicYearId } : {}) }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur de generation')
      }
      const verificationCode = res.headers.get('X-Verification-Code') || ''
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}_${Date.now()}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Document généré avec succès', {
        description: verificationCode ? `Code: ${verificationCode}` : undefined,
      })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    } catch (error) {
      toast.error('Erreur de generation', {
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
      })
    } finally {
      setIsGenerating(null)
    }
  }

  const downloadDocument = async (id: string, type: string) => {
    setIsDownloading(id)
    try {
      const res = await fetch(`/api/documents/download?id=${encodeURIComponent(id)}`)
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Téléchargement indisponible')
      }
      const number = res.headers.get('X-Doc-Number') || id
      const url = window.URL.createObjectURL(await res.blob())
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}_${number}.pdf`
      a.click()
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000)
      toast.success('Document téléchargé avec sa référence d’origine')
    } catch (error) {
      toast.error('Téléchargement impossible', { description: error instanceof Error ? error.message : 'Une erreur est survenue' })
    } finally {
      setIsDownloading(null)
    }
  }

  const registerForCurrentYear = async () => {
    if (!selectedStudentId || !currentYear) return
    if (!window.confirm(`Valider l’inscription administrative de cet étudiant pour ${currentYear.name} ? Vérifiez d’abord son programme et son niveau.`)) return
    setIsRegistering(true)
    try {
      const response = await fetch('/api/administrative-registrations', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: selectedStudentId, academicYearId: currentYear.id }) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Inscription impossible')
      toast.success(`Inscription ${currentYear.name} validée`)
      await Promise.all([refetchDetail(),
        queryClient.invalidateQueries({ queryKey: ['studentDashboardPreview', selectedStudentId] }),
        queryClient.invalidateQueries({ queryKey: ['studentTranscript', selectedStudentId] })])
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Inscription impossible') }
    finally { setIsRegistering(false) }
  }

  if (!selectedStudentId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <User className="size-10 text-gray-300" />
        <p className="text-sm text-gray-400">Aucun étudiant sélectionné.</p>
        <Button variant="outline" size="sm" onClick={goBack}>
          <ArrowLeft className="size-3.5 mr-1.5" />
          Retour a la liste
        </Button>
      </div>
    )
  }

  if (isLoadingDetail) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-[var(--institution-secondary)]" />
      </div>
    )
  }

  if (isDetailError || !s) return <div className="space-y-4 py-12 text-center">
    <p role="alert" className="text-sm font-medium text-red-900">Impossible de charger le dossier de cet étudiant.</p>
    <div className="flex justify-center gap-2"><Button variant="outline" onClick={goBack}>Retour à la liste</Button><Button onClick={() => refetchDetail()}>Réessayer</Button></div>
  </div>

  const initials = `${s.firstName[0] || ''}${s.lastName[0] || ''}`
  const summary = transcriptData?.data?.summary
  const totalCredits = summary?.totalCreditsAcquired ?? 0
  const moyenneGenerale = summary?.averageFinalGrade ?? 0
  const juryDecision = summary?.juryDecision?.decision as string | undefined
  const transcriptAvailable = Boolean(transcriptData?.data?.isEnrolledForYear)

  const gradeRows: Array<{ ue: string; ecue: string; credits: number; coeff: number; cc: number | null; exam: number | null; moyenne: number; mention: string }> = []
  for (const sem of (transcriptData?.data?.grades ?? []) as TranscriptSemester[]) {
    for (const tu of sem.teachingUnits) {
      for (const g of tu.grades) {
        if (g.finalGrade === null) continue
        gradeRows.push({
          ue: tu.teachingUnit?.name || '—',
          ecue: g.courseElement?.name || '—',
          credits: tu.teachingUnit?.credits || 0,
          coeff: g.courseElement?.coefficient || 1,
          cc: g.ccGrade,
          exam: g.examGrade,
          moyenne: g.finalGrade,
          mention: computeMention(g.finalGrade),
        })
      }
    }
  }
  const hasTranscriptPreview = transcriptAvailable && gradeRows.length > 0

  const payments = paymentsData?.data ?? []
  const totalPaye = payments.filter((p: { status: string }) => p.status === 'VALIDATED').reduce((sum: number, p: { amount: number }) => sum + p.amount, 0)
  const pendingPayments = payments.filter((p: { status: string }) => p.status === 'PENDING')
  const totalReste = pendingPayments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0)

  const documents = documentsData?.documents ?? []

  const carnet = healthData?.carnet
  const presences = carnet?.presences ?? []
  const presenceStats = {
    total: presences.length,
    present: presences.filter((p: { present: boolean }) => p.present).length,
    absent: presences.filter((p: { present: boolean }) => !p.present).length,
  }
  const competenceCategories = healthData?.competenceCategories ?? []

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        onClick={goBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[var(--institution-primary)] transition-colors"
      >
        <ArrowLeft className="size-4" />
        Retour a la liste
      </button>

      {/* Student Header with Gradient Banner */}
      <Card className="overflow-hidden">
        <div className="relative">
          {/* Gradient Banner */}
          <div className="h-28 sm:h-32 bg-gradient-to-r from-[var(--institution-primary)] to-[var(--institution-secondary)] relative">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0YzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptLTQgMmMtMS4xIDAtMi0uOS0yLTJzLjktMiAyLTIgMiAuOSAyIDItLjkgMi0yIDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
          </div>

          {/* Content overlay */}
          <div className="px-4 sm:px-6 pb-4 -mt-10 relative">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
              {/* Large Avatar */}
              <Avatar className="size-20 border-4 border-white shadow-lg">
                <AvatarFallback className="bg-[var(--institution-secondary)] text-white text-2xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>

              {/* Student Info */}
              <div className="flex-1 pt-2 sm:pt-12 sm:pb-1">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <h1 className="text-2xl font-bold text-[var(--institution-primary)]">{s.firstName} {s.lastName}</h1>
                  <Badge className={`text-xs ${statusConfig[s.status]?.className || 'bg-gray-100 text-gray-500 border-0'}`}>
                    {statusConfig[s.status]?.label || s.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                  <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded font-semibold text-[var(--institution-primary)]">{s.matricule || '—'}</span>
                  <span className="flex items-center gap-1"><BookOpen className="size-3.5 text-[var(--institution-secondary)]" /> {s.currentProgram?.name || 'Non affecte'}</span>
                  <span className="flex items-center gap-1"><GraduationCap className="size-3.5 text-[var(--institution-accent)]" /> {s.currentLevel?.name || '—'}</span>
                  <span className="flex items-center gap-1"><Award className="size-3.5 text-[var(--institution-secondary)]" /> {totalCredits} credits</span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Button size="sm" variant="outline" className="text-xs border-[var(--institution-primary-30)] hover:bg-[var(--institution-primary-08)] text-[var(--institution-primary)]" onClick={() => window.print()}>
                <Printer className="size-3.5 mr-1.5" />
                Imprimer fiche
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-[var(--institution-secondary-30)] hover:bg-[var(--institution-secondary-08)] text-[var(--institution-secondary)]"
                disabled={!transcriptAvailable || gradeRows.length === 0 || isGenerating === 'RELEVE_NOTES'}
                onClick={() => generateDocument('RELEVE_NOTES')}
              >
                {isGenerating === 'RELEVE_NOTES' ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <FileText className="size-3.5 mr-1.5" />}
                Generer releve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-[var(--institution-accent-30)] hover:bg-[var(--institution-accent-08)] text-[var(--institution-accent)]"
                disabled={isGenerating === 'ATTESTATION_INSCRIPTION'}
                onClick={() => generateDocument('ATTESTATION_INSCRIPTION')}
              >
                {isGenerating === 'ATTESTATION_INSCRIPTION' ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Award className="size-3.5 mr-1.5" />}
                Attestation
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-[#5b8c5a30] hover:bg-[#5b8c5a08] text-[#5b8c5a]"
                onClick={() => toast.info('Bientot disponible', { description: "La generation de carte etudiante n'est pas encore implementee." })}
              >
                <IdCard className="size-3.5 mr-1.5" />
                Carte étudiant
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-100 h-auto min-h-10 p-1 flex flex-wrap justify-start gap-1">
          {canPreviewDashboard && <TabsTrigger value="dashboard" className="text-sm data-[state=active]:bg-white data-[state=active]:text-[var(--institution-primary)]">Tableau de bord</TabsTrigger>}
          <TabsTrigger value="informations" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[var(--institution-primary)]">Informations</TabsTrigger>
          <TabsTrigger value="inscriptions" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[var(--institution-primary)]">Inscriptions</TabsTrigger>
          <TabsTrigger value="releve" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[var(--institution-primary)]">Relevé de notes</TabsTrigger>
          <TabsTrigger value="paiements" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[var(--institution-primary)]">Paiements</TabsTrigger>
          {isHealthStudent && (
            <TabsTrigger value="stages" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[var(--institution-primary)]">Stages</TabsTrigger>
          )}
          <TabsTrigger value="documents" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[var(--institution-primary)]">Documents</TabsTrigger>
        </TabsList>

        {canPreviewDashboard && <TabsContent value="dashboard" className="mt-4"><StudentDashboardPreview studentId={selectedStudentId} onNavigate={setActiveTab} /></TabsContent>}

        {/* Informations Tab */}
        <TabsContent value="informations" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[var(--institution-primary)] flex items-center gap-2">
                  <User className="size-4 text-[var(--institution-secondary)]" />
                  Informations personnelles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-gray-400 text-xs">Nom complet</span><p className="font-medium text-[var(--institution-primary)]">{s.firstName} {s.lastName}</p></div>
                  <div><span className="text-gray-400 text-xs">Date de naissance</span><p className="font-medium text-[var(--institution-primary)]">{formatDateFr(s.dateOfBirth) || '—'}</p></div>
                  <div><span className="text-gray-400 text-xs">Lieu de naissance</span><p className="font-medium text-[var(--institution-primary)]">{s.placeOfBirth || '—'}</p></div>
                  <div><span className="text-gray-400 text-xs">Sexe</span><p className="font-medium text-[var(--institution-primary)]">{s.gender || '—'}</p></div>
                  <div><span className="text-gray-400 text-xs">Nationalite</span><p className="font-medium text-[var(--institution-primary)]">{s.nationality || '—'}</p></div>
                  <div><span className="text-gray-400 text-xs">Téléphone</span><p className="font-medium text-[var(--institution-primary)]">{s.phone || '—'}</p></div>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">Adresse</span>
                  <p className="font-medium text-[var(--institution-primary)]">{s.address || '—'}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">Email</span>
                  <p className="font-medium text-[var(--institution-secondary)]">{s.email || '—'}</p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-[var(--institution-primary)] flex items-center gap-2">
                    <BookOpen className="size-4 text-[var(--institution-accent)]" />
                    Informations Baccalaureat
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-gray-400 text-xs">Serie</span><p className="font-medium text-[var(--institution-primary)]">{s.bacSeries || '—'}</p></div>
                    <div><span className="text-gray-400 text-xs">Année</span><p className="font-medium text-[var(--institution-primary)]">{s.bacYear || '—'}</p></div>
                    <div><span className="text-gray-400 text-xs">Numero</span><p className="font-medium text-[var(--institution-primary)]">{s.bacNumber || '—'}</p></div>
                    <div><span className="text-gray-400 text-xs">Etablissement</span><p className="font-medium text-[var(--institution-primary)]">{s.highSchool || '—'}</p></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-[var(--institution-primary)] flex items-center gap-2">
                    <User className="size-4 text-[var(--institution-primary)]" />
                    Tuteur / Gardien
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-gray-400 text-xs">Nom</span><p className="font-medium text-[var(--institution-primary)]">{s.guardianName || '—'}</p></div>
                    <div><span className="text-gray-400 text-xs">Téléphone</span><p className="font-medium text-[var(--institution-primary)]">{s.guardianPhone || '—'}</p></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Inscriptions Tab */}
        <TabsContent value="inscriptions" className="mt-4">
          {['ADMIN_INSTITUTION', 'SUPER_ADMIN', 'SCOLARITE'].includes(user?.role ?? '') && <Card className="mb-4 border-emerald-200 bg-emerald-50/50">
            <CardContent className="space-y-3 p-5 text-sm text-slate-800">
              <h3 className="font-semibold text-slate-950">Inscription administrative annuelle</h3>
              <p>La validation ouvre l’accès de l’étudiant à l’emploi du temps publié de son programme et de son niveau pour l’année courante. Elle ne modifie pas les années précédentes.</p>
              {!currentYear ? <p>Aucune année courante n’est configurée.</p> : (s.registrations ?? []).some((registration: { academicYearId: string; status: string }) => registration.academicYearId === currentYear.id && registration.status === 'INSCRIT') ?
                <p className="font-semibold text-emerald-900">Inscription {currentYear.name} déjà validée.</p> : <Button type="button" disabled={isRegistering || s.status !== 'INSCRIT' || !s.currentProgram || !s.currentLevel} onClick={registerForCurrentYear}>
                  {isRegistering ? 'Validation en cours…' : `Valider l’inscription ${currentYear.name}`}
                </Button>}
              {s.status !== 'INSCRIT' && <p>Le dossier doit d’abord avoir le statut « Inscrit ».</p>}
            </CardContent>
          </Card>}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[var(--institution-primary)]">Historique des inscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              {(s.registrations ?? []).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Aucune inscription enregistrée.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-xs">Année académique</TableHead>
                      <TableHead className="text-xs">Niveau</TableHead>
                      <TableHead className="text-xs">Filière</TableHead>
                      <TableHead className="text-xs">Statut</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {s.registrations.map((ins: { id: string; academicYear: string; level: string; program: string; status: string; registrationDate: string }) => (
                      <TableRow key={ins.id}>
                        <TableCell className="text-sm font-medium">{ins.academicYear}</TableCell>
                        <TableCell className="text-sm">{ins.level}</TableCell>
                        <TableCell className="text-sm">{ins.program}</TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] ${ins.status === 'INSCRIT' ? 'bg-[var(--institution-secondary-15)] text-[var(--institution-secondary)] border-0' : 'bg-[var(--institution-accent-15)] text-[var(--institution-accent)] border-0'}`}>
                            {ins.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">{formatDateFr(ins.registrationDate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Releve de Notes Tab - Academic Transcript Preview */}
        <TabsContent value="releve" className="mt-4">
          {!transcriptAvailable && (
            <div role="status" className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-950">
              Relevé indisponible : l’inscription administrative pour l’année sélectionnée n’est pas validée. Aucune ancienne note ne peut être présentée comme résultat de cette année.
            </div>
          )}
          {transcriptAvailable && gradeRows.length === 0 && (
            <div role="status" className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-medium text-slate-800">
              Aucune note publiée pour les UE inscrites de cette année. Aucun relevé ne peut encore être prévisualisé ou généré.
            </div>
          )}
          <Card className={hasTranscriptPreview ? 'overflow-hidden' : 'hidden'}>
            <CardContent className="p-0">
              {/* Transcript Preview */}
              <div className="bg-white border border-gray-200 shadow-inner">
                {/* Official Header */}
                <div className="text-center border-b-2 border-[var(--institution-primary)] py-4 px-6 bg-gray-50">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-gray-600 font-medium">Republique du Tchad</p>
                  <p className="text-[10px] tracking-[0.15em] uppercase text-gray-600 font-medium">Ministere de l&apos;Enseignement Superieur, de la Recherche Scientifique et de l&apos;Innovation</p>
                  <Separator className="my-2 bg-[var(--institution-primary-30)]" />
                  <p className="text-sm font-bold text-[var(--institution-primary)] tracking-wide">{s.tenant?.name?.toUpperCase() || 'ETABLISSEMENT'}</p>
                  <Separator className="my-2 bg-[var(--institution-primary-30)]" />
                  <p className="text-base font-bold text-[var(--institution-primary)] tracking-[0.15em] uppercase mt-1">Relevé de notes</p>
                </div>

                {/* Student Info Line */}
                <div className="px-6 py-3 border-b border-gray-200 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs">
                  <div><span className="text-gray-400">Nom :</span> <span className="font-semibold text-[var(--institution-primary)]">{s.lastName}</span></div>
                  <div><span className="text-gray-400">Prénom :</span> <span className="font-semibold text-[var(--institution-primary)]">{s.firstName}</span></div>
                  <div><span className="text-gray-400">Matricule :</span> <span className="font-mono font-semibold text-[var(--institution-primary)]">{s.matricule || '—'}</span></div>
                  <div><span className="text-gray-400">Date de naissance :</span> <span className="font-medium text-[var(--institution-primary)]">{formatDateFr(s.dateOfBirth) || '—'}</span></div>
                  <div><span className="text-gray-400">Filière :</span> <span className="font-medium text-[var(--institution-primary)]">{s.currentProgram?.name || '—'}</span></div>
                  <div><span className="text-gray-400">Niveau :</span> <span className="font-medium text-[var(--institution-primary)]">{s.currentLevel?.name || '—'}</span></div>
                </div>

                {/* Grades Table */}
                {gradeRows.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-700">Aucune note publiée pour les UE inscrites de cette année.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[var(--institution-primary)] hover:bg-[var(--institution-primary)]">
                          <TableHead className="text-xs text-white font-semibold">UE</TableHead>
                          <TableHead className="text-xs text-white font-semibold">ECUE</TableHead>
                          <TableHead className="text-xs text-white font-semibold text-center">Credits</TableHead>
                          <TableHead className="text-xs text-white font-semibold text-center">CC</TableHead>
                          <TableHead className="text-xs text-white font-semibold text-center">Examen</TableHead>
                          <TableHead className="text-xs text-white font-semibold text-center">Moyenne</TableHead>
                          <TableHead className="text-xs text-white font-semibold">Mention</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gradeRows.map((note, i) => (
                          <TableRow key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                            <TableCell className="text-xs font-semibold text-[var(--institution-primary)]">{note.ue}</TableCell>
                            <TableCell className="text-xs text-gray-600">{note.ecue}</TableCell>
                            <TableCell className="text-xs text-center">{note.credits}</TableCell>
                            <TableCell className="text-xs text-center">{note.cc ?? '—'}</TableCell>
                            <TableCell className="text-xs text-center">{note.exam ?? '—'}</TableCell>
                            <TableCell className={`text-xs text-center font-bold ${note.moyenne >= PASSING_GRADE ? 'text-[var(--institution-secondary)]' : 'text-red-600'}`}>
                              {note.moyenne.toFixed(2)}
                            </TableCell>
                            <TableCell className={`text-xs ${mentionConfig[note.mention] || 'text-gray-500'}`}>
                              {note.mention}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Transcript Footer */}
                <div className="border-t-2 border-[var(--institution-primary)] bg-gray-50 px-6 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400 text-xs block">Total credits valides</span>
                      <p className="text-lg font-bold text-[var(--institution-secondary)]">{totalCredits}</p>
                    </div>
                    <div>
                      <span className="text-slate-600 text-xs block">Moyenne des notes affichées</span>
                      <p className={`text-lg font-bold ${gradeRows.length === 0 ? 'text-slate-700' : moyenneGenerale >= PASSING_GRADE ? 'text-[var(--institution-secondary)]' : 'text-red-600'}`}>
                        {gradeRows.length === 0 ? 'Aucune note' : `${moyenneGenerale.toFixed(2)}/20`}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-600 text-xs block">Décision du jury</span>
                      <p className="text-lg font-bold text-[var(--institution-primary)]">
                        {juryDecision ? juryDecisionLabels[juryDecision] ?? juryDecision : 'En attente de délibération finale'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 p-4 bg-gray-50 border-t">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => window.print()}>
                  <Printer className="size-3.5 mr-1.5" />
                  Imprimer
                </Button>
                <Button
                  size="sm"
                  className="bg-[var(--institution-secondary)] hover:bg-[var(--institution-secondary-dark)] text-white text-xs"
                  disabled={!transcriptAvailable || gradeRows.length === 0 || isGenerating === 'RELEVE_NOTES'}
                  onClick={() => generateDocument('RELEVE_NOTES')}
                >
                  {isGenerating === 'RELEVE_NOTES' ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Download className="size-3.5 mr-1.5" />}
                  Telecharger PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Paiements Tab */}
        <TabsContent value="paiements" className="mt-4">
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-l-4 border-l-[var(--institution-secondary)]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--institution-secondary-15)] flex items-center justify-center">
                      <CheckCircle2 className="size-5 text-[var(--institution-secondary)]" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Total paye</p>
                      <p className="text-lg font-bold text-[var(--institution-secondary)]">{formatFCFA(totalPaye)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-[#c62828]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#c6282815] flex items-center justify-center">
                      <AlertCircle className="size-5 text-[#c62828]" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-700">Montant en attente de validation</p>
                      <p className="text-lg font-bold text-[#c62828]">{formatFCFA(totalReste)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-[var(--institution-accent)]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--institution-accent-15)] flex items-center justify-center">
                      <Clock className="size-5 text-[var(--institution-accent)]" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Paiements en attente</p>
                      <p className="text-lg font-bold text-[var(--institution-accent)]">{pendingPayments.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Timeline */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[var(--institution-primary)] flex items-center gap-2">
                  <Receipt className="size-4 text-[var(--institution-secondary)]" />
                  Historique des paiements
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {payments.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Aucun paiement enregistré.</p>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    {payments.map((p: { id: string; status: string; comment: string | null; createdAt: string; paymentMethod: string; receiptNumber: string | null; transactionRef: string | null; amount: number }, i: number) => (
                      <div
                        key={p.id}
                        className={`flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors ${i < payments.length - 1 ? 'border-b border-gray-100' : ''}`}
                      >
                        {/* Timeline indicator */}
                        <div className="relative flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full border-2 ${p.status === 'VALIDATED' ? 'bg-[var(--institution-secondary)] border-[var(--institution-secondary)]' : 'bg-white border-[var(--institution-accent)]'}`} />
                          {i < payments.length - 1 && (
                            <div className={`w-0.5 h-8 ${p.status === 'VALIDATED' ? 'bg-[var(--institution-secondary-30)]' : 'bg-[var(--institution-accent-30)]'}`} />
                          )}
                        </div>

                        {/* Payment details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-[var(--institution-primary)] truncate">{p.comment || 'Frais de scolarite'}</p>
                            <Badge className={`text-[10px] shrink-0 ${p.status === 'VALIDATED' ? 'bg-[var(--institution-secondary-15)] text-[var(--institution-secondary)] border-0' : 'bg-[var(--institution-accent-15)] text-[var(--institution-accent)] border-0'}`}>
                              {p.status === 'VALIDATED' ? 'Paye' : p.status === 'PENDING' ? 'En attente' : p.status}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-400">
                            <span className="flex items-center gap-1"><Calendar className="size-3" /> {formatDateFr(p.createdAt)}</span>
                            <span className="flex items-center gap-1"><CreditCard className="size-3" /> {paymentMethodLabels[p.paymentMethod] || p.paymentMethod}</span>
                            {(p.receiptNumber || p.transactionRef) && <span className="font-mono">Ref: {p.receiptNumber || p.transactionRef}</span>}
                          </div>
                        </div>

                        {/* Amount and action */}
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-[var(--institution-primary)]">{formatFCFA(p.amount)}</p>
                          {p.status === 'VALIDATED' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] text-[var(--institution-secondary)] p-0 mt-1"
                              onClick={() => {
                                window.open(`/api/payments?receipt=true&id=${p.id}`, '_blank')
                              }}
                            >
                              <Download className="size-3 mr-1" />
                              Recu
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Stages Tab (conditionally shown for health students) */}
        {isHealthStudent && (
          <TabsContent value="stages" className="mt-4">
            <div className="space-y-4">
              {!carnet ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-gray-400">
                    Aucun stage clinique enregistré pour cet étudiant.
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Current Internship Info */}
                  <Card className="border-l-4 border-l-[var(--institution-secondary)]">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-[var(--institution-primary)] flex items-center gap-2">
                        <Stethoscope className="size-4 text-[var(--institution-secondary)]" />
                        Stage
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2 text-sm">
                          <div><span className="text-gray-400 text-xs">Hôpital</span><p className="font-medium text-[var(--institution-primary)]">{carnet.hopital}</p></div>
                          <div><span className="text-gray-400 text-xs">Service</span><p className="font-medium text-[var(--institution-primary)]">{carnet.service}</p></div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div><span className="text-gray-400 text-xs">Periode</span><p className="font-medium text-[var(--institution-primary)]">{carnet.debut} - {carnet.fin}</p></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Skills Progress */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-[var(--institution-primary)] flex items-center gap-2">
                        <ClipboardList className="size-4 text-[var(--institution-accent)]" />
                        Competences
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {competenceCategories.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">Aucune competence suivie.</p>
                      ) : (
                        competenceCategories.map((cat: { id: string; nom: string; competences: { id: string; nom: string; statut: string }[] }) => (
                          <div key={cat.id}>
                            <p className="text-xs font-semibold text-[var(--institution-primary)] mb-2">{cat.nom}</p>
                            <div className="flex flex-wrap gap-2">
                              {cat.competences.map((comp) => (
                                <Badge
                                  key={comp.id}
                                  className={`text-[10px] border-0 ${comp.statut === 'validee' ? 'bg-[var(--institution-secondary-15)] text-[var(--institution-secondary)]' : comp.statut === 'en_cours' ? 'bg-[var(--institution-accent-15)] text-[var(--institution-accent)]' : 'bg-gray-100 text-gray-500'}`}
                                >
                                  {comp.nom}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  {/* Attendance Summary */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-[var(--institution-primary)] flex items-center gap-2">
                        <UserCheck className="size-4 text-[var(--institution-primary)]" />
                        Recapitulatif des presences
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 rounded-lg bg-gray-50">
                          <p className="text-2xl font-bold text-[var(--institution-primary)]">{presenceStats.total}</p>
                          <p className="text-xs text-gray-400">Total jours</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-[var(--institution-secondary-08)]">
                          <p className="text-2xl font-bold text-[var(--institution-secondary)]">{presenceStats.present}</p>
                          <p className="text-xs text-gray-400">Presents</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-[#c6282808]">
                          <p className="text-2xl font-bold text-[#c62828]">{presenceStats.absent}</p>
                          <p className="text-xs text-gray-400">Absents</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </TabsContent>
        )}

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-[var(--institution-primary)]">Documents générés</h3>
              <div className="flex gap-2">
                {(['RELEVE_NOTES', 'ATTESTATION_INSCRIPTION', 'CERTIFICAT_SCOLARITE'] as const).map((type) => (
                  <Button
                    key={type}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    disabled={(type === 'RELEVE_NOTES' && (!transcriptAvailable || gradeRows.length === 0)) || isGenerating === type}
                    onClick={() => generateDocument(type)}
                  >
                    {isGenerating === type ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <FileText className="size-3.5 mr-1.5" />}
                    {documentTypeLabels[type].label}
                  </Button>
                ))}
              </div>
            </div>

            {documents.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Aucun document généré pour cet étudiant.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc: { id: string; type: string; statut: string; date: string; codeVerification: string }) => {
                  const meta = documentTypeLabels[doc.type] || { label: doc.type, icon: FileText, color: 'var(--institution-primary)' }
                  const Icon = meta.icon
                  return (
                    <Card key={doc.id} className="hover:shadow-md transition-shadow group">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${meta.color}15` }}>
                            <Icon className="size-5" style={{ color: meta.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[var(--institution-primary)] truncate">{meta.label}</p>
                            <Badge className={`text-[10px] mt-1 ${doc.statut === 'signe' ? 'bg-[var(--institution-secondary-15)] text-[var(--institution-secondary)] border-0' : 'bg-[var(--institution-accent-15)] text-[var(--institution-accent)] border-0'}`}>
                              {doc.statut === 'signe' ? 'Valide' : doc.statut === 'genere' ? 'Généré' : 'En attente'}
                            </Badge>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <Calendar className="size-3" />
                            {formatDateFr(doc.date)}
                          </div>
                          {doc.codeVerification && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                              <Shield className="size-3" />
                              <span className="font-mono text-[10px]">{doc.codeVerification}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] flex-1"
                            disabled={isDownloading === doc.id}
                            onClick={() => downloadDocument(doc.id, doc.type)}
                          >
                            {isDownloading === doc.id ? <Loader2 className="size-3 mr-1 animate-spin" /> : <Download className="size-3 mr-1" />}
                            Télécharger PDF
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
