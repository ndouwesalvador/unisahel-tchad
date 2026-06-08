'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  BarChart3,
  TrendingUp,
  FileText,
  Download,
  Calendar,
  Clock,
  Plus,
  Search,
  Printer,
  Globe,
  Zap,
  Eye,
  MoreHorizontal,
  PieChart,
  Activity,
  CheckCircle2,
  XCircle,
  Settings,
  RefreshCw,
  Smartphone,
  Mail,
} from 'lucide-react'

// ─── useCountUp Hook ──────────────────────────────────────────────────────────

function useCountUp(target: number, duration: number = 1400) {
  const [value, setValue] = useState(0)
  const ref = useRef<number>(0)
  useEffect(() => {
    const start = performance.now()
    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) ref.current = requestAnimationFrame(animate)
    }
    ref.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(ref.current)
  }, [target, duration])
  return value
}

// ─── Animation Variants ────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
} as const

// ─── Demo Data ─────────────────────────────────────────────────────────────────

const reportTypes = [
  { id: 'performance', name: 'Performance academique', description: 'Analyse des resultats et taux de reussite par UE et programme', icon: BarChart3, color: '#2d7a4f' },
  { id: 'financier', name: 'Suivi financier', description: 'Recettes, depenses, encaissement et budget institutionnel', icon: TrendingUp, color: '#1a2744' },
  { id: 'absenteisme', name: "Taux d'absenteisme", description: 'Statistiques de presence par cours, filiere et periode', icon: Activity, color: '#d4a853' },
  { id: 'examen', name: "Statistiques d'examen", description: 'Repartition des notes, mentions et debouche par session', icon: PieChart, color: '#2d7a4f' },
  { id: 'progression', name: 'Progression etudiants', description: 'Suivi des credits, dettes et parcours academique', icon: TrendingUp, color: '#1a2744' },
  { id: 'bilan', name: 'Bilan institutionnel', description: "Vue d'ensemble globale de l'etablissement", icon: BarChart3, color: '#d4a853' },
]

interface ReportTemplate {
  id: string
  name: string
  category: string
  categoryColor: string
  lastGenerated: string
  downloadCount: number
}

const reportTemplates: ReportTemplate[] = [
  { id: '1', name: 'Releve de notes par semestre', category: 'Academique', categoryColor: '#2d7a4f', lastGenerated: '15/02/2025', downloadCount: 234 },
  { id: '2', name: 'Liste des admis/exclus', category: 'Deliberation', categoryColor: '#1a2744', lastGenerated: '12/02/2025', downloadCount: 189 },
  { id: '3', name: 'Bilan financier trimestriel', category: 'Financier', categoryColor: '#d4a853', lastGenerated: '10/02/2025', downloadCount: 56 },
  { id: '4', name: "Rapport d'absenteisme", category: 'Presence', categoryColor: '#c62828', lastGenerated: '08/02/2025', downloadCount: 78 },
  { id: '5', name: 'Statistiques de reussite', category: 'Academique', categoryColor: '#2d7a4f', lastGenerated: '05/02/2025', downloadCount: 312 },
  { id: '6', name: 'Bourse et aides financieres', category: 'Financier', categoryColor: '#d4a853', lastGenerated: '01/02/2025', downloadCount: 45 },
  { id: '7', name: 'Rapport de deliberation', category: 'Deliberation', categoryColor: '#1a2744', lastGenerated: '28/01/2025', downloadCount: 167 },
  { id: '8', name: 'Bibliotheque - emprunts', category: 'Ressources', categoryColor: '#0891b2', lastGenerated: '25/01/2025', downloadCount: 23 },
]

interface RecentReport {
  id: string
  name: string
  type: string
  typeColor: string
  generatedBy: string
  date: string
  status: 'termine' | 'en_cours' | 'erreur'
  size: string
  downloadCount: number
}

