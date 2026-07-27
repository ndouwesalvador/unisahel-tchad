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
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  Bell,
  Settings,
  Activity,
  Lock,
  Globe,
  Smartphone,
  Camera,
  Save,
  X,
  Clock,
  Monitor,
  Download,
  Edit3,
  Trash2,
  LogIn,
  ToggleLeft,
  Pencil,
} from 'lucide-react'

type ActivityType = 'login' | 'edit' | 'create' | 'delete'

const activityConfig: Record<ActivityType, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  login: { icon: LogIn, color: 'text-[#2d7a4f]', bg: 'bg-[#2d7a4f10]', label: 'Connexion' },
  edit: { icon: Pencil, color: 'text-[#d4a853]', bg: 'bg-[#d4a85310]', label: 'Modification' },
  create: { icon: Edit3, color: 'text-[#2d7a4f]', bg: 'bg-[#2d7a4f10]', label: 'Creation' },
  delete: { icon: Trash2, color: 'text-red-500', bg: 'bg-red-50', label: 'Suppression' },
}

function formatDateTimeFr(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ─── Role Labels ──────────────────────────────────────────────────────────────

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN_INSTITUTION: 'Admin Institution',
  RECTORAT: 'Rectorat',
  SCOLARITE: 'Scolarite',
  FACULTE: 'Faculte',
  DEPARTEMENT: 'Departement',
  ENSEIGNANT: 'Enseignant',
  RESPONSABLE_FILIERE: 'Resp. Filiere',
  JURY: 'Jury',
  CAISSE: 'Caisse',
  ETUDIANT: 'Etudiant',
  ETUDIANT_SANTE: 'Etudiant Sante',
  MAITRE_STAGE: 'Maitre de Stage',
  PARENT: 'Parent',
}

// ─── Profile Page ─────────────────────────────────────────────────────────────

