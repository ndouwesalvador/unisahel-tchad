'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import { useProfileActivity } from '@/lib/api-hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  User,
  Shield,
  Activity,
  Lock,
  Smartphone,
  Save,
  X,
  Clock,
  Monitor,
  Edit3,
  Trash2,
  LogIn,
  Pencil,
} from 'lucide-react'

type ActivityType = 'login' | 'edit' | 'create' | 'delete'

const activityConfig: Record<ActivityType, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  login: { icon: LogIn, color: 'text-[var(--institution-secondary)]', bg: 'bg-[var(--institution-secondary-10)]', label: 'Connexion' },
  edit: { icon: Pencil, color: 'text-[var(--institution-accent)]', bg: 'bg-[var(--institution-accent-10)]', label: 'Modification' },
  create: { icon: Edit3, color: 'text-[var(--institution-secondary)]', bg: 'bg-[var(--institution-secondary-10)]', label: 'Création' },
  delete: { icon: Trash2, color: 'text-red-500', bg: 'bg-red-50', label: 'Suppression' },
}

function formatDateTimeFr(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatDateFr(iso: string | null | undefined) {
  if (!iso) return 'Non renseignée'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ─── Role Labels ──────────────────────────────────────────────────────────────

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN_INSTITUTION: 'Admin Institution',
  RECTORAT: 'Rectorat',
  SCOLARITE: 'Scolarité',
  FACULTE: 'Faculté',
  DEPARTEMENT: 'Département',
  ENSEIGNANT: 'Enseignant',
  RESPONSABLE_FILIERE: 'Resp. Filière',
  JURY: 'Jury',
  CAISSE: 'Caisse',
  ETUDIANT: 'Étudiant',
  ETUDIANT_SANTE: 'Étudiant en santé',
  MAITRE_STAGE: 'Maître de stage',
  PARENT: 'Parent',
}

// ─── Profile Page ─────────────────────────────────────────────────────────────

export function ProfilePage() {
  const { user } = useAppStore()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('profil')
  const [isEditing, setIsEditing] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const { data: profileQuery } = useProfileActivity() as {
    data: {
      loginHistory: { id: string; date: string; ip: string; device: string }[]
      currentSession: { id: string; date: string; ip: string; device: string } | null
      activity: { id: string; type: ActivityType; description: string; timestamp: string }[]
      profile: {
        firstName: string; lastName: string; email: string; phone: string; hasPassword: boolean
        isActive: boolean; createdAt: string | null; updatedAt: string | null; lastLoginAt: string | null
        departmentName: string | null; facultyName: string | null; programName: string | null; levelName: string | null
        employeeId: string | null; grade: string | null; specialization: string | null
      }
      stats: { connectionsThisMonth: number; actionsThisMonth: number }
    } | undefined
  }

  // Form state
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: '',
  })

  useEffect(() => {
    if (profileQuery?.profile) {
      setFormData({
        firstName: profileQuery.profile.firstName,
        lastName: profileQuery.profile.lastName,
        email: profileQuery.profile.email,
        phone: profileQuery.profile.phone,
      })
    }
  }, [profileQuery])

  // Password state
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  })

  if (!user) return null

  const profile = profileQuery?.profile
  const displayFirstName = profile?.firstName ?? user.firstName
  const displayLastName = profile?.lastName ?? user.lastName
  const displayEmail = profile?.email ?? user.email ?? ''
  const initials = `${displayFirstName[0] ?? ''}${displayLastName[0] ?? ''}`
  const fullName = `${displayFirstName} ${displayLastName}`
  const scopeLabel = profile?.programName ? 'Programme' : profile?.departmentName ? 'Département' : profile?.facultyName ? 'Faculté' : null
  const scopeValue = profile?.programName
    ? `${profile.programName}${profile.levelName ? ` · ${profile.levelName}` : ''}`
    : profile?.departmentName ?? profile?.facultyName ?? null

  const handleSaveProfile = async () => {
    setIsSavingProfile(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: formData.firstName, lastName: formData.lastName, phone: formData.phone }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Échec de la mise à jour')
      }
      toast.success('Profil mis à jour')
      queryClient.invalidateQueries({ queryKey: ['profileActivity'] })
      setIsEditing(false)
    } catch (error) {
      toast.error('Erreur', { description: error instanceof Error ? error.message : 'Échec de la mise à jour' })
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleCancelEdit = () => {
    setFormData({
      firstName: displayFirstName,
      lastName: displayLastName,
      email: displayEmail,
      phone: profileQuery?.profile?.phone || '',
    })
    setIsEditing(false)
  }

  const handleChangePassword = async () => {
    if (!passwordData.current || !passwordData.new) {
      toast.error('Champs requis', { description: 'Mot de passe actuel et nouveau mot de passe requis' })
      return
    }
    if (passwordData.new !== passwordData.confirm) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    setIsChangingPassword(true)
    try {
      const res = await fetch('/api/profile?action=password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: passwordData.current, newPassword: passwordData.new }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Échec du changement de mot de passe')
      }
      toast.success('Mot de passe mis à jour')
      setPasswordData({ current: '', new: '', confirm: '' })
    } catch (error) {
      toast.error('Erreur', { description: error instanceof Error ? error.message : 'Échec du changement de mot de passe' })
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Profile Header Banner */}
      <div className="relative overflow-hidden rounded-xl">
        <div className="bg-gradient-to-r from-[var(--institution-primary)] to-[var(--institution-secondary)] h-40 sm:h-48 relative">
          {/* Decorative circles */}
          <div className="absolute top-[-30px] right-[-30px] w-40 h-40 rounded-full bg-white/5" />
          <div className="absolute top-10 right-20 w-24 h-24 rounded-full bg-white/5" />
          <div className="absolute bottom-[-20px] left-[30%] w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute top-5 left-10 w-16 h-16 rounded-full bg-[var(--institution-accent)]/10" />
          <div className="absolute bottom-5 right-[40%] w-12 h-12 rounded-full bg-white/5" />
        </div>
        <div className="bg-white border border-gray-200 border-t-0 rounded-b-xl px-4 sm:px-6 pb-5 pt-14 sm:pt-16 relative">
          {/* Avatar overlapping banner */}
          <div className="absolute -top-12 sm:-top-14 left-4 sm:left-6">
            <Avatar className="size-20 sm:size-24 border-4 border-white shadow-lg">
              <AvatarFallback className="bg-[var(--institution-secondary)] text-white text-xl sm:text-2xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* User info */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mt-1">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--institution-primary)]">{fullName}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge className="bg-[var(--institution-secondary)] text-white border-0 text-xs font-medium">
                  {roleLabels[user.role] || user.role}
                </Badge>
                <span className="text-sm text-gray-500">{displayEmail || 'Non renseigné'}</span>
              </div>
              <p className="text-sm text-gray-400 mt-0.5">{user.tenantName || 'Établissement non renseigné'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content + Side Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Tabs */}
        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full sm:w-auto flex-wrap">
              <TabsTrigger value="profil" className="gap-1.5">
                <User className="size-4" />
                <span className="hidden sm:inline">Profil</span>
              </TabsTrigger>
              <TabsTrigger value="securite" className="gap-1.5">
                <Shield className="size-4" />
                <span className="hidden sm:inline">Sécurité</span>
              </TabsTrigger>
              <TabsTrigger value="activite" className="gap-1.5">
                <Activity className="size-4" />
                <span className="hidden sm:inline">Activité</span>
              </TabsTrigger>
            </TabsList>

            {/* ─── Profil Tab ──────────────────────────────────────── */}
            <TabsContent value="profil" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Info */}
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold text-[var(--institution-primary)] flex items-center gap-2">
                        <User className="size-4 text-[var(--institution-secondary)]" />
                        Informations personnelles
                      </CardTitle>
                      {!isEditing && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[var(--institution-secondary)] hover:text-[var(--institution-secondary-dark)] h-8"
                          onClick={() => setIsEditing(true)}
                        >
                          <Pencil className="size-3.5 mr-1" />
                          Modifier
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-gray-500">Nom</Label>
                        {isEditing ? (
                          <Input
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            className="h-9"
                          />
                        ) : (
                          <p className="text-sm font-medium text-[var(--institution-primary)]">{displayLastName}</p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-gray-500">Prénom</Label>
                        {isEditing ? (
                          <Input
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            className="h-9"
                          />
                        ) : (
                          <p className="text-sm font-medium text-[var(--institution-primary)]">{displayFirstName}</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">Email</Label>
                      <p className="text-sm font-medium text-[var(--institution-primary)]">{displayEmail || 'Non renseigné'}</p>
                      {isEditing && <p className="text-xs text-gray-500">L&apos;adresse de connexion est gérée par l&apos;administration.</p>}
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs text-gray-500">Téléphone</Label>
                      {isEditing ? (
                        <Input
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="h-9"
                        />
                      ) : (
                        <p className="text-sm font-medium text-[var(--institution-primary)]">{formData.phone || 'Non renseigné'}</p>
                      )}
                    </div>
                    {isEditing && (
                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          size="sm"
                          className="bg-[var(--institution-secondary)] hover:bg-[var(--institution-secondary-dark)] text-white"
                          disabled={isSavingProfile}
                          onClick={handleSaveProfile}
                        >
                          <Save className="size-4 mr-1" />
                          {isSavingProfile ? 'Enregistrement…' : 'Enregistrer'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelEdit}
                        >
                          <X className="size-4 mr-1" />
                          Annuler
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Professional Info */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold text-[var(--institution-primary)] flex items-center gap-2">
                      <Shield className="size-4 text-[var(--institution-accent)]" />
                      Informations professionnelles
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">Rôle</Label>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-[var(--institution-secondary)] text-white border-0 text-xs">
                          {roleLabels[user.role] || user.role}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">Institution</Label>
                      <p className="text-sm font-medium text-[var(--institution-primary)]">{user.tenantName || 'Non renseignée'}</p>
                    </div>
                    {scopeLabel && scopeValue && <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">{scopeLabel}</Label>
                      <p className="text-sm font-medium text-[var(--institution-primary)]">{scopeValue}</p>
                    </div>}
                    {profile?.employeeId && <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">Matricule professionnel</Label>
                      <p className="text-sm font-medium text-[var(--institution-primary)]">{profile.employeeId}</p>
                    </div>}
                    {(profile?.grade || profile?.specialization) && <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">Grade et spécialité</Label>
                      <p className="text-sm font-medium text-[var(--institution-primary)]">{[profile.grade, profile.specialization].filter(Boolean).join(' · ')}</p>
                    </div>}
                    <Separator />
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">Date de création du compte</Label>
                      <p className="text-sm text-[var(--institution-primary)]">{formatDateFr(profile?.createdAt)}</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">Dernière mise à jour</Label>
                      <p className="text-sm text-[var(--institution-primary)]">{formatDateFr(profile?.updatedAt)}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ─── Securite Tab ────────────────────────────────────── */}
            <TabsContent value="securite" className="mt-4 space-y-6">
              {/* Change Password */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold text-[var(--institution-primary)] flex items-center gap-2">
                    <Lock className="size-4 text-[var(--institution-secondary)]" />
                    Changer le mot de passe
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-500">Mot de passe actuel</Label>
                    <Input
                      type="password"
                      placeholder="Saisissez votre mot de passe actuel"
                      value={passwordData.current}
                      onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                      className="h-9 max-w-md"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">Nouveau mot de passe</Label>
                      <Input
                        type="password"
                        placeholder="Nouveau mot de passe"
                        value={passwordData.new}
                        onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">Confirmer le mot de passe</Label>
                      <Input
                        type="password"
                        placeholder="Confirmez le mot de passe"
                        value={passwordData.confirm}
                        onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                        className="h-9"
                      />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-[var(--institution-secondary)] hover:bg-[var(--institution-secondary-dark)] text-white"
                    disabled={isChangingPassword}
                    onClick={handleChangePassword}
                  >
                    <Lock className="size-4 mr-1" />
                    {isChangingPassword ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
                  </Button>
                </CardContent>
              </Card>

              {/* Login History */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold text-[var(--institution-primary)] flex items-center gap-2">
                    <Clock className="size-4 text-[var(--institution-primary)]" />
                    Historique des connexions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(profileQuery?.loginHistory ?? []).length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">Aucune connexion enregistrée.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Adresse IP</TableHead>
                          <TableHead className="hidden sm:table-cell">Appareil</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(profileQuery?.loginHistory ?? []).map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell className="text-sm">{formatDateTimeFr(entry.date)}</TableCell>
                            <TableCell className="text-sm font-mono text-gray-600">{entry.ip}</TableCell>
                            <TableCell className="text-sm hidden sm:table-cell">
                              <div className="flex items-center gap-1.5">
                                <Monitor className="size-3.5 text-gray-400" />
                                {entry.device}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Current Session */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold text-[var(--institution-primary)] flex items-center gap-2">
                    <Smartphone className="size-4 text-[var(--institution-secondary)]" />
                    Session actuelle
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {profileQuery?.currentSession ? (
                    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-white border border-gray-200">
                          <Smartphone className="size-4 text-[var(--institution-primary)]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-[var(--institution-primary)]">{profileQuery.currentSession.device}</p>
                            <Badge className="bg-[var(--institution-secondary)] text-white border-0 text-[10px] px-1.5 py-0">
                              Actif
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500">Connecté depuis le {formatDateTimeFr(profileQuery.currentSession.date)}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">Aucune information de session disponible.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ─── Activite Tab ────────────────────────────────────── */}
            <TabsContent value="activite" className="mt-4">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold text-[var(--institution-primary)] flex items-center gap-2">
                    <Activity className="size-4 text-[var(--institution-secondary)]" />
                    Activité récente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative max-h-[520px] overflow-y-auto pr-2 custom-scrollbar">
                    {/* Timeline line */}
                    <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gray-200" />

                    <div className="space-y-1">
                      {(profileQuery?.activity ?? []).length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-6">Aucune activité récente.</p>
                      )}
                      {(profileQuery?.activity ?? []).map((entry) => {
                        const config = activityConfig[entry.type]
                        const IconComponent = config.icon
                        return (
                          <div key={entry.id} className="flex items-start gap-4 relative py-2">
                            {/* Icon circle */}
                            <div className={`relative z-10 flex items-center justify-center size-[30px] rounded-full ${config.bg} border border-white shadow-sm shrink-0`}>
                              <IconComponent className={`size-3.5 ${config.color}`} />
                            </div>
                            {/* Content */}
                            <div className="flex-1 min-w-0 pt-0.5">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-sm text-[var(--institution-primary)]">{entry.description}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border-0 ${config.bg} ${config.color}`}>
                                      {config.label}
                                    </Badge>
                                  </div>
                                </div>
                                <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">{formatDateTimeFr(entry.timestamp)}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* ─── Side Stats Panel ──────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[var(--institution-primary)]">Statistiques</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--institution-secondary-08)] border border-[var(--institution-secondary-15)]">
                <div className="p-2 rounded-lg bg-[var(--institution-secondary-10)]">
                  <Clock className="size-4 text-[var(--institution-secondary)]" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Dernière connexion</p>
                  <p className="text-sm font-semibold text-[var(--institution-primary)]">{profile?.lastLoginAt ? formatDateTimeFr(profile.lastLoginAt) : 'Non enregistrée'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--institution-accent-08)] border border-[var(--institution-accent-15)]">
                <div className="p-2 rounded-lg bg-[var(--institution-accent-10)]">
                  <LogIn className="size-4 text-[var(--institution-accent)]" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Connexions ce mois-ci</p>
                  <p className="text-sm font-semibold text-[var(--institution-primary)]">{profileQuery?.stats.connectionsThisMonth ?? 0}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--institution-secondary-08)] border border-[var(--institution-secondary-15)]">
                <div className="p-2 rounded-lg bg-[var(--institution-secondary-10)]">
                  <Activity className="size-4 text-[var(--institution-secondary)]" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Actions ce mois</p>
                  <p className="text-sm font-semibold text-[var(--institution-primary)]">{profileQuery?.stats.actionsThisMonth ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Account Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[var(--institution-primary)]">Compte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Statut</span>
                <Badge className="bg-[var(--institution-secondary)] text-white border-0 text-[10px] px-1.5 py-0.5">
                  {profile?.isActive === false ? 'Inactif' : 'Actif'}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Membre depuis</span>
                <span className="text-xs font-medium text-[var(--institution-primary)]">{formatDateFr(profile?.createdAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Custom scrollbar styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
    </div>
  )
}