const recentReports: RecentReport[] = [
  { id: '1', name: 'Releve S1 2024-2025 Informatique', type: 'Academique', typeColor: '#2d7a4f', generatedBy: 'ABAKAR Mahamat', date: '15/02/2025', status: 'termine', size: '2.4 MB', downloadCount: 34 },
  { id: '2', name: 'Bilan financier Janvier 2025', type: 'Financier', typeColor: '#d4a853', generatedBy: 'KHAMIS Fatime', date: '14/02/2025', status: 'termine', size: '1.8 MB', downloadCount: 12 },
  { id: '3', name: "Statistiques d'admission L1", type: 'Admission', typeColor: '#1a2744', generatedBy: 'MAHAMAT Youssouf', date: '13/02/2025', status: 'en_cours', size: '-', downloadCount: 0 },
  { id: '4', name: "Rapport absenteisme S1", type: 'Presence', typeColor: '#c62828', generatedBy: 'NGARNDMI Halime', date: '12/02/2025', status: 'termine', size: '3.1 MB', downloadCount: 56 },
  { id: '5', name: 'Deliberation Droit L3', type: 'Deliberation', typeColor: '#1a2744', generatedBy: 'HISSEIN Mariam', date: '11/02/2025', status: 'termine', size: '1.2 MB', downloadCount: 89 },
  { id: '6', name: 'Rapport bourses S1 2025', type: 'Financier', typeColor: '#d4a853', generatedBy: 'ISSA Mahamat Nour', date: '10/02/2025', status: 'erreur', size: '-', downloadCount: 0 },
  { id: '7', name: 'Progression credits M1', type: 'Academique', typeColor: '#2d7a4f', generatedBy: 'ADAM Khadija', date: '09/02/2025', status: 'termine', size: '890 KB', downloadCount: 23 },
  { id: '8', name: 'Bibliotheque emprunts Q4', type: 'Ressources', typeColor: '#0891b2', generatedBy: 'BICHARA Hawa', date: '08/02/2025', status: 'termine', size: '560 KB', downloadCount: 8 },
  { id: '9', name: 'Bilan institutionnel 2024', type: 'Institutionnel', typeColor: '#1a2744', generatedBy: 'DJIMADOUMBER Deubong', date: '07/02/2025', status: 'en_cours', size: '-', downloadCount: 0 },
  { id: '10', name: 'Releve S1 Medecine L2', type: 'Academique', typeColor: '#2d7a4f', generatedBy: 'NASSERINGAR Lea', date: '06/02/2025', status: 'termine', size: '1.5 MB', downloadCount: 45 },
  { id: '11', name: 'Paiements en attente Fev', type: 'Financier', typeColor: '#d4a853', generatedBy: 'OUMAR Abdoulaye', date: '05/02/2025', status: 'termine', size: '720 KB', downloadCount: 18 },
  { id: '12', name: 'Examens rattrapage stats', type: 'Examen', typeColor: '#8b5cf6', generatedBy: 'ZAKARIA Oumar', date: '04/02/2025', status: 'termine', size: '2.0 MB', downloadCount: 67 },
]

interface ScheduledReport {
  id: string
  name: string
  frequency: 'quotidien' | 'hebdomadaire' | 'mensuel' | 'trimestriel'
  nextExecution: string
  recipientsCount: number
  active: boolean
}

const scheduledReports: ScheduledReport[] = [
  { id: '1', name: 'Releve de notes quotidien', frequency: 'quotidien', nextExecution: '16/02/2025 08:00', recipientsCount: 12, active: true },
  { id: '2', name: 'Bilan hebdomadaire des paiements', frequency: 'hebdomadaire', nextExecution: '17/02/2025 09:00', recipientsCount: 8, active: true },
  { id: '3', name: 'Statistiques mensuelles', frequency: 'mensuel', nextExecution: '01/03/2025 07:00', recipientsCount: 25, active: true },
  { id: '4', name: 'Rapport trimestriel institutionnel', frequency: 'trimestriel', nextExecution: '01/04/2025 08:00', recipientsCount: 45, active: false },
  { id: '5', name: 'Absenteisme hebdomadaire', frequency: 'hebdomadaire', nextExecution: '17/02/2025 10:00', recipientsCount: 15, active: true },
]

const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  termine: { label: 'Termine', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0', icon: CheckCircle2 },
  en_cours: { label: 'En cours', className: 'bg-[#d4a85315] text-[#d4a853] border-0', icon: RefreshCw },
  erreur: { label: 'Erreur', className: 'bg-[#c6282815] text-[#c62828] border-0', icon: XCircle },
}

