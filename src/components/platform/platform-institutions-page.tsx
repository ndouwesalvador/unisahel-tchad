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
    subscriptionPlan: 'STARTER',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
  })
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; tempPassword: string; institutionName: string } | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const tenants = data?.data ?? []
  const stats = data?.stats

  const resetForm = () => setForm({ name: '', country: 'Tchad', city: '', subscriptionPlan: 'STARTER', adminFirstName: '', adminLastName: '', adminEmail: '' })

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
      if (!res.ok) throw new Error(json.error || "Echec de la creation")
      toast.success('Institution creee', { description: json.data.tenant.name })
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      setShowCreate(false)
      setCreatedCredentials({ email: json.data.admin.email, tempPassword: json.data.tempPassword, institutionName: json.data.tenant.name })
      resetForm()
    } catch (error) {
      toast.error('Erreur', { description: error instanceof Error ? error.message : "Echec de la creation" })
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
      if (!res.ok) throw new Error("Echec de la mise a jour")
      toast.success(tenant.isActive ? 'Institution suspendue' : 'Institution reactivee')
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
    } catch (error) {
      toast.error('Erreur', { description: error instanceof Error ? error.message : "Echec de la mise a jour" })
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2744]">Institutions de la plateforme</h1>
          <p className="text-sm text-gray-500 mt-1">Cree et gere les etablissements abonnes a UniSahel</p>
        </div>
        <Button className="bg-[#2d7a4f] hover:bg-[#236b40] text-white" onClick={() => setShowCreate(true)}>
          <Plus className="size-4 mr-1.5" />
          Creer une institution
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#1a274415] flex items-center justify-center shrink-0">
              <Building2 className="size-5 text-[#1a2744]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1a2744]">{stats?.total ?? 0}</p>
              <p className="text-[11px] text-gray-500">Institutions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#2d7a4f15] flex items-center justify-center shrink-0">
              <CheckCircle2 className="size-5 text-[#2d7a4f]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#2d7a4f]">{stats?.active ?? 0}</p>
              <p className="text-[11px] text-gray-500">Actives</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#d4a85315] flex items-center justify-center shrink-0">
              <Users className="size-5 text-[#d4a853]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1a2744]">{stats?.totalStudents ?? 0}</p>
              <p className="text-[11px] text-gray-500">Etudiants (toutes institutions)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#5b8c5a15] flex items-center justify-center shrink-0">
              <GraduationCap className="size-5 text-[#5b8c5a]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1a2744]">{stats?.totalTeachers ?? 0}</p>
              <p className="text-[11px] text-gray-500">Enseignants (toutes institutions)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-[#1a2744]">Liste des institutions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-[#2d7a4f]" />
            </div>
          ) : tenants.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">Aucune institution creee pour le moment.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs">Institution</TableHead>
                    <TableHead className="text-xs">Localisation</TableHead>
                    <TableHead className="text-xs">Administrateur</TableHead>
                    <TableHead className="text-xs">Plan</TableHead>
                    <TableHead className="text-xs text-center">Etudiants</TableHead>
                    <TableHead className="text-xs text-center">Enseignants</TableHead>
                    <TableHead className="text-xs">Statut</TableHead>
                    <TableHead className="text-xs">Creee le</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm font-medium text-[#1a2744]">{t.name}</TableCell>
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
                        <Badge className="text-[10px] bg-[#1a274415] text-[#1a2744] border-0">{planLabels[t.subscriptionPlan] || t.subscriptionPlan}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-center">{t.totalStudents}</TableCell>
                      <TableCell className="text-sm text-center">{t.totalTeachers}</TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] border-0 ${t.isActive ? 'bg-[#2d7a4f15] text-[#2d7a4f]' : 'bg-[#c6282815] text-[#c62828]'}`}>
                          {t.isActive ? 'Active' : 'Suspendue'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{formatDateFr(t.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-7 text-xs ${t.isActive ? 'text-red-500 hover:text-red-700' : 'text-[#2d7a4f]'}`}
                          disabled={togglingId === t.id}
                          onClick={() => handleToggleActive(t)}
                        >
                          {togglingId === t.id ? <Loader2 className="size-3 animate-spin mr-1" /> : <ShieldAlert className="size-3 mr-1" />}
                          {t.isActive ? 'Suspendre' : 'Reactiver'}
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
            <DialogTitle>Creer une institution</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label className="text-sm">Nom de l&apos;institution</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Universite de N'Djamena" />
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
              <p className="text-xs font-semibold text-[#1a2744]">Compte administrateur de l&apos;institution</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">Prenom</Label>
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
              <p className="text-[11px] text-gray-400">Un mot de passe temporaire sera genere et affiche une seule fois apres la creation.</p>
            </div>
            <Button className="w-full bg-[#2d7a4f] hover:bg-[#236b40] text-white" disabled={isCreating} onClick={handleCreate}>
              {isCreating ? 'Creation...' : "Creer l'institution"}
            </Button>
          </div>
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
                Le compte administrateur de <span className="font-semibold text-[#1a2744]">{createdCredentials.institutionName}</span> est pret.
                Transmettez ces identifiants a l&apos;administrateur — ce mot de passe ne sera plus jamais affiche.
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
