'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { useNotifications } from '@/lib/api-hooks'
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
  Loader2,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'mention'
type NotificationCategory = 'Academique' | 'Paiement' | 'Systeme' | 'Document' | 'Administratif'

interface Notification {
  id: string
  type: NotificationType
  category: NotificationCategory
  title: string
  description: string
  time: string
  read: boolean
  createdAt: Date
}

interface ApiNotification {
  id: string
  type: string
  category: string
  title: string
  description: string
  link: string | null
  isRead: boolean
  createdAt: string
}

// ─── Mapping helpers ────────────────────────────────────────────────────────

const KNOWN_TYPES: readonly NotificationType[] = ['info', 'success', 'warning', 'error', 'mention']
const KNOWN_CATEGORIES: readonly NotificationCategory[] = ['Academique', 'Paiement', 'Systeme', 'Document', 'Administratif']

function resolveType(type: string): NotificationType {
  return (KNOWN_TYPES as readonly string[]).includes(type) ? (type as NotificationType) : 'info'
}

function resolveCategory(category: string): NotificationCategory {
  return (KNOWN_CATEGORIES as readonly string[]).includes(category) ? (category as NotificationCategory) : 'Systeme'
}

// Computes a short, human relative-time label ("Il y a 5 min", "Hier", ...)
// from a real createdAt timestamp. No date library - just arithmetic.
function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "À l'instant"
  if (diffMin < 60) return `Il y a ${diffMin} min`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `Il y a ${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'Hier'
  if (diffDays < 7) return `Il y a ${diffDays} jours`
  return date.toLocaleDateString('fr-FR')
}

function mapNotification(n: ApiNotification): Notification {
  const createdAt = new Date(n.createdAt)
  return {
    id: n.id,
    type: resolveType(n.type),
    category: resolveCategory(n.category),
    title: n.title,
    description: n.description,
    time: formatRelativeTime(createdAt),
    read: n.isRead,
    createdAt,
  }
}

function isToday(date: Date): boolean {
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

// ─── Icon / color helpers ──────────────────────────────────────────────────────

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
    case 'Administratif':
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
    case 'Administratif':
      return <FileText className={className} />
  }
}

function NotificationItem({
  notification,
  index,
  onMarkRead,
}: {
  notification: Notification
  index: number
  onMarkRead: (id: string) => void
}) {
  const iconColor = getNotificationIconColor(notification.type)
  const catColor = getCategoryColor(notification.category)

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      onClick={() => !notification.read && onMarkRead(notification.id)}
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
  const { notificationsOpen, toggleNotifications } = useAppStore()
  const [activeTab, setActiveTab] = useState('tout')
  const queryClient = useQueryClient()
  const { data, isLoading } = useNotifications()

  const notifications: Notification[] = useMemo(
    () => ((data?.notifications || []) as ApiNotification[]).map(mapNotification),
    [data]
  )
  const unreadCount: number = data?.unreadCount ?? 0

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

  const todayCount = notifications.filter((n) => isToday(n.createdAt)).length

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notifications'] })

  const handleMarkRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read' }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Echec de la mise a jour')
      invalidate()
    } catch (e) {
      toast.error('Erreur', { description: e instanceof Error ? e.message : 'Echec de la mise a jour' })
    }
  }

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read-all' }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Echec de la mise a jour')
      toast.success('Toutes les notifications ont été marquées comme lues')
      invalidate()
    } catch (e) {
      toast.error('Erreur', { description: e instanceof Error ? e.message : 'Echec de la mise a jour' })
    }
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
                disabled={unreadCount === 0}
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

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-gray-400">
            <Loader2 className="size-6 mb-3 animate-spin" />
            <p className="text-sm">Chargement des notifications...</p>
          </div>
        ) : (
          <>
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
                                onMarkRead={handleMarkRead}
                              />
                            ))
                          ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                              <Bell className="size-10 mb-3 opacity-30" />
                              {notifications.length === 0 ? (
                                <>
                                  <p className="text-sm font-medium">Aucune notification pour le moment</p>
                                  <p className="text-xs mt-1">Vous serez averti ici des évènements importants.</p>
                                </>
                              ) : (
                                <>
                                  <p className="text-sm font-medium">Aucune notification</p>
                                  <p className="text-xs mt-1">Vous êtes à jour !</p>
                                </>
                              )}
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
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
