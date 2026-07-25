'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTimetable, useRooms } from '@/lib/api-hooks'
import {
  Calendar,
  Plus,
  Download,
  Clock,
  MapPin,
  User,
  Filter,
  BookOpen,
  Monitor,
  DoorOpen,
  LayoutGrid,
  List,
  CheckCircle2,
  Zap,
  TrendingUp,
} from 'lucide-react'

// ─── Types & Config ───────────────────────────────────────────────────────────

type CourseType = 'CM' | 'TD' | 'TP' | 'Stage' | 'EXAM'
type SubjectArea = 'droit' | 'informatique' | 'lettres' | 'mathematiques'

interface TimeSlot {
  id: string
  day: string
  startHour: number
  endHour: number
  course: string
  teacher: string
  room: string
  type: CourseType
  subjectArea: SubjectArea
  group: string
}

const subjectConfig: Record<SubjectArea, { label: string; cardBg: string; cardBorder: string; cardText: string; dotColor: string }> = {
  droit: {
    label: 'Droit',
    cardBg: 'bg-blue-50',
    cardBorder: 'border-l-4 border-l-blue-500',
    cardText: 'text-blue-900',
    dotColor: 'bg-blue-500',
  },
  informatique: {
    label: 'Informatique',
    cardBg: 'bg-green-50',
    cardBorder: 'border-l-4 border-l-green-500',
    cardText: 'text-green-900',
    dotColor: 'bg-green-500',
  },
  lettres: {
    label: 'Lettres',
    cardBg: 'bg-amber-50',
    cardBorder: 'border-l-4 border-l-amber-500',
    cardText: 'text-amber-900',
    dotColor: 'bg-amber-500',
  },
  mathematiques: {
    label: 'Mathematiques',
    cardBg: 'bg-purple-50',
    cardBorder: 'border-l-4 border-l-purple-500',
    cardText: 'text-purple-900',
    dotColor: 'bg-purple-500',
  },
}

const typeConfig: Record<CourseType, { label: string; className: string; bgClass: string }> = {
  CM: { label: 'CM', className: 'text-white', bgClass: 'bg-[#1a2744]' },
  TD: { label: 'TD', className: 'text-white', bgClass: 'bg-[#2d7a4f]' },
  TP: { label: 'TP', className: 'text-white', bgClass: 'bg-[#e65100]' },
  Stage: { label: 'Stage', className: 'text-white', bgClass: 'bg-[#7b1fa2]' },
  EXAM: { label: 'Examen', className: 'text-white', bgClass: 'bg-[#c0392b]' },
}

const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
const daysFrench: Record<string, string> = {
  Monday: 'Lundi',
  Tuesday: 'Mardi',
  Wednesday: 'Mercredi',
  Thursday: 'Jeudi',
  Friday: 'Vendredi',
  Saturday: 'Samedi',
  Sunday: 'Dimanche',
}
const hours = Array.from({ length: 11 }, (_, i) => i + 7) // 7h to 17h

// ─── API Types & Mapping ────────────────────────────────────────────────────────

// Shape returned by GET /api/timetable (`{ slots: TimetableSlotRecord[] }`).
// course/teacher/room are already resolved server-side; the *Id fields are
// raw FKs only useful for a future create/edit form, not for display.
interface TimetableSlotRecord {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  type: 'CM' | 'TD' | 'TP' | 'EXAM'
  course: string
  teacher: string
  room: string
  courseElementId: string | null
  teacherId: string | null
  roomId: string | null
  programId: string | null
  levelId: string | null
}

// API convention: dayOfWeek 0 = Monday ... 6 = Sunday, which lines up with
// this page's own Monday-first week (see `days` above).
const dayOfWeekNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

// This page's grid only has whole-hour rows (7h-17h), so only the hour
// portion of the "HH:MM" API strings is used.
function parseHour(time: string): number {
  const hour = parseInt(time.split(':')[0] ?? '', 10)
  return Number.isNaN(hour) ? 0 : hour
}

// TimetableSlot has no subject-area/department or group concept, so every
// mapped slot gets a single constant value for each - this only affects the
// card color coding / group label and degrades gracefully with one value
// rather than fabricating variety the data doesn't have.
function mapSlot(record: TimetableSlotRecord): TimeSlot {
  return {
    id: record.id,
    day: dayOfWeekNames[record.dayOfWeek] ?? dayOfWeekNames[0],
    startHour: parseHour(record.startTime),
    endHour: parseHour(record.endTime),
    course: record.course || '',
    teacher: record.teacher || '',
    room: record.room || '',
    type: record.type,
    subjectArea: 'droit',
    group: '',
  }
}

