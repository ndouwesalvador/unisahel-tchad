'use client'

import { useState } from 'react'
import { exportToExcel } from '@/lib/export'
import { toast } from 'sonner'
import { exportToExcel } from '@/lib/export'
import { motion } from 'framer-motion'
import { exportToExcel } from '@/lib/export'
import { toast } from 'sonner'
import { exportToExcel } from '@/lib/export'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { exportToExcel } from '@/lib/export'
import { toast } from 'sonner'
import { exportToExcel } from '@/lib/export'
import { Button } from '@/components/ui/button'
import { exportToExcel } from '@/lib/export'
import { toast } from 'sonner'
import { exportToExcel } from '@/lib/export'
import { Input } from '@/components/ui/input'
import { exportToExcel } from '@/lib/export'
import { toast } from 'sonner'
import { exportToExcel } from '@/lib/export'
import { Badge } from '@/components/ui/badge'
import { exportToExcel } from '@/lib/export'
import { toast } from 'sonner'
import { exportToExcel } from '@/lib/export'
import { Progress } from '@/components/ui/progress'
import { exportToExcel } from '@/lib/export'
import { toast } from 'sonner'
import { exportToExcel } from '@/lib/export'
import {
import { exportToExcel } from '@/lib/export'
import { toast } from 'sonner'
import { exportToExcel } from '@/lib/export'
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
import { exportToExcel } from '@/lib/export'
import { toast } from 'sonner'
import { exportToExcel } from '@/lib/export'
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
import { exportToExcel } from '@/lib/export'
import { toast } from 'sonner'
import { exportToExcel } from '@/lib/export'
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
import { exportToExcel } from '@/lib/export'
import { toast } from 'sonner'
import { exportToExcel } from '@/lib/export'
  BookOpen,
  BookMarked,
  Monitor,
  Armchair,
  Plus,
  Search,
  Download,
  MoreHorizontal,
  Eye,
  Edit3,
  Trash2,
  TrendingUp,
  Clock,
  ArrowRightLeft,
  Globe,
  ExternalLink,
  Calendar,
  MapPin,
  Users,
  BarChart3,
  Filter,
  Library,
  Database,
  FileSearch,
  Bookmark,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react'

// â”€â”€â”€ Demo Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface CatalogItem {
  id: string
  title: string
  type: 'livre' | 'revue' | 'these' | 'memoire' | 'rapport' | 'ebook'
  category: 'sciences' | 'droit' | 'lettres' | 'medecine' | 'economie'
  status: 'disponible' | 'emprunte' | 'en_reservation' | 'perdu'
  borrowCount: number
  location: string
  returnDate?: string
}

const demoCatalog: CatalogItem[] = [
  { id: '1', title: 'Droit Civil Dalloz 2024', type: 'livre', category: 'droit', status: 'disponible', borrowCount: 42, location: 'Rayon A3' },
  { id: '2', title: "Introduction a l'Algorithmique", type: 'livre', category: 'sciences', status: 'emprunte', borrowCount: 67, location: 'Rayon B1', returnDate: '15/07' },
  { id: '3', title: 'Litterature Africaine Francophone', type: 'livre', category: 'lettres', status: 'disponible', borrowCount: 31, location: 'Rayon C2' },
  { id: '4', title: 'Medecine Interne - Harrison', type: 'livre', category: 'medecine', status: 'emprunte', borrowCount: 89, location: 'Rayon D1', returnDate: '20/07' },
  { id: '5', title: 'Economie du Developpement', type: 'revue', category: 'economie', status: 'disponible', borrowCount: 23, location: 'Rayon E2' },
  { id: '6', title: 'These: Impact du changement climatique au Sahel', type: 'these', category: 'sciences', status: 'disponible', borrowCount: 15, location: 'Rayon B3' },
  { id: '7', title: 'Constitution de la Republique du Tchad', type: 'rapport', category: 'droit', status: 'en_reservation', borrowCount: 56, location: 'Rayon A1' },
  { id: '8', title: 'Physique Quantique - Feynman', type: 'livre', category: 'sciences', status: 'disponible', borrowCount: 78, location: 'Rayon B2' },
  { id: '9', title: 'Philosophie Africaine Contemporaine', type: 'livre', category: 'lettres', status: 'emprunte', borrowCount: 34, location: 'Rayon C1', returnDate: '18/07' },
  { id: '10', title: 'Mathematiques Appliquees - Tome 2', type: 'livre', category: 'sciences', status: 'disponible', borrowCount: 45, location: 'Rayon B4' },
  { id: '11', title: 'Journal of African Law 2024', type: 'revue', category: 'droit', status: 'disponible', borrowCount: 19, location: 'Rayon A2' },
  { id: '12', title: 'Sante Publique en Afrique Centrale', type: 'rapport', category: 'medecine', status: 'disponible', borrowCount: 27, location: 'Rayon D2' },
  { id: '13', title: 'Histoire du Tchad Contemporain', type: 'livre', category: 'lettres', status: 'disponible', borrowCount: 52, location: 'Rayon C3' },
  { id: '14', title: 'Master IA & Data Science', type: 'ebook', category: 'sciences', status: 'disponible', borrowCount: 38, location: 'Numerique' },
  { id: '15', title: 'Droit International Humanitaire', type: 'livre', category: 'droit', status: 'perdu', borrowCount: 12, location: 'Rayon A4' },
]

