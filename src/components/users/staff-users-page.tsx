'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useStaffUsers, useStructure } from '@/lib/api-hooks'
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
import { Checkbox } from '@/components/ui/checkbox'
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
  facultyId: string | null
  departmentId: string | null
  isActive: boolean
  mustChangePassword: boolean
  lastLoginAt: string | null
  createdAt: string
  juryAssignments?: Array<{ levelId: string; programId: string; departmentId: string; program: { name: string }; level: { name: string } }>
}

type DepartmentOption = { id: string; name: string; facultyName: string; programs: Array<{
  id: string; name: string; levels: Array<{ id: string; name: string }>
}> }

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
  SCOLARITE: 'Scolarité',
  FACULTE: 'Doyen / direction de faculté',
  DEPARTEMENT: 'Chef de département',
  ENSEIGNANT: 'Enseignant',
  RESPONSABLE_FILIERE: 'Resp. filière',
  JURY: 'Jury',
  CAISSE: 'Caisse',
  MAITRE_STAGE: 'Maître de stage',
}

const emptyForm = { firstName: '', lastName: '', email: '', phone: '', role: '', facultyId: '', departmentId: '', juryLevelIds: [] as string[] }

function formatDateFr(iso: string | null) {
  if (!iso) return 'Jamais'
  return new Date(iso).toLocaleDateString('fr-FR')
}

