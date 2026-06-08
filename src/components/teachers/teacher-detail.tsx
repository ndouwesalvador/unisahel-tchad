'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Clock,
  Download,
  Edit,
  Mail,
  MapPin,
  Phone,
  Plus,
  Printer,
  GraduationCap,
  Briefcase,
  FileText,
  Globe,
  Award,
  User,
  Building2,
  MessageSquare,
  BookMarked,
  ExternalLink,
} from 'lucide-react'

// ─── Demo Teacher Data ────────────────────────────────────────────────────────

const teacherData = {
  id: '5',
  matricule: 'ENS/005',
  nom: 'DEBY ITNO',
  prenom: 'Idriss',
  grade: 'Professeur' as const,
  departement: 'Informatique',
  specialisation: 'Intelligence Artificielle',
  statut: 'Actif' as const,
  dateNaissance: '12 Juin 1968',
  nationalite: 'Tchadienne',
  telephone: '+235 66 13 14 15',
  email: 'i.deby@univ.td',
  adresse: 'Quartier Diguel, N\'Djamena',
  dateRecrutement: '15 Septembre 1998',
  anneesExperience: 27,
  photo: null,
}

const gradeConfig: Record<string, { label: string; className: string }> = {
  'Professeur': { label: 'Professeur', className: 'bg-[#1a274415] text-[#1a2744] border-0 hover:bg-[#1a274415]' },
  'MCF': { label: 'Maitre de Conferences', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0 hover:bg-[#2d7a4f15]' },
  'MA': { label: 'Maitre-Assistant', className: 'bg-[#d4a85315] text-[#d4a853] border-0 hover:bg-[#d4a85315]' },
  'Assistant': { label: 'Assistant', className: 'bg-orange-100 text-orange-800 border-0' },
  'Vacataire': { label: 'Vacataire', className: 'bg-gray-100 text-gray-800 border-0' },
  'Professionnel': { label: 'Professionnel', className: 'bg-gray-100 text-gray-800 border-0' },
}

const statutConfig: Record<string, { label: string; className: string }> = {
  'Actif': { label: 'Actif', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0 hover:bg-[#2d7a4f15]' },
  'Conge': { label: 'En conge', className: 'bg-[#d4a85315] text-[#d4a853] border-0 hover:bg-[#d4a85315]' },
  'Retraite': { label: 'Retraite', className: 'bg-gray-100 text-gray-600 border-0' },
}

// ─── Demo Services Data ───────────────────────────────────────────────────────

const services = [
  { ueCode: 'INF301', ueName: 'Intelligence Artificielle', niveau: 'L3', groupes: 'G1, G2', heuresSem: 4, semestre: 'S5' },
  { ueCode: 'INF302', ueName: 'Apprentissage Automatique', niveau: 'L3', groupes: 'G1', heuresSem: 2, semestre: 'S5' },
  { ueCode: 'INF401', ueName: 'Deep Learning', niveau: 'M1', groupes: 'G1', heuresSem: 2, semestre: 'S7' },
  { ueCode: 'INF402', ueName: 'Traitement du Langage Naturel', niveau: 'M1', groupes: 'G1, G2', heuresSem: 3, semestre: 'S7' },
]

const totalHeuresSem = services.reduce((sum, s) => sum + s.heuresSem, 0)

// ─── Demo Publications Data ───────────────────────────────────────────────────

const publications = [
  { id: '1', title: 'Analyse predictive des series temporelles en contexte saheliene', journal: 'Revue Africaine de l\'IA', year: 2024, type: 'Article' as const, doi: '10.1234/raia.2024.001' },
  { id: '2', title: 'Modeles de langage pour les langues africaines : vers une approche inclusive', journal: 'Journal of Computational Linguistics', year: 2024, type: 'Article' as const, doi: '10.5678/jcl.2024.045' },
  { id: '3', title: 'Introduction a l\'intelligence artificielle appliquee', journal: 'Editions Universitaires du Sahel', year: 2023, type: 'Ouvrage' as const, doi: '' },
  { id: '4', title: 'Transfert d\'apprentissage dans les reseaux de neurones convolutifs', journal: 'Proceedings of AFRICAI 2023', year: 2023, type: 'Chapitre' as const, doi: '10.9012/africai.2023.ch5' },
  { id: '5', title: 'Systemes multi-agents pour la gestion des ressources en eau', journal: 'International Journal of AI Research', year: 2022, type: 'Article' as const, doi: '10.3456/ijair.2022.089' },
  { id: '6', title: 'Vision par ordinateur pour la detection de pathologies vegetales', journal: 'Revue des Sciences Agronomiques', year: 2022, type: 'Article' as const, doi: '10.7890/rsa.2022.112' },
  { id: '7', title: 'Reseaux de neurones recurrents : theorie et applications', journal: 'Editions Universitaires du Sahel', year: 2021, type: 'Chapitre' as const, doi: '' },
]

const publicationTypeConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  'Article': { label: 'Article', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0 hover:bg-[#2d7a4f15]', icon: FileText },
  'Chapitre': { label: 'Chapitre', className: 'bg-[#d4a85315] text-[#d4a853] border-0 hover:bg-[#d4a85315]', icon: BookMarked },
  'Ouvrage': { label: 'Ouvrage', className: 'bg-[#1a274415] text-[#1a2744] border-0 hover:bg-[#1a274415]', icon: BookOpen },
}

// ─── Demo Schedule Data ───────────────────────────────────────────────────────

const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const creneaux = ['08:00-10:00', '10:00-12:00', '14:00-16:00', '16:00-18:00']

const scheduleData: Record<string, Record<string, { ue: string; niveau: string; salle: string } | null>> = {
  'Lundi': {
    '08:00-10:00': { ue: 'INF301 - IA', niveau: 'L3 G1', salle: 'Salle A12' },
    '10:00-12:00': { ue: 'INF301 - IA', niveau: 'L3 G2', salle: 'Salle A12' },
    '14:00-16:00': null,
    '16:00-18:00': null,
  },
  'Mardi': {
    '08:00-10:00': null,
    '10:00-12:00': { ue: 'INF401 - Deep Learning', niveau: 'M1 G1', salle: 'Labo Info' },
    '14:00-16:00': { ue: 'INF302 - ML', niveau: 'L3 G1', salle: 'Salle B05' },
    '16:00-18:00': null,
  },
  'Mercredi': {
    '08:00-10:00': null,
    '10:00-12:00': null,
    '14:00-16:00': { ue: 'INF402 - NLP', niveau: 'M1 G1', salle: 'Labo Info' },
    '16:00-18:00': { ue: 'INF402 - NLP', niveau: 'M1 G2', salle: 'Labo Info' },
  },
  'Jeudi': {
    '08:00-10:00': { ue: 'INF301 - IA', niveau: 'L3 G1', salle: 'Salle A12' },
    '10:00-12:00': null,
    '14:00-16:00': null,
    '16:00-18:00': null,
  },
  'Vendredi': {
    '08:00-10:00': null,
    '10:00-12:00': { ue: 'INF302 - ML', niveau: 'L3 G1', salle: 'Salle B05' },
    '14:00-16:00': null,
    '16:00-18:00': null,
  },
  'Samedi': {
    '08:00-10:00': null,
    '10:00-12:00': null,
    '14:00-16:00': null,
    '16:00-18:00': null,
  },
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TeacherDetail() {
  const { goBack } = useAppStore()
  const [activeTab, setActiveTab] = useState('informations')

  const t = teacherData
  const initials = `${t.prenom[0]}${t.nom[0]}`

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        onClick={goBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1a2744] transition-colors"
      >
        <ArrowLeft className="size-4" />
        Retour a la liste
      </button>

      {/* Header Banner with Gradient */}
      <Card className="overflow-hidden">
        <div className="relative">
          <div className="h-28 sm:h-36 bg-gradient-to-r from-[#1a2744] to-[#2d7a4f] relative">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0YzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptLTQgMmMtMS4xIDAtMi0uOS0yLTJzLjktMiAyLTIgMiAuOSAyIDItLjkgMi0yIDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
            {/* Decorative circles */}
            <div className="absolute right-0 top-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
            <div className="absolute right-20 bottom-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2" />
          </div>

          <div className="px-4 sm:px-6 pb-4 -mt-10 relative">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
              <Avatar className="size-20 border-4 border-white shadow-lg">
                <AvatarFallback className="bg-[#1a2744] text-white text-2xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 pt-2 sm:pb-1">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <h1 className="text-2xl font-bold text-[#1a2744]">Prof. {t.prenom} {t.nom}</h1>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${gradeConfig[t.grade]?.className || 'bg-gray-100 text-gray-800 border-0'}`}>
                      <GraduationCap className="size-3 mr-1" />
                      {gradeConfig[t.grade]?.label || t.grade}
                    </Badge>
                    <Badge className={`text-xs ${statutConfig[t.statut]?.className || 'bg-gray-100 text-gray-800 border-0'}`}>
                      {statutConfig[t.statut]?.label || t.statut}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                  <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded font-semibold text-[#1a2744]">{t.matricule}</span>
                  <span className="flex items-center gap-1"><Building2 className="size-3.5 text-[#2d7a4f]" /> {t.departement}</span>
                  <span className="flex items-center gap-1"><BookOpen className="size-3.5 text-[#d4a853]" /> {t.specialisation}</span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Button size="sm" variant="outline" className="text-xs border-[#2d7a4f30] hover:bg-[#2d7a4f08] text-[#2d7a4f]">
                <Plus className="size-3.5 mr-1.5" />
                Affecter UE
              </Button>
              <Button size="sm" variant="outline" className="text-xs border-[#1a274430] hover:bg-[#1a274408] text-[#1a2744]">
                <Edit className="size-3.5 mr-1.5" />
                Modifier
              </Button>
              <Button size="sm" variant="outline" className="text-xs border-[#d4a85330] hover:bg-[#d4a85308] text-[#d4a853]">
                <Briefcase className="size-3.5 mr-1.5" />
                Services
              </Button>
              <Button size="sm" variant="outline" className="text-xs border-[#5b8c5a30] hover:bg-[#5b8c5a08] text-[#5b8c5a]">
                <MessageSquare className="size-3.5 mr-1.5" />
                Contacter
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Content with Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Side Panel - Summary Stats */}
        <div className="lg:col-span-1 order-2 lg:order-1">
          <div className="space-y-4">
            <Card className="border-l-4 border-l-[#2d7a4f]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#2d7a4f15] flex items-center justify-center">
                    <Clock className="size-5 text-[#2d7a4f]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Heures totales/sem</p>
                    <p className="text-xl font-bold text-[#2d7a4f]">{totalHeuresSem}h</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-[#1a2744]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1a274415] flex items-center justify-center">
                    <BookOpen className="size-5 text-[#1a2744]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">UE assignees</p>
                    <p className="text-xl font-bold text-[#1a2744]">{services.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-[#d4a853]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#d4a85315] flex items-center justify-center">
                    <FileText className="size-5 text-[#d4a853]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Publications</p>
                    <p className="text-xl font-bold text-[#d4a853]">{publications.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-[#5b8c5a]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#5b8c5a15] flex items-center justify-center">
                    <Award className="size-5 text-[#5b8c5a]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Annees d&apos;experience</p>
                    <p className="text-xl font-bold text-[#5b8c5a]">{t.anneesExperience}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs Content */}
        <div className="lg:col-span-3 order-1 lg:order-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-gray-100 h-10 p-1 flex flex-wrap">
              <TabsTrigger value="informations" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#1a2744]">Informations</TabsTrigger>
              <TabsTrigger value="services" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#1a2744]">Services</TabsTrigger>
              <TabsTrigger value="publications" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#1a2744]">Publications</TabsTrigger>
              <TabsTrigger value="emploi" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#1a2744]">Emploi du temps</TabsTrigger>
            </TabsList>

            {/* Informations Tab */}
            <TabsContent value="informations" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Personal Info Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                      <User className="size-4 text-[#2d7a4f]" />
                      Informations personnelles
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-gray-400 text-xs">Nom</span>
                        <p className="font-medium text-[#1a2744]">{t.nom}</p>
                      </div>
                      <div>
                        <span className="text-gray-400 text-xs">Prenom</span>
                        <p className="font-medium text-[#1a2744]">{t.prenom}</p>
                      </div>
                      <div>
                        <span className="text-gray-400 text-xs">Date de naissance</span>
                        <p className="font-medium text-[#1a2744]">{t.dateNaissance}</p>
                      </div>
                      <div>
                        <span className="text-gray-400 text-xs">Nationalite</span>
                        <p className="font-medium text-[#1a2744]">{t.nationalite}</p>
                      </div>
                    </div>
                    <Separator className="bg-gray-100" />
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Phone className="size-3.5 text-gray-400 shrink-0" />
                        <span className="font-medium text-[#1a2744]">{t.telephone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="size-3.5 text-gray-400 shrink-0" />
                        <span className="font-medium text-[#2d7a4f]">{t.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="size-3.5 text-gray-400 shrink-0" />
                        <span className="font-medium text-[#1a2744]">{t.adresse}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Professional Info Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                      <Briefcase className="size-4 text-[#d4a853]" />
                      Informations professionnelles
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-gray-400 text-xs">Grade</span>
                        <div className="mt-0.5">
                          <Badge className={`text-[10px] ${gradeConfig[t.grade]?.className || 'bg-gray-100 text-gray-800 border-0'}`}>
                            {gradeConfig[t.grade]?.label || t.grade}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-400 text-xs">Departement</span>
                        <p className="font-medium text-[#1a2744]">{t.departement}</p>
                      </div>
                      <div>
                        <span className="text-gray-400 text-xs">Specialisation</span>
                        <p className="font-medium text-[#1a2744]">{t.specialisation}</p>
                      </div>
                      <div>
                        <span className="text-gray-400 text-xs">Date de recrutement</span>
                        <p className="font-medium text-[#1a2744]">{t.dateRecrutement}</p>
                      </div>
                    </div>
                    <Separator className="bg-gray-100" />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-gray-400 text-xs">Statut</span>
                        <div className="mt-0.5">
                          <Badge className={`text-[10px] ${statutConfig[t.statut]?.className || 'bg-gray-100 text-gray-800 border-0'}`}>
                            {statutConfig[t.statut]?.label || t.statut}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-400 text-xs">Annees d&apos;experience</span>
                        <p className="font-bold text-[#2d7a4f]">{t.anneesExperience} ans</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Services Tab */}
            <TabsContent value="services" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                      <BookOpen className="size-4 text-[#2d7a4f]" />
                      Affectations d&apos;enseignement
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="text-xs h-7">
                        <Printer className="size-3 mr-1" />
                        Imprimer
                      </Button>
                      <Button size="sm" className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs h-7">
                        <Download className="size-3 mr-1" />
                        Export
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#1a2744] hover:bg-[#1a2744]">
                          <TableHead className="text-xs text-white font-semibold">Code UE</TableHead>
                          <TableHead className="text-xs text-white font-semibold">Unite d&apos;enseignement</TableHead>
                          <TableHead className="text-xs text-white font-semibold text-center">Niveau</TableHead>
                          <TableHead className="text-xs text-white font-semibold text-center">Groupes</TableHead>
                          <TableHead className="text-xs text-white font-semibold text-center">Heures/sem</TableHead>
                          <TableHead className="text-xs text-white font-semibold text-center">Semestre</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {services.map((s, i) => (
                          <TableRow key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                            <TableCell className="text-xs font-mono font-semibold text-[#1a2744]">{s.ueCode}</TableCell>
                            <TableCell className="text-sm text-gray-700">{s.ueName}</TableCell>
                            <TableCell className="text-xs text-center">
                              <Badge className="text-[10px] bg-[#1a274410] text-[#1a2744] border-0 hover:bg-[#1a274410]">{s.niveau}</Badge>
                            </TableCell>
                            <TableCell className="text-xs text-center text-gray-600">{s.groupes}</TableCell>
                            <TableCell className="text-sm text-center font-semibold text-[#2d7a4f]">{s.heuresSem}h</TableCell>
                            <TableCell className="text-xs text-center">
                              <Badge className="text-[10px] bg-[#2d7a4f10] text-[#2d7a4f] border-0 hover:bg-[#2d7a4f10]">{s.semestre}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Totals Row */}
                  <div className="flex items-center justify-between px-6 py-3 bg-[#1a274408] border-t border-[#1a274415]">
                    <span className="text-sm font-semibold text-[#1a2744]">Total</span>
                    <div className="flex items-center gap-6">
                      <span className="text-sm text-gray-500">{services.length} UE</span>
                      <span className="text-sm font-bold text-[#2d7a4f]">{totalHeuresSem}h / semaine</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Publications Tab */}
            <TabsContent value="publications" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                      <FileText className="size-4 text-[#d4a853]" />
                      Publications de recherche
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className="text-[10px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">
                        {publications.filter(p => p.type === 'Article').length} articles
                      </Badge>
                      <Badge className="text-[10px] bg-[#d4a85315] text-[#d4a853] border-0">
                        {publications.filter(p => p.type === 'Chapitre').length} chapitres
                      </Badge>
                      <Badge className="text-[10px] bg-[#1a274415] text-[#1a2744] border-0">
                        {publications.filter(p => p.type === 'Ouvrage').length} ouvrages
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[480px] overflow-y-auto">
                    {publications.map((pub, i) => {
                      const typeConfig = publicationTypeConfig[pub.type]
                      const TypeIcon = typeConfig?.icon || FileText
                      return (
                        <div
                          key={pub.id}
                          className={`flex items-start gap-4 px-6 py-4 hover:bg-gray-50 transition-colors ${i < publications.length - 1 ? 'border-b border-gray-100' : ''}`}
                        >
                          {/* Type indicator */}
                          <div className="relative flex flex-col items-center pt-1">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: pub.type === 'Article' ? '#2d7a4f15' : pub.type === 'Chapitre' ? '#d4a85315' : '#1a274415' }}>
                              <TypeIcon className="size-5" style={{ color: pub.type === 'Article' ? '#2d7a4f' : pub.type === 'Chapitre' ? '#d4a853' : '#1a2744' }} />
                            </div>
                          </div>

                          {/* Publication details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2">
                              <p className="text-sm font-semibold text-[#1a2744] leading-snug">{pub.title}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Globe className="size-3" />
                                {pub.journal}
                              </span>
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Calendar className="size-3" />
                                {pub.year}
                              </span>
                              <Badge className={`text-[10px] ${typeConfig?.className || 'bg-gray-100 text-gray-800 border-0'}`}>
                                {typeConfig?.label || pub.type}
                              </Badge>
                            </div>
                            {pub.doi && (
                              <div className="mt-1.5">
                                <span className="text-[10px] font-mono text-gray-400">DOI: {pub.doi}</span>
                              </div>
                            )}
                          </div>

                          {/* Action */}
                          <Button variant="ghost" size="sm" className="h-7 text-[10px] text-[#2d7a4f] shrink-0">
                            <ExternalLink className="size-3 mr-1" />
                            Voir
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Emploi du temps Tab */}
            <TabsContent value="emploi" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                      <Calendar className="size-4 text-[#2d7a4f]" />
                      Emploi du temps hebdomadaire
                    </CardTitle>
                    <Button size="sm" variant="outline" className="text-xs h-7">
                      <Printer className="size-3 mr-1" />
                      Imprimer
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#1a2744] hover:bg-[#1a2744]">
                          <TableHead className="text-xs text-white font-semibold w-[100px]">Horaire</TableHead>
                          {jours.map(jour => (
                            <TableHead key={jour} className="text-xs text-white font-semibold text-center">{jour}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {creneaux.map(creneau => (
                          <TableRow key={creneau}>
                            <TableCell className="text-xs font-mono text-gray-500 font-medium bg-gray-50/80 whitespace-nowrap">
                              {creneau}
                            </TableCell>
                            {jours.map(jour => {
                              const slot = scheduleData[jour]?.[creneau]
                              return (
                                <TableCell key={`${jour}-${creneau}`} className="p-1.5">
                                  {slot ? (
                                    <div className="rounded-lg bg-[#2d7a4f10] border border-[#2d7a4f20] p-2 text-center">
                                      <p className="text-xs font-semibold text-[#1a2744] leading-tight">{slot.ue}</p>
                                      <p className="text-[10px] text-[#2d7a4f] mt-0.5">{slot.niveau}</p>
                                      <p className="text-[10px] text-gray-400 mt-0.5">{slot.salle}</p>
                                    </div>
                                  ) : (
                                    <div className="rounded-lg bg-gray-50/50 border border-dashed border-gray-200 p-2 text-center min-h-[52px] flex items-center justify-center">
                                      <span className="text-[10px] text-gray-300">-</span>
                                    </div>
                                  )}
                                </TableCell>
                              )
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-4 px-6 py-3 bg-gray-50 border-t text-xs text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-[#2d7a4f20] border border-[#2d7a4f30]" />
                      Cours programme
                    </span>
                    <span className="text-gray-400">
                      Semaine type - Annee 2024-2025
                    </span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
