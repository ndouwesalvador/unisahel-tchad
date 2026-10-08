'use client'

import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAppStore } from '@/lib/store'

type ComponentName = 'ccGrade' | 'tpGrade' | 'examGrade'
type Grade = { id: string; ccGrade: number | null; tpGrade: number | null; examGrade: number | null;
  finalGrade: number | null; isLocked: boolean }
type Course = { id: string; code: string | null; name: string; hoursTP: number; teachingUnit: {
  name: string; code: string | null; semester: { name: string; level: { name: string; program: { name: string } } } } }
type Student = { id: string; matricule: string | null; firstName: string; lastName: string; grade: Grade | null }
type EntryData = { academicYear: { id: string; name: string }; courses: Course[]; students: Student[] }

async function loadEntries(courseElementId: string, session: string, academicYearId: string | null): Promise<EntryData> {
  const params = new URLSearchParams({ session })
  if (courseElementId) params.set('courseElementId', courseElementId)
  if (academicYearId) params.set('academicYearId', academicYearId)
  const response = await fetch(`/api/grade-entry?${params}`, { cache: 'no-store' })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Chargement des notes impossible.')
  return body.data
}

function GradeCell({ student, course, component, jury, yearId, session, refresh } : {
  student: Student; course: Course; component: ComponentName; jury: boolean;
  yearId: string; session: string; refresh: () => Promise<unknown>
}) {
  const stored = student.grade?.[component] ?? null
  const [draft, setDraft] = useState('')
  const [reason, setReason] = useState('')
  const [correcting, setCorrecting] = useState(false)
  const [saving, setSaving] = useState(false)
  useEffect(() => { setDraft(''); setReason(''); setCorrecting(false) }, [stored, student.id, course.id, session])
  const canEnter = stored === null && !student.grade?.isLocked && (jury ? component === 'examGrade' : component !== 'examGrade')
  const canCorrect = jury && stored !== null

  const save = async (correction: boolean) => {
    if (saving || draft.trim() === '') return
    const value = Number(draft.replace(',', '.'))
    if (!Number.isFinite(value) || value < 0 || value > 20) {
      toast.error('Entrez une note entre 0 et 20.'); return
    }
    if (correction && reason.trim().length < 10) {
      toast.error('La correction exige un motif d’au moins 10 caractères.'); return
    }
    if (stored !== null && value === stored) { setCorrecting(false); return }
    setSaving(true)
    try {
      const response = await fetch('/api/grade-entry', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ academicYearId: yearId, courseElementId: course.id, studentId: student.id,
          session, component, value, ...(correction ? { reason: reason.trim() } : {}) }) })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Enregistrement impossible.')
      await refresh()
      setCorrecting(false)
      toast.success(correction ? 'Correction tracée et enregistrée.' : 'Note enregistrée définitivement.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Enregistrement impossible.')
    } finally { setSaving(false) }
  }

  if (canCorrect && !correcting) return <div className="flex items-center justify-end gap-2">
    <span className="font-semibold text-slate-950">{stored?.toFixed(2)}</span>
    <Button type="button" size="sm" variant="outline" onClick={() => { setDraft(String(stored)); setCorrecting(true) }}>Corriger</Button>
  </div>
  if (correcting) return <div className="min-w-44 space-y-2">
    <Input aria-label={`Nouvelle note ${component} de ${student.firstName} ${student.lastName}`} type="text" inputMode="decimal"
      value={draft} onChange={(event) => setDraft(event.target.value)} disabled={saving} />
    <Input aria-label="Motif de correction" value={reason} onChange={(event) => setReason(event.target.value)}
      placeholder="Motif obligatoire" disabled={saving} />
    <div className="flex justify-end gap-1"><Button type="button" size="sm" variant="ghost" disabled={saving} onClick={() => setCorrecting(false)}>Annuler</Button>
      <Button type="button" size="sm" disabled={saving || reason.trim().length < 10} onClick={() => save(true)}>{saving ? 'Enregistrement…' : 'Appliquer'}</Button></div>
  </div>
  if (!canEnter) return <span className="font-semibold text-slate-700">{stored === null ? '—' : stored.toFixed(2)}</span>
  return <div className="flex items-center justify-end gap-2">
    <Input aria-label={`Note ${component} de ${student.firstName} ${student.lastName}`} className="w-20 text-right"
      type="text" inputMode="decimal" placeholder="0–20" value={draft} disabled={saving}
      onChange={(event) => setDraft(event.target.value)} onBlur={() => void save(false)}
      onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} />
    <span aria-live="polite" className="min-w-16 text-xs text-slate-600">{saving ? 'Sauvegarde…' : 'Auto'}</span>
  </div>
}

