'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  LineChart,
  Line,
} from 'recharts'
import {
  TrendingUp,
  Users,
  GraduationCap,
  CreditCard,
  Download,
  Calendar,
} from 'lucide-react'

// ─── Demo Data ────────────────────────────────────────────────────────────────

const studentsByFaculty = [
  { name: 'Droit', etudiants: 620, femmes: 280, hommes: 340 },
  { name: 'Sciences', etudiants: 480, femmes: 180, hommes: 300 },
  { name: 'Lettres', etudiants: 350, femmes: 210, hommes: 140 },
  { name: 'Économie', etudiants: 410, femmes: 190, hommes: 220 },
  { name: 'Médecine', etudiants: 290, femmes: 150, hommes: 140 },
  { name: 'Informatique', etudiants: 380, femmes: 80, hommes: 300 },
  { name: 'Agronomie', etudiants: 317, femmes: 107, hommes: 210 },
]

const successRateByYear = [
  { year: '2019', taux: 62 },
  { year: '2020', taux: 58 },
  { year: '2021', taux: 65 },
  { year: '2022', taux: 68 },
  { year: '2023', taux: 71 },
  { year: '2024', taux: 74 },
]

const paymentCollection = [
  { name: 'Encaissé', value: 45200000, color: '#2d7a4f' },
  { name: 'En attente', value: 12500000, color: '#d4a853' },
  { name: 'Impayé', value: 8300000, color: '#c62828' },
]

const gradeDistribution = [
  { range: '0-5', count: 45 },
  { range: '5-8', count: 120 },
  { range: '8-10', count: 180 },
  { range: '10-12', count: 350 },
  { range: '12-14', count: 420 },
  { range: '14-16', count: 280 },
  { range: '16-18', count: 95 },
  { range: '18-20', count: 15 },
]

const successByProgram = [
  { program: 'Droit Privé', L1: 62, L2: 68, L3: 75 },
  { program: 'Informatique', L1: 55, L2: 72, L3: 80 },
  { program: 'Sciences', L1: 58, L2: 65, L3: 70 },
  { program: 'Lettres', L1: 70, L2: 74, L3: 78 },
  { program: 'Médecine', L1: 48, L2: 60, L3: 72 },
]

function formatFCFA(amount: number) {
  return (amount / 1000000).toFixed(1) + 'M FCFA'
}

// ─── Animated Count-Up Hook ──────────────────────────────────────────────────

function useCountUp(target: number, duration: number = 1400) {
  const [count, setCount] = useState(0)
  const startTime = useRef<number | null>(null)
  const rafId = useRef<number | null>(null)

  useEffect(() => {
    startTime.current = null

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp
      const progress = Math.min((timestamp - startTime.current) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * target))

      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate)
      }
    }

    rafId.current = requestAnimationFrame(animate)

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current)
    }
  }, [target, duration])

  return count
}

// ─── Header Stat Component ────────────────────────────────────────────────────

