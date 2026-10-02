'use client'

import { useAppStore } from '@/lib/store'
import { useStructure, useTimetable } from '@/lib/api-hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CalendarDays, GraduationCap, BookOpen } from 'lucide-react'

export function OrganizationDashboard() {
  const { user, setView } = useAppStore()
  const { data: structure, isLoading } = useStructure()
  const { data: timetable } = useTimetable()
  const faculties = structure?.faculties ?? []
  const departments = faculties.flatMap((faculty: { departments?: { name: string; programs?: { name: string; levels?: unknown[] }[] }[] }) => faculty.departments ?? [])
  const programs = departments.flatMap((department: { programs?: { name: string; levels?: unknown[] }[] }) => department.programs ?? [])
  const levels = programs.reduce((sum: number, program: { levels?: unknown[] }) => sum + (program.levels?.length ?? 0), 0)
  const slots = timetable?.slots ?? []

  return <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-[#1a2744]">{user?.role === 'FACULTE' ? 'Direction de faculté' : 'Direction de département'}</h1>
      <p className="mt-1 text-sm text-gray-600">Votre périmètre académique et sa planification, sans données des autres départements.</p>
    </div>
    {isLoading ? <p className="text-sm text-gray-600">Chargement du périmètre…</p> : <>
      {departments.length === 0 && <Card><CardContent className="p-5 text-sm text-amber-800">Aucun département actif ne vous est attribué. Demandez à l’administration de définir votre périmètre dans Utilisateurs.</CardContent></Card>}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="flex items-center gap-3 p-5"><GraduationCap className="size-6 text-[#2d7a4f]" /><div><div className="text-2xl font-bold text-[#1a2744]">{departments.length}</div><div className="text-sm text-gray-600">Départements</div></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-5"><BookOpen className="size-6 text-[#2d7a4f]" /><div><div className="text-2xl font-bold text-[#1a2744]">{programs.length}</div><div className="text-sm text-gray-600">Programmes · {levels} niveaux</div></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-5"><CalendarDays className="size-6 text-[#2d7a4f]" /><div><div className="text-2xl font-bold text-[#1a2744]">{slots.length}</div><div className="text-sm text-gray-600">Créneaux planifiés</div></div></CardContent></Card>
      </div>
      <Card><CardContent className="space-y-3 p-5">
        <h2 className="font-semibold text-[#1a2744]">Planification pédagogique</h2>
        <p className="text-sm text-gray-600">L’administration attribue les matières aux enseignants, y compris ceux d’un autre département. Vous organisez ensuite les créneaux de vos programmes ; les conflits de salle, d’enseignant et de niveau sont contrôlés.</p>
        <Button onClick={() => setView('timetable')}>Ouvrir l’emploi du temps</Button>
      </CardContent></Card>
    </>}
  </div>
}
