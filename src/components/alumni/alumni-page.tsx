'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { exportToExcel } from '@/lib/export'
import { useAlumni } from '@/lib/api-hooks'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Briefcase, Download, GraduationCap, Mail, MapPin, Plus, Search, Users } from 'lucide-react'

type AlumniStatus = 'ACTIF' | 'INACTIF' | 'INJOIGNABLE'

interface AlumniRecord {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  diploma: string | null
  graduationYear: number
  program: string | null
  currentPosition: string | null
  company: string | null
  sector: string | null
  country: string | null
  city: string | null
  status: AlumniStatus
  isContributing: boolean
  contributionAmt: number
  linkedIn: string | null
  lastContactDate: string | null
}

const statusConfig: Record<AlumniStatus, { label: string; className: string }> = {
  ACTIF: { label: 'Actif', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' },
  INACTIF: { label: 'Inactif', className: 'bg-amber-50 text-amber-700 border-0' },
  INJOIGNABLE: { label: 'Injoignable', className: 'bg-red-50 text-red-700 border-0' },
}

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  diploma: '',
  graduationYear: String(new Date().getFullYear()),
  program: '',
  currentPosition: '',
  company: '',
  sector: '',
  country: '',
  city: '',
  status: 'ACTIF' as AlumniStatus,
}

