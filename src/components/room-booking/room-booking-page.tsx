'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DoorOpen,
  Calendar,
  Clock,
  Users,
  Monitor,
  Wifi,
  AirVent,
  Projector,
  Presentation,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
  Zap,
  TrendingUp,
  TrendingDown,
  Building2,
  BarChart3,
  Shield,
  CloudOff,
  Signal,
  MapPin,
} from 'lucide-react'
import { useRooms } from '@/lib/api-hooks'

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

type RoomStatus = 'libre' | 'occupee' | 'maintenance'
type ReservationPurpose = 'Cours' | 'Conference' | 'Reunion' | 'Examen' | 'Autre'
type ReservationStatus = 'confirmee' | 'en_attente' | 'annulee'

interface Room {
  id: string
  name: string
  capacity: number
  equipment: string[]
  status: RoomStatus
  todaySchedule: { start: string; end: string; purpose: string }[]
  building: string
}

interface Reservation {
  id: string
  room: string
  date: string
  startTime: string
  endTime: string
  purpose: ReservationPurpose
  organizer: string
  participants: number
  status: ReservationStatus
}

interface EquipmentItem {
  id: string
  name: string
  total: number
  available: number
  condition: 'neuf' | 'bon' | 'usure' | 'hors_service'
  nextMaintenance: string
}

// ─── API Mapping ────────────────────────────────────────────────────────────────

interface RoomRecord {
  id: string
  name: string
  type?: string
  capacity: number
  building: string | null
  equipment: string
  status: RoomStatus
  isActive: boolean
  todaySchedule?: { start: string; end: string; purpose: string }[]
}

function mapRoom(r: RoomRecord): Room {
  return {
    id: r.id,
    name: r.name,
    capacity: r.capacity,
    equipment: r.equipment ? r.equipment.split(',').map(s => s.trim()).filter(Boolean) : [],
    status: r.status,
    todaySchedule: r.todaySchedule || [],
    building: r.building || '',
  }
}

interface ReservationRecord {
  id: string
  roomId: string
  room: string
  date: string
  startTime: string
  endTime: string
  purpose: string
  organizer: string
  participants: number
  status: string
}

function mapReservation(r: ReservationRecord): Reservation {
  return {
    id: r.id,
    room: r.room,
    date: r.date,
    startTime: r.startTime,
    endTime: r.endTime,
    purpose: (r.purpose as ReservationPurpose) || 'Autre',
    organizer: r.organizer,
    participants: r.participants,
    status: (r.status as ReservationStatus) || 'en_attente',
  }
}

// ─── Demo Data ──────────────────────────────────────────────────────────────────
// demoReservations was removed: reservations now come from the real
// RoomReservation rows returned by GET /api/rooms (see `reservations` below).

// demoEquipment stays hardcoded on purpose: it models a shared equipment pool
// (total/available counts, condition, next maintenance date) that has no
// backing Prisma model. `Room.equipment` is only a plain comma-separated
// string field per room (parsed into badges in mapRoom above) — it carries no
// quantities, availability, condition, or maintenance data, so there is
// nothing honest to derive this table from. Left as-is rather than
// fabricating tracking data that doesn't exist.
const demoEquipment: EquipmentItem[] = [
  { id: '1', name: 'Video-projecteurs', total: 18, available: 12, condition: 'bon', nextMaintenance: '15/04/2025' },
  { id: '2', name: 'Ordinateurs portables', total: 45, available: 30, condition: 'bon', nextMaintenance: '20/04/2025' },
  { id: '3', name: 'Microphones', total: 24, available: 18, condition: 'usure', nextMaintenance: '10/03/2025' },
  { id: '4', name: 'Tableaux interactifs', total: 6, available: 5, condition: 'neuf', nextMaintenance: '01/06/2025' },
  { id: '5', name: 'Haut-parleurs', total: 12, available: 8, condition: 'bon', nextMaintenance: '25/04/2025' },
  { id: '6', name: 'Climatiseurs mobiles', total: 8, available: 3, condition: 'usure', nextMaintenance: '05/03/2025' },
  { id: '7', name: 'Retroprojecteurs', total: 4, available: 0, condition: 'hors_service', nextMaintenance: 'En attente' },
  { id: '8', name: 'Extendons WiFi', total: 15, available: 10, condition: 'neuf', nextMaintenance: '30/06/2025' },
]

