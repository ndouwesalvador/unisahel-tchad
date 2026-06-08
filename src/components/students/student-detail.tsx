'use client'

import { useState } from 'react'
import { toast } from 'sonner'
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
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft,
  Download,
  FileText,
  CreditCard,
  Calendar,
  User,
  BookOpen,
  FileCheck,
  Clock,
  Printer,
  Award,
  IdCard,
  CheckCircle2,
  AlertCircle,
  Shield,
  Stethoscope,
  ClipboardList,
  UserCheck,
  Receipt,
  Eye,
  GraduationCap,
} from 'lucide-react'

// ─── Demo Student Data ────────────────────────────────────────────────────────

const studentData = {
  id: '1',
  matricule: 'UDN/L2/2024/001',
  login: 'adam.abakar',
  nom: 'ABAKAR',
  prenom: 'Adam Hassane',
  dateNaissance: '15 Mars 2002',
  lieuNaissance: "N'Djamena",
  sexe: 'Masculin',
  nationalite: 'Tchadienne',
  telephone: '+235 66 12 34 56',
  email: 'adam.abakar@univ.td',
  adresse: "Quartier Moursal, N'Djamena",
  filiere: 'Droit',
  niveau: 'L2',
  statut: 'INSCRIT' as const,
  credits: 48,
  photo: null,
  isHealthStudent: false,
  // Bac info
  bacSerie: 'Serie D',
  bacAnnee: '2021',
  bacMention: 'Assez Bien',
  bacEtablissement: "Lycee Felix Eboue, N'Djamena",
  // Guardian
  tuteurNom: 'Hassane Abakar',
  tuteurTelephone: '+235 66 98 76 54',
  tuteurProfession: 'Commercant',
  tuteurAdresse: "Quartier Moursal, N'Djamena",
}

const inscriptions = [
  { annee: '2024-2025', niveau: 'L2', filiere: 'Droit', statut: 'Inscrit', date: '15/09/2024' },
  { annee: '2023-2024', niveau: 'L1', filiere: 'Droit', statut: 'Valide', date: '10/09/2023' },
]

const notes = [
  { semestre: 'S3', ue: 'Droit Civil', ecue: 'Obligations', cc: 12, exam: 14, tp: null as number | null, moyenne: 12.8, credits: 4, coeff: 4, statut: 'Valide', mention: 'Bien' },
  { semestre: 'S3', ue: 'Droit Civil', ecue: 'Contrats', cc: 10, exam: 11, tp: null as number | null, moyenne: 10.6, credits: 3, coeff: 3, statut: 'Valide', mention: 'Passable' },
  { semestre: 'S3', ue: 'Droit Constitutionnel', ecue: 'Institutions politiques', cc: 8, exam: 9, tp: null as number | null, moyenne: 8.6, credits: 0, coeff: 4, statut: 'Non valide', mention: 'Insuffisant' },
  { semestre: 'S3', ue: 'Droit Penal', ecue: 'Infractions', cc: 14, exam: 15, tp: null as number | null, moyenne: 14.6, credits: 4, coeff: 4, statut: 'Valide', mention: 'Bien' },
  { semestre: 'S4', ue: 'Droit de la Famille', ecue: 'Mariage & divorce', cc: 11, exam: 13, tp: null as number | null, moyenne: 12.2, credits: 3, coeff: 3, statut: 'Valide', mention: 'Assez Bien' },
  { semestre: 'S4', ue: 'Droit Commercial', ecue: 'Actes de commerce', cc: 9, exam: 8, tp: null as number | null, moyenne: 8.4, credits: 0, coeff: 3, statut: 'Non valide', mention: 'Insuffisant' },
  { semestre: 'S4', ue: 'Droit Administratif', ecue: 'Service public', cc: 13, exam: 12, tp: null as number | null, moyenne: 12.4, credits: 4, coeff: 4, statut: 'Valide', mention: 'Assez Bien' },
  { semestre: 'S4', ue: 'Procedure Civile', ecue: 'Instance', cc: 10, exam: 11, tp: null as number | null, moyenne: 10.6, credits: 3, coeff: 3, statut: 'Valide', mention: 'Passable' },
]

