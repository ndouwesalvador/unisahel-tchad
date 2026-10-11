'use client'

import { Download, MapPin, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'

export type PublishedTimetableSlot = {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  type: string
  course: string
  teacher?: string
  room?: string
}

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const TYPE_LABELS: Record<string, string> = { CM: 'Cours magistral', TD: 'Travaux dirigés', TP: 'Travaux pratiques', EXAM: 'Examen' }
const TYPE_STYLES: Record<string, string> = {
  CM: 'border-blue-200 bg-blue-50 text-blue-950',
  TD: 'border-emerald-200 bg-emerald-50 text-emerald-950',
  TP: 'border-amber-200 bg-amber-50 text-amber-950',
  EXAM: 'border-red-200 bg-red-50 text-red-950',
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function slotTime(slot: PublishedTimetableSlot) {
  return `${slot.startTime}–${slot.endTime}`
}

function sortedSlots(slots: PublishedTimetableSlot[]) {
  return [...slots].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime) || a.endTime.localeCompare(b.endTime))
}

export function openTimetablePrintView({
  slots,
  institutionName,
  academicYear,
  title,
  scopeLabel,
}: {
  slots: PublishedTimetableSlot[]
  institutionName: string
  academicYear: string
  title: string
  scopeLabel?: string
}) {
  const printWindow = window.open('', '_blank', 'width=1200,height=850')
  if (!printWindow) return false

  const ordered = sortedSlots(slots)
  const activeDays = DAYS.map((label, index) => ({ label, index })).filter((day) => ordered.some((slot) => slot.dayOfWeek === day.index))
  const timeRanges = [...new Set(ordered.map(slotTime))].sort((a, b) => a.localeCompare(b))
  const cells = timeRanges.map((time) => `<tr><th>${escapeHtml(time)}</th>${activeDays.map((day) => {
    const entries = ordered.filter((slot) => slot.dayOfWeek === day.index && slotTime(slot) === time)
    return `<td>${entries.length === 0 ? '<span class="empty">—</span>' : entries.map((slot) => `<div class="slot"><strong>${escapeHtml(slot.course || 'Matière non précisée')}</strong><span>${escapeHtml(TYPE_LABELS[slot.type] || slot.type)}</span><span>${escapeHtml(slot.teacher || 'Enseignant non précisé')}</span><span>${escapeHtml(slot.room || 'Salle non précisée')}</span></div>`).join('')}</td>`
  }).join('')}</tr>`).join('')

  printWindow.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #172033; font-family: Arial, sans-serif; }
    header { text-align: center; border-bottom: 2px solid #172033; padding-bottom: 8px; margin-bottom: 10px; }
    header h1 { margin: 0; font-size: 16px; text-transform: uppercase; }
    header h2 { margin: 6px 0 0; font-size: 14px; }
    header p { margin: 4px 0 0; color: #526071; font-size: 10px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #aeb6c1; padding: 4px; vertical-align: top; }
    thead th { background: #172033; color: white; font-size: 9px; text-transform: uppercase; letter-spacing: .04em; }
    tbody th { width: 58px; background: #f1f3f5; font-size: 9px; vertical-align: middle; }
    td { height: 54px; }
    .slot { border-left: 3px solid #21765a; padding: 3px 4px; margin-bottom: 3px; background: #f5f8f7; break-inside: avoid; }
    .slot:last-child { margin-bottom: 0; }
    .slot strong, .slot span { display: block; }
    .slot strong { font-size: 8.5px; line-height: 1.15; }
    .slot span { margin-top: 1px; color: #4d5868; font-size: 7px; line-height: 1.15; }
    .empty { display: block; padding-top: 14px; text-align: center; color: #c2c7cf; }
    footer { margin-top: 7px; color: #697586; font-size: 8px; text-align: right; }
  </style></head><body><header><h1>${escapeHtml(institutionName)}</h1><h2>${escapeHtml(title)}</h2><p>Année académique ${escapeHtml(academicYear)}${scopeLabel ? ` · ${escapeHtml(scopeLabel)}` : ''}</p></header><table><thead><tr><th>Horaire</th>${activeDays.map(day => `<th>${escapeHtml(day.label)}</th>`).join('')}</tr></thead><tbody>${cells}</tbody></table><footer>Emploi du temps publié · UniSahel</footer><script>window.onload=()=>window.print()</script></body></html>`)
  printWindow.document.close()
  return true
}

function SlotCard({ slot, showTeacher }: { slot: PublishedTimetableSlot; showTeacher: boolean }) {
  return <div className={`rounded-lg border p-3 ${TYPE_STYLES[slot.type] || 'border-slate-200 bg-slate-50 text-slate-950'}`}>
    <div className="flex items-start justify-between gap-2">
      <p className="font-semibold leading-snug">{slot.course || 'Matière non précisée'}</p>
      <span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold">{slot.type}</span>
    </div>
    <p className="mt-1 text-xs font-semibold">{slot.startTime}–{slot.endTime}</p>
    <div className="mt-2 space-y-1 text-xs opacity-80">
      {showTeacher && <p className="flex items-center gap-1.5"><UserRound className="size-3.5" aria-hidden="true" />{slot.teacher || 'Enseignant non précisé'}</p>}
      <p className="flex items-center gap-1.5"><MapPin className="size-3.5" aria-hidden="true" />{slot.room || 'Salle non précisée'}</p>
    </div>
  </div>
}

export function PublishedTimetableView({
  slots,
  academicYear,
  title,
  description,
  scopeLabel,
  showTeacher = true,
}: {
  slots: PublishedTimetableSlot[]
  academicYear: string
  title: string
  description: string
  scopeLabel?: string
  showTeacher?: boolean
}) {
  const tenantName = useAppStore((state) => state.user?.tenantName) || 'Établissement'
  const ordered = sortedSlots(slots)
  const activeDays = DAYS.map((label, index) => ({ label, index })).filter((day) => ordered.some((slot) => slot.dayOfWeek === day.index))
  const timeRanges = [...new Set(ordered.map(slotTime))].sort((a, b) => a.localeCompare(b))

  const exportPdf = () => {
    if (!openTimetablePrintView({ slots: ordered, institutionName: tenantName, academicYear, title, scopeLabel })) {
      toast.error('Fenêtre bloquée', { description: 'Autorisez les fenêtres contextuelles pour exporter l’emploi du temps.' })
    }
  }

  return <div className="space-y-5 text-slate-900">
    <div className="rounded-2xl bg-[#142d36] p-6 text-white sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#d6e8e1] sm:text-base">{description}</p></div>
        <Button type="button" variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={exportPdf}>
          <Download className="mr-2 size-4" aria-hidden="true" />Exporter en PDF
        </Button>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Année académique {academicYear}{scopeLabel ? ` · ${scopeLabel}` : ''}</p>
    </div>

    <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
      <table className="min-w-[900px] w-full table-fixed border-collapse text-left">
        <thead><tr className="bg-slate-900 text-white"><th className="w-24 border-r border-white/10 px-3 py-3 text-xs uppercase tracking-wide">Horaire</th>{activeDays.map((day) => <th key={day.index} className="border-r border-white/10 px-3 py-3 text-center text-xs uppercase tracking-wide last:border-r-0">{day.label}</th>)}</tr></thead>
        <tbody>{timeRanges.map((time) => <tr key={time} className="border-t border-slate-200"><th className="bg-slate-50 px-3 py-4 text-center text-xs font-bold text-slate-700">{time}</th>{activeDays.map((day) => {
          const entries = ordered.filter((slot) => slot.dayOfWeek === day.index && slotTime(slot) === time)
          return <td key={`${day.index}:${time}`} className="border-l border-slate-200 p-2 align-top">{entries.length === 0 ? <span className="block py-5 text-center text-slate-300">—</span> : <div className="space-y-2">{entries.map((slot) => <SlotCard key={slot.id} slot={slot} showTeacher={showTeacher} />)}</div>}</td>
        })}</tr>)}</tbody>
      </table>
    </div>

    <div className="space-y-4 md:hidden">{activeDays.map((day) => <section key={day.index} className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><h2 className="bg-slate-900 px-4 py-3 text-sm font-bold text-white">{day.label}</h2><div className="space-y-3 p-3">{ordered.filter((slot) => slot.dayOfWeek === day.index).map((slot) => <SlotCard key={slot.id} slot={slot} showTeacher={showTeacher} />)}</div></section>)}</div>
  </div>
}
