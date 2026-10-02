'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAcademicYears } from '@/lib/api-hooks'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { ServiceAction, ServiceStatus } from '@/lib/teaching-service'

interface TeacherOption { id: string; departmentId: string; user: { firstName: string; lastName: string } | null; department: { name: string } | null }
interface ElementOption { id: string; name: string; code: string | null; hoursCM: number; hoursTD: number; hoursTP: number; teachingUnit: { name: string; code: string | null; semester: { name: string; level: { name: string; program: { name: string; departmentId: string | null; department: { name: string } | null } } } } }
interface ServiceRecord {
  id: string; status: ServiceStatus; plannedHours: number; requestReason: string; requestedById: string
  homeDepartmentId: string; requestingDepartmentId: string; homeDecisionReason: string | null; centralDecisionReason: string | null
  academicYear: { name: string }; courseElement: { name: string; code: string | null; teachingUnit: { name: string; semester: { name: string; level: { name: string; program: { name: string } } } } }
  teacher: { user: { firstName: string; lastName: string } | null }
  requestingDepartment: { name: string }; homeDepartment: { name: string }
}
interface ServiceResponse { services: ServiceRecord[]; teachers: TeacherOption[]; elements: ElementOption[]; departmentIds: string[] | null }

const statusLabel: Record<ServiceStatus, string> = {
  PENDING_HOME: 'Accord du département de rattachement attendu',
  PENDING_CENTRAL: 'Arbitrage central attendu',
  APPROVED: 'Service approuvé',
  REJECTED: 'Demande refusée',
}

