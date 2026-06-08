'use client'

import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  GraduationCap,
  BookOpen,
  CreditCard,
  TrendingUp,
  TrendingDown,
  UserPlus,
  FileCheck,
  FileText,
  Calendar,
  Clock,
  Gavel,
  Megaphone,
  AlertTriangle,
  ArrowRight,
  Timer,
  Server,
  Database,
  HardDrive,
  Wifi,
  Shield,
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

// ─── Demo Data ────────────────────────────────────────────────────────────────

const statsCards = [
  {
    title: 'Etudiants inscrits',
    value: '2 847',
    change: '+12.5%',
    previousYear: '2 530',
    trend: 'up' as const,
    icon: Users,
    color: '#2d7a4f',
    bgColor: '#2d7a4f15',
    sparkline: [30, 40, 35, 50, 49, 60, 70, 65, 80, 75, 85, 90],
  },
  {
    title: 'Enseignants',
    value: '156',
    change: '+3.2%',
    previousYear: '151',
    trend: 'up' as const,
    icon: GraduationCap,
    color: '#1a2744',
    bgColor: '#1a274415',
    sparkline: [20, 22, 21, 23, 22, 24, 23, 25, 24, 26, 25, 27],
  },
  {
    title: 'UE ce semestre',
    value: '84',
    change: '-2.1%',
    previousYear: '86',
    trend: 'down' as const,
    icon: BookOpen,
    color: '#d4a853',
    bgColor: '#d4a85315',
    sparkline: [50, 48, 49, 47, 46, 48, 45, 44, 46, 43, 44, 42],
  },
  {
    title: 'Paiements recus',
    value: '45.2M FCFA',
    change: '+18.7%',
    previousYear: '38.1M FCFA',
    trend: 'up' as const,
    icon: CreditCard,
    color: '#2d7a4f',
    bgColor: '#2d7a4f15',
    sparkline: [20, 30, 25, 40, 45, 50, 55, 60, 58, 70, 75, 80],
  },
]

const filiereData = [
  { name: 'Droit', etudiants: 620, color: '#2d7a4f' },
  { name: 'Sciences', etudiants: 480, color: '#1a2744' },
  { name: 'Lettres', etudiants: 350, color: '#d4a853' },
  { name: 'Economie', etudiants: 410, color: '#5b8c5a' },
  { name: 'Medecine', etudiants: 290, color: '#c62828' },
  { name: 'Informatique', etudiants: 380, color: '#4a6fa5' },
  { name: 'Agronomie', etudiants: 317, color: '#8d6e63' },
]

const studentStatusData = [
  { name: 'Inscrits', value: 1840, color: '#2d7a4f' },
  { name: 'Pre-inscrits', value: 420, color: '#d4a853' },
  { name: 'Suspendus', value: 85, color: '#ef6c00' },
  { name: 'Exclus', value: 22, color: '#c62828' },
  { name: 'Diplomes', value: 480, color: '#1a2744' },
]

const cycleData = [
  { name: 'Licence', value: 1680, color: '#2d7a4f' },
  { name: 'Master', value: 820, color: '#1a2744' },
  { name: 'Doctorat', value: 347, color: '#d4a853' },
]

const reussiteData = [
  { name: 'Droit', taux: 72, color: '#2d7a4f' },
  { name: 'Sciences', taux: 65, color: '#1a2744' },
  { name: 'Lettres', taux: 78, color: '#d4a853' },
  { name: 'Economie', taux: 69, color: '#5b8c5a' },
  { name: 'Medecine', taux: 58, color: '#c62828' },
  { name: 'Informatique', taux: 74, color: '#4a6fa5' },
]

