'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { exportToExcel } from '@/lib/export'
import { useCommunications } from '@/lib/api-hooks'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Download, Inbox, Mail, Megaphone, MessageSquare, Plus, Send, Smartphone } from 'lucide-react'

type CommunicationType = 'INFO' | 'URGENT' | 'ACADEMIC' | 'ADMINISTRATIVE'
type CommunicationPriority = 'NORMAL' | 'HIGH' | 'CRITICAL'
type CommunicationChannel = 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP'
type CommunicationStatus = 'PENDING' | 'SENT' | 'FAILED'

interface CommunicationRecord {
  id: string
  subject: string
  audience: string
  type: CommunicationType
  priority: CommunicationPriority
  channel: CommunicationChannel
  status: CommunicationStatus
  content: string | null
  sentDate: string | null
  readRate: number
  deliveredCount: number
  failedCount: number
  createdAt?: string
}

const typeLabels: Record<CommunicationType, string> = {
  INFO: 'Information',
  URGENT: 'Urgent',
  ACADEMIC: 'Académique',
  ADMINISTRATIVE: 'Administratif',
}

const priorityLabels: Record<CommunicationPriority, string> = {
  NORMAL: 'Normale',
  HIGH: 'Haute',
  CRITICAL: 'Critique',
}

const channelLabels: Record<CommunicationChannel, string> = {
  EMAIL: 'Email',
  SMS: 'SMS',
  PUSH: 'Push',
  IN_APP: 'Interne',
}

const statusConfig: Record<CommunicationStatus, { label: string; className: string }> = {
  PENDING: { label: 'En attente', className: 'bg-amber-50 text-amber-700 border-0' },
  SENT: { label: 'Envoyée', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' },
  FAILED: { label: 'Échouée', className: 'bg-red-50 text-red-700 border-0' },
}

const channelIcons: Record<CommunicationChannel, React.ElementType> = {
  EMAIL: Mail,
  SMS: Smartphone,
  PUSH: Megaphone,
  IN_APP: MessageSquare,
}

const initialForm = {
  subject: '',
  audience: 'Tous les utilisateurs',
  type: 'INFO' as CommunicationType,
  priority: 'NORMAL' as CommunicationPriority,
  channel: 'IN_APP' as CommunicationChannel,
  content: '',
}

function formatDate(value?: string | null) {
  if (!value) return 'Non envoyée'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Non envoyée'
  return date.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })
}