const documents = [
  { id: '1', type: 'Releve de notes', semestre: 'S3', date: '20/01/2025', statut: 'Genere', code: 'VER-UDN-2024-RN-001', icon: FileText, color: '#2d7a4f' },
  { id: '2', type: 'Attestation inscription', semestre: '', date: '15/09/2024', statut: 'Genere', code: 'VER-UDN-2024-AI-001', icon: Award, color: '#1a2744' },
  { id: '3', type: 'Certificat scolarite', semestre: '', date: '18/09/2024', statut: 'Genere', code: 'VER-UDN-2024-CS-001', icon: FileCheck, color: '#d4a853' },
  { id: '4', type: 'Releve de notes', semestre: 'S4', date: '', statut: 'En attente', code: '', icon: FileText, color: '#2d7a4f' },
  { id: '5', type: 'Carte etudiant', semestre: '', date: '15/09/2024', statut: 'Genere', code: 'VER-UDN-2024-CE-001', icon: IdCard, color: '#5b8c5a' },
  { id: '6', type: 'Certificat reussite', semestre: '', date: '', statut: 'En attente', code: '', icon: Award, color: '#d4a853' },
]

const paiements = [
  { id: '1', description: "Frais d'inscription 2024-2025", montant: 175000, date: '15/09/2024', methode: 'Mobile Money', reference: 'MM-2024-001', statut: 'Paye', echeance: '' },
  { id: '2', description: 'Frais de scolarite S1', montant: 250000, date: '20/09/2024', methode: 'Especes', reference: 'ESP-2024-045', statut: 'Paye', echeance: '' },
  { id: '3', description: 'Frais de scolarite S2', montant: 250000, date: '', methode: '', reference: '', statut: 'En attente', echeance: '15/02/2025' },
  { id: '4', description: 'Frais de releve de notes', montant: 5000, date: '20/01/2025', methode: 'Mobile Money', reference: 'MM-2025-012', statut: 'Paye', echeance: '' },
  { id: '5', description: 'Frais de diplome', montant: 50000, date: '', methode: '', reference: '', statut: 'En attente', echeance: '30/06/2025' },
]

const stageData = {
  hopital: "Hopital General de Reference de N'Djamena",
  service: 'Chirurgie generale',
  maitreStage: 'Dr. Mahamat Ali Hissein',
  dateDebut: '01/02/2025',
  dateFin: '30/06/2025',
  joursRestants: 124,
  progression: 35,
  competences: [
    { nom: 'Examen clinique', progression: 80 },
    { nom: 'Pose de diagnostic', progression: 60 },
    { nom: 'Soins infirmiers', progression: 45 },
    { nom: 'Gestion dossier patient', progression: 90 },
    { nom: 'Urgences', progression: 30 },
  ],
  presences: { total: 45, present: 40, absent: 3, justifie: 2 },
}

