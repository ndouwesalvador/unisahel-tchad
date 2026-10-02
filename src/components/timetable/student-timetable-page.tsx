'use client'

import { useAcademicYears, useTimetable } from '@/lib/api-hooks'
import { useAppStore } from '@/lib/store'

interface StudentSlot { id: string; dayOfWeek: number; startTime: string; endTime: string; type: string; course: string; teacher: string; room: string }
const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

export function StudentTimetablePage() {
  const selectedAcademicYearId = useAppStore(state => state.selectedAcademicYearId)
  const { data: yearsData } = useAcademicYears()
  const years: { id: string; name: string; isCurrent?: boolean }[] = yearsData?.data ?? []
  const yearId = selectedAcademicYearId || years.find(year => year.isCurrent)?.id || years[0]?.id || ''
  const query = useTimetable({ academicYearId: yearId }, { enabled: !!yearId })
  const slots: StudentSlot[] = query.data?.slots ?? []

  return <div className="space-y-5 text-slate-900">
    <div className="rounded-2xl bg-[#142d36] p-6 text-white sm:p-8"><h1 className="text-2xl font-bold">Mon emploi du temps</h1>
      <p className="mt-2 text-sm text-[#d6e8e1]">Uniquement les créneaux publiés pour votre inscription et l’année sélectionnée.</p></div>
    {yearId && <p className="text-sm font-semibold text-slate-700">Année académique : {years.find(year => year.id === yearId)?.name ?? 'Sélectionnée'}</p>}
    {!yearId ? <p className="rounded-xl border bg-white p-5 text-sm">Aucune année académique disponible.</p> : query.isLoading ?
      <p className="rounded-xl border bg-white p-5 text-sm">Chargement…</p> : query.isError ?
      <p className="rounded-xl border border-red-200 bg-white p-5 text-sm text-red-700">Impossible de charger votre emploi du temps.</p> : slots.length === 0 ?
      <p className="rounded-xl border bg-white p-5 text-sm text-slate-700">Aucun créneau publié pour votre inscription et cette année.</p> :
      <div className="grid gap-3 md:grid-cols-2">{slots.map(slot => <article key={slot.id} className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-bold text-emerald-800">{days[slot.dayOfWeek]} · {slot.startTime}–{slot.endTime} · {slot.type}</p>
        <h2 className="mt-2 text-lg font-semibold text-slate-950">{slot.course}</h2>
        <p className="mt-1 text-sm text-slate-700">{slot.teacher || 'Enseignant non indiqué'} · {slot.room || 'Salle non indiquée'}</p>
      </article>)}</div>}
  </div>
}