export function StaffUsersPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useStaffUsers() as { data: { data: StaffUserRow[] } | undefined; isLoading: boolean }
  const users = data?.data ?? []
  const { data: structure } = useStructure()
  const faculties: { id: string; name: string; departments: Array<{ id: string; name: string; programs: DepartmentOption['programs'] }> }[] = structure?.faculties ?? []
  const departments: DepartmentOption[] = faculties.flatMap((faculty) => faculty.departments.map((department) => ({ ...department, facultyName: faculty.name })))

  const [showCreate, setShowCreate] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; tempPassword: string; name: string } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editing, setEditing] = useState<StaffUserRow | null>(null)
  const [editRole, setEditRole] = useState('')
  const [editFacultyId, setEditFacultyId] = useState('')
  const [editDepartmentId, setEditDepartmentId] = useState('')
  const [editJuryLevelIds, setEditJuryLevelIds] = useState<string[]>([])

  const staffCount = users.filter((u) => u.role !== 'ENSEIGNANT').length
  const activeCount = users.filter((u) => u.isActive).length
  const pendingPasswordCount = users.filter((u) => u.mustChangePassword).length

  const handleCreate = async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.role) {
      toast.error('Champs requis', { description: 'Nom, prénom, e-mail et rôle sont obligatoires' })
      return
    }
    if ((form.role === 'FACULTE' && !form.facultyId) || (['DEPARTEMENT', 'RESPONSABLE_FILIERE', 'JURY'].includes(form.role) && !form.departmentId)) {
      toast.error('Périmètre requis', { description: 'Affectez ce responsable à sa faculté ou à son département.' })
      return
    }
    if (form.role === 'JURY' && form.juryLevelIds.length === 0) {
      toast.error('Périmètre du jury requis', { description: 'Sélectionnez au moins un programme et un niveau.' })
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
      if (!res.ok) throw new Error(json.error || 'Échec de la création')
      toast.success('Compte créé', { description: `${form.firstName} ${form.lastName}` })
      queryClient.invalidateQueries({ queryKey: ['staffUsers'] })
      setShowCreate(false)
      setCreatedCredentials({ email: json.data.user.email, tempPassword: json.data.tempPassword, name: `${form.firstName} ${form.lastName}` })
      setForm(emptyForm)
    } catch (error) {
      toast.error('Erreur', { description: error instanceof Error ? error.message : 'Échec de la création' })
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdateRole = async () => {
    if (!editing) return
    setBusyId(editing.id)
    try {
      const res = await fetch('/api/users', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editing.id, role: editRole,
          facultyId: editRole === 'FACULTE' ? editFacultyId || null : null,
          departmentId: ['DEPARTEMENT', 'RESPONSABLE_FILIERE', 'JURY'].includes(editRole) ? editDepartmentId || null : null,
          juryLevelIds: editRole === 'JURY' ? editJuryLevelIds : [],
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Mise à jour impossible')
      queryClient.invalidateQueries({ queryKey: ['staffUsers'] })
      toast.success('Rôle et périmètre enregistrés')
      setEditing(null)
    } catch (error) {
      toast.error('Erreur', { description: error instanceof Error ? error.message : 'Mise à jour impossible' })
    } finally {
      setBusyId(null)
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
      if (!res.ok) throw new Error(json.error || 'Échec de la mise à jour')
      toast.success(u.isActive ? 'Compte suspendu' : 'Compte réactivé')
      queryClient.invalidateQueries({ queryKey: ['staffUsers'] })
    } catch (error) {
      toast.error('Erreur', { description: error instanceof Error ? error.message : 'Échec de la mise à jour' })
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
      if (!res.ok) throw new Error(json.error || 'Échec de la réinitialisation')
      queryClient.invalidateQueries({ queryKey: ['staffUsers'] })
      setCreatedCredentials({ email: u.email || '', tempPassword: json.data.tempPassword, name: `${u.firstName} ${u.lastName}` })
    } catch (error) {
      toast.error('Erreur', { description: error instanceof Error ? error.message : 'Échec de la réinitialisation' })
    } finally {
      setBusyId(null)
    }
  }

  const copyPassword = () => {
    if (!createdCredentials) return
    navigator.clipboard.writeText(createdCredentials.tempPassword).then(
      () => toast.success('Mot de passe copié'),
      () => toast.error('Copie impossible')
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--institution-primary)]">Gestion des utilisateurs</h1>
          <p className="text-sm text-gray-500 mt-1">Créez et gérez les comptes du personnel de votre institution</p>
        </div>
        <Button className="bg-[var(--institution-secondary)] hover:bg-[var(--institution-secondary-dark)] text-white" onClick={() => setShowCreate(true)}>
          <Plus className="size-4 mr-1.5" />
          Nouveau compte
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--institution-primary-15)] flex items-center justify-center shrink-0">
              <Users className="size-5 text-[var(--institution-primary)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--institution-primary)]">{staffCount}</p>
              <p className="text-[11px] text-gray-500">Comptes administratifs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--institution-secondary-15)] flex items-center justify-center shrink-0">
              <ShieldAlert className="size-5 text-[var(--institution-secondary)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--institution-secondary)]">{activeCount}</p>
              <p className="text-[11px] text-gray-500">Comptes actifs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--institution-accent-15)] flex items-center justify-center shrink-0">
              <KeyRound className="size-5 text-[var(--institution-accent)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--institution-primary)]">{pendingPasswordCount}</p>
              <p className="text-[11px] text-gray-500">Mot de passe temporaire non change</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-[var(--institution-primary)]">Comptes du personnel</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-[var(--institution-secondary)]" />
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
                    <TableHead className="text-xs">Périmètre</TableHead>
                    <TableHead className="text-xs">Statut</TableHead>
                    <TableHead className="text-xs">Dernière connexion</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="text-sm font-medium text-[var(--institution-primary)]">{u.firstName} {u.lastName}</TableCell>
                      <TableCell className="text-sm text-gray-500">{u.email || '—'}</TableCell>
                      <TableCell>
                        <Badge className="text-[10px] bg-[var(--institution-primary-15)] text-[var(--institution-primary)] border-0">{roleLabels[u.role] || u.role}</Badge>
                        {u.mustChangePassword && (
                          <Badge className="text-[10px] ml-1 bg-[var(--institution-accent-15)] text-[var(--institution-accent)] border-0">Temp.</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-gray-600">
                        {u.role === 'JURY' ? <div>
                          <p className="font-medium">{u.departmentId ? departments.find((department) => department.id === u.departmentId)?.name || 'Département introuvable' : 'À affecter'}</p>
                          <p className="mt-0.5 text-[11px] text-slate-500">{u.juryAssignments?.length
                            ? u.juryAssignments.map((assignment) => `${assignment.program.name} · ${assignment.level.name}`).join(', ')
                            : 'Aucun niveau affecté'}</p>
                        </div> : u.facultyId ? faculties.find((faculty) => faculty.id === u.facultyId)?.name || 'Faculté introuvable' :
                          u.departmentId ? departments.find((department) => department.id === u.departmentId)?.name || 'Département introuvable' :
                            u.role === 'FACULTE' || u.role === 'DEPARTEMENT' ? 'À affecter' : 'Institution'}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] border-0 ${u.isActive ? 'bg-[var(--institution-secondary-15)] text-[var(--institution-secondary)]' : 'bg-[#c6282815] text-[#c62828]'}`}>
                          {u.isActive ? 'Actif' : 'Suspendu'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{formatDateFr(u.lastLoginAt)}</TableCell>
                      <TableCell className="text-right">
                        {u.role === 'ENSEIGNANT' ? (
                            <span className="text-[10px] text-gray-400">Géré via Enseignants</span>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={busyId === u.id}>
                                {busyId === u.id ? <Loader2 className="size-3.5 animate-spin" /> : <MoreVertical className="size-3.5 text-gray-400" />}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem className="text-xs" onClick={() => {
                                setEditing(u); setEditRole(u.role); setEditFacultyId(u.facultyId || ''); setEditDepartmentId(u.departmentId || '');
                                setEditJuryLevelIds(u.juryAssignments?.map((assignment) => assignment.levelId) ?? [])
                              }}>
                                Modifier rôle et périmètre
                              </DropdownMenuItem>
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
                <Label className="text-sm">Prénom</Label>
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
              <Label className="text-sm">Téléphone</Label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+235 66 XX XX XX" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v, facultyId: '', departmentId: '', juryLevelIds: [] }))}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un rôle" /></SelectTrigger>
                <SelectContent>
                  {STAFF_ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.role === 'FACULTE' && <div className="space-y-2">
              <Label>Faculté dirigée *</Label>
              <Select value={form.facultyId} onValueChange={(value) => setForm((f) => ({ ...f, facultyId: value }))}>
                <SelectTrigger><SelectValue placeholder="Choisir une faculté" /></SelectTrigger>
                <SelectContent>{faculties.map((faculty) => <SelectItem key={faculty.id} value={faculty.id}>{faculty.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>}
            {['DEPARTEMENT', 'RESPONSABLE_FILIERE', 'JURY'].includes(form.role) && <div className="space-y-2">
              <Label>Département du compte *</Label>
              <Select value={form.departmentId} onValueChange={(value) => setForm((f) => ({ ...f, departmentId: value, juryLevelIds: [] }))}>
                <SelectTrigger><SelectValue placeholder="Choisir un département" /></SelectTrigger>
                <SelectContent>{departments.map((department) => <SelectItem key={department.id} value={department.id}>{department.name} · {department.facultyName}</SelectItem>)}</SelectContent>
              </Select>
            </div>}
            {form.role === 'JURY' && form.departmentId && <div className="space-y-2 rounded-lg border border-slate-200 p-3">
              <Label>Programmes et niveaux couverts *</Label>
              <p className="text-xs text-slate-600">Cochez uniquement les promotions que ce jury peut noter et délibérer. Plusieurs choix sont possibles.</p>
              <div className="max-h-48 space-y-3 overflow-y-auto pt-1">
                {departments.find((department) => department.id === form.departmentId)?.programs.map((program) => <div key={program.id}>
                  <p className="mb-1 text-xs font-semibold text-slate-900">{program.name}</p>
                  <div className="space-y-1.5">{program.levels.map((level) => <label key={level.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <Checkbox checked={form.juryLevelIds.includes(level.id)} onCheckedChange={(checked) => setForm((current) => ({ ...current,
                      juryLevelIds: checked ? [...current.juryLevelIds, level.id] : current.juryLevelIds.filter((id) => id !== level.id),
                    }))} />
                    {level.name}
                  </label>)}</div>
                </div>)}
              </div>
            </div>}
            <p className="text-[11px] text-gray-400">Un mot de passe temporaire sera généré et affiché une seule fois après la création.</p>
            <Button className="w-full bg-[var(--institution-secondary)] hover:bg-[var(--institution-secondary-dark)] text-white" disabled={isCreating} onClick={handleCreate}>
              {isCreating ? 'Création…' : 'Créer le compte'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => { if (!open) setEditing(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rôle et périmètre</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">{editing?.firstName} {editing?.lastName}</p>
          <div className="space-y-2">
            <Label>Rôle</Label>
            <Select value={editRole} onValueChange={(value) => { setEditRole(value); setEditFacultyId(''); setEditDepartmentId(''); setEditJuryLevelIds([]) }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STAFF_ROLE_OPTIONS.map((role) => <SelectItem key={role} value={role}>{roleLabels[role]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {editRole === 'FACULTE' && <div className="space-y-2"><Label>Faculté</Label><Select value={editFacultyId} onValueChange={setEditFacultyId}><SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger><SelectContent>{faculties.map((faculty) => <SelectItem key={faculty.id} value={faculty.id}>{faculty.name}</SelectItem>)}</SelectContent></Select></div>}
          {['DEPARTEMENT', 'RESPONSABLE_FILIERE', 'JURY'].includes(editRole) && <div className="space-y-2"><Label>Département</Label><Select value={editDepartmentId} onValueChange={(value) => { setEditDepartmentId(value); setEditJuryLevelIds([]) }}><SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger><SelectContent>{departments.map((department) => <SelectItem key={department.id} value={department.id}>{department.name} · {department.facultyName}</SelectItem>)}</SelectContent></Select></div>}
          {editRole === 'JURY' && editDepartmentId && <div className="space-y-2 rounded-lg border border-slate-200 p-3">
            <Label>Programmes et niveaux couverts *</Label>
            <div className="max-h-48 space-y-3 overflow-y-auto">{departments.find((department) => department.id === editDepartmentId)?.programs.map((program) => <div key={program.id}>
              <p className="mb-1 text-xs font-semibold text-slate-900">{program.name}</p>
              {program.levels.map((level) => <label key={level.id} className="flex items-center gap-2 py-0.5 text-sm text-slate-700">
                <Checkbox checked={editJuryLevelIds.includes(level.id)} onCheckedChange={(checked) => setEditJuryLevelIds((current) => checked ? [...current, level.id] : current.filter((id) => id !== level.id))} />
                {level.name}
              </label>)}
            </div>)}</div>
          </div>}
          <Button disabled={busyId === editing?.id || (editRole === 'FACULTE' && !editFacultyId) || (['DEPARTEMENT', 'RESPONSABLE_FILIERE', 'JURY'].includes(editRole) && !editDepartmentId) || (editRole === 'JURY' && editJuryLevelIds.length === 0)} onClick={handleUpdateRole}>Enregistrer</Button>
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
                Le compte de <span className="font-semibold text-[var(--institution-primary)]">{createdCredentials.name}</span> est pret.
                Transmettez ces identifiants — ce mot de passe ne sera plus jamais affiche.
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
