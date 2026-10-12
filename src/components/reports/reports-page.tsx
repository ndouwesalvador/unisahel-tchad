'use client'

import { useDashboardStats, useOversight, useReports } from '@/lib/api-hooks'
import { useAppStore, type AppView } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Download, FileText, RefreshCw } from 'lucide-react'

type DashboardData = {
  statsCards: {
    totalStudents: number
    totalTeachers: number
    totalPrograms: number
    totalPaymentsAmount: number
  }
  chartData: {
    studentsByStatus: { status: string; count: number }[]
    studentsByProgram: { name: string; count: number }[]
    studentsByCycle: { cycle: string; count: number }[]
    successRateByProgram: { name: string; rate: number }[]
  }
  alerts: {
    unvalidatedGrades: number
    pendingPayments: number
    studentsWithoutPayment: number
  }
}

type ReportRecord = {
  id: string
  name: string
  type: string
  format: string
  status: string
  createdAt: string
}

type OversightData = {
  academicYear: { id: string; name: string } | null
  totals: { students: number; teachers: number; programs: number; faculties: number; departments: number; signedPvs: number }
  statuses: Array<{ status: string; count: number }>
  programs: Array<{
    id: string
    name: string
    cycle: string
    students: number
    department: string
    faculty: string
    levels: Array<{ id: string; name: string; students: number }>
  }>
}

const statusLabels: Record<string, string> = {
  INSCRIT: 'Inscrits',
  PRE_INSCRIT: 'Pré-inscrits',
  SUSPENDU: 'Suspendus',
  EXCLU: 'Exclus',
  DIPLOME: 'Diplômés',
}

const links = [
  { label: 'Étudiants et inscriptions', view: 'students' as const },
  { label: 'Notes et validations', view: 'grades' as const },
  { label: 'Résultats académiques', view: 'results' as const },
  { label: 'Paiements', view: 'payments' as const },
  { label: 'Documents officiels et PV', view: 'documents' as const },
]

function buildRows(data: DashboardData) {
  const rows: { Indicateur: string; Catégorie: string; Valeur: number | string }[] = [
    { Indicateur: 'Dossiers étudiants', Catégorie: 'Effectifs', Valeur: data.statsCards.totalStudents },
    { Indicateur: 'Enseignants', Catégorie: 'Effectifs', Valeur: data.statsCards.totalTeachers },
    { Indicateur: 'Programmes', Catégorie: 'Structure', Valeur: data.statsCards.totalPrograms },
    { Indicateur: 'Paiements validés (FCFA)', Catégorie: 'Finances', Valeur: data.statsCards.totalPaymentsAmount },
    { Indicateur: 'Notes saisies non verrouillées', Catégorie: 'Alertes', Valeur: data.alerts.unvalidatedGrades },
    { Indicateur: 'Paiements en attente', Catégorie: 'Alertes', Valeur: data.alerts.pendingPayments },
    { Indicateur: 'Inscrits sans paiement validé', Catégorie: 'Alertes', Valeur: data.alerts.studentsWithoutPayment },
  ]
  for (const item of data.chartData.studentsByStatus) {
    rows.push({ Indicateur: statusLabels[item.status] ?? item.status, Catégorie: 'Statut étudiant', Valeur: item.count })
  }
  for (const item of data.chartData.studentsByProgram) {
    rows.push({ Indicateur: item.name, Catégorie: 'Effectif par programme', Valeur: item.count })
  }
  for (const item of data.chartData.studentsByCycle) {
    rows.push({ Indicateur: item.cycle, Catégorie: 'Effectif par cycle', Valeur: item.count })
  }
  return rows
}