export function AlumniPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useAlumni()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState(initialForm)

  const alumni: AlumniRecord[] = useMemo(
    () => data?.alumni ?? [],
    [data]
  )
  const stats = data?.stats ?? { total: 0, active: 0, employed: 0, contributing: 0, employmentRate: 0, countries: 0 }

  const filteredAlumni = useMemo(() => {
    const q = search.trim().toLowerCase()
    return alumni.filter((item) => {
      const haystack = [
        item.firstName,
        item.lastName,
        item.email,
        item.program,
        item.currentPosition,
        item.company,
        item.country,
      ].filter(Boolean).join(' ').toLowerCase()
      const matchesSearch = !q || haystack.includes(q)
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [alumni, search, statusFilter])

  const updateForm = (updates: Partial<typeof initialForm>) => {
    setForm((current) => ({ ...current, ...updates }))
  }

  const createAlumnus = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.graduationYear.trim()) {
      toast.error('Champs requis', { description: 'Prénom, nom et année de diplôme sont obligatoires.' })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/alumni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          graduationYear: Number(form.graduationYear),
          email: form.email || null,
          phone: form.phone || null,
          diploma: form.diploma || null,
          program: form.program || null,
          currentPosition: form.currentPosition || null,
          company: form.company || null,
          sector: form.sector || null,
          country: form.country || null,
          city: form.city || null,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Création impossible')

      toast.success('Alumni ajouté')
      queryClient.invalidateQueries({ queryKey: ['alumni'] })
      setDialogOpen(false)
      setForm(initialForm)
    } catch (error) {
      toast.error('Erreur', { description: error instanceof Error ? error.message : 'Création impossible' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const exportAlumni = () => {
    if (filteredAlumni.length === 0) {
      toast.info('Aucun alumni à exporter')
      return
    }
    exportToExcel(
      filteredAlumni.map((item) => ({
        Nom: item.lastName,
        Prénom: item.firstName,
        Email: item.email || '',
        Téléphone: item.phone || '',
        Diplôme: item.diploma || '',
        Année: item.graduationYear,
        Programme: item.program || '',
        Poste: item.currentPosition || '',
        Entreprise: item.company || '',
        Pays: item.country || '',
        Statut: statusConfig[item.status]?.label || item.status,
      })),
      'alumni'
    )
    toast.success('Export généré')
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-[#1a2744] via-[#1f3050] to-[#2d7a4f] p-6 text-white">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Alumni & anciens étudiants</h1>
              <p className="mt-1 text-sm text-white/70">Répertoire réel des diplômés de l’institution. Les événements et dons fictifs ont été retirés.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[#2d7a4f] hover:bg-[#236b40] text-white">
                    <Plus className="mr-2 size-4" />
                    Ajouter un alumni
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Ajouter un alumni</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="alumni-first-name">Prénom</Label>
                      <Input id="alumni-first-name" value={form.firstName} onChange={(event) => updateForm({ firstName: event.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="alumni-last-name">Nom</Label>
                      <Input id="alumni-last-name" value={form.lastName} onChange={(event) => updateForm({ lastName: event.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="alumni-email">Email</Label>
                      <Input id="alumni-email" type="email" value={form.email} onChange={(event) => updateForm({ email: event.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="alumni-phone">Téléphone</Label>
                      <Input id="alumni-phone" value={form.phone} onChange={(event) => updateForm({ phone: event.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="alumni-diploma">Diplôme</Label>
                      <Input id="alumni-diploma" value={form.diploma} onChange={(event) => updateForm({ diploma: event.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="alumni-graduation-year">Année de diplôme</Label>
                      <Input id="alumni-graduation-year" type="number" value={form.graduationYear} onChange={(event) => updateForm({ graduationYear: event.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="alumni-program">Programme</Label>
                      <Input id="alumni-program" value={form.program} onChange={(event) => updateForm({ program: event.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Statut</Label>
                      <Select value={form.status} onValueChange={(value) => updateForm({ status: value as AlumniStatus })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIF">Actif</SelectItem>
                          <SelectItem value="INACTIF">Inactif</SelectItem>
                          <SelectItem value="INJOIGNABLE">Injoignable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="alumni-current-position">Poste actuel</Label>
                      <Input id="alumni-current-position" value={form.currentPosition} onChange={(event) => updateForm({ currentPosition: event.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="alumni-company">Entreprise</Label>
                      <Input id="alumni-company" value={form.company} onChange={(event) => updateForm({ company: event.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="alumni-sector">Secteur</Label>
                      <Input id="alumni-sector" value={form.sector} onChange={(event) => updateForm({ sector: event.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Pays / ville</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input aria-label="Pays" placeholder="Pays" value={form.country} onChange={(event) => updateForm({ country: event.target.value })} />
                        <Input aria-label="Ville" placeholder="Ville" value={form.city} onChange={(event) => updateForm({ city: event.target.value })} />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
                    <Button className="bg-[#2d7a4f] hover:bg-[#236b40] text-white" disabled={isSubmitting} onClick={createAlumnus}>
                      {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white" onClick={exportAlumni}>
                <Download className="mr-2 size-4" />
                Exporter
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Card><CardContent className="p-4"><GraduationCap className="mb-2 size-5 text-[#1a2744]" /><p className="text-xs text-gray-500">Total</p><p className="text-2xl font-bold text-[#1a2744]">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><Users className="mb-2 size-5 text-[#2d7a4f]" /><p className="text-xs text-gray-500">Actifs</p><p className="text-2xl font-bold text-[#2d7a4f]">{stats.active}</p></CardContent></Card>
        <Card><CardContent className="p-4"><Briefcase className="mb-2 size-5 text-[#d4a853]" /><p className="text-xs text-gray-500">En emploi</p><p className="text-2xl font-bold text-[#d4a853]">{stats.employed}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-gray-500">Taux emploi</p><p className="text-2xl font-bold text-[#1a2744]">{stats.employmentRate}%</p></CardContent></Card>
        <Card><CardContent className="p-4"><MapPin className="mb-2 size-5 text-[#2d7a4f]" /><p className="text-xs text-gray-500">Pays</p><p className="text-2xl font-bold text-[#2d7a4f]">{stats.countries}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <Input className="pl-9" placeholder="Rechercher par nom, email, poste, entreprise..." value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="ACTIF">Actif</SelectItem>
                <SelectItem value="INACTIF">Inactif</SelectItem>
                <SelectItem value="INJOIGNABLE">Injoignable</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[#1a2744]">Répertoire des alumni</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-sm text-gray-400">Chargement des alumni...</div>
          ) : filteredAlumni.length === 0 ? (
            <div className="py-12 text-center">
              <GraduationCap className="mx-auto mb-3 size-10 text-gray-300" />
              <p className="text-sm font-medium text-[#1a2744]">Aucun alumni enregistré</p>
              <p className="mt-1 text-xs text-gray-500">Ajoutez un alumni pour alimenter cet onglet avec de vraies données.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Diplôme</TableHead>
                  <TableHead>Situation</TableHead>
                  <TableHead>Localisation</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAlumni.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-[#1a2744]">{item.lastName.toUpperCase()} {item.firstName}</TableCell>
                    <TableCell>{[item.diploma, item.program, item.graduationYear].filter(Boolean).join(' — ')}</TableCell>
                    <TableCell>{[item.currentPosition, item.company].filter(Boolean).join(' — ') || '—'}</TableCell>
                    <TableCell>{[item.city, item.country].filter(Boolean).join(', ') || '—'}</TableCell>
                    <TableCell>
                      <div className="space-y-1 text-xs text-gray-500">
                        {item.email && <div className="flex items-center gap-1"><Mail className="size-3" /> {item.email}</div>}
                        {item.phone && <div>{item.phone}</div>}
                        {!item.email && !item.phone && '—'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusConfig[item.status]?.className}>{statusConfig[item.status]?.label || item.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
