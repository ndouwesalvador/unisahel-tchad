'use client'

import { exportToExcel } from '@/lib/export'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { useLibrary, useStudents } from '@/lib/api-hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  BookOpen,
  BookMarked,
  Monitor,
  Armchair,
  Plus,
  Search,
  Download,
  Eye,
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
  Clock,
  Loader2,
  Save,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface CatalogItem {
  id: string
  title: string
  type: 'livre' | 'revue' | 'these' | 'memoire' | 'rapport' | 'ebook'
  category: 'sciences' | 'droit' | 'lettres' | 'medecine' | 'economie'
  status: 'disponible' | 'emprunte' | 'en_reservation' | 'perdu'
  borrowCount: number
  location: string
  totalCopies: number
  availableCopies: number
  returnDate?: string
}

interface BorrowRecord {
  id: string
  studentName: string
  matricule: string
  bookTitle: string
  dateEmprunt: string
  dateRetourPrevue: string
  status: 'en_retard' | 'a_l_heure'
}

interface RoomSpace {
  id: string
  name: string
  type: string
  capacity: number
  occupancy: number
}

interface DigitalResource {
  id: string
  name: string
  description: string
  href: string
  icon: React.ElementType
  color: string
}

interface LibraryStats {
  totalResources: number
  totalCopies: number
  availableCopies: number
  activeLoans: number
  overdueLoans: number
  totalRoomCapacity: number
  totalRoomOccupancy: number
  avgOccupancyPercent: number
  activeBorrowersCount: number
  totalStudents: number
  avgBorrowDurationDays: number | null
  onTimeReturnRatePercent: number | null
  totalLoansAllTime: number
  monthlyBorrows: { month: string; count: number }[]
  topCategories: { category: string; count: number }[]
}

// ─── Ressources numeriques ────────────────────────────────────────────────────
// Curated links to real external academic databases. This is static config,
// not tenant data (no Prisma model backs it). The old version of this card
// showed invented usage numbers ("2,400 titres", "1245 acces", etc.) - those
// were fabricated and have been removed. This is now a simple link-out list
// pointing at each service's real public URL.

const digitalResources: DigitalResource[] = [
  { id: '1', name: 'Cairn.info', description: 'Revues scientifiques francophones', href: 'https://www.cairn.info', icon: Database, color: '#1a2744' },
  { id: '2', name: 'JSTOR Africa', description: "Archives academiques, acces initiative Afrique", href: 'https://about.jstor.org/africa/', icon: Library, color: '#2d7a4f' },
  { id: '3', name: 'Google Scholar', description: 'Moteur de recherche academique', href: 'https://scholar.google.com', icon: Search, color: '#d4a853' },
  { id: '4', name: 'UNESCO Digital Library', description: 'Publications internationales', href: 'https://unesdoc.unesco.org', icon: Globe, color: '#1a2744' },
  { id: '5', name: 'African Journals Online', description: 'Revues academiques africaines', href: 'https://www.ajol.info', icon: BookOpen, color: '#2d7a4f' },
  { id: '6', name: 'OpenEdition', description: 'Livres et revues en acces ouvert', href: 'https://www.openedition.org', icon: ExternalLink, color: '#d4a853' },
]

// ─── Weekly opening hours ────────────────────────────────────────────────────
// Static institutional schedule (real, but not tenant-specific data - there is
// no Prisma model for it). The former "Affluence" column shown next to these
// hours was a fabricated per-day occupancy percentage with no backing
// check-in/attendance tracking system, so it has been removed rather than
// kept as invented data.

const weeklySchedule = [
  { day: 'Lundi', open: '08h00', close: '22h00' },
  { day: 'Mardi', open: '08h00', close: '22h00' },
  { day: 'Mercredi', open: '08h00', close: '22h00' },
  { day: 'Jeudi', open: '08h00', close: '22h00' },
  { day: 'Vendredi', open: '08h00', close: '22h00' },
  { day: 'Samedi', open: '09h00', close: '18h00' },
]

// ─── API Mapping ────────────────────────────────────────────────────────────

const knownTypes = ['livre', 'revue', 'these', 'memoire', 'rapport', 'ebook'] as const
type KnownType = typeof knownTypes[number]
const knownCategories = ['sciences', 'droit', 'lettres', 'medecine', 'economie'] as const
type KnownCategory = typeof knownCategories[number]
const knownCatalogStatuses = ['disponible', 'emprunte', 'en_reservation', 'perdu'] as const
type KnownCatalogStatus = typeof knownCatalogStatuses[number]

