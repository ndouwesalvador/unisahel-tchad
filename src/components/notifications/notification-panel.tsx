'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Bell,
  Check,
  Settings,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  AtSign,
  FileText,
  CreditCard,
  Shield,
  BookOpen,
  Calendar,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'mention'
type NotificationCategory = 'Academique' | 'Paiement' | 'Systeme' | 'Document'

interface Notification {
  id: string
  type: NotificationType
  category: NotificationCategory
  title: string
  description: string
  time: string
  read: boolean
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

const demoNotifications: Notification[] = [
  {
    id: '1',
    type: 'success',
    category: 'Academique',
    title: 'Nouvelle inscription recue',
    description: 'Un nouvel etudiant s\'est inscrit en L1 Informatique pour l\'annee 2024-2025.',
    time: 'Il y a 5 min',
    read: false,
  },
  {
    id: '2',
    type: 'success',
    category: 'Paiement',
    title: 'Paiement de 75,000 FCFA recu',
    description: 'Amina Djibrine a effectue un paiement de 75,000 FCFA pour les frais d\'inscription.',
    time: 'Il y a 15 min',
    read: false,
  },
  {
    id: '3',
    type: 'info',
    category: 'Academique',
    title: 'Notes validees pour L2 Droit',
    description: 'Les notes du semestre 1 pour la L2 Droit ont ete validees par le jury.',
    time: 'Il y a 30 min',
    read: false,
  },
  {
    id: '4',
    type: 'mention',
    category: 'Academique',
    title: '@Scolarite a commente votre dossier',
    description: 'Le service de la scolarite a laisse un commentaire sur le dossier d\'inscription de Moussa Saleh.',
    time: 'Il y a 1h',
    read: false,
  },
  {
    id: '5',
    type: 'warning',
    category: 'Paiement',
    title: 'Paiement en retard - 3 etudiants',
    description: 'Trois etudiants de L3 Economie n\'ont pas encore regle leurs frais pour ce semestre.',
    time: 'Il y a 2h',
    read: false,
  },
  {
    id: '6',
    type: 'info',
    category: 'Systeme',
    title: 'Mise a jour systeme prevue ce weekend',
    description: 'Une maintenance planifiee aura lieu samedi de 22h a 06h. Le systeme sera indisponible.',
    time: 'Il y a 3h',
    read: true,
  },
  {
    id: '7',
    type: 'success',
    category: 'Document',
    title: 'Releve de notes signe (A. Hassane)',
    description: 'Le releve de notes d\'Abdou Hassane a ete signe numeriquement et est pret pour distribution.',
    time: 'Il y a 4h',
    read: true,
  },
  {
    id: '8',
    type: 'success',
    category: 'Paiement',
    title: 'Recu de paiement genere',
    description: 'Un recu de paiement a ete genere automatiquement pour l\'etudiant Fatim Oumar.',
    time: 'Il y a 5h',
    read: true,
  },
  {
    id: '9',
    type: 'success',
    category: 'Systeme',
    title: 'Sauvegarde automatique reussie',
    description: 'La sauvegarde quotidienne des donnees s\'est terminee avec succes. Taille: 2.4 GB.',
    time: 'Hier',
    read: true,
  },
  {
    id: '10',
    type: 'info',
    category: 'Systeme',
    title: 'Nouveau module disponible: Emploi du temps',
    description: 'Le module de gestion de l\'emploi du temps est maintenant disponible dans votre espace.',
    time: 'Hier',
    read: true,
  },
  {
    id: '11',
    type: 'warning',
    category: 'Document',
    title: 'Certificat de scolarite expire (2 docs)',
    description: 'Deux certificats de scolarite sont arrives a expiration et doivent etre renouveles.',
    time: 'Hier',
    read: true,
  },
  {
    id: '12',
    type: 'info',
    category: 'Academique',
    title: 'Jury planifie pour le 15/03',
    description: 'Une session de jury est planifiee le 15 mars 2025 pour la validation des notes de L1.',
    time: 'Il y a 2 jours',
    read: true,
  },
  {
    id: '13',
    type: 'success',
    category: 'Document',
    title: 'Document verifie par QR code',
    description: 'Le diplome de Ousmane Diop a ete verifie avec succes via le systeme QR code.',
    time: 'Il y a 2 jours',
    read: true,
  },
  {
    id: '14',
    type: 'mention',
    category: 'Academique',
    title: '@Admin vous a mentionne dans la deliberation',
    description: 'L\'administrateur vous a mentionne dans la deliberation de la filiere Informatique.',
    time: 'Il y a 3 jours',
    read: true,
  },
  {
    id: '15',
    type: 'error',
    category: 'Systeme',
    title: 'Erreur d\'import detectee',
    description: 'L\'import du fichier etudiants.csv a echoue. 12 lignes contiennent des erreurs de format.',
    time: 'Il y a 3 jours',
    read: true,
  },
  {
    id: '16',
    type: 'warning',
    category: 'Academique',
    title: 'Capacite max atteinte - L1 Droit',
    description: 'La filiere L1 Droit a atteint sa capacite maximale de 150 etudiants.',
    time: 'Il y a 4 jours',
    read: true,
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'info':
      return Info
    case 'success':
      return CheckCircle
    case 'warning':
      return AlertTriangle
    case 'error':
      return XCircle
    case 'mention':
      return AtSign
  }
}

function getNotificationIconColor(type: NotificationType) {
  switch (type) {
    case 'info':
      return 'text-[#1a2744] bg-[#1a2744]/10'
    case 'success':
      return 'text-[#2d7a4f] bg-[#2d7a4f]/10'
    case 'warning':
      return 'text-[#d4a853] bg-[#d4a853]/10'
    case 'error':
      return 'text-red-500 bg-red-500/10'
    case 'mention':
      return 'text-[#1a2744] bg-[#1a2744]/10'
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getCategoryIcon(category: NotificationCategory) {
  switch (category) {
    case 'Academique':
      return BookOpen
    case 'Paiement':
      return CreditCard
    case 'Systeme':
      return Shield
    case 'Document':
      return FileText
  }
}

function getCategoryColor(category: NotificationCategory) {
  switch (category) {
    case 'Academique':
      return 'bg-[#2d7a4f]/10 text-[#2d7a4f] border-[#2d7a4f]/20'
    case 'Paiement':
      return 'bg-[#d4a853]/10 text-[#d4a853] border-[#d4a853]/20'
    case 'Systeme':
      return 'bg-[#1a2744]/10 text-[#1a2744] border-[#1a2744]/20'
    case 'Document':
      return 'bg-[#6b7280]/10 text-[#6b7280] border-[#6b7280]/20'
  }
}

// ─── Notification Item Component ──────────────────────────────────────────────

function NotificationTypeIcon({ type, className }: { type: NotificationType; className?: string }) {
  switch (type) {
    case 'info':
      return <Info className={className} />
    case 'success':
      return <CheckCircle className={className} />
    case 'warning':
      return <AlertTriangle className={className} />
    case 'error':
      return <XCircle className={className} />
    case 'mention':
      return <AtSign className={className} />
  }
}

function CategoryTypeIcon({ category, className }: { category: NotificationCategory; className?: string }) {
  switch (category) {
    case 'Academique':
      return <BookOpen className={className} />
    case 'Paiement':
      return <CreditCard className={className} />
    case 'Systeme':
      return <Shield className={className} />
    case 'Document':
      return <FileText className={className} />
  }
}

function NotificationItem({ notification, index }: { notification: Notification; index: number }) {
  const iconColor = getNotificationIconColor(notification.type)
  const catColor = getCategoryColor(notification.category)

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className={`relative flex gap-3 p-3 rounded-lg transition-colors hover:bg-gray-50 cursor-pointer ${
        !notification.read ? 'bg-[#2d7a4f]/[0.03]' : ''
      }`}
    >
      {/* Unread indicator */}
      {!notification.read && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#2d7a4f]" />
      )}

      {/* Icon */}
      <div className={`shrink-0 p-2 rounded-lg ${iconColor}`}>
        <NotificationTypeIcon type={notification.type} className="size-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm leading-snug ${!notification.read ? 'font-semibold text-[#1a2744]' : 'font-medium text-gray-700'}`}>
            {notification.title}
          </p>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
          {notification.description}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 h-5 font-medium ${catColor}`}
          >
            <CategoryTypeIcon category={notification.category} className="size-2.5 mr-0.5" />
            {notification.category}
          </Badge>
          <span className="text-[10px] text-gray-400">{notification.time}</span>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function NotificationPanel() {
  const { notificationsOpen, toggleNotifications, unreadCount } = useAppStore()
  const [activeTab, setActiveTab] = useState('tout')
  const [notifications, setNotifications] = useState<Notification[]>(demoNotifications)

  const unreadNotifications = notifications.filter((n) => !n.read)
  const mentionNotifications = notifications.filter((n) => n.type === 'mention')
  const systemNotifications = notifications.filter((n) => n.category === 'Systeme')

  const filteredNotifications = (() => {
    switch (activeTab) {
      case 'non-lues':
        return unreadNotifications
      case 'mentions':
        return mentionNotifications
      case 'systeme':
        return systemNotifications
      default:
        return notifications
    }
  })()

  const todayCount = notifications.filter((n) =>
    n.time.includes('min') || n.time.includes('h') && !n.time.includes('jours')
  ).length

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  return (
    <Sheet open={notificationsOpen} onOpenChange={toggleNotifications}>
      <SheetContent side="right" className="w-full sm:max-w-[420px] p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-4 pb-0 space-y-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-lg font-bold text-[#1a2744]">
                Notifications
              </SheetTitle>
              {unreadCount > 0 && (
                <Badge className="bg-[#2d7a4f] text-white text-[10px] px-1.5 h-5 font-semibold hover:bg-[#2d7a4f]">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-[#2d7a4f] hover:text-[#236b40] h-7 px-2"
                onClick={handleMarkAllRead}
              >
                <Check className="size-3.5 mr-1" />
                Tout marquer comme lu
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
              >
                <Settings className="size-4" />
              </Button>
            </div>
          </div>
          <SheetDescription className="sr-only">
            Panneau de notifications UniSahel
          </SheetDescription>
        </SheetHeader>

        {/* Filter Tabs */}
        <div className="px-4 pt-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full h-8 p-0.5 bg-gray-100">
              <TabsTrigger value="tout" className="text-[11px] h-7 px-2 flex-1">
                Tout
                <Badge variant="secondary" className="ml-1 text-[9px] px-1 h-4 bg-gray-200 text-gray-600 font-medium">
                  {notifications.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="non-lues" className="text-[11px] h-7 px-2 flex-1">
                Non lues
                <Badge variant="secondary" className="ml-1 text-[9px] px-1 h-4 bg-[#2d7a4f]/10 text-[#2d7a4f] font-medium">
                  {unreadNotifications.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="mentions" className="text-[11px] h-7 px-2 flex-1">
                Mentions
                <Badge variant="secondary" className="ml-1 text-[9px] px-1 h-4 bg-gray-200 text-gray-600 font-medium">
                  {mentionNotifications.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="systeme" className="text-[11px] h-7 px-2 flex-1">
                Systeme
                <Badge variant="secondary" className="ml-1 text-[9px] px-1 h-4 bg-gray-200 text-gray-600 font-medium">
                  {systemNotifications.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* Notification Lists */}
            {['tout', 'non-lues', 'mentions', 'systeme'].map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-0">
                <ScrollArea className="h-[calc(100vh-260px)]">
                  <div className="py-2 space-y-0.5">
                    <AnimatePresence mode="popLayout">
                      {filteredNotifications.length > 0 ? (
                        filteredNotifications.map((notification, index) => (
                          <NotificationItem
                            key={notification.id}
                            notification={notification}
                            index={index}
                          />
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                          <Bell className="size-10 mb-3 opacity-30" />
                          <p className="text-sm font-medium">Aucune notification</p>
                          <p className="text-xs mt-1">Vous etes a jour !</p>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Footer */}
        <div className="mt-auto border-t border-gray-100">
          <div className="p-4 space-y-3">
            <Button
              variant="outline"
              className="w-full text-[#2d7a4f] border-[#2d7a4f]/30 hover:bg-[#2d7a4f]/5 hover:border-[#2d7a4f]/50 text-sm font-medium"
            >
              <Bell className="size-4 mr-2" />
              Voir toutes les notifications
            </Button>
            <div className="flex items-center justify-center gap-4 text-[11px] text-gray-400">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#2d7a4f]" />
                <span>{unreadNotifications.length} non lues</span>
              </div>
              <Separator orientation="vertical" className="h-3" />
              <div className="flex items-center gap-1">
                <Calendar className="size-3" />
                <span>{todayCount} aujourd&apos;hui</span>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