interface BorrowRecord {
  id: string
  studentName: string
  matricule: string
  bookTitle: string
  dateEmprunt: string
  dateRetourPrevue: string
  status: 'en_retard' | 'a_l_heure'
}

const demoBorrows: BorrowRecord[] = [
  { id: '1', studentName: 'ABAKAR Adam', matricule: 'UDN/L3/2024/001', bookTitle: "Introduction a l'Algorithmique", dateEmprunt: '01/07/2025', dateRetourPrevue: '15/07/2025', status: 'en_retard' },
  { id: '2', studentName: 'KHAMIS Fatime', matricule: 'UDN/M1/2024/002', bookTitle: 'Medecine Interne - Harrison', dateEmprunt: '05/07/2025', dateRetourPrevue: '20/07/2025', status: 'a_l_heure' },
  { id: '3', studentName: 'MAHAMAT Youssouf', matricule: 'UDN/L2/2024/003', bookTitle: 'Philosophie Africaine Contemporaine', dateEmprunt: '03/07/2025', dateRetourPrevue: '18/07/2025', status: 'a_l_heure' },
  { id: '4', studentName: 'NGARNDMI Halime', matricule: 'UDN/L1/2024/004', bookTitle: 'Droit Civil Dalloz 2024', dateEmprunt: '10/06/2025', dateRetourPrevue: '25/06/2025', status: 'en_retard' },
  { id: '5', studentName: 'HISSEIN Mariam', matricule: 'UDN/L3/2024/005', bookTitle: 'Economie du Developpement', dateEmprunt: '08/07/2025', dateRetourPrevue: '23/07/2025', status: 'a_l_heure' },
  { id: '6', studentName: 'ISSA Mahamat Nour', matricule: 'UDN/M2/2024/006', bookTitle: 'Physique Quantique - Feynman', dateEmprunt: '15/06/2025', dateRetourPrevue: '30/06/2025', status: 'en_retard' },
  { id: '7', studentName: 'ADAM Khadija', matricule: 'UDN/L2/2024/007', bookTitle: 'Mathematiques Appliquees - Tome 2', dateEmprunt: '12/07/2025', dateRetourPrevue: '27/07/2025', status: 'a_l_heure' },
  { id: '8', studentName: 'BICHARA Hawa', matricule: 'UDN/L1/2024/008', bookTitle: 'Histoire du Tchad Contemporain', dateEmprunt: '20/06/2025', dateRetourPrevue: '05/07/2025', status: 'en_retard' },
]

interface DigitalResource {
  id: string
  name: string
  description: string
  count: string
  icon: React.ElementType
  color: string
  accessCount: number
}

