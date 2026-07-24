'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { usePayments } from '@/lib/api-hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  Plus,
  Search,
  Receipt,
  TrendingUp,
  Clock,
  AlertCircle,
  Smartphone,
  Banknote,
  Building,
  ArrowUpRight,
  ArrowDownRight,
  Printer,
  RefreshCw,
  Settings2,
  Wallet,
  Zap,
  CalendarDays,
} from 'lucide-react'

// ─── Demo Data ────────────────────────────────────────────────────────────────

interface Payment {
  id: string
  etudiant: string
  matricule: string
  montant: number
  description: string
  methode: 'cash' | 'mobile_money' | 'bank' | ''
  date: string
  reference: string
  statut: 'paye' | 'en_attente' | 'annule'
}

const statutConfig: Record<string, { label: string; className: string }> = {
  paye: { label: 'Paye', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' },
  en_attente: { label: 'En attente', className: 'bg-[#d4a85315] text-[#d4a853] border-0' },
  annule: { label: 'Annule', className: 'bg-[#c6282815] text-[#c62828] border-0' },
}

const methodeLabels: Record<string, { label: string; icon: React.ElementType }> = {
  cash: { label: 'Especes', icon: Banknote },
  mobile_money: { label: 'Mobile Money', icon: Smartphone },
  bank: { label: 'Virement', icon: Building },
}

const revenueData = [
  { month: 'Sep', value: 3200000 },
  { month: 'Oct', value: 4500000 },
  { month: 'Nov', value: 3800000 },
  { month: 'Dec', value: 2900000 },
  { month: 'Jan', value: 5100000 },
  { month: 'Fev', value: 4200000 },
]

const mobileMoneyOperators = [
  { name: 'Airtel Money', color: '#ED1C24' },
  { name: 'Moov Money', color: '#00A0E3' },
  { name: 'Orange Money', color: '#FF7900' },
  { name: 'MTN Mobile Money', color: '#FFCC00' },
]

function formatFCFA(amount: number) {
  return amount.toLocaleString('fr-FR') + ' FCFA'
}

function formatShort(amount: number) {
  if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M'
  if (amount >= 1000) return (amount / 1000).toFixed(0) + 'K'
  return amount.toString()
}

// ─── Animated Count-Up Hook ──────────────────────────────────────────────────

function useCountUp(target: number, duration: number = 1400) {
  const [count, setCount] = useState(0)
  const startTime = useRef<number | null>(null)
  const rafId = useRef<number | null>(null)

  useEffect(() => {
    startTime.current = null

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp
      const progress = Math.min((timestamp - startTime.current) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * target))

      if (progress < 1) {
        rafId.current = requestAnimationFrame(animate)
      }
    }

    rafId.current = requestAnimationFrame(animate)

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current)
    }
  }, [target, duration])

  return count
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PaymentsPage() {
  const [search, setSearch] = useState('')
  const [showNewPayment, setShowNewPayment] = useState(false)
  const [statusFilter, setStatusFilter] = useState('tous')
  const [methodeFilter, setMethodeFilter] = useState('tous')
  const [newPayment, setNewPayment] = useState({ etudiant: '', montant: '', description: '', methode: '', reference: '' })

  const { data: paymentsData, isLoading } = usePayments({ limit: 1000 })

  const realPayments = useMemo(() => {
    if (!paymentsData?.data) return []
    return paymentsData.data.map((p: any) => {
      let statut = 'en_attente'
      if (p.status === 'VALIDATED') statut = 'paye'
      if (p.status === 'CANCELLED') statut = 'annule'

      let methode = 'cash'
      if (p.paymentMethod === 'MOBILE_MONEY') methode = 'mobile_money'
      if (p.paymentMethod === 'BANK') methode = 'bank'

      const date = new Date(p.createdAt).toLocaleDateString('fr-FR')

      return {
        id: p.id,
        etudiant: `${p.student?.firstName || ''} ${p.student?.lastName || ''}`.trim(),
        matricule: p.student?.matricule || 'N/A',
        montant: p.amount,
        description: p.comment || "Frais de scolarité",
        methode: methode as 'cash' | 'mobile_money' | 'bank',
        date,
        reference: p.receiptNumber || p.transactionRef || '-',
        statut: statut as 'paye' | 'en_attente' | 'annule',
      }
    })
  }, [paymentsData])

  const totalEncaisse = realPayments.filter((p: Payment) => p.statut === 'paye').reduce((acc: number, p: Payment) => acc + p.montant, 0)
  const totalEnAttente = realPayments.filter((p: Payment) => p.statut === 'en_attente').reduce((acc: number, p: Payment) => acc + p.montant, 0)
  const totalAnnule = realPayments.filter((p: Payment) => p.statut === 'annule').reduce((acc: number, p: Payment) => acc + p.montant, 0)
  const totalMobileMoney = realPayments.filter((p: Payment) => p.statut === 'paye' && p.methode === 'mobile_money').reduce((acc: number, p: Payment) => acc + p.montant, 0)
  const totalCash = realPayments.filter((p: Payment) => p.statut === 'paye' && p.methode === 'cash').reduce((acc: number, p: Payment) => acc + p.montant, 0)

  const mobileMoneyPercent = totalEncaisse > 0 ? Math.round((totalMobileMoney / totalEncaisse) * 100) : 0
  const cashPercent = totalEncaisse > 0 ? Math.round((totalCash / totalEncaisse) * 100) : 0
  const bankPercent = totalEncaisse > 0 ? 100 - mobileMoneyPercent - cashPercent : 0
  const totalAttendu = totalEncaisse + totalEnAttente + totalAnnule
  const tauxRecouvrement = totalAttendu > 0 ? ((totalEncaisse / totalAttendu) * 100).toFixed(1) : '0.0'

  const revenueDuJour = realPayments.filter((p: Payment) => p.statut === 'paye').slice(0, 3).reduce((acc: number, p: Payment) => acc + p.montant, 0)
  const revenueDuMois = revenueData[revenueData.length - 1]?.value || 4200000

  const animatedJour = useCountUp(revenueDuJour, 1600)
  const animatedMois = useCountUp(revenueDuMois, 1800)

  const filteredPayments = realPayments.filter((p: Payment) => {
    const matchSearch = search === '' ||
      p.etudiant.toLowerCase().includes(search.toLowerCase()) ||
      p.matricule.toLowerCase().includes(search.toLowerCase()) ||
      p.reference.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'tous' || p.statut === statusFilter
    const matchMethode = methodeFilter === 'tous' || p.methode === methodeFilter
    return matchSearch && matchStatus && matchMethode
  })

  // Recent 3 payments for ticker
  const recentPayments = realPayments
    .filter((p: Payment) => p.statut === 'paye')
    .slice(0, 3)

  const maxRevenue = Math.max(...revenueData.map(r => r.value))

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
      {/* Gradient Hero Section - Revenue du jour / Revenue du mois */}
      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-[#1a2744] via-[#1f3050] to-[#2d7a4f] p-6 text-white relative">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE0YzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptLTQgMmMtMS4xIDAtMi0uOS0yLTJzLjktMiAyLTIgMiAuOSAyIDItLjkgMi0yIDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold">Gestion des paiements</h1>
                  <p className="text-white/70 text-sm mt-1">Suivi des encaissements et des frais</p>
                </div>
                <Dialog open={showNewPayment} onOpenChange={setShowNewPayment}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-white/15 border border-white/25 text-white hover:bg-white/25 text-xs">
                      <Plus className="size-3.5 mr-1.5" />
                      Nouveau paiement
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Enregistrer un paiement</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Etudiant</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                          <Input placeholder="Rechercher un etudiant..." className="pl-9" value={newPayment.etudiant} onChange={(e) => setNewPayment(p => ({ ...p, etudiant: e.target.value }))} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Montant (FCFA)</Label>
                        <Input type="number" placeholder="175 000" value={newPayment.montant} onChange={(e) => setNewPayment(p => ({ ...p, montant: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Description</Label>
                        <Input placeholder="Frais de scolarite S1" value={newPayment.description} onChange={(e) => setNewPayment(p => ({ ...p, description: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Methode de paiement</Label>
                        <Select value={newPayment.methode} onValueChange={(v) => setNewPayment(p => ({ ...p, methode: v }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Especes</SelectItem>
                            <SelectItem value="mobile_money">Mobile Money</SelectItem>
                            <SelectItem value="bank">Virement bancaire</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Reference</Label>
                        <Input placeholder="MM-2024-XXX" value={newPayment.reference} onChange={(e) => setNewPayment(p => ({ ...p, reference: e.target.value }))} />
                      </div>
                      <Button className="w-full bg-[#2d7a4f] hover:bg-[#236b40] text-white" onClick={() => { setShowNewPayment(false); toast.success('Paiement enregistré', { description: `${newPayment.etudiant || 'Nouveau paiement'} - ${newPayment.montant || '0'} FCFA` }); setNewPayment({ etudiant: '', montant: '', description: '', methode: '', reference: '' }) }}>
                        Enregistrer le paiement
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Revenue du jour / Revenue du mois */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                      <Zap className="size-4 text-[#d4a853]" />
                    </div>
                    <span className="text-xs text-white/70 uppercase tracking-wide font-medium">Revenue du jour</span>
                  </div>
                  <p className="text-3xl font-bold tracking-tight">
                    {animatedJour.toLocaleString('fr-FR')} <span className="text-base font-normal text-white/60">FCFA</span>
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <ArrowUpRight className="size-3 text-[#2d7a4f]" />
                    <span className="text-[10px] font-medium text-[#4ade80]">+8.3%</span>
                    <span className="text-[10px] text-white/50">vs hier</span>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                      <CalendarDays className="size-4 text-[#d4a853]" />
                    </div>
                    <span className="text-xs text-white/70 uppercase tracking-wide font-medium">Revenue du mois</span>
                  </div>
                  <p className="text-3xl font-bold tracking-tight">
                    {animatedMois.toLocaleString('fr-FR')} <span className="text-base font-normal text-white/60">FCFA</span>
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <ArrowUpRight className="size-3 text-[#2d7a4f]" />
                    <span className="text-[10px] font-medium text-[#4ade80]">+12.5%</span>
                    <span className="text-[10px] text-white/50">vs mois dernier</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Recent Payments Ticker */}
      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-[#2d7a4f08] via-transparent to-[#d4a85308] border-b border-gray-100 p-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="w-2 h-2 rounded-full bg-[#2d7a4f] animate-pulse" />
                <span className="text-[10px] font-semibold text-[#1a2744] uppercase tracking-wide">Derniers paiements</span>
              </div>
              <div className="flex items-center gap-3 overflow-x-auto">
                {recentPayments.map((p: Payment, i: number) => {
                  const methode = methodeLabels[p.methode]
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.1 * i }}
                      className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-gray-100 shrink-0"
                    >
                      <Receipt className="size-3 text-[#2d7a4f]" />
                      <span className="text-xs font-medium text-[#1a2744] truncate max-w-[120px]">{p.etudiant.split(' ')[0]}</span>
                      <span className="text-xs font-bold text-[#2d7a4f]">{formatFCFA(p.montant)}</span>
                      <Badge className="text-[8px] px-1.5 py-0 bg-[#2d7a4f15] text-[#2d7a4f] border-0">
                        {methode?.label || 'N/A'}
                      </Badge>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ── Stats Cards ──────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total encaisse */}
        <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
          <Card className="overflow-hidden relative h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-[#2d7a4f08] to-[#2d7a4f00] pointer-events-none" />
            <CardContent className="p-4 relative">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total encaisse</p>
                  <p className="text-xl font-bold text-[#2d7a4f] mt-1">{formatFCFA(totalEncaisse)}</p>
                  <p className="text-xs text-gray-400 mt-1">{realPayments.filter((p: Payment) => p.statut === 'paye').length} paiements</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#2d7a4f15] flex items-center justify-center">
                  <TrendingUp className="size-5 text-[#2d7a4f]" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <ArrowUpRight className="size-3 text-[#2d7a4f]" />
                <span className="text-[10px] font-medium text-[#2d7a4f]">+12.5%</span>
                <span className="text-[10px] text-gray-400">vs mois dernier</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* En attente */}
        <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
          <Card className="overflow-hidden relative h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-[#d4a85308] to-[#d4a85300] pointer-events-none" />
            <CardContent className="p-4 relative">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">En attente</p>
                  <p className="text-xl font-bold text-[#d4a853] mt-1">{formatFCFA(totalEnAttente)}</p>
                  <p className="text-xs text-gray-400 mt-1">{realPayments.filter((p: Payment) => p.statut === 'en_attente').length} paiements</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#d4a85315] flex items-center justify-center">
                  <Clock className="size-5 text-[#d4a853]" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <ArrowUpRight className="size-3 text-[#d4a853]" />
                <span className="text-[10px] font-medium text-[#d4a853]">+3.2%</span>
                <span className="text-[10px] text-gray-400">vs mois dernier</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Annule */}
        <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
          <Card className="overflow-hidden relative h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-[#c6282808] to-[#c6282800] pointer-events-none" />
            <CardContent className="p-4 relative">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Annule</p>
                  <p className="text-xl font-bold text-[#c62828] mt-1">{formatFCFA(totalAnnule)}</p>
                  <p className="text-xs text-gray-400 mt-1">{realPayments.filter((p: Payment) => p.statut === 'annule').length} paiements</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#c6282815] flex items-center justify-center">
                  <AlertCircle className="size-5 text-[#c62828]" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <ArrowDownRight className="size-3 text-[#2d7a4f]" />
                <span className="text-[10px] font-medium text-[#2d7a4f]">-8.1%</span>
                <span className="text-[10px] text-gray-400">vs mois dernier</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Mobile Money */}
        <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
          <Card className="overflow-hidden relative h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-[#d4a85308] to-[#2d7a4f05] pointer-events-none" />
            <CardContent className="p-4 relative">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Mobile Money</p>
                  <p className="text-xl font-bold text-[#d4a853] mt-1">{formatFCFA(totalMobileMoney)}</p>
                  <p className="text-xs text-gray-400 mt-1">{realPayments.filter((p: Payment) => p.statut === 'paye' && p.methode === 'mobile_money').length} transactions</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#d4a85315] flex items-center justify-center">
                  <Smartphone className="size-5 text-[#d4a853]" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <ArrowUpRight className="size-3 text-[#2d7a4f]" />
                <span className="text-[10px] font-medium text-[#2d7a4f]">+22.0%</span>
                <span className="text-[10px] text-gray-400">vs mois dernier</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* ── Payment Method Breakdown + Mobile Money Card ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payment Method Breakdown */}
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#1a2744]">Repartition par methode de paiement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mobile Money - 40% */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <motion.div whileHover={{ scale: 1.1 }} transition={{ duration: 0.15 }}>
                      <div className="w-7 h-7 rounded-lg bg-[#d4a85315] flex items-center justify-center">
                        <Smartphone className="size-3.5 text-[#d4a853]" />
                      </div>
                    </motion.div>
                    <span className="text-sm font-medium text-[#1a2744]">Mobile Money</span>
                  </div>
                  <span className="text-sm font-semibold text-[#1a2744]">{mobileMoneyPercent}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[#d4a853] to-[#e0be72]"
                    initial={{ width: 0 }}
                    animate={{ width: `${mobileMoneyPercent}%` }}
                    transition={{ duration: 1.0, delay: 0.2, ease: 'easeOut' }}
                  />
                </div>
              </div>

              {/* Especes - 35% */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <motion.div whileHover={{ scale: 1.1 }} transition={{ duration: 0.15 }}>
                      <div className="w-7 h-7 rounded-lg bg-[#2d7a4f15] flex items-center justify-center">
                        <Banknote className="size-3.5 text-[#2d7a4f]" />
                      </div>
                    </motion.div>
                    <span className="text-sm font-medium text-[#1a2744]">Especes</span>
                  </div>
                  <span className="text-sm font-semibold text-[#1a2744]">{cashPercent}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[#2d7a4f] to-[#3da66a]"
                    initial={{ width: 0 }}
                    animate={{ width: `${cashPercent}%` }}
                    transition={{ duration: 1.0, delay: 0.35, ease: 'easeOut' }}
                  />
                </div>
              </div>

              {/* Virement - 25% */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <motion.div whileHover={{ scale: 1.1 }} transition={{ duration: 0.15 }}>
                      <div className="w-7 h-7 rounded-lg bg-[#1a274415] flex items-center justify-center">
                        <Building className="size-3.5 text-[#1a2744]" />
                      </div>
                    </motion.div>
                    <span className="text-sm font-medium text-[#1a2744]">Virement</span>
                  </div>
                  <span className="text-sm font-semibold text-[#1a2744]">{bankPercent}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[#1a2744] to-[#3a4d6e]"
                    initial={{ width: 0 }}
                    animate={{ width: `${bankPercent}%` }}
                    transition={{ duration: 1.0, delay: 0.5, ease: 'easeOut' }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <p className="text-[10px] text-gray-400">Base sur les paiements du mois en cours</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Mobile Money Integration Card */}
        <motion.div variants={itemVariants}>
          <Card className="h-full border-l-4 border-l-[#d4a853]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-[#1a2744]">Integration Mobile Money</CardTitle>
                <Button size="sm" variant="outline" className="h-7 text-xs border-[#d4a853] text-[#d4a853] hover:bg-[#d4a85310]" onClick={() => toast.info('Bientot disponible', { description: "L'integration directe avec les operateurs Mobile Money est en cours de mise en place. Enregistrez ces paiements manuellement pour le moment." })}>
                  <Settings2 className="size-3 mr-1" />
                  Configurer
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Wallet className="size-4 text-[#d4a853]" />
                <span className="text-gray-600">Paiements Mobile Money ce mois:</span>
                <span className="font-bold text-[#1a2744]">{formatFCFA(totalMobileMoney)}</span>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Operateurs supportes</p>
                <div className="grid grid-cols-2 gap-2">
                  {mobileMoneyOperators.map((op) => (
                    <motion.div
                      key={op.name}
                      whileHover={{ scale: 1.03 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center gap-2.5 p-2 rounded-lg bg-gray-50 border border-gray-100 cursor-pointer hover:border-gray-200 hover:shadow-sm"
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: op.color + '20' }}
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: op.color }}
                        />
                      </div>
                      <span className="text-xs font-medium text-[#1a2744] truncate">{op.name}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#d4a853]" />
                  <span className="text-[10px] text-gray-500">Bientot disponible</span>
                </div>
                <span className="text-[10px] text-gray-400">Paiements a enregistrer manuellement</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Revenue Timeline ────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-[#1a2744]">Evolution des revenus</CardTitle>
              <span className="text-xs text-gray-400">6 derniers mois</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 sm:gap-3 h-40">
              {revenueData.map((item, index) => {
                const heightPercent = (item.value / maxRevenue) * 100
                return (
                  <div key={item.month} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-[#1a2744]">{formatShort(item.value)}</span>
                    <div className="w-full relative" style={{ height: '100px' }}>
                      <motion.div
                        className="absolute bottom-0 w-full rounded-t-md bg-gradient-to-t from-[#2d7a4f] to-[#3da66a]"
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPercent}%` }}
                        transition={{ duration: 0.8, delay: 0.1 * index, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-500 font-medium">{item.month}</span>
                  </div>
                )
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">Total 6 mois</span>
              <span className="text-sm font-bold text-[#2d7a4f]">
                {formatFCFA(revenueData.reduce((acc, r) => acc + r.value, 0))}
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Search + Filters ────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par nom, matricule, reference..."
                  className="pl-9 h-9 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px] h-9 text-xs">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous les statuts</SelectItem>
                    <SelectItem value="paye">Paye</SelectItem>
                    <SelectItem value="en_attente">En attente</SelectItem>
                    <SelectItem value="annule">Annule</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={methodeFilter} onValueChange={setMethodeFilter}>
                  <SelectTrigger className="w-[140px] h-9 text-xs">
                    <SelectValue placeholder="Methode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Toutes les methodes</SelectItem>
                    <SelectItem value="cash">Especes</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="bank">Virement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Payments Table with Gradient Border Top ─────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden" style={{ borderTop: '3px solid #2d7a4f' }}>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="text-xs font-semibold">Etudiant</TableHead>
                    <TableHead className="text-xs font-semibold">Description</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Montant</TableHead>
                    <TableHead className="text-xs font-semibold">Methode</TableHead>
                    <TableHead className="text-xs font-semibold">Date</TableHead>
                    <TableHead className="text-xs font-semibold">Reference</TableHead>
                    <TableHead className="text-xs font-semibold">Statut</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment: Payment, idx: number) => {
                    const methode = methodeLabels[payment.methode]
                    return (
                      <TableRow
                        key={payment.id}
                        className={`hover:bg-[#2d7a4f05] transition-colors cursor-pointer ${idx % 2 === 1 ? 'bg-gray-50/30' : ''}`}
                      >
                        <TableCell className="py-2.5">
                          <div>
                            <p className="text-sm font-medium text-[#1a2744]">{payment.etudiant}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{payment.matricule}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 py-2.5">{payment.description}</TableCell>
                        <TableCell className="text-sm text-right font-semibold text-[#1a2744] py-2.5">{formatFCFA(payment.montant)}</TableCell>
                        <TableCell className="py-2.5">
                          {methode ? (
                            <div className="flex items-center gap-1.5">
                              <methode.icon className="size-3.5 text-gray-400" />
                              <span className="text-xs text-gray-600">{methode.label}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-300">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500 py-2.5">{payment.date || '-'}</TableCell>
                        <TableCell className="text-xs font-mono text-gray-400 py-2.5">{payment.reference || '-'}</TableCell>
                        <TableCell className="py-2.5">
                          <Badge className={`text-[10px] ${statutConfig[payment.statut].className}`}>
                            {statutConfig[payment.statut].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            {payment.statut === 'paye' && (
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-[#2d7a4f] hover:bg-[#2d7a4f10]" onClick={() => toast.success('Reçu généré', { description: `Reçu ${payment.reference} prêt pour impression` })}>
                                <Printer className="size-3 mr-1" />
                                Imprimer recu
                              </Button>
                            )}
                            {payment.statut === 'en_attente' && (
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-[#a67c00] hover:bg-[#a67c0010]" onClick={() => toast.success('Relance envoyée', { description: `Notification envoyée à ${payment.etudiant}` })}>
                                <RefreshCw className="size-3 mr-1" />
                                Relancer
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {filteredPayments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-sm text-gray-400">
                        Aucun paiement trouve
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Payment Summary Footer ─────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="border-t-2 border-t-[#2d7a4f]">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total frais attendus</p>
                <p className="text-lg font-bold text-[#1a2744] mt-0.5">{formatFCFA(totalAttendu)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total encaisse</p>
                <p className="text-lg font-bold text-[#2d7a4f] mt-0.5">{formatFCFA(totalEncaisse)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Taux de recouvrement</p>
                <p className="text-lg font-bold text-[#d4a853] mt-0.5">{tauxRecouvrement}%</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Progression du recouvrement</span>
                <span className="text-xs font-semibold text-[#2d7a4f]">{tauxRecouvrement}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#2d7a4f] to-[#3da66a]"
                  initial={{ width: 0 }}
                  animate={{ width: `${tauxRecouvrement}%` }}
                  transition={{ duration: 1.2, delay: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
