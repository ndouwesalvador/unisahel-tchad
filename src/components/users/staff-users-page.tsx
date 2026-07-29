'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useStaffUsers } from '@/lib/api-hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Users,
  Plus,
  Copy,
  Loader2,
  MoreVertical,
  ShieldAlert,
  KeyRound,
} from 'lucide-react'

interface StaffUserRow {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  role: string
  isActive: boolean
  mustChangePassword: boolean
  lastLoginAt: string | null
  createdAt: string
}

const STAFF_ROLE_OPTIONS = [
  'ADMIN_INSTITUTION',
  'RECTORAT',
  'SCOLARITE',
  'FACULTE',
  'DEPARTEMENT',
  'RESPONSABLE_FILIERE',
  'JURY',
  'CAISSE',
  'MAITRE_STAGE',
] as const

const roleLabels: Record<string, string> = {
  ADMIN_INSTITUTION: 'Admin Institution',
  RECTORAT: 'Rectorat',
  SCOLARITE: 'Scolarite',
  FACULTE: 'Faculte',
  DEPARTEMENT: 'Departement',
  ENSEIGNANT: 'Enseignant',
  RESPONSABLE_FILIERE: 'Resp. Filiere',
  JURY: 'Jury',
  CAISSE: 'Caisse',
  MAITRE_STAGE: 'Maitre de Stage',
}

const emptyForm = { firstName: '', lastName: '', email: '', phone: '', role: '' }

function formatDateFr(iso: string | null) {
  if (!iso) return 'Jamais'
  return new Date(iso).toLocaleDateString('fr-FR')
}