const demoDigitalResources: DigitalResource[] = [
  { id: '1', name: 'Base de donnees Cairn.info', description: 'Revues scientifiques', count: '2,400 titres', icon: Database, color: '#1a2744', accessCount: 1245 },
  { id: '2', name: 'JSTOR Africa', description: 'Archives academiques', count: '1,200 documents', icon: Library, color: '#2d7a4f', accessCount: 876 },
  { id: '3', name: 'Google Scholar', description: 'Moteur de recherche', count: 'Acces libre', icon: Search, color: '#d4a853', accessCount: 3450 },
  { id: '4', name: 'UNESCO Digital Library', description: 'Publications internationales', count: '560 docs', icon: Globe, color: '#1a2744', accessCount: 432 },
  { id: '5', name: 'African Journals Online', description: 'Revues africaines', count: '890 titres', icon: BookOpen, color: '#2d7a4f', accessCount: 678 },
  { id: '6', name: 'OpenEdition', description: 'Livres et revues ouvertes', count: '320 docs', icon: ExternalLink, color: '#d4a853', accessCount: 567 },
]

interface RoomSpace {
  id: string
  name: string
  capacity: string
  type: 'lecture' | 'multimedia' | 'these' | 'periodiques' | 'individuel'
  occupancy: number
}

const demoRooms: RoomSpace[] = [
  { id: '1', name: 'Salle de lecture', capacity: '150 places', type: 'lecture', occupancy: 87 },
  { id: '2', name: 'Salle multimedia', capacity: '40 postes', type: 'multimedia', occupancy: 65 },
  { id: '3', name: 'Salle de these', capacity: '30 places', type: 'these', occupancy: 93 },
  { id: '4', name: 'Espace periodiques', capacity: '50 places', type: 'periodiques', occupancy: 42 },
  { id: '5', name: 'Box individuels', capacity: '20 places', type: 'individuel', occupancy: 75 },
]

// â”€â”€â”€ Config Maps â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const typeConfig: Record<string, { label: string; className: string }> = {
  livre: { label: 'Livre', className: 'bg-[#1a274415] text-[#1a2744] border-0' },
  revue: { label: 'Revue', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' },
  these: { label: 'These', className: 'bg-[#8b5cf615] text-[#8b5cf6] border-0' },
  memoire: { label: 'Memoire', className: 'bg-[#0891b215] text-[#0891b2] border-0' },
  rapport: { label: 'Rapport', className: 'bg-[#d4a85315] text-[#d4a853] border-0' },
  ebook: { label: 'E-book', className: 'bg-[#ea580c15] text-[#ea580c] border-0' },
}

const categoryConfig: Record<string, { label: string; className: string }> = {
  sciences: { label: 'Sciences', className: 'bg-blue-50 text-blue-700 border-0' },
  droit: { label: 'Droit', className: 'bg-purple-50 text-purple-700 border-0' },
  lettres: { label: 'Lettres', className: 'bg-amber-50 text-amber-700 border-0' },
  medecine: { label: 'Medecine', className: 'bg-red-50 text-red-700 border-0' },
  economie: { label: 'Economie', className: 'bg-emerald-50 text-emerald-700 border-0' },
}

const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  disponible: { label: 'Disponible', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0', icon: CheckCircle2 },
  emprunte: { label: 'Emprunte', className: 'bg-[#d4a85315] text-[#d4a853] border-0', icon: Clock },
  en_reservation: { label: 'En reservation', className: 'bg-[#3b82f615] text-[#3b82f6] border-0', icon: Bookmark },
  perdu: { label: 'Perdu', className: 'bg-[#c6282815] text-[#c62828] border-0', icon: XCircle },
}

