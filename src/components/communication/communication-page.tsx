'use client'

import { exportToExcel } from '@/lib/export'
import { useCommunications } from '@/lib/api-hooks'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  MessageSquare,
  Send,
  Users,
  Bell,
  Plus,
  Download,
  Search,
  TrendingUp,
  Mail,
  Phone,
  Smartphone,
  Megaphone,
  Hash,
  Clock,
  CheckCheck,
  Check,
  Paperclip,
  ArrowLeft,
  Edit,
  Trash2,
  Eye,
  Radio,
  Wifi,
  WifiOff,
  MessageCircle,
  Globe,
  AlertTriangle,
  Zap,
  FileText,
  ChevronRight,
  Circle,
} from 'lucide-react'

// ─── Demo Data ──────────────────────────────────────────────────────────────────

const conversations = [
  { id: 1, name: 'Abakar Mahamat', type: 'Individuel', lastMessage: 'Merci pour les resultats du semestre', time: '09:45', unread: 2, online: true, avatar: 'AM' },
  { id: 2, name: 'Groupe Informatique L3', type: 'Groupe', lastMessage: 'Ndeye: Le TD est disponible?', time: '09:30', unread: 5, online: true, avatar: 'GI' },
  { id: 3, name: 'Fatime Hisseine', type: 'Individuel', lastMessage: 'Je vous envoie le rapport demain', time: '09:15', unread: 0, online: false, avatar: 'FH' },
  { id: 4, name: 'Canal Scolarite', type: 'Canal', lastMessage: 'Inscriptions ouvertes pour S2', time: '08:50', unread: 12, online: true, avatar: 'SC' },
  { id: 5, name: 'Oumar Djibrine', type: 'Individuel', lastMessage: 'Les notes sont validees', time: '08:30', unread: 1, online: true, avatar: 'OD' },
  { id: 6, name: 'Groupe Enseignants Droit', type: 'Groupe', lastMessage: 'Adam: Reunion a 14h', time: '08:15', unread: 3, online: true, avatar: 'GE' },
  { id: 7, name: 'Khadija Idriss', type: 'Individuel', lastMessage: 'Pouvez-vous verifier mon dossier?', time: 'Hier', unread: 0, online: false, avatar: 'KI' },
  { id: 8, name: 'Canal Examens', type: 'Canal', lastMessage: 'Planning S2 disponible', time: 'Hier', unread: 8, online: true, avatar: 'CE' },
  { id: 9, name: 'Moussa Adoum', type: 'Individuel', lastMessage: 'Merci pour la convocation', time: 'Hier', unread: 0, online: true, avatar: 'MA' },
  { id: 10, name: 'Groupe Administration', type: 'Groupe', lastMessage: 'Halime: Budget valide', time: 'Hier', unread: 2, online: true, avatar: 'GA' },
  { id: 11, name: 'Aichatou Bichara', type: 'Individuel', lastMessage: 'Le certificat est pret', time: 'Lun.', unread: 0, online: false, avatar: 'AB' },
  { id: 12, name: 'Canal Bibliotheque', type: 'Canal', lastMessage: 'Nouveaux ouvrages disponibles', time: 'Lun.', unread: 4, online: true, avatar: 'CB' },
]

const chatMessages = [
  { id: 1, sender: 'them', text: 'Bonjour, je souhaiterais avoir des informations sur les inscriptions pour le second semestre', time: '09:20', read: true },
  { id: 2, sender: 'me', text: 'Bonjour Abakar, les inscriptions sont ouvertes du 15 au 28 fevrier. Vous pouvez vous inscrire en ligne via le portail ou au bureau de la scolarite.', time: '09:25', read: true },
  { id: 3, sender: 'them', text: 'D\'accord, et quels sont les documents necessaires?', time: '09:30', read: true, attachment: null },
  { id: 4, sender: 'me', text: 'Il vous faut: carte d\'identite, releve de notes S1, certificat d\'inscription, et les frais de scolarite. Je vous envoie la liste complete en piece jointe.', time: '09:35', read: true, attachment: 'Liste_documents_S2.pdf' },
  { id: 5, sender: 'them', text: 'Merci pour les resultats du semestre', time: '09:45', read: false },
]

