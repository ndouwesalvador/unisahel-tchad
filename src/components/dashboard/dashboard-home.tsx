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
  { label: 'Nouvelle inscription', icon: UserPlus, color: '#2d7a4f', bgColor: '#2d7a4f15', view: 'students' as const },
  { label: 'Saisir les notes', icon: FileCheck, color: '#1a2744', bgColor: '#1a274415', view: 'grades' as const },
  { label: 'Generer un releve', icon: FileText, color: '#d4a853', bgColor: '#d4a85315', view: 'documents' as const },
  { label: 'Ajouter un paiement', icon: CreditCard, color: '#2d7a4f', bgColor: '#2d7a4f15', view: 'payments' as const },
  { label: 'Planifier un jury', icon: Gavel, color: '#1a2744', bgColor: '#1a274415', view: 'deliberation' as const },
  { label: 'Envoyer une annonce', icon: Megaphone, color: '#d4a853', bgColor: '#d4a85315', view: 'announcements' as const },
]

// ─── Real-data label/color mappings (matches students-list.tsx conventions) ──

const statusLabels: Record<string, { label: string; color: string }> = {
  INSCRIT: { label: 'Inscrits', color: '#2d7a4f' },
  PRE_INSCRIT: { label: 'Pré-inscrits', color: '#d4a853' },
  SUSPENDU: { label: 'Suspendus', color: '#ef6c00' },
  EXCLU: { label: 'Exclus', color: '#c62828' },
  DIPLOME: { label: 'Diplômés', color: '#1a2744' },
}

const cycleLabels: Record<string, { label: string; color: string }> = {
  LICENCE: { label: 'Licence', color: '#2d7a4f' },
  MASTER: { label: 'Master', color: '#1a2744' },
  DOCTORAT: { label: 'Doctorat', color: '#d4a853' },
  AUTRE: { label: 'Non classé', color: '#9ca3af' },
}

const chartPalette = ['#2d7a4f', '#1a2744', '#d4a853', '#5b8c5a', '#4a6fa5', '#c62828', '#8d6e63', '#0ea5e9']

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

// ─── Quick actions for a student's own dashboard ───────────────────────────────

const studentQuickActions = [
  { label: 'Mes Notes', icon: FileCheck, color: '#2d7a4f', bgColor: '#2d7a4f15', view: 'grades' as const },
  { label: 'Mes Documents', icon: FileText, color: '#1a2744', bgColor: '#1a274415', view: 'documents' as const },
  { label: 'Mes Paiements', icon: CreditCard, color: '#d4a853', bgColor: '#d4a85315', view: 'payments' as const },
  { label: 'Emploi du temps', icon: Calendar, color: '#2d7a4f', bgColor: '#2d7a4f15', view: 'timetable' as const },
]