function HeaderStat({ value, label, suffix = '' }: { value: number; label: string; suffix?: string }) {
  const animatedValue = useCountUp(value, 1600)
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/15">
      <p className="text-2xl font-bold text-white">
        {animatedValue.toLocaleString('fr-FR')}{suffix}
      </p>
      <p className="text-[11px] text-white/70 mt-0.5">{label}</p>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StatisticsPage() {
  const totalStudents = studentsByFaculty.reduce((acc, f) => acc + f.etudiants, 0)
  const totalFemmes = studentsByFaculty.reduce((acc, f) => acc + f.femmes, 0)
  const globalSuccessRate = 74
  const [periode, setPeriode] = useState('s2-2024')

  return (
    <div className="space-y-4">
      {/* Gradient Header Banner */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-[#1a2744] via-[#1f3050] to-[#2d7a4f] p-6 text-white relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE0YzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptLTQgMmMtMS4xIDAtMi0uOS0yLTJzLjktMiAyLTIgMiAuOSAyIDItLjkgMi0yIDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
          <div className="relative">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
              <div>
                <motion.h1
                  className="text-2xl font-bold"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  Tableau de bord analytique
                </motion.h1>
                <motion.p
                  className="text-white/70 text-sm mt-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  Indicateurs cles de performance institutionnelle
                </motion.p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-white/60" />
                  <Select value={periode} onValueChange={setPeriode}>
                    <SelectTrigger className="w-[150px] h-8 text-xs bg-white/10 border-white/20 text-white hover:bg-white/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="s2-2024">S2 2024-2025</SelectItem>
                      <SelectItem value="s1-2024">S1 2024-2025</SelectItem>
                      <SelectItem value="s2-2023">S2 2023-2024</SelectItem>
                      <SelectItem value="s1-2023">S1 2023-2024</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" size="sm" className="text-xs bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white">
                  <Download className="size-3.5 mr-1.5" />
                  Exporter PDF
                </Button>
              </div>
            </div>

            {/* Animated count-up stats in header */}
            <motion.div
              className="grid grid-cols-3 gap-3"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <HeaderStat value={2847} label="Total etudiants" />
              <HeaderStat value={68} label="Taux de reussite global" suffix="%" />
              <HeaderStat value={11} label="Moyenne generale" suffix=",4/20" />
            </motion.div>
          </div>
        </div>
      </Card>

      {/* Key Metrics - Staggered fade-in */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { title: 'Étudiants totaux', value: totalStudents.toLocaleString('fr-FR'), icon: Users, color: '#2d7a4f', bgColor: '#2d7a4f15' },
          { title: 'Taux de réussite', value: `${globalSuccessRate}%`, icon: TrendingUp, color: '#1a2744', bgColor: '#1a274415' },
          { title: 'Taux féminin', value: `${Math.round((totalFemmes / totalStudents) * 100)}%`, icon: GraduationCap, color: '#d4a853', bgColor: '#d4a85315' },
          { title: 'Encaissement', value: '45.2M FCFA', icon: CreditCard, color: '#2d7a4f', bgColor: '#2d7a4f15' },
        ].map((metric, i) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, delay: i * 0.12, ease: 'easeOut' }}
          >
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">{metric.title}</p>
                    <p className="text-xl font-bold text-[#1a2744] mt-1">{metric.value}</p>
                  </div>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: metric.bgColor }}
                  >
                    <metric.icon className="size-5" style={{ color: metric.color }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Students by Faculty */}
        <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
          <Card className="overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-[#1a2744] to-[#2d7a4f]" />
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-[#1a2744]">
                Étudiants par faculté
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={studentsByFaculty} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
                    />
                    <Legend />
                    <Bar dataKey="hommes" name="Hommes" fill="#1a2744" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="femmes" name="Femmes" fill="#2d7a4f" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Success Rate Line Chart */}
        <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
          <Card className="overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-[#2d7a4f] to-[#3da66a]" />
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-[#1a2744]">
                Taux de réussite par année
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={successRateByYear} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} domain={[50, 80]} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [`${value}%`, 'Taux de réussite']}
                    />
                    <Line
                      type="monotone"
                      dataKey="taux"
                      stroke="#2d7a4f"
                      strokeWidth={3}
                      dot={{ fill: '#2d7a4f', strokeWidth: 2, r: 5 }}
                      activeDot={{ r: 7, fill: '#2d7a4f' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Collection Donut */}
        <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
          <Card className="overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-[#d4a853] to-[#e6c477]" />
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-[#1a2744]">
                Taux d&apos;encaissement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentCollection}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${formatFCFA(value)}`}
                    >
                      {paymentCollection.map((entry, index) => (
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
                      formatter={(value: number) => [formatFCFA(value), 'Montant']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Grade Distribution */}
        <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
          <Card className="overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-[#1a2744] via-[#2d7a4f] to-[#d4a853]" />
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-[#1a2744]">
                Distribution des notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gradeDistribution} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [`${value} étudiants`, 'Effectif']}
                    />
                    <Bar dataKey="count" name="Étudiants" radius={[4, 4, 0, 0]}>
                      {gradeDistribution.map((entry, index) => {
                        const mid = parseFloat(entry.range.split('-')[0])
                        const color = mid >= 10 ? '#2d7a4f' : mid >= 8 ? '#d4a853' : '#c62828'
                        return <Cell key={`cell-${index}`} fill={color} />
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Success by Program Table */}
      <motion.div whileHover={{ scale: 1.005 }} transition={{ duration: 0.2 }}>
        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-[#1a2744] via-[#2d7a4f] to-[#d4a853]" />
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[#1a2744]">
              Taux de réussite par programme et niveau (%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">Programme</th>
                    <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500">L1</th>
                    <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500">L2</th>
                    <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500">L3</th>
                  </tr>
                </thead>
                <tbody>
                  {successByProgram.map((row) => (
                    <tr key={row.program} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-2 font-medium text-[#1a2744]">{row.program}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`font-semibold ${row.L1 >= 60 ? 'text-[#2d7a4f]' : 'text-[#c62828]'}`}>
                          {row.L1}%
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`font-semibold ${row.L2 >= 60 ? 'text-[#2d7a4f]' : 'text-[#c62828]'}`}>
                          {row.L2}%
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`font-semibold ${row.L3 >= 60 ? 'text-[#2d7a4f]' : 'text-[#c62828]'}`}>
                          {row.L3}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