const recentActivities = [
  { id: 1, type: 'inscription', description: 'Inscription de Adam Hassane Abakar', time: 'Il y a 5 min', user: 'Scolarite' },
  { id: 2, type: 'notes', description: 'Saisie des notes - Algorithmique L2', time: 'Il y a 12 min', user: 'Dr. Mahamat Ali' },
  { id: 3, type: 'paiement', description: 'Paiement de 175 000 FCFA - Fatime Khamis', time: 'Il y a 25 min', user: 'Caisse' },
  { id: 4, type: 'inscription', description: 'Inscription de Amina Djibrine', time: 'Il y a 32 min', user: 'Scolarite' },
  { id: 5, type: 'document', description: 'Releve de notes genere - Youssouf Mahamat', time: 'Il y a 45 min', user: 'Scolarite' },
  { id: 6, type: 'jury', description: 'Deliberation L3 Droit validee', time: 'Il y a 1h', user: 'Pr. Khadija Adam' },
  { id: 7, type: 'paiement', description: 'Paiement de 200 000 FCFA - Ibrahim Seid', time: 'Il y a 1h 15', user: 'Caisse' },
  { id: 8, type: 'inscription', description: 'Reinscription de Halime Ngarndmi', time: 'Il y a 1h 30', user: 'Scolarite' },
  { id: 9, type: 'document', description: 'Attestation generee - Zakaria Doumngar', time: 'Il y a 2h', user: 'Scolarite' },
  { id: 10, type: 'notes', description: 'Saisie des notes - Physique L1', time: 'Il y a 2h 15', user: 'Dr. Abdoulaye Adoum' },
]

const upcomingEvents = [
  { date: '15 Juil', title: 'Deliberation L3 Droit', type: 'deliberation', countdown: '9 jours' },
  { date: '18 Juil', title: 'Examens rattrapage S2', type: 'exam', countdown: '12 jours' },
  { date: '22 Juil', title: 'Deliberation L2 Sciences', type: 'deliberation', countdown: '16 jours' },
  { date: '25 Juil', title: 'Conseil de faculte', type: 'council', countdown: '19 jours' },
  { date: '01 Aout', title: 'Rentree S1 2025-2026', type: 'academic', countdown: '26 jours' },
]

const alerts = [
  { id: 1, title: 'Etudiants en dette', count: 147, severity: 'high' as const, icon: AlertTriangle, description: 'Etudiants avec des UE non validees' },
  { id: 2, title: 'Notes non validees', count: 23, severity: 'medium' as const, icon: FileText, description: 'Enseignants n\'ont pas encore valide' },
  { id: 3, title: 'Paiements en retard', count: 89, severity: 'high' as const, icon: CreditCard, description: 'Echeances depassees non reglees' },
]

const quickActions = [
  { label: 'Nouvelle inscription', icon: UserPlus, color: '#2d7a4f', bgColor: '#2d7a4f15', view: 'students' as const },
  { label: 'Saisir les notes', icon: FileCheck, color: '#1a2744', bgColor: '#1a274415', view: 'grades' as const },
  { label: 'Generer un releve', icon: FileText, color: '#d4a853', bgColor: '#d4a85315', view: 'documents' as const },
  { label: 'Ajouter un paiement', icon: CreditCard, color: '#2d7a4f', bgColor: '#2d7a4f15', view: 'payments' as const },
  { label: 'Planifier un jury', icon: Gavel, color: '#1a2744', bgColor: '#1a274415', view: 'deliberation' as const },
  { label: 'Envoyer une annonce', icon: Megaphone, color: '#d4a853', bgColor: '#d4a85315', view: 'announcements' as const },
]

// ─── Time-of-day greeting ─────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Bonjour'
  if (hour >= 12 && hour < 18) return 'Bon apres-midi'
  return 'Bonsoir'
}