function StudentDashboardHome({ data }: { data: StudentDashboardResponse }) {
  const { user, setView } = useAppStore()
  const paymentStatusLabel: Record<string, { label: string; color: string }> = {
    VALIDATED: { label: 'A jour', color: '#2d7a4f' },
    PENDING: { label: 'En attente de validation', color: '#d4a853' },
    CANCELLED: { label: 'Annule', color: '#c62828' },
    REFUNDED: { label: 'Rembourse', color: '#c62828' },
  }
  const paymentStatus = data.stats.lastPaymentStatus
    ? paymentStatusLabel[data.stats.lastPaymentStatus] ?? { label: data.stats.lastPaymentStatus, color: '#9ca3af' }
    : { label: 'Aucun paiement enregistre', color: '#9ca3af' }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card className="overflow-hidden">
          <div
            className="relative p-6 text-white"
            style={{ background: 'linear-gradient(135deg, #1a2744 0%, #1f3050 50%, #2d7a4f 100%)' }}
          >
            <h1 className="text-2xl font-bold">
              {getGreeting()}, {user?.firstName} {user?.lastName}
            </h1>
            <p className="text-white/70 mt-1">
              {data.student?.program ?? 'Programme non affecte'} {data.student?.level ? `- ${data.student.level}` : ''}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {data.currentAcademicYear ? (
                <Badge className="bg-white/20 text-white border-0 hover:bg-white/20 text-xs backdrop-blur-sm">
                  <Calendar className="size-3 mr-1" />
                  Annee academique {data.currentAcademicYear.name}
                </Badge>
              ) : (
                <Badge className="bg-white/20 text-white border-0 hover:bg-white/20 text-xs backdrop-blur-sm">
                  Aucune annee academique active
                </Badge>
              )}
              {data.student?.matricule && (
                <Badge className="bg-white/20 text-white border-0 hover:bg-white/20 text-xs backdrop-blur-sm">
                  Matricule {data.student.matricule}
                </Badge>
              )}
            </div>
          </div>
          <CardContent className="p-4 pt-3">
            <h3 className="text-sm font-semibold text-[#1a2744] mb-3">Actions rapides</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {studentQuickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  className="h-auto py-3 w-full flex flex-col items-center gap-2"
                  onClick={() => setView(action.view)}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: action.bgColor }}>
                    <action.icon className="size-4" style={{ color: action.color }} />
                  </div>
                  <span className="text-[11px] font-medium text-gray-600">{action.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Moyenne generale</p>
            <p className="text-2xl font-bold text-[#1a2744] mt-1.5">
              {data.stats.moyenneGenerale !== null ? `${data.stats.moyenneGenerale.toFixed(2)}/20` : 'Aucune note'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Seuil de passage : {data.stats.passingGrade}/20</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Statut des paiements</p>
            <p className="text-lg font-bold mt-1.5" style={{ color: paymentStatus.color }}>{paymentStatus.label}</p>
            <p className="text-xs text-gray-400 mt-1">{data.stats.totalPaid.toLocaleString('fr-FR')} FCFA verses au total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Statut administratif</p>
            <p className="text-lg font-bold text-[#1a2744] mt-1.5">{statusLabels[data.student?.status ?? '']?.label ?? data.student?.status ?? '—'}</p>
            {data.stats.pendingPaymentsCount > 0 && (
              <p className="text-xs text-[#d4a853] mt-1">{data.stats.pendingPaymentsCount} paiement(s) en attente de validation</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[#1a2744]">Annonces recentes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentActivity.length === 0 ? (
              <EmptyState label="Aucune annonce pour le moment." />
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {data.recentActivity.map((activity, i) => (
                  <div key={activity.id} className={`flex items-start gap-3 px-6 py-3 ${i < data.recentActivity.length - 1 ? 'border-b border-gray-100' : ''}`}>
                    <div className="w-8 h-8 rounded-lg bg-[#1a274415] flex items-center justify-center shrink-0">
                      <Megaphone className="size-4 text-[#1a2744]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#1a2744] truncate">{activity.description}</p>
                      <span className="text-xs text-gray-400">{formatDateShort(activity.time)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[#1a2744] flex items-center gap-2">
              <Timer className="size-4 text-[#d4a853]" />
              Examens a venir
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.upcomingEvents.length === 0 ? (
              <EmptyState label="Aucun examen planifie." />
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {data.upcomingEvents.map((event, i) => (
                  <div key={event.id} className={`flex items-start gap-3 px-6 py-3 ${i < data.upcomingEvents.length - 1 ? 'border-b border-gray-100' : ''}`}>
                    <div className="w-10 h-10 rounded-lg bg-[#1a274408] flex flex-col items-center justify-center shrink-0">
                      <Calendar className="size-3 text-[#1a2744]" />
                      <span className="text-[9px] font-bold text-[#1a2744] mt-0.5">{formatDateShort(event.date)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#1a2744] font-medium truncate">{event.title}</p>
                      <span className="text-[10px] text-[#d4a853] font-medium">{formatCountdown(event.date)}</span>
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

interface DashboardApiResponse {
  isStudentView?: false
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
  if (hour >= 12 && hour < 18) return 'Bon apres-midi'
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
      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mb-2">
        <Inbox className="size-5 text-gray-400" />
      </div>
      <p className="text-sm text-gray-400">{label}</p>
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

function PulsingDot({ color = '#2d7a4f' }: { color?: string }) {
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
  const { user, setView } = useAppStore()
  const { data, isLoading } = useDashboardStats() as {
    data: DashboardApiResponse | StudentDashboardResponse | undefined
    isLoading: boolean
  }

  if (isLoading || !data) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 rounded-full border-4 border-t-[#2d7a4f] border-[#2d7a4f20] animate-spin mb-4" />
          <p className="text-[#1a2744] font-medium">Chargement du tableau de bord...</p>
        </div>
      </div>
    )
  }

  if (data.isStudentView) {
    return <StudentDashboardHome data={data} />
  }

  const statsCards = [
    { title: 'Etudiants inscrits', value: data.statsCards.totalStudents.toLocaleString('fr-FR'), icon: Users, color: '#2d7a4f', bgColor: '#2d7a4f15' },
    { title: 'Enseignants', value: data.statsCards.totalTeachers.toLocaleString('fr-FR'), icon: GraduationCap, color: '#1a2744', bgColor: '#1a274415' },
    { title: 'Programmes', value: data.statsCards.totalPrograms.toLocaleString('fr-FR'), icon: BookOpen, color: '#d4a853', bgColor: '#d4a85315' },
    { title: 'Paiements recus', value: `${data.statsCards.totalPaymentsAmount.toLocaleString('fr-FR')} FCFA`, icon: CreditCard, color: '#2d7a4f', bgColor: '#2d7a4f15' },
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
      case 'inscription': return <UserPlus className="size-4 text-[#2d7a4f]" />
      case 'paiement': return <CreditCard className="size-4 text-[#d4a853]" />
      case 'annonce': return <Megaphone className="size-4 text-[#1a2744]" />
      default: return <div className="size-4 rounded-full bg-gray-300" />
    }
  }

  const getActivityBgColor = (type: string) => {
    switch (type) {
      case 'inscription': return 'bg-[#2d7a4f15]'
      case 'paiement': return 'bg-[#d4a85315]'
      case 'annonce': return 'bg-[#1a274415]'
      default: return 'bg-gray-100'
    }
  }

  const getActivityBadge = (type: string) => {
    switch (type) {
      case 'inscription': return <Badge className="bg-[#2d7a4f15] text-[#2d7a4f] text-[10px] border-0 hover:bg-[#2d7a4f15]">Inscription</Badge>
      case 'paiement': return <Badge className="bg-[#d4a85315] text-[#d4a853] text-[10px] border-0 hover:bg-[#d4a85315]">Paiement</Badge>
      case 'annonce': return <Badge className="bg-[#1a274415] text-[#1a2744] text-[10px] border-0 hover:bg-[#1a274415]">Annonce</Badge>
      default: return null
    }
  }

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'deliberation': return <Badge className="bg-[#1a274415] text-[#1a2744] text-[10px] border-0 hover:bg-[#1a274415]">Deliberation</Badge>
      case 'exam': return <Badge className="bg-[#c6282815] text-[#c62828] text-[10px] border-0 hover:bg-[#c6282815]">Examen</Badge>
      default: return null
    }
  }

  const getAlertStyle = (severity: 'high' | 'medium') => {
    return severity === 'high'
      ? { border: 'border-l-[#c62828]', iconBg: 'bg-[#c6282815]', iconColor: 'text-[#c62828]', countColor: 'text-[#c62828]', shimmerFrom: '#c62828', shimmerTo: '#ef5350' }
      : { border: 'border-l-[#d4a853]', iconBg: 'bg-[#d4a85315]', iconColor: 'text-[#d4a853]', countColor: 'text-[#d4a853]', shimmerFrom: '#d4a853', shimmerTo: '#f0c674' }
  }

  return (
    <div className="space-y-6">
      {/* ── University Branding Card + Welcome Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* University Logo & Branding Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-1"
        >
          <Card className="h-full overflow-hidden">
            <div className="bg-gradient-to-br from-[#1a2744] via-[#1f3050] to-[#2d7a4f] p-4 text-white flex flex-col items-center justify-center text-center h-full min-h-[120px] relative">
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
                <Shield className="size-7 text-[#d4a853]" />
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
          className="lg:col-span-3"
        >
          <Card className="overflow-hidden">
            <div className="relative overflow-hidden">
              {/* Animated gradient background */}
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(135deg, #1a2744 0%, #1f3050 25%, #2d7a4f 50%, #1f3050 75%, #1a2744 100%)',
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
                <p className="text-white/70 mt-1">
                  Voici un apercu de votre etablissement
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
                          Annee academique {data.currentAcademicYear.name}
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
                      Aucune annee academique active — configurez-en une dans Structure
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
              <h3 className="text-sm font-semibold text-[#1a2744] mb-3">Actions rapides</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {quickActions.map((action) => (
                  <motion.div
                    key={action.label}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Button
                      variant="outline"
                      className="h-auto py-3 w-full flex flex-col items-center gap-2 border-solid border-gray-200 hover:border-transparent transition-all duration-300 group relative overflow-hidden"
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
                      <span className="text-[11px] font-medium text-gray-600 group-hover:text-[#1a2744] relative z-10">{action.label}</span>
                    </Button>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Stats Cards ── */}
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
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{stat.title}</p>
                    </div>
                    <p className="text-2xl font-bold text-[#1a2744] mt-1.5">{stat.value}</p>
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
            <CardTitle className="text-base font-semibold text-[#1a2744]">
              Repartition par filiere
            </CardTitle>
            <p className="text-xs text-gray-400">Effectif etudiant par programme</p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {filiereData.length === 0 ? (
                <EmptyState label="Aucun etudiant affecte a un programme pour le moment." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filiereData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [`${value} etudiants`, 'Effectif']}
                    />
                    <Legend />
                    <Bar dataKey="etudiants" name="Etudiants" radius={[4, 4, 0, 0]}>
                      {filiereData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Donut Chart - Statut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-[#1a2744]">
              Statut des etudiants
            </CardTitle>
            <p className="text-xs text-gray-400">Repartition par statut administratif</p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {studentStatusData.length === 0 ? (
                <EmptyState label="Aucun etudiant enregistre pour le moment." />
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
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
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
                      formatter={(value: number) => [`${value}`, 'Etudiants']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Charts Row 2: Cycle Donut + Taux Reussite Horizontal Bar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut - Cycle */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-[#1a2744]">
              Repartition par cycle
            </CardTitle>
            <p className="text-xs text-gray-400">Licence, Master, Doctorat</p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {cycleData.length === 0 ? (
                <EmptyState label="Aucun etudiant affecte a un programme pour le moment." />
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
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
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
                      formatter={(value: number) => [`${value}`, 'Etudiants']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Horizontal Bar - Taux de reussite par filiere */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-[#1a2744]">
              Taux de reussite par filiere
            </CardTitle>
            <p className="text-xs text-gray-400">Part des notes saisies au-dessus du seuil de passage, par programme</p>
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
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} width={80} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [`${value}%`, 'Taux de reussite']}
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
          </CardContent>
        </Card>
      </div>

      {/* ── Alerts Section ── */}
      <div>
        <h2 className="text-base font-semibold text-[#1a2744] mb-3 flex items-center gap-2">
          <AlertTriangle className="size-4 text-[#d4a853]" />
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
                          <p className="text-sm font-semibold text-[#1a2744]">{alert.title}</p>
                          <motion.span
                            className={`text-2xl font-bold ${style.countColor}`}
                            animate={alert.count > 0 && alert.severity === 'high' ? { scale: [1, 1.08, 1] } : {}}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                          >
                            {alert.count}
                          </motion.span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{alert.description}</p>
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
              <CardTitle className="text-base font-semibold text-[#1a2744] flex items-center gap-2">
                <Server className="size-4 text-[#2d7a4f]" />
                Etat du systeme
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
                  <PulsingDot color="#2d7a4f" />
                  <span className="text-xs font-medium text-[#2d7a4f]">En ligne</span>
                </div>
              </div>

              {/* DB Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="size-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Base de donnees</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <PulsingDot color="#2d7a4f" />
                  <span className="text-xs font-medium text-[#2d7a4f]">Connecte</span>
                </div>
              </div>

              <p className="text-[10px] text-gray-400 pt-2 border-t border-gray-100">
                Ces indicateurs reflètent l&apos;état au chargement de cette page.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Enhanced Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[#1a2744]">Activite recente</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentActivity.length === 0 ? (
              <EmptyState label="Aucune activite recente." />
            ) : (
              <div className="max-h-96 overflow-y-auto relative">
                {/* Timeline connecting line */}
                <div className="absolute left-[33px] top-4 bottom-4 w-px bg-gradient-to-b from-[#1a274415] via-[#2d7a4f20] to-[#d4a85315]" />
                {data.recentActivity.map((activity, i) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.05 }}
                    className={`flex items-start gap-3 px-6 py-3 hover:bg-gray-50/80 transition-colors relative ${i < data.recentActivity.length - 1 ? 'border-b border-gray-100' : ''}`}
                  >
                    {/* Timeline dot */}
                    <div className="absolute left-[30px] top-4 w-2 h-2 rounded-full bg-white border-2 border-[#1a274430] z-10" />
                    <div className={`w-8 h-8 rounded-lg ${getActivityBgColor(activity.type)} flex items-center justify-center shrink-0 mt-0.5 ml-6`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#1a2744] truncate">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {getActivityBadge(activity.type)}
                        <span className="text-xs text-gray-400">{activity.user}</span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-400">{formatDateShort(activity.time)}</span>
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
            <CardTitle className="text-base font-semibold text-[#1a2744] flex items-center gap-2">
              <Timer className="size-4 text-[#d4a853]" />
              Evenements a venir
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.upcomingEvents.length === 0 ? (
              <EmptyState label="Aucun evenement planifie." />
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
                    <div className="w-10 h-10 rounded-lg bg-[#1a274408] flex flex-col items-center justify-center shrink-0">
                      <Calendar className="size-3 text-[#1a2744]" />
                      <span className="text-[9px] font-bold text-[#1a2744] mt-0.5">{formatDateShort(event.date)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#1a2744] font-medium truncate">{event.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {getEventBadge(event.type)}
                        <span className="text-[10px] text-[#d4a853] font-medium flex items-center gap-0.5">
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
