'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import {
import { toast } from 'sonner'
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
import { toast } from 'sonner'
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
import { toast } from 'sonner'
  GraduationCap,
  Briefcase,
  TrendingUp,
  Users,
  Plus,
  Upload,
  Download,
  Search,
  MapPin,
  Calendar,
  Building2,
  ArrowUpRight,
  Phone,
  Mail,
  ChevronRight,
  PartyPopper,
  HandCoins,
  Smartphone,
  Building,
  Banknote,
  CheckCircle2,
} from 'lucide-react'

// â”€â”€â”€ Demo Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface Alumnus {
  id: string
  nom: string
  prenom: string
  diplome: string
  annee: number
  filiere: string
  poste: string
  entreprise: string
  pays: string
  statut: 'actif' | 'inactif' | 'injoignable'
  contact: boolean
  email: string
  telephone: string
}

const demoAlumni: Alumnus[] = [
  { id: '1', nom: 'HISSEIN', prenom: 'Adam', diplome: 'Licence', annee: 2020, filiere: 'Informatique', poste: 'Ingenieur IT', entreprise: 'Orange Tchad', pays: 'Tchad', statut: 'actif', contact: true, email: 'adam.hissein@orange.td', telephone: '+235 66 12 34 56' },
  { id: '2', nom: 'NADJIKO', prenom: 'Marie', diplome: 'Master', annee: 2018, filiere: 'Droit', poste: 'Avocate', entreprise: 'Cabinet Nadjiko & Associes', pays: 'Tchad', statut: 'actif', contact: true, email: 'marie.nadjiko@cabinet.td', telephone: '+235 66 78 90 12' },
  { id: '3', nom: 'ABDALLAH', prenom: 'Ibrahim', diplome: 'Doctorat', annee: 2016, filiere: 'Medecine', poste: 'Medecin', entreprise: 'Hopital General de N\'Djamena', pays: 'Tchad', statut: 'actif', contact: true, email: 'ibrahim.abdallah@hopital.td', telephone: '+235 66 23 45 67' },
  { id: '4', nom: 'DJIMRANGAR', prenom: 'Fatime', diplome: 'Licence', annee: 2022, filiere: 'Economie', poste: 'Cadre banque', entreprise: 'Banque Sahelo-Saharienne', pays: 'Tchad', statut: 'actif', contact: true, email: 'fatime.djim@bs2i.td', telephone: '+235 66 34 56 78' },
  { id: '5', nom: 'MAHAMAT', prenom: 'Youssouf', diplome: 'Master', annee: 2019, filiere: 'Informatique', poste: 'Directeur IT', entreprise: 'Airtel Tchad', pays: 'Tchad', statut: 'actif', contact: false, email: 'youssouf.mahamat@airtel.td', telephone: '+235 66 45 67 89' },
  { id: '6', nom: 'NGARNDMI', prenom: 'Halime', diplome: 'Licence', annee: 2021, filiere: 'Mathematiques', poste: 'Enseignant', entreprise: 'Lycee Felix Eboue', pays: 'Tchad', statut: 'actif', contact: true, email: 'halime.ngarndmi@education.td', telephone: '+235 66 56 78 90' },
  { id: '7', nom: 'BAKARY', prenom: 'Soumaine', diplome: 'Master', annee: 2017, filiere: 'Droit', poste: 'Directeur ONG', entreprise: 'ONG Action Sahel', pays: 'Cameroun', statut: 'actif', contact: true, email: 'soumaine.bakary@actionsahel.org', telephone: '+237 6 12 34 56' },
  { id: '8', nom: 'KHAMIS', prenom: 'Khadija', diplome: 'Licence', annee: 2023, filiere: 'Economie', poste: 'Entrepreneure', entreprise: 'Sahel Consulting', pays: 'Senegal', statut: 'actif', contact: true, email: 'khadija.khamis@sahelconsulting.sn', telephone: '+221 77 12 34 56' },
  { id: '9', nom: 'ABAKAR', prenom: 'Moussa', diplome: 'Doctorat', annee: 2015, filiere: 'Medecine', poste: 'Chirurgien', entreprise: 'CHU de Dakar', pays: 'Senegal', statut: 'actif', contact: false, email: '', telephone: '' },
  { id: '10', nom: 'YOUNOUS', prenom: 'Amina', diplome: 'Master', annee: 2020, filiere: 'Informatique', poste: 'Chef de projet', entreprise: 'Ministere des Finances', pays: 'Niger', statut: 'inactif', contact: false, email: 'amina.younous@finances.ne', telephone: '' },
  { id: '11', nom: 'SEID', prenom: 'Hassane', diplome: 'Licence', annee: 2024, filiere: 'Droit', poste: 'Juriste', entreprise: 'Societe des Hydrocarbures', pays: 'Tchad', statut: 'actif', contact: true, email: 'hassane.seid@sht.td', telephone: '+235 66 67 89 01' },
  { id: '12', nom: 'HAROUN', prenom: 'Mariam', diplome: 'Master', annee: 2019, filiere: 'Economie', poste: 'Analyste financiere', entreprise: 'BCEAO', pays: 'Cote d\'Ivoire', statut: 'actif', contact: true, email: 'mariam.haroun@bceao.ci', telephone: '+225 07 12 34 56' },
  { id: '13', nom: 'ADAM', prenom: 'Brahim', diplome: 'Licence', annee: 2022, filiere: 'Mathematiques', poste: 'Data Analyst', entreprise: 'Orange Sonatel', pays: 'Senegal', statut: 'inactif', contact: true, email: 'brahim.adam@sonatel.sn', telephone: '+221 78 12 34 56' },
  { id: '14', nom: 'ISSA', prenom: 'Oumar', diplome: 'Master', annee: 2018, filiere: 'Informatique', poste: 'CTO', entreprise: 'TechSahel', pays: 'France', statut: 'injoignable', contact: false, email: '', telephone: '' },
  { id: '15', nom: 'ZAKARIA', prenom: 'Fatoumata', diplome: 'Doctorat', annee: 2016, filiere: 'Medecine', poste: 'Professeur', entreprise: 'Universite de N\'Djamena', pays: 'Tchad', statut: 'actif', contact: true, email: 'fatoumata.zakaria@univ-ndjamena.td', telephone: '+235 66 89 01 23' },
]

