'use client'

import { useMemo, useState } from 'react'
import { Download, FileCheck2, FileText, Loader2, ReceiptText, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useDocuments, usePayments } from '@/lib/api-hooks'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { isStudentDocumentType } from '@/lib/documents/student-document-access'

type StudentDocument = {
  id: string
  type: string
  date: string
  statut: 'signe' | 'genere' | 'en_attente'
  codeVerification: string
}

type StudentReceipt = {
  id: string
  amount: number
  currency?: string | null
  comment?: string | null
  createdAt: string
  validationDate?: string | null
  receiptNumber?: string | null
  status: string
}

const DOCUMENT_LABELS: Record<string, string> = {
  RELEVE_NOTES: 'Relevé de notes',
  ATTESTATION_INSCRIPTION: 'Attestation d’inscription',
  CERTIFICAT_SCOLARITE: 'Certificat de scolarité',
  ATTESTATION_NIVEAU: 'Attestation de niveau',
  DIPLOME: 'Diplôme',
}

function formatAmount(amount: number, currency?: string | null) {
  return `${Number(amount || 0).toLocaleString('fr-FR')} ${currency || 'FCFA'}`
}

export function StudentDocumentsPage() {
  const setView = useAppStore((state) => state.setView)
  const documentsQuery = useDocuments()
  const paymentsQuery = usePayments({ status: 'VALIDATED', page: 1, limit: 100 })
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const documents = useMemo<StudentDocument[]>(() => (
    (documentsQuery.data?.documents ?? []).filter((document: StudentDocument) => isStudentDocumentType(document.type))
  ), [documentsQuery.data])
  const receipts = useMemo<StudentReceipt[]>(() => paymentsQuery.data?.data ?? [], [paymentsQuery.data])

  const downloadDocument = async (item: StudentDocument) => {
    setDownloadingId(item.id)
    try {
      const response = await fetch(`/api/documents/download?id=${encodeURIComponent(item.id)}`)
      const contentType = response.headers.get('content-type') || ''
      if (!response.ok) {
        const payload = contentType.includes('application/json') ? await response.json() : {}
        throw new Error(payload.error || 'Document indisponible')
      }
      const url = URL.createObjectURL(await response.blob())
      const link = window.document.createElement('a')
      link.href = url
      link.download = `${item.type.toLowerCase()}_${item.codeVerification || item.id}.pdf`
      window.document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
    } catch (error) {
      toast.error('Téléchargement impossible', { description: error instanceof Error ? error.message : 'Veuillez réessayer.' })
    } finally {
      setDownloadingId(null)
    }
  }

  const isLoading = documentsQuery.isLoading || paymentsQuery.isLoading
  const isError = documentsQuery.isError || paymentsQuery.isError

  return <div className="space-y-6 text-slate-900">
    <div className="rounded-2xl bg-[#142d36] p-6 text-white sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Espace étudiant</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Mes documents</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#d6e8e1] sm:text-base">Retrouvez uniquement les pièces émises à votre nom par l’établissement et vos reçus de paiement validés.</p>
    </div>

    <div className="grid gap-4 sm:grid-cols-3">
      <Card><CardContent className="flex items-center gap-3 p-5"><span className="rounded-xl bg-blue-50 p-3 text-blue-700"><FileCheck2 className="size-5" /></span><div><p className="text-xs text-slate-500">Documents officiels</p><p className="text-xl font-bold">{documents.length}</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 p-5"><span className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><ReceiptText className="size-5" /></span><div><p className="text-xs text-slate-500">Reçus validés</p><p className="text-xl font-bold">{receipts.length}</p></div></CardContent></Card>
      <Card><CardContent className="flex items-center gap-3 p-5"><span className="rounded-xl bg-amber-50 p-3 text-amber-700"><ShieldCheck className="size-5" /></span><div><p className="text-xs text-slate-500">Accès</p><p className="text-sm font-bold">Strictement personnel</p></div></CardContent></Card>
    </div>

    {isLoading ? <Card><CardContent className="p-10 text-center text-sm text-slate-500">Chargement de vos documents…</CardContent></Card> : isError ? <Card><CardContent className="p-10 text-center"><p className="text-sm font-medium text-red-700">Impossible de charger vos documents.</p><Button variant="outline" className="mt-4" onClick={() => void Promise.all([documentsQuery.refetch(), paymentsQuery.refetch()])}>Réessayer</Button></CardContent></Card> : <>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="size-5 text-[var(--institution-secondary)]" />Documents académiques officiels</CardTitle></CardHeader>
        <CardContent>
          {documents.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center"><p className="text-sm font-medium text-slate-700">Aucun document officiel disponible</p><p className="mt-1 text-xs text-slate-500">La scolarité doit d’abord émettre et valider la pièce à votre nom.</p></div> : <div className="grid gap-3 lg:grid-cols-2">{documents.map((document) => <article key={document.id} className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-slate-950">{DOCUMENT_LABELS[document.type] || 'Document officiel'}</h2><Badge variant="outline" className={document.statut === 'signe' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-blue-200 bg-blue-50 text-blue-700'}>{document.statut === 'signe' ? 'Validé' : 'Émis'}</Badge></div><p className="mt-1 text-xs text-slate-500">Émis le {new Date(document.date).toLocaleDateString('fr-FR')}</p>{document.codeVerification && <p className="mt-1 truncate font-mono text-[11px] text-slate-500">Code : {document.codeVerification}</p>}</div>
            {document.statut === 'en_attente' ? <span className="text-xs font-medium text-amber-700">En attente de validation</span> : <Button variant="outline" onClick={() => void downloadDocument(document)} disabled={downloadingId === document.id}>{downloadingId === document.id ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Download className="mr-2 size-4" />}Télécharger</Button>}
          </article>)}</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ReceiptText className="size-5 text-[var(--institution-secondary)]" />Reçus de paiement</CardTitle></CardHeader>
        <CardContent>
          {receipts.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">Aucun paiement validé ne possède encore de reçu.</p> : <div className="space-y-3">{receipts.map((receipt) => <article key={receipt.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-slate-950">{receipt.comment || 'Frais de scolarité'}</p><p className="mt-1 text-xs text-slate-500">{receipt.receiptNumber || 'Référence en cours d’attribution'} · {new Date(receipt.validationDate || receipt.createdAt).toLocaleDateString('fr-FR')}</p></div><div className="flex items-center gap-3"><p className="font-bold text-slate-950">{formatAmount(receipt.amount, receipt.currency)}</p><Button variant="outline" size="sm" onClick={() => setView('payments')}>Voir et imprimer</Button></div></article>)}</div>}
        </CardContent>
      </Card>
    </>}

    <p className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs leading-relaxed text-blue-900">Un étudiant ne peut ni téléverser, ni générer, ni valider un document officiel. Toute nouvelle pièce doit être émise par la scolarité ou l’autorité habilitée.</p>
  </div>
}
