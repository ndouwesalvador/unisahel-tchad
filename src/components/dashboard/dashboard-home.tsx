'use client'

import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { useDashboardStats } from '@/lib/api-hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  GraduationCap,
  BookOpen,
  CreditCard,
  UserPlus,
  FileCheck,
  FileText,
  Calendar,
  Clock,
  Gavel,
  Megaphone,
  AlertTriangle,
  Timer,
  Server,
  Database,
  Wifi,
  Shield,
  Inbox,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

// ─── Quick actions (navigation shortcuts, not data — fine to stay static) ─────

const quickActions = [
  { label: 'Gérer les inscriptions', icon: UserPlus, color: 'var(--institution-secondary)', bgColor: 'var(--institution-secondary-15)', view: 'students' as const },
  { label: 'Ouvrir les notes', icon: FileCheck, color: 'var(--institution-primary)', bgColor: 'var(--institution-primary-15)', view: 'grades' as const },
  { label: 'Documents officiels', icon: FileText, color: 'var(--institution-accent)', bgColor: 'var(--institution-accent-15)', view: 'documents' as const },
  { label: 'Suivi des paiements', icon: CreditCard, color: 'var(--institution-secondary)', bgColor: 'var(--institution-secondary-15)', view: 'payments' as const },
  { label: 'Sessions de jury', icon: Gavel, color: 'var(--institution-primary)', bgColor: 'var(--institution-primary-15)', view: 'deliberation' as const },
  { label: 'Annonces', icon: Megaphone, color: 'var(--institution-accent)', bgColor: 'var(--institution-accent-15)', view: 'announcements' as const },
]

// ─── Real-data label/color mappings (matches students-list.tsx conventions) ──

const statusLabels: Record<string, { label: string; color: string }> = {
  INSCRIT: { label: 'Inscrits', color: 'var(--institution-secondary)' },
  PRE_INSCRIT: { label: 'Pré-inscrits', color: 'var(--institution-accent)' },
  SUSPENDU: { label: 'Suspendus', color: '#ef6c00' },
  EXCLU: { label: 'Exclus', color: '#c62828' },
  DIPLOME: { label: 'Diplômés', color: 'var(--institution-primary)' },
}

const cycleLabels: Record<string, { label: string; color: string }> = {
  LICENCE: { label: 'Licence', color: 'var(--institution-secondary)' },
  MASTER: { label: 'Master', color: 'var(--institution-primary)' },
  DOCTORAT: { label: 'Doctorat', color: 'var(--institution-accent)' },
  AUTRE: { label: 'Non classé', color: '#9ca3af' },
}

const chartPalette = ['var(--institution-secondary)', 'var(--institution-primary)', 'var(--institution-accent)', '#5b8c5a', '#4a6fa5', '#c62828', '#8d6e63', '#0ea5e9']

const alertConfig = {
  unvalidatedGrades: {
    title: 'Notes non validées',
    description: 'Notes saisies en attente de verrouillage',
    icon: FileText,
    severity: 'medium' as const,
  },
  pendingPayments: {
    title: 'Paiements en attente',
    description: 'Paiements saisis non encore validés par la caisse',
    icon: CreditCard,
    severity: 'medium' as const,
  },
  studentsWithoutPayment: {
    title: 'Étudiants sans paiement',
    description: 'Étudiants inscrits sans aucun paiement validé',
    icon: AlertTriangle,
    severity: 'high' as const,
  },
}

interface StudentDashboardResponse {
  isStudentView: true
  isEnrolledForYear: boolean
  isTeacherView?: false
  student: {
    firstName: string
    lastName: string
    matricule: string | null
    status: string
    program: string | null
    level: string | null
  } | null
  stats: {
    moyenneGenerale: number | null
    passingGrade: number
    totalPaid: number
    pendingPaymentsCount: number
    lastPaymentStatus: string | null
  }
  recentActivity: { id: string; type: 'inscription' | 'paiement' | 'annonce'; description: string; time: string; user: string }[]
  upcomingEvents: { id: string; date: string; title: string; type: 'exam' | 'deliberation' }[]
  currentAcademicYear: { id: string; name: string; startDate: string; endDate: string; examSessions: number } | null
}

interface TeacherDashboardResponse {
  isTeacherView: true
  isStudentView?: false
  linked: boolean
  academicYear: { id: string; name: string } | null
  stats: { assignedCourses: number; enteredGrades: number; lockedGrades: number }
  assignments: { id: string; code: string | null; name: string; teachingUnit: string; program: string; level: string; semester: string }[]
  announcements: { id: string; title: string; date: string }[]
}

interface RoleDashboardResponse {
  isRoleView: true
  isStudentView?: false
  isTeacherView?: false
  role: string
  academicYear: { id: string; name: string } | null
  announcements: { id: string; title: string; date: string }[]
}