const borrowStatusConfig: Record<string, { label: string; className: string }> = {
  en_retard: { label: 'En retard', className: 'bg-[#c6282815] text-[#c62828] border-0' },
  a_l_heure: { label: "A l'heure", className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' },
}

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function LibraryPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('tous')
  const [categoryFilter, setCategoryFilter] = useState('tous')
  const [statusFilter, setStatusFilter] = useState('tous')
  const [languageFilter, setLanguageFilter] = useState('tous')
  const [borrowSearch, setBorrowSearch] = useState('')
  const [returnedBorrows, setReturnedBorrows] = useState<Set<string>>(new Set())

  // Filter catalog
  const filteredCatalog = demoCatalog.filter(item => {
    const matchSearch = search === '' ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.location.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'tous' || item.type === typeFilter
    const matchCategory = categoryFilter === 'tous' || item.category === categoryFilter
    const matchStatus = statusFilter === 'tous' || item.status === statusFilter
    return matchSearch && matchType && matchCategory && matchStatus
  })

  // Filter borrows
  const filteredBorrows = demoBorrows.filter(b => {
    const matchSearch = borrowSearch === '' ||
      b.studentName.toLowerCase().includes(borrowSearch.toLowerCase()) ||
      b.bookTitle.toLowerCase().includes(borrowSearch.toLowerCase()) ||
      b.matricule.toLowerCase().includes(borrowSearch.toLowerCase())
    return matchSearch
  })

  // Stats
  const activeBorrows = demoBorrows.length
  const overdueCount = demoBorrows.filter(b => b.status === 'en_retard').length

  // Monthly borrows data for chart
  const monthlyBorrows = [
    { month: 'Jan', count: 285 },
    { month: 'Fev', count: 312 },
    { month: 'Mar', count: 278 },
    { month: 'Avr', count: 345 },
    { month: 'Mai', count: 298 },
    { month: 'Juin', count: 234 },
  ]
  const maxBorrow = Math.max(...monthlyBorrows.map(m => m.count))

  // Top categories
  const topCategories = [
    { name: 'Sciences', count: 3456, total: 12847, color: '#1a2744' },
    { name: 'Droit', count: 2890, total: 12847, color: '#2d7a4f' },
    { name: 'Lettres', count: 2345, total: 12847, color: '#d4a853' },
    { name: 'Medecine', count: 2100, total: 12847, color: '#c62828' },
    { name: 'Economie', count: 1856, total: 12847, color: '#0891b2' },
  ]

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

  const handleReturn = (borrowId: string) => {
    setReturnedBorrows(prev => {
      const next = new Set(prev)
      next.add(borrowId)
      return next
    })
  }

  const getOccupancyColor = (occ: number) => {
    if (occ >= 90) return 'bg-red-500'
    if (occ >= 60) return 'bg-amber-500'
    return 'bg-green-500'
  }

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
          <h1 className="text-xl font-bold text-[#1a2744]">Bibliotheque &amp; Ressources</h1>
          <p className="text-sm text-gray-500">Gestion du patrimoine documentaire et des ressources academiques</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs">
            <Plus className="size-3.5 mr-1.5" />
            Nouveau document
          </Button>
          <Button size="sm" variant="outline" className="text-xs border-[#1a274430] text-[#1a2744] hover:bg-[#1a274408]">
            <FileSearch className="size-3.5 mr-1.5" />
            Recherche avancee
          </Button>
          <Button size="sm" variant="outline" className="text-xs border-[#1a274430] text-[#1a2744] hover:bg-[#1a274408]" onClick={() => exportToExcel(filteredCatalog, 'export_library')}>
            <Download className="size-3.5 mr-1.5" />
            Exporter le catalogue
          </Button>
        </div>
      </motion.div>

      {/* â”€â”€ Stats Cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ouvrages */}
        <Card className="overflow-hidden relative border-l-4 border-l-[#1a2744] hover:shadow-md transition-shadow">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a274408] to-[#1a274400] pointer-events-none" />
          <CardContent className="p-4 relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ouvrages</p>
                <p className="text-xl font-bold text-[#1a2744] mt-1">12,847</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="size-3 text-[#2d7a4f]" />
                  <span className="text-xs text-[#2d7a4f] font-medium">+3.2%</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#1a274415] flex items-center justify-center">
                <BookOpen className="size-5 text-[#1a2744]" />
              </div>
            </div>
            <div className="mt-3">
              <Progress value={78} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#1a2744]" />
            </div>
          </CardContent>
        </Card>

        {/* Emprunts actifs */}
        <Card className="overflow-hidden relative border-l-4 border-l-[#2d7a4f] hover:shadow-md transition-shadow">
          <div className="absolute inset-0 bg-gradient-to-br from-[#2d7a4f08] to-[#2d7a4f00] pointer-events-none" />
          <CardContent className="p-4 relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Emprunts actifs</p>
                <p className="text-xl font-bold text-[#2d7a4f] mt-1">234</p>
                <p className="text-xs text-gray-400 mt-1">{overdueCount} en retard</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#2d7a4f15] flex items-center justify-center">
                <BookMarked className="size-5 text-[#2d7a4f]" />
              </div>
            </div>
            <div className="mt-3">
              <Progress value={35} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#2d7a4f]" />
            </div>
          </CardContent>
        </Card>

        {/* Ressources numeriques */}
        <Card className="overflow-hidden relative border-l-4 border-l-[#d4a853] hover:shadow-md transition-shadow">
          <div className="absolute inset-0 bg-gradient-to-br from-[#d4a85308] to-[#d4a85300] pointer-events-none" />
          <CardContent className="p-4 relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ressources numeriques</p>
                <p className="text-xl font-bold text-[#d4a853] mt-1">3,456</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="size-3 text-[#2d7a4f]" />
                  <span className="text-xs text-[#2d7a4f] font-medium">+15%</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#d4a85315] flex items-center justify-center">
                <Monitor className="size-5 text-[#d4a853]" />
              </div>
            </div>
            <div className="mt-3">
              <Progress value={62} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#d4a853]" />
            </div>
          </CardContent>
        </Card>

        {/* Places assises */}
        <Card className="overflow-hidden relative border-l-4 border-l-[#1a2744] hover:shadow-md transition-shadow">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a274408] to-[#1a274400] pointer-events-none" />
          <CardContent className="p-4 relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Places assises</p>
                <p className="text-xl font-bold text-[#1a2744] mt-1">320</p>
                <p className="text-xs text-gray-400 mt-1">92% occupees</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#1a274415] flex items-center justify-center">
                <Armchair className="size-5 text-[#1a2744]" />
              </div>
            </div>
            <div className="mt-3">
              <Progress value={92} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-[#2d7a4f] [&>[data-slot=progress-indicator]]:to-[#d4a853]" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* â”€â”€ Search & Filter Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par titre, auteur, ISBN, mot-cle..."
                  className="pl-9 h-10 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[140px] h-9 text-xs">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous les types</SelectItem>
                    <SelectItem value="livre">Livre</SelectItem>
                    <SelectItem value="revue">Revue</SelectItem>
                    <SelectItem value="these">These</SelectItem>
                    <SelectItem value="memoire">Memoire</SelectItem>
                    <SelectItem value="rapport">Rapport</SelectItem>
                    <SelectItem value="ebook">E-book</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[140px] h-9 text-xs">
                    <SelectValue placeholder="Categorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Toutes categories</SelectItem>
                    <SelectItem value="sciences">Sciences</SelectItem>
                    <SelectItem value="droit">Droit</SelectItem>
                    <SelectItem value="lettres">Lettres</SelectItem>
                    <SelectItem value="medecine">Medecine</SelectItem>
                    <SelectItem value="economie">Economie</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px] h-9 text-xs">
                    <SelectValue placeholder="Disponibilite" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous les statuts</SelectItem>
                    <SelectItem value="disponible">Disponible</SelectItem>
                    <SelectItem value="emprunte">Emprunte</SelectItem>
                    <SelectItem value="en_reservation">En reservation</SelectItem>
                    <SelectItem value="perdu">Perdu</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={languageFilter} onValueChange={setLanguageFilter}>
                  <SelectTrigger className="w-[130px] h-9 text-xs">
                    <SelectValue placeholder="Langue" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Toutes langues</SelectItem>
                    <SelectItem value="francais">Francais</SelectItem>
                    <SelectItem value="anglais">Anglais</SelectItem>
                    <SelectItem value="arabe">Arabe</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" className="text-xs text-gray-500 h-9">
                  <Filter className="size-3.5 mr-1.5" />
                  Reinitialiser
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* â”€â”€ Catalog Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="text-sm font-semibold text-[#1a2744]">Catalogue documentaire</CardTitle>
              <p className="text-xs text-gray-400">{filteredCatalog.length} ouvrages trouves</p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs font-semibold">Titre</TableHead>
                    <TableHead className="text-xs font-semibold">Type</TableHead>
                    <TableHead className="text-xs font-semibold">Categorie</TableHead>
                    <TableHead className="text-xs font-semibold">Statut</TableHead>
                    <TableHead className="text-xs font-semibold text-center">Emprunts</TableHead>
                    <TableHead className="text-xs font-semibold">Localisation</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCatalog.map((item) => {
                    const tConf = typeConfig[item.type]
                    const cConf = categoryConfig[item.category]
                    const sConf = statusConfig[item.status]
                    const StatusIcon = sConf?.icon
                    return (
                      <TableRow
                        key={item.id}
                        className="hover:bg-[#2d7a4f05] transition-colors cursor-pointer"
                      >
                        <TableCell className="py-2.5">
                          <div>
                            <p className="text-sm font-medium text-[#1a2744]">{item.title}</p>
                            {item.returnDate && (
                              <p className="text-[10px] text-[#d4a853] mt-0.5">Retour prevu: {item.returnDate}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5">
                          {tConf ? (
                            <Badge className={`text-[10px] ${tConf.className}`}>
                              {tConf.label}
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell className="py-2.5">
                          {cConf ? (
                            <Badge className={`text-[10px] ${cConf.className}`}>
                              {cConf.label}
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell className="py-2.5">
                          {sConf ? (
                            <Badge className={`text-[10px] ${sConf.className}`}>
                              {StatusIcon && <StatusIcon className="size-3 mr-1" />}
                              {sConf.label}
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-center py-2.5">
                          <span className="text-sm font-semibold text-[#1a2744]">{item.borrowCount}</span>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="size-3 text-gray-400" />
                            <span className="text-xs text-gray-600">{item.location}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-2.5">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-gray-100">
                                <MoreHorizontal className="size-4 text-gray-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem className="text-xs">
                                <Eye className="size-3.5 mr-2" />
                                Consulter
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs">
                                <ArrowRightLeft className="size-3.5 mr-2" />
                                Emprunter
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs">
                                <Bookmark className="size-3.5 mr-2" />
                                Reserver
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs">
                                <Edit3 className="size-3.5 mr-2" />
                                Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs text-red-600">
                                <Trash2 className="size-3.5 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {filteredCatalog.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-sm text-gray-400">
                        Aucun ouvrage trouve
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* â”€â”€ Emprunts & Retours Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <motion.div variants={itemVariants}>
        <Card className="border-l-4 border-l-[#2d7a4f]">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BookMarked className="size-4 text-[#2d7a4f]" />
                <CardTitle className="text-sm font-semibold text-[#1a2744]">Emprunts en cours</CardTitle>
                <Badge className="text-[10px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">{activeBorrows}</Badge>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  placeholder="Rechercher un emprunt..."
                  className="pl-9 h-8 text-xs"
                  value={borrowSearch}
                  onChange={(e) => setBorrowSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs font-semibold">Etudiant</TableHead>
                    <TableHead className="text-xs font-semibold">Ouvrage</TableHead>
                    <TableHead className="text-xs font-semibold">Date emprunt</TableHead>
                    <TableHead className="text-xs font-semibold">Retour prevu</TableHead>
                    <TableHead className="text-xs font-semibold">Statut</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBorrows.map((borrow) => {
                    const bConf = borrowStatusConfig[borrow.status]
                    const isReturned = returnedBorrows.has(borrow.id)
                    const isOverdue = borrow.status === 'en_retard'
                    return (
                      <TableRow
                        key={borrow.id}
                        className={`transition-colors ${isOverdue && !isReturned ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-[#2d7a4f05]'} ${isReturned ? 'opacity-50' : ''}`}
                      >
                        <TableCell className="py-2.5">
                          <div>
                            <p className="text-sm font-medium text-[#1a2744]">{borrow.studentName}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{borrow.matricule}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-gray-600 py-2.5 max-w-[200px] truncate">{borrow.bookTitle}</TableCell>
                        <TableCell className="text-xs text-gray-500 py-2.5">{borrow.dateEmprunt}</TableCell>
                        <TableCell className="text-xs text-gray-500 py-2.5">{borrow.dateRetourPrevue}</TableCell>
                        <TableCell className="py-2.5">
                          {isReturned ? (
                            <Badge className="text-[10px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">
                              <CheckCircle2 className="size-3 mr-1" />
                              Rendu
                            </Badge>
                          ) : bConf ? (
                            <Badge className={`text-[10px] ${bConf.className}`}>
                              {isOverdue && <AlertTriangle className="size-3 mr-1" />}
                              {bConf.label}
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right py-2.5">
                          {!isReturned && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] border-[#2d7a4f30] text-[#2d7a4f] hover:bg-[#2d7a4f10]"
                              onClick={() => handleReturn(borrow.id)}
                            >
                              <ArrowRightLeft className="size-3 mr-1" />
                              Retourner
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {filteredBorrows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-sm text-gray-400">
                        Aucun emprunt trouve
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* â”€â”€ Ressources Numeriques Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <motion.div variants={itemVariants}>
        <Card className="border-l-4 border-l-[#d4a853]">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Monitor className="size-4 text-[#d4a853]" />
              <CardTitle className="text-sm font-semibold text-[#1a2744]">Ressources numeriques</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {demoDigitalResources.map((resource) => {
                const ResourceIcon = resource.icon
                return (
                  <motion.div
                    key={resource.id}
                    whileHover={{ scale: 1.02 }}
                    className="p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all bg-white"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${resource.color}15` }}
                      >
                        <ResourceIcon className="size-5" style={{ color: resource.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#1a2744] truncate">{resource.name}</p>
                        <p className="text-xs text-gray-500">{resource.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-gray-400">{resource.count}</span>
                          <span className="text-gray-200">|</span>
                          <span className="text-[10px] text-gray-400">{resource.accessCount} acces</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-3 h-8 text-[10px] border-gray-200 text-[#1a2744] hover:bg-[#1a274408]"
                    >
                      <ExternalLink className="size-3 mr-1.5" />
                      Acceder
                    </Button>
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* â”€â”€ Horaires & Espaces Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <motion.div variants={itemVariants}>
        <Card className="border-l-4 border-l-[#1a2744]">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-[#1a2744]" />
                <CardTitle className="text-sm font-semibold text-[#1a2744]">Horaires &amp; Espaces</CardTitle>
              </div>
              <Button size="sm" className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs h-8">
                <MapPin className="size-3.5 mr-1.5" />
                Reserver un espace
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Weekly Schedule */}
            <div>
              <p className="text-xs font-semibold text-[#1a2744] mb-3 uppercase tracking-wide">Horaires d&apos;ouverture</p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-xs font-semibold">Jour</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Ouverture</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Fermeture</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Affluence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { day: 'Lundi', open: '08h00', close: '22h00', affluence: 75 },
                      { day: 'Mardi', open: '08h00', close: '22h00', affluence: 82 },
                      { day: 'Mercredi', open: '08h00', close: '22h00', affluence: 65 },
                      { day: 'Jeudi', open: '08h00', close: '22h00', affluence: 88 },
                      { day: 'Vendredi', open: '08h00', close: '22h00', affluence: 70 },
                      { day: 'Samedi', open: '09h00', close: '18h00', affluence: 45 },
                    ].map((row) => (
                      <TableRow key={row.day} className="hover:bg-[#2d7a4f05] transition-colors">
                        <TableCell className="text-sm font-medium text-[#1a2744] py-2">{row.day}</TableCell>
                        <TableCell className="text-xs text-gray-600 py-2 text-center">{row.open}</TableCell>
                        <TableCell className="text-xs text-gray-600 py-2 text-center">{row.close}</TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${getOccupancyColor(row.affluence)}`}
                                style={{ width: `${row.affluence}%` }}
                              />
                            </div>
                            <div className={`w-2 h-2 rounded-full ${getOccupancyColor(row.affluence)}`} />
                            <span className="text-[10px] text-gray-500">{row.affluence}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Room Allocation */}
            <div>
              <p className="text-xs font-semibold text-[#1a2744] mb-3 uppercase tracking-wide">Allocation des espaces</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {demoRooms.map((room) => (
                  <div key={room.id} className="p-3 rounded-lg border border-gray-100 bg-white hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${getOccupancyColor(room.occupancy)}`} />
                      <span className="text-xs font-semibold text-[#1a2744]">{room.name}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mb-2">{room.capacity}</p>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${getOccupancyColor(room.occupancy)}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${room.occupancy}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">{room.occupancy}% occupe</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="text-[10px] text-gray-500">Disponible</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-[10px] text-gray-500">Modere</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-[10px] text-gray-500">Sature</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* â”€â”€ Statistiques d'Utilisation Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <motion.div variants={itemVariants}>
        <Card className="border-l-4 border-l-[#2d7a4f]">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-[#2d7a4f]" />
              <CardTitle className="text-sm font-semibold text-[#1a2744]">Statistiques d&apos;utilisation</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Monthly Borrows Bar Chart */}
            <div>
              <p className="text-xs font-semibold text-[#1a2744] mb-3 uppercase tracking-wide">Emprunts mensuels (2025)</p>
              <div className="flex items-end gap-3 h-40">
                {monthlyBorrows.map((month, index) => {
                  const heightPercent = maxBorrow > 0 ? (month.count / maxBorrow) * 100 : 0
                  return (
                    <div key={month.month} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] font-semibold text-[#1a2744]">{month.count}</span>
                      <div className="w-full bg-gray-100 rounded-t-sm relative" style={{ height: '120px' }}>
                        <motion.div
                          className="absolute bottom-0 w-full rounded-t-sm bg-gradient-to-t from-[#1a2744] to-[#2d7a4f]"
                          initial={{ height: 0 }}
                          animate={{ height: `${heightPercent}%` }}
                          transition={{ duration: 0.6, delay: 0.1 * index, ease: 'easeOut' }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-500">{month.month}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Top 5 Categories + Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Categories */}
              <div>
                <p className="text-xs font-semibold text-[#1a2744] mb-3 uppercase tracking-wide">Top 5 categories les plus empruntees</p>
                <div className="space-y-3">
                  {topCategories.map((cat, index) => {
                    const percent = cat.total > 0 ? Math.round((cat.count / cat.total) * 100) : 0
                    return (
                      <div key={cat.name} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                            <span className="text-xs font-medium text-[#1a2744]">{cat.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400">{cat.count.toLocaleString('fr-FR')}</span>
                            <span className="text-xs font-semibold text-[#1a2744]">{percent}%</span>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: cat.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${percent}%` }}
                            transition={{ duration: 0.6, delay: 0.1 * index, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Key Metrics */}
              <div className="space-y-4">
                <p className="text-xs font-semibold text-[#1a2744] mb-3 uppercase tracking-wide">Indicateurs cles</p>
                {/* Active borrowers */}
                <div className="p-3 rounded-lg bg-[#1a274408] border border-[#1a274410]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-[#1a2744]" />
                      <span className="text-sm font-semibold text-[#1a2744]">Emprunteurs actifs</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="size-3 text-[#2d7a4f]" />
                      <span className="text-xs text-[#2d7a4f] font-medium">+8%</span>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-[#1a2744]">1,456</p>
                  <p className="text-[10px] text-gray-400 mt-1">sur 4,200 etudiats inscrits a la bibliotheque</p>
                  <Progress value={35} className="h-1.5 bg-gray-200 mt-2 [&>[data-slot=progress-indicator]]:bg-[#1a2744]" />
                </div>

                {/* Average borrow duration */}
                <div className="p-3 rounded-lg bg-[#2d7a4f08] border border-[#2d7a4f10]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="size-4 text-[#2d7a4f]" />
                      <span className="text-sm font-semibold text-[#1a2744]">Duree moyenne d&apos;emprunt</span>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-[#2d7a4f]">14 <span className="text-sm font-normal text-gray-500">jours</span></p>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((d) => (
                        <div
                          key={d}
                          className={`w-2 h-4 rounded-sm ${d <= 10 ? 'bg-[#2d7a4f]' : 'bg-[#d4a853]'}`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-gray-400 ml-1">Objectif: 10 jours</span>
                  </div>
                </div>

                {/* Retour rate */}
                <div className="p-3 rounded-lg bg-[#d4a85308] border border-[#d4a85310]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-[#d4a853]" />
                      <span className="text-sm font-semibold text-[#1a2744]">Taux de retour a temps</span>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-[#d4a853]">87<span className="text-sm font-normal text-gray-500">%</span></p>
                  <Progress value={87} className="h-1.5 bg-gray-200 mt-2 [&>[data-slot=progress-indicator]]:bg-[#d4a853]" />
                  <p className="text-[10px] text-gray-400 mt-1">13% de retards constates ce mois</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}


