'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/lib/store'
import { useInstitution } from '@/lib/api-hooks'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Lock,
  Mail,
  User,
  Shield,
  Bell,
  MailCheck,
  Smartphone,
  MessageCircle,
  Database,
  Activity,
  CheckCircle2,
  XCircle,
  Users,
  GraduationCap,
  UserCog,
  CreditCard,
  FileText,
  ScrollText,
  Download,
  Building2,
  ArrowRight,
} from 'lucide-react'

// ─── Types (shape returned by GET /api/institution, extended for this page) ──

interface TenantSettingsData {
  emailNotifications: boolean
  smsNotifications: boolean
  whatsappNotifications: boolean
}

interface TenantData {
  name: string
  settings: TenantSettingsData | null
}

interface InstitutionStats {
  students: number
  teachers: number
  staffUsers: number
  payments: number
  documentsGenerated: number
  auditLogCount: number
  oldestAuditLogDate: string | null
}

interface InstitutionResponse {
  tenant: TenantData
  stats: InstitutionStats
  emailStatus: { resendConfigured: boolean }
}

function formatDateFr(iso: string | null) {
  if (!iso) return 'Aucune activité enregistrée'
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { setView } = useAppStore()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('notifications')

  const { data, isLoading } = useInstitution() as { data: InstitutionResponse | undefined; isLoading: boolean }
  const tenant = data?.tenant
  const stats = data?.stats
  const emailStatus = data?.emailStatus

  const [channels, setChannels] = useState({ emailNotifications: true, smsNotifications: false, whatsappNotifications: false })
  const [initialized, setInitialized] = useState(false)
  const [isSavingChannels, setIsSavingChannels] = useState(false)

  useEffect(() => {
    if (tenant?.settings && !initialized) {
      setChannels({
        emailNotifications: tenant.settings.emailNotifications,
        smsNotifications: tenant.settings.smsNotifications,
        whatsappNotifications: tenant.settings.whatsappNotifications,
      })
      setInitialized(true)
    }
  }, [tenant, initialized])

  const handleSaveChannels = async (next: typeof channels) => {
    setChannels(next)
    setIsSavingChannels(true)
    try {
      const res = await fetch('/api/institution', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || "Échec de l'enregistrement")
      toast.success('Préférences de notification enregistrées')
      queryClient.invalidateQueries({ queryKey: ['institution'] })
    } catch (error) {
      toast.error('Erreur', { description: error instanceof Error ? error.message : "Échec de l'enregistrement" })
    } finally {
      setIsSavingChannels(false)
    }
  }

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--institution-primary)]">Paramètres</h1>
          <p className="text-sm text-gray-500">Notifications, sécurité et maintenance du système</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={() => setView('profile')}>
            <User className="size-3.5 mr-1.5" />
            Mon profil
          </Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={() => setView('institution')}>
            <Building2 className="size-3.5 mr-1.5" />
            Gérer l&apos;institution
          </Button>
        </div>
      </div>
      <p className="text-xs text-gray-400 -mt-2">
        Les informations de l&apos;institution (nom, coordonnées, configuration académique) et votre compte personnel se gèrent depuis les raccourcis ci-dessus.
      </p>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-100 h-10 p-1 flex-wrap">
          <TabsTrigger value="notifications" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[var(--institution-primary)]">
            <Mail className="size-3.5 mr-1.5" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="securite" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[var(--institution-primary)]">
            <Shield className="size-3.5 mr-1.5" />
            Sécurité
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[var(--institution-primary)]">
            <Database className="size-3.5 mr-1.5" />
            Maintenance
          </TabsTrigger>
        </TabsList>

        {/* ─────────────────── Notifications Tab ─────────────────── */}
        <TabsContent value="notifications" className="mt-4">
          <div className="space-y-4">
            <Card className="border-l-4 border-l-[var(--institution-secondary)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[var(--institution-primary)] flex items-center gap-2">
                  <Bell className="size-4 text-[var(--institution-secondary)]" />
                  Canaux de notification
                </CardTitle>
                <CardDescription className="text-xs">Ces préférences s&apos;appliquent à toute l&apos;institution</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <p className="text-sm text-gray-400 text-center py-4">Chargement...</p>
                ) : (
                  <>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[var(--institution-secondary-10)] flex items-center justify-center shrink-0">
                          <Mail className="size-4 text-[var(--institution-secondary)]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--institution-primary)]">Email</p>
                          <p className="text-xs text-gray-400">Reçus de paiement, relances, confirmations</p>
                        </div>
                      </div>
                      <Switch
                        checked={channels.emailNotifications}
                        disabled={isSavingChannels}
                        onCheckedChange={(v) => handleSaveChannels({ ...channels, emailNotifications: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[var(--institution-primary-10)] flex items-center justify-center shrink-0">
                          <Smartphone className="size-4 text-[var(--institution-primary)]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--institution-primary)]">SMS</p>
                          <p className="text-xs text-gray-400">Nécessite un opérateur SMS — non connecté pour le moment</p>
                        </div>
                      </div>
                      <Switch
                        checked={channels.smsNotifications}
                        disabled={isSavingChannels}
                        onCheckedChange={(v) => handleSaveChannels({ ...channels, smsNotifications: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[var(--institution-accent-10)] flex items-center justify-center shrink-0">
                          <MessageCircle className="size-4 text-[var(--institution-accent)]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--institution-primary)]">WhatsApp</p>
                          <p className="text-xs text-gray-400">Nécessite l&apos;API WhatsApp Business — non connecté pour le moment</p>
                        </div>
                      </div>
                      <Switch
                        checked={channels.whatsappNotifications}
                        disabled={isSavingChannels}
                        onCheckedChange={(v) => handleSaveChannels({ ...channels, whatsappNotifications: v })}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-[var(--institution-secondary)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[var(--institution-primary)] flex items-center gap-2">
                  <MailCheck className="size-4 text-[var(--institution-secondary)]" />
                  Envoi d&apos;emails
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  {emailStatus?.resendConfigured ? (
                    <Badge variant="secondary" className="text-[10px] bg-[var(--institution-secondary-10)] text-[var(--institution-secondary)] border-[var(--institution-secondary-20)]">
                      <CheckCircle2 className="size-3 mr-1" />
                      Service d&apos;envoi connecté (Resend)
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] bg-[#c6282810] text-[#c62828] border-[#c6282820]">
                      <XCircle className="size-3 mr-1" />
                      Service d&apos;envoi non configuré (RESEND_API_KEY manquante)
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  L&apos;application n&apos;héberge pas de serveur SMTP : les emails sont envoyés via l&apos;API Resend lorsqu&apos;elle est configurée. Ci-dessous, la liste réelle des emails automatiques envoyés par le système — il n&apos;existe pas encore d&apos;éditeur de modèles.
                </p>
                <div className="space-y-2">
                  {[
                    { label: 'Reçu de paiement', desc: 'Envoyé automatiquement après l\'enregistrement d\'un paiement' },
                    { label: 'Relance de paiement', desc: 'Envoyé manuellement par la caisse depuis la page Paiements' },
                  ].map((tpl) => (
                    <div key={tpl.label} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="w-9 h-9 rounded-lg bg-[var(--institution-secondary-10)] flex items-center justify-center shrink-0">
                        <Mail className="size-4 text-[var(--institution-secondary)]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--institution-primary)]">{tpl.label}</p>
                        <p className="text-xs text-gray-400">{tpl.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─────────────────── Security Tab ─────────────────── */}
        <TabsContent value="securite" className="mt-4">
          <div className="space-y-4">
            <Card className="border-l-4 border-l-[var(--institution-primary)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[var(--institution-primary)] flex items-center gap-2">
                  <Lock className="size-4 text-[var(--institution-primary)]" />
                  Politique de mot de passe
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-[var(--institution-primary)]">Longueur minimale</p>
                    <p className="text-xs text-gray-400">Appliquée à la création de compte et à tout changement de mot de passe</p>
                  </div>
                  <Badge className="text-[10px] bg-[var(--institution-primary-15)] text-[var(--institution-primary)] border-0">8 caractères</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-[var(--institution-primary)]">Mot de passe temporaire à la création</p>
                    <p className="text-xs text-gray-400">Tout compte créé par un administrateur (institution, enseignant, personnel) reçoit un mot de passe temporaire à usage unique</p>
                  </div>
                  <Badge className="text-[10px] bg-[var(--institution-secondary-15)] text-[var(--institution-secondary)] border-0">Changement forcé à la 1ère connexion</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-[var(--institution-primary)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[var(--institution-primary)] flex items-center gap-2">
                  <ScrollText className="size-4 text-[var(--institution-primary)]" />
                  Journal d&apos;audit
                </CardTitle>
                <CardDescription className="text-xs">Chaque connexion et chaque création/modification/suppression est tracée</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-sm text-gray-400 text-center py-4">Chargement...</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-center">
                      <p className="text-xl font-bold text-[var(--institution-primary)]">{stats?.auditLogCount ?? 0}</p>
                      <p className="text-[10px] text-gray-400">Événements enregistrés</p>
                    </div>
                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-center">
                      <p className="text-sm font-semibold text-[var(--institution-primary)]">{formatDateFr(stats?.oldestAuditLogDate ?? null)}</p>
                      <p className="text-[10px] text-gray-400">Premier événement enregistré</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─────────────────── Maintenance Tab ─────────────────── */}
        <TabsContent value="maintenance" className="mt-4">
          <div className="space-y-4">
            <Card className="border-l-4 border-l-[var(--institution-secondary)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[var(--institution-primary)] flex items-center gap-2">
                  <Activity className="size-4 text-[var(--institution-secondary)]" />
                  Utilisation de la plateforme
                </CardTitle>
                <CardDescription className="text-xs">{tenant?.name ? `Chiffres réels pour ${tenant.name}` : 'Chiffres réels de votre institution'}</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-sm text-gray-400 text-center py-4">Chargement...</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                      { icon: Users, label: 'Étudiants', value: stats?.students ?? 0, color: 'var(--institution-secondary)' },
                      { icon: GraduationCap, label: 'Enseignants', value: stats?.teachers ?? 0, color: 'var(--institution-primary)' },
                      { icon: UserCog, label: 'Personnel', value: stats?.staffUsers ?? 0, color: 'var(--institution-accent)' },
                      { icon: CreditCard, label: 'Paiements', value: stats?.payments ?? 0, color: 'var(--institution-secondary)' },
                      { icon: FileText, label: 'Documents générés', value: stats?.documentsGenerated ?? 0, color: 'var(--institution-primary)' },
                    ].map((s) => (
                      <div key={s.label} className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-center">
                        <s.icon className="size-4 mx-auto mb-1" style={{ color: s.color }} />
                        <p className="text-xl font-bold text-[var(--institution-primary)]">{s.value.toLocaleString('fr-FR')}</p>
                        <p className="text-[10px] text-gray-400">{s.label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-[var(--institution-accent)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[var(--institution-primary)] flex items-center gap-2">
                  <Database className="size-4 text-[var(--institution-accent)]" />
                  Sauvegardes &amp; export de données
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-gray-400">
                  La base de données est hébergée chez un fournisseur PostgreSQL géré, qui assure les sauvegardes et la récupération au niveau infrastructure. Pour exporter vos propres données (étudiants, notes, paiements...), utilisez le module Import/Export déjà disponible dans le menu.
                </p>
                <Button size="sm" className="bg-[var(--institution-secondary)] hover:bg-[var(--institution-secondary-dark)] text-white text-xs" onClick={() => setView('import-export')}>
                  <Download className="size-3.5 mr-1.5" />
                  Aller à Import/Export
                  <ArrowRight className="size-3.5 ml-1.5" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
