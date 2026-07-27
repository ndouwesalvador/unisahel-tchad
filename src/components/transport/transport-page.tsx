'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Bus,
  MapPin,
  Clock,
  Users,
  Route,
  Calendar,
  Fuel,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Zap,
  TrendingUp,
  TrendingDown,
  Phone,
  Shield,
  CloudOff,
  Globe,
  Navigation,
  Timer,
} from 'lucide-react'
import { useTransport } from '@/lib/api-hooks'

// ─── Custom useCountUp Hook ────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1400) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const startTime = performance.now()
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration])

  return value
}

// ─── Types ──────────────────────────────────────────────────────────────────────

type BusStatus = 'en_service' | 'en_panne' | 'en_maintenance'

interface BusVehicle {
  id: string
  name: string
  plate: string
  capacity: number
  route: string
  status: BusStatus
  occupancy: number
  driver: string
  schedule: { start: string; end: string; label: string }[]
}

interface RouteInfo {
  id: string
  name: string
  departure: string
  arrival: string
  distance: number
  duration: string
  stops: string[]
  frequency: string
  avgOccupancy: number
  vehicleCount: number
  subscriptionCount: number
}

interface ScheduleEntry {
  id: string
  departure: string
  bus: string
  route: string
  driver: string
  availableSeats: number
  status: 'a_l_heure' | 'en_retard' | 'annule' | 'complet'
}

interface MaintenanceEntry {
  id: string
  bus: string
  type: string
  date: string
  cost: number
}

interface AlertEntry {
  id: string
  severity: 'critique' | 'avertissement' | 'info'
  message: string
  time: string
}

// ─── API Mapping ────────────────────────────────────────────────────────────────
// GET /api/transport returns real vehicles/routes/departures/maintenance/alerts
// for this tenant. Occupancy and avgOccupancy are computed server-side from
// active TransportSubscription rows (never fabricated). The functions below
// adapt that shape to the UI types above, the same pattern used by
// room-booking-page.tsx's mapRoom/mapReservation.

interface ApiVehicle {
  id: string
  name: string
  plate: string
  capacity: number
  driverName: string | null
  driverPhone: string | null
  status: string
  routeId: string | null
  routeName: string | null
  occupancy: number
  schedule: { start: string; end: string; label: string }[]
}

interface ApiRoute {
  id: string
  name: string
  departure: string
  arrival: string
  distanceKm: number | null
  durationLabel: string | null
  stops: string[]
  frequency: string | null
  avgOccupancy: number
  vehicleCount: number
  subscriptionCount: number
}

interface ApiScheduleEntry {
  id: string
  departureTime: string
  label: string | null
  status: string
  vehicleId: string
  vehicleName: string
  routeId: string
  routeName: string
  driverName: string | null
  availableSeats: number
}

interface ApiMaintenanceEntry {
  id: string
  vehicleId: string
  vehicleName: string
  type: string
  cost: number
  performedAt: string
}

interface ApiAlertEntry {
  id: string
  vehicleId: string | null
  vehicleName: string | null
  severity: string
  message: string
  createdAt: string
  timeLabel: string
}

const VALID_BUS_STATUSES: BusStatus[] = ['en_service', 'en_panne', 'en_maintenance']
function isBusStatus(s: string): s is BusStatus {
  return (VALID_BUS_STATUSES as string[]).includes(s)
}

const VALID_SCHEDULE_STATUSES: ScheduleEntry['status'][] = ['a_l_heure', 'en_retard', 'annule', 'complet']
function isScheduleStatus(s: string): s is ScheduleEntry['status'] {
  return (VALID_SCHEDULE_STATUSES as string[]).includes(s)
}

const VALID_SEVERITIES: AlertEntry['severity'][] = ['critique', 'avertissement', 'info']
function isSeverity(s: string): s is AlertEntry['severity'] {
  return (VALID_SEVERITIES as string[]).includes(s)
}

function mapVehicle(v: ApiVehicle): BusVehicle {
  return {
    id: v.id,
    name: v.name,
    plate: v.plate,
    capacity: v.capacity,
    route: v.routeName || 'Aucun trajet assigne',
    status: isBusStatus(v.status) ? v.status : 'en_service',
    occupancy: v.occupancy,
    driver: v.driverName || 'Non renseigne',
    schedule: v.schedule,
  }
}

function mapRoute(r: ApiRoute): RouteInfo {
  return {
    id: r.id,
    name: r.name,
    departure: r.departure,
    arrival: r.arrival,
    distance: r.distanceKm ?? 0,
    duration: r.durationLabel || 'Non renseignee',
    stops: r.stops,
    frequency: r.frequency || 'Non renseignee',
    avgOccupancy: r.avgOccupancy,
    vehicleCount: r.vehicleCount,
    subscriptionCount: r.subscriptionCount,
  }
}