const roleQuickActions: Record<string, { label: string; view: import('@/lib/store').AppView }[]> = {
  RECTORAT: [{ label: 'Étudiants', view: 'students' }, { label: 'Rapports', view: 'reports' }, { label: 'Documents', view: 'documents' }],
  SCOLARITE: [{ label: 'Étudiants', view: 'students' }, { label: 'Candidatures', view: 'candidature' }, { label: 'Documents', view: 'documents' }, { label: 'Paiements', view: 'payments' }],
  FACULTE: [{ label: 'Étudiants', view: 'students' }, { label: 'Notes', view: 'grades' }, { label: 'Délibérations', view: 'deliberation' }],
  DEPARTEMENT: [{ label: 'Étudiants', view: 'students' }, { label: 'Notes', view: 'grades' }, { label: 'Rapports', view: 'reports' }],
  RESPONSABLE_FILIERE: [{ label: 'Maquettes', view: 'maquette' }, { label: 'Notes', view: 'grades' }, { label: 'Délibérations', view: 'deliberation' }],
  JURY: [{ label: 'Délibérations', view: 'deliberation' }, { label: 'Étudiants', view: 'students' }],
  CAISSE: [{ label: 'Paiements', view: 'payments' }, { label: 'Documents', view: 'documents' }, { label: 'Bourses', view: 'scholarships' }],
  MAITRE_STAGE: [{ label: 'Stages', view: 'internships' }, { label: 'Étudiants', view: 'students' }],
  PARENT: [{ label: 'Paiements', view: 'payments' }],
}

const roleWorkspaces: Record<string, { title: string; description: string; focus: string }> = {
  RECTORAT: { title: 'Pilotage du rectorat', description: 'Suivez les indicateurs globaux et les décisions de l’institution.', focus: 'Pilotage et conformité' },
  SCOLARITE: { title: 'Scolarité centrale', description: 'Gérez les inscriptions, les dossiers, les documents et la chaîne académique.', focus: 'Dossiers et résultats' },
  FACULTE: { title: 'Direction de faculté', description: 'Coordonnez les départements et suivez les activités de votre faculté.', focus: 'Coordination facultaire' },
  DEPARTEMENT: { title: 'Gestion du département', description: 'Organisez les enseignants, les UE, les emplois du temps et les délibérations de votre département.', focus: 'Périmètre départemental' },
  RESPONSABLE_FILIERE: { title: 'Responsable de filière', description: 'Suivez la maquette, les étudiants et les résultats de votre filière.', focus: 'Suivi de filière' },
  JURY: { title: 'Espace du jury', description: 'Préparez, contrôlez et validez les décisions des programmes et niveaux qui vous sont affectés.', focus: 'Délibérations et PV' },
  CAISSE: { title: 'Caisse et recouvrement', description: 'Enregistrez les paiements, contrôlez les validations et éditez les reçus.', focus: 'Paiements et reçus' },
  MAITRE_STAGE: { title: 'Suivi des stages', description: 'Suivez les étudiants qui vous sont confiés et leurs évaluations de stage.', focus: 'Stages et évaluations' },
}

