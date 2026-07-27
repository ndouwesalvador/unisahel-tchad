'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import { useStudentDetail, useStudentTranscript, usePayments, useDocuments, useHealth } from '@/lib/api-hooks'
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
} from 'lucide-react'

const statusConfig: Record<string, { label: string; className: string }> = {
  INSCRIT: { label: 'Inscrit', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0 hover:bg-[#2d7a4f15]' },
  PRE_INSCRIT: { label: 'Pre-inscrit', className: 'bg-[#d4a85315] text-[#d4a853] border-0 hover:bg-[#d4a85315]' },
  SUSPENDU: { label: 'Suspendu', className: 'bg-[#ef6c0015] text-[#ef6c00] border-0 hover:bg-[#ef6c0015]' },
  EXCLU: { label: 'Exclu', className: 'bg-[#c6282815] text-[#c62828] border-0 hover:bg-[#c6282815]' },
  DIPLOME: { label: 'Diplome', className: 'bg-[#1a274415] text-[#1a2744] border-0 hover:bg-[#1a274415]' },
}

const mentionConfig: Record<string, string> = {
  'Excellent': 'text-[#1a2744] font-semibold',
  'Tres Bien': 'text-[#1a2744] font-semibold',
  'Bien': 'text-[#2d7a4f] font-semibold',
  'Assez Bien': 'text-[#5b8c5a] font-medium',
  'Passable': 'text-[#d4a853] font-medium',
  'Insuffisant': 'text-red-600 font-medium',
}

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Especes',
  MOBILE_MONEY: 'Mobile Money',
  BANK_TRANSFER: 'Virement',
  CARD: 'Carte',
}

const documentTypeLabels: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  RELEVE_NOTES: { label: 'Releve de notes', icon: FileText, color: '#2d7a4f' },
  ATTESTATION_INSCRIPTION: { label: "Attestation d'inscription", icon: Award, color: '#1a2744' },
  CERTIFICAT_SCOLARITE: { label: 'Certificat de scolarite', icon: FileText, color: '#d4a853' },
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

// ─── Component ────────────────────────────────────────────────────────────────

export function StudentDetail() {
  const { goBack, selectedStudentId } = useAppStore()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('informations')
  const [isGenerating, setIsGenerating] = useState<string | null>(null)

  const { data: detailData, isLoading: isLoadingDetail } = useStudentDetail(selectedStudentId || undefined)
  const { data: transcriptData } = useStudentTranscript(selectedStudentId || undefined)
  const { data: paymentsData } = usePayments(selectedStudentId ? { studentId: selectedStudentId, limit: 200 } : undefined)
  const { data: documentsData } = useDocuments(selectedStudentId || undefined)

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
        body: JSON.stringify({ type, tenantId: s.tenantId, studentId: selectedStudentId }),
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
      toast.success('Document genere avec succes', {
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

  if (!selectedStudentId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <User className="size-10 text-gray-300" />
        <p className="text-sm text-gray-400">Aucun etudiant selectionne.</p>
        <Button variant="outline" size="sm" onClick={goBack}>
          <ArrowLeft className="size-3.5 mr-1.5" />
          Retour a la liste
        </Button>
      </div>
    )
  }

  if (isLoadingDetail || !s) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-[#2d7a4f]" />
      </div>
    )
  }

  const initials = `${s.firstName[0] || ''}${s.lastName[0] || ''}`
  const summary = transcriptData?.data?.summary
  const totalCredits = summary?.totalCreditsAcquired ?? 0
  const moyenneGenerale = summary?.averageFinalGrade ?? 0

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
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1a2744] transition-colors"
      >
        <ArrowLeft className="size-4" />
        Retour a la liste
      </button>

      {/* Student Header with Gradient Banner */}
      <Card className="overflow-hidden">
        <div className="relative">
          {/* Gradient Banner */}
          <div className="h-28 sm:h-32 bg-gradient-to-r from-[#1a2744] to-[#2d7a4f] relative">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0YzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptLTQgMmMtMS4xIDAtMi0uOS0yLTJzLjktMiAyLTIgMiAuOSAyIDItLjkgMi0yIDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
          </div>

          {/* Content overlay */}
          <div className="px-4 sm:px-6 pb-4 -mt-10 relative">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
              {/* Large Avatar */}
              <Avatar className="size-20 border-4 border-white shadow-lg">
                <AvatarFallback className="bg-[#2d7a4f] text-white text-2xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>

              {/* Student Info */}
              <div className="flex-1 pt-2 sm:pb-1">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <h1 className="text-2xl font-bold text-[#1a2744]">{s.firstName} {s.lastName}</h1>
                  <Badge className={`text-xs ${statusConfig[s.status]?.className || 'bg-gray-100 text-gray-500 border-0'}`}>
                    {statusConfig[s.status]?.label || s.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                  <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded font-semibold text-[#1a2744]">{s.matricule || '—'}</span>
                  <span className="flex items-center gap-1"><BookOpen className="size-3.5 text-[#2d7a4f]" /> {s.currentProgram?.name || 'Non affecte'}</span>
                  <span className="flex items-center gap-1"><GraduationCap className="size-3.5 text-[#d4a853]" /> {s.currentLevel?.name || '—'}</span>
                  <span className="flex items-center gap-1"><Award className="size-3.5 text-[#2d7a4f]" /> {totalCredits} credits</span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Button size="sm" variant="outline" className="text-xs border-[#1a274430] hover:bg-[#1a274408] text-[#1a2744]" onClick={() => window.print()}>
                <Printer className="size-3.5 mr-1.5" />
                Imprimer fiche
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-[#2d7a4f30] hover:bg-[#2d7a4f08] text-[#2d7a4f]"
                disabled={isGenerating === 'RELEVE_NOTES'}
                onClick={() => generateDocument('RELEVE_NOTES')}
              >
                {isGenerating === 'RELEVE_NOTES' ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <FileText className="size-3.5 mr-1.5" />}
                Generer releve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-[#d4a85330] hover:bg-[#d4a85308] text-[#d4a853]"
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
                Carte etudiant
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-100 h-10 p-1 flex flex-wrap">
          <TabsTrigger value="informations" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#1a2744]">Informations</TabsTrigger>
          <TabsTrigger value="inscriptions" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#1a2744]">Inscriptions</TabsTrigger>
          <TabsTrigger value="releve" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#1a2744]">Releve de notes</TabsTrigger>
          <TabsTrigger value="paiements" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#1a2744]">Paiements</TabsTrigger>
          {isHealthStudent && (
            <TabsTrigger value="stages" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#1a2744]">Stages</TabsTrigger>
          )}
          <TabsTrigger value="documents" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#1a2744]">Documents</TabsTrigger>
        </TabsList>

        {/* Informations Tab */}
        <TabsContent value="informations" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <User className="size-4 text-[#2d7a4f]" />
                  Informations personnelles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-gray-400 text-xs">Nom complet</span><p className="font-medium text-[#1a2744]">{s.firstName} {s.lastName}</p></div>
                  <div><span className="text-gray-400 text-xs">Date de naissance</span><p className="font-medium text-[#1a2744]">{formatDateFr(s.dateOfBirth) || '—'}</p></div>
                  <div><span className="text-gray-400 text-xs">Lieu de naissance</span><p className="font-medium text-[#1a2744]">{s.placeOfBirth || '—'}</p></div>
                  <div><span className="text-gray-400 text-xs">Sexe</span><p className="font-medium text-[#1a2744]">{s.gender || '—'}</p></div>
                  <div><span className="text-gray-400 text-xs">Nationalite</span><p className="font-medium text-[#1a2744]">{s.nationality || '—'}</p></div>
                  <div><span className="text-gray-400 text-xs">Telephone</span><p className="font-medium text-[#1a2744]">{s.phone || '—'}</p></div>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">Adresse</span>
                  <p className="font-medium text-[#1a2744]">{s.address || '—'}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">Email</span>
                  <p className="font-medium text-[#2d7a4f]">{s.email || '—'}</p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                    <BookOpen className="size-4 text-[#d4a853]" />
                    Informations Baccalaureat
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-gray-400 text-xs">Serie</span><p className="font-medium text-[#1a2744]">{s.bacSeries || '—'}</p></div>
                    <div><span className="text-gray-400 text-xs">Annee</span><p className="font-medium text-[#1a2744]">{s.bacYear || '—'}</p></div>
                    <div><span className="text-gray-400 text-xs">Numero</span><p className="font-medium text-[#1a2744]">{s.bacNumber || '—'}</p></div>
                    <div><span className="text-gray-400 text-xs">Etablissement</span><p className="font-medium text-[#1a2744]">{s.highSchool || '—'}</p></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                    <User className="size-4 text-[#1a2744]" />
                    Tuteur / Gardien
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-gray-400 text-xs">Nom</span><p className="font-medium text-[#1a2744]">{s.guardianName || '—'}</p></div>
                    <div><span className="text-gray-400 text-xs">Telephone</span><p className="font-medium text-[#1a2744]">{s.guardianPhone || '—'}</p></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Inscriptions Tab */}
        <TabsContent value="inscriptions" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#1a2744]">Historique des inscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              {(s.registrations ?? []).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Aucune inscription enregistree.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-xs">Annee academique</TableHead>
                      <TableHead className="text-xs">Niveau</TableHead>
                      <TableHead className="text-xs">Filiere</TableHead>
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
                          <Badge className={`text-[10px] ${ins.status === 'VALIDE' ? 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' : 'bg-[#d4a85315] text-[#d4a853] border-0'}`}>
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
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {/* Transcript Preview */}
              <div className="bg-white border border-gray-200 shadow-inner">
                {/* Official Header */}
                <div className="text-center border-b-2 border-[#1a2744] py-4 px-6 bg-gray-50">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-gray-600 font-medium">Republique du Tchad</p>
                  <p className="text-[10px] tracking-[0.15em] uppercase text-gray-600 font-medium">Ministere de l&apos;Enseignement Superieur, de la Recherche Scientifique et de l&apos;Innovation</p>
                  <Separator className="my-2 bg-[#1a274430]" />
                  <p className="text-sm font-bold text-[#1a2744] tracking-wide">{s.tenant?.name?.toUpperCase() || 'ETABLISSEMENT'}</p>
                  <Separator className="my-2 bg-[#1a274430]" />
                  <p className="text-base font-bold text-[#1a2744] tracking-[0.15em] uppercase mt-1">Releve de Notes</p>
                </div>

                {/* Student Info Line */}
                <div className="px-6 py-3 border-b border-gray-200 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs">
                  <div><span className="text-gray-400">Nom :</span> <span className="font-semibold text-[#1a2744]">{s.lastName}</span></div>
                  <div><span className="text-gray-400">Prenom :</span> <span className="font-semibold text-[#1a2744]">{s.firstName}</span></div>
                  <div><span className="text-gray-400">Matricule :</span> <span className="font-mono font-semibold text-[#1a2744]">{s.matricule || '—'}</span></div>
                  <div><span className="text-gray-400">Date de naissance :</span> <span className="font-medium text-[#1a2744]">{formatDateFr(s.dateOfBirth) || '—'}</span></div>
                  <div><span className="text-gray-400">Filiere :</span> <span className="font-medium text-[#1a2744]">{s.currentProgram?.name || '—'}</span></div>
                  <div><span className="text-gray-400">Niveau :</span> <span className="font-medium text-[#1a2744]">{s.currentLevel?.name || '—'}</span></div>
                </div>

                {/* Grades Table */}
                {gradeRows.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Aucune note saisie pour le moment.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#1a2744] hover:bg-[#1a2744]">
                          <TableHead className="text-xs text-white font-semibold">UE</TableHead>
                          <TableHead className="text-xs text-white font-semibold">ECUE</TableHead>
                          <TableHead className="text-xs text-white font-semibold text-center">Credits</TableHead>
                          <TableHead className="text-xs text-white font-semibold text-center">Coeff</TableHead>
                          <TableHead className="text-xs text-white font-semibold text-center">CC</TableHead>
                          <TableHead className="text-xs text-white font-semibold text-center">Examen</TableHead>
                          <TableHead className="text-xs text-white font-semibold text-center">Moyenne</TableHead>
                          <TableHead className="text-xs text-white font-semibold">Mention</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gradeRows.map((note, i) => (
                          <TableRow key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                            <TableCell className="text-xs font-semibold text-[#1a2744]">{note.ue}</TableCell>
                            <TableCell className="text-xs text-gray-600">{note.ecue}</TableCell>
                            <TableCell className="text-xs text-center">{note.credits}</TableCell>
                            <TableCell className="text-xs text-center">{note.coeff}</TableCell>
                            <TableCell className="text-xs text-center">{note.cc ?? '—'}</TableCell>
                            <TableCell className="text-xs text-center">{note.exam ?? '—'}</TableCell>
                            <TableCell className={`text-xs text-center font-bold ${note.moyenne >= PASSING_GRADE ? 'text-[#2d7a4f]' : 'text-red-600'}`}>
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
                <div className="border-t-2 border-[#1a2744] bg-gray-50 px-6 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400 text-xs block">Total credits valides</span>
                      <p className="text-lg font-bold text-[#2d7a4f]">{totalCredits}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs block">Moyenne generale</span>
                      <p className={`text-lg font-bold ${moyenneGenerale >= PASSING_GRADE ? 'text-[#2d7a4f]' : 'text-red-600'}`}>
                        {moyenneGenerale.toFixed(2)}/20
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs block">Decision indicative</span>
                      <p className="text-lg font-bold text-[#1a2744]">
                        {moyenneGenerale >= PASSING_GRADE ? 'Admis' : 'Ajourné'}
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
                  className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs"
                  disabled={isGenerating === 'RELEVE_NOTES'}
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
              <Card className="border-l-4 border-l-[#2d7a4f]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#2d7a4f15] flex items-center justify-center">
                      <CheckCircle2 className="size-5 text-[#2d7a4f]" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Total paye</p>
                      <p className="text-lg font-bold text-[#2d7a4f]">{formatFCFA(totalPaye)}</p>
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
                      <p className="text-xs text-gray-400">Reste a payer</p>
                      <p className="text-lg font-bold text-[#c62828]">{formatFCFA(totalReste)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-[#d4a853]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#d4a85315] flex items-center justify-center">
                      <Clock className="size-5 text-[#d4a853]" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Paiements en attente</p>
                      <p className="text-lg font-bold text-[#d4a853]">{pendingPayments.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Timeline */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <Receipt className="size-4 text-[#2d7a4f]" />
                  Historique des paiements
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {payments.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Aucun paiement enregistre.</p>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    {payments.map((p: { id: string; status: string; comment: string | null; createdAt: string; paymentMethod: string; receiptNumber: string | null; transactionRef: string | null; amount: number }, i: number) => (
                      <div
                        key={p.id}
                        className={`flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors ${i < payments.length - 1 ? 'border-b border-gray-100' : ''}`}
                      >
                        {/* Timeline indicator */}
                        <div className="relative flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full border-2 ${p.status === 'VALIDATED' ? 'bg-[#2d7a4f] border-[#2d7a4f]' : 'bg-white border-[#d4a853]'}`} />
                          {i < payments.length - 1 && (
                            <div className={`w-0.5 h-8 ${p.status === 'VALIDATED' ? 'bg-[#2d7a4f30]' : 'bg-[#d4a85330]'}`} />
                          )}
                        </div>

                        {/* Payment details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-[#1a2744] truncate">{p.comment || 'Frais de scolarite'}</p>
                            <Badge className={`text-[10px] shrink-0 ${p.status === 'VALIDATED' ? 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' : 'bg-[#d4a85315] text-[#d4a853] border-0'}`}>
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
                          <p className="text-sm font-bold text-[#1a2744]">{formatFCFA(p.amount)}</p>
                          {p.status === 'VALIDATED' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] text-[#2d7a4f] p-0 mt-1"
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
                    Aucun stage clinique enregistre pour cet etudiant.
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Current Internship Info */}
                  <Card className="border-l-4 border-l-[#2d7a4f]">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                        <Stethoscope className="size-4 text-[#2d7a4f]" />
                        Stage
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2 text-sm">
                          <div><span className="text-gray-400 text-xs">Hopital</span><p className="font-medium text-[#1a2744]">{carnet.hopital}</p></div>
                          <div><span className="text-gray-400 text-xs">Service</span><p className="font-medium text-[#1a2744]">{carnet.service}</p></div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div><span className="text-gray-400 text-xs">Periode</span><p className="font-medium text-[#1a2744]">{carnet.debut} - {carnet.fin}</p></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Skills Progress */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                        <ClipboardList className="size-4 text-[#d4a853]" />
                        Competences
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {competenceCategories.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">Aucune competence suivie.</p>
                      ) : (
                        competenceCategories.map((cat: { id: string; nom: string; competences: { id: string; nom: string; statut: string }[] }) => (
                          <div key={cat.id}>
                            <p className="text-xs font-semibold text-[#1a2744] mb-2">{cat.nom}</p>
                            <div className="flex flex-wrap gap-2">
                              {cat.competences.map((comp) => (
                                <Badge
                                  key={comp.id}
                                  className={`text-[10px] border-0 ${comp.statut === 'validee' ? 'bg-[#2d7a4f15] text-[#2d7a4f]' : comp.statut === 'en_cours' ? 'bg-[#d4a85315] text-[#d4a853]' : 'bg-gray-100 text-gray-500'}`}
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
                      <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                        <UserCheck className="size-4 text-[#1a2744]" />
                        Recapitulatif des presences
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 rounded-lg bg-gray-50">
                          <p className="text-2xl font-bold text-[#1a2744]">{presenceStats.total}</p>
                          <p className="text-xs text-gray-400">Total jours</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-[#2d7a4f08]">
                          <p className="text-2xl font-bold text-[#2d7a4f]">{presenceStats.present}</p>
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
              <h3 className="text-sm font-semibold text-[#1a2744]">Documents generes</h3>
              <div className="flex gap-2">
                {(['RELEVE_NOTES', 'ATTESTATION_INSCRIPTION', 'CERTIFICAT_SCOLARITE'] as const).map((type) => (
                  <Button
                    key={type}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    disabled={isGenerating === type}
                    onClick={() => generateDocument(type)}
                  >
                    {isGenerating === type ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <FileText className="size-3.5 mr-1.5" />}
                    {documentTypeLabels[type].label}
                  </Button>
                ))}
              </div>
            </div>

            {documents.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Aucun document genere pour cet etudiant.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc: { id: string; type: string; statut: string; date: string; codeVerification: string }) => {
                  const meta = documentTypeLabels[doc.type] || { label: doc.type, icon: FileText, color: '#1a2744' }
                  const Icon = meta.icon
                  return (
                    <Card key={doc.id} className="hover:shadow-md transition-shadow group">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${meta.color}15` }}>
                            <Icon className="size-5" style={{ color: meta.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#1a2744] truncate">{meta.label}</p>
                            <Badge className={`text-[10px] mt-1 ${doc.statut === 'signe' ? 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' : 'bg-[#d4a85315] text-[#d4a853] border-0'}`}>
                              {doc.statut === 'signe' ? 'Valide' : doc.statut === 'genere' ? 'Genere' : 'En attente'}
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
                            disabled={isGenerating === doc.type}
                            onClick={() => generateDocument(doc.type)}
                          >
                            {isGenerating === doc.type ? <Loader2 className="size-3 mr-1 animate-spin" /> : <Download className="size-3 mr-1" />}
                            Regenerer / PDF
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