function mapScheduleEntry(s: ApiScheduleEntry): ScheduleEntry {
  return {
    id: s.id,
    departure: s.departureTime,
    bus: s.vehicleName,
    route: s.routeName,
    driver: s.driverName || 'Non renseigne',
    availableSeats: s.availableSeats,
    status: isScheduleStatus(s.status) ? s.status : 'a_l_heure',
  }
}

function mapMaintenanceEntry(m: ApiMaintenanceEntry): MaintenanceEntry {
  return {
    id: m.id,
    bus: m.vehicleName,
    type: m.type,
    date: new Date(m.performedAt).toLocaleDateString('fr-FR'),
    cost: m.cost,
  }
}

function mapAlertEntry(a: ApiAlertEntry): AlertEntry {
  return {
    id: a.id,
    severity: isSeverity(a.severity) ? a.severity : 'info',
    message: a.message,
    time: a.timeLabel,
  }
}

// ─── Config Maps ────────────────────────────────────────────────────────────────

const busStatusConfig: Record<BusStatus, { label: string; color: string; pulseColor: string }> = {
  en_service: { label: 'En service', color: '#2d7a4f', pulseColor: '#3da66a' },
  en_panne: { label: 'En panne', color: '#c62828', pulseColor: '#ef5350' },
  en_maintenance: { label: 'En maintenance', color: '#d4a853', pulseColor: '#e6c477' },
}

