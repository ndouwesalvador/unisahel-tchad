'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface PublicationSummary {
  id: string; departmentId: string; version: number; status: string; reason: string; reviewReason: string | null
  submittedById: string | null; reviewedById: string | null; createdAt: string; reviewedAt: string | null; slotCount: number
}
interface PublicationResponse { departments: { id: string; name: string }[]; publications: PublicationSummary[] }
interface SnapshotSlot { id: string; dayOfWeek: number; startTime: string; endTime: string; course: string; teacher: string; room: string; type: string }
const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const statuses: Record<string, string> = {
  LEGACY_BASELINE: 'Reprise historique', PENDING_REVIEW: 'En attente de validation', PUBLISHED: 'Publiée', REJECTED: 'Refusée',
}

export function TimetablePublicationPanel({ academicYearId }: { academicYearId: string }) {
  const user = useAppStore(state => state.user)
  const queryClient = useQueryClient()
  const [chosenDepartmentId, setChosenDepartmentId] = useState('')
  const [submitReason, setSubmitReason] = useState('')
  const [reviewReason, setReviewReason] = useState('')
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const query = useQuery<PublicationResponse>({
    queryKey: ['timetable-publications', academicYearId], enabled: !!academicYearId,
    queryFn: async () => {
      const response = await fetch(`/api/timetable-publications?academicYearId=${encodeURIComponent(academicYearId)}`)
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Publications indisponibles')
      return result
    },
  })
  const previewQuery = useQuery<{ publication: { snapshot: SnapshotSlot[] } }>({
    queryKey: ['timetable-publication-preview', academicYearId, previewId], enabled: !!academicYearId && !!previewId,
    queryFn: async () => {
      const response = await fetch(`/api/timetable-publications?academicYearId=${encodeURIComponent(academicYearId)}&publicationId=${encodeURIComponent(previewId!)}`)
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Version indisponible')
      return result
    },
  })
  const departments = query.data?.departments ?? []
  const departmentId = chosenDepartmentId && departments.some(department => department.id === chosenDepartmentId)
    ? chosenDepartmentId : departments[0]?.id ?? ''
  const versions = (query.data?.publications ?? []).filter(publication => publication.departmentId === departmentId)
  const pending = versions.find(publication => publication.status === 'PENDING_REVIEW')
  const published = versions.find(publication => publication.status === 'PUBLISHED' || publication.status === 'LEGACY_BASELINE')
  const canReview = ['ADMIN_INSTITUTION', 'SUPER_ADMIN', 'FACULTE'].includes(user?.role ?? '')
    && (user?.role !== 'FACULTE' || pending?.submittedById !== user?.id)

  async function submit() {
    if (!academicYearId || !departmentId || submitReason.trim().length < 10) { toast.error('Département et motif de 10 caractères minimum requis.'); return }
    setBusy(true)
    try {
      const response = await fetch('/api/timetable-publications', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ academicYearId, departmentId, reason: submitReason.trim() }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Soumission impossible')
      toast.success('Version soumise à validation')
      setSubmitReason('')
      await query.refetch()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Soumission impossible') }
    finally { setBusy(false) }
  }

  async function review(action: 'APPROVE' | 'REJECT') {
    if (!pending || reviewReason.trim().length < 10) { toast.error('Motif de décision de 10 caractères minimum requis.'); return }
    setBusy(true)
    try {
      const response = await fetch('/api/timetable-publications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pending.id, action, reason: reviewReason.trim() }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Décision impossible')
      toast.success(action === 'APPROVE' ? 'Emploi du temps publié' : 'Version refusée')
      setReviewReason('')
      await Promise.all([query.refetch(), queryClient.invalidateQueries({ queryKey: ['timetable'] })])
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Décision impossible') }
    finally { setBusy(false) }
  }

  return <Card className="border-slate-200 bg-white text-slate-900">
    <CardHeader><CardTitle>Publication de l’emploi du temps</CardTitle>
      <p className="text-sm text-slate-600">Le brouillon reste interne. Les enseignants et étudiants consultent la dernière version validée de leur département.</p>
    </CardHeader>
    <CardContent className="space-y-5">
      {query.isLoading && <p className="text-sm text-slate-600">Chargement des versions…</p>}
      {query.isError && <p className="text-sm text-red-700">{query.error instanceof Error ? query.error.message : 'Chargement impossible'}</p>}
      {departments.length === 0 && !query.isLoading && <p className="text-sm text-slate-600">Aucun département actif dans votre périmètre.</p>}
      {departments.length > 0 && <>
        <div className="space-y-2"><Label htmlFor="publication-department">Département propriétaire</Label>
          <select id="publication-department" className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" value={departmentId} onChange={event => { setChosenDepartmentId(event.target.value); setPreviewId(null) }}>
            {departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
          </select></div>
        <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">Version visible actuellement : {published ? `v${published.version} · ${statuses[published.status]} · ${published.slotCount} créneau(x)` : 'aucune'}.
          {pending ? ` Version v${pending.version} en attente : brouillon temporairement verrouillé.` : ''}</p>
        {!pending && <div className="space-y-2"><Label htmlFor="publication-reason">Motif de soumission ou de révision</Label>
          <Textarea id="publication-reason" value={submitReason} onChange={event => setSubmitReason(event.target.value)} maxLength={2000} placeholder="Décrivez la période, les changements et le contrôle des affectations…" />
          <Button disabled={busy} onClick={submit}>Soumettre le brouillon</Button>
          <p className="text-xs text-slate-600">Tous les créneaux doivent disposer d’un service annuel approuvé. La version précédente reste visible jusqu’à validation.</p>
        </div>}
        {pending && canReview && <div className="space-y-2 border-t border-slate-200 pt-4"><Label htmlFor="publication-review">Décision du décanat ou de l’administration</Label>
          <Textarea id="publication-review" value={reviewReason} onChange={event => setReviewReason(event.target.value)} maxLength={2000} placeholder="Motif de validation ou de refus…" />
          <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => review('APPROVE')}>Valider et publier</Button>
            <Button variant="outline" disabled={busy} onClick={() => review('REJECT')}>Refuser et rouvrir le brouillon</Button></div>
        </div>}
        <div className="space-y-2 border-t border-slate-200 pt-4"><h3 className="font-semibold">Historique des versions</h3>
          {versions.length === 0 ? <p className="text-sm text-slate-600">Aucune version pour cette année.</p> : versions.map(version =>
            <div key={version.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3 text-sm">
              <div><p className="font-medium">v{version.version} · {statuses[version.status] ?? version.status} · {version.slotCount} créneau(x)</p>
                <p className="text-slate-600">{version.reason}</p>{version.reviewReason && <p className="text-slate-600">Décision : {version.reviewReason}</p>}</div>
              <Button variant="outline" size="sm" onClick={() => setPreviewId(version.id)}>Voir</Button>
            </div>)}
        </div>
        {previewId && <div className="space-y-2 border-t border-slate-200 pt-4"><div className="flex items-center justify-between"><h3 className="font-semibold">Instantané de la version</h3><Button variant="ghost" size="sm" onClick={() => setPreviewId(null)}>Fermer</Button></div>
          {previewQuery.isLoading ? <p className="text-sm">Chargement…</p> : previewQuery.isError ? <p className="text-sm text-red-700">Version indisponible.</p> :
            <div className="max-h-72 space-y-2 overflow-y-auto">{previewQuery.data?.publication.snapshot.map(slot => <p key={slot.id} className="rounded border border-slate-200 p-2 text-sm">
              {days[slot.dayOfWeek]} {slot.startTime}–{slot.endTime} · {slot.course} · {slot.teacher} · {slot.room}
            </p>)}</div>}
        </div>}
      </>}
    </CardContent>
  </Card>
}