function isKnownType(value: string): value is KnownType {
  return (knownTypes as readonly string[]).includes(value)
}

function isKnownCategory(value: string): value is KnownCategory {
  return (knownCategories as readonly string[]).includes(value)
}

function isKnownCatalogStatus(value: string): value is KnownCatalogStatus {
  return (knownCatalogStatuses as readonly string[]).includes(value)
}

interface CatalogApiRecord {
  id: string
  title: string
  type: string
  category: string
  status: string
  borrowCount: number
  location: string
  totalCopies: number
  availableCopies: number
  returnDate: string | null
}

function mapCatalogItem(r: CatalogApiRecord): CatalogItem {
  return {
    id: r.id,
    title: r.title,
    type: isKnownType(r.type) ? r.type : 'livre',
    category: isKnownCategory(r.category) ? r.category : 'sciences',
    status: isKnownCatalogStatus(r.status) ? r.status : 'disponible',
    borrowCount: r.borrowCount,
    location: r.location || '',
    totalCopies: r.totalCopies,
    availableCopies: r.availableCopies,
    returnDate: r.returnDate || undefined,
  }
}

interface BorrowApiRecord {
  id: string
  studentName: string
  matricule: string
  bookTitle: string
  dateEmprunt: string
  dateRetourPrevue: string
  status: string
}

function mapBorrow(r: BorrowApiRecord): BorrowRecord {
  return {
    id: r.id,
    studentName: r.studentName,
    matricule: r.matricule,
    bookTitle: r.bookTitle,
    dateEmprunt: r.dateEmprunt,
    dateRetourPrevue: r.dateRetourPrevue,
    status: r.status === 'en_retard' ? 'en_retard' : 'a_l_heure',
  }
}

interface RoomApiRecord {
  id: string
  name: string
  type: string
  capacity: number
  occupancy: number
}

function mapRoom(r: RoomApiRecord): RoomSpace {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    capacity: r.capacity,
    occupancy: r.occupancy,
  }
}

interface StudentApiRecord {
  id: string
  firstName: string
  lastName: string
  matricule: string | null
}

interface StudentOption {
  id: string
  label: string
  searchKey: string
}

function mapStudentOption(s: StudentApiRecord): StudentOption {
  return {
    id: s.id,
    label: `${s.firstName} ${s.lastName}${s.matricule ? ' - ' + s.matricule : ''}`,
    searchKey: `${s.firstName} ${s.lastName} ${s.matricule || ''}`.toLowerCase(),
  }
}

function defaultDueDate() {
  const d = new Date()
  d.setDate(d.getDate() + 14)
  return d.toISOString().slice(0, 10)
}

// ─── Config Maps ──────────────────────────────────────────────────────────────