const statutConfig: Record<string, { label: string; className: string }> = {
  actif: { label: 'Actif', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' },
  inactif: { label: 'Inactif', className: 'bg-[#d4a85315] text-[#d4a853] border-0' },
  injoignable: { label: 'Injoignable', className: 'bg-[#c6282815] text-[#c62828] border-0' },
}

const careerSteps = [
  { year: '2016', poste: 'Interne en medecine', entreprise: 'CHU de N\'Djamena', lieu: 'N\'Djamena, Tchad' },
  { year: '2018', poste: 'Medecin generaliste', entreprise: 'Hopital General', lieu: 'N\'Djamena, Tchad' },
  { year: '2020', poste: 'Medecin specialiste', entreprise: 'Clinique du Sahel', lieu: 'Dakar, Senegal' },
  { year: '2022', poste: 'Chirurgien', entreprise: 'CHU de Dakar', lieu: 'Dakar, Senegal' },
  { year: '2024', poste: 'Chef de service chirurgie', entreprise: 'CHU de Dakar', lieu: 'Dakar, Senegal' },
]

const geoDistribution = [
  { pays: 'Tchad', count: 1245, pct: 44 },
  { pays: 'Senegal', count: 512, pct: 18 },
  { pays: 'Cameroun', count: 384, pct: 13 },
  { pays: 'Niger', count: 298, pct: 10 },
  { pays: 'Cote d\'Ivoire', count: 213, pct: 8 },
]

const sectorDistribution = [
  { secteur: 'Informatique', count: 684, pct: 24, color: '#1a2744' },
  { secteur: 'Sante', count: 598, pct: 21, color: '#2d7a4f' },
  { secteur: 'Droit', count: 512, pct: 18, color: '#d4a853' },
  { secteur: 'Education', count: 456, pct: 16, color: '#3da66a' },
  { secteur: 'Finance', count: 342, pct: 12, color: '#1a2744' },
]

const graduationYears = [
  { year: '2015', count: 198 },
  { year: '2016', count: 215 },
  { year: '2017', count: 234 },
  { year: '2018', count: 278 },
  { year: '2019', count: 302 },
  { year: '2020', count: 312 },
  { year: '2021', count: 328 },
  { year: '2022', count: 345 },
  { year: '2023', count: 312 },
  { year: '2024', count: 290 },
]

const upcomingEvents = [
  { id: '1', titre: 'Soiree des diplomes 2026', date: '15 Mars 2026', lieu: 'Palais du Congres, N\'Djamena', participants: 320, inscrit: false },
  { id: '2', titre: 'Forum emploi alumni', date: '28 Avril 2026', lieu: 'Campus Universitaire', participants: 185, inscrit: true },
  { id: '3', titre: 'Conference annuelle', date: '10 Juin 2026', lieu: 'Centre Culturel, N\'Djamena', participants: 95, inscrit: false },
]

const donationHistory = [
  { id: '1', date: '15/01/2026', donateur: 'HISSEIN Adam', montant: 25000, methode: 'mobile_money', projet: 'Bourse etudiant' },
  { id: '2', date: '12/01/2026', donateur: 'NADJIKO Marie', montant: 50000, methode: 'virement', projet: 'Equipement labo' },
  { id: '3', date: '08/01/2026', donateur: 'ABDALLAH Ibrahim', montant: 100000, methode: 'cheque', projet: 'Bibliotheque' },
  { id: '4', date: '03/01/2026', donateur: 'MAHAMAT Youssouf', montant: 30000, methode: 'mobile_money', projet: 'Bourse etudiant' },
  { id: '5', date: '28/12/2025', donateur: 'ZAKARIA Fatoumata', montant: 75000, methode: 'virement', projet: 'Infrastructure' },
]

const methodeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  mobile_money: { label: 'Mobile Money', icon: Smartphone, color: '#d4a853' },
  virement: { label: 'Virement', icon: Building, color: '#1a2744' },
  cheque: { label: 'Cheque', icon: Banknote, color: '#2d7a4f' },
}