export function StaffUsersPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useStaffUsers() as { data: { data: StaffUserRow[] } | undefined; isLoading: boolean }
  const users = data?.data ?? []

  const [showCreate, setShowCreate] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; tempPassword: string; name: string } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const staffCount = users.filter((u) => u.role !== 'ENSEIGNANT').length
  const activeCount = users.filter((u) => u.isActive).length
  const pendingPasswordCount = users.filter((u) => u.mustChangePassword).length

  const handleCreate = async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.role) {
      toast.error('Champs requis', { description: 'Nom, prenom, email et role sont obligatoires' })
      return
    }
    setIsCreating(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Echec de la creation')
      toast.success('Compte cree', { description: `${form.firstName} ${form.lastName}` })
      queryClient.invalidateQueries({ queryKey: ['staffUsers'] })
      setShowCreate(false)
      setCreatedCredentials({ email: json.data.user.email, tempPassword: json.data.tempPassword, name: `${form.firstName} ${form.lastName}` })
      setForm(emptyForm)
    } catch (error) {
      toast.error('Erreur', { description: error instanceof Error ? error.message : 'Echec de la creation' })
    } finally {
      setIsCreating(false)
    }
  }

  const handleToggleActive = async (u: StaffUserRow) => {
    setBusyId(u.id)
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: u.id, isActive: !u.isActive }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Echec de la mise a jour')
      toast.success(u.isActive ? 'Compte suspendu' : 'Compte reactive')
      queryClient.invalidateQueries({ queryKey: ['staffUsers'] })
    } catch (error) {
      toast.error('Erreur', { description: error instanceof Error ? error.message : 'Echec de la mise a jour' })
    } finally {
      setBusyId(null)
    }
  }

  const handleResetPassword = async (u: StaffUserRow) => {
    setBusyId(u.id)
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: u.id, resetPassword: true }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Echec de la reinitialisation')
      queryClient.invalidateQueries({ queryKey: ['staffUsers'] })
      setCreatedCredentials({ email: u.email || '', tempPassword: json.data.tempPassword, name: `${u.firstName} ${u.lastName}` })
    } catch (error) {
      toast.error('Erreur', { description: error instanceof Error ? error.message : 'Echec de la reinitialisation' })
    } finally {
      setBusyId(null)
    }
  }

  const copyPassword = () => {
    if (!createdCredentials) return
    navigator.clipboard.writeText(createdCredentials.tempPassword).then(
      () => toast.success('Mot de passe copie'),
      () => toast.error('Copie impossible')
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2744]">Gestion des utilisateurs</h1>
          <p className="text-sm text-gray-500 mt-1">Cree et gere les comptes du personnel de votre institution</p>
        </div>
        <Button className="bg-[#2d7a4f] hover:bg-[#236b40] text-white" onClick={() => setShowCreate(true)}>
          <Plus className="size-4 mr-1.5" />
          Nouveau compte
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#1a274415] flex items-center justify-center shrink-0">
              <Users className="size-5 text-[#1a2744]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1a2744]">{staffCount}</p>
              <p className="text-[11px] text-gray-500">Comptes administratifs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#2d7a4f15] flex items-center justify-center shrink-0">
              <ShieldAlert className="size-5 text-[#2d7a4f]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#2d7a4f]">{activeCount}</p>
              <p className="text-[11px] text-gray-500">Comptes actifs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#d4a85315] flex items-center justify-center shrink-0">
              <KeyRound className="size-5 text-[#d4a853]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1a2744]">{pendingPasswordCount}</p>
              <p className="text-[11px] text-gray-500">Mot de passe temporaire non change</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-[#1a2744]">Comptes du personnel</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-[#2d7a4f]" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Aucun compte cree pour le moment.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs">Nom</TableHead>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs">Role</TableHead>
                    <TableHead className="text-xs">Statut</TableHead>
                    <TableHead className="text-xs">Derniere connexion</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="text-sm font-medium text-[#1a2744]">{u.firstName} {u.lastName}</TableCell>
                      <TableCell className="text-sm text-gray-500">{u.email || '—'}</TableCell>
                      <TableCell>
                        <Badge className="text-[10px] bg-[#1a274415] text-[#1a2744] border-0">{roleLabels[u.role] || u.role}</Badge>
                        {u.mustChangePassword && (
                          <Badge className="text-[10px] ml-1 bg-[#d4a85315] text-[#d4a853] border-0">Temp.</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] border-0 ${u.isActive ? 'bg-[#2d7a4f15] text-[#2d7a4f]' : 'bg-[#c6282815] text-[#c62828]'}`}>
                          {u.isActive ? 'Actif' : 'Suspendu'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{formatDateFr(u.lastLoginAt)}</TableCell>
                      <TableCell className="text-right">
                        {u.role === 'ENSEIGNANT' ? (
                          <span className="text-[10px] text-gray-400">Gere via Enseignants</span>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={busyId === u.id}>
                                {busyId === u.id ? <Loader2 className="size-3.5 animate-spin" /> : <MoreVertical className="size-3.5 text-gray-400" />}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem className="text-xs" onClick={() => handleToggleActive(u)}>
                                <ShieldAlert className="size-3.5 mr-2" />
                                {u.isActive ? 'Suspendre' : 'Reactiver'}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs" onClick={() => handleResetPassword(u)}>
                                <KeyRound className="size-3.5 mr-2" />
                                Reinitialiser le mot de passe
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create staff account dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { setShowCreate(open); if (!open) setForm(emptyForm) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau compte utilisateur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Prenom</Label>
                <Input value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Nom</Label>
                <Input value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="nom@institution.td" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Telephone</Label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+235 66 XX XX XX" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue placeholder="Selectionner un role" /></SelectTrigger>
                <SelectContent>
                  {STAFF_ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-[11px] text-gray-400">Un mot de passe temporaire sera genere et affiche une seule fois apres la creation.</p>
            <Button className="w-full bg-[#2d7a4f] hover:bg-[#236b40] text-white" disabled={isCreating} onClick={handleCreate}>
              {isCreating ? 'Creation...' : 'Creer le compte'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* One-time credentials reveal */}
      <Dialog open={Boolean(createdCredentials)} onOpenChange={(open) => { if (!open) setCreatedCredentials(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Identifiants du compte</DialogTitle>
          </DialogHeader>
          {createdCredentials && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-gray-600">
                Le compte de <span className="font-semibold text-[#1a2744]">{createdCredentials.name}</span> est pret.
                Transmettez ces identifiants — ce mot de passe ne sera plus jamais affiche.
              </p>
              <div className="rounded-lg border bg-gray-50 p-3 space-y-2">
                <div>
                  <p className="text-[10px] text-gray-400">Email</p>
                  <p className="text-sm font-mono text-[#1a2744]">{createdCredentials.email}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">Mot de passe temporaire</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono font-semibold text-[#2d7a4f]">{createdCredentials.tempPassword}</p>
                    <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={copyPassword}>
                      <Copy className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-[#d4a853]">Un changement de mot de passe sera demande a la premiere connexion.</p>
              <Button className="w-full" variant="outline" onClick={() => setCreatedCredentials(null)}>Fermer</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
