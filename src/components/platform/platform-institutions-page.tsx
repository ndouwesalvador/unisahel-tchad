'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useTenants } from '@/lib/api-hooks'
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
  Building2,
  Plus,
  Users,
  GraduationCap,
  CheckCircle2,
  Copy,
  Loader2,
  ShieldAlert,
  Trash2,
} from 'lucide-react'

interface TenantRow {
  id: string
  name: string
  slug: string
  city: string | null
  country: string | null
  isActive: boolean
  subscriptionPlan: string
  subscriptionEnd: string | null
  createdAt: string
  totalStudents: number
  totalTeachers: number
  totalUsers: number
  admin: { name: string; email: string | null } | null
}

const planLabels: Record<string, string> = {
  STARTER: 'Starter',
  PRO: 'Pro',
  ENTERPRISE: 'Entreprise',
}

function formatDateFr(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR')
}

export function PlatformInstitutionsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useTenants() as {
    data: { data: TenantRow[]; stats: { total: number; active: number; totalStudents: number; totalTeachers: number } } | undefined
    isLoading: boolean
  }

  const [showCreate, setShowCreate] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [form, setForm] = useState({
    name: '',
    country: 'Tchad',
    city: '',
    headerLanguageMode: 'FR_ONLY',
    subscriptionPlan: 'STARTER',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
  })
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; tempPassword: string; institutionName: string } | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingTenant, setDeletingTenant] = useState<TenantRow | null>(null)
  const [deleteName, setDeleteName] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const tenants = data?.data ?? []
  const stats = data?.stats

  const resetForm = () => setForm({ name: '', country: 'Tchad', city: '', headerLanguageMode: 'FR_ONLY', subscriptionPlan: 'STARTER', adminFirstName: '', adminLastName: '', adminEmail: '' })

  const handleCreate = async () => {
    if (!form.name || !form.adminFirstName || !form.adminLastName || !form.adminEmail) {
      toast.error('Champs requis', { description: "Nom de l'institution et informations de l'administrateur obligatoires" })
      return
    }
    setIsCreating(true)
    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || "Échec de la création")
      toast.success('Institution creee', { description: json.data.tenant.name })
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      setShowCreate(false)
      setCreatedCredentials({ email: json.data.admin.email, tempPassword: json.data.tempPassword, institutionName: json.data.tenant.name })
      resetForm()
    } catch (error) {
      toast.error('Erreur', { description: error instanceof Error ? error.message : "Échec de la création" })
    } finally {
      setIsCreating(false)
    }
  }

  const handleToggleActive = async (tenant: TenantRow) => {
    setTogglingId(tenant.id)
    try {
      const res = await fetch('/api/tenants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tenant.id, isActive: !tenant.isActive }),
      })
      if (!res.ok) throw new Error("Échec de la mise à jour")
      toast.success(tenant.isActive ? 'Institution suspendue' : 'Institution reactivee')
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
    } catch (error) {
      toast.error('Erreur', { description: error instanceof Error ? error.message : "Échec de la mise à jour" })
    } finally {
      setTogglingId(null)
    }
  }

  const copyPassword = () => {
    if (!createdCredentials) return
    navigator.clipboard.writeText(createdCredentials.tempPassword).then(
      () => toast.success('Mot de passe copie'),
      () => toast.error('Copie impossible')
    )
  }

  const handleDelete = async () => {
    if (!deletingTenant) return
    setIsDeleting(true)
    try {
      const res = await fetch('/api/tenants', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deletingTenant.id, confirmationName: deleteName, currentPassword: deletePassword }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || "Échec de la suppression de l'institution")
      toast.success('Institution supprimée')
      setDeletingTenant(null)
      setDeleteName('')
      setDeletePassword('')
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
    } catch (error) {
      toast.error('Suppression refusée', { description: error instanceof Error ? error.message : "Échec de la suppression" })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--institution-primary)]">Institutions de la plateforme</h1>
          <p className="text-sm text-gray-500 mt-1">Cree et gere les etablissements abonnes a UniSahel</p>
        </div>
        <Button className="bg-[var(--institution-secondary)] hover:bg-[var(--institution-secondary-dark)] text-white" onClick={() => setShowCreate(true)}>
          <Plus className="size-4 mr-1.5" />
          Créer une institution
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--institution-primary-15)] flex items-center justify-center shrink-0">
              <Building2 className="size-5 text-[var(--institution-primary)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--institution-primary)]">{stats?.total ?? 0}</p>
              <p className="text-[11px] text-gray-500">Institutions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--institution-secondary-15)] flex items-center justify-center shrink-0">
              <CheckCircle2 className="size-5 text-[var(--institution-secondary)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--institution-secondary)]">{stats?.active ?? 0}</p>
              <p className="text-[11px] text-gray-500">Actives</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--institution-accent-15)] flex items-center justify-center shrink-0">
              <Users className="size-5 text-[var(--institution-accent)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--institution-primary)]">{stats?.totalStudents ?? 0}</p>
              <p className="text-[11px] text-gray-500">Étudiants (toutes institutions)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#5b8c5a15] flex items-center justify-center shrink-0">
              <GraduationCap className="size-5 text-[#5b8c5a]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--institution-primary)]">{stats?.totalTeachers ?? 0}</p>
              <p className="text-[11px] text-gray-500">Enseignants (toutes institutions)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-[var(--institution-primary)]">Liste des institutions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-[var(--institution-secondary)]" />
            </div>
          ) : tenants.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Aucune institution creee pour le moment.</p>
          ) : (
            <div className="max-w-full overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs">Institution</TableHead>
                    <TableHead className="text-xs">Localisation</TableHead>
                    <TableHead className="text-xs">Administrateur</TableHead>
                    <TableHead className="text-xs">Plan</TableHead>
                    <TableHead className="text-xs text-center">Étudiants</TableHead>
                    <TableHead className="text-xs text-center">Enseignants</TableHead>
                    <TableHead className="text-xs">Statut</TableHead>
                    <TableHead className="text-xs">Creee le</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm font-medium text-[var(--institution-primary)]">{t.name}</TableCell>
                      <TableCell className="text-sm text-gray-500">{[t.city, t.country].filter(Boolean).join(', ') || '—'}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {t.admin ? (
                          <div>
                            <p>{t.admin.name}</p>
                            <p className="text-[10px] text-gray-400">{t.admin.email}</p>
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge className="text-[10px] bg-[var(--institution-primary-15)] text-[var(--institution-primary)] border-0">{planLabels[t.subscriptionPlan] || t.subscriptionPlan}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-center">{t.totalStudents}</TableCell>
                      <TableCell className="text-sm text-center">{t.totalTeachers}</TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] border-0 ${t.isActive ? 'bg-[var(--institution-secondary-15)] text-[var(--institution-secondary)]' : 'bg-[#c6282815] text-[#c62828]'}`}>
                          {t.isActive ? 'Active' : 'Suspendue'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{formatDateFr(t.createdAt)}</TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-7 text-xs ${t.isActive ? 'text-red-500 hover:text-red-700' : 'text-[var(--institution-secondary)]'}`}
                          disabled={togglingId === t.id}
                          onClick={() => handleToggleActive(t)}
                        >
                          {togglingId === t.id ? <Loader2 className="size-3 animate-spin mr-1" /> : <ShieldAlert className="size-3 mr-1" />}
                          {t.isActive ? 'Suspendre' : 'Reactiver'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-red-700 hover:bg-red-50 hover:text-red-800"
                          onClick={() => { setDeletingTenant(t); setDeleteName(''); setDeletePassword('') }}
                        >
                          <Trash2 className="size-3 mr-1" />
                          Supprimer
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create institution dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer une institution</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label className="text-sm">Nom de l&apos;institution</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Université de N'Djamena" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Pays</Label>
                <Input value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Ville</Label>
                <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Langue de l’en-tête des documents</Label>
              <Select value={form.headerLanguageMode} onValueChange={(value) => setForm((current) => ({ ...current, headerLanguageMode: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="FR_ONLY">Français uniquement</SelectItem><SelectItem value="FR_AR">Français et arabe</SelectItem></SelectContent>
              </Select>
              <p className="text-xs text-gray-500">L’institution renseignera elle-même ses textes arabes.</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Plan d&apos;abonnement</Label>
              <Select value={form.subscriptionPlan} onValueChange={(v) => setForm((f) => ({ ...f, subscriptionPlan: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STARTER">Starter</SelectItem>
                  <SelectItem value="PRO">Pro</SelectItem>
                  <SelectItem value="ENTERPRISE">Entreprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="border-t pt-4 space-y-3">
              <p className="text-xs font-semibold text-[var(--institution-primary)]">Compte administrateur de l&apos;institution</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">Prénom</Label>
                  <Input value={form.adminFirstName} onChange={(e) => setForm((f) => ({ ...f, adminFirstName: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Nom</Label>
                  <Input value={form.adminLastName} onChange={(e) => setForm((f) => ({ ...f, adminLastName: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Email</Label>
                <Input type="email" value={form.adminEmail} onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))} placeholder="admin@institution.td" />
              </div>
              <p className="text-[11px] text-gray-400">Un mot de passe temporaire sera généré et affiché une seule fois après la création.</p>
            </div>
            <Button className="w-full bg-[var(--institution-secondary)] hover:bg-[var(--institution-secondary-dark)] text-white" disabled={isCreating} onClick={handleCreate}>
              {isCreating ? 'Création…' : "Créer l'institution"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deletingTenant)} onOpenChange={(open) => { if (!open && !isDeleting) setDeletingTenant(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-red-700">Supprimer définitivement l’institution</DialogTitle></DialogHeader>
          {deletingTenant && <div className="space-y-4 py-2">
            <p className="text-sm text-gray-700">Cette action est irréversible. Pour confirmer, saisissez exactement le nom de l’institution et votre mot de passe Super Admin.</p>
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-900">{deletingTenant.name}</div>
            <div className="space-y-2"><Label>Nom exact de l’institution</Label><Input value={deleteName} onChange={(e) => setDeleteName(e.target.value)} placeholder={deletingTenant.name} /></div>
            <div className="space-y-2"><Label>Mot de passe Super Admin</Label><Input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} /></div>
            <Button variant="destructive" className="w-full" disabled={isDeleting || deleteName !== deletingTenant.name || !deletePassword} onClick={handleDelete}>
              {isDeleting ? 'Suppression…' : 'Confirmer la suppression définitive'}
            </Button>
          </div>}
        </DialogContent>
      </Dialog>

      {/* One-time credentials reveal */}
      <Dialog open={Boolean(createdCredentials)} onOpenChange={(open) => { if (!open) setCreatedCredentials(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Institution creee</DialogTitle>
          </DialogHeader>
          {createdCredentials && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-gray-600">
                Le compte administrateur de <span className="font-semibold text-[var(--institution-primary)]">{createdCredentials.institutionName}</span> est pret.
                Transmettez ces identifiants a l&apos;administrateur — ce mot de passe ne sera plus jamais affiche.
              </p>
              <div className="rounded-lg border bg-gray-50 p-3 space-y-2">
                <div>
                  <p className="text-[10px] text-gray-400">Email</p>
                  <p className="text-sm font-mono text-[var(--institution-primary)]">{createdCredentials.email}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">Mot de passe temporaire</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono font-semibold text-[var(--institution-secondary)]">{createdCredentials.tempPassword}</p>
                    <Button variant="ghost" size="sm" className="h-6 px-1.5" onClick={copyPassword}>
                      <Copy className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-[var(--institution-accent)]">Un changement de mot de passe sera demandé à la première connexion.</p>
              <Button className="w-full" variant="outline" onClick={() => setCreatedCredentials(null)}>Fermer</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