export function CommunicationPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useCommunications()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState(initialForm)

  const communications: CommunicationRecord[] = useMemo(
    () => data?.communications ?? [],
    [data]
  )
  const stats = data?.stats ?? { total: 0, sent: 0, pending: 0, failed: 0 }

  const sortedCommunications = useMemo(
    () => [...communications].sort((a, b) => {
      const left = new Date(a.createdAt || a.sentDate || 0).getTime()
      const right = new Date(b.createdAt || b.sentDate || 0).getTime()
      return right - left
    }),
    [communications]
  )

  const updateForm = (updates: Partial<typeof initialForm>) => {
    setForm((current) => ({ ...current, ...updates }))
  }

  const createCommunication = async () => {
    if (!form.subject.trim() || !form.audience.trim() || !form.content.trim()) {
      toast.error('Champs requis', { description: 'Objet, audience et message sont obligatoires.' })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Création impossible')

      toast.success('Diffusion enregistrée')
      queryClient.invalidateQueries({ queryKey: ['communications'] })
      setDialogOpen(false)
      setForm(initialForm)
    } catch (error) {
      toast.error('Erreur', { description: error instanceof Error ? error.message : 'Création impossible' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const exportCommunications = () => {
    if (sortedCommunications.length === 0) {
      toast.info('Aucune communication à exporter')
      return
    }
    exportToExcel(
      sortedCommunications.map((item) => ({
        Objet: item.subject,
        Audience: item.audience,
        Type: typeLabels[item.type],
        Priorité: priorityLabels[item.priority],
        Canal: channelLabels[item.channel],
        Statut: statusConfig[item.status]?.label || item.status,
        Envoyée: formatDate(item.sentDate),
        Livrées: item.deliveredCount ?? 0,
        Échecs: item.failedCount ?? 0,
      })),
      'communications'
    )
    toast.success('Export généré')
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-[#1a2744] via-[#1f3050] to-[#2d7a4f] p-6 text-white">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Messages & diffusions</h1>
              <p className="mt-1 text-sm text-white/70">Communications réelles de l’institution. Aucun fil de discussion de démonstration n’est affiché.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[#d4a853] hover:bg-[#c59745] text-white">
                    <Plus className="mr-2 size-4" />
                    Nouvelle diffusion
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Nouvelle diffusion</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-1 gap-4 py-2">
                    <div className="space-y-2">
                      <Label htmlFor="communication-subject">Objet</Label>
                      <Input id="communication-subject" value={form.subject} onChange={(event) => updateForm({ subject: event.target.value })} placeholder="Objet du message" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="communication-audience">Audience</Label>
                      <Input id="communication-audience" value={form.audience} onChange={(event) => updateForm({ audience: event.target.value })} placeholder="Ex. Tous les étudiants, L2 Informatique..." />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={form.type} onValueChange={(value) => updateForm({ type: value as CommunicationType })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INFO">Information</SelectItem>
                            <SelectItem value="URGENT">Urgent</SelectItem>
                            <SelectItem value="ACADEMIC">Académique</SelectItem>
                            <SelectItem value="ADMINISTRATIVE">Administratif</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Priorité</Label>
                        <Select value={form.priority} onValueChange={(value) => updateForm({ priority: value as CommunicationPriority })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NORMAL">Normale</SelectItem>
                            <SelectItem value="HIGH">Haute</SelectItem>
                            <SelectItem value="CRITICAL">Critique</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Canal</Label>
                        <Select value={form.channel} onValueChange={(value) => updateForm({ channel: value as CommunicationChannel })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="IN_APP">Interne</SelectItem>
                            <SelectItem value="EMAIL">Email</SelectItem>
                            <SelectItem value="SMS">SMS</SelectItem>
                            <SelectItem value="PUSH">Push</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="communication-content">Message</Label>
                      <Textarea id="communication-content" rows={5} value={form.content} onChange={(event) => updateForm({ content: event.target.value })} placeholder="Contenu de la diffusion..." />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
                      <Button className="bg-[#2d7a4f] hover:bg-[#236b40] text-white" disabled={isSubmitting} onClick={createCommunication}>
                        <Send className="mr-2 size-4" />
                        {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white" onClick={exportCommunications}>
                <Download className="mr-2 size-4" />
                Exporter
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Total</p><p className="text-2xl font-bold text-[#1a2744]">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Envoyées</p><p className="text-2xl font-bold text-[#2d7a4f]">{stats.sent}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">En attente</p><p className="text-2xl font-bold text-amber-600">{stats.pending}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Échouées</p><p className="text-2xl font-bold text-red-600">{stats.failed}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1a2744]">
            <Inbox className="size-5" />
            Historique des diffusions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-sm text-gray-400">Chargement des communications...</div>
          ) : sortedCommunications.length === 0 ? (
            <div className="py-12 text-center">
              <MessageSquare className="mx-auto mb-3 size-10 text-gray-300" />
              <p className="text-sm font-medium text-[#1a2744]">Aucune communication enregistrée</p>
              <p className="mt-1 text-xs text-gray-500">Créez une diffusion pour alimenter cet onglet avec de vraies données.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Objet</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCommunications.map((item) => {
                  const Icon = channelIcons[item.channel] || MessageSquare
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-[#1a2744]">{item.subject}</p>
                          {item.content && <p className="line-clamp-1 text-xs text-gray-500">{item.content}</p>}
                        </div>
                      </TableCell>
                      <TableCell>{item.audience}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-sm">
                          <Icon className="size-4 text-[#2d7a4f]" />
                          {channelLabels[item.channel]}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className="border-0 bg-[#1a274410] text-[#1a2744]">{typeLabels[item.type]}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig[item.status]?.className}>{statusConfig[item.status]?.label || item.status}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(item.sentDate || item.createdAt)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