export function GradeEntryPage() {
  const role = useAppStore((state) => state.user?.role)
  const selectedAcademicYearId = useAppStore((state) => state.selectedAcademicYearId)
  const jury = role === 'JURY'
  const queryClient = useQueryClient()
  const [courseId, setCourseId] = useState('')
  const [session, setSession] = useState('NORMALE')
  const [locking, setLocking] = useState<string | null>(null)
  useEffect(() => { setCourseId('') }, [selectedAcademicYearId])
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['grade-entry', courseId, session, selectedAcademicYearId],
    queryFn: () => loadEntries(courseId, session, selectedAcademicYearId),
  })
  useEffect(() => {
    if (data?.courses.length && !data.courses.some((course) => course.id === courseId)) setCourseId(data.courses[0].id)
    if (data && data.courses.length === 0 && courseId) setCourseId('')
  }, [data, courseId])
  const selected = data?.courses.find((course) => course.id === courseId)
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['grade-entry'] })
    await queryClient.invalidateQueries({ queryKey: ['oversight-grades'] })
  }
  const lock = async (gradeId: string) => {
    setLocking(gradeId)
    try {
      const response = await fetch('/api/grade-entry', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'LOCK', gradeId }) })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Validation impossible.')
      await refresh()
      toast.success('Note finale validée et publiée.')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Validation impossible.') }
    finally { setLocking(null) }
  }

  return <div className="space-y-5 text-slate-900">
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">{jury ? 'Jury académique' : 'Espace enseignant'}</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-950">Saisie des notes</h1>
      <p className="mt-2 text-sm text-slate-700">{jury
        ? 'Examens des programmes et niveaux qui vous sont affectés. Toute correction d’une note déjà enregistrée exige un motif et reste tracée.'
        : 'Contrôle continu et TP de vos services annuels approuvés uniquement. La première note est enregistrée au départ du champ et ne peut plus être modifiée par vous.'}</p>
      {data?.academicYear && <p className="mt-2 text-sm font-medium text-slate-800">Année académique : {data.academicYear.name}</p>}
    </div>
    {isError ? <Card><CardContent className="p-5 text-sm text-red-800">{error instanceof Error ? error.message : 'Chargement impossible.'} <Button type="button" variant="outline" onClick={() => refetch()}>Réessayer</Button></CardContent></Card>
      : isLoading ? <Card><CardContent className="p-5 text-sm">Chargement…</CardContent></Card>
      : !data?.courses.length ? <Card><CardContent className="p-5 text-sm text-slate-700">{jury
        ? 'Aucune matière n’est rattachée aux programmes et niveaux de ce jury. Vérifiez son périmètre dans Utilisateurs.'
        : 'Aucun service d’enseignement approuvé pour cette année. L’administration doit vous affecter une matière avant la saisie.'}</CardContent></Card>
      : <>
        <Card className="border-slate-200 bg-white"><CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_180px]">
          <div className="space-y-2"><Label htmlFor="grade-course">Matière</Label>
            <Select value={courseId} onValueChange={setCourseId}><SelectTrigger id="grade-course"><SelectValue placeholder="Choisir une matière" /></SelectTrigger>
              <SelectContent>{data.courses.map((course) => <SelectItem key={course.id} value={course.id}>
                {course.name} · {course.teachingUnit.semester.level.program.name} / {course.teachingUnit.semester.level.name}
              </SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor="grade-session">Session</Label>
            <Select value={session} onValueChange={setSession}><SelectTrigger id="grade-session"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="NORMALE">Normale</SelectItem><SelectItem value="RATTRAPAGE">Rattrapage</SelectItem></SelectContent></Select></div>
        </CardContent></Card>
        {selected && <Card className="border-slate-200 bg-white"><CardContent className="p-0">
          <div className="border-b border-slate-200 p-5"><h2 className="text-lg font-bold text-slate-950">{selected.name}</h2>
            <p className="text-sm text-slate-700">{selected.teachingUnit.name} · {selected.teachingUnit.semester.name} · {data.students.length} étudiant(s) inscrit(s)</p></div>
          {data.students.length === 0 ? <p className="p-5 text-sm text-slate-700">Aucun étudiant ne possède une inscription annuelle validée dans le niveau de cette UE pour l’année sélectionnée.</p>
            : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 text-left text-slate-800"><tr>
                <th className="p-3">Étudiant</th><th className="p-3 text-right">Contrôle</th>
                {selected.hoursTP > 0 && <th className="p-3 text-right">TP</th>}
                <th className="p-3 text-right">Examen (jury)</th><th className="p-3 text-right">Moyenne</th>
                {jury && <th className="p-3 text-right">Validation</th>}
              </tr></thead><tbody>{data.students.map((student) => <tr key={student.id} className="border-t border-slate-100 align-top">
                <td className="p-3 font-medium text-slate-950">{student.lastName} {student.firstName}<p className="font-normal text-slate-600">{student.matricule || 'Sans matricule'}</p></td>
                <td className="p-3 text-right"><GradeCell student={student} course={selected} component="ccGrade" jury={jury} yearId={data.academicYear.id} session={session} refresh={refresh} /></td>
                {selected.hoursTP > 0 && <td className="p-3 text-right"><GradeCell student={student} course={selected} component="tpGrade" jury={jury} yearId={data.academicYear.id} session={session} refresh={refresh} /></td>}
                <td className="p-3 text-right"><GradeCell student={student} course={selected} component="examGrade" jury={jury} yearId={data.academicYear.id} session={session} refresh={refresh} /></td>
                <td className="p-3 text-right font-bold text-slate-950">{student.grade?.finalGrade == null ? '—' : student.grade.finalGrade.toFixed(2)}
                  <p className="font-normal text-slate-600">{student.grade?.isLocked ? 'Publiée' : 'En cours'}</p></td>
                {jury && <td className="p-3 text-right">{student.grade && !student.grade.isLocked && student.grade.finalGrade !== null &&
                  student.grade.ccGrade !== null && student.grade.examGrade !== null &&
                  (selected.hoursTP <= 0 || student.grade.tpGrade !== null)
                  ? <Button type="button" size="sm" disabled={locking === student.grade.id} onClick={() => lock(student.grade!.id)}>Valider</Button>
                  : '—'}</td>}
              </tr>)}</tbody></table></div>}
        </CardContent></Card>}
      </>}
  </div>
}
