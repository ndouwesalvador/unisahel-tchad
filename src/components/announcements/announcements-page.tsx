'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Megaphone,
  Plus,
  AlertTriangle,
  Info,
  CreditCard,
  FileCheck,
  BookOpen,
  Briefcase,
  Users,
  Clock,
  Eye,
  Edit,
  Trash2,
  Pin,
  Search,
  BarChart3,
  Send,
  CalendarClock,
  GraduationCap,
  Building2,
  Siren,
  PartyPopper,
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

// ─── Types & Config ───────────────────────────────────────────────────────────

type AnnouncementType = 'INFO' | 'URGENT' | 'PAYMENT' | 'RESULT' | 'EXAM' | 'STAGE'
type Priority = 'urgent' | 'important' | 'normal'
type TargetAudience = 'Tous' | 'Etudiants' | 'Enseignants' | 'Scolarite'
type Category = 'academique' | 'administratif' | 'urgence' | 'evenement'

interface Announcement {
  id: string
  title: string
  content: string
  type: AnnouncementType
  priority: Priority
  target: TargetAudience
  category: Category
  date: string
  author: string
  isRead: boolean
  isPinned: boolean
}

const typeConfig: Record<AnnouncementType, { label: string; className: string; icon: React.ElementType }> = {
  INFO: { label: 'Info', className: 'bg-[#1a274415] text-[#1a2744] border-0', icon: Info },
  URGENT: { label: 'Urgent', className: 'bg-[#c6282815] text-[#c62828] border-0', icon: AlertTriangle },
  PAYMENT: { label: 'Paiement', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0', icon: CreditCard },
  RESULT: { label: 'Resultat', className: 'bg-[#d4a85315] text-[#d4a853] border-0', icon: FileCheck },
  EXAM: { label: 'Examen', className: 'bg-[#6a1b9a15] text-[#6a1b9a] border-0', icon: BookOpen },
  STAGE: { label: 'Stage', className: 'bg-[#e6510015] text-[#e65100] border-0', icon: Briefcase },
}

const priorityConfig: Record<Priority, { label: string; borderClass: string; dotClass: string; badgeClass: string }> = {
  urgent: {
    label: 'Urgent',
    borderClass: 'border-l-4 border-l-red-500',
    dotClass: 'bg-red-500',
    badgeClass: 'bg-red-100 text-red-700 border-0',
  },
  important: {
    label: 'Important',
    borderClass: 'border-l-4 border-l-[#d4a853]',
    dotClass: 'bg-[#d4a853]',
    badgeClass: 'bg-amber-100 text-amber-700 border-0',
  },
  normal: {
    label: 'Normal',
    borderClass: 'border-l-4 border-l-gray-300',
    dotClass: 'bg-gray-300',
    badgeClass: 'bg-gray-100 text-gray-600 border-0',
  },
}

const categoryConfig: Record<Category, { label: string; icon: React.ElementType; className: string }> = {
  academique: { label: 'Academique', icon: GraduationCap, className: 'bg-blue-100 text-blue-700 border-0' },
  administratif: { label: 'Administratif', icon: Building2, className: 'bg-gray-100 text-gray-700 border-0' },
  urgence: { label: 'Urgence', icon: Siren, className: 'bg-red-100 text-red-700 border-0' },
  evenement: { label: 'Evenement', icon: PartyPopper, className: 'bg-purple-100 text-purple-700 border-0' },
}

const targetConfig: Record<TargetAudience, { label: string; className: string }> = {
  Tous: { label: 'Tous', className: 'bg-gray-100 text-gray-600 border-0' },
  Etudiants: { label: 'Etudiants', className: 'bg-[#2d7a4f10] text-[#2d7a4f] border-0' },
  Enseignants: { label: 'Enseignants', className: 'bg-[#1a274410] text-[#1a2744] border-0' },
  Scolarite: { label: 'Scolarite', className: 'bg-[#d4a85310] text-[#d4a853] border-0' },
}

const categoryTabs: { value: string; label: string; icon: React.ElementType; filter: Category | null }[] = [
  { value: 'toutes', label: 'Toutes', icon: Megaphone, filter: null },
  { value: 'academique', label: 'Academique', icon: GraduationCap, filter: 'academique' },
  { value: 'administratif', label: 'Administratif', icon: Building2, filter: 'administratif' },
  { value: 'urgence', label: 'Urgences', icon: Siren, filter: 'urgence' },
  { value: 'evenement', label: 'Evenements', icon: PartyPopper, filter: 'evenement' },
]

// ─── Demo Data ────────────────────────────────────────────────────────────────

const demoAnnouncements: Announcement[] = [
  {
    id: '1',
    title: 'Rentree academique 2024-2025',
    content: 'La rentree academique pour l\'annee 2024-2025 est fixee au 15 septembre 2024. Tous les etudiants sont tenus de proceder a leur inscription en ligne avant le 10 septembre. Les cours debuteront officiellement le 20 septembre pour toutes les filieres. Les etudiants nouvellement admis devront se presenter au service de la scolarite muni des pieces requises.',
    type: 'URGENT',
    priority: 'urgent',
    target: 'Tous',
    category: 'academique',
    date: '01/09/2024',
    author: 'Administration Generale',
    isRead: false,
    isPinned: true,
  },
  {
    id: '2',
    title: 'Calendrier des examens du S1',
    content: 'Le calendrier des examens du premier semestre est desormais disponible. Les examens debuteront le 15 janvier 2025. Les etudiants sont invites a consulter le planning detaille sur le portail. Toute demande de modification doit etre soumise au plus tard le 5 janvier.',
    type: 'EXAM',
    priority: 'important',
    target: 'Etudiants',
    category: 'academique',
    date: '10/12/2024',
    author: 'Service Scolarite',
    isRead: true,
    isPinned: true,
  },
  {
    id: '3',
    title: 'Inscription en ligne ouverte',
    content: 'Le portail d\'inscription en ligne est desormais ouvert pour l\'annee academique 2024-2025. Les etudiants anciens peuvent se reinscrire en accedant a leur espace personnel. Les nouveaux bacheliers doivent creer un compte avant de proceder a leur pre-inscription.',
    type: 'INFO',
    priority: 'normal',
    target: 'Etudiants',
    category: 'administratif',
    date: '15/08/2024',
    author: 'Service Scolarite',
    isRead: true,
    isPinned: false,
  },
  {
    id: '4',
    title: 'Bourses disponibles',
    content: 'Les dossiers de bourse pour l\'annee academique 2024-2025 sont ouverts. Les etudiants eligibles doivent soumettre leur dossier complet au service des bourses avant le 30 octobre 2024. Les criteres d\'eligibilite et la liste des pieces a fournir sont disponibles au secretariat.',
    type: 'PAYMENT',
    priority: 'important',
    target: 'Etudiants',
    category: 'administratif',
    date: '20/09/2024',
    author: 'Service des Bourses',
    isRead: false,
    isPinned: false,
  },
  {
    id: '5',
    title: 'Reunion du conseil de faculte',
    content: 'Une reunion du conseil de la Faculte de Droit est convoquee le 25 novembre 2024 a 10h00 en salle de conference. L\'ordre du jour comprend la revision des maquettes pedagogiques et le planning des deliberations. La presence de tous les enseignants est obligatoire.',
    type: 'INFO',
    priority: 'important',
    target: 'Enseignants',
    category: 'administratif',
    date: '18/11/2024',
    author: 'Doyen Faculte de Droit',
    isRead: true,
    isPinned: false,
  },
  {
    id: '6',
    title: 'Resultats du premier semestre',
    content: 'Les resultats du premier semestre de l\'annee academique 2024-2025 seront publies le 15 fevrier 2025. Les etudiants pourront consulter leurs notes sur le portail. Les demandes de recours devront etre deposees dans un delai de 5 jours ouvrables apres la publication.',
    type: 'RESULT',
    priority: 'normal',
    target: 'Etudiants',
    category: 'academique',
    date: '10/02/2025',
    author: 'Scolarite Filere Droit',
    isRead: false,
    isPinned: false,
  },
  {
    id: '7',
    title: 'Offres de stage disponibles',
    content: 'Plusieurs entreprises partenaires proposent des stages pour le second semestre. Les offres concernent les domaines juridiques, administratifs et de gestion. Les etudiants en L3 et Master sont prioritaires. Les candidatures doivent etre transmises au service des stages.',
    type: 'STAGE',
    priority: 'normal',
    target: 'Etudiants',
    category: 'academique',
    date: '05/01/2025',
    author: 'Service des Stages',
    isRead: true,
    isPinned: false,
  },
  {
    id: '8',
    title: 'Maintenance du systeme informatique',
    content: 'Une maintenance preventive du systeme informatique est programmee le week-end du 12 au 13 octobre. Les services en ligne seront temporairement indisponibles. Veuillez planifier vos travaux en consequence.',
    type: 'INFO',
    priority: 'normal',
    target: 'Scolarite',
    category: 'urgence',
    date: '08/10/2024',
    author: 'DSI',
    isRead: true,
    isPinned: false,
  },
  {
    id: '9',
    title: 'Journee portes ouvertes 2025',
    content: 'L\'Universite organise sa journee portes ouvertes le 15 mars 2025. Les etudiants et le personnel sont invites a participer a l\'organisation. Les volontaires peuvent s\'inscrire aupres du service de communication.',
    type: 'INFO',
    priority: 'normal',
    target: 'Tous',
    category: 'evenement',
    date: '20/02/2025',
    author: 'Service Communication',
    isRead: false,
    isPinned: false,
  },
  {
    id: '10',
    title: 'Conference internationale sur le droit',
    content: 'Une conference internationale sur le droit de l\'environnement en Afrique Centrale se tiendra le 10 avril 2025 a l\'amphitheatre A. Les inscriptions sont ouvertes jusqu\'au 25 mars.',
    type: 'INFO',
    priority: 'important',
    target: 'Tous',
    category: 'evenement',
    date: '01/03/2025',
    author: 'Faculte de Droit',
    isRead: true,
    isPinned: false,
  },
  {
    id: '11',
    title: 'Alerte : Fermeture exceptionnelle du campus',
    content: 'En raison de conditions meteologiques exceptionnelles, le campus sera ferme le 18 aout 2024. Tous les cours et activites sont suspendus. La reprise est prevue le 19 aout. Restez informes via le portail.',
    type: 'URGENT',
    priority: 'urgent',
    target: 'Tous',
    category: 'urgence',
    date: '17/08/2024',
    author: 'Administration Generale',
    isRead: false,
    isPinned: true,
  },
  {
    id: '12',
    title: 'Semaine culturelle de l\'universite',
    content: 'La semaine culturelle annuelle aura lieu du 20 au 25 avril 2025. Au programme : expositions, spectacles, concerts et debats. Les inscriptions pour les stands sont ouvertes au service culturel.',
    type: 'INFO',
    priority: 'normal',
    target: 'Tous',
    category: 'evenement',
    date: '01/04/2025',
    author: 'Service Culturel',
    isRead: true,
    isPinned: false,
  },
]

// ─── Announcement Card Component ──────────────────────────────────────────────

function AnnouncementCard({ announcement, index }: { announcement: Announcement; index: number }) {
  const typeConf = typeConfig[announcement.type]
  const prioConf = priorityConfig[announcement.priority]
  const catConf = categoryConfig[announcement.category]
  const targetConf = targetConfig[announcement.target]
  const TypeIcon = typeConf.icon
  const CatIcon = catConf.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
    >
      <Card className={`overflow-hidden hover:shadow-md transition-shadow ${prioConf.borderClass} ${!announcement.isRead ? 'ring-1 ring-[#1a2744]/10' : ''}`}>
        <div className="h-1 bg-gradient-to-r from-[#d4a853] to-[#e6c477]" />
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            {/* Top row: pin + badges */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {announcement.isPinned && (
                  <Pin className="size-3.5 text-[#1a2744] shrink-0 fill-[#1a2744]" />
                )}
                <Badge className={`text-[9px] ${catConf.className}`}>
                  <CatIcon className="size-2.5 mr-0.5" />
                  {catConf.label}
                </Badge>
                <Badge className={`text-[9px] ${typeConf.className}`}>
                  <TypeIcon className="size-2.5 mr-0.5" />
                  {typeConf.label}
                </Badge>
                <Badge className={`text-[9px] ${prioConf.badgeClass}`}>
                  {prioConf.label}
                </Badge>
                {!announcement.isRead && (
                  <span className="w-2 h-2 rounded-full bg-[#1a2744] shrink-0" />
                )}
              </div>
              <Badge className={`text-[9px] ${targetConf.className}`}>
                <Users className="size-2.5 mr-0.5" />
                {targetConf.label}
              </Badge>
            </div>

            {/* Title */}
            <h3 className={`text-sm font-semibold ${announcement.isRead ? 'text-[#1a2744]' : 'text-[#1a2744]'} leading-snug`}>
              {announcement.title}
            </h3>

            {/* Content preview */}
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
              {announcement.content}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div className="flex items-center gap-3 text-[10px] text-gray-400">
                <div className="flex items-center gap-1">
                  <Clock className="size-3" />
                  <span>{announcement.date}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Edit className="size-3" />
                  <span>{announcement.author}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-600 hover:text-[#1a2744]">
                  <Eye className="size-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-600 hover:text-[#2d7a4f]">
                  <Edit className="size-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-600 hover:text-red-500">
                  <Trash2 className="size-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AnnouncementsPage() {
  const annoncesActives = useCountUp(12, 1400)
  const tauxLecture = useCountUp(94, 1300)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('toutes')
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newPriority, setNewPriority] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newTarget, setNewTarget] = useState('')
  const [scheduleMode, setScheduleMode] = useState(false)

  const filteredAnnouncements = demoAnnouncements.filter(a => {
    const matchSearch = search === '' ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase())

    const tabConfig = categoryTabs.find(t => t.value === activeTab)
    const matchTab = !tabConfig?.filter || a.category === tabConfig.filter

    return matchSearch && matchTab
  })

  // Sort: pinned first, then by date
  const sortedAnnouncements = [...filteredAnnouncements].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1
    if (!a.isPinned && b.isPinned) return 1
    return 0
  })

  // Stats
  const totalUrgentes = demoAnnouncements.filter(a => a.priority === 'urgent').length

  const getCategoryCount = (cat: Category | null) => {
    if (!cat) return demoAnnouncements.length
    return demoAnnouncements.filter(a => a.category === cat).length
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Gradient Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#1a2744] via-[#1f3050] to-[#2d7a4f] p-6 md:p-8 rounded-xl">
        {/* SVG pattern overlay */}
        <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '24px 24px'}} />
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">Annonces & Communications</h1>
              <p className="text-sm text-white/70 mt-1">Gestion des annonces institutionnelles et communications urgentes</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                className="bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 text-white text-xs"
              >
                <Plus className="size-3.5 mr-1.5" />
                Nouvelle annonce
              </Button>
              <Button
                size="sm"
                className="bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 text-white text-xs"
              >
                <Send className="size-3.5 mr-1.5" />
                Diffuser
              </Button>
              <Button
                size="sm"
                className="bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 text-white text-xs"
              >
                <BarChart3 className="size-3.5 mr-1.5" />
                Statistiques
              </Button>
            </div>
          </div>
          {/* Glass-morphism stat cards */}
          <div className="flex gap-4 mt-4">
            <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }} className="bg-white/10 backdrop-blur border border-white/15 rounded-lg px-4 py-3">
              <div className="text-white/60 text-xs">Annonces actives</div>
              <div className="text-white text-2xl font-bold">{annoncesActives}</div>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }} className="bg-white/10 backdrop-blur border border-white/15 rounded-lg px-4 py-3">
              <div className="text-white/60 text-xs">Taux de lecture</div>
              <div className="text-white text-2xl font-bold">{tauxLecture}%</div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Statistics Card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="border-l-4 border-l-[#1a2744]">
            <div className="h-1 bg-gradient-to-r from-[#1a2744] to-[#2d3e5e]" />
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-medium">Annonces ce mois</p>
                  <p className="text-2xl font-bold text-[#1a2744]">12</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#1a274415] flex items-center justify-center">
                  <Megaphone className="size-5 text-[#1a2744]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border-l-4 border-l-[#2d7a4f]">
            <div className="h-1 bg-gradient-to-r from-[#2d7a4f] to-[#3da66a]" />
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-medium">Taux de lecture</p>
                  <p className="text-2xl font-bold text-[#2d7a4f]">78%</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#2d7a4f15] flex items-center justify-center">
                  <BarChart3 className="size-5 text-[#2d7a4f]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-l-4 border-l-[#d4a853]">
            <div className="h-1 bg-gradient-to-r from-[#d4a853] to-[#e6c477]" />
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-medium">Non lues</p>
                  <p className="text-2xl font-bold text-[#d4a853]">23</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#d4a85315] flex items-center justify-center">
                  <Eye className="size-5 text-[#d4a853]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-l-4 border-l-red-500">
            <div className="h-1 bg-gradient-to-r from-[#ef4444] to-[#f87171]" />
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-medium">Urgentes</p>
                  <p className="text-2xl font-bold text-red-600">{totalUrgentes}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                  <AlertTriangle className="size-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - 2 columns */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                placeholder="Rechercher une annonce..."
                className="pl-9 h-10 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </motion.div>

          {/* Category Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-gray-100 h-auto p-1 flex-wrap">
              {categoryTabs.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value} className="text-xs gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <tab.icon className="size-3" />
                  {tab.label}
                  <Badge className="text-[8px] h-4 min-w-[16px] flex items-center justify-center bg-[#1a274415] text-[#1a2744] border-0 ml-0.5">
                    {getCategoryCount(tab.filter)}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              <div className="space-y-3">
                {/* Pinned section */}
                {sortedAnnouncements.some(a => a.isPinned) && (
                  <div className="mb-2">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Pin className="size-3 text-[#1a2744]" />
                      <span className="text-[10px] font-semibold text-[#1a2744] uppercase">Epingles</span>
                    </div>
                    <div className="space-y-3">
                      {sortedAnnouncements.filter(a => a.isPinned).map((announcement, idx) => (
                        <AnnouncementCard key={announcement.id} announcement={announcement} index={idx} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Regular announcements */}
                {sortedAnnouncements.filter(a => !a.isPinned).length > 0 && (
                  <div>
                    {sortedAnnouncements.some(a => a.isPinned) && (
                      <div className="flex items-center gap-1.5 mb-2 mt-4">
                        <Clock className="size-3 text-gray-400" />
                        <span className="text-[10px] font-semibold text-gray-400 uppercase">Recentes</span>
                      </div>
                    )}
                    <div className="space-y-3">
                      {sortedAnnouncements.filter(a => !a.isPinned).map((announcement, idx) => (
                        <AnnouncementCard key={announcement.id} announcement={announcement} index={idx + sortedAnnouncements.filter(a => a.isPinned).length} />
                      ))}
                    </div>
                  </div>
                )}

                {sortedAnnouncements.length === 0 && (
                  <div className="py-12 text-center text-sm text-gray-400">
                    Aucune annonce trouvee
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* New Announcement Form Card - 1 column */}
        <div className="lg:col-span-1">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <Card className="shadow-sm sticky top-4">
              <div className="h-1 bg-gradient-to-r from-[#d4a853] to-[#e6c477]" />
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <Plus className="size-4" />
                  Nouvelle annonce
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Titre</Label>
                  <Input
                    placeholder="Titre de l'annonce"
                    className="h-9 text-xs"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Categorie</Label>
                  <Select value={newCategory} onValueChange={setNewCategory}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Selectionner une categorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="academique">Academique</SelectItem>
                      <SelectItem value="administratif">Administratif</SelectItem>
                      <SelectItem value="urgence">Urgence</SelectItem>
                      <SelectItem value="evenement">Evenement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Priorite</Label>
                  <Select value={newPriority} onValueChange={setNewPriority}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Selectionner une priorite" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="important">Important</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Contenu</Label>
                  <Textarea
                    placeholder="Rediger le contenu de l'annonce..."
                    rows={4}
                    className="text-xs resize-none"
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Public cible</Label>
                  <Select value={newTarget} onValueChange={setNewTarget}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Selectionner le public" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tous">Tous</SelectItem>
                      <SelectItem value="etudiants">Etudiants</SelectItem>
                      <SelectItem value="enseignants">Enseignants</SelectItem>
                      <SelectItem value="scolarite">Scolarite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={scheduleMode}
                      onCheckedChange={setScheduleMode}
                      className="data-[state=checked]:bg-[#2d7a4f]"
                    />
                    <Label className="text-xs text-gray-600 flex items-center gap-1">
                      <CalendarClock className="size-3" />
                      Programmer
                    </Label>
                  </div>
                </div>
                {scheduleMode && (
                  <Input type="datetime-local" className="h-9 text-xs" />
                )}
                <Button className="w-full bg-[#2d7a4f] hover:bg-[#236b40] text-white h-9 text-xs">
                  <Send className="size-3.5 mr-1.5" />
                  Publier
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