// ─── Config Maps ────────────────────────────────────────────────────────────────

const statusConfig: Record<RoomStatus, { label: string; color: string; pulseColor: string }> = {
  libre: { label: 'Libre', color: '#2d7a4f', pulseColor: '#3da66a' },
  occupee: { label: 'Occupee', color: '#d4a853', pulseColor: '#e6c477' },
  maintenance: { label: 'En maintenance', color: '#c62828', pulseColor: '#ef5350' },
}

const purposeConfig: Record<ReservationPurpose, { color: string; bgClass: string }> = {
  Cours: { color: '#1a2744', bgClass: 'bg-[#1a2744]' },
  Conference: { color: '#2d7a4f', bgClass: 'bg-[#2d7a4f]' },
  Reunion: { color: '#d4a853', bgClass: 'bg-[#d4a853]' },
  Examen: { color: '#c62828', bgClass: 'bg-[#c62828]' },
  Autre: { color: '#6b7280', bgClass: 'bg-gray-500' },
}

const reservationStatusConfig: Record<ReservationStatus, { label: string; className: string }> = {
  confirmee: { label: 'Confirmee', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0 hover:bg-[#2d7a4f15]' },
  en_attente: { label: 'En attente', className: 'bg-[#d4a85315] text-[#d4a853] border-0 hover:bg-[#d4a85315]' },
  annulee: { label: 'Annulee', className: 'bg-[#c6282815] text-[#c62828] border-0 hover:bg-[#c6282815]' },
}

const conditionConfig: Record<string, { label: string; className: string }> = {
  neuf: { label: 'Neuf', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' },
  bon: { label: 'Bon', className: 'bg-[#1a274415] text-[#1a2744] border-0' },
  usure: { label: 'Usure', className: 'bg-[#d4a85315] text-[#d4a853] border-0' },
  hors_service: { label: 'Hors service', className: 'bg-[#c6282815] text-[#c62828] border-0' },
}

const equipmentIconMap: Record<string, React.ElementType> = {
  'Video-projecteur': Projector,
  'Climatisation': AirVent,
  'Tableau blanc': Presentation,
  'WiFi': Wifi,
  'Ordinateurs': Monitor,
  'Micro': Zap,
  'Tableau interactif': Monitor,
  'Casques audio': Zap,
}

const weekDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00']

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

export function RoomBookingPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState('')
  const [reservDate, setReservDate] = useState('')
  const [reservStart, setReservStart] = useState('')
  const [reservEnd, setReservEnd] = useState('')
  const [reservPurpose, setReservPurpose] = useState<string>('')
  const [reservOrganizer, setReservOrganizer] = useState('')
  const [reservParticipants, setReservParticipants] = useState('')
  const [reservNotes, setReservNotes] = useState('')
  const [equipmentNeeds, setEquipmentNeeds] = useState<string[]>([])
  const [searchReserv, setSearchReserv] = useState('')
  const [filterRoom, setFilterRoom] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0)

  const { data: roomsQuery, isLoading } = useRooms()
  const rooms: Room[] = (roomsQuery?.data || []).map(mapRoom)
  const reservations: Reservation[] = (roomsQuery?.reservations || []).map(mapReservation)

  // Weekly calendar demo data
  const weeklyReservations = useMemo(() => {
    const data: Record<string, { slot: string; purpose: ReservationPurpose; room: string; organizer: string; duration: number }[]> = {}
    const dayMap: Record<string, string[]> = {
      'Lundi': ['08:00', '10:00', '14:00', '16:00'],
      'Mardi': ['09:00', '14:00'],
      'Mercredi': ['08:00', '10:00', '14:00'],
      'Jeudi': ['08:00', '16:00'],
      'Vendredi': ['09:00', '14:00'],
    }
    const purposes: ReservationPurpose[] = ['Cours', 'Conference', 'Reunion', 'Examen']
    const rooms = ['Amphi 500', 'Salle Tchad', 'Labo Informatique', 'Salle de conference']
    const organizers = ['Dr. MAHAMAT Ali', 'Mme KHAMIS Fatime', 'Prof. ABDALLAH Fadoul', 'Dr. ISSA Mahamat']

    Object.entries(dayMap).forEach(([day, slots]) => {
      data[day] = slots.map((slot, i) => ({
        slot,
        purpose: purposes[i % purposes.length],
        room: rooms[i % rooms.length],
        organizer: organizers[i % organizers.length],
        duration: 2,
      }))
    })
    return data
  }, [])

  // Filter reservations
  const filteredReservations = useMemo(() => {
    return reservations.filter(r => {
      const matchSearch = searchReserv === '' ||
        r.organizer.toLowerCase().includes(searchReserv.toLowerCase()) ||
        r.room.toLowerCase().includes(searchReserv.toLowerCase())
      const matchRoom = filterRoom === 'all' || r.room === filterRoom
      const matchStatus = filterStatus === 'all' || r.status === filterStatus
      return matchSearch && matchRoom && matchStatus
    })
  }, [reservations, searchReserv, filterRoom, filterStatus])

  // Conflict detection
  const hasConflict = useMemo(() => {
    if (!selectedRoom || !reservDate || !reservStart || !reservEnd) return false
    return reservations.some(r =>
      r.room === selectedRoom &&
      r.date === reservDate &&
      r.status !== 'annulee' &&
      ((reservStart >= r.startTime && reservStart < r.endTime) ||
        (reservEnd > r.startTime && reservEnd <= r.endTime))
    )
  }, [reservations, selectedRoom, reservDate, reservStart, reservEnd])

  // Stats
  const availableCount = roomsQuery?.stats?.available ?? rooms.filter(r => r.status === 'libre').length
  const todayReservCount = roomsQuery?.stats?.todayReservations ?? 0
  const occupancyRate = 72

  // Reservation stats
  const reservByRoom = useMemo(() => {
    const map: Record<string, number> = {}
    reservations.forEach(r => {
      if (r.status !== 'annulee') {
        map[r.room] = (map[r.room] || 0) + 1
      }
    })
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  }, [reservations])

  const maxReservByRoom = Math.max(...reservByRoom.map(r => r[1]), 1)

  const purposeDistribution = useMemo(() => {
    const map: Record<string, number> = {}
    reservations.forEach(r => {
      if (r.status !== 'annulee') {
        map[r.purpose] = (map[r.purpose] || 0) + 1
      }
    })
    const total = Object.values(map).reduce((a, b) => a + b, 0)
    return Object.entries(map).map(([purpose, count]) => ({
      purpose,
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
  }, [reservations])

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
  } as const

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  } as const

  const roomCardVariants = {
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
        {/* ─── Gradient Header Banner ─────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="relative overflow-hidden rounded-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a2744] via-[#1f3050] to-[#2d7a4f]" />
          <svg className="absolute inset-0 w-full h-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="room-booking-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <rect x="0" y="0" width="40" height="40" fill="none" stroke="white" strokeWidth="0.5" />
                <circle cx="20" cy="20" r="3" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#room-booking-pattern)" />
          </svg>
          <div className="relative z-10 px-6 py-8">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white">Planification &amp; Reservation des Salles</h1>
                <p className="text-sm text-white/70 mt-1">Gestion et reservation des espaces institutionnels</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <AnimatedStat value={availableCount} label="Salles disponibles" icon={DoorOpen} />
                <AnimatedStat value={todayReservCount} label="Reservations aujourd&apos;hui" icon={Calendar} />
                <AnimatedStat value={occupancyRate} label="Taux occupation %" icon={BarChart3} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─── 4 Stats Cards ────────────────────────────────────────────────────── */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Salles totales', value: rooms.length, color: '#1a2744', icon: Building2, trend: '+2', trendUp: true },
            { label: 'Disponibles', value: availableCount, color: '#2d7a4f', icon: DoorOpen, trend: '', trendUp: true },
            { label: 'Reservations ce mois', value: 47, color: '#d4a853', icon: Calendar, trend: '+12%', trendUp: true },
            { label: 'Conflits', value: 2, color: '#c62828', icon: AlertTriangle, trend: '-1', trendUp: false },
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
                      <p className="text-2xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</p>
                      {stat.trend && (
                        <div className="flex items-center gap-1 mt-1">
                          {stat.trendUp ? (
                            <TrendingUp className="size-3 text-[#2d7a4f]" />
                          ) : (
                            <TrendingDown className="size-3 text-[#2d7a4f]" />
                          )}
                          <span className="text-xs text-[#2d7a4f] font-medium">{stat.trend}</span>
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

        {/* ─── Room Overview Grid ──────────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#1a2744] uppercase tracking-wide">Apercu des salles</h2>
            <Badge className="text-[10px] bg-[#1a274410] text-[#1a2744] border-0">{rooms.length} salles</Badge>
          </div>
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="h-40 animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-full flex items-center justify-center text-xs text-gray-400">Chargement...</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {!isLoading && rooms.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-400">Aucune salle trouvee</div>
          )}
          {!isLoading && rooms.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {rooms.map((room) => {
              const sConfig = statusConfig[room.status]
              return (
                <motion.div
                  key={room.id}
                  variants={roomCardVariants}
                  whileHover={{ scale: 1.03 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-sm font-bold text-[#1a2744]">{room.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Users className="size-3 text-gray-400" />
                            <span className="text-xs text-gray-500">{room.capacity} places</span>
                            <span className="text-gray-300">|</span>
                            <MapPin className="size-3 text-gray-400" />
                            <span className="text-xs text-gray-500">{room.building}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <motion.div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: sConfig.pulseColor }}
                            animate={room.status === 'occupee' ? { scale: [1, 1.4, 1], opacity: [1, 0.6, 1] } : {}}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                          />
                          <Badge className={`text-[9px] border-0`} style={{ backgroundColor: `${sConfig.color}15`, color: sConfig.color }}>
                            {sConfig.label}
                          </Badge>
                        </div>
                      </div>

                      {/* Equipment badges */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {room.equipment.map((eq) => {
                          const EqIcon = equipmentIconMap[eq] || Zap
                          return (
                            <Badge key={eq} className="text-[9px] bg-gray-50 text-gray-600 border border-gray-100 px-1.5 py-0 hover:bg-gray-50">
                              <EqIcon className="size-2.5 mr-0.5" />
                              {eq}
                            </Badge>
                          )
                        })}
                      </div>

                      {/* Today's mini-timeline */}
                      {room.todaySchedule.length > 0 && (
                        <div className="mb-3">
                          <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Aujourd&apos;hui</p>
                          <div className="space-y-1">
                            {room.todaySchedule.map((slot, i) => {
                              const pConfig = purposeConfig[slot.purpose as ReservationPurpose]
                              return (
                                <div key={i} className="flex items-center gap-1.5">
                                  <div className={`w-1.5 h-1.5 rounded-full ${pConfig.bgClass}`} />
                                  <span className="text-[10px] text-gray-500">{slot.start}-{slot.end}</span>
                                  <span className="text-[10px] font-medium text-[#1a2744]">{slot.purpose}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {room.todaySchedule.length === 0 && room.status !== 'maintenance' && (
                        <div className="mb-3">
                          <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Aujourd&apos;hui</p>
                          <p className="text-[10px] text-[#2d7a4f]">Aucune reservation</p>
                        </div>
                      )}

                      {/* Reserve button */}
                      <Button
                        size="sm"
                        className="w-full h-8 text-[10px] bg-[#1a2744] hover:bg-[#253556] text-white disabled:opacity-50"
                        disabled={room.status === 'maintenance'}
                        onClick={() => {
                          setSelectedRoom(room.name)
                          setDialogOpen(true)
                        }}
                      >
                        <DoorOpen className="size-3 mr-1.5" />
                        Reserver
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
          )}
        </motion.div>

        {/* ─── Weekly Calendar View Card ────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-[#1a2744]">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-[#1a2744]" />
                  <CardTitle className="text-sm font-semibold text-[#1a2744]">
                    Calendrier hebdomadaire
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setCurrentWeekOffset(prev => prev - 1)}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="text-xs font-medium text-gray-600 px-2">
                    Semaine du 10 Mars 2025{currentWeekOffset !== 0 ? ` (${currentWeekOffset > 0 ? '+' : ''}${currentWeekOffset})` : ''}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setCurrentWeekOffset(prev => prev + 1)}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  {/* Calendar Header */}
                  <div className="grid grid-cols-6 border-b border-gray-200 bg-gray-50">
                    <div className="p-2 text-xs font-semibold text-gray-500 border-r border-gray-200">Heure</div>
                    {weekDays.map(day => (
                      <div key={day} className="p-2 text-xs font-semibold text-gray-600 text-center border-r border-gray-200 last:border-r-0">
                        {day}
                      </div>
                    ))}
                  </div>
                  {/* Calendar Rows */}
                  {timeSlots.slice(0, 12).map(slot => (
                    <div key={slot} className="grid grid-cols-6 border-b border-gray-100 last:border-b-0">
                      <div className="p-2 text-[10px] font-medium text-gray-500 border-r border-gray-200 flex items-center justify-center bg-gray-50/50 min-h-[44px]">
                        {slot}
                      </div>
                      {weekDays.map(day => {
                        const reservs = weeklyReservations[day]?.filter(r => r.slot === slot) || []
                        return (
                          <div
                            key={`${day}-${slot}`}
                            className="p-1 border-r border-gray-100 last:border-r-0 min-h-[44px] cursor-pointer hover:bg-[#2d7a4f05] transition-colors"
                            onClick={() => {
                              if (reservs.length === 0) {
                                setSelectedRoom('')
                                setReservStart(slot)
                                setDialogOpen(true)
                              }
                            }}
                          >
                            {reservs.map((reserv, i) => {
                              const pConfig = purposeConfig[reserv.purpose]
                              return (
                                <Tooltip key={i}>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={`${pConfig.bgClass} text-white rounded px-1.5 py-0.5 mb-0.5 text-[9px] font-medium truncate cursor-default`}
                                    >
                                      {reserv.room} - {reserv.purpose}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    <p className="font-semibold">{reserv.purpose}</p>
                                    <p>Salle: {reserv.room}</p>
                                    <p>Organisateur: {reserv.organizer}</p>
                                    <p>Duree: {reserv.duration}h</p>
                                  </TooltipContent>
                                </Tooltip>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                <span className="text-[10px] text-gray-400 font-medium">Types :</span>
                {Object.entries(purposeConfig).map(([purpose, config]) => (
                  <div key={purpose} className="flex items-center gap-1.5">
                    <div className={`w-3 h-3 rounded-sm ${config.bgClass}`} />
                    <span className="text-[10px] text-gray-500">{purpose}</span>
                  </div>
                ))}
                <span className="text-gray-200">|</span>
                <span className="text-[10px] text-gray-400">Cliquer sur un creneau vide pour reserver</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── Reservation Form Dialog ──────────────────────────────────────────── */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[#1a2744] flex items-center gap-2">
                <Calendar className="size-5" />
                Nouvelle reservation
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Salle</Label>
                  <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Choisir une salle" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.filter(r => r.status !== 'maintenance').map(room => (
                        <SelectItem key={room.id} value={room.name}>{room.name} ({room.capacity} pl.)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Date</Label>
                  <Input type="date" className="h-9 text-sm" value={reservDate} onChange={(e) => setReservDate(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Heure debut</Label>
                  <Select value={reservStart} onValueChange={setReservStart}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Debut" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Heure fin</Label>
                  <Select value={reservEnd} onValueChange={setReservEnd}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Fin" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.filter(t => !reservStart || t > reservStart).map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Objet</Label>
                  <Select value={reservPurpose} onValueChange={setReservPurpose}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cours">Cours</SelectItem>
                      <SelectItem value="Conference">Conference</SelectItem>
                      <SelectItem value="Reunion">Reunion</SelectItem>
                      <SelectItem value="Examen">Examen</SelectItem>
                      <SelectItem value="Autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Organisateur</Label>
                  <Input placeholder="Nom de l'organisateur" className="h-9 text-sm" value={reservOrganizer} onChange={(e) => setReservOrganizer(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600">Nombre de participants</Label>
                <Input type="number" placeholder="0" className="h-9 text-sm" value={reservParticipants} onChange={(e) => setReservParticipants(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-600">Equipements necessaires</Label>
                <div className="grid grid-cols-2 gap-2">
                  {['Video-projecteur', 'Climatisation', 'Micro', 'Tableau blanc', 'WiFi', 'Ordinateurs'].map(eq => (
                    <div key={eq} className="flex items-center gap-2">
                      <Checkbox
                        id={`eq-${eq}`}
                        checked={equipmentNeeds.includes(eq)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setEquipmentNeeds(prev => [...prev, eq])
                          } else {
                            setEquipmentNeeds(prev => prev.filter(e => e !== eq))
                          }
                        }}
                      />
                      <label htmlFor={`eq-${eq}`} className="text-xs text-gray-600 cursor-pointer">{eq}</label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-600">Notes</Label>
                <Textarea placeholder="Informations supplementaires..." className="text-sm min-h-[60px]" value={reservNotes} onChange={(e) => setReservNotes(e.target.value)} />
              </div>
              {hasConflict && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-[#c6282810] border border-[#c6282820]">
                  <AlertTriangle className="size-4 text-[#c62828] shrink-0" />
                  <p className="text-xs text-[#c62828] font-medium">Conflit detecte ! Un autre evenement est deja planifie dans cette salle sur ce creneau.</p>
                </div>
              )}
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button size="sm" className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs" disabled={!selectedRoom || !reservDate || !reservStart || !reservEnd || !reservPurpose}>
                  <CheckCircle2 className="size-3.5 mr-1.5" />
                  Confirmer la reservation
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ─── Reservations Table Card ──────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-[#2d7a4f]">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-[#2d7a4f]" />
                  <CardTitle className="text-sm font-semibold text-[#1a2744]">Reservations</CardTitle>
                  <Badge className="text-[10px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">{filteredReservations.length}</Badge>
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
            <CardContent className="space-y-3">
              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
                  <Input
                    placeholder="Rechercher..."
                    className="pl-9 h-8 text-xs"
                    value={searchReserv}
                    onChange={(e) => setSearchReserv(e.target.value)}
                  />
                </div>
                <Select value={filterRoom} onValueChange={setFilterRoom}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Salle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les salles</SelectItem>
                    {rooms.map(room => (
                      <SelectItem key={room.id} value={room.name}>{room.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="confirmee">Confirmee</SelectItem>
                    <SelectItem value="en_attente">En attente</SelectItem>
                    <SelectItem value="annulee">Annulee</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Table */}
              <ScrollArea className="max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-xs font-semibold text-gray-500">Salle</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500">Date</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500">Horaire</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500">Objet</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500">Organisateur</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500 text-center">Participants</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500">Statut</TableHead>
                      <TableHead className="text-xs font-semibold text-gray-500 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-sm text-gray-400">
                          Chargement des reservations...
                        </TableCell>
                      </TableRow>
                    )}
                    {!isLoading && filteredReservations.map((reserv) => {
                      const sConfig = reservationStatusConfig[reserv.status]
                      const pConfig = purposeConfig[reserv.purpose]
                      return (
                        <TableRow key={reserv.id} className={`hover:bg-gray-50/50 transition-colors ${reserv.status === 'annulee' ? 'opacity-50' : ''}`}>
                          <TableCell className="text-xs font-medium text-[#1a2744] py-2 whitespace-nowrap">{reserv.room}</TableCell>
                          <TableCell className="text-xs text-gray-600 py-2">{reserv.date}</TableCell>
                          <TableCell className="text-xs text-gray-600 py-2 whitespace-nowrap">{reserv.startTime} - {reserv.endTime}</TableCell>
                          <TableCell className="py-2">
                            <Badge className="text-[9px] border-0 text-white" style={{ backgroundColor: pConfig.color }}>
                              {reserv.purpose}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-gray-600 py-2 whitespace-nowrap max-w-[140px] truncate">{reserv.organizer}</TableCell>
                          <TableCell className="text-xs text-center py-2 font-medium text-[#1a2744]">{reserv.participants}</TableCell>
                          <TableCell className="py-2">
                            <Badge className={`text-[10px] ${sConfig.className}`}>
                              {sConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                  <MoreHorizontal className="size-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem className="text-xs">
                                  <Pencil className="size-3.5 mr-2" />
                                  Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-xs text-[#2d7a4f]">
                                  <CheckCircle2 className="size-3.5 mr-2" />
                                  Confirmer
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-xs text-[#d4a853]">
                                  <XCircle className="size-3.5 mr-2" />
                                  Annuler
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-xs text-[#c62828]">
                                  <Trash2 className="size-3.5 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {!isLoading && reservations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-sm text-gray-400">
                          Aucune reservation pour le moment
                        </TableCell>
                      </TableRow>
                    )}
                    {!isLoading && reservations.length > 0 && filteredReservations.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-sm text-gray-400">
                          Aucune reservation trouvee
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── Bottom Grid: Equipment + Statistics + African Context ──────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Equipment & Resources Card */}
          <motion.div variants={itemVariants}>
            <Card className="border-l-4 border-l-[#d4a853] h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Monitor className="size-4 text-[#d4a853]" />
                  <CardTitle className="text-sm font-semibold text-[#1a2744]">Equipements &amp; Ressources</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="text-xs font-semibold text-gray-500">Equipement</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-500 text-center">Dispo / Total</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-500">Etat</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-500">Maintenance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {demoEquipment.map((eq) => {
                        const cConfig = conditionConfig[eq.condition]
                        const availPercent = Math.round((eq.available / eq.total) * 100)
                        return (
                          <TableRow key={eq.id} className="hover:bg-gray-50/50 transition-colors">
                            <TableCell className="text-xs font-medium text-[#1a2744] py-2">{eq.name}</TableCell>
                            <TableCell className="py-2">
                              <div className="flex items-center gap-2 justify-center">
                                <Progress value={availPercent} className="h-2 w-16" />
                                <span className="text-[10px] text-gray-500 whitespace-nowrap">{eq.available}/{eq.total}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-2">
                              {cConfig ? (
                                <Badge className={`text-[9px] ${cConfig.className}`}>
                                  {cConfig.label}
                                </Badge>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-[10px] text-gray-500 py-2">
                              <div className="flex items-center gap-1">
                                <Clock className="size-3 text-gray-400" />
                                {eq.nextMaintenance}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Reservation Statistics Card */}
          <motion.div variants={itemVariants}>
            <Card className="border-l-4 border-l-[#1a2744] h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="size-4 text-[#1a2744]" />
                  <CardTitle className="text-sm font-semibold text-[#1a2744]">Statistiques des reservations</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Reservations par salle - CSS Bar Chart */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-600">Reservations par salle</p>
                  <div className="flex items-end gap-2 h-28 px-1">
                    {reservByRoom.map(([room, count]) => {
                      const heightPercent = (count / maxReservByRoom) * 80
                      return (
                        <div key={room} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[9px] font-medium text-[#1a2744]">{count}</span>
                          <motion.div
                            className="w-full rounded-t bg-[#1a2744]"
                            initial={{ height: 0 }}
                            animate={{ height: `${heightPercent}px` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                          />
                          <span className="text-[8px] text-gray-400 leading-tight text-center truncate w-full">{room.split(' ')[0]}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <Separator />

                {/* Purpose distribution */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-600">Repartition par objet</p>
                  <div className="space-y-2.5">
                    {purposeDistribution.map(item => {
                      const pConfig = purposeConfig[item.purpose as ReservationPurpose]
                      return (
                        <div key={item.purpose} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600">{item.purpose}</span>
                            <span className="text-xs font-medium" style={{ color: pConfig.color }}>{item.percent}% ({item.count})</span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: pConfig.color }}
                              initial={{ width: 0 }}
                              animate={{ width: `${item.percent}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <Separator />

                {/* Peak hours + Average duration */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-[#1a274408] rounded-lg border border-[#1a274415]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock className="size-3.5 text-[#1a2744]" />
                      <span className="text-[10px] font-semibold text-[#1a2744]">Heures de pointe</span>
                    </div>
                    <p className="text-lg font-bold text-[#1a2744]">08h-10h</p>
                    <p className="text-[10px] text-gray-500">Creneau le plus demande</p>
                  </div>
                  <div className="p-3 bg-[#2d7a4f08] rounded-lg border border-[#2d7a4f15]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Zap className="size-3.5 text-[#2d7a4f]" />
                      <span className="text-[10px] font-semibold text-[#2d7a4f]">Duree moyenne</span>
                    </div>
                    <p className="text-lg font-bold text-[#2d7a4f]">2.3h</p>
                    <p className="text-[10px] text-gray-500">Par reservation</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* ─── African Context Card ──────────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-[#2d7a4f]">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Shield className="size-4 text-[#2d7a4f]" />
                <CardTitle className="text-sm font-semibold text-[#1a2744]">Contexte africain &amp; Resilience</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div whileHover={{ scale: 1.02 }} className="p-4 rounded-lg border border-gray-100 bg-gray-50/50 hover:shadow-sm transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-[#d4a85315]">
                      <AlertTriangle className="size-4 text-[#d4a853]" />
                    </div>
                    <p className="text-xs font-semibold text-[#1a2744]">Coupures d&apos;electricite</p>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Plan de contingence integre: reservations automatiquement reportees en cas de coupure, notifications SMS aux organisateurs.
                  </p>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }} className="p-4 rounded-lg border border-gray-100 bg-gray-50/50 hover:shadow-sm transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-[#1a274415]">
                      <Building2 className="size-4 text-[#1a2744]" />
                    </div>
                    <p className="text-xs font-semibold text-[#1a2744]">Campus multi-sites</p>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Gestion simultanee de plusieurs campus. Synchronisation des calendriers entre sites distants (N&apos;Djamena, Moundou, Sarh).
                  </p>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }} className="p-4 rounded-lg border border-gray-100 bg-gray-50/50 hover:shadow-sm transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-[#2d7a4f15]">
                      <CloudOff className="size-4 text-[#2d7a4f]" />
                    </div>
                    <p className="text-xs font-semibold text-[#1a2744]">Mode hors ligne</p>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Possibilite de creer des reservations hors connexion. Synchronisation automatique lors du retour de la connexion internet.
                  </p>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }} className="p-4 rounded-lg border border-gray-100 bg-gray-50/50 hover:shadow-sm transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-[#d4a85315]">
                      <Signal className="size-4 text-[#d4a853]" />
                    </div>
                    <p className="text-xs font-semibold text-[#1a2744]">Bande passante faible</p>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Calendrier optimise pour les connexions a faible debit. Mode leger disponible avec chargement progressif des donnees.
                  </p>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </TooltipProvider>
  )
}
