'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useDashboardStats } from '@/lib/api-hooks'
import { useAppStore } from '@/lib/store'
import { GradeEntryPage } from './grade-entry-page'

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
  const academicYearId = dashboard?.academicYear?.id ?? dashboard?.currentAcademicYear?.id
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
  const { data: result, isLoading: juryLoading, isError: resultError } = useQuery<{
    jury: { average: number; creditsAcquired: number; decision: string; date: string } | null
  }>({
    queryKey: ['my-jury-decision', academicYearId],
    enabled: Boolean(academicYearId),
    queryFn: async () => {
      const response = await fetch(`/api/results?academicYearId=${encodeURIComponent(academicYearId!)}`)
      if (!response.ok) throw new Error('Impossible de consulter la décision du jury')
      return response.json()
    },
  })
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
    {juryLoading ? <div role="status" className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">Vérification du résultat final…</div>
      : resultError ? <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">La décision du jury ne peut pas être consultée pour le moment.</div>
      : result?.jury ? <Card className="border-emerald-200 bg-emerald-50"><CardContent className="p-5 text-slate-900">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Résultat final publié par le jury</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <p className="text-xl font-bold text-slate-950">{({ ADMI: 'Admis', ADMI_DETTE: 'Admis avec dette', COMPENSE: 'Admis par compensation', AJOURNE: 'Ajourné', REDOUBLANT: 'Redoublant', EXCLU: 'Exclu' } as Record<string, string>)[result.jury.decision] || result.jury.decision}</p>
            <p className="text-base font-semibold text-slate-950">{result.jury.average.toFixed(2)} / 20 · {result.jury.creditsAcquired} crédits acquis</p>
          </div>
          <p className="mt-2 text-xs text-slate-700">Décision arrêtée le {new Date(result.jury.date).toLocaleDateString('fr-FR')} et publiée par PV validé.</p>
        </CardContent></Card>
      : <div role="status" className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">Décision finale du jury en attente de publication du PV.</div>}
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
  if (role === 'ENSEIGNANT' || role === 'JURY') return <GradeEntryPage />
  if (['RECTORAT', 'SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE', 'RESPONSABLE_FILIERE'].includes(role || '')) return <OversightGradesPage />
  if (role === 'FACULTE' || role === 'DEPARTEMENT') return <Card className="border-slate-200 bg-white"><CardContent className="p-6 text-slate-800"><h1 className="text-2xl font-bold text-slate-950">Notes</h1><p className="mt-2 text-sm">L’accès aux notes de cette faculté ou de ce département nécessite une affectation de périmètre. Demandez à l’administration de configurer cet accès.</p></CardContent></Card>
  if (role === 'PARENT' || role === 'MAITRE_STAGE') return <Card className="border-slate-200 bg-white"><CardContent className="p-6 text-slate-800"><h1 className="text-2xl font-bold text-slate-950">Notes</h1><p className="mt-2 text-sm">La consultation des notes n’est pas encore ouverte à ce profil. Aucun dossier étudiant ne vous est associé pour cet accès.</p></CardContent></Card>
  return <OversightGradesPage />
}