export function ProfilePage() {
  const { user } = useAppStore()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('profil')
  const [isEditing, setIsEditing] = useState(false)
  const [twoFactor, setTwoFactor] = useState(false)
  const [emailNotif, setEmailNotif] = useState(true)
  const [pushNotif, setPushNotif] = useState(true)
  const [smsNotif, setSmsNotif] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const { data: profileQuery } = useProfileActivity() as {
    data: {
      loginHistory: { id: string; date: string; ip: string; device: string }[]
      currentSession: { id: string; date: string; ip: string; device: string } | null
      activity: { id: string; type: ActivityType; description: string; timestamp: string }[]
      profile: { firstName: string; lastName: string; email: string; phone: string; hasPassword: boolean }
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
      setFormData((prev) => ({ ...prev, phone: profileQuery.profile.phone }))
    }
  }, [profileQuery])

  // Password state
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  })

  if (!user) return null

  const initials = `${user.firstName[0]}${user.lastName[0]}`
  const fullName = `${user.firstName} ${user.lastName}`

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
        throw new Error(err.error || 'Echec de la mise a jour')
      }
      toast.success('Profil mis a jour')
      queryClient.invalidateQueries({ queryKey: ['profileActivity'] })
      setIsEditing(false)
    } catch (error) {
      toast.error('Erreur', { description: error instanceof Error ? error.message : 'Echec de la mise a jour' })
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleCancelEdit = () => {
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email || '',
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
        throw new Error(err.error || 'Echec du changement de mot de passe')
      }
      toast.success('Mot de passe mis a jour')
      setPasswordData({ current: '', new: '', confirm: '' })
    } catch (error) {
      toast.error('Erreur', { description: error instanceof Error ? error.message : 'Echec du changement de mot de passe' })
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Profile Header Banner */}
      <div className="relative overflow-hidden rounded-xl">
        <div className="bg-gradient-to-r from-[#1a2744] to-[#2d7a4f] h-40 sm:h-48 relative">
          {/* Decorative circles */}
          <div className="absolute top-[-30px] right-[-30px] w-40 h-40 rounded-full bg-white/5" />
          <div className="absolute top-10 right-20 w-24 h-24 rounded-full bg-white/5" />
          <div className="absolute bottom-[-20px] left-[30%] w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute top-5 left-10 w-16 h-16 rounded-full bg-[#d4a853]/10" />
          <div className="absolute bottom-5 right-[40%] w-12 h-12 rounded-full bg-white/5" />
        </div>
        <div className="bg-white border border-gray-200 border-t-0 rounded-b-xl px-4 sm:px-6 pb-5 pt-14 sm:pt-16 relative">
          {/* Avatar overlapping banner */}
          <div className="absolute -top-12 sm:-top-14 left-4 sm:left-6">
            <div className="relative">
              <Avatar className="size-20 sm:size-24 border-4 border-white shadow-lg">
                <AvatarFallback className="bg-[#2d7a4f] text-white text-xl sm:text-2xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                className="absolute bottom-0 right-0 p-1.5 bg-[#d4a853] rounded-full text-white shadow-md hover:bg-[#c49943] transition-colors"
                aria-label="Modifier la photo"
              >
                <Camera className="size-3.5" />
              </button>
            </div>
          </div>

          {/* User info */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mt-1">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#1a2744]">{fullName}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge className="bg-[#2d7a4f] text-white border-0 text-xs font-medium">
                  {roleLabels[user.role] || user.role}
                </Badge>
                <span className="text-sm text-gray-500">{user.email || 'Non renseigne'}</span>
              </div>
              <p className="text-sm text-gray-400 mt-0.5">{user.tenantName || 'Etablissement non renseigne'}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-[#1a2744] text-[#1a2744] hover:bg-[#1a2744] hover:text-white transition-colors w-fit"
            >
              <Camera className="size-4 mr-2" />
              Modifier la photo
            </Button>
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
                <span className="hidden sm:inline">Securite</span>
              </TabsTrigger>
              <TabsTrigger value="preferences" className="gap-1.5">
                <Settings className="size-4" />
                <span className="hidden sm:inline">Preferences</span>
              </TabsTrigger>
              <TabsTrigger value="activite" className="gap-1.5">
                <Activity className="size-4" />
                <span className="hidden sm:inline">Activite</span>
              </TabsTrigger>
            </TabsList>

            {/* ─── Profil Tab ──────────────────────────────────────── */}
            <TabsContent value="profil" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Info */}
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold text-[#1a2744] flex items-center gap-2">
                        <User className="size-4 text-[#2d7a4f]" />
                        Informations personnelles
                      </CardTitle>
                      {!isEditing && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[#2d7a4f] hover:text-[#236b40] h-8"
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
                          <p className="text-sm font-medium text-[#1a2744]">{user.lastName}</p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-gray-500">Prenom</Label>
                        {isEditing ? (
                          <Input
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            className="h-9"
                          />
                        ) : (
                          <p className="text-sm font-medium text-[#1a2744]">{user.firstName}</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">Email</Label>
                      {isEditing ? (
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="h-9"
                        />
                      ) : (
                        <p className="text-sm font-medium text-[#1a2744]">{user.email || 'Non renseigne'}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">Telephone</Label>
                      {isEditing ? (
                        <Input
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="h-9"
                        />
                      ) : (
                        <p className="text-sm font-medium text-[#1a2744]">{formData.phone || 'Non renseigne'}</p>
                      )}
                    </div>
                    {isEditing && (
                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          size="sm"
                          className="bg-[#2d7a4f] hover:bg-[#236b40] text-white"
                          disabled={isSavingProfile}
                          onClick={handleSaveProfile}
                        >
                          <Save className="size-4 mr-1" />
                          {isSavingProfile ? 'Enregistrement...' : 'Enregistrer'}
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
                    <CardTitle className="text-base font-semibold text-[#1a2744] flex items-center gap-2">
                      <Shield className="size-4 text-[#d4a853]" />
                      Informations professionnelles
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">Role</Label>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-[#2d7a4f] text-white border-0 text-xs">
                          {roleLabels[user.role] || user.role}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">Institution</Label>
                      <p className="text-sm font-medium text-[#1a2744]">{user.tenantName || 'Universite Abdou Moumouni de Niamey'}</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">Departement</Label>
                      <p className="text-sm font-medium text-[#1a2744]">Informatique et Mathematiques</p>
                    </div>
                    <Separator />
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">Date de creation du compte</Label>
                      <p className="text-sm text-[#1a2744]">15 Janvier 2024</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-500">Derniere mise a jour</Label>
                      <p className="text-sm text-[#1a2744]">28 Fevrier 2026</p>
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
                  <CardTitle className="text-base font-semibold text-[#1a2744] flex items-center gap-2">
                    <Lock className="size-4 text-[#2d7a4f]" />
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
                    className="bg-[#2d7a4f] hover:bg-[#236b40] text-white"
                    disabled={isChangingPassword}
                    onClick={handleChangePassword}
                  >
                    <Lock className="size-4 mr-1" />
                    {isChangingPassword ? 'Mise a jour...' : 'Mettre a jour le mot de passe'}
                  </Button>
                </CardContent>
              </Card>

              {/* Two-Factor Auth */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold text-[#1a2744] flex items-center gap-2">
                    <Shield className="size-4 text-[#d4a853]" />
                    Authentification a deux facteurs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-[#1a2744]">Verification en deux etapes</p>
                      <p className="text-xs text-gray-500">Ajoutez une couche de securite supplementaire a votre compte en requiring un code lors de la connexion.</p>
                    </div>
                    <Switch
                      checked={twoFactor}
                      onCheckedChange={setTwoFactor}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Login History */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold text-[#1a2744] flex items-center gap-2">
                    <Clock className="size-4 text-[#1a2744]" />
                    Historique des connexions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(profileQuery?.loginHistory ?? []).length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">Aucune connexion enregistree.</p>
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
                  <CardTitle className="text-base font-semibold text-[#1a2744] flex items-center gap-2">
                    <Smartphone className="size-4 text-[#2d7a4f]" />
                    Session actuelle
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {profileQuery?.currentSession ? (
                    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-white border border-gray-200">
                          <Smartphone className="size-4 text-[#1a2744]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-[#1a2744]">{profileQuery.currentSession.device}</p>
                            <Badge className="bg-[#2d7a4f] text-white border-0 text-[10px] px-1.5 py-0">
                              Actif
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500">Connecte depuis le {formatDateTimeFr(profileQuery.currentSession.date)}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">Aucune information de session disponible.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ─── Preferences Tab ─────────────────────────────────── */}
            <TabsContent value="preferences" className="mt-4 space-y-6">
              {/* Language */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold text-[#1a2744] flex items-center gap-2">
                    <Globe className="size-4 text-[#2d7a4f]" />
                    Langue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5 max-w-xs">
                    <Label className="text-xs text-gray-500">Langue de l&apos;interface</Label>
                    <Select defaultValue="francais">
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="francais">Francais</SelectItem>
                        <SelectItem value="english">English</SelectItem>
                        <SelectItem value="arabe">العربية</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Theme */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold text-[#1a2744] flex items-center gap-2">
                    <ToggleLeft className="size-4 text-[#d4a853]" />
                    Theme
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5 max-w-xs">
                    <Label className="text-xs text-gray-500">Apparence</Label>
                    <Select defaultValue="systeme">
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clair">Clair</SelectItem>
                        <SelectItem value="sombre">Sombre</SelectItem>
                        <SelectItem value="systeme">Systeme</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Notification Preferences */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold text-[#1a2744] flex items-center gap-2">
                    <Bell className="size-4 text-[#2d7a4f]" />
                    Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-[#1a2744]">Notifications par email</p>
                      <p className="text-xs text-gray-500">Recevez des alertes importantes par email</p>
                    </div>
                    <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-[#1a2744]">Notifications push</p>
                      <p className="text-xs text-gray-500">Recevez des notifications dans votre navigateur</p>
                    </div>
                    <Switch checked={pushNotif} onCheckedChange={setPushNotif} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-[#1a2744]">Alertes SMS</p>
                      <p className="text-xs text-gray-500">Recevez des alertes urgentes par SMS</p>
                    </div>
                    <Switch checked={smsNotif} onCheckedChange={setSmsNotif} />
                  </div>
                </CardContent>
              </Card>

              {/* Academic Preferences */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold text-[#1a2744] flex items-center gap-2">
                    <Settings className="size-4 text-[#1a2744]" />
                    Preferences academiques
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5 max-w-xs">
                    <Label className="text-xs text-gray-500">Annee academique par defaut</Label>
                    <Select defaultValue="2024-2025">
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024-2025">2024 - 2025</SelectItem>
                        <SelectItem value="2023-2024">2023 - 2024</SelectItem>
                        <SelectItem value="2022-2023">2022 - 2023</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 max-w-xs">
                    <Label className="text-xs text-gray-500">Vue par defaut a la connexion</Label>
                    <Select defaultValue="dashboard">
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dashboard">Tableau de bord</SelectItem>
                        <SelectItem value="students">Liste des etudiants</SelectItem>
                        <SelectItem value="grades">Gestion des notes</SelectItem>
                        <SelectItem value="statistics">Statistiques</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ─── Activite Tab ────────────────────────────────────── */}
            <TabsContent value="activite" className="mt-4">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold text-[#1a2744] flex items-center gap-2">
                    <Activity className="size-4 text-[#2d7a4f]" />
                    Activite recente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative max-h-[520px] overflow-y-auto pr-2 custom-scrollbar">
                    {/* Timeline line */}
                    <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gray-200" />

                    <div className="space-y-1">
                      {(profileQuery?.activity ?? []).length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-6">Aucune activite recente.</p>
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
                                  <p className="text-sm text-[#1a2744]">{entry.description}</p>
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
              <CardTitle className="text-sm font-semibold text-[#1a2744]">Statistiques</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[#2d7a4f08] border border-[#2d7a4f15]">
                <div className="p-2 rounded-lg bg-[#2d7a4f10]">
                  <Clock className="size-4 text-[#2d7a4f]" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Derniere connexion</p>
                  <p className="text-sm font-semibold text-[#1a2744]">Aujourd&apos;hui, 08:23</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-[#d4a85308] border border-[#d4a85315]">
                <div className="p-2 rounded-lg bg-[#d4a85310]">
                  <LogIn className="size-4 text-[#d4a853]" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Connexions ce mois</p>
                  <p className="text-sm font-semibold text-[#1a2744]">24</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-[#1a274408] border border-[#1a274415]">
                <div className="p-2 rounded-lg bg-[#1a274410]">
                  <Download className="size-4 text-[#1a2744]" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Fichiers telecharges</p>
                  <p className="text-sm font-semibold text-[#1a2744]">18</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-[#2d7a4f08] border border-[#2d7a4f15]">
                <div className="p-2 rounded-lg bg-[#2d7a4f10]">
                  <Activity className="size-4 text-[#2d7a4f]" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Actions ce mois</p>
                  <p className="text-sm font-semibold text-[#1a2744]">156</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Account Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#1a2744]">Compte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Statut</span>
                <Badge className="bg-[#2d7a4f] text-white border-0 text-[10px] px-1.5 py-0.5">
                  Actif
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Membre depuis</span>
                <span className="text-xs font-medium text-[#1a2744]">Jan 2024</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">2FA</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-gray-300 text-gray-600">
                  Desactive
                </Badge>
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