const statusConfig: Record<string, { label: string; className: string }> = {
  INSCRIT: { label: 'Inscrit', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0 hover:bg-[#2d7a4f15]' },
  PRE_INSCRIT: { label: 'Pre-inscrit', className: 'bg-[#d4a85315] text-[#d4a853] border-0 hover:bg-[#d4a85315]' },
  SUSPENDU: { label: 'Suspendu', className: 'bg-[#ef6c0015] text-[#ef6c00] border-0 hover:bg-[#ef6c0015]' },
  EXCLU: { label: 'Exclu', className: 'bg-[#c6282815] text-[#c62828] border-0 hover:bg-[#c6282815]' },
  DIPLOME: { label: 'Diplome', className: 'bg-[#1a274415] text-[#1a2744] border-0 hover:bg-[#1a274415]' },
}

const mentionConfig: Record<string, string> = {
  'Tres Bien': 'text-[#1a2744] font-semibold',
  'Bien': 'text-[#2d7a4f] font-semibold',
  'Assez Bien': 'text-[#5b8c5a] font-medium',
  'Passable': 'text-[#d4a853] font-medium',
  'Insuffisant': 'text-red-600 font-medium',
}

function formatFCFA(amount: number) {
  return amount.toLocaleString('fr-FR') + ' FCFA'
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StudentDetail() {
  const { goBack } = useAppStore()
  const [activeTab, setActiveTab] = useState('informations')

  const s = studentData
  const initials = `${s.prenom[0]}${s.nom[0]}`

  const totalCredits = notes.reduce((sum, n) => sum + n.credits, 0)
  const totalCoeff = notes.reduce((sum, n) => sum + n.coeff, 0)
  const moyenneGenerale = totalCoeff > 0 ? notes.reduce((sum, n) => sum + n.moyenne * n.coeff, 0) / totalCoeff : 0
  const totalPaye = paiements.filter(p => p.statut === 'Paye').reduce((sum, p) => sum + p.montant, 0)
  const totalReste = paiements.filter(p => p.statut !== 'Paye').reduce((sum, p) => sum + p.montant, 0)
  const prochainEcheance = paiements.find(p => p.statut !== 'Paye' && p.echeance)

  const isHealthStudent = s.isHealthStudent || s.filiere === 'Medecine' || s.filiere === 'Infirmier' || s.filiere === 'Pharmacie'

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

      {/* Student Header with Gradient Banner */}
      <Card className="overflow-hidden">
        <div className="relative">
          {/* Gradient Banner */}
          <div className="h-28 sm:h-32 bg-gradient-to-r from-[#1a2744] to-[#2d7a4f] relative">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0YzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptLTQgMmMtMS4xIDAtMi0uOS0yLTJzLjktMiAyLTIgMiAuOSAyIDItLjkgMi0yIDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
          </div>

          {/* Content overlay */}
          <div className="px-4 sm:px-6 pb-4 -mt-10 relative">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
              {/* Large Avatar */}
              <Avatar className="size-20 border-4 border-white shadow-lg">
                <AvatarFallback className="bg-[#2d7a4f] text-white text-2xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>

              {/* Student Info */}
              <div className="flex-1 pt-2 sm:pb-1">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <h1 className="text-2xl font-bold text-[#1a2744]">{s.prenom} {s.nom}</h1>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${statusConfig[s.statut].className}`}>
                      {statusConfig[s.statut].label}
                    </Badge>
                    <Badge className="text-xs bg-[#1a274415] text-[#1a2744] border-0 hover:bg-[#1a274415]">
                      <User className="size-3 mr-1" />
                      {s.login}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                  <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded font-semibold text-[#1a2744]">{s.matricule}</span>
                  <span className="flex items-center gap-1"><BookOpen className="size-3.5 text-[#2d7a4f]" /> {s.filiere}</span>
                  <span className="flex items-center gap-1"><GraduationCap className="size-3.5 text-[#d4a853]" /> {s.niveau}</span>
                  <span className="flex items-center gap-1"><Award className="size-3.5 text-[#2d7a4f]" /> {totalCredits} credits</span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Button size="sm" variant="outline" className="text-xs border-[#1a274430] hover:bg-[#1a274408] text-[#1a2744]" onClick={() => toast.success('Fiche étudiante prête pour impression')}>
                <Printer className="size-3.5 mr-1.5" />
                Imprimer fiche
              </Button>
              <Button size="sm" variant="outline" className="text-xs border-[#2d7a4f30] hover:bg-[#2d7a4f08] text-[#2d7a4f]" onClick={() => toast.success('Relevé de notes généré', { description: 'Document prêt pour téléchargement' })}>
                <FileText className="size-3.5 mr-1.5" />
                Generer releve
              </Button>
              <Button size="sm" variant="outline" className="text-xs border-[#d4a85330] hover:bg-[#d4a85308] text-[#d4a853]" onClick={() => toast.success('Attestation générée')}>
                <Award className="size-3.5 mr-1.5" />
                Attestation
              </Button>
              <Button size="sm" variant="outline" className="text-xs border-[#5b8c5a30] hover:bg-[#5b8c5a08] text-[#5b8c5a]" onClick={() => toast.success('Carte étudiante générée')}>
                <IdCard className="size-3.5 mr-1.5" />
                Carte etudiant
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-100 h-10 p-1 flex flex-wrap">
          <TabsTrigger value="informations" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#1a2744]">Informations</TabsTrigger>
          <TabsTrigger value="inscriptions" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#1a2744]">Inscriptions</TabsTrigger>
          <TabsTrigger value="releve" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#1a2744]">Releve de notes</TabsTrigger>
          <TabsTrigger value="paiements" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#1a2744]">Paiements</TabsTrigger>
          {isHealthStudent && (
            <TabsTrigger value="stages" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#1a2744]">Stages</TabsTrigger>
          )}
          <TabsTrigger value="documents" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#1a2744]">Documents</TabsTrigger>
        </TabsList>

        {/* Informations Tab */}
        <TabsContent value="informations" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <User className="size-4 text-[#2d7a4f]" />
                  Informations personnelles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-gray-400 text-xs">Nom complet</span><p className="font-medium text-[#1a2744]">{s.prenom} {s.nom}</p></div>
                  <div><span className="text-gray-400 text-xs">Date de naissance</span><p className="font-medium text-[#1a2744]">{s.dateNaissance}</p></div>
                  <div><span className="text-gray-400 text-xs">Lieu de naissance</span><p className="font-medium text-[#1a2744]">{s.lieuNaissance}</p></div>
                  <div><span className="text-gray-400 text-xs">Sexe</span><p className="font-medium text-[#1a2744]">{s.sexe}</p></div>
                  <div><span className="text-gray-400 text-xs">Nationalite</span><p className="font-medium text-[#1a2744]">{s.nationalite}</p></div>
                  <div><span className="text-gray-400 text-xs">Telephone</span><p className="font-medium text-[#1a2744]">{s.telephone}</p></div>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">Adresse</span>
                  <p className="font-medium text-[#1a2744]">{s.adresse}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">Email</span>
                  <p className="font-medium text-[#2d7a4f]">{s.email}</p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                    <BookOpen className="size-4 text-[#d4a853]" />
                    Informations Baccalaureat
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-gray-400 text-xs">Serie</span><p className="font-medium text-[#1a2744]">{s.bacSerie}</p></div>
                    <div><span className="text-gray-400 text-xs">Annee</span><p className="font-medium text-[#1a2744]">{s.bacAnnee}</p></div>
                    <div><span className="text-gray-400 text-xs">Mention</span><p className="font-medium text-[#1a2744]">{s.bacMention}</p></div>
                    <div><span className="text-gray-400 text-xs">Etablissement</span><p className="font-medium text-[#1a2744]">{s.bacEtablissement}</p></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                    <User className="size-4 text-[#1a2744]" />
                    Tuteur / Gardien
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-gray-400 text-xs">Nom</span><p className="font-medium text-[#1a2744]">{s.tuteurNom}</p></div>
                    <div><span className="text-gray-400 text-xs">Telephone</span><p className="font-medium text-[#1a2744]">{s.tuteurTelephone}</p></div>
                    <div><span className="text-gray-400 text-xs">Profession</span><p className="font-medium text-[#1a2744]">{s.tuteurProfession}</p></div>
                    <div><span className="text-gray-400 text-xs">Adresse</span><p className="font-medium text-[#1a2744]">{s.tuteurAdresse}</p></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Inscriptions Tab */}
        <TabsContent value="inscriptions" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#1a2744]">Historique des inscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs">Annee academique</TableHead>
                    <TableHead className="text-xs">Niveau</TableHead>
                    <TableHead className="text-xs">Filiere</TableHead>
                    <TableHead className="text-xs">Statut</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inscriptions.map((ins, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm font-medium">{ins.annee}</TableCell>
                      <TableCell className="text-sm">{ins.niveau}</TableCell>
                      <TableCell className="text-sm">{ins.filiere}</TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${ins.statut === 'Valide' ? 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' : 'bg-[#d4a85315] text-[#d4a853] border-0'}`}>
                          {ins.statut}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">{ins.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Releve de Notes Tab - Academic Transcript Preview */}
        <TabsContent value="releve" className="mt-4">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {/* Transcript Preview */}
              <div className="bg-white border border-gray-200 shadow-inner">
                {/* Official Header */}
                <div className="text-center border-b-2 border-[#1a2744] py-4 px-6 bg-gray-50">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-gray-600 font-medium">Republique du Tchad</p>
                  <p className="text-[10px] tracking-[0.15em] uppercase text-gray-600 font-medium">Ministere de l&apos;Enseignement Superieur, de la Recherche Scientifique et de l&apos;Innovation</p>
                  <Separator className="my-2 bg-[#1a274430]" />
                  <p className="text-sm font-bold text-[#1a2744] tracking-wide">UNIVERSITE DE N&apos;DJAMENA</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Creee par Ordonnance N 008/PR/94 du 19 Mai 1994</p>
                  <Separator className="my-2 bg-[#1a274430]" />
                  <p className="text-base font-bold text-[#1a2744] tracking-[0.15em] uppercase mt-1">Releve de Notes</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Annee academique 2024-2025</p>
                </div>

                {/* Student Info Line */}
                <div className="px-6 py-3 border-b border-gray-200 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs">
                  <div><span className="text-gray-400">Nom :</span> <span className="font-semibold text-[#1a2744]">{s.nom}</span></div>
                  <div><span className="text-gray-400">Prenom :</span> <span className="font-semibold text-[#1a2744]">{s.prenom}</span></div>
                  <div><span className="text-gray-400">Matricule :</span> <span className="font-mono font-semibold text-[#1a2744]">{s.matricule}</span></div>
                  <div><span className="text-gray-400">Date de naissance :</span> <span className="font-medium text-[#1a2744]">{s.dateNaissance}</span></div>
                  <div><span className="text-gray-400">Filiere :</span> <span className="font-medium text-[#1a2744]">{s.filiere}</span></div>
                  <div><span className="text-gray-400">Niveau :</span> <span className="font-medium text-[#1a2744]">{s.niveau}</span></div>
                </div>

                {/* Grades Table */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#1a2744] hover:bg-[#1a2744]">
                        <TableHead className="text-xs text-white font-semibold">UE</TableHead>
                        <TableHead className="text-xs text-white font-semibold">ECUE</TableHead>
                        <TableHead className="text-xs text-white font-semibold text-center">Credits</TableHead>
                        <TableHead className="text-xs text-white font-semibold text-center">Coeff</TableHead>
                        <TableHead className="text-xs text-white font-semibold text-center">CC</TableHead>
                        <TableHead className="text-xs text-white font-semibold text-center">Examen</TableHead>
                        <TableHead className="text-xs text-white font-semibold text-center">Moyenne</TableHead>
                        <TableHead className="text-xs text-white font-semibold">Mention</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notes.map((note, i) => (
                        <TableRow key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                          <TableCell className="text-xs font-semibold text-[#1a2744]">{note.ue}</TableCell>
                          <TableCell className="text-xs text-gray-600">{note.ecue}</TableCell>
                          <TableCell className="text-xs text-center">{note.credits}</TableCell>
                          <TableCell className="text-xs text-center">{note.coeff}</TableCell>
                          <TableCell className="text-xs text-center">{note.cc}</TableCell>
                          <TableCell className="text-xs text-center">{note.exam}</TableCell>
                          <TableCell className={`text-xs text-center font-bold ${note.moyenne >= 10 ? 'text-[#2d7a4f]' : 'text-red-600'}`}>
                            {note.moyenne.toFixed(2)}
                          </TableCell>
                          <TableCell className={`text-xs ${mentionConfig[note.mention] || 'text-gray-500'}`}>
                            {note.mention}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Transcript Footer */}
                <div className="border-t-2 border-[#1a2744] bg-gray-50 px-6 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400 text-xs block">Total credits valides</span>
                      <p className="text-lg font-bold text-[#2d7a4f]">{totalCredits}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs block">Moyenne generale</span>
                      <p className={`text-lg font-bold ${moyenneGenerale >= 10 ? 'text-[#2d7a4f]' : 'text-red-600'}`}>
                        {moyenneGenerale.toFixed(2)}/20
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs block">Decision du jury</span>
                      <p className="text-lg font-bold text-[#1a2744]">
                        {moyenneGenerale >= 10 ? 'Admis' : 'Ajourné'}
                      </p>
                    </div>
                  </div>

                  <Separator className="my-4 bg-[#1a274420]" />

                  <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
                    <div className="text-[10px] text-gray-400">
                      <p>Document delivre par l&apos;Universite de N&apos;Djamena</p>
                      <p>Code de verification : VER-UDN-2024-RN-001</p>
                    </div>
                    <div className="text-center">
                      <div className="w-32 border-b border-gray-400 mb-1" />
                      <p className="text-[10px] text-gray-500">Signature du Responsable</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 p-4 bg-gray-50 border-t">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => toast.success('Impression en cours')}>
                  <Printer className="size-3.5 mr-1.5" />
                  Imprimer
                </Button>
                <Button size="sm" className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs" onClick={() => toast.success('PDF téléchargé', { description: 'Relevé de notes prêt' })}>
                  <Download className="size-3.5 mr-1.5" />
                  Telecharger PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Paiements Tab */}
        <TabsContent value="paiements" className="mt-4">
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-l-4 border-l-[#2d7a4f]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#2d7a4f15] flex items-center justify-center">
                      <CheckCircle2 className="size-5 text-[#2d7a4f]" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Total paye</p>
                      <p className="text-lg font-bold text-[#2d7a4f]">{formatFCFA(totalPaye)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-[#c62828]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#c6282815] flex items-center justify-center">
                      <AlertCircle className="size-5 text-[#c62828]" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Reste a payer</p>
                      <p className="text-lg font-bold text-[#c62828]">{formatFCFA(totalReste)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-[#d4a853]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#d4a85315] flex items-center justify-center">
                      <Clock className="size-5 text-[#d4a853]" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Prochaine echeance</p>
                      <p className="text-lg font-bold text-[#d4a853]">{prochainEcheance?.echeance || 'Aucune'}</p>
                      {prochainEcheance && (
                        <p className="text-xs text-gray-400">{formatFCFA(prochainEcheance.montant)}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Timeline */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                  <Receipt className="size-4 text-[#2d7a4f]" />
                  Historique des paiements
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-96 overflow-y-auto">
                  {paiements.map((p, i) => (
                    <div
                      key={p.id}
                      className={`flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors ${i < paiements.length - 1 ? 'border-b border-gray-100' : ''}`}
                    >
                      {/* Timeline indicator */}
                      <div className="relative flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full border-2 ${p.statut === 'Paye' ? 'bg-[#2d7a4f] border-[#2d7a4f]' : 'bg-white border-[#d4a853]'}`} />
                        {i < paiements.length - 1 && (
                          <div className={`w-0.5 h-8 ${p.statut === 'Paye' ? 'bg-[#2d7a4f30]' : 'bg-[#d4a85330]'}`} />
                        )}
                      </div>

                      {/* Payment details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-[#1a2744] truncate">{p.description}</p>
                          <Badge className={`text-[10px] shrink-0 ${p.statut === 'Paye' ? 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' : 'bg-[#d4a85315] text-[#d4a853] border-0'}`}>
                            {p.statut}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-400">
                          {p.date && <span className="flex items-center gap-1"><Calendar className="size-3" /> {p.date}</span>}
                          {p.methode && <span className="flex items-center gap-1"><CreditCard className="size-3" /> {p.methode}</span>}
                          {p.reference && <span className="font-mono">Ref: {p.reference}</span>}
                          {p.echeance && p.statut !== 'Paye' && <span className="flex items-center gap-1 text-[#d4a853]"><Clock className="size-3" /> Echeance: {p.echeance}</span>}
                        </div>
                      </div>

                      {/* Amount and action */}
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-[#1a2744]">{formatFCFA(p.montant)}</p>
                        {p.statut === 'Paye' && (
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] text-[#2d7a4f] p-0 mt-1" onClick={() => toast.success('Reçu téléchargé', { description: `Réf: ${p.reference}` })}>
                            <Download className="size-3 mr-1" />
                            Recu
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Stages Tab (conditionally shown for health students) */}
        {isHealthStudent && (
          <TabsContent value="stages" className="mt-4">
            <div className="space-y-4">
              {/* Current Internship Info */}
              <Card className="border-l-4 border-l-[#2d7a4f]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                    <Stethoscope className="size-4 text-[#2d7a4f]" />
                    Stage en cours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2 text-sm">
                      <div><span className="text-gray-400 text-xs">Hopital</span><p className="font-medium text-[#1a2744]">{stageData.hopital}</p></div>
                      <div><span className="text-gray-400 text-xs">Service</span><p className="font-medium text-[#1a2744]">{stageData.service}</p></div>
                      <div><span className="text-gray-400 text-xs">Maitre de stage</span><p className="font-medium text-[#1a2744]">{stageData.maitreStage}</p></div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-gray-400 text-xs">Periode</span><p className="font-medium text-[#1a2744]">{stageData.dateDebut} - {stageData.dateFin}</p></div>
                      <div><span className="text-gray-400 text-xs">Jours restants</span><p className="font-bold text-[#d4a853]">{stageData.joursRestants} jours</p></div>
                      <div>
                        <span className="text-gray-400 text-xs block mb-1">Progression</span>
                        <Progress value={stageData.progression} className="h-2" />
                        <p className="text-xs text-gray-400 mt-1">{stageData.progression}% complete</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Skills Progress */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                    <ClipboardList className="size-4 text-[#d4a853]" />
                    Competences acquises
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {stageData.competences.map((comp, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-[#1a2744] font-medium">{comp.nom}</span>
                        <span className={`text-xs font-semibold ${comp.progression >= 70 ? 'text-[#2d7a4f]' : comp.progression >= 40 ? 'text-[#d4a853]' : 'text-[#c62828]'}`}>
                          {comp.progression}%
                        </span>
                      </div>
                      <Progress value={comp.progression} className="h-1.5" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Attendance Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                    <UserCheck className="size-4 text-[#1a2744]" />
                    Recapitulatif des presences
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center p-3 rounded-lg bg-gray-50">
                      <p className="text-2xl font-bold text-[#1a2744]">{stageData.presences.total}</p>
                      <p className="text-xs text-gray-400">Total jours</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-[#2d7a4f08]">
                      <p className="text-2xl font-bold text-[#2d7a4f]">{stageData.presences.present}</p>
                      <p className="text-xs text-gray-400">Presents</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-[#c6282808]">
                      <p className="text-2xl font-bold text-[#c62828]">{stageData.presences.absent}</p>
                      <p className="text-xs text-gray-400">Absents</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-[#d4a85308]">
                      <p className="text-2xl font-bold text-[#d4a853]">{stageData.presences.justifie}</p>
                      <p className="text-xs text-gray-400">Justifies</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#1a2744]">Documents generes</h3>
              <Button size="sm" className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs" onClick={() => toast.success('Nouveau document', { description: 'Assistant de création de document' })}>
                <FileText className="size-3.5 mr-1.5" />
                Generer un document
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <Card key={doc.id} className="hover:shadow-md transition-shadow group">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${doc.color}15` }}>
                        <doc.icon className="size-5" style={{ color: doc.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#1a2744] truncate">{doc.type}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`text-[10px] ${doc.statut === 'Genere' ? 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' : 'bg-[#d4a85315] text-[#d4a853] border-0'}`}>
                            {doc.statut}
                          </Badge>
                          {doc.semestre && (
                            <span className="text-[10px] text-gray-400">{doc.semestre}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                      {doc.date && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Calendar className="size-3" />
                          {doc.date}
                        </div>
                      )}
                      {doc.code && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Shield className="size-3" />
                          <span className="font-mono text-[10px]">{doc.code}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      {doc.statut === 'Genere' && (
                        <Button variant="outline" size="sm" className="h-7 text-[10px] flex-1" onClick={() => toast.success('Document téléchargé', { description: doc.type })}>
                          <Download className="size-3 mr-1" />
                          Telecharger
                        </Button>
                      )}
                      {doc.code && (
                        <Button variant="ghost" size="sm" className="h-7 text-[10px] text-[#2d7a4f]" onClick={() => toast.success('Document vérifié', { description: `Code: ${doc.code} - Authentique` })}>
                          <Eye className="size-3 mr-1" />
                          Verifier
                        </Button>
                      )}
                      {doc.statut !== 'Genere' && (
                        <Button size="sm" className="h-7 text-[10px] bg-[#2d7a4f] hover:bg-[#236b40] text-white flex-1" onClick={() => toast.success('Document généré avec succès')}>
                          Generer
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
