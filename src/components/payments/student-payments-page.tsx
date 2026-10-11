'use client'

import { useMemo } from 'react'
import { toast } from 'sonner'
import { usePayments } from '@/lib/api-hooks'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Banknote, Clock3, Printer, ReceiptText, ShieldCheck } from 'lucide-react'

type StudentPayment = {
  id: string
  amount: number
  currency?: string | null
  comment?: string | null
  paymentMethod: string
  createdAt: string
  validationDate?: string | null
  receiptNumber?: string | null
  transactionRef?: string | null
  status: 'PENDING' | 'VALIDATED' | 'CANCELLED'
}

const statusLabel: Record<StudentPayment['status'], string> = {
  PENDING: 'En attente',
  VALIDATED: 'Payé',
  CANCELLED: 'Annulé',
}

const methodLabel: Record<string, string> = {
  CASH: 'Espèces',
  MOBILE_MONEY: 'Mobile Money',
  BANK_TRANSFER: 'Virement bancaire',
  CHEQUE: 'Chèque',
}

function formatAmount(amount: number, currency?: string | null) {
  return `${Number(amount || 0).toLocaleString('fr-FR')} ${currency || 'FCFA'}`
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export function StudentPaymentsPage() {
  const { data, isLoading, isError, refetch, isFetching } = usePayments(
    { page: 1, limit: 100 },
    { staleTime: 0, refetchOnWindowFocus: true, refetchInterval: 30_000 },
  )
  const payments = useMemo<StudentPayment[]>(() => data?.data ?? [], [data])

  const totals = useMemo(() => payments.reduce(
    (result, payment) => {
      if (payment.status === 'VALIDATED') result.validated += Number(payment.amount || 0)
      if (payment.status === 'PENDING') result.pending += Number(payment.amount || 0)
      return result
    },
    { validated: 0, pending: 0 },
  ), [payments])

  const printReceipt = async (paymentId: string) => {
    try {
      const response = await fetch(`/api/payments?receipt=true&id=${encodeURIComponent(paymentId)}`)
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Reçu introuvable')

      const payment = payload.data?.payment
      const student = payment?.student
      const tenant = payload.data?.tenant
      const printWindow = window.open('', '_blank', 'width=720,height=900')
      if (!printWindow) {
        toast.error('Fenêtre bloquée', { description: 'Autorisez les fenêtres contextuelles pour imprimer le reçu.' })
        return
      }

      printWindow.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Reçu ${escapeHtml(payment?.receiptNumber)}</title><style>
        @page { size: A4 portrait; margin: 18mm; }
        body { font-family: Arial, sans-serif; color: #172033; margin: 0; }
        .sheet { border: 1px solid #d6d9df; padding: 28px; }
        .header { text-align: center; padding-bottom: 18px; border-bottom: 2px solid #172033; }
        .header h1 { font-size: 20px; margin: 0 0 6px; }
        .header p { color: #667085; font-size: 12px; margin: 3px 0; }
        .title { text-align: center; font-size: 18px; letter-spacing: .12em; margin: 26px 0; }
        table { width: 100%; border-collapse: collapse; }
        td { border-bottom: 1px solid #e5e7eb; padding: 11px 4px; font-size: 13px; }
        td:first-child { width: 42%; color: #667085; }
        .amount { margin-top: 22px; padding: 16px; background: #f4f6f8; font-size: 20px; font-weight: 700; text-align: center; }
        .footer { margin-top: 28px; color: #667085; font-size: 11px; text-align: center; }
      </style></head><body><div class="sheet">
        <div class="header"><h1>${escapeHtml(tenant?.name || tenant?.shortName || 'Établissement')}</h1><p>${escapeHtml([tenant?.address, tenant?.city].filter(Boolean).join(' · '))}</p><p>${escapeHtml([tenant?.phone, tenant?.email].filter(Boolean).join(' · '))}</p></div>
        <div class="title">REÇU DE PAIEMENT</div>
        <table><tr><td>Reçu</td><td>${escapeHtml(payment?.receiptNumber || payment?.id)}</td></tr><tr><td>Étudiant</td><td>${escapeHtml(`${student?.firstName || ''} ${student?.lastName || ''}`.trim())}</td></tr><tr><td>Matricule</td><td>${escapeHtml(student?.matricule || '')}</td></tr><tr><td>Objet</td><td>${escapeHtml(payment?.comment || 'Frais de scolarité')}</td></tr><tr><td>Méthode</td><td>${escapeHtml(methodLabel[payment?.paymentMethod] || payment?.paymentMethod || '')}</td></tr><tr><td>Date</td><td>${escapeHtml(new Date(payment?.validationDate || payment?.createdAt).toLocaleDateString('fr-FR'))}</td></tr><tr><td>Statut</td><td>${escapeHtml(statusLabel[payment?.status as StudentPayment['status']] || payment?.status)}</td></tr></table>
        <div class="amount">${escapeHtml(formatAmount(payment?.amount, payment?.currency))}</div>
        <div class="footer">Document généré depuis l’espace étudiant UniSahel.</div>
      </div><script>window.onload=()=>window.print()</script></body></html>`)
      printWindow.document.close()
    } catch (error) {
      toast.error('Impossible d’imprimer le reçu', { description: error instanceof Error ? error.message : 'Réessayez plus tard.' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--institution-secondary)]">Espace étudiant</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">Mes paiements</h1>
          <p className="mt-1 text-sm text-gray-500">Consultez uniquement vos encaissements, leur statut et vos reçus.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span aria-live="polite" className="text-xs font-medium text-emerald-700">
            {isFetching ? 'Synchronisation en cours…' : 'Mise à jour automatique'}
          </span>
          <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? 'Actualisation…' : 'Actualiser maintenant'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <span className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><ShieldCheck className="size-5" /></span>
            <div><p className="text-xs text-gray-500">Total validé</p><p className="text-lg font-bold text-gray-900">{formatAmount(totals.validated)}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <span className="rounded-xl bg-amber-50 p-3 text-amber-700"><Clock3 className="size-5" /></span>
            <div><p className="text-xs text-gray-500">En attente</p><p className="text-lg font-bold text-gray-900">{formatAmount(totals.pending)}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <span className="rounded-xl bg-blue-50 p-3 text-blue-700"><ReceiptText className="size-5" /></span>
            <div><p className="text-xs text-gray-500">Opérations</p><p className="text-lg font-bold text-gray-900">{payments.length}</p></div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-10 text-center text-sm text-gray-500">Chargement de vos paiements…</div>
          ) : isError ? (
            <div className="p-10 text-center"><p className="text-sm font-medium text-red-700">Impossible de charger vos paiements.</p><Button className="mt-4" variant="outline" onClick={() => void refetch()}>Réessayer</Button></div>
          ) : payments.length === 0 ? (
            <div className="p-10 text-center"><Banknote className="mx-auto size-8 text-gray-300" /><p className="mt-3 text-sm font-medium text-gray-700">Aucun paiement enregistré</p><p className="mt-1 text-xs text-gray-500">Les paiements validés par la caisse apparaîtront ici.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Objet</TableHead><TableHead>Référence</TableHead><TableHead>Méthode</TableHead><TableHead>Montant</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Reçu</TableHead></TableRow></TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="whitespace-nowrap">{new Date(payment.validationDate || payment.createdAt).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell>{payment.comment || 'Frais de scolarité'}</TableCell>
                      <TableCell className="font-mono text-xs">{payment.receiptNumber || payment.transactionRef || 'Non attribuée'}</TableCell>
                      <TableCell>{methodLabel[payment.paymentMethod] || payment.paymentMethod}</TableCell>
                      <TableCell className="whitespace-nowrap font-semibold">{formatAmount(payment.amount, payment.currency)}</TableCell>
                      <TableCell><Badge variant="outline" className={payment.status === 'VALIDATED' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : payment.status === 'PENDING' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-red-200 bg-red-50 text-red-700'}>{statusLabel[payment.status] || payment.status}</Badge></TableCell>
                      <TableCell className="text-right"><Button size="sm" variant="ghost" onClick={() => void printReceipt(payment.id)} aria-label={`Imprimer le reçu ${payment.receiptNumber || payment.id}`}><Printer className="mr-2 size-4" />Imprimer</Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