export function TeachingServicesPage() {
  const { user, selectedAcademicYearId } = useAppStore()
  const { data: yearsResponse } = useAcademicYears()
  const years: { id: string; name: string; isCurrent?: boolean }[] = yearsResponse?.data ?? []
  const yearId = selectedAcademicYearId || years.find(year => year.isCurrent)?.id || years[0]?.id || ''
  const [elementId, setElementId] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [hours, setHours] = useState('')
  const [requestReason, setRequestReason] = useState('')
  const [decisionReasons, setDecisionReasons] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const query = useQuery<ServiceResponse>({
    queryKey: ['teaching-services', yearId], enabled: !!yearId,
    queryFn: async () => {
      const response = await fetch(`/api/teaching-services?academicYearId=${encodeURIComponent(yearId)}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Services indisponibles')
      return data
    },
  })
  const data = query.data
  const selectedElement = data?.elements.find(element => element.id === elementId)
  const teacherName = (teacher: TeacherOption) => `${teacher.user?.lastName ?? ''} ${teacher.user?.firstName ?? ''}`.trim() || teacher.id

  async function createRequest() {
    if (!yearId || !elementId || !teacherId || !Number.isFinite(Number(hours)) || Number(hours) <= 0 || requestReason.trim().length < 10) {
      toast.error('Sélectionnez année, matière, enseignant et volume ; décrivez le besoin en 10 caractères minimum.')
      return
    }
    setBusy(true)
    try {
      const response = await fetch('/api/teaching-services', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ academicYearId: yearId, courseElementId: elementId, teacherId, plannedHours: Number(hours), reason: requestReason.trim() }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Demande impossible')
      toast.success('Demande de service enregistrée')
      setRequestReason(''); setHours(''); setTeacherId(''); setElementId('')
      await query.refetch()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Demande impossible') }
    finally { setBusy(false) }
  }

  async function decide(id: string, action: ServiceAction) {
    const reason = decisionReasons[id]?.trim() ?? ''
    if (reason.length < 10) { toast.error('Un motif de décision de 10 caractères minimum est requis.'); return }
    setBusy(true)
    try {
      const response = await fetch('/api/teaching-services', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action, reason }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Décision impossible')
      toast.success('Décision enregistrée')
      setDecisionReasons(previous => ({ ...previous, [id]: '' }))
      await query.refetch()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Décision impossible') }
    finally { setBusy(false) }
  }

  return <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Services d’enseignement</h1>
      <p className="mt-1 text-sm text-slate-600">Une demande par matière, enseignant et année. Un enseignant extérieur passe par son département de rattachement avant l’arbitrage central. Aucun rattachement existant n’est écrasé.</p>
    </div>
    {!yearId && <Card><CardContent className="py-6 text-slate-700">Créez d’abord une année académique pour demander un service.</CardContent></Card>}
    {yearId && <Card>
      <CardHeader><CardTitle>Nouvelle demande · {years.find(year => year.id === yearId)?.name}</CardTitle></CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="service-element">Matière / EC</Label><select id="service-element" className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900" value={elementId} onChange={event => setElementId(event.target.value)}>
          <option value="">Sélectionner une matière</option>{data?.elements.map(element => <option key={element.id} value={element.id}>{element.teachingUnit.semester.level.program.name} · {element.teachingUnit.semester.level.name} · {element.teachingUnit.semester.name} · {element.teachingUnit.name} · {element.code ? `${element.code} — ` : ''}{element.name}</option>)}
        </select></div>
        <div className="space-y-2"><Label htmlFor="service-teacher">Enseignant sollicité</Label><select id="service-teacher" className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900" value={teacherId} onChange={event => setTeacherId(event.target.value)}>
          <option value="">Sélectionner un enseignant</option>{data?.teachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacherName(teacher)} · {teacher.department?.name ?? 'Département non défini'}</option>)}
        </select></div>
        <div className="space-y-2"><Label htmlFor="service-hours">Volume annuel prévu (heures)</Label><Input id="service-hours" type="number" min="0.5" max="1000" step="0.5" value={hours} onChange={event => setHours(event.target.value)} /></div>
        <div className="space-y-2"><Label>Département demandeur</Label><p className="rounded-md border bg-slate-50 px-3 py-2 text-sm text-slate-700">{selectedElement ? selectedElement.teachingUnit.semester.level.program.department?.name ?? 'Département non défini' : 'Déduit de la matière choisie'}</p></div>
        <div className="space-y-2 md:col-span-2"><Label htmlFor="service-reason">Motif et contexte de la sollicitation</Label><Textarea id="service-reason" value={requestReason} onChange={event => setRequestReason(event.target.value)} maxLength={2000} placeholder="Besoin pédagogique, enseignement commun, période et volume…" /></div>
        <Button className="md:col-span-2 md:w-fit" disabled={busy || !data} onClick={createRequest}>Envoyer la demande</Button>
      </CardContent>
    </Card>}
    {yearId && <section className="space-y-3" aria-label="Demandes de service">
      <h2 className="text-lg font-semibold text-slate-900">Demandes et décisions</h2>
      {query.isLoading && <p className="text-sm text-slate-600">Chargement des services…</p>}
      {query.isError && <p className="text-sm text-red-700">{query.error instanceof Error ? query.error.message : 'Chargement impossible'}</p>}
      {data?.services.length === 0 && <p className="rounded-lg border bg-white p-5 text-sm text-slate-600">Aucun service demandé pour cette année.</p>}
      {data?.services.map(service => {
        const canHome = service.status === 'PENDING_HOME' && !!data.departmentIds?.includes(service.homeDepartmentId) && service.requestedById !== user?.id
        const canCentral = service.status === 'PENDING_CENTRAL' && ['ADMIN_INSTITUTION', 'SUPER_ADMIN'].includes(user?.role ?? '')
        return <Card key={service.id}><CardContent className="space-y-3 py-5">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold text-slate-900">{service.courseElement.code ? `${service.courseElement.code} · ` : ''}{service.courseElement.name}</h3>
            <p className="text-sm text-slate-600">{service.courseElement.teachingUnit.semester.level.program.name} · {service.courseElement.teachingUnit.semester.level.name} · {service.courseElement.teachingUnit.semester.name} · {service.courseElement.teachingUnit.name}</p>
            <p className="text-sm text-slate-700">{`${service.teacher.user?.lastName ?? ''} ${service.teacher.user?.firstName ?? ''}`.trim()} · {service.plannedHours} h/an</p>
            <p className="text-sm text-slate-600">{service.requestingDepartment.name} → {service.homeDepartment.name}</p></div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-800">{statusLabel[service.status]}</span></div>
          <p className="text-sm text-slate-700">Demande : {service.requestReason}</p>
          {service.homeDecisionReason && <p className="text-sm text-slate-600">Avis du rattachement : {service.homeDecisionReason}</p>}
          {service.centralDecisionReason && <p className="text-sm text-slate-600">Décision centrale : {service.centralDecisionReason}</p>}
          {(canHome || canCentral) && <div className="space-y-2 border-t pt-3"><Label htmlFor={`decision-${service.id}`}>Motif de décision</Label>
            <Textarea id={`decision-${service.id}`} value={decisionReasons[service.id] ?? ''} onChange={event => setDecisionReasons(previous => ({ ...previous, [service.id]: event.target.value }))} maxLength={2000} />
            <div className="flex gap-2"><Button disabled={busy} onClick={() => decide(service.id, canHome ? 'HOME_APPROVE' : 'CENTRAL_APPROVE')}>Accorder</Button>
              <Button variant="outline" disabled={busy} onClick={() => decide(service.id, canHome ? 'HOME_REJECT' : 'CENTRAL_REJECT')}>Refuser</Button></div></div>}
        </CardContent></Card>
      })}
    </section>}
  </div>
}