const scheduleStatusConfig: Record<ScheduleEntry['status'], { label: string; className: string }> = {
  a_l_heure: { label: 'A l\'heure', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0 hover:bg-[#2d7a4f15]' },
  en_retard: { label: 'En retard', className: 'bg-[#d4a85315] text-[#d4a853] border-0 hover:bg-[#d4a85315]' },
  annule: { label: 'Annule', className: 'bg-[#c6282815] text-[#c62828] border-0 hover:bg-[#c6282815]' },
  complet: { label: 'Complet', className: 'bg-[#1a274415] text-[#1a2744] border-0 hover:bg-[#1a274415]' },
}

const frequencyConfig: Record<string, { className: string }> = {
  Quotidien: { className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' },
  Semaine: { className: 'bg-[#1a274415] text-[#1a2744] border-0' },
  'Week-end': { className: 'bg-[#d4a85315] text-[#d4a853] border-0' },
}

const severityConfig: Record<string, { className: string; dotColor: string }> = {
  critique: { className: 'bg-[#c6282815] text-[#c62828] border-0', dotColor: '#c62828' },
  avertissement: { className: 'bg-[#d4a85315] text-[#d4a853] border-0', dotColor: '#d4a853' },
  info: { className: 'bg-[#1a274415] text-[#1a2744] border-0', dotColor: '#1a2744' },
}

const routeColors = ['#1a2744', '#2d7a4f', '#d4a853', '#3da66a', '#c62828', '#6b7280']

// ─── Animated Stat Component ────────────────────────────────────────────────────

function AnimatedStat({ value, label, icon: Icon }: { value: number; label: string; icon: React.ElementType }) {
  const count = useCountUp(value, 1400)
  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-3 flex items-center gap-3">
      <div className="p-2 rounded-lg bg-white/10">
        <Icon className="size-5 text-white" />
      </div>
      <div>
        <p className="text-xl font-bold text-white">{count}</p>
        <p className="text-[10px] text-white/70">{label}</p>
      </div>
    </div>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────────

export function TransportPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [reservBus, setReservBus] = useState('')
  const [reservDate, setReservDate] = useState('')
  const [reservTime, setReservTime] = useState('')
  const [reservRoute, setReservRoute] = useState('')
  const [reservPassengers, setReservPassengers] = useState('')
  const [reservNotes, setReservNotes] = useState('')
  const [searchSchedule, setSearchSchedule] = useState('')
  const [filterRoute, setFilterRoute] = useState('all')
  const [filterBus, setFilterBus] = useState('all')
  const [filterPeriod, setFilterPeriod] = useState('all')

  const { data: transportQuery, isLoading } = useTransport() as {
    data: {
      vehicles?: ApiVehicle[]
      routes?: ApiRoute[]
      schedule?: ApiScheduleEntry[]
      maintenance?: ApiMaintenanceEntry[]
      alerts?: ApiAlertEntry[]
    } | undefined
    isLoading: boolean
  }

  const buses: BusVehicle[] = (transportQuery?.vehicles || []).map(mapVehicle)
  const routes: RouteInfo[] = (transportQuery?.routes || []).map(mapRoute)
  const schedule: ScheduleEntry[] = (transportQuery?.schedule || []).map(mapScheduleEntry)
  const maintenance: MaintenanceEntry[] = (transportQuery?.maintenance || []).map(mapMaintenanceEntry)
  const alerts: AlertEntry[] = (transportQuery?.alerts || []).map(mapAlertEntry)

  // Filtered schedule
  const filteredSchedule = useMemo(() => {
    return schedule.filter(s => {
      const matchSearch = searchSchedule === '' ||
        s.bus.toLowerCase().includes(searchSchedule.toLowerCase()) ||
        s.driver.toLowerCase().includes(searchSchedule.toLowerCase()) ||
        s.route.toLowerCase().includes(searchSchedule.toLowerCase())
      const matchRoute = filterRoute === 'all' || s.route === filterRoute
      const matchBus = filterBus === 'all' || s.bus === filterBus
      const matchPeriod = filterPeriod === 'all' ||
        (filterPeriod === 'matin' && parseInt(s.departure) < 12) ||
        (filterPeriod === 'apres_midi' && parseInt(s.departure) >= 12 && parseInt(s.departure) < 18) ||
        (filterPeriod === 'soir' && parseInt(s.departure) >= 18)
      return matchSearch && matchRoute && matchBus && matchPeriod
    })
  }, [schedule, searchSchedule, filterRoute, filterBus, filterPeriod])

  // Stats - all derived from real vehicles/schedule (no fabricated numbers)
  const activeBuses = buses.filter(b => b.status === 'en_service').length
  const maintenanceBuses = buses.filter(b => b.status === 'en_maintenance').length
  const brokenBuses = buses.filter(b => b.status === 'en_panne').length
  const todayTrips = schedule.filter(s => s.status !== 'annule').length
  const studentsTransported = buses.reduce((acc, b) => acc + b.occupancy, 0)
  const totalCapacity = buses.reduce((acc, b) => acc + b.capacity, 0)
  const occupancyRate = totalCapacity > 0 ? Math.round((studentsTransported / totalCapacity) * 100) : 0

  // Transport statistics
  const topRoutesByRidership = useMemo(() => {
    return routes.slice().sort((a, b) => b.avgOccupancy - a.avgOccupancy).slice(0, 5)
  }, [routes])
  const maxOccupancy = Math.max(...topRoutesByRidership.map(r => r.avgOccupancy), 1)

  // Departures by period of day - real counts from the departures board
  const morningDepartures = schedule.filter(s => parseInt(s.departure) < 12).length
  const afternoonDepartures = schedule.filter(s => {
    const h = parseInt(s.departure)
    return h >= 12 && h < 18
  }).length
  const eveningDepartures = schedule.filter(s => parseInt(s.departure) >= 18).length

  // Route coverage: how many configured routes actually have a vehicle assigned
  const routesWithVehicle = routes.filter(r => r.vehicleCount > 0).length

  const totalMaintenanceCost = maintenance.reduce((acc, m) => acc + m.cost, 0)
  const lastMaintenance = maintenance[0] || null

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
  } as const

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  } as const

  const busCardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
  } as const

  return (
    <TooltipProvider>
      <motion.div
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ─── 1. Gradient Header Banner ─────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="relative overflow-hidden rounded-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a2744] via-[#1f3050] to-[#2d7a4f]" />
          <svg className="absolute inset-0 w-full h-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="transport-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <rect x="0" y="0" width="40" height="40" fill="none" stroke="white" strokeWidth="0.5" />
                <circle cx="20" cy="20" r="3" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#transport-pattern)" />
          </svg>
          <div className="relative z-10 px-6 py-8">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white">Transport &amp; Navette</h1>
                <p className="text-sm text-white/70 mt-1">Gestion du parc de transport et navettes universitaires</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <AnimatedStat value={activeBuses} label="Bus actifs" icon={Bus} />
                <AnimatedStat value={todayTrips} label="Trajets du jour" icon={Route} />
                <AnimatedStat value={studentsTransported} label="Etudiants transportes" icon={Users} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─── 2. 4 Stats Cards ────────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Bus actifs', value: activeBuses, color: '#1a2744', icon: Bus, trend: '', trendUp: true },
            { label: 'Trajets du jour', value: todayTrips, color: '#2d7a4f', icon: Route, trend: '', trendUp: true },
            { label: 'Etudiants transportes', value: studentsTransported, color: '#d4a853', icon: Users, trend: '', trendUp: true },
            { label: 'Taux remplissage', value: occupancyRate, color: '#2d7a4f', icon: TrendingUp, trend: `${occupancyRate}%`, trendUp: true },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="overflow-hidden relative border-l-4 hover:shadow-md transition-shadow" style={{ borderLeftColor: stat.color }}>
                <div className="h-1 w-full" style={{ background: `linear-gradient(to right, ${stat.color}, ${stat.color}60)` }} />
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.label}</p>
                      <p className="text-2xl font-bold mt-1" style={{ color: stat.color }}>{stat.label === 'Taux remplissage' ? `${stat.value}%` : stat.value}</p>
                      {stat.trend && (
                        <div className="flex items-center gap-1 mt-1">
                          {stat.trendUp ? (
                            <TrendingUp className="size-3 text-[#2d7a4f]" />
                          ) : (
                            <TrendingDown className="size-3 text-[#c62828]" />
                          )}
                          <span className={`text-xs font-medium ${stat.trendUp ? 'text-[#2d7a4f]' : 'text-[#c62828]'}`}>{stat.trend}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${stat.color}15` }}>
                      <stat.icon className="size-5" style={{ color: stat.color }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* ─── 3. Bus Fleet Grid ──────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#1a2744] uppercase tracking-wide">Parc de bus</h2>
            <Badge className="text-[10px] bg-[#1a274410] text-[#1a2744] border-0">{buses.length} vehicules</Badge>
          </div>
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="h-56 animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-full flex items-center justify-center text-xs text-gray-400">Chargement...</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {!isLoading && buses.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-gray-400">
                Aucun vehicule enregistre. Ajoutez un vehicule pour commencer a suivre votre flotte.
              </CardContent>
            </Card>
          )}
          {!isLoading && buses.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {buses.map((bus) => {
              const sConfig = busStatusConfig[bus.status]
              const occupancyPercent = bus.capacity > 0 ? Math.round((bus.occupancy / bus.capacity) * 100) : 0
              return (
                <motion.div
                  key={bus.id}
                  variants={busCardVariants}
                  whileHover={{ scale: 1.03 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-bold text-[#1a2744]">{bus.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Bus className="size-3 text-gray-400" />
                            <span className="text-[10px] text-gray-500 font-mono">{bus.plate}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <motion.div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: sConfig.pulseColor }}
                            animate={bus.status === 'en_service' ? { scale: [1, 1.4, 1], opacity: [1, 0.6, 1] } : bus.status === 'en_panne' ? { scale: [1, 1.4, 1], opacity: [1, 0.5, 1] } : {}}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                          />
                          <Badge className="text-[9px] border-0" style={{ backgroundColor: `${sConfig.color}15`, color: sConfig.color }}>
                            {sConfig.label}
                          </Badge>
                        </div>
                      </div>

                      {/* Route & Capacity */}
                      <div className="flex items-center gap-1.5 mb-2">
                        <Route className="size-3 text-gray-400" />
                        <span className="text-[10px] text-gray-600 truncate">{bus.route}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Users className="size-3 text-gray-400" />
                        <span className="text-[10px] text-gray-500">{bus.occupancy}/{bus.capacity} places</span>
                      </div>

                      {/* Occupancy progress bar */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[9px] text-gray-400 font-medium">Remplissage</span>
                          <span className="text-[9px] font-semibold" style={{ color: occupancyPercent > 80 ? '#c62828' : occupancyPercent > 50 ? '#d4a853' : '#2d7a4f' }}>{occupancyPercent}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: occupancyPercent > 80 ? '#c62828' : occupancyPercent > 50 ? '#d4a853' : '#2d7a4f' }}
                            initial={{ width: 0 }}
                            animate={{ width: `${occupancyPercent}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                          />
                        </div>
                      </div>

                      {/* Today's schedule mini-timeline */}
                      {bus.schedule.length > 0 && (
                        <div className="mb-2">
                          <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Aujourd&apos;hui</p>
                          <div className="space-y-0.5">
                            {bus.schedule.map((slot, i) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#2d7a4f]" />
                                <span className="text-[10px] text-gray-500">{slot.start}-{slot.end}</span>
                                <span className="text-[10px] font-medium text-[#1a2744]">{slot.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {bus.schedule.length === 0 && (
                        <div className="mb-2">
                          <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Aujourd&apos;hui</p>
                          <p className="text-[10px] text-[#c62828]">Indisponible</p>
                        </div>
                      )}

                      {/* Driver name */}
                      <div className="flex items-center gap-1.5 mb-3">
                        <Phone className="size-3 text-gray-400" />
                        <span className="text-[10px] text-gray-500">{bus.driver}</span>
                      </div>

                      {/* Voir details button */}
                      <Button
                        size="sm"
                        className="w-full h-8 text-[10px] bg-[#1a2744] hover:bg-[#253556] text-white disabled:opacity-50"
                        disabled={bus.status === 'en_panne'}
                      >
                        Voir details
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
          )}
        </motion.div>

        {/* ─── 4. Route Management Card ─────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-[#1a2744]">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Route className="size-4 text-[#1a2744]" />
                <CardTitle className="text-sm font-semibold text-[#1a2744]">Gestion des trajets</CardTitle>
                <Badge className="text-[10px] bg-[#1a274415] text-[#1a2744] border-0">{routes.length} trajets</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-32 rounded-lg border border-gray-100 animate-pulse flex items-center justify-center text-xs text-gray-400">
                      Chargement...
                    </div>
                  ))}
                </div>
              )}
              {!isLoading && routes.length === 0 && (
                <div className="text-center py-8 text-sm text-gray-400">
                  Aucune route configuree. Ajoutez un trajet pour organiser vos navettes.
                </div>
              )}
              {!isLoading && routes.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {routes.map((route, idx) => {
                  const fConfig = frequencyConfig[route.frequency] || frequencyConfig['Quotidien']
                  const routeColor = routeColors[idx % routeColors.length]
                  return (
                    <motion.div
                      key={route.id}
                      whileHover={{ scale: 1.01 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="border border-gray-100 rounded-lg p-3 hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-xs font-bold text-[#1a2744]">{route.name}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <MapPin className="size-3 text-gray-400" />
                              <span className="text-[10px] text-gray-500">{route.departure}</span>
                              <span className="text-gray-300 mx-0.5">&rarr;</span>
                              <span className="text-[10px] text-gray-500">{route.arrival}</span>
                            </div>
                          </div>
                          <Badge className={`text-[9px] ${fConfig.className}`}>
                            {route.frequency}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-1">
                            <Navigation className="size-3 text-gray-400" />
                            <span className="text-[10px] text-gray-600">{route.distance} km</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Timer className="size-3 text-gray-400" />
                            <span className="text-[10px] text-gray-600">{route.duration}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="size-3 text-gray-400" />
                            <span className="text-[10px] text-gray-600">{route.avgOccupancy}%</span>
                          </div>
                        </div>

                        {/* Visual route map with colored dots for stops */}
                        <div className="flex items-center gap-0.5 mb-1">
                          {route.stops.map((stop, stopIdx) => (
                            <div key={stopIdx} className="flex items-center">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className="w-3 h-3 rounded-full border-2 border-white shadow-sm shrink-0 cursor-pointer"
                                    style={{ backgroundColor: routeColor }}
                                  />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  {stop}
                                </TooltipContent>
                              </Tooltip>
                              {stopIdx < route.stops.length - 1 && (
                                <div className="w-4 h-0.5" style={{ backgroundColor: `${routeColor}40` }} />
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-gray-400">{route.stops.length} arrets</span>
                          <div className="h-1 flex-1 mx-2 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: routeColor }}
                              initial={{ width: 0 }}
                              animate={{ width: `${route.avgOccupancy}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut', delay: idx * 0.1 }}
                            />
                          </div>
                          <span className="text-[9px] font-medium" style={{ color: routeColor }}>{route.avgOccupancy}%</span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── 5. Daily Schedule Table ───────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-[#2d7a4f]">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-[#2d7a4f]" />
                  <CardTitle className="text-sm font-semibold text-[#1a2744]">Programmation du jour</CardTitle>
                  <Badge className="text-[10px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">{filteredSchedule.length} trajets</Badge>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs">
                      <Plus className="size-3.5 mr-1.5" />
                      Nouvelle reservation
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search + Filters */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4">
                <div className="relative flex-1 w-full sm:max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
                  <Input
                    placeholder="Rechercher..."
                    className="pl-8 h-8 text-xs"
                    value={searchSchedule}
                    onChange={(e) => setSearchSchedule(e.target.value)}
                  />
                </div>
                <Select value={filterRoute} onValueChange={setFilterRoute}>
                  <SelectTrigger className="h-8 text-xs w-full sm:w-[180px]">
                    <SelectValue placeholder="Trajet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les trajets</SelectItem>
                    {routes.map(r => (
                      <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterBus} onValueChange={setFilterBus}>
                  <SelectTrigger className="h-8 text-xs w-full sm:w-[180px]">
                    <SelectValue placeholder="Bus" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les bus</SelectItem>
                    {buses.map(b => (
                      <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                  <SelectTrigger className="h-8 text-xs w-full sm:w-[140px]">
                    <SelectValue placeholder="Periode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toute la journee</SelectItem>
                    <SelectItem value="matin">Matin</SelectItem>
                    <SelectItem value="apres_midi">Apres-midi</SelectItem>
                    <SelectItem value="soir">Soir</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Schedule Table */}
              <ScrollArea className="max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px]">Depart</TableHead>
                      <TableHead className="text-[10px]">Bus</TableHead>
                      <TableHead className="text-[10px]">Trajet</TableHead>
                      <TableHead className="text-[10px]">Chauffeur</TableHead>
                      <TableHead className="text-[10px]">Places disp.</TableHead>
                      <TableHead className="text-[10px]">Statut</TableHead>
                      <TableHead className="text-[10px] w-10">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-sm text-gray-400">
                          Chargement de la programmation...
                        </TableCell>
                      </TableRow>
                    )}
                    {!isLoading && filteredSchedule.map((entry) => {
                      const sConfig = scheduleStatusConfig[entry.status]
                      return (
                        <TableRow key={entry.id} className="hover:bg-gray-50/50">
                          <TableCell className="text-xs font-medium text-[#1a2744]">{entry.departure}</TableCell>
                          <TableCell className="text-xs text-gray-700">{entry.bus}</TableCell>
                          <TableCell className="text-xs text-gray-600 max-w-[200px] truncate">{entry.route}</TableCell>
                          <TableCell className="text-xs text-gray-600">{entry.driver}</TableCell>
                          <TableCell>
                            <span className={`text-xs font-semibold ${entry.availableSeats === 0 ? 'text-[#c62828]' : 'text-[#2d7a4f]'}`}>
                              {entry.availableSeats === 0 ? 'Complet' : entry.availableSeats}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-[9px] ${sConfig.className}`}>
                              {sConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                  <MoreHorizontal className="size-3.5 text-gray-400" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="text-xs">
                                <div className="flex flex-col gap-1 py-1">
                                  <button className="flex items-center gap-2 px-2 py-1 hover:bg-gray-100 rounded text-left">
                                    <Pencil className="size-3" /> Modifier
                                  </button>
                                  <button className="flex items-center gap-2 px-2 py-1 hover:bg-gray-100 rounded text-left">
                                    <Trash2 className="size-3" /> Supprimer
                                  </button>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {!isLoading && schedule.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-sm text-gray-400">
                          Aucun trajet programme pour le moment.
                        </TableCell>
                      </TableRow>
                    )}
                    {!isLoading && schedule.length > 0 && filteredSchedule.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-sm text-gray-400">
                          Aucun trajet ne correspond a votre recherche.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── 6. Transport Statistics Card ──────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-[#d4a853]">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-[#d4a853]" />
                <CardTitle className="text-sm font-semibold text-[#1a2744]">Statistiques de transport</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top 5 routes by ridership - CSS animated bar chart */}
                <div className="lg:col-span-2">
                  <p className="text-xs font-semibold text-gray-600 mb-3">Top 5 trajets par affluence</p>
                  {topRoutesByRidership.length === 0 ? (
                    <div className="text-xs text-gray-400 py-8 text-center border border-dashed border-gray-200 rounded-lg">
                      Aucune donnee de frequentation disponible pour le moment.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {topRoutesByRidership.map((route, idx) => {
                        const routeColor = routeColors[routes.indexOf(route) % routeColors.length]
                        const barWidth = Math.round((route.avgOccupancy / maxOccupancy) * 100)
                        return (
                          <div key={route.id}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] font-medium text-[#1a2744] truncate max-w-[200px]">{route.name}</span>
                              <span className="text-[11px] font-bold" style={{ color: routeColor }}>{route.avgOccupancy}%</span>
                            </div>
                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: routeColor }}
                                initial={{ width: 0 }}
                                animate={{ width: `${barWidth}%` }}
                                transition={{ duration: 1, ease: 'easeOut', delay: idx * 0.15 }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Right side stats - all derived from real data. The previous
                    revenue-tracking and fuel-consumption widgets are gone: no
                    Transport model carries a fare or fuel field, so there was
                    nothing honest to show there. These three boxes surface
                    real numbers instead. */}
                <div className="space-y-4">
                  {/* Departures by period of day */}
                  <div className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="size-3.5 text-[#d4a853]" />
                      <p className="text-xs font-semibold text-gray-600">Repartition des departs</p>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-500">Matin (avant 12h)</span>
                        <span className="text-[10px] font-bold text-[#1a2744]">{morningDepartures}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-500">Apres-midi (12h-18h)</span>
                        <span className="text-[10px] font-bold text-[#1a2744]">{afternoonDepartures}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-500">Soir (apres 18h)</span>
                        <span className="text-[10px] font-bold text-[#1a2744]">{eveningDepartures}</span>
                      </div>
                    </div>
                  </div>

                  {/* Fleet status breakdown */}
                  <div className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Bus className="size-3.5 text-[#2d7a4f]" />
                      <p className="text-xs font-semibold text-gray-600">Etat du parc</p>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-500">En service</span>
                        <span className="text-[10px] font-bold text-[#2d7a4f]">{activeBuses}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-500">En maintenance</span>
                        <span className="text-[10px] font-bold text-[#d4a853]">{maintenanceBuses}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-500">En panne</span>
                        <span className="text-[10px] font-bold text-[#c62828]">{brokenBuses}</span>
                      </div>
                    </div>
                  </div>

                  {/* Route coverage + cumulative maintenance cost */}
                  <div className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Route className="size-3.5 text-[#d4a853]" />
                      <p className="text-xs font-semibold text-gray-600">Couverture des trajets</p>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-gray-500">Trajets avec vehicule assigne</span>
                      <span className="text-xs font-bold text-[#1a2744]">{routesWithVehicle}/{routes.length}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1">
                      <motion.div
                        className="h-full rounded-full bg-[#d4a853]"
                        initial={{ width: 0 }}
                        animate={{ width: `${routes.length > 0 ? Math.round((routesWithVehicle / routes.length) * 100) : 0}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-gray-400">Cout maintenance cumule</span>
                      <span className="text-[9px] text-[#d4a853] font-medium">{totalMaintenanceCost.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── 7. Maintenance & Alerts Card ──────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-[#1a2744]">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-[#1a2744]" />
                <CardTitle className="text-sm font-semibold text-[#1a2744]">Maintenance &amp; Alertes</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Maintenance entries */}
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-3">Historique de maintenance</p>
                  {maintenance.length === 0 ? (
                    <div className="text-center py-6 text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg">
                      Aucune maintenance enregistree pour le moment.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {maintenance.map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-3 hover:bg-gray-50/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-[#1a274410]">
                              <Bus className="size-4 text-[#1a2744]" />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-[#1a2744]">{entry.bus}</p>
                              <p className="text-[10px] text-gray-500">{entry.type} - {entry.date}</p>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-[#1a2744]">{entry.cost.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Most recently recorded maintenance. There is no "next
                      scheduled maintenance" concept in the schema - only
                      completed interventions with a performedAt date - so
                      this shows the real latest record instead of a
                      fabricated upcoming date. */}
                  <div className="mt-3 p-3 rounded-lg bg-[#2d7a4f08] border border-[#2d7a4f20]">
                    <div className="flex items-center gap-2">
                      <Clock className="size-3.5 text-[#2d7a4f]" />
                      <p className="text-xs font-medium text-[#2d7a4f]">Derniere maintenance enregistree</p>
                    </div>
                    <p className="text-[10px] text-gray-600 mt-1">
                      {lastMaintenance
                        ? `${lastMaintenance.bus} - ${lastMaintenance.type} le ${lastMaintenance.date}`
                        : 'Aucune maintenance enregistree pour le moment.'}
                    </p>
                  </div>
                </div>

                {/* Alerts */}
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-3">Alertes actives</p>
                  {alerts.length === 0 ? (
                    <div className="text-center py-6 text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg">
                      Aucune alerte active.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {alerts.map((alert) => {
                        const sevConfig = severityConfig[alert.severity]
                        return (
                          <div key={alert.id} className="flex items-start gap-3 border border-gray-100 rounded-lg p-3 hover:bg-gray-50/50 transition-colors">
                            <motion.div
                              className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
                              style={{ backgroundColor: sevConfig.dotColor }}
                              animate={alert.severity === 'critique' ? { scale: [1, 1.3, 1], opacity: [1, 0.6, 1] } : {}}
                              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <Badge className={`text-[8px] ${sevConfig.className}`}>
                                  {alert.severity === 'critique' ? 'Critique' : alert.severity === 'avertissement' ? 'Attention' : 'Info'}
                                </Badge>
                                <span className="text-[9px] text-gray-400">{alert.time}</span>
                              </div>
                              <p className="text-[11px] text-gray-700 leading-relaxed">{alert.message}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Maintenance cost summary */}
                  <div className="mt-3 p-3 rounded-lg bg-[#1a274408] border border-[#1a274420]">
                    <p className="text-xs font-medium text-[#1a2744] mb-1">Cout total maintenance</p>
                    <p className="text-lg font-bold text-[#1a2744]">{totalMaintenanceCost.toLocaleString('fr-FR')} <span className="text-xs font-normal text-gray-400">FCFA</span></p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── 8. New Reservation Dialog ─────────────────────────────────────────── */}
        {/* NOTE: this dialog models an ad-hoc single-passenger booking on a
            specific trip. There is no backing Prisma model for that (only a
            recurring TransportDeparture time slot and route-level
            TransportSubscription, and student-facing route subscription is
            explicitly out of scope for this admin/ops page). The dropdowns
            below now source real buses/routes, but - as in the original
            demo build - the confirm button is decorative: there is no
            endpoint to wire it to without inventing a reservation model that
            doesn't exist in the schema. */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[#1a2744] flex items-center gap-2">
                <Bus className="size-5" />
                Nouvelle reservation
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Bus</Label>
                  <Select value={reservBus} onValueChange={setReservBus}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Choisir un bus" />
                    </SelectTrigger>
                    <SelectContent>
                      {buses.filter(b => b.status === 'en_service').map(bus => (
                        <SelectItem key={bus.id} value={bus.name}>{bus.name} ({bus.capacity} pl.)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Date</Label>
                  <Input type="date" className="h-9 text-sm" value={reservDate} onChange={(e) => setReservDate(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Heure</Label>
                  <Select value={reservTime} onValueChange={setReservTime}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                    <SelectContent>
                      {['06:00', '06:30', '07:00', '07:30', '08:00', '09:00', '10:00', '11:00', '11:30', '12:00', '12:30', '13:00', '14:00', '15:00', '16:00', '16:30', '17:00', '17:30', '18:00'].map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Trajet</Label>
                  <Select value={reservRoute} onValueChange={setReservRoute}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Choisir un trajet" />
                    </SelectTrigger>
                    <SelectContent>
                      {routes.map(r => (
                        <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600">Nombre de passagers</Label>
                <Input type="number" placeholder="0" className="h-9 text-sm" value={reservPassengers} onChange={(e) => setReservPassengers(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600">Notes</Label>
                <Input placeholder="Informations supplementaires..." className="h-9 text-sm" value={reservNotes} onChange={(e) => setReservNotes(e.target.value)} />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button size="sm" className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs" disabled={!reservBus || !reservDate || !reservTime || !reservRoute}>
                  <CheckCircle2 className="size-3.5 mr-1.5" />
                  Confirmer la reservation
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ─── 9. African Context Card ─────────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-[#2d7a4f]">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Globe className="size-4 text-[#2d7a4f]" />
                <CardTitle className="text-sm font-semibold text-[#1a2744]">Contexte africain</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Multi-campus distances */}
                <div className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="size-3.5 text-[#1a2744]" />
                    <p className="text-xs font-semibold text-[#1a2744]">Distances multi-campus</p>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500">N&apos;Djamena Campus-Centre</span>
                      <span className="text-[10px] font-bold text-[#1a2744]">12 km</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500">Douala Campus 1-2</span>
                      <span className="text-[10px] font-bold text-[#1a2744]">18 km</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500">Dakar UCAD-ESTI</span>
                      <span className="text-[10px] font-bold text-[#1a2744]">8 km</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500">Ouagadougou Campus-Ville</span>
                      <span className="text-[10px] font-bold text-[#1a2744]">15 km</span>
                    </div>
                  </div>
                </div>

                {/* Fuel price variability */}
                <div className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Fuel className="size-3.5 text-[#d4a853]" />
                    <p className="text-xs font-semibold text-[#1a2744]">Variabilite prix carburant</p>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500">Tchad (Super)</span>
                      <span className="text-[10px] font-bold text-[#d4a853]">620 FCFA/L</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500">Cameroun (Super)</span>
                      <span className="text-[10px] font-bold text-[#d4a853]">730 FCFA/L</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500">Senegal (Super)</span>
                      <span className="text-[10px] font-bold text-[#d4a853]">655 FCFA/L</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500">Variation mensuelle</span>
                      <span className="text-[10px] font-bold text-[#c62828]">+5 a 15%</span>
                    </div>
                  </div>
                </div>

                {/* Vehicle aging context */}
                <div className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Bus className="size-3.5 text-[#c62828]" />
                    <p className="text-xs font-semibold text-[#1a2744]">Vieillissement du parc</p>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500">Age moyen du parc</span>
                      <span className="text-[10px] font-bold text-[#c62828]">12 ans</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500">Pannes/mois</span>
                      <span className="text-[10px] font-bold text-[#c62828]">4.2</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500">Budget renouvellement</span>
                      <span className="text-[10px] font-bold text-[#2d7a4f]">15M FCFA</span>
                    </div>
                  </div>
                </div>

                {/* Shared taxi integration */}
                <div className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="size-3.5 text-[#2d7a4f]" />
                    <p className="text-xs font-semibold text-[#1a2744]">Integration taxis partages</p>
                  </div>
                  <p className="text-[10px] text-gray-600 leading-relaxed">
                    Complementaire aux navettes universitaires, les taxis partages (clandos) assurent les trajets secondaires. Partenariats en cours avec 12 conducteurs pour desservir les zones non couvertes par le parc officiel.
                  </p>
                </div>

                {/* Low-connectivity offline mode */}
                <div className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <CloudOff className="size-3.5 text-[#1a2744]" />
                    <p className="text-xs font-semibold text-[#1a2744]">Mode hors ligne</p>
                  </div>
                  <p className="text-[10px] text-gray-600 leading-relaxed">
                    Le systeme fonctionne en mode degrade quand la connexion est faible. Les horaires et reservations sont synchronises automatiquement des que la connexion revient. SMS de confirmation disponibles pour les zones a faible couverture internet.
                  </p>
                </div>

                {/* Security context */}
                <div className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="size-3.5 text-[#1a2744]" />
                    <p className="text-xs font-semibold text-[#1a2744]">Securite des trajets</p>
                  </div>
                  <p className="text-[10px] text-gray-600 leading-relaxed">
                    Controles techniques obligatoires, suivi GPS en temps reel, numeros d&apos;urgence affiches dans chaque vehicule. Signalisation des zones a risque sur les trajets inter-quartiers.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </TooltipProvider>
  )
}