interface RoomInfo {
  name: string
  capacity: string
}

// Shape returned by GET /api/rooms (`{ data: RoomApiRecord[] }`).
interface RoomApiRecord {
  id: string
  name: string
  capacity: number
}

function mapRoom(r: RoomApiRecord): RoomInfo {
  return {
    name: r.name,
    capacity: `${r.capacity} places`,
  }
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

// ─── Time Slot Block Component ────────────────────────────────────────────────

function TimeSlotBlock({ slot }: { slot: TimeSlot }) {
  const config = typeConfig[slot.type]
  const subjectConf = subjectConfig[slot.subjectArea]
  const duration = slot.endHour - slot.startHour
  const height = duration * 60 // 60px per hour

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`rounded-lg p-1.5 ${subjectConf.cardBg} ${subjectConf.cardBorder} ${subjectConf.cardText} cursor-pointer hover:shadow-md transition-shadow shadow-sm overflow-hidden`}
      style={{ height: `${height - 4}px` }}
    >
      <div className="flex items-center justify-between mb-0.5">
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${config.bgClass} text-white`}>{config.label}</span>
        <span className="text-[8px] opacity-60">{slot.startHour}h-{slot.endHour}h</span>
      </div>
      <p className="text-[11px] font-semibold leading-tight mb-0.5 truncate">{slot.course}</p>
      <div className="flex items-center gap-1 mt-0.5">
        <MapPin className="size-2.5 opacity-60 shrink-0" />
        <span className="text-[9px] opacity-70 truncate">{slot.room}</span>
      </div>
      <div className="flex items-center gap-1 mt-0.5">
        <User className="size-2.5 opacity-60 shrink-0" />
        <span className="text-[9px] opacity-70 truncate">{slot.teacher}</span>
      </div>
      <div className="flex items-center gap-1 mt-0.5">
        <BookOpen className="size-2.5 opacity-60 shrink-0" />
        <span className="text-[9px] opacity-70 truncate">{slot.group}</span>
      </div>
    </motion.div>
  )
}

// ─── Day View Slot Card ───────────────────────────────────────────────────────

function DaySlotCard({ slot }: { slot: TimeSlot }) {
  const subjectConf = subjectConfig[slot.subjectArea]
  const config = typeConfig[slot.type]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`rounded-xl p-4 ${subjectConf.cardBg} ${subjectConf.cardBorder} ${subjectConf.cardText} shadow-sm hover:shadow-md transition-shadow`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${config.bgClass} text-white`}>{config.label}</span>
        <span className="text-xs opacity-60">{slot.startHour}h - {slot.endHour}h</span>
      </div>
      <h3 className="text-sm font-bold mb-2">{slot.course}</h3>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <MapPin className="size-3.5 opacity-60 shrink-0" />
          <span className="text-xs opacity-70">{slot.room}</span>
        </div>
        <div className="flex items-center gap-2">
          <User className="size-3.5 opacity-60 shrink-0" />
          <span className="text-xs opacity-70">{slot.teacher}</span>
        </div>
        <div className="flex items-center gap-2">
          <BookOpen className="size-3.5 opacity-60 shrink-0" />
          <span className="text-xs opacity-70">{slot.group}</span>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TimetablePage() {
  const [filterProgram, setFilterProgram] = useState('droit-l2')
  const [filterSemestre, setFilterSemestre] = useState('s1')
  const [filterGroup, setFilterGroup] = useState('all')
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week')
  const [selectedDay, setSelectedDay] = useState('Lundi')
  const [currentTime, setCurrentTime] = useState(new Date())

  const { data: timetableQuery, isLoading } = useTimetable()
  const { data: roomsQuery, isLoading: isRoomsLoading } = useRooms()
  const timeSlots: TimeSlot[] = (timetableQuery?.slots || []).map(mapSlot)
  const rooms: RoomInfo[] = (roomsQuery?.data || []).map(mapRoom)

  // Animated stats for header
  const animatedCours = useCountUp(48, 1400)
  const animatedSalles = useCountUp(12, 1200)

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  const currentHour = currentTime.getHours()
  const currentMinute = currentTime.getMinutes()

  // Get today's day name in French
  const todayEnglish = currentTime.toLocaleDateString('en-US', { weekday: 'long' })
  const todayFrench = daysFrench[todayEnglish] || ''

  const filteredSlots = useMemo(() => {
    return timeSlots
  }, [timeSlots])

  const getSlotAtHour = (day: string, hour: number) =>
    filteredSlots.find(s => s.day === day && s.startHour === hour)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isSlotContinuation = (day: string, hour: number) =>
    filteredSlots.some(s => s.day === day && s.startHour < hour && s.endHour > hour && s.startHour !== hour)

  const getRoomStatus = (roomName: string) => {
    const now = filteredSlots.find(s => s.room === roomName && currentHour >= s.startHour && currentHour < s.endHour)
    return now ? 'occupee' : 'libre'
  }

  // Stats
  const totalSlots = filteredSlots.length
  const totalHours = filteredSlots.reduce((acc, s) => acc + (s.endHour - s.startHour), 0)
  const occupiedRooms = rooms.filter(r => getRoomStatus(r.name) === 'occupee').length

  // Day view data
  const daySlots = filteredSlots.filter(s => s.day === selectedDay).sort((a, b) => a.startHour - b.startHour)

  // Current time line position (percentage within 7h-18h range)
  const timeLinePosition = ((currentHour - 7) + currentMinute / 60) * 60

  // Quick stats
  const hoursPerDay = Math.round((totalHours / days.length) * 10) / 10
  const roomOccupancyRate = rooms.length > 0 ? Math.round((occupiedRooms / rooms.length) * 100) : 0
  const upcomingSlot = filteredSlots.find(s => {
    if (s.day !== todayFrench) return false
    return s.startHour > currentHour || (s.startHour === currentHour && currentMinute < 30)
  })
  const nextCourseText = upcomingSlot
    ? `${upcomingSlot.course} a ${upcomingSlot.startHour}h`
    : 'Aucun cours prevu'

  return (
    <div className="space-y-6">
      {/* Gradient Header Section */}
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
                  Planification hebdomadaire
                </motion.h1>
                <motion.p
                  className="text-white/70 text-sm mt-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  Gestion et suivi des creneaux horaires
                </motion.p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" className="text-xs bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white">
                  <Download className="size-3.5 mr-1.5" />
                  Export PDF
                </Button>
                <Button size="sm" className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs border border-white/20">
                  <Plus className="size-3.5 mr-1.5" />
                  Ajouter creneau
                </Button>
              </div>
            </div>

            {/* Hero Stats */}
            <motion.div
              className="grid grid-cols-3 gap-3"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/15">
                <p className="text-2xl font-bold text-white">{animatedCours}</p>
                <p className="text-[11px] text-white/70 mt-0.5">Cours planifies</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/15">
                <p className="text-2xl font-bold text-white">{animatedSalles}</p>
                <p className="text-[11px] text-white/70 mt-0.5">Salles utilisees</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/15">
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-white">0</p>
                  <CheckCircle2 className="size-5 text-green-400" />
                </div>
                <p className="text-[11px] text-white/70 mt-0.5">Conflits</p>
              </div>
            </motion.div>
          </div>
        </div>
      </Card>

      {/* Quick Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1a274415] flex items-center justify-center shrink-0">
                  <Clock className="size-5 text-[#1a2744]" />
                </div>
                <div>
                  <p className="text-lg font-bold text-[#1a2744]">{hoursPerDay}h</p>
                  <p className="text-[11px] text-gray-500">Heures de cours / jour</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2d7a4f15] flex items-center justify-center shrink-0">
                  <TrendingUp className="size-5 text-[#2d7a4f]" />
                </div>
                <div>
                  <p className="text-lg font-bold text-[#2d7a4f]">{roomOccupancyRate}%</p>
                  <p className="text-[11px] text-gray-500">Taux d&apos;occupation salles</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#d4a85315] flex items-center justify-center shrink-0">
                  <Zap className="size-5 text-[#d4a853]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#d4a853] leading-tight">{nextCourseText}</p>
                  <p className="text-[11px] text-gray-500">Prochain cours</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="border-l-4 border-l-[#1a2744]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-medium">Cours cette semaine</p>
                  <p className="text-2xl font-bold text-[#1a2744]">{totalSlots}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#1a274415] flex items-center justify-center">
                  <Calendar className="size-5 text-[#1a2744]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border-l-4 border-l-[#2d7a4f]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-medium">Heures totales</p>
                  <p className="text-2xl font-bold text-[#2d7a4f]">{totalHours}h</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#2d7a4f15] flex items-center justify-center">
                  <Clock className="size-5 text-[#2d7a4f]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-l-4 border-l-[#d4a853]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-medium">Salles occupees</p>
                  <p className="text-2xl font-bold text-[#d4a853]">{occupiedRooms}/{rooms.length}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#d4a85315] flex items-center justify-center">
                  <DoorOpen className="size-5 text-[#d4a853]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-l-4 border-l-green-400">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-medium">Conflits</p>
                  <p className="text-2xl font-bold text-green-600">0</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                  <CheckCircle2 className="size-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filter Controls - with gradient border-left */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="shadow-sm border-l-4 border-l-[#1a2744]">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Filter className="size-3.5 text-[#1a2744]" />
                <span className="text-xs font-medium text-[#1a2744]">Filtres :</span>
              </div>
              <Select value={filterProgram} onValueChange={setFilterProgram}>
                <SelectTrigger className="w-[160px] h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="droit-l2">Droit L2</SelectItem>
                  <SelectItem value="droit-l3">Droit L3</SelectItem>
                  <SelectItem value="info-l2">Informatique L2</SelectItem>
                  <SelectItem value="info-l3">Informatique L3</SelectItem>
                  <SelectItem value="lettres-l1">Lettres L1</SelectItem>
                  <SelectItem value="maths-l2">Mathematiques L2</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterSemestre} onValueChange={setFilterSemestre}>
                <SelectTrigger className="w-[110px] h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="s1">Semestre 1</SelectItem>
                  <SelectItem value="s2">Semestre 2</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterGroup} onValueChange={setFilterGroup}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue placeholder="Groupe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les groupes</SelectItem>
                  <SelectItem value="groupe-a">Groupe A</SelectItem>
                  <SelectItem value="groupe-b">Groupe B</SelectItem>
                  <SelectItem value="groupe-c">Groupe C</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 ml-auto">
                {/* Semaine en cours indicator */}
                <Badge className="text-[10px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">
                  <Zap className="size-3 mr-1" />
                  Semaine en cours
                </Badge>
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                  <Button
                    variant={viewMode === 'week' ? 'default' : 'ghost'}
                    size="sm"
                    className={`h-7 text-[10px] px-3 ${viewMode === 'week' ? 'bg-[#1a2744] text-white' : 'text-gray-500'}`}
                    onClick={() => setViewMode('week')}
                  >
                    <LayoutGrid className="size-3 mr-1" />
                    Semaine
                  </Button>
                  <Button
                    variant={viewMode === 'day' ? 'default' : 'ghost'}
                    size="sm"
                    className={`h-7 text-[10px] px-3 ${viewMode === 'day' ? 'bg-[#1a2744] text-white' : 'text-gray-500'}`}
                    onClick={() => setViewMode('day')}
                  >
                    <List className="size-3 mr-1" />
                    Jour
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Subject Legend */}
      <div className="flex flex-wrap gap-4">
        {Object.entries(subjectConfig).map(([key, conf]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-4 h-3 rounded ${conf.dotColor}`} />
            <span className="text-[10px] text-gray-500 font-medium">{conf.label}</span>
          </div>
        ))}
        <div className="border-l border-gray-300 pl-4 flex gap-4">
          {Object.entries(typeConfig).map(([key, conf]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className={`w-4 h-3 rounded ${conf.bgClass}`} />
              <span className="text-[10px] text-gray-500 font-medium">{conf.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Grid - 3 columns */}
        <div className="lg:col-span-3">
          {viewMode === 'week' ? (
            /* Weekly Schedule Grid */
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              <Card className="shadow-sm">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                    <Calendar className="size-4" />
                    Semaine en cours
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="py-16 text-center text-sm text-gray-400">
                      Chargement des creneaux...
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <div className="min-w-[900px]">
                        {/* Header Row - with today highlight */}
                        <div className="flex border-b border-gray-200 bg-[#1a2744]/5">
                          <div className="w-16 shrink-0 p-2 text-center">
                            <span className="text-[10px] font-semibold text-gray-400">Heure</span>
                          </div>
                          {days.map(day => {
                            const isToday = day === todayFrench
                            return (
                              <div key={day} className={`flex-1 p-2 text-center border-l border-gray-200 ${isToday ? 'bg-[#2d7a4f10]' : ''}`}>
                                <span className={`text-xs font-semibold ${isToday ? 'text-[#2d7a4f]' : 'text-[#1a2744]'}`}>
                                  {day}
                                </span>
                                {isToday && (
                                  <div className="mt-0.5">
                                    <Badge className="text-[8px] px-1.5 py-0 bg-[#2d7a4f15] text-[#2d7a4f] border-0">
                                      Aujourd&apos;hui
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>

                        {/* Time Rows */}
                        <div className="relative">
                          {hours.map(hour => (
                            <div key={hour} className="flex border-b border-gray-100" style={{ minHeight: '60px' }}>
                              <div className="w-16 shrink-0 p-2 text-center border-r border-gray-200 flex items-start justify-center">
                                <span className="text-[10px] font-mono text-gray-400">{String(hour).padStart(2, '0')}:00</span>
                              </div>
                              {days.map(day => {
                                const slot = getSlotAtHour(day, hour)
                                const isToday = day === todayFrench
                                return (
                                  <div key={`${day}-${hour}`} className={`flex-1 p-0.5 border-l border-gray-100 ${isToday ? 'bg-[#2d7a4f05]' : ''}`}>
                                    {slot && <TimeSlotBlock slot={slot} />}
                                  </div>
                                )
                              })}
                            </div>
                          ))}
                          {/* Animated current time indicator */}
                          {currentHour >= 7 && currentHour < 18 && todayFrench && days.includes(todayFrench) && (
                            <motion.div
                              className="absolute left-16 right-0 h-0.5 bg-red-500 z-10 pointer-events-none"
                              style={{ top: `${timeLinePosition}px` }}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.5 }}
                            >
                              <motion.div
                                className="absolute -left-1.5 -top-1 w-3 h-3 rounded-full bg-red-500"
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              />
                            </motion.div>
                          )}
                        </div>
                      </div>
                      {timeSlots.length === 0 && (
                        <div className="py-8 text-center text-sm text-gray-400 border-t border-gray-100">
                          Aucun creneau planifie
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            /* Day View */
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              <Card className="shadow-sm">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                      <Calendar className="size-4" />
                      Vue par jour
                    </CardTitle>
                    <div className="flex gap-1">
                      {days.map(day => (
                        <Button
                          key={day}
                          variant={selectedDay === day ? 'default' : 'outline'}
                          size="sm"
                          className={`h-7 text-[10px] px-3 ${selectedDay === day ? 'bg-[#1a2744] text-white' : 'border-[#1a2744]/20 text-[#1a2744]'} ${day === todayFrench ? 'ring-2 ring-[#2d7a4f40]' : ''}`}
                          onClick={() => setSelectedDay(day)}
                        >
                          {day.substring(0, 3)}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {isLoading ? (
                    <div className="py-12 text-center text-sm text-gray-400">
                      Chargement des creneaux...
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {daySlots.map(slot => (
                          <DaySlotCard key={slot.id} slot={slot} />
                        ))}
                      </div>
                      {daySlots.length === 0 && (
                        <div className="py-12 text-center text-sm text-gray-400">
                          Aucun cours programme ce jour
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Room Overview Card - 1 column */}
        <div className="lg:col-span-1">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
            <Card className="shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <Monitor className="size-4" />
                  Etat des salles
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {isRoomsLoading && (
                  <div className="py-6 text-center text-xs text-gray-400">Chargement des salles...</div>
                )}
                {!isRoomsLoading && rooms.length === 0 && (
                  <div className="py-6 text-center text-xs text-gray-400">Aucune salle enregistree</div>
                )}
                <div className="space-y-3">
                  {rooms.map(room => {
                    const status = getRoomStatus(room.name)
                    const isOccupied = status === 'occupee'
                    const currentSlot = filteredSlots.find(s => s.room === room.name && currentHour >= s.startHour && currentHour < s.endHour)

                    return (
                      <motion.div
                        key={room.name}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                        className={`rounded-lg p-3 border ${
                          isOccupied
                            ? 'bg-red-50/50 border-red-200'
                            : 'bg-green-50/50 border-green-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-[#1a2744]">{room.name}</span>
                          <Badge className={`text-[9px] ${
                            isOccupied
                              ? 'bg-red-100 text-red-700 border-0'
                              : 'bg-green-100 text-green-700 border-0'
                          }`}>
                            {isOccupied ? 'Occupee' : 'Libre'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-400">{room.capacity}</span>
                          {isOccupied && currentSlot && (
                            <span className="text-[10px] text-red-600 truncate max-w-[100px]">{currentSlot.course}</span>
                          )}
                        </div>
                        {isOccupied && currentSlot && (
                          <div className="mt-1 flex items-center gap-1">
                            <Clock className="size-2.5 text-red-400" />
                            <span className="text-[9px] text-red-500">{currentSlot.startHour}h - {currentSlot.endHour}h</span>
                          </div>
                        )}
                        {!isOccupied && (
                          <div className="mt-1 flex items-center gap-1">
                            <CheckCircle2 className="size-2.5 text-green-400" />
                            <span className="text-[9px] text-green-500">Disponible maintenant</span>
                          </div>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