export function ReportsPage() {
  const { setView, user } = useAppStore()
  const isRectorat = user?.role === 'RECTORAT'
  const dashboard = useDashboardStats(undefined, { enabled: !isRectorat })
  const oversight = useOversight({ enabled: isRectorat })
  const reports = useReports({ enabled: !isRectorat })
  const data = dashboard.data as DashboardData | undefined
  const history = (reports.data?.reports ?? []) as ReportRecord[]

  if (isRectorat) {
    return <RectoratReports
      data={oversight.data as OversightData | undefined}
      isPending={oversight.isPending}
      isError={oversight.isError}
      refetch={() => oversight.refetch()}
      setView={setView}
    />
  }

  async function download(format: 'csv' | 'xlsx') {
    if (!data) return
    const rows = buildRows(data)
    const { exportToCSV, exportToExcel } = await import('@/lib/export')
    const filename = `unisahel-synthese-${new Date().toISOString().slice(0, 10)}`
    if (format === 'csv') exportToCSV(rows, filename)
    else exportToExcel(rows, filename, 'Synthèse')
  }

  if (dashboard.isPending) {
    return <p role="status" className="p-6 text-gray-600">Chargement des indicateurs réels…</p>
  }

  if (dashboard.isError || !data?.statsCards || !data.chartData || !data.alerts) {
    return (
      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <AlertTriangle className="size-5 text-red-600" />
          <p>Les indicateurs ne sont pas disponibles. Aucun chiffre de remplacement n’est affiché.</p>
          <Button variant="outline" onClick={() => dashboard.refetch()}>Réessayer</Button>
        </CardContent>
      </Card>
    )
  }

  const cards = [
    ['Dossiers étudiants', data.statsCards.totalStudents],
    ['Enseignants', data.statsCards.totalTeachers],
    ['Programmes', data.statsCards.totalPrograms],
    ['Paiements validés', `${data.statsCards.totalPaymentsAmount.toLocaleString('fr-FR')} FCFA`],
  ] as const

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--institution-primary)]">Rapports et analyses</h1>
          <p className="text-sm text-gray-600">Synthèse calculée depuis les données de l’institution, toutes années confondues.</p>
          <p className="text-xs text-gray-500">Le taux ci-dessous mesure les notes saisies au-dessus du seuil, pas la réussite définitive d’un jury.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => dashboard.refetch()}><RefreshCw className="mr-2 size-4" />Actualiser</Button>
          <Button variant="outline" onClick={() => download('csv')}><Download className="mr-2 size-4" />CSV</Button>
          <Button onClick={() => download('xlsx')}><Download className="mr-2 size-4" />Excel</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <Card key={label}><CardContent className="p-5"><p className="text-sm text-gray-600">{label}</p><p className="mt-2 text-2xl font-bold text-[var(--institution-primary)]">{value}</p></CardContent></Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Statuts des étudiants</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.chartData.studentsByStatus.length ? data.chartData.studentsByStatus.map((row) => (
              <div key={row.status} className="flex justify-between border-b py-2 text-sm"><span>{statusLabels[row.status] ?? row.status}</span><strong>{row.count}</strong></div>
            )) : <p className="text-sm text-gray-500">Aucun étudiant enregistré.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Effectifs par programme</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.chartData.studentsByProgram.length ? data.chartData.studentsByProgram.map((row) => (
              <div key={row.name} className="flex justify-between gap-4 border-b py-2 text-sm"><span>{row.name}</span><strong>{row.count}</strong></div>
            )) : <p className="text-sm text-gray-500">Aucun étudiant affecté à un programme.</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Points à traiter</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <p className="rounded-lg bg-amber-50 p-3 text-sm">Notes saisies non verrouillées : <strong>{data.alerts.unvalidatedGrades}</strong></p>
          <p className="rounded-lg bg-amber-50 p-3 text-sm">Paiements en attente : <strong>{data.alerts.pendingPayments}</strong></p>
          <p className="rounded-lg bg-amber-50 p-3 text-sm">Inscrits sans paiement validé : <strong>{data.alerts.studentsWithoutPayment}</strong></p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Accéder aux données détaillées</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {links.map((link) => <Button key={link.view} variant="outline" onClick={() => setView(link.view)}>{link.label}</Button>)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="size-5" />Demandes historiques de rapports</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-gray-500">Ces enregistrements ne contiennent pas de fichier téléchargeable. Pour un document officiel, utilisez « Documents officiels et PV ».</p>
          {reports.isError ? <p className="text-sm text-red-600">Historique indisponible.</p> : history.length ? (
            <ul className="space-y-2">
              {history.map((report) => (
                <li key={report.id} className="flex flex-wrap justify-between gap-2 border-b py-2 text-sm">
                  <span>{report.name}</span>
                  <span className="text-gray-500">{new Date(report.createdAt).toLocaleDateString('fr-FR')} · {report.type} · {report.status}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-gray-500">Aucune demande historique.</p>}
        </CardContent>
      </Card>
    </div>
  )
}

function RectoratReports({ data, isPending, isError, refetch, setView }: {
  data?: OversightData
  isPending: boolean
  isError: boolean
  refetch: () => unknown
  setView: (view: AppView) => void
}) {
  async function download() {
    if (!data) return
    const rows = data.programs.flatMap((program) => program.levels.length
      ? program.levels.map((level) => ({
          Faculté: program.faculty,
          Département: program.department,
          Programme: program.name,
          Cycle: program.cycle,
          Niveau: level.name,
          Étudiants: level.students,
        }))
      : [{
          Faculté: program.faculty,
          Département: program.department,
          Programme: program.name,
          Cycle: program.cycle,
          Niveau: 'Aucun niveau actif',
          Étudiants: program.students,
        }])
    const { exportToExcel } = await import('@/lib/export')
    exportToExcel(rows, `pilotage-rectorat-${new Date().toISOString().slice(0, 10)}`, 'Effectifs')
  }

  if (isPending) {
    return <p role="status" className="p-6 text-gray-600">Chargement du pilotage académique…</p>
  }
  if (isError || !data) {
    return (
      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <AlertTriangle className="size-5 text-red-600" />
          <p>Les indicateurs du rectorat sont momentanément indisponibles.</p>
          <Button variant="outline" onClick={refetch}>Réessayer</Button>
        </CardContent>
      </Card>
    )
  }

  const cards = [
    ['Étudiants', data.totals.students],
    ['Enseignants actifs', data.totals.teachers],
    ['Programmes actifs', data.totals.programs],
    ['Départements', data.totals.departments],
    ['Facultés', data.totals.faculties],
    ['PV officiels', data.totals.signedPvs],
  ] as const

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--institution-primary)]">Pilotage du rectorat</h1>
          <p className="text-sm text-gray-600">Vue institutionnelle en lecture seule{data.academicYear ? ` · année ${data.academicYear.name}` : ''}.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={refetch}><RefreshCw className="mr-2 size-4" />Actualiser</Button>
          <Button onClick={download}><Download className="mr-2 size-4" />Exporter les effectifs</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {cards.map(([label, value]) => (
          <Card key={label}><CardContent className="p-4"><p className="text-xs text-gray-600">{label}</p><p className="mt-2 text-2xl font-bold text-[var(--institution-primary)]">{value}</p></CardContent></Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Effectifs par programme et niveau</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead><tr className="border-b text-left"><th className="py-2">Faculté</th><th>Département</th><th>Programme</th><th>Cycle</th><th className="text-right">Étudiants</th></tr></thead>
              <tbody>{data.programs.map((program) => (
                <tr key={program.id} className="border-b">
                  <td className="py-2">{program.faculty}</td><td>{program.department}</td>
                  <td>{program.name}<div className="text-xs text-gray-500">{program.levels.map((level) => `${level.name}: ${level.students}`).join(' · ') || 'Aucun niveau actif'}</div></td>
                  <td>{program.cycle}</td><td className="text-right font-semibold">{program.students}</td>
                </tr>
              ))}</tbody>
            </table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Statuts étudiants</CardTitle></CardHeader>
          <CardContent className="space-y-2">{data.statuses.map((row) => <div key={row.status} className="flex justify-between border-b py-2 text-sm"><span>{statusLabels[row.status] ?? row.status}</span><strong>{row.count}</strong></div>)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Consultation détaillée</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setView('students')}>Étudiants</Button>
          <Button variant="outline" onClick={() => setView('teachers')}>Enseignants</Button>
          <Button variant="outline" onClick={() => setView('structure')}>Structure</Button>
          <Button variant="outline" onClick={() => setView('documents')}>PV officiels</Button>
        </CardContent>
      </Card>
    </div>
  )
}