const frequencyConfig: Record<string, { label: string; className: string }> = {
  quotidien: { label: 'Quotidien', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' },
  hebdomadaire: { label: 'Hebdomadaire', className: 'bg-[#1a274415] text-[#1a2744] border-0' },
  mensuel: { label: 'Mensuel', className: 'bg-[#d4a85315] text-[#d4a853] border-0' },
  trimestriel: { label: 'Trimestriel', className: 'bg-[#8b5cf615] text-[#8b5cf6] border-0' },
}

const facultyData = [
  { name: 'Sciences', value: 78, color: '#2d7a4f' },
  { name: 'Droit', value: 65, color: '#1a2744' },
  { name: 'Lettres', value: 72, color: '#d4a853' },
  { name: 'Medecine', value: 81, color: '#0891b2' },
  { name: 'Economie', value: 59, color: '#8b5cf6' },
]

const inscriptionData = [
  { month: 'Sep', value: 340 },
  { month: 'Oct', value: 520 },
  { month: 'Nov', value: 680 },
  { month: 'Dec', value: 450 },
  { month: 'Jan', value: 590 },
  { month: 'Fev', value: 410 },
]

const paymentData = [
  { name: 'Frais scolarite', value: 62, color: '#2d7a4f' },
  { name: 'Bourses', value: 25, color: '#d4a853' },
  { name: 'Autres', value: 13, color: '#1a2744' },
]

const successRateData = [
  { level: 'L1', value: 58, color: '#c62828' },
  { level: 'L2', value: 67, color: '#d4a853' },
  { level: 'L3', value: 72, color: '#2d7a4f' },
  { level: 'M1', value: 78, color: '#2d7a4f' },
  { level: 'M2', value: 82, color: '#1a2744' },
]

// ─── Main Component ────────────────────────────────────────────────────────────

export function ReportsPage() {
  const rapportsGeneres = useCountUp(156, 1400)
  const rapportsPlanifies = useCountUp(12, 1200)
  const telechargements = useCountUp(892, 1500)

  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [periode, setPeriode] = useState('s2-2024-2025')
  const [niveau, setNiveau] = useState('tous')
  const [filiere, setFiliere] = useState('tous')
  const [format, setFormat] = useState<'excel' | 'pdf' | 'csv'>('pdf')
  const [searchReport, setSearchReport] = useState('')
  const [filterType, setFilterType] = useState('tous')
  const [filterStatus, setFilterStatus] = useState('tous')
  const [filterPeriod, setFilterPeriod] = useState('tous')
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [scheduledState, setScheduledState] = useState<Record<string, boolean>>(
    Object.fromEntries(scheduledReports.map(s => [s.id, s.active]))
  )

  // Filter reports
  const filteredReports = recentReports.filter(r => {
    const matchSearch = searchReport === '' ||
      r.name.toLowerCase().includes(searchReport.toLowerCase()) ||
      r.generatedBy.toLowerCase().includes(searchReport.toLowerCase())
    const matchType = filterType === 'tous' || r.type === filterType
    const matchStatus = filterStatus === 'tous' || r.status === filterStatus
    return matchSearch && matchType && matchStatus
  })

  return (
    <TooltipProvider>
      <motion.div
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ─── 1. Gradient Header Banner ────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <div className="relative overflow-hidden bg-gradient-to-r from-[#1a2744] via-[#1f3050] to-[#2d7a4f] p-6 md:p-8 rounded-xl">
            {/* SVG pattern overlay */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-white">Rapports &amp; Analyses</h1>
                  <p className="text-sm text-white/70 mt-1">Tableaux de bord analytiques et generation de rapports personnalises</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button className="bg-white/10 backdrop-blur border border-white/20 text-white hover:bg-white/20 hover:text-white gap-2">
                    <Plus className="size-4" />
                    Nouveau rapport
                  </Button>
                  <Button className="bg-white/10 backdrop-blur border border-white/20 text-white hover:bg-white/20 hover:text-white gap-2">
                    <Calendar className="size-4" />
                    Programmer
                  </Button>
                  <Button className="bg-white/10 backdrop-blur border border-white/20 text-white hover:bg-white/20 hover:text-white gap-2">
                    <Download className="size-4" />
                    Exporter
                  </Button>
                </div>
              </div>
              {/* Glass-morphism stat cards */}
              <div className="flex gap-4 mt-5">
                <motion.div whileHover={{ scale: 1.03 }} transition={{ duration: 0.2 }} className="bg-white/10 backdrop-blur border border-white/15 rounded-lg px-4 py-3">
                  <div className="text-white/60 text-xs">Rapports generes</div>
                  <div className="text-white text-2xl font-bold">{rapportsGeneres}</div>
                </motion.div>
                <motion.div whileHover={{ scale: 1.03 }} transition={{ duration: 0.2 }} className="bg-white/10 backdrop-blur border border-white/15 rounded-lg px-4 py-3">
                  <div className="text-white/60 text-xs">Planifies</div>
                  <div className="text-white text-2xl font-bold">{rapportsPlanifies}</div>
                </motion.div>
                <motion.div whileHover={{ scale: 1.03 }} transition={{ duration: 0.2 }} className="bg-white/10 backdrop-blur border border-white/15 rounded-lg px-4 py-3 hidden sm:block">
                  <div className="text-white/60 text-xs">Telechargements</div>
                  <div className="text-white text-2xl font-bold">{telechargements}</div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─── 2. Stats Cards ──────────────────────────────────────────────────── */}
        <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Rapports generes */}
          <motion.div variants={itemVariants} whileHover={{ scale: 1.02, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} transition={{ duration: 0.2 }}>
            <Card className="overflow-hidden border-l-4 border-l-[#2d7a4f]">
              <div className="h-1 bg-gradient-to-r from-[#2d7a4f] to-[#3da66a]" />
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Rapports generes</p>
                    <p className="text-xl font-bold text-[#2d7a4f] mt-1">{rapportsGeneres}</p>
                    <p className="text-xs text-gray-400 mt-1">ce mois</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#2d7a4f15] flex items-center justify-center">
                    <FileText className="size-5 text-[#2d7a4f]" />
                  </div>
                </div>
                <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-[#2d7a4f]"
                    initial={{ width: 0 }}
                    animate={{ width: '78%' }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Rapports planifies */}
          <motion.div variants={itemVariants} whileHover={{ scale: 1.02, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} transition={{ duration: 0.2 }}>
            <Card className="overflow-hidden border-l-4 border-l-[#1a2744]">
              <div className="h-1 bg-gradient-to-r from-[#1a2744] to-[#2d4a6f]" />
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Rapports planifies</p>
                    <p className="text-xl font-bold text-[#1a2744] mt-1">{rapportsPlanifies}</p>
                    <p className="text-xs text-gray-400 mt-1">en attente</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#1a274415] flex items-center justify-center">
                    <Calendar className="size-5 text-[#1a2744]" />
                  </div>
                </div>
                <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-[#1a2744]"
                    initial={{ width: 0 }}
                    animate={{ width: '45%' }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Derniere generation */}
          <motion.div variants={itemVariants} whileHover={{ scale: 1.02, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} transition={{ duration: 0.2 }}>
            <Card className="overflow-hidden border-l-4 border-l-[#d4a853]">
              <div className="h-1 bg-gradient-to-r from-[#d4a853] to-[#e6c477]" />
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Derniere generation</p>
                    <p className="text-xl font-bold text-[#d4a853] mt-1">Aujourd&apos;hui</p>
                    <p className="text-xs text-gray-400 mt-1">15 Fev 2025</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#d4a85315] flex items-center justify-center">
                    <Clock className="size-5 text-[#d4a853]" />
                  </div>
                </div>
                <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-[#d4a853]"
                    initial={{ width: 0 }}
                    animate={{ width: '92%' }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Telechargements */}
          <motion.div variants={itemVariants} whileHover={{ scale: 1.02, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} transition={{ duration: 0.2 }}>
            <Card className="overflow-hidden border-l-4 border-l-[#2d7a4f]">
              <div className="h-1 bg-gradient-to-r from-[#2d7a4f] to-[#3da66a]" />
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Telechargements</p>
                    <p className="text-xl font-bold text-[#2d7a4f] mt-1">{telechargements}</p>
                    <p className="text-xs text-gray-400 mt-1">total cumule</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#2d7a4f15] flex items-center justify-center">
                    <Download className="size-5 text-[#2d7a4f]" />
                  </div>
                </div>
                <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-[#2d7a4f]"
                    initial={{ width: 0 }}
                    animate={{ width: '65%' }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* ─── 3. Report Builder Card ───────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-[#1a2744]">
            <div className="h-1 bg-gradient-to-r from-[#1a2744] via-[#2d7a4f] to-[#d4a853]" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-[#1a2744] flex items-center gap-2">
                  <Settings className="size-5 text-[#1a2744]" />
                  Constructeur de rapports
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {/* Report Type Selector Grid */}
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Selectionnez le type de rapport</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                {reportTypes.map((rt) => {
                  const isSelected = selectedType === rt.id
                  return (
                    <motion.button
                      key={rt.id}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setSelectedType(rt.id)}
                      className={`text-left p-3 rounded-lg border-2 transition-all duration-200 ${
                        isSelected
                          ? 'border-[#2d7a4f] ring-2 ring-[#2d7a4f] bg-[#2d7a4f08]'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${rt.color}15` }}>
                          <rt.icon className="size-4" style={{ color: rt.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#1a2744]">{rt.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{rt.description}</p>
                        </div>
                      </div>
                    </motion.button>
                  )
                })}
              </div>

              {/* Configuration Panel */}
              <Separator className="mb-4" />
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Configuration</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Periode</Label>
                  <Select value={periode} onValueChange={setPeriode}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="s2-2024-2025">S2 2024-2025</SelectItem>
                      <SelectItem value="s1-2024-2025">S1 2024-2025</SelectItem>
                      <SelectItem value="s2-2023-2024">S2 2023-2024</SelectItem>
                      <SelectItem value="s1-2023-2024">S1 2023-2024</SelectItem>
                      <SelectItem value="annee-2024-2025">Annee 2024-2025</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Niveau</Label>
                  <Select value={niveau} onValueChange={setNiveau}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tous">Tous les niveaux</SelectItem>
                      <SelectItem value="l1">L1</SelectItem>
                      <SelectItem value="l2">L2</SelectItem>
                      <SelectItem value="l3">L3</SelectItem>
                      <SelectItem value="m1">M1</SelectItem>
                      <SelectItem value="m2">M2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Filiere</Label>
                  <Select value={filiere} onValueChange={setFiliere}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tous">Toutes les filieres</SelectItem>
                      <SelectItem value="informatique">Informatique</SelectItem>
                      <SelectItem value="droit">Droit</SelectItem>
                      <SelectItem value="medecine">Medecine</SelectItem>
                      <SelectItem value="economie">Economie</SelectItem>
                      <SelectItem value="lettres">Lettres</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Format</Label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={format === 'excel' ? 'default' : 'outline'}
                      className={`flex-1 h-9 text-xs ${format === 'excel' ? 'bg-[#2d7a4f] hover:bg-[#236b40] text-white' : 'border-gray-200'}`}
                      onClick={() => setFormat('excel')}
                    >
                      Excel
                    </Button>
                    <Button
                      size="sm"
                      variant={format === 'pdf' ? 'default' : 'outline'}
                      className={`flex-1 h-9 text-xs ${format === 'pdf' ? 'bg-[#2d7a4f] hover:bg-[#236b40] text-white' : 'border-gray-200'}`}
                      onClick={() => setFormat('pdf')}
                    >
                      PDF
                    </Button>
                    <Button
                      size="sm"
                      variant={format === 'csv' ? 'default' : 'outline'}
                      className={`flex-1 h-9 text-xs ${format === 'csv' ? 'bg-[#2d7a4f] hover:bg-[#236b40] text-white' : 'border-gray-200'}`}
                      onClick={() => setFormat('csv')}
                    >
                      CSV
                    </Button>
                  </div>
                </div>
              </div>
              <Button className="w-full bg-gradient-to-r from-[#1a2744] to-[#2d7a4f] hover:from-[#1a2744] hover:to-[#236b40] text-white h-10">
                <Zap className="size-4 mr-2" />
                Generer le rapport
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── 4. Pre-built Report Templates Card ────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-[#d4a853]">
            <div className="h-1 bg-gradient-to-r from-[#d4a853] to-[#e6c477]" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-[#1a2744] flex items-center gap-2">
                  <FileText className="size-5 text-[#d4a853]" />
                  Modeles de rapports pre-configures
                </CardTitle>
                <Badge className="bg-[#d4a85310] text-[#d4a853] border-0">{reportTemplates.length} modeles</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {reportTemplates.map((template) => (
                  <motion.div
                    key={template.id}
                    whileHover={{ scale: 1.03 }}
                    transition={{ duration: 0.2 }}
                    className="p-3 rounded-lg border border-gray-200 bg-white hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="text-[10px] border-0" style={{ backgroundColor: `${template.categoryColor}15`, color: template.categoryColor }}>
                        {template.category}
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold text-[#1a2744] mb-1 leading-tight">{template.name}</p>
                    <div className="flex items-center gap-3 text-[10px] text-gray-400 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {template.lastGenerated}
                      </span>
                      <span className="flex items-center gap-1">
                        <Download className="size-3" />
                        {template.downloadCount}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 h-7 text-[10px] bg-[#2d7a4f] hover:bg-[#236b40] text-white">
                        <RefreshCw className="size-3 mr-1" />
                        Generer
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px] border-gray-200">
                        <Download className="size-3 mr-1" />
                        Telecharger
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── 5. Recent Reports Table Card ──────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-[#2d7a4f]">
            <div className="h-1 bg-gradient-to-r from-[#2d7a4f] to-[#3da66a]" />
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle className="text-lg text-[#1a2744] flex items-center gap-2">
                  <Activity className="size-5 text-[#2d7a4f]" />
                  Rapports recents
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {/* Search + Filters */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher par nom ou auteur..."
                    className="pl-9 h-9 text-sm"
                    value={searchReport}
                    onChange={(e) => setSearchReport(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[140px] h-9 text-xs">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tous">Tous les types</SelectItem>
                      <SelectItem value="Academique">Academique</SelectItem>
                      <SelectItem value="Financier">Financier</SelectItem>
                      <SelectItem value="Deliberation">Deliberation</SelectItem>
                      <SelectItem value="Presence">Presence</SelectItem>
                      <SelectItem value="Admission">Admission</SelectItem>
                      <SelectItem value="Examen">Examen</SelectItem>
                      <SelectItem value="Ressources">Ressources</SelectItem>
                      <SelectItem value="Institutionnel">Institutionnel</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[120px] h-9 text-xs">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tous">Tous statuts</SelectItem>
                      <SelectItem value="termine">Termine</SelectItem>
                      <SelectItem value="en_cours">En cours</SelectItem>
                      <SelectItem value="erreur">Erreur</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                    <SelectTrigger className="w-[130px] h-9 text-xs">
                      <SelectValue placeholder="Periode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tous">Toutes periodes</SelectItem>
                      <SelectItem value="aujourdhui">Aujourd&apos;hui</SelectItem>
                      <SelectItem value="semaine">Cette semaine</SelectItem>
                      <SelectItem value="mois">Ce mois</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Table */}
              <ScrollArea className="max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-xs font-semibold">Rapport</TableHead>
                      <TableHead className="text-xs font-semibold">Type</TableHead>
                      <TableHead className="text-xs font-semibold">Genere par</TableHead>
                      <TableHead className="text-xs font-semibold">Date</TableHead>
                      <TableHead className="text-xs font-semibold">Statut</TableHead>
                      <TableHead className="text-xs font-semibold">Taille</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Telechargements</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((report) => {
                      const sConf = statusConfig[report.status]
                      return (
                        <TableRow key={report.id} className="hover:bg-[#2d7a4f05] transition-colors">
                          <TableCell className="py-2.5">
                            <p className="text-sm font-medium text-[#1a2744]">{report.name}</p>
                          </TableCell>
                          <TableCell className="py-2.5">
                            <Badge className="text-[10px] border-0" style={{ backgroundColor: `${report.typeColor}15`, color: report.typeColor }}>
                              {report.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-gray-600 py-2.5">{report.generatedBy}</TableCell>
                          <TableCell className="text-xs text-gray-500 py-2.5">{report.date}</TableCell>
                          <TableCell className="py-2.5">
                            {sConf ? (
                              <Badge className={`text-[10px] ${sConf.className}`}>
                                <sConf.icon className="size-3 mr-1" />
                                {sConf.label}
                              </Badge>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-xs text-gray-500 py-2.5">{report.size}</TableCell>
                          <TableCell className="text-center py-2.5">
                            <span className="text-xs font-semibold text-[#1a2744]">{report.downloadCount}</span>
                          </TableCell>
                          <TableCell className="text-right py-2.5">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-gray-100">
                                  <MoreHorizontal className="size-4 text-gray-400" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem className="text-xs">
                                  <Eye className="size-3.5 mr-2" />
                                  Voir le rapport
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-xs">
                                  <Download className="size-3.5 mr-2" />
                                  Telecharger
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-xs">
                                  <Printer className="size-3.5 mr-2" />
                                  Imprimer
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-xs">
                                  <Mail className="size-3.5 mr-2" />
                                  Envoyer par email
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-xs">
                                  <RefreshCw className="size-3.5 mr-2" />
                                  Regenerer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {filteredReports.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-sm text-gray-400">
                          Aucun rapport trouve
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── 6. Analytics Dashboard Card ──────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-[#1a2744]">
            <div className="h-1 bg-gradient-to-r from-[#1a2744] via-[#2d7a4f] to-[#d4a853]" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-[#1a2744] flex items-center gap-2">
                  <BarChart3 className="size-5 text-[#1a2744]" />
                  Tableau de bord analytique
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Performance par faculte */}
                <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                  <div className="p-4 rounded-lg border border-gray-200 bg-white">
                    <div className="h-1 bg-gradient-to-r from-[#1a2744] to-[#2d7a4f] rounded-full mb-3" />
                    <p className="text-xs font-semibold text-[#1a2744] mb-3">Performance par faculte</p>
                    <div className="space-y-2">
                      {facultyData.map((f, i) => (
                        <div key={f.name} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-600">{f.name}</span>
                            <span className="text-[10px] font-semibold" style={{ color: f.color }}>{f.value}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: f.color }}
                              initial={{ width: 0 }}
                              animate={{ width: `${f.value}%` }}
                              transition={{ duration: 0.8, delay: 0.1 * i, ease: 'easeOut' }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* Tendance inscriptions */}
                <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                  <div className="p-4 rounded-lg border border-gray-200 bg-white">
                    <div className="h-1 bg-gradient-to-r from-[#2d7a4f] to-[#3da66a] rounded-full mb-3" />
                    <p className="text-xs font-semibold text-[#1a2744] mb-3">Tendance inscriptions</p>
                    <div className="relative h-32">
                      {/* Y axis */}
                      <div className="absolute left-0 top-0 bottom-4 flex flex-col justify-between text-[9px] text-gray-400">
                        <span>700</span>
                        <span>350</span>
                        <span>0</span>
                      </div>
                      {/* Chart area */}
                      <div className="ml-7 h-full relative">
                        {/* Grid lines */}
                        <div className="absolute inset-0 flex flex-col justify-between">
                          <div className="border-b border-gray-100" />
                          <div className="border-b border-gray-100" />
                          <div className="border-b border-gray-100" />
                        </div>
                        {/* Line path */}
                        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                          <motion.polyline
                            fill="none"
                            stroke="#2d7a4f"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points="5,67 22,41 40,10 57,36 75,18 95,30"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1.5, ease: 'easeOut' }}
                          />
                        </svg>
                        {/* Animated dots */}
                        {inscriptionData.map((d, i) => {
                          const xPercent = 5 + (i / (inscriptionData.length - 1)) * 90
                          const yPercent = 100 - (d.value / 700) * 90
                          return (
                            <motion.div
                              key={d.month}
                              className="absolute size-2.5 rounded-full bg-[#2d7a4f] border-2 border-white shadow-sm"
                              style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ duration: 0.3, delay: 0.2 + i * 0.15 }}
                            />
                          )
                        })}
                        {/* X axis labels */}
                        <div className="absolute bottom-0 left-0 right-0 flex justify-between">
                          {inscriptionData.map((d) => (
                            <span key={d.month} className="text-[9px] text-gray-400">{d.month}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Repartition des paiements - Donut style */}
                <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                  <div className="p-4 rounded-lg border border-gray-200 bg-white">
                    <div className="h-1 bg-gradient-to-r from-[#d4a853] to-[#e6c477] rounded-full mb-3" />
                    <p className="text-xs font-semibold text-[#1a2744] mb-3">Repartition des paiements</p>
                    {/* CSS Donut chart */}
                    <div className="flex items-center gap-4">
                      <div className="relative size-24 shrink-0">
                        <svg viewBox="0 0 36 36" className="size-full -rotate-90">
                          <circle cx="18" cy="18" r="14" fill="none" stroke="#e5e7eb" strokeWidth="4" />
                          <motion.circle
                            cx="18" cy="18" r="14" fill="none"
                            stroke="#2d7a4f"
                            strokeWidth="4"
                            strokeDasharray={`${62 * 0.88} ${88 - 62 * 0.88}`}
                            strokeLinecap="round"
                            initial={{ strokeDasharray: '0 88' }}
                            animate={{ strokeDasharray: `${62 * 0.88} ${88 - 62 * 0.88}` }}
                            transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                          />
                          <motion.circle
                            cx="18" cy="18" r="14" fill="none"
                            stroke="#d4a853"
                            strokeWidth="4"
                            strokeDasharray={`${25 * 0.88} ${88 - 25 * 0.88}`}
                            strokeDashoffset={`-${62 * 0.88}`}
                            strokeLinecap="round"
                            initial={{ strokeDasharray: `0 88` }}
                            animate={{ strokeDasharray: `${25 * 0.88} ${88 - 25 * 0.88}` }}
                            transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
                          />
                          <motion.circle
                            cx="18" cy="18" r="14" fill="none"
                            stroke="#1a2744"
                            strokeWidth="4"
                            strokeDasharray={`${13 * 0.88} ${88 - 13 * 0.88}`}
                            strokeDashoffset={`-${(62 + 25) * 0.88}`}
                            strokeLinecap="round"
                            initial={{ strokeDasharray: `0 88` }}
                            animate={{ strokeDasharray: `${13 * 0.88} ${88 - 13 * 0.88}` }}
                            transition={{ duration: 1, delay: 0.7, ease: 'easeOut' }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-bold text-[#1a2744]">100%</span>
                        </div>
                      </div>
                      <div className="space-y-2 flex-1">
                        {paymentData.map((p) => (
                          <div key={p.name} className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-gray-600 truncate">{p.name}</p>
                            </div>
                            <span className="text-[10px] font-semibold" style={{ color: p.color }}>{p.value}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Taux de reussite par niveau */}
                <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                  <div className="p-4 rounded-lg border border-gray-200 bg-white">
                    <div className="h-1 bg-gradient-to-r from-[#1a2744] to-[#2d7a4f] rounded-full mb-3" />
                    <p className="text-xs font-semibold text-[#1a2744] mb-3">Taux de reussite par niveau</p>
                    <div className="space-y-2.5">
                      {successRateData.map((s, i) => (
                        <div key={s.level} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-[#1a2744]">{s.level}</span>
                            <span className="text-[10px] font-semibold" style={{ color: s.color }}>{s.value}%</span>
                          </div>
                          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: s.color }}
                              initial={{ width: 0 }}
                              animate={{ width: `${s.value}%` }}
                              transition={{ duration: 0.8, delay: 0.1 * i, ease: 'easeOut' }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── 7. Scheduled Reports Card ─────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-[#d4a853]">
            <div className="h-1 bg-gradient-to-r from-[#d4a853] to-[#e6c477]" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-[#1a2744] flex items-center gap-2">
                  <Clock className="size-5 text-[#d4a853]" />
                  Rapports planifies
                </CardTitle>
                <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-[#d4a853] hover:bg-[#d4a853]/90 text-white text-xs">
                      <Plus className="size-3.5 mr-1.5" />
                      Ajouter une planification
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="text-[#1a2744]">Nouvelle planification</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Nom du rapport</Label>
                        <Input placeholder="Ex: Releve hebdomadaire" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-sm">Frequence</Label>
                          <Select defaultValue="hebdomadaire">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="quotidien">Quotidien</SelectItem>
                              <SelectItem value="hebdomadaire">Hebdomadaire</SelectItem>
                              <SelectItem value="mensuel">Mensuel</SelectItem>
                              <SelectItem value="trimestriel">Trimestriel</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm">Heure</Label>
                          <Input type="time" defaultValue="08:00" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Destinataires</Label>
                        <Input placeholder="email1@univ.td, email2@univ.td" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Format</Label>
                        <Select defaultValue="pdf">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pdf">PDF</SelectItem>
                            <SelectItem value="excel">Excel</SelectItem>
                            <SelectItem value="csv">CSV</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button className="flex-1 bg-[#2d7a4f] hover:bg-[#236b40] text-white" onClick={() => setScheduleDialogOpen(false)}>
                          Creer la planification
                        </Button>
                        <Button variant="outline" className="flex-1" onClick={() => setScheduleDialogOpen(false)}>
                          Annuler
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-3">
                {scheduledReports.map((sr) => {
                  const fConf = frequencyConfig[sr.frequency]
                  const isActive = scheduledState[sr.id] ?? sr.active
                  return (
                    <motion.div
                      key={sr.id}
                      whileHover={{ scale: 1.01 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center gap-4 p-3 rounded-lg border border-gray-200 bg-white hover:shadow-sm transition-shadow"
                    >
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-[#d4a85315]">
                        <Calendar className="size-4 text-[#d4a853]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1a2744]">{sr.name}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {fConf ? (
                            <Badge className={`text-[10px] ${fConf.className}`}>
                              {fConf.label}
                            </Badge>
                          ) : null}
                          <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Clock className="size-3" />
                            Prochain: {sr.nextExecution}
                          </span>
                          <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Mail className="size-3" />
                            {sr.recipientsCount} destinataires
                          </span>
                        </div>
                      </div>
                      <Switch
                        checked={isActive}
                        onCheckedChange={(checked) => setScheduledState(prev => ({ ...prev, [sr.id]: checked }))}
                      />
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── 8. African Context Card ──────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-[#2d7a4f]">
            <div className="h-1 bg-gradient-to-r from-[#2d7a4f] to-[#3da66a]" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-[#1a2744] flex items-center gap-2">
                  <Globe className="size-5 text-[#2d7a4f]" />
                  Contexte africain
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left column */}
                <div className="space-y-4">
                  {/* Low connectivity mode */}
                  <div className="p-3 rounded-lg bg-[#2d7a4f08] border border-[#2d7a4f15]">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="size-4 text-[#2d7a4f]" />
                      <span className="text-sm font-semibold text-[#1a2744]">Mode faible connectivite</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Les rapports sont mis en file d&apos;attente pour une generation hors ligne lorsque la connexion est instable. Les rapports sont generees automatiquement des que la connexion est retablie, sans perte de donnees.
                    </p>
                  </div>

                  {/* Multi-format export */}
                  <div className="p-3 rounded-lg bg-[#1a274408] border border-[#1a274415]">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="size-4 text-[#1a2744]" />
                      <span className="text-sm font-semibold text-[#1a2744]">Export multi-format</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <div className="text-center p-2 rounded bg-white border border-gray-100">
                        <div className="text-xs font-bold text-[#2d7a4f]">Excel</div>
                        <div className="text-[10px] text-gray-400">Format heritage</div>
                      </div>
                      <div className="text-center p-2 rounded bg-white border border-gray-100">
                        <div className="text-xs font-bold text-[#c62828]">PDF</div>
                        <div className="text-[10px] text-gray-400">Imprimable</div>
                      </div>
                      <div className="text-center p-2 rounded bg-white border border-gray-100">
                        <div className="text-xs font-bold text-[#1a2744]">CSV</div>
                        <div className="text-[10px] text-gray-400">Leger</div>
                      </div>
                    </div>
                  </div>

                  {/* Printer-friendly layouts */}
                  <div className="p-3 rounded-lg bg-[#d4a85308] border border-[#d4a85315]">
                    <div className="flex items-center gap-2 mb-2">
                      <Printer className="size-4 text-[#d4a853]" />
                      <span className="text-sm font-semibold text-[#1a2744]">Mise en page pour impression</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Les rapports sont optimises pour l&apos;impression sur des imprimantes a faible ressource. Format A4 economique, encre reduite, et mise en page adaptee aux conditions locales.
                    </p>
                  </div>
                </div>

                {/* Right column */}
                <div className="space-y-4">
                  {/* Email delivery */}
                  <div className="p-3 rounded-lg bg-[#1a274408] border border-[#1a274415]">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="size-4 text-[#1a2744]" />
                      <span className="text-sm font-semibold text-[#1a2744]">Livraison par email</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Les rapports peuvent etre envoyes automatiquement par email aux utilisateurs en zone a faible connectivite. Solution ideale pour les campus decentralises sans acces permanent au portail.
                    </p>
                  </div>

                  {/* Mobile Money integration */}
                  <div className="p-3 rounded-lg bg-[#2d7a4f08] border border-[#2d7a4f15]">
                    <div className="flex items-center gap-2 mb-2">
                      <Smartphone className="size-4 text-[#2d7a4f]" />
                      <span className="text-sm font-semibold text-[#1a2744]">Integration Mobile Money</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Les rapports financiers incluent automatiquement un resume des transactions Mobile Money (Airtel Money, Moov Money, Orange Money) pour un suivi complet des paiements.
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-gray-100">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-[10px] text-gray-600">Airtel Money</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-gray-100">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-[10px] text-gray-600">Moov Money</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-gray-100">
                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                        <span className="text-[10px] text-gray-600">Orange Money</span>
                      </div>
                    </div>
                  </div>

                  {/* Monthly budget */}
                  <div className="p-3 rounded-lg bg-[#d4a85308] border border-[#d4a85315]">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="size-4 text-[#d4a853]" />
                      <span className="text-sm font-semibold text-[#1a2744]">Budget mensuel de generation</span>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Utilise: 45,000 FCFA</span>
                      <span className="text-xs font-semibold text-[#d4a853]">75%</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-[#d4a853] to-[#e6c477]"
                        initial={{ width: 0 }}
                        animate={{ width: '75%' }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-gray-400">Budget: 60,000 FCFA/mois</span>
                      <span className="text-[10px] text-[#2d7a4f]">Reste: 15,000 FCFA</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </TooltipProvider>
  )
}