const channels = [
  { id: 1, name: 'General', members: 342, lastActivity: 'Il y a 5 min', description: 'Canal general pour toutes les annonces', type: 'Public', joined: true },
  { id: 2, name: 'Scolarite', members: 45, lastActivity: 'Il y a 15 min', description: 'Questions et infos sur la scolarite', type: 'Public', joined: true },
  { id: 3, name: 'Examens', members: 67, lastActivity: 'Il y a 30 min', description: 'Planning et resultats d\'examens', type: 'Prive', joined: true },
  { id: 4, name: 'Evenements', members: 189, lastActivity: 'Il y a 1h', description: 'Annonces d\'evenements universitaires', type: 'Public', joined: false },
  { id: 5, name: 'Bibliotheque', members: 56, lastActivity: 'Il y a 2h', description: 'Nouveautes et horaires bibliotheque', type: 'Public', joined: true },
  { id: 6, name: 'Stages', members: 34, lastActivity: 'Il y a 3h', description: 'Offres de stage et conseils', type: 'Prive', joined: false },
  { id: 7, name: 'Recherche', members: 28, lastActivity: 'Hier', description: 'Publications et projets de recherche', type: 'Annuaire', joined: false },
  { id: 8, name: 'Urgences', members: 412, lastActivity: 'Il y a 10 min', description: 'Alertes et communications urgentes', type: 'Prive', joined: true },
]

interface Broadcast {
  id: string
  subject: string
  audience: string
  type: string
  priority: string
  sentDate: string
  readRate: number
  delivered: number
  failed: number
}

interface CommunicationRecord {
  id: string
  subject: string
  audience: string
  type: 'INFO' | 'URGENT' | 'ACADEMIC' | 'ADMINISTRATIVE'
  priority: 'NORMAL' | 'HIGH' | 'CRITICAL'
  channel: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP'
  status: 'PENDING' | 'SENT' | 'FAILED'
  content: string | null
  sentDate: string | null
  readRate: number
  deliveredCount: number
  failedCount: number
}

// Keys must match typeConfig / priorityConfig lookups below
const broadcastTypeApiToUi: Record<CommunicationRecord['type'], string> = {
  INFO: 'Info',
  URGENT: 'Urgent',
  ACADEMIC: 'Academique',
  ADMINISTRATIVE: 'Administratif',
}

const broadcastPriorityApiToUi: Record<CommunicationRecord['priority'], string> = {
  NORMAL: 'Normal',
  HIGH: 'High',
  CRITICAL: 'Critical',
}

const shortMonths = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec']

function formatSentDate(sentDate: string | null): string {
  if (!sentDate) return 'Non envoye'
  const d = new Date(sentDate)
  if (Number.isNaN(d.getTime())) return 'Non envoye'
  const day = String(d.getDate()).padStart(2, '0')
  return `${day} ${shortMonths[d.getMonth()]} ${d.getFullYear()}`
}

function mapBroadcast(r: CommunicationRecord): Broadcast {
  return {
    id: r.id,
    subject: r.subject,
    audience: r.audience,
    type: broadcastTypeApiToUi[r.type] || 'Info',
    priority: broadcastPriorityApiToUi[r.priority] || 'Normal',
    sentDate: formatSentDate(r.sentDate),
    readRate: r.readRate ?? 0,
    delivered: r.deliveredCount ?? 0,
    failed: r.failedCount ?? 0,
  }
}

const notifications = [
  { id: 1, message: 'Convocation S2 envoyee a 2847 etudiants', type: 'Email', status: 'Envoye', date: '15 Fev 09:00', count: 2847 },
  { id: 2, message: 'Rappel paiement via SMS Orange', type: 'SMS', status: 'Envoye', date: '14 Fev 14:30', count: 234 },
  { id: 3, message: 'Alerte urgence campus', type: 'Push', status: 'Envoye', date: '14 Fev 10:15', count: 412 },
  { id: 4, message: 'Resultats S1 par SMS Airtel', type: 'SMS', status: 'Envoye', date: '05 Fev 16:00', count: 1560 },
  { id: 5, message: 'Convocation jury par email', type: 'Email', status: 'Envoye', date: '12 Fev 08:45', count: 156 },
  { id: 6, message: 'Rappel inscription Moov SMS', type: 'SMS', status: 'En attente', date: '11 Fev 09:00', count: 678 },
  { id: 7, message: 'Notification bibliotheque', type: 'In-App', status: 'Envoye', date: '10 Fev 11:30', count: 56 },
  { id: 8, message: 'Alerte impaye SMS Orange', type: 'SMS', status: 'Echoue', date: '10 Fev 08:00', count: 45 },
  { id: 9, message: 'Emploi du temps modifie', type: 'Push', status: 'Envoye', date: '08 Fev 13:20', count: 67 },
  { id: 10, message: 'Bourse excellence notification', type: 'In-App', status: 'En attente', date: '01 Fev 10:00', count: 312 },
]

