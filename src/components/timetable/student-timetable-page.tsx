'use client'

import { useAcademicYears, useTimetable } from '@/lib/api-hooks'
import { useAppStore } from '@/lib/store'
import { PublishedTimetableView, type PublishedTimetableSlot } from './published-timetable-view'

type StudentSlot = PublishedTimetableSlot

export function StudentTimetablePage() {
  const selectedAcademicYearId = useAppStore(state => state.selectedAcademicYearId)
  const yearsQuery = useAcademicYears()
  const yearsData = yearsQuery.data
  const years: { id: string; name: string; isCurrent?: boolean }[] = yearsData?.data ?? []
  const yearId = selectedAcademicYearId || years.find(year => year.isCurrent)?.id || years[0]?.id || ''
  const query = useTimetable({ academicYearId: yearId }, { enabled: !!yearId })
  const slots: StudentSlot[] = query.data?.slots ?? []
  const registration = query.data?.registration as { programId: string; levelId: string } | null | undefined

  const academicYearLabel = years.find(year => year.id === yearId)?.name ?? 'Sélectionnée'

  return <div className="space-y-5 text-slate-900">
    {yearsQuery.isError ? <p role="alert" className="rounded-xl border border-red-200 bg-white p-5 text-sm text-red-700">Impossible de charger les années académiques. <button type="button" className="font-semibold underline" onClick={() => yearsQuery.refetch()}>Réessayer</button></p> : !yearId ? <p className="rounded-xl border bg-white p-5 text-sm">Aucune année académique disponible.</p> : query.isLoading ?
      <p className="rounded-xl border bg-white p-5 text-sm">Chargement…</p> : query.isError ?
      <p className="rounded-xl border border-red-200 bg-white p-5 text-sm text-red-700">Impossible de charger votre emploi du temps.</p> : registration === null ?
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">Votre inscription administrative pour cette année n’est pas encore validée. Contactez la scolarité pour vérifier votre dossier.</p> : slots.length === 0 ?
      <p className="rounded-xl border bg-white p-5 text-sm text-slate-700">Votre inscription est validée, mais aucun créneau n’a encore été publié pour votre programme et votre niveau.</p> :
      <PublishedTimetableView slots={slots} academicYearId={yearId} academicYear={academicYearLabel} title="Mon emploi du temps" description="Tableau des créneaux publiés pour votre inscription. La version exportée contient uniquement votre filière et votre niveau." />}
  </div>
}