function formatFCFA(amount: number) {
  return amount.toLocaleString('fr-FR') + ' FCFA'
}

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function AlumniPage() {
  const [search, setSearch] = useState('')
  const [yearFilter, setYearFilter] = useState('tous')
  const [filiereFilter, setFiliereFilter] = useState('tous')
  const [countryFilter, setCountryFilter] = useState('tous')
  const [statusFilter, setStatusFilter] = useState('tous')
  const [selectedAlumnus, setSelectedAlumnus] = useState<string | null>('3')

  const filteredAlumni = demoAlumni.filter((a) => {
    const matchSearch =
      search === '' ||
      `${a.nom} ${a.prenom}`.toLowerCase().includes(search.toLowerCase()) ||
      a.entreprise.toLowerCase().includes(search.toLowerCase())
    const matchYear = yearFilter === 'tous' || a.annee.toString() === yearFilter
    const matchFiliere = filiereFilter === 'tous' || a.filiere === filiereFilter
    const matchCountry = countryFilter === 'tous' || a.pays === countryFilter
    const matchStatus = statusFilter === 'tous' || a.statut === statusFilter
    return matchSearch && matchYear && matchFiliere && matchCountry && matchStatus
  })

  const selectedAlumnusData = demoAlumni.find((a) => a.id === selectedAlumnus)

  const maxGradCount = Math.max(...graduationYears.map((y) => y.count))

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.06 },
    },
  } as const

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  } as const

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1a2744]">Alumni &amp; Anciens etudiants</h1>
          <p className="text-sm text-gray-500">Repertoire des diplomes et suivi des carrieres</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs">
            <Plus className="size-3.5 mr-1.5" />
            Ajouter un alumni
          </Button>
          <Button size="sm" variant="outline" className="text-xs border-[#1a2744] text-[#1a2744] hover:bg-[#1a274410]">
            <Upload className="size-3.5 mr-1.5" />
            Importer
          </Button>
          <Button size="sm" variant="outline" className="text-xs border-[#d4a853] text-[#d4a853] hover:bg-[#d4a85310]" onClick={() => toast.success("Export en préparation...")}>
            <Download className="size-3.5 mr-1.5" />
            Exporter
          </Button>
        </div>
      </motion.div>

      {/* â”€â”€ Stats Cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total diplomes */}
        <Card className="overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a274408] to-[#1a274400] pointer-events-none" />
          <CardContent className="p-4 relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total diplomes</p>
                <p className="text-xl font-bold text-[#1a2744] mt-1">2 847</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="size-3 text-[#2d7a4f]" />
                  <span className="text-[10px] font-medium text-[#2d7a4f]">+5%</span>
                  <span className="text-[10px] text-gray-400">vs annee derniere</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#1a274415] flex items-center justify-center">
                <GraduationCap className="size-5 text-[#1a2744]" />
              </div>
            </div>
            <div className="mt-3">
              <Progress value={78} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#1a2744]" />
              <p className="text-[10px] text-gray-400 mt-1">78% traces</p>
            </div>
          </CardContent>
        </Card>

        {/* En activite */}
        <Card className="overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#2d7a4f08] to-[#2d7a4f00] pointer-events-none" />
          <CardContent className="p-4 relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">En activite</p>
                <p className="text-xl font-bold text-[#2d7a4f] mt-1">1 923</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="size-3 text-[#2d7a4f]" />
                  <span className="text-[10px] font-medium text-[#2d7a4f]">+8%</span>
                  <span className="text-[10px] text-gray-400">vs annee derniere</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#2d7a4f15] flex items-center justify-center">
                <Briefcase className="size-5 text-[#2d7a4f]" />
              </div>
            </div>
            <div className="mt-3">
              <Progress value={68} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#2d7a4f]" />
              <p className="text-[10px] text-gray-400 mt-1">68% en emploi</p>
            </div>
          </CardContent>
        </Card>

        {/* Taux emploi */}
        <Card className="overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#d4a85308] to-[#d4a85300] pointer-events-none" />
          <CardContent className="p-4 relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Taux emploi</p>
                <p className="text-xl font-bold text-[#d4a853] mt-1">72%</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="size-3 text-[#2d7a4f]" />
                  <span className="text-[10px] font-medium text-[#2d7a4f]">+3%</span>
                  <span className="text-[10px] text-gray-400">vs annee derniere</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#d4a85315] flex items-center justify-center">
                <TrendingUp className="size-5 text-[#d4a853]" />
              </div>
            </div>
            <div className="mt-3">
              <Progress value={72} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#d4a853]" />
              <p className="text-[10px] text-gray-400 mt-1">Objectif: 80%</p>
            </div>
          </CardContent>
        </Card>

        {/* Cotisants */}
        <Card className="overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a274408] to-[#1a274400] pointer-events-none" />
          <CardContent className="p-4 relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cotisants</p>
                <p className="text-xl font-bold text-[#1a2744] mt-1">456</p>
                <div className="flex items-center gap-1 mt-1">
                  <ArrowUpRight className="size-3 text-[#2d7a4f]" />
                  <span className="text-[10px] font-medium text-[#2d7a4f]">+12%</span>
                  <span className="text-[10px] text-gray-400">vs annee derniere</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#1a274415] flex items-center justify-center">
                <Users className="size-5 text-[#1a2744]" />
              </div>
            </div>
            <div className="mt-3">
              <Progress value={16} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#1a2744]" />
              <p className="text-[10px] text-gray-400 mt-1">16% des diplomes</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* â”€â”€ Filter & Search Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par nom, entreprise..."
                  className="pl-9 h-9 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger className="w-[120px] h-9 text-xs">
                    <SelectValue placeholder="Annee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Toutes annees</SelectItem>
                    {Array.from({ length: 10 }, (_, i) => 2024 - i).map((y) => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filiereFilter} onValueChange={setFiliereFilter}>
                  <SelectTrigger className="w-[130px] h-9 text-xs">
                    <SelectValue placeholder="Filiere" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Toutes filieres</SelectItem>
                    <SelectItem value="Informatique">Informatique</SelectItem>
                    <SelectItem value="Droit">Droit</SelectItem>
                    <SelectItem value="Medecine">Medecine</SelectItem>
                    <SelectItem value="Economie">Economie</SelectItem>
                    <SelectItem value="Mathematiques">Mathematiques</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger className="w-[130px] h-9 text-xs">
                    <SelectValue placeholder="Pays" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous pays</SelectItem>
                    <SelectItem value="Tchad">Tchad</SelectItem>
                    <SelectItem value="Cameroun">Cameroun</SelectItem>
                    <SelectItem value="Senegal">Senegal</SelectItem>
                    <SelectItem value="Niger">Niger</SelectItem>
                    <SelectItem value="Cote d'Ivoire">Cote d&apos;Ivoire</SelectItem>
                    <SelectItem value="France">France</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[120px] h-9 text-xs">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous statuts</SelectItem>
                    <SelectItem value="actif">Actif</SelectItem>
                    <SelectItem value="inactif">Inactif</SelectItem>
                    <SelectItem value="injoignable">Injoignable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* â”€â”€ Alumni Directory Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-[#1a2744]">Repertoire des alumni</CardTitle>
              <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600 border-0">
                {filteredAlumni.length} resultat{filteredAlumni.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs font-semibold w-8"></TableHead>
                    <TableHead className="text-xs font-semibold">Nom complet</TableHead>
                    <TableHead className="text-xs font-semibold">Diplome</TableHead>
                    <TableHead className="text-xs font-semibold">Annee</TableHead>
                    <TableHead className="text-xs font-semibold">Poste actuel</TableHead>
                    <TableHead className="text-xs font-semibold">Entreprise</TableHead>
                    <TableHead className="text-xs font-semibold">Pays</TableHead>
                    <TableHead className="text-xs font-semibold">Statut</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Contact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAlumni.map((alumnus) => (
                    <TableRow
                      key={alumnus.id}
                      className={`hover:bg-[#2d7a4f05] transition-colors cursor-pointer ${selectedAlumnus === alumnus.id ? 'bg-[#2d7a4f08]' : ''}`}
                      onClick={() => setSelectedAlumnus(alumnus.id)}
                    >
                      <TableCell className="py-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#1a274410] flex items-center justify-center">
                          <span className="text-xs font-semibold text-[#1a2744]">
                            {alumnus.prenom[0]}{alumnus.nom[0]}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div>
                          <p className="text-sm font-medium text-[#1a2744]">{alumnus.nom} {alumnus.prenom}</p>
                          <p className="text-[10px] text-gray-400">{alumnus.filiere}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 py-2.5">{alumnus.diplome}</TableCell>
                      <TableCell className="text-sm text-gray-600 py-2.5">{alumnus.annee}</TableCell>
                      <TableCell className="text-sm text-gray-600 py-2.5">{alumnus.poste}</TableCell>
                      <TableCell className="text-sm text-gray-600 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="size-3.5 text-gray-400" />
                          <span className="truncate max-w-[140px]">{alumnus.entreprise}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="size-3.5 text-gray-400" />
                          <span className="text-sm text-gray-600">{alumnus.pays}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <Badge className={`text-[10px] ${statutConfig[alumnus.statut]?.className || 'bg-gray-100 text-gray-500 border-0'}`}>
                          {statutConfig[alumnus.statut]?.label || alumnus.statut}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2.5 text-center">
                        <Checkbox
                          checked={alumnus.contact}
                          onCheckedChange={() => {}}
                          className="data-[state=checked]:bg-[#2d7a4f] data-[state=checked]:border-[#2d7a4f]"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredAlumni.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-sm text-gray-400">
                        Aucun alumni trouve
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* â”€â”€ Career Tracking + Alumni Network Stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Career Tracking */}
        <motion.div variants={itemVariants}>
          <Card className="h-full border-l-4 border-l-[#1a2744]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-[#1a2744]">Parcours professionnel</CardTitle>
                {selectedAlumnusData && (
                  <Badge className="text-[10px] bg-[#1a274415] text-[#1a2744] border-0">
                    {selectedAlumnusData.nom} {selectedAlumnusData.prenom}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedAlumnusData ? (
                <div className="space-y-0">
                  {/* Alumnus info header */}
                  <div className="flex items-center gap-3 pb-4 mb-4 border-b border-gray-100">
                    <div className="w-12 h-12 rounded-full bg-[#1a274415] flex items-center justify-center">
                      <span className="text-sm font-bold text-[#1a2744]">
                        {selectedAlumnusData.prenom[0]}{selectedAlumnusData.nom[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1a2744]">{selectedAlumnusData.nom} {selectedAlumnusData.prenom}</p>
                      <p className="text-xs text-gray-500">{selectedAlumnusData.diplome} en {selectedAlumnusData.filiere} - {selectedAlumnusData.annee}</p>
                      <div className="flex items-center gap-3 mt-1">
                        {selectedAlumnusData.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="size-3 text-gray-400" />
                            <span className="text-[10px] text-gray-400 truncate max-w-[120px]">{selectedAlumnusData.email}</span>
                          </div>
                        )}
                        {selectedAlumnusData.telephone && (
                          <div className="flex items-center gap-1">
                            <Phone className="size-3 text-gray-400" />
                            <span className="text-[10px] text-gray-400">{selectedAlumnusData.telephone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="relative">
                    {careerSteps.map((step, index) => (
                      <div key={step.year} className="flex gap-4 pb-5 last:pb-0">
                        {/* Timeline line + dot */}
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full shrink-0 ${
                            index === careerSteps.length - 1 ? 'bg-[#2d7a4f] ring-4 ring-[#2d7a4f20]' : 'bg-[#1a2744]'
                          }`} />
                          {index < careerSteps.length - 1 && (
                            <div className="w-0.5 flex-1 bg-gray-200 min-h-[40px]" />
                          )}
                        </div>
                        {/* Step content */}
                        <div className="flex-1 -mt-0.5 pb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-[#1a2744] bg-[#1a274410] px-2 py-0.5 rounded">
                              {step.year}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-[#1a2744] mt-1">{step.poste}</p>
                          <p className="text-xs text-gray-500">{step.entreprise}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <MapPin className="size-3 text-gray-400" />
                            <span className="text-[10px] text-gray-400">{step.lieu}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400">Selectionnez un alumni pour voir son parcours</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Alumni Network Stats */}
        <motion.div variants={itemVariants} className="space-y-4">
          {/* Geographic Distribution */}
          <Card className="border-l-4 border-l-[#2d7a4f]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#1a2744]">Repartition geographique</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {geoDistribution.map((item) => (
                <div key={item.pays} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="size-3.5 text-[#2d7a4f]" />
                      <span className="text-sm font-medium text-[#1a2744]">{item.pays}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{item.count.toLocaleString('fr-FR')}</span>
                      <span className="text-xs font-semibold text-[#1a2744]">{item.pct}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-[#2d7a4f] to-[#3da66a]"
                      initial={{ width: 0 }}
                      animate={{ width: `${item.pct}%` }}
                      transition={{ duration: 0.8, delay: 0.1 }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Sector Distribution */}
          <Card className="border-l-4 border-l-[#d4a853]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#1a2744]">Repartition par secteur</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sectorDistribution.map((item) => (
                <div key={item.secteur} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#1a2744]">{item.secteur}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{item.count}</span>
                      <span className="text-xs font-semibold text-[#1a2744]">{item.pct}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: item.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${item.pct}%` }}
                      transition={{ duration: 0.8, delay: 0.15 }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* â”€â”€ Graduation Year Distribution â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <motion.div variants={itemVariants}>
        <Card className="border-l-4 border-l-[#1a2744]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-[#1a2744]">Diplomes par annee</CardTitle>
              <span className="text-xs text-gray-400">2015 - 2024</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1.5 sm:gap-2.5 h-36">
              {graduationYears.map((item, index) => {
                const heightPercent = (item.count / maxGradCount) * 100
                return (
                  <div key={item.year} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-[#1a2744]">{item.count}</span>
                    <div className="w-full relative" style={{ height: '90px' }}>
                      <motion.div
                        className="absolute bottom-0 w-full rounded-t-md bg-gradient-to-t from-[#1a2744] to-[#3a4d6e]"
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPercent}%` }}
                        transition={{ duration: 0.6, delay: 0.08 * index, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="text-[9px] text-gray-500 font-medium">{item.year}</span>
                  </div>
                )
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">Total diplomes</span>
              <span className="text-sm font-bold text-[#1a2744]">
                {graduationYears.reduce((acc, y) => acc + y.count, 0).toLocaleString('fr-FR')}
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* â”€â”€ Events & Contributions Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Events & Networking */}
        <motion.div variants={itemVariants}>
          <Card className="h-full border-l-4 border-l-[#2d7a4f]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-[#1a2744]">Evenements & Reseautage</CardTitle>
                <PartyPopper className="size-4 text-[#d4a853]" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="p-3 rounded-lg border border-gray-100 hover:border-[#2d7a4f30] hover:bg-[#2d7a4f05] transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1a2744]">{event.titre}</p>
                      <div className="flex flex-col gap-1 mt-1.5">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="size-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{event.date}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="size-3 text-gray-400" />
                          <span className="text-xs text-gray-500 truncate">{event.lieu}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="size-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{event.participants} participants</span>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {event.inscrit ? (
                        <Badge className="text-[10px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">
                          <CheckCircle2 className="size-3 mr-1" />
                          Inscrit
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          className="h-7 text-[10px] bg-[#2d7a4f] hover:bg-[#236b40] text-white"
                          onClick={(e) => {
                            e.stopPropagation()
                          }}
                        >
                          S&apos;inscrire
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-100">
                <Button variant="ghost" size="sm" className="w-full text-xs text-[#2d7a4f] hover:bg-[#2d7a4f10]">
                  Voir tous les evenements
                  <ChevronRight className="size-3.5 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Contributions & Donations */}
        <motion.div variants={itemVariants}>
          <Card className="h-full border-l-4 border-l-[#d4a853]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-[#1a2744]">Cotisations & Dons</CardTitle>
                <HandCoins className="size-4 text-[#d4a853]" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Annual contribution progress */}
              <div className="p-3 rounded-lg bg-[#d4a85308] border border-[#d4a85320]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-[#1a2744]">Cotisation annuelle</span>
                  <span className="text-xs font-bold text-[#d4a853]">
                    {formatFCFA(150000)} / {formatFCFA(500000)}
                  </span>
                </div>
                <Progress value={30} className="h-2.5 bg-[#d4a85315] [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-[#d4a853] [&>[data-slot=progress-indicator]]:to-[#e0be72]" />
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-gray-400">30% de l&apos;objectif</span>
                  <span className="text-[10px] text-gray-400">456 cotisants</span>
                </div>
              </div>

              {/* Donation history */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Derniers dons</p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {donationHistory.map((don) => {
                    const methode = methodeConfig[don.methode]
                    return (
                      <div key={don.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[#1a274410] flex items-center justify-center shrink-0">
                            <HandCoins className="size-4 text-[#d4a853]" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-[#1a2744] truncate">{don.donateur}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-gray-400">{don.date}</span>
                              {methode && (
                                <Badge className="text-[9px] px-1.5 py-0 border-0" style={{ backgroundColor: methode.color + '15', color: methode.color }}>
                                  <methode.icon className="size-2.5 mr-0.5" />
                                  {methode.label}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className="text-xs font-bold text-[#2d7a4f]">{formatFCFA(don.montant)}</p>
                          <p className="text-[10px] text-gray-400">{don.projet}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Total & action */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Total dons</p>
                  <p className="text-sm font-bold text-[#2d7a4f]">{formatFCFA(donationHistory.reduce((acc, d) => acc + d.montant, 0))}</p>
                </div>
                <Button size="sm" className="h-8 text-xs bg-[#d4a853] hover:bg-[#c49a48] text-white">
                  <HandCoins className="size-3.5 mr-1.5" />
                  Faire un don
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}