const drafts = [
  { id: 1, subject: 'Convocation examen rattrapage', template: 'convocation', audience: 'Etudiants en dette', lastModified: '15 Fev 2025', status: 'Brouillon' },
  { id: 2, subject: 'Resultats deliberation L2', template: 'resultat', audience: 'L2 toutes filieres', lastModified: '14 Fev 2025', status: 'Brouillon' },
  { id: 3, subject: 'Rappel inscription pedagogique', template: 'rappel', audience: 'Non inscrits S2', lastModified: '12 Fev 2025', status: 'A reviser' },
  { id: 4, subject: 'Alerte fermeture exceptionnelle', template: 'urgence', audience: 'Tout le campus', lastModified: '10 Fev 2025', status: 'Brouillon' },
  { id: 5, subject: 'Information bourses de recherche', template: 'convocation', audience: 'Doctorants', lastModified: '08 Fev 2025', status: 'Brouillon' },
]

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
    transition: { staggerChildren: 0.08 },
  },
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
} as const

// ─── Main Component ────────────────────────────────────────────────────────────

export function CommunicationPage() {
  const [selectedConversation, setSelectedConversation] = useState<number | null>(1)
  const [filterType, setFilterType] = useState('Tous')
  const [searchQuery, setSearchQuery] = useState('')
  const [messageInput, setMessageInput] = useState('')
  const [showMobileChat, setShowMobileChat] = useState(false)
  const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false)
  const [previewDraft, setPreviewDraft] = useState<number | null>(null)

  const { data: communicationsQuery, isLoading: broadcastsLoading } = useCommunications()
  const broadcasts: Broadcast[] = (communicationsQuery?.communications || []).map(mapBroadcast)
  const broadcastStats = communicationsQuery?.stats
  // Header stats: real broadcast counts (no per-message read-tracking exists,
  // so we surface sent vs total instead of a fabricated "taux de lecture").
  const messagesCount = useCountUp(broadcastStats?.total ?? 0, 1400)
  const sentCount = useCountUp(broadcastStats?.sent ?? 0, 1300)

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === 'Tous' || c.type === filterType
    return matchesSearch && matchesType
  })

  const activeConversation = conversations.find((c) => c.id === selectedConversation)

  const handleSelectConversation = (id: number) => {
    setSelectedConversation(id)
    setShowMobileChat(true)
  }

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      setMessageInput('')
    }
  }

  const quickReplies = ['Bien recu', 'Je regarde', 'En cours de traitement', 'Merci']

  const typeConfig: Record<string, { color: string; bg: string }> = {
    Info: { color: 'text-blue-700', bg: 'bg-blue-50' },
    Urgent: { color: 'text-red-700', bg: 'bg-red-50' },
    Academique: { color: 'text-[#2d7a4f]', bg: 'bg-[#2d7a4f10]' },
    Administratif: { color: 'text-[#1a2744]', bg: 'bg-[#1a274410]' },
  }

  const priorityConfig: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
    Normal: { color: 'text-gray-700', bg: 'bg-gray-100', icon: Circle },
    High: { color: 'text-amber-700', bg: 'bg-amber-50', icon: AlertTriangle },
    Critical: { color: 'text-red-700', bg: 'bg-red-50', icon: Zap },
  }

  const notifTypeConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    Email: { icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50' },
    SMS: { icon: Smartphone, color: 'text-[#2d7a4f]', bg: 'bg-[#2d7a4f10]' },
    Push: { icon: Bell, color: 'text-purple-600', bg: 'bg-purple-50' },
    'In-App': { icon: MessageSquare, color: 'text-[#1a2744]', bg: 'bg-[#1a274410]' },
  }

  const notifStatusConfig: Record<string, { color: string; bg: string }> = {
    Envoye: { color: 'text-[#2d7a4f]', bg: 'bg-[#2d7a4f10]' },
    'En attente': { color: 'text-amber-700', bg: 'bg-amber-50' },
    Echoue: { color: 'text-red-700', bg: 'bg-red-50' },
  }

  const channelTypeConfig: Record<string, { color: string; bg: string }> = {
    Public: { color: 'text-[#2d7a4f]', bg: 'bg-[#2d7a4f10]' },
    Prive: { color: 'text-[#1a2744]', bg: 'bg-[#1a274410]' },
    Annuaire: { color: 'text-[#d4a853]', bg: 'bg-[#d4a85310]' },
  }

  const templateConfig: Record<string, string> = {
    convocation: 'Convocation officielle avec date, lieu et objet',
    resultat: 'Notification de resultats academiques',
    rappel: 'Rappel avec echeance et instructions',
    urgence: 'Alerte urgente avec instructions immediates',
  }

  return (
    <TooltipProvider>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* ─── Gradient Header Banner ─────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <div className="relative overflow-hidden bg-gradient-to-r from-[#1a2744] via-[#1f3050] to-[#2d7a4f] p-6 md:p-8 rounded-xl mb-2">
            {/* SVG pattern overlay */}
            <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '24px 24px'}} />
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-white">Centre de communication unifie</h1>
                  <p className="text-sm text-white/70 mt-1">Echanges internes, canaux de communication et diffusion</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
            <Button className="bg-[#1a2744] hover:bg-[#1a2744]/90 text-white gap-2">
              <Plus className="size-4" />
              Nouveau message
            </Button>
            <Dialog open={broadcastDialogOpen} onOpenChange={setBroadcastDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#d4a853] hover:bg-[#d4a853]/90 text-white gap-2">
                  <Megaphone className="size-4" />
                  Nouvelle diffusion
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-[#1a2744]">Nouvelle diffusion</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label>Objet</Label>
                    <Input placeholder="Objet de la diffusion" />
                  </div>
                  <div className="space-y-2">
                    <Label>Audience cible</Label>
                    <Select defaultValue="all">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les etudiants</SelectItem>
                        <SelectItem value="faculty">Par faculte</SelectItem>
                        <SelectItem value="level">Par niveau</SelectItem>
                        <SelectItem value="program">Par filiere</SelectItem>
                        <SelectItem value="custom">Personnalise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type de message</Label>
                      <Select defaultValue="info">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info">Info</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                          <SelectItem value="academique">Academique</SelectItem>
                          <SelectItem value="administratif">Administratif</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Priorite</Label>
                      <Select defaultValue="normal">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">Haute</SelectItem>
                          <SelectItem value="critical">Critique</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Message</Label>
                    <Textarea placeholder="Contenu de la diffusion..." rows={4} />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch id="schedule" />
                    <Label htmlFor="schedule" className="text-sm">Programmer l&apos;envoi</Label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setBroadcastDialogOpen(false)}>Annuler</Button>
                    <Button className="bg-[#d4a853] hover:bg-[#d4a853]/90 text-white" onClick={() => setBroadcastDialogOpen(false)}>
                      <Send className="size-4 mr-2" /> Envoyer
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" className="gap-2 bg-white/10 backdrop-blur border-white/20 text-white hover:bg-white/20 hover:text-white" onClick={() => exportToExcel(filteredConversations, 'export_communication')}>
              <Download className="size-4" />
              Exporter
            </Button>
                </div>
              </div>
              {/* Glass-morphism stat cards */}
              <div className="flex gap-4 mt-4">
                <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }} className="bg-white/10 backdrop-blur border border-white/15 rounded-lg px-4 py-3">
                  <div className="text-white/60 text-xs">Diffusions</div>
                  <div className="text-white text-2xl font-bold">{messagesCount}</div>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }} className="bg-white/10 backdrop-blur border border-white/15 rounded-lg px-4 py-3">
                  <div className="text-white/60 text-xs">Envoyees</div>
                  <div className="text-white text-2xl font-bold">{sentCount}</div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ─── Stats Cards ───────────────────────────────────────────────────── */}
        <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Messages aujourd\'hui', value: 45, trend: '+12%', color: '#2d7a4f', icon: MessageSquare, progress: 65 },
            { label: 'Diffusions actives', value: broadcasts.length, trend: '', color: '#1a2744', icon: Megaphone, progress: 40 },
            { label: 'Taux de lecture', value: '87%', trend: '+3%', color: '#d4a853', icon: Eye, progress: 87 },
            { label: 'Canaux actifs', value: 12, trend: '', color: '#1a2744', icon: Hash, progress: 60 },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              variants={itemVariants}
              whileHover={{ scale: 1.02, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
              transition={{ duration: 0.2 }}
            >
              <Card className="border-l-4" style={{ borderLeftColor: stat.color }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 font-medium">{stat.label}</span>
                    <stat.icon className="size-4 text-gray-400" />
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</span>
                    {stat.trend && (
                      <span className="text-xs font-medium text-[#2d7a4f] flex items-center gap-0.5 mb-1">
                        <TrendingUp className="size-3" /> {stat.trend}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: stat.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${stat.progress}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* ─── Messaging Interface ───────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-[#1a2744] via-[#2d7a4f] to-[#d4a853]" />
            <div className="flex flex-col lg:flex-row h-[560px]">
              {/* Left Panel - Conversation List */}
              <div className={`w-full lg:w-80 border-r border-gray-200 flex flex-col ${showMobileChat ? 'hidden lg:flex' : 'flex'}`}>
                <div className="p-3 border-b border-gray-100">
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-2.5 size-4 text-gray-400" />
                    <Input
                      placeholder="Rechercher..."
                      className="pl-8 h-9 text-sm"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tous">Tous</SelectItem>
                      <SelectItem value="Individuel">Individuel</SelectItem>
                      <SelectItem value="Groupe">Groupe</SelectItem>
                      <SelectItem value="Canal">Canal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <ScrollArea className="flex-1">
                  <div className="divide-y divide-gray-50">
                    {filteredConversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv.id)}
                        className={`w-full flex items-start gap-3 p-3 text-left transition-colors hover:bg-[#1a274410] hover:scale-[1.01] ${
                          selectedConversation === conv.id ? 'bg-[#1a274408] border-l-2 border-l-[#1a2744]' : ''
                        }`}
                      >
                        <div className="relative shrink-0">
                          <div className="size-10 rounded-full flex items-center justify-center text-xs font-semibold text-white" style={{ backgroundColor: conv.type === 'Canal' ? '#1a2744' : conv.type === 'Groupe' ? '#2d7a4f' : '#d4a853' }}>
                            {conv.avatar}
                          </div>
                          <span className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white ${conv.online ? 'bg-[#2d7a4f]' : 'bg-gray-300'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-[#1a2744] truncate">{conv.name}</span>
                            <span className="text-[10px] text-gray-400 shrink-0 ml-2">{conv.time}</span>
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="text-xs text-gray-500 truncate pr-2">{conv.lastMessage}</span>
                            {conv.unread > 0 && (
                              <span className="shrink-0 min-w-[18px] h-[18px] flex items-center justify-center bg-[#1a2744] text-white text-[10px] font-bold rounded-full px-1">
                                {conv.unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Right Panel - Chat View */}
              <div className={`flex-1 flex flex-col border-l-4 border-l-[#1a2744] ${!showMobileChat && 'hidden lg:flex'}`}>
                {activeConversation ? (
                  <>
                    {/* Chat Header */}
                    <div className="flex items-center gap-3 p-3 border-b border-gray-100 bg-white">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden size-8"
                        onClick={() => setShowMobileChat(false)}
                      >
                        <ArrowLeft className="size-4" />
                      </Button>
                      <div className="relative">
                        <div className="size-9 rounded-full flex items-center justify-center text-xs font-semibold text-white" style={{ backgroundColor: activeConversation.type === 'Canal' ? '#1a2744' : activeConversation.type === 'Groupe' ? '#2d7a4f' : '#d4a853' }}>
                          {activeConversation.avatar}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white ${activeConversation.online ? 'bg-[#2d7a4f]' : 'bg-gray-300'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-[#1a2744]">{activeConversation.name}</div>
                        <div className="text-[10px] text-gray-400">{activeConversation.online ? 'En ligne' : 'Hors ligne'} - {activeConversation.type}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <Phone className="size-4 text-gray-600" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Appeler</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <Users className="size-4 text-gray-600" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Infos</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    {/* Messages */}
                    <ScrollArea className="flex-1 p-4">
                      <div className="space-y-4">
                        {chatMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[75%] ${msg.sender === 'me' ? 'order-1' : ''}`}>
                              <div
                                className={`rounded-2xl px-4 py-2.5 text-sm ${
                                  msg.sender === 'me'
                                    ? 'bg-[#1a2744] text-white rounded-br-md'
                                    : 'bg-white border border-gray-100 text-gray-800 rounded-bl-md shadow-sm'
                                }`}
                              >
                                <p>{msg.text}</p>
                                {msg.attachment && (
                                  <div className={`flex items-center gap-2 mt-2 px-2 py-1.5 rounded text-xs ${msg.sender === 'me' ? 'bg-white/10' : 'bg-gray-50'}`}>
                                    <Paperclip className="size-3" />
                                    <span>{msg.attachment}</span>
                                  </div>
                                )}
                              </div>
                              <div className={`flex items-center gap-1 mt-1 ${msg.sender === 'me' ? 'justify-end' : ''}`}>
                                <span className="text-[10px] text-gray-400">{msg.time}</span>
                                {msg.sender === 'me' && (
                                  msg.read
                                    ? <CheckCheck className="size-3 text-[#2d7a4f]" />
                                    : <Check className="size-3 text-gray-400" />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    {/* Quick Reply Chips */}
                    <div className="px-4 pb-1 flex gap-2 overflow-x-auto">
                      {quickReplies.map((reply) => (
                        <button
                          key={reply}
                          onClick={() => setMessageInput(reply)}
                          className="shrink-0 px-3 py-1 rounded-full text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-[#1a2744] hover:text-[#1a2744] transition-colors"
                        >
                          {reply}
                        </button>
                      ))}
                    </div>

                    {/* Input Area */}
                    <div className="p-3 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-9 shrink-0">
                              <Paperclip className="size-4 text-gray-600" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Joindre un fichier</TooltipContent>
                        </Tooltip>
                        <Input
                          placeholder="Ecrire un message..."
                          className="flex-1 h-9 text-sm"
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        />
                        <Button
                          size="icon"
                          className="size-9 shrink-0 bg-[#1a2744] hover:bg-[#1a2744]/90"
                          onClick={handleSendMessage}
                        >
                          <Send className="size-4 text-white" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <MessageSquare className="size-12 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Selectionnez une conversation</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ─── Broadcast / Diffusion Card ────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="border-l-4 border-l-[#d4a853]">
            <div className="h-1 bg-gradient-to-r from-[#1a2744] to-[#2d7a4f]" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-[#1a2744] flex items-center gap-2">
                  <Radio className="size-5 text-[#d4a853]" />
                  Diffusions &amp; Communications de masse
                </CardTitle>
                <Badge className="bg-[#d4a85310] text-[#d4a853] border-0">{broadcasts.length} diffusions</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Objet</TableHead>
                      <TableHead className="text-xs">Audience</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Priorite</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Taux lecture</TableHead>
                      <TableHead className="text-xs">Livres / Echoue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {broadcasts.map((b) => {
                      const tc = typeConfig[b.type] || typeConfig.Info
                      const pc = priorityConfig[b.priority] || priorityConfig.Normal
                      const PriorityIcon = pc.icon
                      return (
                        <TableRow key={b.id} className="hover:bg-gray-50/50">
                          <TableCell className="text-xs font-medium text-[#1a2744]">{b.subject}</TableCell>
                          <TableCell className="text-xs text-gray-600">{b.audience}</TableCell>
                          <TableCell>
                            <Badge className={`${tc.bg} ${tc.color} border-0 text-[10px]`}>{b.type}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${pc.bg} ${pc.color} border-0 text-[10px] gap-1`}>
                              <PriorityIcon className="size-3" /> {b.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-gray-500">{b.sentDate}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full rounded-full bg-[#2d7a4f]"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${b.readRate}%` }}
                                  transition={{ duration: 0.8, ease: 'easeOut' }}
                                />
                              </div>
                              <span className="text-[10px] font-medium text-gray-600">{b.readRate}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-gray-600">
                            <span className="text-[#2d7a4f]">{b.delivered}</span>
                            <span className="text-gray-300 mx-1">/</span>
                            <span className="text-red-500">{b.failed}</span>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {broadcastsLoading && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-sm text-gray-400">
                          Chargement...
                        </TableCell>
                      </TableRow>
                    )}
                    {!broadcastsLoading && broadcasts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-sm text-gray-400">
                          Aucune diffusion trouvee
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>

        {/* ─── Channels & Notifications Row ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Channels Card */}
          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <div className="h-1 bg-gradient-to-r from-[#2d7a4f] to-[#3da66a]" />
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-[#1a2744] flex items-center gap-2">
                  <Hash className="size-5 text-[#1a2744]" />
                  Canaux de communication
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-80">
                  <div className="space-y-2">
                    {channels.map((ch) => {
                      const ctc = channelTypeConfig[ch.type] || channelTypeConfig.Public
                      return (
                        <motion.div
                          key={ch.id}
                          whileHover={{ scale: 1.01 }}
                          className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                        >
                          <div className="size-10 rounded-lg flex items-center justify-center bg-[#1a274410] shrink-0">
                            <Hash className="size-4 text-[#1a2744]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-[#1a2744]">{ch.name}</span>
                              <Badge className={`${ctc.bg} ${ctc.color} border-0 text-[9px]`}>{ch.type}</Badge>
                            </div>
                            <p className="text-xs text-gray-500 truncate mt-0.5">{ch.description}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                <Users className="size-3" /> {ch.members}
                              </span>
                              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                <Clock className="size-3" /> {ch.lastActivity}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant={ch.joined ? 'outline' : 'default'}
                            size="sm"
                            className={`text-xs shrink-0 ${ch.joined ? 'text-gray-500' : 'bg-[#1a2744] hover:bg-[#1a2744]/90 text-white'}`}
                          >
                            {ch.joined ? 'Quitter' : 'Rejoindre'}
                          </Button>
                        </motion.div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>

          {/* Notifications Center Card */}
          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <div className="h-1 bg-gradient-to-r from-[#d4a853] to-[#e6c477]" />
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-[#1a2744] flex items-center gap-2">
                  <Bell className="size-5 text-[#1a2744]" />
                  Centre de notifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-80">
                  <div className="space-y-2">
                    {notifications.map((n) => {
                      const ntc = notifTypeConfig[n.type] || notifTypeConfig.Email
                      const Nsc = notifStatusConfig[n.status] || notifStatusConfig.Envoye
                      const NotifIcon = ntc.icon
                      return (
                        <div
                          key={n.id}
                          className="flex items-start gap-3 p-3 rounded-lg border border-gray-100"
                        >
                          <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${ntc.bg}`}>
                            <NotifIcon className={`size-4 ${ntc.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-700 leading-relaxed">{n.message}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <Badge className={`${ntc.bg} ${ntc.color} border-0 text-[9px]`}>{n.type}</Badge>
                              <Badge className={`${Nsc.bg} ${Nsc.color} border-0 text-[9px]`}>{n.status}</Badge>
                              <span className="text-[10px] text-gray-400">{n.date}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[10px] text-gray-500">{n.count} destinataires</span>
                              <div className="flex-1 max-w-24 h-1 bg-gray-100 rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full rounded-full"
                                  style={{ backgroundColor: n.status === 'Echoue' ? '#ef4444' : '#2d7a4f' }}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${n.status === 'Echoue' ? 30 : n.status === 'En attente' ? 50 : 100}%` }}
                                  transition={{ duration: 0.8 }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* ─── Announcement Drafts & African Context Row ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Announcement Drafts Card */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-[#1a2744] flex items-center gap-2">
                  <FileText className="size-5 text-[#1a2744]" />
                  Brouillons d&apos;annonces
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="drafts">
                  <TabsList className="mb-3">
                    <TabsTrigger value="drafts" className="text-xs">Brouillons ({drafts.length})</TabsTrigger>
                    <TabsTrigger value="templates" className="text-xs">Modeles</TabsTrigger>
                  </TabsList>
                  <TabsContent value="drafts">
                    <div className="space-y-2">
                      {drafts.map((d) => (
                        <motion.div
                          key={d.id}
                          whileHover={{ scale: 1.005 }}
                          className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                        >
                          <div className="size-9 rounded-lg flex items-center justify-center bg-[#d4a85310] shrink-0">
                            <Edit className="size-4 text-[#d4a853]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-[#1a2744]">{d.subject}</span>
                              <Badge className={`text-[9px] border-0 ${d.status === 'Brouillon' ? 'bg-gray-100 text-gray-600' : 'bg-amber-50 text-amber-700'}`}>
                                {d.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{d.audience}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className="bg-[#1a274410] text-[#1a2744] border-0 text-[9px]">{d.template}</Badge>
                              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                <Clock className="size-3" /> {d.lastModified}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-7" onClick={() => setPreviewDraft(previewDraft === d.id ? null : d.id)}>
                                  <Eye className="size-3.5 text-gray-600" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Apercu</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-7">
                                  <Edit className="size-3.5 text-gray-600" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Modifier</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-7">
                                  <Trash2 className="size-3.5 text-red-600" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Supprimer</TooltipContent>
                            </Tooltip>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    {/* Preview mode */}
                    <AnimatePresence>
                      {previewDraft !== null && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 p-4 rounded-lg border border-[#d4a85330] bg-[#d4a85308]"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-[#d4a853]">Apercu</span>
                            <Button variant="ghost" size="icon" className="size-6" onClick={() => setPreviewDraft(null)}>
                              <span className="text-xs text-gray-600">X</span>
                            </Button>
                          </div>
                          <h4 className="text-sm font-semibold text-[#1a2744]">{drafts.find((d) => d.id === previewDraft)?.subject}</h4>
                          <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                            Contenu du brouillon. Ce message sera envoye a {drafts.find((d) => d.id === previewDraft)?.audience}.
                            Modele utilise: {drafts.find((d) => d.id === previewDraft)?.template}.
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </TabsContent>
                  <TabsContent value="templates">
                    <div className="space-y-2">
                      {Object.entries(templateConfig).map(([key, desc]) => (
                        <div key={key} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-[#1a2744] transition-colors cursor-pointer">
                          <div className="size-9 rounded-lg flex items-center justify-center bg-[#1a274410] shrink-0">
                            <FileText className="size-4 text-[#1a2744]" />
                          </div>
                          <div className="flex-1">
                            <span className="text-sm font-medium text-[#1a2744] capitalize">{key}</span>
                            <p className="text-xs text-gray-500">{desc}</p>
                          </div>
                          <ChevronRight className="size-4 text-gray-300" />
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.div>

          {/* African Context Card */}
          <motion.div variants={itemVariants}>
            <Card className="border-l-4 border-l-[#2d7a4f]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-[#1a2744] flex items-center gap-2">
                  <Globe className="size-5 text-[#2d7a4f]" />
                  Contexte africain &amp; Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* SMS Integration */}
                  <div className="p-3 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Smartphone className="size-4 text-[#2d7a4f]" />
                      <span className="text-sm font-medium text-[#1a2744]">Integration SMS</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center p-2 rounded bg-orange-50">
                        <span className="text-xs font-semibold text-orange-600">Orange</span>
                        <p className="text-[10px] text-gray-500 mt-0.5">15 FCFA/SMS</p>
                      </div>
                      <div className="text-center p-2 rounded bg-red-50">
                        <span className="text-xs font-semibold text-red-600">Airtel</span>
                        <p className="text-[10px] text-gray-500 mt-0.5">12 FCFA/SMS</p>
                      </div>
                      <div className="text-center p-2 rounded bg-blue-50">
                        <span className="text-xs font-semibold text-blue-600">Moov</span>
                        <p className="text-[10px] text-gray-500 mt-0.5">10 FCFA/SMS</p>
                      </div>
                    </div>
                  </div>

                  {/* Low Connectivity */}
                  <div className="p-3 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <WifiOff className="size-4 text-amber-600" />
                      <span className="text-sm font-medium text-[#1a2744]">Faible connectivite</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      File d&apos;attente automatique des messages hors ligne. Envoi differe quand la connexion est retablie. Synchronisation en arriere-plan avec retry automatique.
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Wifi className="size-3 text-[#2d7a4f]" />
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-[#2d7a4f]"
                          initial={{ width: 0 }}
                          animate={{ width: '72%' }}
                          transition={{ duration: 1.2, ease: 'easeOut' }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-500">72% couverture</span>
                    </div>
                  </div>

                  {/* WhatsApp Business API */}
                  <div className="p-3 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageCircle className="size-4 text-green-600" />
                      <span className="text-sm font-medium text-[#1a2744]">WhatsApp Business API</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Integration avec l&apos;API WhatsApp Business pour les notifications prioritaires. Support des messages templates approuves, notifications de paiement et rappels academiques.
                    </p>
                    <Badge className="mt-1.5 bg-green-50 text-green-700 border-0 text-[10px]">Beta - En test</Badge>
                  </div>

                  {/* Email Fallback */}
                  <div className="p-3 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="size-4 text-blue-600" />
                      <span className="text-sm font-medium text-[#1a2744]">Systeme email de secours</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Envoi automatique par email quand le SMS echoue. Relay SMTP avec suivi de delivrabilite. Templates HTML responsives adaptes aux clients mail africains.
                    </p>
                  </div>

                  {/* Cost Optimization */}
                  <div className="p-3 rounded-lg border border-[#2d7a4f20] bg-[#2d7a4f05]">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="size-4 text-[#2d7a4f]" />
                      <span className="text-sm font-medium text-[#1a2744]">Optimisation des couts</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Envoi par lot (batch)</span>
                        <span className="text-[#2d7a4f] font-medium">-30% cout</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Routage prioritaire</span>
                        <span className="text-[#2d7a4f] font-medium">Meilleur taux</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Regroupement SMS longs</span>
                        <span className="text-[#2d7a4f] font-medium">-20% segments</span>
                      </div>
                      <Separator className="my-1" />
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-[#1a2744]">Budget mensuel SMS</span>
                        <span className="text-[#1a2744]">250,000 FCFA</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                        <motion.div
                          className="h-full rounded-full bg-[#2d7a4f]"
                          initial={{ width: 0 }}
                          animate={{ width: '68%' }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-gray-400">
                        <span>Depense: 170,000 FCFA</span>
                        <span>68%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </TooltipProvider>
  )
}