// ─── Enhanced Mini Sparkline with gradient fill ───────────────────────────────

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const width = 90
  const height = 32
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  const fillPoints = `0,${height} ${points} ${width},${height}`

  const gradientId = `spark-grad-${color.replace('#', '')}`

  return (
    <svg width={width} height={height} className="opacity-80">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon
        points={fillPoints}
        fill={`url(#${gradientId})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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

import { useDashboardStats } from '@/lib/api-hooks'

export function DashboardHome() {
  const { user, setView } = useAppStore()
  const { data, isLoading } = useDashboardStats()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 rounded-full border-4 border-t-[#2d7a4f] border-[#2d7a4f20] animate-spin mb-4" />
          <p className="text-[#1a2744] font-medium">Chargement du tableau de bord...</p>
        </div>
      </div>
    )
  }

  const dynamicStats = data?.statsCards ? [
    { ...statsCards[0], value: data.statsCards.totalStudents.toString() },
    { ...statsCards[1], value: data.statsCards.totalTeachers.toString() },
    { ...statsCards[2], value: data.statsCards.totalPrograms.toString(), title: 'Programmes' },
    { ...statsCards[3], value: (data.statsCards.totalPaymentsAmount || 0).toLocaleString() + ' FCFA' },
  ] : statsCards;

  const dynamicRecentActivity = data?.recentActivity?.length > 0 ? data.recentActivity : recentActivities;
  const dynamicAlerts = alerts; // Keep static for now
  
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'inscription': return <UserPlus className="size-4 text-[#2d7a4f]" />
      case 'notes': return <FileCheck className="size-4 text-[#1a2744]" />
      case 'paiement': return <CreditCard className="size-4 text-[#d4a853]" />
      case 'document': return <FileText className="size-4 text-[#5b8c5a]" />
      case 'jury': return <Gavel className="size-4 text-[#c62828]" />
      default: return <div className="size-4 rounded-full bg-gray-300" />
    }
  }

  const getActivityBgColor = (type: string) => {
    switch (type) {
      case 'inscription': return 'bg-[#2d7a4f15]'
      case 'notes': return 'bg-[#1a274415]'
      case 'paiement': return 'bg-[#d4a85315]'
      case 'document': return 'bg-[#5b8c5a15]'
      case 'jury': return 'bg-[#c6282815]'
      default: return 'bg-gray-100'
    }
  }

  const getActivityBadge = (type: string) => {
    switch (type) {
      case 'inscription': return <Badge className="bg-[#2d7a4f15] text-[#2d7a4f] text-[10px] border-0 hover:bg-[#2d7a4f15]">Inscription</Badge>
      case 'notes': return <Badge className="bg-[#1a274415] text-[#1a2744] text-[10px] border-0 hover:bg-[#1a274415]">Note</Badge>
      case 'paiement': return <Badge className="bg-[#d4a85315] text-[#d4a853] text-[10px] border-0 hover:bg-[#d4a85315]">Paiement</Badge>
      case 'document': return <Badge className="bg-[#5b8c5a15] text-[#5b8c5a] text-[10px] border-0 hover:bg-[#5b8c5a15]">Document</Badge>
      case 'jury': return <Badge className="bg-[#c6282815] text-[#c62828] text-[10px] border-0 hover:bg-[#c6282815]">Jury</Badge>
      default: return null
    }
  }

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'deliberation': return <Badge className="bg-[#1a274415] text-[#1a2744] text-[10px] border-0 hover:bg-[#1a274415]">Deliberation</Badge>
      case 'exam': return <Badge className="bg-[#c6282815] text-[#c62828] text-[10px] border-0 hover:bg-[#c6282815]">Examen</Badge>
      case 'council': return <Badge className="bg-[#d4a85315] text-[#d4a853] text-[10px] border-0 hover:bg-[#d4a85315]">Conseil</Badge>
      case 'academic': return <Badge className="bg-[#2d7a4f15] text-[#2d7a4f] text-[10px] border-0 hover:bg-[#2d7a4f15]">Academique</Badge>
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
              <h3 className="text-sm font-bold leading-tight">Universite de N&apos;Djamena</h3>
              <p className="text-[10px] text-white/60 mt-0.5">Unite - Travail - Progres</p>
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
                  <motion.div
                    animate={{ scale: [1, 1.03, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Badge className="bg-white/20 text-white border-0 hover:bg-white/20 text-xs backdrop-blur-sm">
                      <Calendar className="size-3 mr-1" />
                      Annee academique 2024-2025
                    </Badge>
                  </motion.div>
                  <motion.div
                    animate={{ scale: [1, 1.03, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                  >
                    <Badge className="bg-white/20 text-white border-0 hover:bg-white/20 text-xs backdrop-blur-sm">
                      <GraduationCap className="size-3 mr-1" />
                      Semestre 2 en cours
                    </Badge>
                  </motion.div>
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
                {quickActions.map((action, _idx) => (
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

      {/* ── Enhanced Stats Cards with Sparklines ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {dynamicStats.map((stat, i) => (
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
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <PulsingDot color={stat.color} />
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{stat.title}</p>
                    </div>
                    <p className="text-2xl font-bold text-[#1a2744] mt-1">{stat.value}</p>
                    <div className="flex items-center gap-1 mt-1.5">
                      {stat.trend === 'up' ? (
                        <TrendingUp className="size-3 text-[#2d7a4f]" />
                      ) : (
                        <TrendingDown className="size-3 text-red-500" />
                      )}
                      <span className={`text-xs font-medium ${stat.trend === 'up' ? 'text-[#2d7a4f]' : 'text-red-500'}`}>
                        {stat.change}
                      </span>
                      <span className="text-[10px] text-gray-400">vs {stat.previousYear}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: stat.bgColor }}
                    >
                      <stat.icon className="size-5" style={{ color: stat.color }} />
                    </div>
                    <MiniSparkline data={stat.sparkline} color={stat.color} />
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
            <p className="text-xs text-gray-400">Effectif etudiant par departement</p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filiereData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
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
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
            </div>
          </CardContent>
        </Card>

        {/* Horizontal Bar - Taux de reussite par filiere */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-[#1a2744]">
              Taux de reussite par filiere
            </CardTitle>
            <p className="text-xs text-gray-400">Pourcentage d&apos;etudiants admis par departement</p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
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
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Enhanced Alerts/Notifications Section ── */}
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
                key={alert.id}
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
                            animate={alert.severity === 'high' ? { scale: [1, 1.08, 1] } : {}}
                            transition={alert.severity === 'high' ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
                          >
                            {alert.count}
                          </motion.span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{alert.description}</p>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] mt-2 p-0 text-[#1a2744] hover:text-[#2d7a4f] group/btn">
                          Voir les details
                          <motion.span
                            className="inline-block ml-0.5"
                            initial={{ x: 0 }}
                            whileHover={{ x: 3 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ArrowRight className="size-3" />
                          </motion.span>
                        </Button>
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
        {/* System Status Card */}
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

              {/* Storage */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="size-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Stockage</span>
                  </div>
                  <span className="text-xs font-medium text-[#d4a853]">45% utilise</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #2d7a4f, #d4a853)' }}
                    initial={{ width: 0 }}
                    animate={{ width: '45%' }}
                    transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>2.7 Go / 6 Go</span>
                  <span>3.3 Go libre</span>
                </div>
              </div>

              {/* Uptime */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Uptime</span>
                  <span className="text-xs font-medium text-[#2d7a4f]">99.8%</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-400">Derniere maj</span>
                  <span className="text-xs font-medium text-gray-500">Il y a 2 min</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Enhanced Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-[#1a2744]">Activite recente</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto relative">
              {/* Timeline connecting line */}
              <div className="absolute left-[33px] top-4 bottom-4 w-px bg-gradient-to-b from-[#1a274415] via-[#2d7a4f20] to-[#d4a85315]" />
              {recentActivities.map((activity, i) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.05 }}
                  className={`flex items-start gap-3 px-6 py-3 hover:bg-gray-50/80 transition-colors relative ${i < recentActivities.length - 1 ? 'border-b border-gray-100' : ''}`}
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
                      <span className="text-xs text-gray-400">{activity.time}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
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
            <div className="max-h-96 overflow-y-auto">
              {upcomingEvents.map((event, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.08 }}
                  className={`flex items-start gap-3 px-6 py-3 hover:bg-gray-50/80 transition-colors ${i < upcomingEvents.length - 1 ? 'border-b border-gray-100' : ''}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-[#1a274408] flex flex-col items-center justify-center shrink-0">
                    <Calendar className="size-3 text-[#1a2744]" />
                    <span className="text-[9px] font-bold text-[#1a2744] mt-0.5">{event.date}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#1a2744] font-medium truncate">{event.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {getEventBadge(event.type)}
                      <span className="text-[10px] text-[#d4a853] font-medium flex items-center gap-0.5">
                        <Clock className="size-2.5" />
                        {event.countdown}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
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
