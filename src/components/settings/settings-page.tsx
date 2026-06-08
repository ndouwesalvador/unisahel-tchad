'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Building2,
  GraduationCap,
  Calculator,
  Lock,
  FileText,
  Save,
  Upload,
  Globe,
  MapPin,
  Phone,
  Mail,
  User,
  Camera,
  KeyRound,
  Shield,
  Bell,
  MailCheck,
  Smartphone,
  Server,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Fingerprint,
  Database,
  HardDrive,
  Trash2,
  Download,
  QrCode,
  Stamp,
  FileSignature,
  FileOutput,
  Copy,
  Send,
  Eye,
  EyeOff,
  Activity,
} from 'lucide-react'

// ─── Component ────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')
  const [showPassword, setShowPassword] = useState(false)
  const [showSmtpPassword, setShowSmtpPassword] = useState(false)

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1a2744]">Paramètres</h1>
          <p className="text-sm text-gray-500">Configuration de l&apos;établissement et du système</p>
        </div>
        <Button size="sm" className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs">
          <Save className="size-3.5 mr-1.5" />
          Enregistrer tout
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-100 h-10 p-1 flex-wrap">
          <TabsTrigger value="profile" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#1a2744]">
            <User className="size-3.5 mr-1.5" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="academique" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#1a2744]">
            <GraduationCap className="size-3.5 mr-1.5" />
            Académique
          </TabsTrigger>
          <TabsTrigger value="documents" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#1a2744]">
            <FileText className="size-3.5 mr-1.5" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="email" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#1a2744]">
            <Mail className="size-3.5 mr-1.5" />
            Email &amp; Notif.
          </TabsTrigger>
          <TabsTrigger value="securite" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#1a2744]">
            <Shield className="size-3.5 mr-1.5" />
            Sécurité
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#1a2744]">
            <Database className="size-3.5 mr-1.5" />
            Sauvegarde
          </TabsTrigger>
        </TabsList>

        {/* ─────────────────── Profile Tab ─────────────────── */}
        <TabsContent value="profile" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Avatar Card */}
            <Card className="border-l-4 border-l-[#2d7a4f]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <Camera className="size-4 text-[#2d7a4f]" />
                  Photo de profil
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <div className="relative group">
                  <div className="w-28 h-28 rounded-full bg-[#1a274410] border-2 border-dashed border-[#2d7a4f40] flex items-center justify-center overflow-hidden">
                    <div className="w-full h-full bg-[#1a2744] flex items-center justify-center">
                      <span className="text-3xl font-bold text-white">AH</span>
                    </div>
                  </div>
                  <button className="absolute inset-0 w-28 h-28 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="size-6 text-white" />
                  </button>
                </div>
                <Button variant="outline" size="sm" className="text-xs">
                  <Upload className="size-3.5 mr-1.5" />
                  Changer la photo
                </Button>
                <p className="text-[10px] text-gray-400 text-center">JPG, PNG. Max 2 Mo.</p>
              </CardContent>
            </Card>

            {/* Profile Info Card */}
            <Card className="lg:col-span-2 border-l-4 border-l-[#2d7a4f]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <User className="size-4 text-[#2d7a4f]" />
                  Informations personnelles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Prénom</Label>
                    <Input defaultValue="Adam Hassane" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Nom</Label>
                    <Input defaultValue="ABAKAR" className="h-9 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm flex items-center gap-2">
                      <Mail className="size-3.5 text-gray-400" />
                      Email
                    </Label>
                    <Input defaultValue="admin@univ-ndjamena.td" className="h-9 text-sm" type="email" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm flex items-center gap-2">
                      <Phone className="size-3.5 text-gray-400" />
                      Téléphone
                    </Label>
                    <Input defaultValue="+235 66 00 00 00" className="h-9 text-sm" type="tel" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Rôle</Label>
                  <Select defaultValue="admin_institution">
                    <SelectTrigger className="h-9 text-sm w-full sm:w-[280px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="super_admin">Super Administrateur</SelectItem>
                      <SelectItem value="admin_institution">Admin Institution</SelectItem>
                      <SelectItem value="scolarite">Scolarité</SelectItem>
                      <SelectItem value="departement">Département</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Change Password Section */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                    <KeyRound className="size-4 text-[#d4a853]" />
                    Changer le mot de passe
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-500">Mot de passe actuel</Label>
                      <div className="relative">
                        <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="h-9 text-sm pr-9" />
                        <button
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          type="button"
                        >
                          {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-500">Nouveau mot de passe</Label>
                      <Input type="password" placeholder="••••••••" className="h-9 text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-500">Confirmer</Label>
                      <Input type="password" placeholder="••••••••" className="h-9 text-sm" />
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs">
                    <KeyRound className="size-3.5 mr-1.5" />
                    Mettre à jour le mot de passe
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Institution Card */}
            <Card className="lg:col-span-3 border-l-4 border-l-[#2d7a4f]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <Building2 className="size-4 text-[#2d7a4f]" />
                  Informations de l&apos;institution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Nom complet</Label>
                    <Input defaultValue="Université de N'Djamena" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Sigle</Label>
                    <Input defaultValue="UDN" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Logo</Label>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#1a274410] border border-dashed border-gray-300 flex items-center justify-center shrink-0">
                        <Building2 className="size-5 text-gray-400" />
                      </div>
                      <Button variant="outline" size="sm" className="text-xs">
                        <Upload className="size-3.5 mr-1.5" />
                        Charger
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm flex items-center gap-2">
                      <MapPin className="size-3.5 text-gray-400" />
                      Adresse
                    </Label>
                    <Input defaultValue="Quartier administratif, N'Djamena" className="h-9 text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm">Ville</Label>
                      <Input defaultValue="N'Djamena" className="h-9 text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Pays</Label>
                      <Select defaultValue="td">
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="td">Tchad</SelectItem>
                          <SelectItem value="cm">Cameroun</SelectItem>
                          <SelectItem value="cf">Rep. Centrafricaine</SelectItem>
                          <SelectItem value="ne">Niger</SelectItem>
                          <SelectItem value="ng">Nigeria</SelectItem>
                          <SelectItem value="ml">Mali</SelectItem>
                          <SelectItem value="sn">Senegal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm flex items-center gap-2">
                      <Phone className="size-3.5 text-gray-400" />
                      Téléphone
                    </Label>
                    <Input defaultValue="+235 22 52 37 77" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm flex items-center gap-2">
                      <Mail className="size-3.5 text-gray-400" />
                      Email
                    </Label>
                    <Input defaultValue="contact@univ-ndjamena.td" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm flex items-center gap-2">
                      <Globe className="size-3.5 text-gray-400" />
                      Site web
                    </Label>
                    <Input defaultValue="www.univ-ndjamena.td" className="h-9 text-sm" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Slug de l&apos;institution</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">unisahel.africa/</span>
                    <Input defaultValue="univ-ndjamena" className="h-9 text-sm max-w-[240px]" />
                  </div>
                  <p className="text-xs text-gray-400">Utilisé pour les liens de connexion et de vérification</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─────────────────── Academic Tab ─────────────────── */}
        <TabsContent value="academique" className="mt-4">
          <div className="space-y-4">
            {/* System Configuration */}
            <Card className="border-l-4 border-l-[#1a2744]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <GraduationCap className="size-4 text-[#1a2744]" />
                  Configuration du système académique
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Système d&apos;enseignement</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { value: 'lmd', label: 'LMD', desc: 'Licence-Master-Doctorat' },
                      { value: 'classique', label: 'Classique', desc: 'Système traditionnel' },
                      { value: 'hybride', label: 'Hybride', desc: 'LMD + Classique' },
                      { value: 'sante', label: 'Santé', desc: 'École de Santé' },
                    ].map((sys) => (
                      <label
                        key={sys.value}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 cursor-pointer hover:border-[#2d7a4f50] transition-colors border-[#2d7a4f] bg-[#2d7a4f08]"
                      >
                        <input type="radio" name="system" value={sys.value} defaultChecked={sys.value === 'lmd'} className="sr-only" />
                        <span className="text-sm font-semibold text-[#1a2744]">{sys.label}</span>
                        <span className="text-[10px] text-gray-400 text-center">{sys.desc}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">Le système LMD est le standard pour les universités africaines francophones</p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Année académique en cours</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Select defaultValue="2024-2025">
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024-2025">2024 - 2025</SelectItem>
                        <SelectItem value="2023-2024">2023 - 2024</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select defaultValue="sem1">
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sem1">Semestre 1</SelectItem>
                        <SelectItem value="sem2">Semestre 2</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-500">Semestres par année</Label>
                      <Input type="number" defaultValue="2" className="h-9 text-sm" />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Crédits par semestre (Licence)</Label>
                    <Input type="number" defaultValue="30" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Crédits par semestre (Master)</Label>
                    <Input type="number" defaultValue="30" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Crédits total Licence</Label>
                    <Input type="number" defaultValue="180" className="h-9 text-sm" disabled />
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Compensation entre UE</Label>
                    <p className="text-xs text-gray-400">Permet de compenser une UE déficitaire par une autre UE excédentaire</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Rattrapage automatique</Label>
                    <p className="text-xs text-gray-400">Générer automatiquement les sessions de rattrapage</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            {/* Grade Scale Configuration */}
            <Card className="border-l-4 border-l-[#1a2744]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <Calculator className="size-4 text-[#1a2744]" />
                  Configuration de la notation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Barème (note max)</Label>
                    <div className="flex items-center gap-2">
                      <Input type="number" defaultValue="20" className="h-9 text-sm" />
                      <span className="text-xs text-gray-400 whitespace-nowrap">/ 20</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Note de passage</Label>
                    <div className="flex items-center gap-2">
                      <Input type="number" defaultValue="10" className="h-9 text-sm" step="0.5" />
                      <span className="text-xs text-gray-400 whitespace-nowrap">/ 20</span>
                    </div>
                    <p className="text-[10px] text-[#2d7a4f]">50% du barème par défaut</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Note éliminatoire</Label>
                    <div className="flex items-center gap-2">
                      <Input type="number" defaultValue="5" className="h-9 text-sm" step="0.5" />
                      <span className="text-xs text-gray-400 whitespace-nowrap">&lt; 5/20</span>
                    </div>
                    <p className="text-[10px] text-red-500">Toute note inférieure élimine sans compensation</p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">CC (%)</Label>
                    <Input type="number" defaultValue="40" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">Examen (%)</Label>
                    <Input type="number" defaultValue="60" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">TP (%)</Label>
                    <Input type="number" defaultValue="0" className="h-9 text-sm" />
                    <p className="text-[10px] text-gray-400">Mettre 0 si pas de TP</p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Arrondir les moyennes</Label>
                    <p className="text-xs text-gray-400">Arrondir les moyennes à 2 décimales</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Note éliminatoire par UE</Label>
                    <p className="text-xs text-gray-400">Une note inférieure à ce seuil élimine l&apos;UE sans compensation</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch defaultChecked />
                    <Input type="number" defaultValue="5" className="h-9 text-sm w-20" />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Mentions</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Passable', min: '10', max: '12', color: 'bg-gray-100 border-gray-200' },
                      { label: 'Assez Bien', min: '12', max: '14', color: 'bg-[#2d7a4f08] border-[#2d7a4f30]' },
                      { label: 'Bien', min: '14', max: '16', color: 'bg-[#1a274408] border-[#1a274430]' },
                      { label: 'Tres Bien', min: '16', max: '20', color: 'bg-[#d4a85308] border-[#d4a85330]' },
                    ].map((mention) => (
                      <div key={mention.label} className={`p-3 rounded-lg border ${mention.color}`}>
                        <p className="text-xs font-medium text-[#1a2744]">{mention.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{mention.min} - {mention.max}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─────────────────── Documents Tab ─────────────────── */}
        <TabsContent value="documents" className="mt-4">
          <div className="space-y-4">
            {/* Header / Footer Templates */}
            <Card className="border-l-4 border-l-[#d4a853]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <FileOutput className="size-4 text-[#d4a853]" />
                  En-tête et pied de page des documents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">En-tête par défaut</Label>
                  <Textarea
                    defaultValue="RÉPUBLIQUE DU TCHAD&#10;Ministère de l'Enseignement Supérieur et de la Recherche Scientifique&#10;UNIVERSITÉ DE N'DJAMENA"
                    className="text-sm min-h-[80px]"
                  />
                  <p className="text-[10px] text-gray-400">Utilisé sur tous les documents officiels</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Pied de page par défaut</Label>
                  <Input
                    defaultValue="Université de N'Djamena - République du Tchad - Document généré par UniSahel"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Format papier</Label>
                    <Select defaultValue="a4">
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="a4">A4 (210 x 297 mm)</SelectItem>
                        <SelectItem value="letter">Letter (216 x 279 mm)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Orientation par défaut</Label>
                    <Select defaultValue="portrait">
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">Portrait</SelectItem>
                        <SelectItem value="landscape">Paysage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Signataire Configuration */}
            <Card className="border-l-4 border-l-[#d4a853]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <FileSignature className="size-4 text-[#d4a853]" />
                  Configuration du signataire
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Nom du signataire</Label>
                    <Input defaultValue="Pr. Mahamat Saleh YOUNSSOUF" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Titre / Fonction</Label>
                    <Input defaultValue="Recteur de l'Université" className="h-9 text-sm" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Signature</Label>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-16 rounded-lg bg-[#d4a85308] border border-dashed border-[#d4a85340] flex items-center justify-center">
                      <span className="text-[10px] text-gray-400 text-center">Aperçu signature</span>
                    </div>
                    <div className="space-y-2">
                      <Button variant="outline" size="sm" className="text-xs">
                        <Upload className="size-3.5 mr-1.5" />
                        Charger la signature
                      </Button>
                      <p className="text-[10px] text-gray-400">PNG transparent, max 300x100px</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* QR Code and Stamp */}
            <Card className="border-l-4 border-l-[#d4a853]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <QrCode className="size-4 text-[#d4a853]" />
                  QR Code et Cachet
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">QR Code de vérification</Label>
                    <p className="text-xs text-gray-400">Ajouter un QR code vérifiable sur chaque document officiel</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Position du QR code</Label>
                  <Select defaultValue="bottom-right">
                    <SelectTrigger className="h-9 text-sm w-full sm:w-[240px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top-left">En haut à gauche</SelectItem>
                      <SelectItem value="top-right">En haut à droite</SelectItem>
                      <SelectItem value="bottom-left">En bas à gauche</SelectItem>
                      <SelectItem value="bottom-right">En bas à droite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Cachet officiel</Label>
                    <p className="text-xs text-gray-400">Apposer le cachet de l&apos;institution sur les documents</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Image du cachet</Label>
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-20 rounded-lg bg-[#d4a85308] border border-dashed border-[#d4a85340] flex items-center justify-center">
                        <Stamp className="size-6 text-gray-400" />
                      </div>
                      <Button variant="outline" size="sm" className="text-xs">
                        <Upload className="size-3.5 mr-1.5" />
                        Charger
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Position du cachet</Label>
                    <Select defaultValue="bottom-right">
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top-left">En haut à gauche</SelectItem>
                        <SelectItem value="top-right">En haut à droite</SelectItem>
                        <SelectItem value="bottom-left">En bas à gauche</SelectItem>
                        <SelectItem value="bottom-right">En bas à droite</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-gray-400">Position relative sur le document</p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Signature numérique PDF</Label>
                    <p className="text-xs text-gray-400">Signer numériquement les documents PDF générés</p>
                  </div>
                  <Switch defaultChecked={false} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─────────────────── Email & Notifications Tab ─────────────────── */}
        <TabsContent value="email" className="mt-4">
          <div className="space-y-4">
            {/* SMTP Configuration */}
            <Card className="border-l-4 border-l-[#2d7a4f]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <Server className="size-4 text-[#2d7a4f]" />
                  Configuration SMTP
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Serveur SMTP</Label>
                    <Input defaultValue="smtp.univ-ndjamena.td" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Port</Label>
                    <Select defaultValue="587">
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25 (SMTP)</SelectItem>
                        <SelectItem value="465">465 (SMTPS)</SelectItem>
                        <SelectItem value="587">587 (Submission)</SelectItem>
                        <SelectItem value="2525">2525 (Alternative)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Nom d&apos;utilisateur</Label>
                    <Input defaultValue="noreply@univ-ndjamena.td" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Mot de passe</Label>
                    <div className="relative">
                      <Input type={showSmtpPassword ? 'text' : 'password'} defaultValue="smtp_password" className="h-9 text-sm pr-9" />
                      <button
                        onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        type="button"
                      >
                        {showSmtpPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Chiffrement</Label>
                    <Select defaultValue="tls">
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tls">TLS</SelectItem>
                        <SelectItem value="ssl">SSL</SelectItem>
                        <SelectItem value="none">Aucun</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Email expéditeur</Label>
                    <Input defaultValue="noreply@univ-ndjamena.td" className="h-9 text-sm" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" className="text-xs">
                    <Send className="size-3.5 mr-1.5" />
                    Envoyer un email de test
                  </Button>
                  <Badge variant="secondary" className="text-[10px] bg-[#2d7a4f10] text-[#2d7a4f] border-[#2d7a4f20]">
                    <Activity className="size-3 mr-1" />
                    SMTP connecté
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Email Templates */}
            <Card className="border-l-4 border-l-[#2d7a4f]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <MailCheck className="size-4 text-[#2d7a4f]" />
                  Modèles d&apos;emails
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { id: 'inscription', label: 'Inscription', desc: 'Envoyé lors de la confirmation d\'inscription', subject: 'Confirmation d\'inscription - {{institution}}' },
                  { id: 'paiement', label: 'Paiement', desc: 'Envoyé après un paiement réussi', subject: 'Reçu de paiement - {{montant}} FCFA' },
                  { id: 'admission', label: 'Admission', desc: 'Envoyé après l\'admission définitive', subject: 'Félicitations - Admission confirmée' },
                  { id: 'refus', label: 'Refus', desc: 'Envoyé en cas de non-admission', subject: 'Résultat de candidature - {{institution}}' },
                ].map((tpl) => (
                  <div key={tpl.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#2d7a4f10] flex items-center justify-center shrink-0">
                        <Mail className="size-4 text-[#2d7a4f]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#1a2744]">{tpl.label}</p>
                        <p className="text-xs text-gray-400">{tpl.desc}</p>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5">Objet : {tpl.subject}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="text-xs h-7">
                        <Copy className="size-3 mr-1" />
                        Dupliquer
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs h-7">
                        Modifier
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Notification Channels */}
            <Card className="border-l-4 border-l-[#2d7a4f]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <Bell className="size-4 text-[#2d7a4f]" />
                  Canaux de notification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#2d7a4f10] flex items-center justify-center shrink-0">
                      <Mail className="size-4 text-[#2d7a4f]" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Email</Label>
                      <p className="text-xs text-gray-400">Notifications par email</p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#1a274410] flex items-center justify-center shrink-0">
                      <Smartphone className="size-4 text-[#1a2744]" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">SMS</Label>
                      <p className="text-xs text-gray-400">Notifications par SMS (API externe requise)</p>
                    </div>
                  </div>
                  <Switch defaultChecked={false} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#d4a85310] flex items-center justify-center shrink-0">
                      <Bell className="size-4 text-[#d4a853]" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Push</Label>
                      <p className="text-xs text-gray-400">Notifications push dans le navigateur</p>
                    </div>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─────────────────── Security Tab ─────────────────── */}
        <TabsContent value="securite" className="mt-4">
          <div className="space-y-4">
            {/* Password Policy */}
            <Card className="border-l-4 border-l-[#1a2744]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <Lock className="size-4 text-[#1a2744]" />
                  Politique de mots de passe
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Longueur minimale</Label>
                    <Input type="number" defaultValue="8" className="h-9 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Complexité</Label>
                    <Select defaultValue="medium">
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Faible (lettres uniquement)</SelectItem>
                        <SelectItem value="medium">Moyenne (lettres + chiffres)</SelectItem>
                        <SelectItem value="high">Forte (lettres + chiffres + spec.)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Expiration du mot de passe</Label>
                    <p className="text-xs text-gray-400">Forcer le changement après une période donnée</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch defaultChecked={false} />
                    <Input type="number" defaultValue="90" className="h-9 text-sm w-20" disabled />
                    <span className="text-xs text-gray-400">jours</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Historique des mots de passe</Label>
                    <p className="text-xs text-gray-400">Interdire la réutilisation des N derniers mots de passe</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input type="number" defaultValue="5" className="h-9 text-sm w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Two-Factor Authentication */}
            <Card className="border-l-4 border-l-[#1a2744]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <Fingerprint className="size-4 text-[#1a2744]" />
                  Authentification à deux facteurs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div>
                    <Label className="text-sm font-medium">Activer la 2FA pour les administrateurs</Label>
                    <p className="text-xs text-gray-400">Exiger une double authentification pour les comptes admin</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div>
                    <Label className="text-sm font-medium">Activer la 2FA pour les enseignants</Label>
                    <p className="text-xs text-gray-400">Optionnel pour les comptes enseignants</p>
                  </div>
                  <Switch defaultChecked={false} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Méthode 2FA</Label>
                  <Select defaultValue="totp">
                    <SelectTrigger className="h-9 text-sm w-full sm:w-[280px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="totp">Application TOTP (Google Authenticator)</SelectItem>
                      <SelectItem value="sms">SMS OTP</SelectItem>
                      <SelectItem value="email">Email OTP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Session and Access */}
            <Card className="border-l-4 border-l-[#1a2744]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <ShieldCheck className="size-4 text-[#1a2744]" />
                  Session et accès
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Délai d&apos;expiration de session</Label>
                    <Select defaultValue="30">
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 heure</SelectItem>
                        <SelectItem value="120">2 heures</SelectItem>
                        <SelectItem value="480">8 heures</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Tentatives de connexion max</Label>
                    <Input type="number" defaultValue="5" className="h-9 text-sm" />
                    <p className="text-[10px] text-gray-400">Verrouillage du compte après échecs consécutifs</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="size-3.5 text-[#d4a853]" />
                    Liste blanche IP
                  </Label>
                  <Textarea
                    placeholder="Entrez les adresses IP autorisées, une par ligne&#10;Ex: 192.168.1.0/24&#10;Laissez vide pour autoriser toutes les IPs"
                    className="text-sm min-h-[80px] font-mono"
                  />
                  <p className="text-[10px] text-gray-400">Restrict l&apos;accès à certaines plages d&apos;adresses IP. Laissez vide pour autoriser tout accès.</p>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Rétention du journal d&apos;audit</Label>
                    <p className="text-xs text-gray-400">Durée de conservation des logs d&apos;activité</p>
                  </div>
                  <Select defaultValue="365">
                    <SelectTrigger className="h-9 text-sm w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="90">90 jours</SelectItem>
                      <SelectItem value="180">180 jours</SelectItem>
                      <SelectItem value="365">1 an</SelectItem>
                      <SelectItem value="730">2 ans</SelectItem>
                      <SelectItem value="0">Illimité</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─────────────────── Backup & Maintenance Tab ─────────────────── */}
        <TabsContent value="maintenance" className="mt-4">
          <div className="space-y-4">
            {/* Auto Backup */}
            <Card className="border-l-4 border-l-[#2d7a4f]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <Download className="size-4 text-[#2d7a4f]" />
                  Sauvegarde automatique
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Sauvegarde automatique</Label>
                    <p className="text-xs text-gray-400">Créer automatiquement des sauvegardes de la base de données</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Fréquence</Label>
                    <Select defaultValue="daily">
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Quotidienne</SelectItem>
                        <SelectItem value="weekly">Hebdomadaire</SelectItem>
                        <SelectItem value="monthly">Mensuelle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Heure de sauvegarde</Label>
                    <Input type="time" defaultValue="02:00" className="h-9 text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Nombre de sauvegardes conservées</Label>
                    <Input type="number" defaultValue="30" className="h-9 text-sm" />
                    <p className="text-[10px] text-gray-400">Les plus anciennes seront supprimées automatiquement</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Dernière sauvegarde</Label>
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#2d7a4f08] border border-[#2d7a4f20]">
                      <Clock className="size-4 text-[#2d7a4f]" />
                      <div>
                        <p className="text-xs font-medium text-[#1a2744]">06 Mars 2025 - 02:00</p>
                        <p className="text-[10px] text-gray-400">Taille : 142 Mo</p>
                      </div>
                    </div>
                  </div>
                </div>
                <Button size="sm" className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs">
                  <Download className="size-3.5 mr-1.5" />
                  Créer un backup maintenant
                </Button>
              </CardContent>
            </Card>

            {/* Database Info */}
            <Card className="border-l-4 border-l-[#1a2744]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <HardDrive className="size-4 text-[#1a2744]" />
                  Base de données
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-center">
                    <p className="text-xl font-bold text-[#1a2744]">2.4 Go</p>
                    <p className="text-[10px] text-gray-400">Taille totale</p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-center">
                    <p className="text-xl font-bold text-[#2d7a4f]">1.8 Go</p>
                    <p className="text-[10px] text-gray-400">Données</p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-center">
                    <p className="text-xl font-bold text-[#d4a853]">600 Mo</p>
                    <p className="text-[10px] text-gray-400">Index</p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-center">
                    <p className="text-xl font-bold text-[#1a2744]">12,847</p>
                    <p className="text-[10px] text-gray-400">Enregistrements</p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Optimiser la base de données</Label>
                    <p className="text-xs text-gray-400">Réorganiser les index et optimiser les tables</p>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs">
                    <Activity className="size-3.5 mr-1.5" />
                    Optimiser
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Cache */}
            <Card className="border-l-4 border-l-[#d4a853]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <Trash2 className="size-4 text-[#d4a853]" />
                  Cache et maintenance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div>
                    <Label className="text-sm font-medium">Vider le cache applicatif</Label>
                    <p className="text-xs text-gray-400">Taille actuelle du cache : 48 Mo</p>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs text-[#c62828] hover:text-[#a01b1b] hover:bg-[#c6282808]">
                    <Trash2 className="size-3.5 mr-1.5" />
                    Vider le cache
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div>
                    <Label className="text-sm font-medium">Régénérer les vues</Label>
                    <p className="text-xs text-gray-400">Rafraîchir les vues matérialisées et les calculs</p>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs">
                    <Activity className="size-3.5 mr-1.5" />
                    Régénérer
                  </Button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div>
                    <Label className="text-sm font-medium">Nettoyer les fichiers temporaires</Label>
                    <p className="text-xs text-gray-400">Supprimer les PDF générés de plus de 30 jours</p>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs">
                    <Trash2 className="size-3.5 mr-1.5" />
                    Nettoyer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