const typeConfig: Record<string, { label: string; className: string }> = {
  livre: { label: 'Livre', className: 'bg-[#1a274415] text-[#1a2744] border-0' },
  revue: { label: 'Revue', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' },
  these: { label: 'These', className: 'bg-[#8b5cf615] text-[#8b5cf6] border-0' },
  memoire: { label: 'Memoire', className: 'bg-[#0891b215] text-[#0891b2] border-0' },
  rapport: { label: 'Rapport', className: 'bg-[#d4a85315] text-[#d4a853] border-0' },
  ebook: { label: 'E-book', className: 'bg-[#ea580c15] text-[#ea580c] border-0' },
}

const categoryConfig: Record<string, { label: string; className: string; color: string }> = {
  sciences: { label: 'Sciences', className: 'bg-blue-50 text-blue-700 border-0', color: '#1a2744' },
  droit: { label: 'Droit', className: 'bg-purple-50 text-purple-700 border-0', color: '#2d7a4f' },
  lettres: { label: 'Lettres', className: 'bg-amber-50 text-amber-700 border-0', color: '#d4a853' },
  medecine: { label: 'Medecine', className: 'bg-red-50 text-red-700 border-0', color: '#c62828' },
  economie: { label: 'Economie', className: 'bg-emerald-50 text-emerald-700 border-0', color: '#0891b2' },
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

// ─── Component ────────────────────────────────────────────────────────────────

export function LibraryPage() {
  const queryClient = useQueryClient()
  const { data: libraryQuery, isLoading } = useLibrary()
  const { data: studentsQuery } = useStudents({ limit: 1000 })

  const catalog: CatalogItem[] = (libraryQuery?.catalog || []).map(mapCatalogItem)
  const borrows: BorrowRecord[] = (libraryQuery?.borrows || []).map(mapBorrow)
  const rooms: RoomSpace[] = (libraryQuery?.rooms || []).map(mapRoom)
  const stats: LibraryStats | undefined = libraryQuery?.stats
  const students: StudentOption[] = (studentsQuery?.data || []).map(mapStudentOption)

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('tous')
  const [categoryFilter, setCategoryFilter] = useState('tous')
  const [statusFilter, setStatusFilter] = useState('tous')
  const [languageFilter, setLanguageFilter] = useState('tous')
  const [borrowSearch, setBorrowSearch] = useState('')

  // Add-book dialog
  const [showAddBook, setShowAddBook] = useState(false)
  const [addingBook, setAddingBook] = useState(false)
  const [newBook, setNewBook] = useState({ title: '', type: 'livre', category: 'sciences', location: '', totalCopies: '1' })

  // Borrow dialog (opened from a catalog row)
  const [borrowFor, setBorrowFor] = useState<CatalogItem | null>(null)
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [dueDate, setDueDate] = useState(defaultDueDate())
  const [borrowing, setBorrowing] = useState(false)

  // Return a loan
  const [returningId, setReturningId] = useState<string | null>(null)

  // Manual room occupancy entry
  const [occupancyDrafts, setOccupancyDrafts] = useState<Record<string, string>>({})
  const [savingRoomId, setSavingRoomId] = useState<string | null>(null)

  // Filter catalog
  const filteredCatalog = catalog.filter(item => {
    const matchSearch = search === '' ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.location.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'tous' || item.type === typeFilter
    const matchCategory = categoryFilter === 'tous' || item.category === categoryFilter
    const matchStatus = statusFilter === 'tous' || item.status === statusFilter
    return matchSearch && matchType && matchCategory && matchStatus
  })

  // Filter borrows
  const filteredBorrows = borrows.filter(b => {
    const matchSearch = borrowSearch === '' ||
      b.studentName.toLowerCase().includes(borrowSearch.toLowerCase()) ||
      b.bookTitle.toLowerCase().includes(borrowSearch.toLowerCase()) ||
      b.matricule.toLowerCase().includes(borrowSearch.toLowerCase())
    return matchSearch
  })

  const filteredStudents = students
    .filter(s => studentSearch === '' || s.searchKey.includes(studentSearch.toLowerCase()))
    .slice(0, 30)

  const monthlyBorrows = stats?.monthlyBorrows || []
  const maxBorrow = Math.max(...monthlyBorrows.map(m => m.count), 0)
  const topCategories = stats?.topCategories || []

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

  const getOccupancyColor = (occ: number) => {
    if (occ >= 90) return 'bg-red-500'
    if (occ >= 60) return 'bg-amber-500'
    return 'bg-green-500'
  }

  function openBorrowDialog(item: CatalogItem) {
    setBorrowFor(item)
    setSelectedStudentId('')
    setStudentSearch('')
    setDueDate(defaultDueDate())
  }

  async function handleAddBook() {
    if (!newBook.title.trim()) {
      toast.error('Le titre est obligatoire')
      return
    }
    setAddingBook(true)
    try {
      const res = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newBook.title.trim(),
          type: newBook.type,
          category: newBook.category,
          location: newBook.location.trim() || undefined,
          totalCopies: Number(newBook.totalCopies) || 1,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Echec de l'ajout du document")
      toast.success('Document ajoute au catalogue', { description: newBook.title })
      queryClient.invalidateQueries({ queryKey: ['library'] })
      setShowAddBook(false)
      setNewBook({ title: '', type: 'livre', category: 'sciences', location: '', totalCopies: '1' })
    } catch (e) {
      toast.error('Erreur', { description: e instanceof Error ? e.message : "Echec de l'ajout du document" })
    } finally {
      setAddingBook(false)
    }
  }

  async function handleBorrow() {
    if (!borrowFor || !selectedStudentId) return
    setBorrowing(true)
    try {
      const res = await fetch('/api/library?action=borrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceId: borrowFor.id,
          studentId: selectedStudentId,
          dueAt: dueDate ? new Date(dueDate).toISOString() : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Echec de l'enregistrement de l'emprunt")
      toast.success('Emprunt enregistre', { description: borrowFor.title })
      queryClient.invalidateQueries({ queryKey: ['library'] })
      setBorrowFor(null)
    } catch (e) {
      toast.error('Erreur', { description: e instanceof Error ? e.message : "Echec de l'enregistrement de l'emprunt" })
    } finally {
      setBorrowing(false)
    }
  }

  async function handleReturn(loanId: string) {
    setReturningId(loanId)
    try {
      const res = await fetch(`/api/library?id=${loanId}&action=return`, { method: 'PUT' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Echec du retour')
      toast.success('Ouvrage rendu')
      queryClient.invalidateQueries({ queryKey: ['library'] })
    } catch (e) {
      toast.error('Erreur', { description: e instanceof Error ? e.message : 'Echec du retour' })
    } finally {
      setReturningId(null)
    }
  }

  async function handleSaveOccupancy(roomId: string, rawValue: string) {
    const value = Number(rawValue)
    if (rawValue === '' || Number.isNaN(value) || value < 0) {
      toast.error('Effectif invalide')
      return
    }
    setSavingRoomId(roomId)
    try {
      const res = await fetch(`/api/library?id=${roomId}&action=occupancy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ occupancy: value }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Echec de la mise a jour")
      toast.success('Effectif mis a jour')
      queryClient.invalidateQueries({ queryKey: ['library'] })
    } catch (e) {
      toast.error('Erreur', { description: e instanceof Error ? e.message : 'Echec de la mise a jour' })
    } finally {
      setSavingRoomId(null)
    }
  }

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1a2744]">Bibliotheque &amp; Ressources</h1>
          <p className="text-sm text-gray-500">Gestion du patrimoine documentaire et des ressources academiques</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Dialog open={showAddBook} onOpenChange={setShowAddBook}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs">
                <Plus className="size-3.5 mr-1.5" />
                Nouveau document
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un document au catalogue</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-sm">Titre</Label>
                  <Input
                    placeholder="Ex: Droit Civil Dalloz 2024"
                    value={newBook.title}
                    onChange={(e) => setNewBook(f => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Type</Label>
                    <Select value={newBook.type} onValueChange={(v) => setNewBook(f => ({ ...f, type: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="livre">Livre</SelectItem>
                        <SelectItem value="revue">Revue</SelectItem>
                        <SelectItem value="these">These</SelectItem>
                        <SelectItem value="memoire">Memoire</SelectItem>
                        <SelectItem value="rapport">Rapport</SelectItem>
                        <SelectItem value="ebook">E-book</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Categorie</Label>
                    <Select value={newBook.category} onValueChange={(v) => setNewBook(f => ({ ...f, category: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sciences">Sciences</SelectItem>
                        <SelectItem value="droit">Droit</SelectItem>
                        <SelectItem value="lettres">Lettres</SelectItem>
                        <SelectItem value="medecine">Medecine</SelectItem>
                        <SelectItem value="economie">Economie</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Localisation</Label>
                    <Input
                      placeholder="Ex: Rayon A3"
                      value={newBook.location}
                      onChange={(e) => setNewBook(f => ({ ...f, location: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Nombre d&apos;exemplaires</Label>
                    <Input
                      type="number"
                      min={1}
                      value={newBook.totalCopies}
                      onChange={(e) => setNewBook(f => ({ ...f, totalCopies: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1 bg-[#2d7a4f] hover:bg-[#236b40] text-white"
                    disabled={addingBook}
                    onClick={handleAddBook}
                  >
                    {addingBook && <Loader2 className="size-4 mr-2 animate-spin" />}
                    Ajouter au catalogue
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => setShowAddBook(false)}>
                    Annuler
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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

      {/* ── Stats Cards ──────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ouvrages */}
        <Card className="overflow-hidden relative border-l-4 border-l-[#1a2744] hover:shadow-md transition-shadow">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a274408] to-[#1a274400] pointer-events-none" />
          <CardContent className="p-4 relative">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ouvrages</p>
                <p className="text-xl font-bold text-[#1a2744] mt-1">{(stats?.totalResources ?? 0).toLocaleString('fr-FR')}</p>
                <p className="text-xs text-gray-400 mt-1">{(stats?.totalCopies ?? 0).toLocaleString('fr-FR')} exemplaires au total</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#1a274415] flex items-center justify-center">
                <BookOpen className="size-5 text-[#1a2744]" />
              </div>
            </div>
            <div className="mt-3">
              <Progress value={stats && stats.totalCopies > 0 ? Math.round((stats.availableCopies / stats.totalCopies) * 100) : 0} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#1a2744]" />
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
                <p className="text-xl font-bold text-[#2d7a4f] mt-1">{stats?.activeLoans ?? 0}</p>
                <p className="text-xs text-gray-400 mt-1">{stats?.overdueLoans ?? 0} en retard</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#2d7a4f15] flex items-center justify-center">
                <BookMarked className="size-5 text-[#2d7a4f]" />
              </div>
            </div>
            <div className="mt-3">
              <Progress value={stats && stats.activeLoans > 0 ? Math.round((stats.overdueLoans / stats.activeLoans) * 100) : 0} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-[#2d7a4f]" />
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
                <p className="text-xl font-bold text-[#d4a853] mt-1">{digitalResources.length}</p>
                <p className="text-xs text-gray-400 mt-1">bases documentaires partenaires</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#d4a85315] flex items-center justify-center">
                <Monitor className="size-5 text-[#d4a853]" />
              </div>
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
                <p className="text-xl font-bold text-[#1a2744] mt-1">{stats?.totalRoomCapacity ?? 0}</p>
                <p className="text-xs text-gray-400 mt-1">{stats?.avgOccupancyPercent ?? 0}% occupees</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#1a274415] flex items-center justify-center">
                <Armchair className="size-5 text-[#1a2744]" />
              </div>
            </div>
            <div className="mt-3">
              <Progress value={stats?.avgOccupancyPercent ?? 0} className="h-1.5 bg-gray-100 [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-[#2d7a4f] [&>[data-slot=progress-indicator]]:to-[#d4a853]" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Search & Filter Bar ─────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par titre ou localisation..."
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-gray-500 h-9"
                  onClick={() => {
                    setSearch('')
                    setTypeFilter('tous')
                    setCategoryFilter('tous')
                    setStatusFilter('tous')
                    setLanguageFilter('tous')
                  }}
                >
                  <Filter className="size-3.5 mr-1.5" />
                  Reinitialiser
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Catalog Table ───────────────────────────────────────────────────── */}
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
                  {!isLoading && filteredCatalog.map((item) => {
                    const tConf = typeConfig[item.type]
                    const cConf = categoryConfig[item.category]
                    const sConf = statusConfig[item.status]
                    const StatusIcon = sConf?.icon
                    const canBorrow = item.availableCopies > 0 && item.status !== 'perdu'
                    return (
                      <TableRow
                        key={item.id}
                        className="hover:bg-[#2d7a4f05] transition-colors"
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
                            <span className="text-xs text-gray-600">{item.location || 'Non renseignee'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-2.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-[10px] text-gray-500 hover:bg-gray-100"
                              onClick={() => toast.info(item.title, {
                                description: `${tConf?.label || item.type} - ${item.location || 'Emplacement non renseigne'} - ${item.availableCopies}/${item.totalCopies} disponible(s)`,
                              })}
                            >
                              <Eye className="size-3.5 mr-1" />
                              Consulter
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-[10px] border-[#2d7a4f30] text-[#2d7a4f] hover:bg-[#2d7a4f10] disabled:opacity-40"
                              disabled={!canBorrow}
                              onClick={() => openBorrowDialog(item)}
                            >
                              <ArrowRightLeft className="size-3 mr-1" />
                              Emprunter
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {isLoading && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-sm text-gray-400">
                        Chargement...
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && catalog.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-sm text-gray-400">
                        Aucun ouvrage enregistre pour le moment
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && catalog.length > 0 && filteredCatalog.length === 0 && (
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

      {/* ── Borrow Dialog (opened from a catalog row) ────────────────────────── */}
      <Dialog open={!!borrowFor} onOpenChange={(open) => { if (!open) setBorrowFor(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Emprunter: {borrowFor?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm">Etudiant</Label>
              <Input
                placeholder="Rechercher par nom ou matricule..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner un etudiant" />
                </SelectTrigger>
                <SelectContent>
                  {filteredStudents.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Date de retour prevue</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1 bg-[#2d7a4f] hover:bg-[#236b40] text-white"
                disabled={!selectedStudentId || borrowing}
                onClick={handleBorrow}
              >
                {borrowing && <Loader2 className="size-4 mr-2 animate-spin" />}
                Confirmer l&apos;emprunt
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setBorrowFor(null)}>
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Emprunts & Retours Card ─────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="border-l-4 border-l-[#2d7a4f]">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BookMarked className="size-4 text-[#2d7a4f]" />
                <CardTitle className="text-sm font-semibold text-[#1a2744]">Emprunts en cours</CardTitle>
                <Badge className="text-[10px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">{borrows.length}</Badge>
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
                  {!isLoading && filteredBorrows.map((borrow) => {
                    const bConf = borrowStatusConfig[borrow.status]
                    const isOverdue = borrow.status === 'en_retard'
                    const isReturning = returningId === borrow.id
                    return (
                      <TableRow
                        key={borrow.id}
                        className={`transition-colors ${isOverdue ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-[#2d7a4f05]'}`}
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
                          {bConf ? (
                            <Badge className={`text-[10px] ${bConf.className}`}>
                              {isOverdue && <AlertTriangle className="size-3 mr-1" />}
                              {bConf.label}
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right py-2.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] border-[#2d7a4f30] text-[#2d7a4f] hover:bg-[#2d7a4f10]"
                            disabled={isReturning}
                            onClick={() => handleReturn(borrow.id)}
                          >
                            {isReturning ? <Loader2 className="size-3 mr-1 animate-spin" /> : <ArrowRightLeft className="size-3 mr-1" />}
                            Retourner
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {isLoading && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-sm text-gray-400">
                        Chargement...
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && borrows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-sm text-gray-400">
                        Aucun emprunt enregistre pour le moment
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && borrows.length > 0 && filteredBorrows.length === 0 && (
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

      {/* ── Ressources Numeriques Card ──────────────────────────────────────── */}
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
              {digitalResources.map((resource) => {
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
                      </div>
                    </div>
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="w-full mt-3 h-8 text-[10px] border-gray-200 text-[#1a2744] hover:bg-[#1a274408]"
                    >
                      <a href={resource.href} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="size-3 mr-1.5" />
                        Acceder
                      </a>
                    </Button>
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Horaires & Espaces Card ─────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="border-l-4 border-l-[#1a2744]">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-[#1a2744]" />
              <CardTitle className="text-sm font-semibold text-[#1a2744]">Horaires &amp; Espaces</CardTitle>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weeklySchedule.map((row) => (
                      <TableRow key={row.day} className="hover:bg-[#2d7a4f05] transition-colors">
                        <TableCell className="text-sm font-medium text-[#1a2744] py-2">{row.day}</TableCell>
                        <TableCell className="text-xs text-gray-600 py-2 text-center">{row.open}</TableCell>
                        <TableCell className="text-xs text-gray-600 py-2 text-center">{row.close}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Room Allocation */}
            <div>
              <p className="text-xs font-semibold text-[#1a2744] mb-3 uppercase tracking-wide">Allocation des espaces</p>
              {isLoading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="p-3 rounded-lg border border-gray-100 bg-white h-28 animate-pulse" />
                  ))}
                </div>
              )}
              {!isLoading && rooms.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-6">Aucune salle enregistree pour le moment</p>
              )}
              {!isLoading && rooms.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {rooms.map((room) => {
                    const occPercent = room.capacity > 0 ? Math.min(100, Math.round((room.occupancy / room.capacity) * 100)) : 0
                    const draftValue = occupancyDrafts[room.id] ?? String(room.occupancy)
                    const isSaving = savingRoomId === room.id
                    return (
                      <div key={room.id} className="p-3 rounded-lg border border-gray-100 bg-white hover:shadow-sm transition-shadow">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${getOccupancyColor(occPercent)}`} />
                          <span className="text-xs font-semibold text-[#1a2744]">{room.name}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mb-2">{room.capacity} places</p>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${getOccupancyColor(occPercent)}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${occPercent}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                          />
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">{room.occupancy}/{room.capacity} occupe ({occPercent}%)</p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <Input
                            type="number"
                            min={0}
                            className="h-7 text-xs px-2"
                            value={draftValue}
                            onChange={(e) => setOccupancyDrafts(prev => ({ ...prev, [room.id]: e.target.value }))}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 shrink-0"
                            disabled={isSaving}
                            onClick={() => handleSaveOccupancy(room.id, draftValue)}
                          >
                            {isSaving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
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

      {/* ── Statistiques d'Utilisation Card ─────────────────────────────────── */}
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
              <p className="text-xs font-semibold text-[#1a2744] mb-3 uppercase tracking-wide">Emprunts mensuels (6 derniers mois)</p>
              <div className="flex items-end gap-3 h-40">
                {monthlyBorrows.map((month, index) => {
                  const heightPercent = maxBorrow > 0 ? (month.count / maxBorrow) * 100 : 0
                  return (
                    <div key={`${month.month}-${index}`} className="flex-1 flex flex-col items-center gap-1">
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

            {/* Top categories + Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Categories */}
              <div>
                <p className="text-xs font-semibold text-[#1a2744] mb-3 uppercase tracking-wide">Categories les plus empruntees</p>
                {topCategories.length === 0 ? (
                  <p className="text-xs text-gray-400 py-6 text-center">Aucun emprunt enregistre pour le moment</p>
                ) : (
                  <div className="space-y-3">
                    {topCategories.map((cat, index) => {
                      const conf = categoryConfig[cat.category]
                      const label = conf?.label || cat.category
                      const color = conf?.color || '#6b7280'
                      const percent = stats && stats.totalLoansAllTime > 0 ? Math.round((cat.count / stats.totalLoansAllTime) * 100) : 0
                      return (
                        <div key={cat.category} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                              <span className="text-xs font-medium text-[#1a2744]">{label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-400">{cat.count.toLocaleString('fr-FR')}</span>
                              <span className="text-xs font-semibold text-[#1a2744]">{percent}%</span>
                            </div>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: color }}
                              initial={{ width: 0 }}
                              animate={{ width: `${percent}%` }}
                              transition={{ duration: 0.6, delay: 0.1 * index, ease: 'easeOut' }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Key Metrics */}
              <div className="space-y-4">
                <p className="text-xs font-semibold text-[#1a2744] mb-3 uppercase tracking-wide">Indicateurs cles</p>
                {/* Active borrowers */}
                <div className="p-3 rounded-lg bg-[#1a274408] border border-[#1a274410]">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="size-4 text-[#1a2744]" />
                    <span className="text-sm font-semibold text-[#1a2744]">Emprunteurs actifs</span>
                  </div>
                  <p className="text-2xl font-bold text-[#1a2744]">{stats?.activeBorrowersCount ?? 0}</p>
                  <p className="text-[10px] text-gray-400 mt-1">sur {stats?.totalStudents ?? 0} etudiants inscrits</p>
                  <Progress value={stats && stats.totalStudents > 0 ? Math.round((stats.activeBorrowersCount / stats.totalStudents) * 100) : 0} className="h-1.5 bg-gray-200 mt-2 [&>[data-slot=progress-indicator]]:bg-[#1a2744]" />
                </div>

                {/* Average borrow duration */}
                <div className="p-3 rounded-lg bg-[#2d7a4f08] border border-[#2d7a4f10]">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="size-4 text-[#2d7a4f]" />
                    <span className="text-sm font-semibold text-[#1a2744]">Duree moyenne d&apos;emprunt</span>
                  </div>
                  {stats?.avgBorrowDurationDays != null ? (
                    <>
                      <p className="text-2xl font-bold text-[#2d7a4f]">{stats.avgBorrowDurationDays} <span className="text-sm font-normal text-gray-500">jours</span></p>
                      <p className="text-[10px] text-gray-400 mt-1">Calculee sur les emprunts deja rendus</p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-400 py-1">Aucune donnee disponible pour le moment</p>
                  )}
                </div>

                {/* Retour rate */}
                <div className="p-3 rounded-lg bg-[#d4a85308] border border-[#d4a85310]">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="size-4 text-[#d4a853]" />
                    <span className="text-sm font-semibold text-[#1a2744]">Taux de retour a temps</span>
                  </div>
                  {stats?.onTimeReturnRatePercent != null ? (
                    <>
                      <p className="text-2xl font-bold text-[#d4a853]">{stats.onTimeReturnRatePercent}<span className="text-sm font-normal text-gray-500">%</span></p>
                      <Progress value={stats.onTimeReturnRatePercent} className="h-1.5 bg-gray-200 mt-2 [&>[data-slot=progress-indicator]]:bg-[#d4a853]" />
                      <p className="text-[10px] text-gray-400 mt-1">{100 - stats.onTimeReturnRatePercent}% de retards constates</p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-400 py-1">Aucune donnee disponible pour le moment</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