function RoleDashboardHome({ data }: { data: RoleDashboardResponse }) {
  const { user, setView } = useAppStore()
  const links = roleQuickActions[data.role] ?? []
  const workspace = roleWorkspaces[data.role] ?? { title: 'Espace de travail', description: 'Accédez aux fonctions autorisées pour votre rôle.', focus: 'Activités autorisées' }
  return <div className="space-y-5 text-slate-900">
    <Card className="border-emerald-200 bg-emerald-50 shadow-sm"><CardContent className="p-6">
      <p className="text-sm font-bold uppercase tracking-wide text-emerald-900">{workspace.focus}</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-950">{workspace.title}</h1>
      <p className="mt-2 text-sm text-slate-800">{getGreeting()}, {user?.firstName} {user?.lastName}. {workspace.description}</p>
      <p className="mt-3 text-sm font-semibold text-emerald-950">{data.academicYear ? `Année académique ${data.academicYear.name}` : 'Aucune année académique active'}</p>
    </CardContent></Card>
    <Card className="border-slate-200 bg-white"><CardHeader><CardTitle className="text-lg text-slate-950">Accès rapides</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {links.map((link) => <Button key={link.view} variant="outline" onClick={() => setView(link.view)} className="min-h-14 justify-start whitespace-normal border-slate-300 bg-white px-4 text-left text-sm font-semibold text-slate-900 hover:bg-emerald-50 hover:text-slate-950">{link.label}</Button>)}
    </CardContent></Card>
    <Card className="border-slate-200 bg-white"><CardHeader><CardTitle className="text-lg text-slate-950">Annonces publiées</CardTitle></CardHeader><CardContent>
      {data.announcements.length ? <ul className="divide-y divide-slate-200">{data.announcements.map((item) => <li key={item.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span className="font-medium text-slate-950">{item.title}</span><span className="text-slate-700">{formatDateShort(item.date)}</span></li>)}</ul> : <p className="text-sm text-slate-700">Aucune annonce publiée pour le moment.</p>}
    </CardContent></Card>
  </div>
}

// ─── Quick actions for a student's own dashboard ───────────────────────────────

const studentQuickActions = [
  { label: 'Mes Notes', icon: FileCheck, color: 'var(--institution-secondary)', bgColor: 'var(--institution-secondary-15)', view: 'grades' as const },
  { label: 'Mes Documents', icon: FileText, color: 'var(--institution-primary)', bgColor: 'var(--institution-primary-15)', view: 'documents' as const },
  { label: 'Mes Paiements', icon: CreditCard, color: 'var(--institution-accent)', bgColor: 'var(--institution-accent-15)', view: 'payments' as const },
  { label: 'Emploi du temps', icon: Calendar, color: 'var(--institution-secondary)', bgColor: 'var(--institution-secondary-15)', view: 'timetable' as const },
]

function StudentDashboardHome({ data }: { data: StudentDashboardResponse }) {
  const { user, setView } = useAppStore()
  const paymentStatusLabel: Record<string, { label: string; color: string }> = {
    VALIDATED: { label: 'Validé', color: '#166534' },
    PENDING: { label: 'En attente de validation', color: '#92400e' },
    CANCELLED: { label: 'Annulé', color: '#c62828' },
    REFUNDED: { label: 'Remboursé', color: '#c62828' },
  }
  const paymentStatus = data.stats.lastPaymentStatus
    ? paymentStatusLabel[data.stats.lastPaymentStatus] ?? { label: data.stats.lastPaymentStatus, color: '#9ca3af' }
    : { label: 'Aucun paiement enregistré', color: '#475569' }

  return (
    <div className="space-y-6">
      {data.currentAcademicYear && !data.isEnrolledForYear && (
        <div role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-950">
          L’inscription administrative pour {data.currentAcademicYear.name} n’est pas validée. Les notes et l’emploi du temps de cette année ne sont pas encore accessibles.
        </div>
      )}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
          <div className="border-b border-emerald-100 bg-emerald-50 p-6 text-slate-900">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-800">Espace étudiant</p>
            <h1 className="text-2xl font-bold text-slate-950">
              {getGreeting()}, {user?.firstName} {user?.lastName}
            </h1>
            <p className="mt-1 text-sm text-slate-700">
              {data.student?.program ?? 'Programme non affecté'} {data.student?.level ? `· ${data.student.level}` : ''}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {data.currentAcademicYear ? (
                <Badge className="border border-emerald-200 bg-white text-emerald-900 hover:bg-white text-xs">
                  <Calendar className="size-3 mr-1" />
                  Année académique {data.currentAcademicYear.name}
                </Badge>
              ) : (
                <Badge className="border border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-50 text-xs">
                  Aucune année académique active
                </Badge>
              )}
              {data.student?.matricule && (
                <Badge className="border border-slate-200 bg-white text-slate-900 hover:bg-white text-xs">
                  Matricule {data.student.matricule}
                </Badge>
              )}
            </div>
          </div>
          <CardContent className="p-4 pt-3">
            <h3 className="text-sm font-semibold text-[var(--institution-primary)] mb-3">Actions rapides</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {studentQuickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  className="h-auto min-h-24 py-3 w-full flex flex-col items-center gap-2 border-slate-300 bg-white text-slate-900 hover:bg-emerald-50 hover:text-slate-950 focus-visible:ring-emerald-700"
                  onClick={() => setView(action.view)}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: action.bgColor }}>
                    <action.icon className="size-4" style={{ color: action.color }} />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">{action.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Moyenne des notes publiées</p>
            <p className="text-2xl font-bold text-[var(--institution-primary)] mt-1.5">
              {data.stats.moyenneGenerale !== null ? `${data.stats.moyenneGenerale.toFixed(2)}/20` : 'Aucune note'}
            </p>
            <p className="text-xs text-slate-600 mt-1">Session normale · seuil : {data.stats.passingGrade}/20</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Dernier paiement</p>
            <p className="text-lg font-bold mt-1.5" style={{ color: paymentStatus.color }}>{paymentStatus.label}</p>
            <p className="text-xs text-slate-600 mt-1">{data.stats.totalPaid.toLocaleString('fr-FR')} FCFA validés au total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Statut administratif</p>
            <p className="text-lg font-bold text-[var(--institution-primary)] mt-1.5">{statusLabels[data.student?.status ?? '']?.label ?? data.student?.status ?? '—'}</p>
            {data.stats.pendingPaymentsCount > 0 && (
              <p className="text-xs font-medium text-amber-900 mt-1">{data.stats.pendingPaymentsCount} paiement(s) en attente de validation</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[var(--institution-primary)]">Annonces récentes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentActivity.length === 0 ? (
              <EmptyState label="Aucune annonce pour le moment." />
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {data.recentActivity.map((activity, i) => (
                  <div key={activity.id} className={`flex items-start gap-3 px-6 py-3 ${i < data.recentActivity.length - 1 ? 'border-b border-gray-100' : ''}`}>
                    <div className="w-8 h-8 rounded-lg bg-[var(--institution-primary-15)] flex items-center justify-center shrink-0">
                      <Megaphone className="size-4 text-[var(--institution-primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--institution-primary)] truncate">{activity.description}</p>
                      <span className="text-sm text-slate-700">{formatDateShort(activity.time)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[var(--institution-primary)] flex items-center gap-2">
              <Timer className="size-4 text-[var(--institution-accent)]" />
              Examens a venir
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.upcomingEvents.length === 0 ? (
              <EmptyState label="Aucun examen planifié." />
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {data.upcomingEvents.map((event, i) => (
                  <div key={event.id} className={`flex items-start gap-3 px-6 py-3 ${i < data.upcomingEvents.length - 1 ? 'border-b border-gray-100' : ''}`}>
                    <div className="w-10 h-10 rounded-lg bg-[var(--institution-primary-08)] flex flex-col items-center justify-center shrink-0">
                      <Calendar className="size-3 text-[var(--institution-primary)]" />
                      <span className="text-xs font-bold text-[var(--institution-primary)] mt-0.5">{formatDateShort(event.date)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--institution-primary)] font-medium truncate">{event.title}</p>
                      <span className="text-sm font-medium text-amber-900">{formatCountdown(event.date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function TeacherDashboardHome({ data }: { data: TeacherDashboardResponse }) {
  const { user, setView } = useAppStore()
  const links = [
    { label: 'Mes matières', view: 'maquette' as const, icon: BookOpen },
    { label: 'Saisir les notes', view: 'grades' as const, icon: FileCheck },
    { label: 'Emploi du temps', view: 'timetable' as const, icon: Calendar },
  ]

  return (
    <div className="space-y-6 text-slate-900">
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-emerald-800">Espace enseignant</p>
          <h1 className="text-2xl font-bold text-slate-950">{getGreeting()}, {user?.firstName} {user?.lastName}</h1>
          <p className="mt-2 text-sm text-slate-700">{data.academicYear ? `Année académique ${data.academicYear.name}` : 'Aucune année académique active'}</p>
          {!data.linked && (
            <p role="status" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-950">
              Votre compte n’est pas encore relié à une fiche enseignant active. Demandez à l’administration de vérifier cette affectation.
            </p>
          )}
          {data.linked && data.assignments.length === 0 && (
            <p role="status" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-950">
              Aucun service d’enseignement approuvé pour cette année. Le département doit vous affecter une matière ; une intervention extérieure peut ensuite nécessiter l’accord de votre département de rattachement.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ['Services approuvés', data.stats.assignedCourses],
          ['Notes complètes', data.stats.enteredGrades],
          ['Notes publiées', data.stats.lockedGrades],
        ].map(([label, value]) => (
          <Card key={label} className="border-slate-200 bg-white"><CardContent className="p-5"><p className="text-sm font-semibold text-slate-600">{label}</p><p className="mt-2 text-3xl font-bold text-slate-950">{value}</p></CardContent></Card>
        ))}
      </div>

      {data.assignments.length > 0 && <Card className="border-slate-200 bg-white">
        <CardHeader><CardTitle className="text-lg text-slate-950">Actions rapides</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {links.map((link) => <Button key={link.view} variant="outline" className="h-12 justify-start border-slate-300 bg-white text-sm font-semibold text-slate-900 hover:bg-emerald-50 hover:text-slate-950" onClick={() => setView(link.view)}><link.icon className="mr-2 size-4 text-emerald-800" />{link.label}</Button>)}
        </CardContent>
      </Card>}

      <Card className="border-slate-200 bg-white">
        <CardHeader><CardTitle className="text-lg text-slate-950">Mes services approuvés</CardTitle></CardHeader>
        <CardContent>
          {data.assignments.length ? <ul className="divide-y divide-slate-200">
            {data.assignments.map((element) => <li key={element.id} className="py-3">
              <p className="font-semibold text-slate-950">{element.code ? `${element.code} · ` : ''}{element.name}</p>
              <p className="mt-1 text-sm text-slate-700">{element.teachingUnit} · {element.program} · {element.level} · {element.semester}</p>
            </li>)}
          </ul> : <p className="text-sm text-slate-700">Aucun service d’enseignement approuvé pour cette année. Le département doit vous affecter une matière ; les interventions inter-départements suivent le circuit d’accord prévu.</p>}
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-white">
        <CardHeader><CardTitle className="text-lg text-slate-950">Annonces de l’établissement</CardTitle></CardHeader>
        <CardContent>
          {data.announcements.length ? <ul className="divide-y divide-slate-200">{data.announcements.map((announcement) => <li key={announcement.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span className="font-medium text-slate-900">{announcement.title}</span><span className="text-slate-600">{formatDateShort(announcement.date)}</span></li>)}</ul> : <p className="text-sm text-slate-700">Aucune annonce publiée.</p>}
        </CardContent>
      </Card>
    </div>
  )
}

interface DashboardApiResponse {
  isStudentView?: false
  isTeacherView?: false
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
  recentActivity: { id: string; type: 'inscription' | 'paiement' | 'annonce'; description: string; time: string; user: string }[]
  alerts: { unvalidatedGrades: number; pendingPayments: number; studentsWithoutPayment: number }
  upcomingEvents: { id: string; date: string; title: string; type: 'exam' | 'deliberation' }[]
  currentAcademicYear: { id: string; name: string; startDate: string; endDate: string; examSessions: number } | null
}

// ─── Time-of-day greeting ─────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Bonjour'
  if (hour >= 12 && hour < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

function formatDateShort(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function formatCountdown(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now()
  const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
  if (days === 0) return "aujourd'hui"
  if (days === 1) return 'demain'
  return `${days} jours`
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-2">
        <Inbox className="size-5 text-slate-700" />
      </div>
      <p className="text-sm text-slate-700">{label}</p>
    </div>
  )
}

// ─── Floating Shape Component ─────────────────────────────────────────────────

function FloatingShape({ className, delay = 0, children }: { className?: string; delay?: number; children?: React.ReactNode }) {
  return (
    <motion.div
      className={className}
      animate={{
        y: [0, -12, 0],
        rotate: [0, 8, 0],
      }}
      transition={{
        duration: 6,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
    >
      {children}
    </motion.div>
  )
}

// ─── Pulsing Dot Component ────────────────────────────────────────────────────

function PulsingDot({ color = 'var(--institution-secondary)' }: { color?: string }) {
  return (
    <span className="relative flex size-2.5">
      <span
        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
        style={{ backgroundColor: color }}
      />
      <span
        className="relative inline-flex size-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
    </span>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardHome() {
  const { user, setView, selectedAcademicYearId } = useAppStore()
  const { data, isLoading, isError, refetch } = useDashboardStats(selectedAcademicYearId) as {
    data: DashboardApiResponse | StudentDashboardResponse | TeacherDashboardResponse | RoleDashboardResponse | undefined
    isLoading: boolean
    isError: boolean
    refetch: () => void
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 rounded-full border-4 border-t-[var(--institution-secondary)] border-[var(--institution-secondary-20)] animate-spin mb-4" />
          <p className="text-[var(--institution-primary)] font-medium">Chargement du tableau de bord...</p>
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return <Card><CardContent className="flex flex-wrap items-center gap-4 p-6 text-slate-900"><p>Impossible de charger le tableau de bord.</p><Button variant="outline" onClick={() => refetch()}>Réessayer</Button></CardContent></Card>
  }

  if (data.isStudentView) {
    return <StudentDashboardHome data={data} />
  }
  if (data.isTeacherView) return <TeacherDashboardHome data={data} />
  if ('isRoleView' in data) return <RoleDashboardHome data={data} />

  const statsCards = [
    { title: 'Dossiers étudiants', value: data.statsCards.totalStudents.toLocaleString('fr-FR'), icon: Users, color: 'var(--institution-secondary)', bgColor: 'var(--institution-secondary-15)' },
    { title: 'Enseignants', value: data.statsCards.totalTeachers.toLocaleString('fr-FR'), icon: GraduationCap, color: 'var(--institution-primary)', bgColor: 'var(--institution-primary-15)' },
    { title: 'Programmes', value: data.statsCards.totalPrograms.toLocaleString('fr-FR'), icon: BookOpen, color: 'var(--institution-accent)', bgColor: 'var(--institution-accent-15)' },
    { title: 'Paiements reçus', value: `${data.statsCards.totalPaymentsAmount.toLocaleString('fr-FR')} FCFA`, icon: CreditCard, color: 'var(--institution-secondary)', bgColor: 'var(--institution-secondary-15)' },
  ]

  const filiereData = data.chartData.studentsByProgram.map((p, i) => ({
    name: p.name,
    etudiants: p.count,
    color: chartPalette[i % chartPalette.length],
  }))

  const studentStatusData = data.chartData.studentsByStatus.map((s) => ({
    name: statusLabels[s.status]?.label ?? s.status,
    value: s.count,
    color: statusLabels[s.status]?.color ?? '#9ca3af',
  }))

  const cycleData = data.chartData.studentsByCycle.map((c) => ({
    name: cycleLabels[c.cycle]?.label ?? c.cycle,
    value: c.count,
    color: cycleLabels[c.cycle]?.color ?? '#9ca3af',
  }))

  const reussiteData = data.chartData.successRateByProgram.map((p, i) => ({
    name: p.name,
    taux: p.rate,
    color: chartPalette[i % chartPalette.length],
  }))

  const alerts = (Object.entries(data.alerts) as [keyof typeof alertConfig, number][])
    .map(([key, count]) => ({ key, count, ...alertConfig[key] }))

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'inscription': return <UserPlus className="size-4 text-[var(--institution-secondary)]" />
      case 'paiement': return <CreditCard className="size-4 text-[var(--institution-accent)]" />
      case 'annonce': return <Megaphone className="size-4 text-[var(--institution-primary)]" />
      default: return <div className="size-4 rounded-full bg-gray-300" />
    }
  }

  const getActivityBgColor = (type: string) => {
    switch (type) {
      case 'inscription': return 'bg-[var(--institution-secondary-15)]'
      case 'paiement': return 'bg-[var(--institution-accent-15)]'
      case 'annonce': return 'bg-[var(--institution-primary-15)]'
      default: return 'bg-gray-100'
    }
  }

  const getActivityBadge = (type: string) => {
    switch (type) {
      case 'inscription': return <Badge className="bg-[var(--institution-secondary-15)] text-[var(--institution-secondary)] text-[10px] border-0 hover:bg-[var(--institution-secondary-15)]">Inscription</Badge>
      case 'paiement': return <Badge className="bg-[var(--institution-accent-15)] text-[var(--institution-accent)] text-[10px] border-0 hover:bg-[var(--institution-accent-15)]">Paiement</Badge>
      case 'annonce': return <Badge className="bg-[var(--institution-primary-15)] text-[var(--institution-primary)] text-[10px] border-0 hover:bg-[var(--institution-primary-15)]">Annonce</Badge>
      default: return null
    }
  }

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'deliberation': return <Badge className="bg-[var(--institution-primary-15)] text-[var(--institution-primary)] text-[10px] border-0 hover:bg-[var(--institution-primary-15)]">Délibération</Badge>
      case 'exam': return <Badge className="bg-[#c6282815] text-[#c62828] text-[10px] border-0 hover:bg-[#c6282815]">Examen</Badge>
      default: return null
    }
  }

  const getAlertStyle = (severity: 'high' | 'medium') => {
    return severity === 'high'
      ? { border: 'border-l-[#c62828]', iconBg: 'bg-[#c6282815]', iconColor: 'text-[#c62828]', countColor: 'text-[#c62828]', shimmerFrom: '#c62828', shimmerTo: '#ef5350' }
      : { border: 'border-l-[var(--institution-accent)]', iconBg: 'bg-[var(--institution-accent-15)]', iconColor: 'text-[var(--institution-accent)]', countColor: 'text-[var(--institution-accent)]', shimmerFrom: 'var(--institution-accent)', shimmerTo: '#f0c674' }
  }

  return (
    <div className="space-y-6">
      {/* ── University Branding Card + Welcome Section ── */}
      <div className="grid grid-cols-1 gap-4">
        {/* University Logo & Branding Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="hidden"
        >
          <Card className="h-full overflow-hidden">
            <div className="bg-gradient-to-br from-[var(--institution-primary)] via-[var(--institution-primary-light)] to-[var(--institution-secondary)] p-4 text-white flex flex-col items-center justify-center text-center h-full min-h-[120px] relative">
              {/* Decorative hexagons */}
              <div className="absolute top-2 right-2 opacity-[0.06]">
                <svg width="40" height="40" viewBox="0 0 40 40">
                  <polygon points="20,2 36,11 36,29 20,38 4,29 4,11" fill="white" />
                </svg>
              </div>
              <div className="absolute bottom-2 left-2 opacity-[0.06]">
                <svg width="28" height="28" viewBox="0 0 40 40">
                  <polygon points="20,2 36,11 36,29 20,38 4,29 4,11" fill="white" />
                </svg>
              </div>
              {/* Shield / Logo placeholder */}
              <div className="w-14 h-14 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center mb-2 border border-white/20">
                <Shield className="size-7 text-[var(--institution-accent)]" />
              </div>
              <h3 className="text-sm font-bold leading-tight">{user?.tenantName || 'Votre établissement'}</h3>
            </div>
          </Card>
        </motion.div>

        {/* Enhanced Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="min-w-0"
        >
          <Card className="overflow-hidden">
            <div className="relative overflow-hidden">
              {/* Animated gradient background */}
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(135deg, var(--institution-primary) 0%, var(--institution-primary-light) 25%, var(--institution-secondary) 50%, var(--institution-primary-light) 75%, var(--institution-primary) 100%)',
                  backgroundSize: '300% 300%',
                  animation: 'gradientShift 8s ease infinite',
                }}
              />

              {/* Decorative floating shapes */}
              <FloatingShape
                className="absolute top-4 right-16 w-16 h-16 rounded-full bg-white opacity-[0.05]"
                delay={0}
              />
              <FloatingShape
                className="absolute top-8 right-48 w-10 h-10 opacity-[0.07]"
                delay={2}
              >
                <svg viewBox="0 0 40 40" width="40" height="40">
                  <polygon points="20,2 36,11 36,29 20,38 4,29 4,11" fill="white" />
                </svg>
              </FloatingShape>
              <FloatingShape
                className="absolute bottom-6 right-24 w-20 h-20 rounded-full bg-white opacity-[0.04]"
                delay={4}
              />
              <FloatingShape
                className="absolute top-2 right-72 w-8 h-8 opacity-[0.06]"
                delay={1}
              >
                <svg viewBox="0 0 40 40" width="32" height="32">
                  <polygon points="20,2 36,11 36,29 20,38 4,29 4,11" fill="white" />
                </svg>
              </FloatingShape>

              {/* Content */}
              <div className="relative p-6 pb-10 text-white">
                <h1 className="text-2xl font-bold">
                  {getGreeting()}, {user?.firstName} {user?.lastName}
                </h1>
                <p className="mt-1 text-sm text-white">
                  Vue d’ensemble de votre établissement
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {data.currentAcademicYear ? (
                    <>
                      <motion.div
                        animate={{ scale: [1, 1.03, 1] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <Badge className="bg-white/20 text-white border-0 hover:bg-white/20 text-xs backdrop-blur-sm">
                          <Calendar className="size-3 mr-1" />
                          Année académique {data.currentAcademicYear.name}
                        </Badge>
                      </motion.div>
                      <motion.div
                        animate={{ scale: [1, 1.03, 1] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                      >
                        <Badge className="bg-white/20 text-white border-0 hover:bg-white/20 text-xs backdrop-blur-sm">
                          <GraduationCap className="size-3 mr-1" />
                          {data.currentAcademicYear.examSessions} session(s) d&apos;examen
                        </Badge>
                      </motion.div>
                    </>
                  ) : (
                    <Badge className="bg-white/20 text-white border-0 hover:bg-white/20 text-xs backdrop-blur-sm">
                      <Calendar className="size-3 mr-1" />
                      Aucune année académique active. Configurez-en une dans Structure.
                    </Badge>
                  )}
                </div>
              </div>

              {/* Wave SVG divider */}
              <div className="absolute bottom-0 left-0 right-0">
                <svg viewBox="0 0 1200 40" preserveAspectRatio="none" className="w-full h-4">
                  <path
                    d="M0,20 C150,40 350,0 500,20 C650,40 850,0 1000,20 C1100,30 1150,25 1200,20 L1200,40 L0,40 Z"
                    fill="white"
                    fillOpacity="1"
                  />
                </svg>
              </div>
            </div>

            {/* Enhanced Quick Actions */}
            <CardContent className="p-4 pt-2">
              <h3 className="text-sm font-semibold text-[var(--institution-primary)] mb-3">Actions rapides</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {quickActions.map((action) => (
                  <motion.div
                    key={action.label}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Button
                      variant="outline"
                      className="h-auto min-h-16 w-full flex-row justify-start gap-3 whitespace-normal border-slate-300 bg-white px-4 py-3 text-left text-slate-900 hover:border-emerald-500 hover:bg-emerald-50 hover:text-slate-950 group relative overflow-hidden"
                      onClick={() => setView(action.view)}
                    >
                      {/* Gradient background on hover */}
                      <div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{
                          background: `linear-gradient(135deg, ${action.color}12, ${action.color}25)`,
                        }}
                      />
                      <div className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:rotate-6" style={{ backgroundColor: action.bgColor }}>
                        <action.icon className="size-4 transition-transform duration-300 group-hover:scale-110" style={{ color: action.color }} />
                      </div>
                      <span className="relative z-10 text-sm font-semibold text-slate-900">{action.label}</span>
                    </Button>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Stats Cards ── */}
      <p className="text-sm text-slate-700">Indicateurs cumulés de l’institution, toutes années académiques confondues. L’année sélectionnée dans l’en-tête ne filtre pas cette synthèse.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.1 }}
            whileHover={{ scale: 1.02 }}
            className="group"
          >
            <Card className="hover:shadow-lg transition-all duration-300 relative overflow-hidden">
              {/* Gradient border-left */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                style={{
                  background: `linear-gradient(180deg, ${stat.color}, ${stat.color}88)`,
                }}
              />
              {/* Subtle background gradient */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: `linear-gradient(135deg, white, ${stat.color}08)`,
                }}
              />
              <CardContent className="p-4 relative">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <PulsingDot color={stat.color} />
                      <p className="text-sm font-semibold text-slate-700">{stat.title}</p>
                    </div>
                    <p className="text-2xl font-bold text-[var(--institution-primary)] mt-1.5">{stat.value}</p>
                  </div>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: stat.bgColor }}
                  >
                    <stat.icon className="size-5" style={{ color: stat.color }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ── Charts Row 1: Bar + Pie ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Filiere */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-[var(--institution-primary)]">
              Répartition par filière
            </CardTitle>
            <p className="text-sm text-slate-700">Effectif étudiant par programme. Les noms complets figurent sous le graphique.</p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {filiereData.length === 0 ? (
                <EmptyState label="Aucun étudiant affecté à un programme pour le moment." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filiereData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" hide />
                    <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [`${value} étudiants`, 'Effectif']}
                    />
                    <Legend />
                    <Bar dataKey="etudiants" name="Étudiants" radius={[4, 4, 0, 0]}>
                      {filiereData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            {filiereData.length > 0 && <ul className="mt-4 divide-y divide-slate-200">{filiereData.map((item) => <li key={item.name} className="flex items-start justify-between gap-3 py-2 text-sm"><span className="break-words font-medium text-slate-900">{item.name}</span><span className="shrink-0 font-bold text-slate-950">{item.etudiants}</span></li>)}</ul>}
          </CardContent>
        </Card>

        {/* Donut Chart - Statut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-[var(--institution-primary)]">
              Statut des étudiants
            </CardTitle>
            <p className="text-sm text-slate-700">Répartition par statut administratif</p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {studentStatusData.length === 0 ? (
                <EmptyState label="Aucun étudiant enregistré pour le moment." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={studentStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      label={false}
                    >
                      {studentStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [`${value}`, 'Étudiants']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            {studentStatusData.length > 0 && <ul className="mt-4 divide-y divide-slate-200">{studentStatusData.map((item) => <li key={item.name} className="flex justify-between gap-3 py-2 text-sm"><span className="font-medium text-slate-900">{item.name}</span><span className="font-bold text-slate-950">{item.value}</span></li>)}</ul>}
          </CardContent>
        </Card>
      </div>

      {/* ── Charts Row 2: Cycle Donut + Taux Reussite Horizontal Bar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut - Cycle */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-[var(--institution-primary)]">
              Répartition par cycle
            </CardTitle>
            <p className="text-sm text-slate-700">Licence, Master, Doctorat</p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {cycleData.length === 0 ? (
                <EmptyState label="Aucun étudiant affecté à un programme pour le moment." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={cycleData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      label={false}
                    >
                      {cycleData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [`${value}`, 'Étudiants']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            {cycleData.length > 0 && <ul className="mt-4 divide-y divide-slate-200">{cycleData.map((item) => <li key={item.name} className="flex justify-between gap-3 py-2 text-sm"><span className="font-medium text-slate-900">{item.name}</span><span className="font-bold text-slate-950">{item.value}</span></li>)}</ul>}
          </CardContent>
        </Card>

        {/* Horizontal Bar - Taux de reussite par filiere */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-[var(--institution-primary)]">
              Notes au-dessus du seuil par programme
            </CardTitle>
            <p className="text-sm text-slate-700">Part des notes saisies au-dessus du seuil de passage, par programme. Ce n’est pas un taux de diplomation.</p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {reussiteData.length === 0 ? (
                <EmptyState label="Aucune note saisie pour le moment." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reussiteData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(v: number) => `${v}%`} />
                    <YAxis type="category" dataKey="name" hide />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [`${value}%`, 'Notes au-dessus du seuil']}
                    />
                    <Legend />
                    <Bar dataKey="taux" name="Taux (%)" radius={[0, 4, 4, 0]} barSize={20}>
                      {reussiteData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            {reussiteData.length > 0 && <ul className="mt-4 divide-y divide-slate-200">{reussiteData.map((item) => <li key={item.name} className="flex items-start justify-between gap-3 py-2 text-sm"><span className="break-words font-medium text-slate-900">{item.name}</span><span className="shrink-0 font-bold text-slate-950">{item.taux} %</span></li>)}</ul>}
          </CardContent>
        </Card>
      </div>

      {/* ── Alerts Section ── */}
      <div>
        <h2 className="text-base font-semibold text-[var(--institution-primary)] mb-3 flex items-center gap-2">
          <AlertTriangle className="size-4 text-[var(--institution-accent)]" />
          Alertes et notifications
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {alerts.map((alert, alertIdx) => {
            const style = getAlertStyle(alert.severity)
            return (
              <motion.div
                key={alert.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: alertIdx * 0.1 }}
              >
                <Card className="border-l-4 overflow-hidden relative group" style={{ borderLeftColor: style.shimmerFrom }}>
                  {/* Animated gradient shimmer on the severity border */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 overflow-hidden"
                    style={{
                      background: `linear-gradient(180deg, ${style.shimmerFrom}, ${style.shimmerTo}, ${style.shimmerFrom})`,
                      backgroundSize: '100% 200%',
                      animation: 'shimmerBorder 3s ease infinite',
                    }}
                  />
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl ${style.iconBg} flex items-center justify-center shrink-0`}>
                        <alert.icon className={`size-5 ${style.iconColor}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-[var(--institution-primary)]">{alert.title}</p>
                          <motion.span
                            className={`text-2xl font-bold ${style.countColor}`}
                            animate={alert.count > 0 && alert.severity === 'high' ? { scale: [1, 1.08, 1] } : {}}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                          >
                            {alert.count}
                          </motion.span>
                        </div>
                        <p className="mt-1 text-sm text-slate-700">{alert.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* ── System Status Card + Recent Activity + Upcoming Events ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* System Status Card — only shows facts that are true if this page rendered */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-[var(--institution-primary)] flex items-center gap-2">
                <Server className="size-4 text-[var(--institution-secondary)]" />
                État du système
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Server Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wifi className="size-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Serveur</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <PulsingDot color="var(--institution-secondary)" />
                  <span className="text-xs font-medium text-[var(--institution-secondary)]">En ligne</span>
                </div>
              </div>

              {/* DB Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="size-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Base de données</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <PulsingDot color="var(--institution-secondary)" />
                  <span className="text-xs font-medium text-[var(--institution-secondary)]">Connectée</span>
                </div>
              </div>

              <p className="border-t border-gray-100 pt-2 text-sm text-slate-700">
                Ces indicateurs reflètent l&apos;état au chargement de cette page.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Enhanced Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[var(--institution-primary)]">Activité récente</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentActivity.length === 0 ? (
              <EmptyState label="Aucune activité récente." />
            ) : (
              <div className="max-h-96 overflow-y-auto relative">
                {/* Timeline connecting line */}
                <div className="absolute left-[33px] top-4 bottom-4 w-px bg-gradient-to-b from-[var(--institution-primary-15)] via-[var(--institution-secondary-20)] to-[var(--institution-accent-15)]" />
                {data.recentActivity.map((activity, i) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.05 }}
                    className={`flex items-start gap-3 px-6 py-3 hover:bg-gray-50/80 transition-colors relative ${i < data.recentActivity.length - 1 ? 'border-b border-gray-100' : ''}`}
                  >
                    {/* Timeline dot */}
                    <div className="absolute left-[30px] top-4 w-2 h-2 rounded-full bg-white border-2 border-[var(--institution-primary-30)] z-10" />
                    <div className={`w-8 h-8 rounded-lg ${getActivityBgColor(activity.type)} flex items-center justify-center shrink-0 mt-0.5 ml-6`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--institution-primary)] truncate">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {getActivityBadge(activity.type)}
                        <span className="text-sm text-slate-700">{activity.user}</span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-sm text-slate-700">{formatDateShort(activity.time)}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enhanced Upcoming Events with slide-in */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[var(--institution-primary)] flex items-center gap-2">
              <Timer className="size-4 text-[var(--institution-accent)]" />
              Événements à venir
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.upcomingEvents.length === 0 ? (
              <EmptyState label="Aucun événement planifié." />
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {data.upcomingEvents.map((event, i) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.08 }}
                    className={`flex items-start gap-3 px-6 py-3 hover:bg-gray-50/80 transition-colors ${i < data.upcomingEvents.length - 1 ? 'border-b border-gray-100' : ''}`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-[var(--institution-primary-08)] flex flex-col items-center justify-center shrink-0">
                      <Calendar className="size-3 text-[var(--institution-primary)]" />
                          <span className="text-xs font-bold text-[var(--institution-primary)] mt-0.5">{formatDateShort(event.date)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--institution-primary)] font-medium truncate">{event.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {getEventBadge(event.type)}
                        <span className="flex items-center gap-1 text-sm font-medium text-amber-900">
                          <Clock className="size-2.5" />
                          {formatCountdown(event.date)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── CSS Keyframes for animations ── */}
      <style jsx global>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes shimmerBorder {
          0% { background-position: 0% 0%; }
          50% { background-position: 0% 100%; }
          100% { background-position: 0% 0%; }
        }
      `}</style>
    </div>
  )
}
