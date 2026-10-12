'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Download, Search, Shield, UserPlus, XCircle } from 'lucide-react'

type OnecsDiploma = {
  id: string
  number: string | null
  verificationCode: string | null
  createdAt: string
  onecsStatus: 'PENDING' | 'AUTHENTICATED' | 'REJECTED'
  onecsReference: string | null
  onecsAuthenticatedAt: string | null
  onecsNote: string | null
  institution: { name: string; shortName: string | null } | null
  student: { firstName: string; lastName: string; matricule: string | null } | null
}

export function OnecsPage() {
  const role = useAppStore((state) => state.user?.role)
  return role === 'SUPER_ADMIN' ? <OnecsAccounts /> : <OnecsDiplomas />
}

function OnecsAccounts() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '' })
  const [saving, setSaving] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null)
  const accounts = useQuery({
    queryKey: ['onecsAccounts'],
    queryFn: async () => {
      const response = await fetch('/api/onecs/accounts')
      if (!response.ok) throw new Error('Impossible de charger les comptes ONECS')
      return response.json() as Promise<{ accounts: Array<{ id: string; firstName: string; lastName: string; email: string; isActive: boolean; lastLoginAt: string | null }> }>
    },
  })

  async function createAccount() {
    setSaving(true)
    try {
      const response = await fetch('/api/onecs/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Création impossible')
      setCreatedCredentials({ email: body.account.email, password: body.tempPassword })
      setForm({ firstName: '', lastName: '', email: '' })
      await queryClient.invalidateQueries({ queryKey: ['onecsAccounts'] })
      toast.success('Compte ONECS créé')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Création impossible')
    } finally {
      setSaving(false)
    }
  }

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold text-slate-950">Comptes nationaux ONECS</h1><p className="text-sm text-slate-600">Ces comptes ne dépendent d’aucune université et authentifient uniquement les diplômes déjà validés.</p></div>
    {createdCredentials && <Card className="border-amber-300 bg-amber-50"><CardContent className="p-4 text-sm"><p className="font-semibold">Identifiants temporaires à transmettre une seule fois</p><p className="mt-2">Adresse : <strong>{createdCredentials.email}</strong></p><p>Mot de passe : <strong>{createdCredentials.password}</strong></p><p className="mt-2 text-xs">Le responsable devra changer ce mot de passe à sa première connexion.</p></CardContent></Card>}
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="size-5" />Créer un responsable ONECS</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-4"><Input placeholder="Prénom" value={form.firstName} onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))} /><Input placeholder="Nom" value={form.lastName} onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))} /><Input type="email" placeholder="adresse@onecs.td" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /><Button disabled={saving || !form.firstName || !form.lastName || !form.email} onClick={createAccount}>{saving ? 'Création…' : 'Créer le compte'}</Button></CardContent></Card>
    <Card><CardHeader><CardTitle>Responsables enregistrés</CardTitle></CardHeader><CardContent>{accounts.isPending ? <p>Chargement…</p> : accounts.isError ? <p className="text-red-600">Comptes indisponibles.</p> : <div className="space-y-2">{accounts.data?.accounts.map((account) => <div key={account.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3"><div><p className="font-medium">{account.firstName} {account.lastName}</p><p className="text-sm text-slate-600">{account.email}</p></div><Badge variant={account.isActive ? 'default' : 'secondary'}>{account.isActive ? 'Actif' : 'Désactivé'}</Badge></div>)}</div>}</CardContent></Card>
  </div>
}

function OnecsDiplomas() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState('PENDING')
  const [search, setSearch] = useState('')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [processing, setProcessing] = useState<string | null>(null)
  const diplomas = useQuery({
    queryKey: ['onecsDiplomas', status, search],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (status !== 'ALL') params.set('status', status)
      if (search.trim()) params.set('search', search.trim())
      const response = await fetch(`/api/onecs/diplomas?${params}`)
      if (!response.ok) throw new Error('Impossible de charger les diplômes')
      return response.json() as Promise<{ documents: OnecsDiploma[] }>
    },
  })

  async function decide(id: string, decision: 'AUTHENTICATED' | 'REJECTED') {
    setProcessing(id)
    try {
      const response = await fetch('/api/onecs/diplomas', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, decision, note: notes[id] || undefined }) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Décision impossible')
      toast.success(decision === 'AUTHENTICATED' ? `Diplôme authentifié · ${body.document.onecsReference}` : 'Diplôme rejeté')
      await queryClient.invalidateQueries({ queryKey: ['onecsDiplomas'] })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Décision impossible')
    } finally {
      setProcessing(null)
    }
  }

  async function download(document: OnecsDiploma) {
    const response = await fetch(`/api/documents/download?id=${encodeURIComponent(document.id)}`)
    if (!response.ok) return toast.error('Le PDF original est indisponible')
    const url = URL.createObjectURL(await response.blob())
    const link = window.document.createElement('a'); link.href = url; link.download = `${document.number || document.id}.pdf`; link.click(); URL.revokeObjectURL(url)
  }

  return <div className="space-y-6">
    <div><h1 className="flex items-center gap-2 text-2xl font-bold text-slate-950"><Shield className="size-6" />Authentification ONECS</h1><p className="text-sm text-slate-600">Contrôlez les diplômes signés par les établissements. La décision est auditée et ne modifie jamais le PDF original.</p></div>
    <Card><CardContent className="flex flex-wrap gap-3 p-4"><div className="relative min-w-64 flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input className="pl-9" placeholder="Référence, étudiant ou matricule" value={search} onChange={(event) => setSearch(event.target.value)} /></div>{['PENDING', 'AUTHENTICATED', 'REJECTED', 'ALL'].map((value) => <Button key={value} variant={status === value ? 'default' : 'outline'} onClick={() => setStatus(value)}>{value === 'PENDING' ? 'À contrôler' : value === 'AUTHENTICATED' ? 'Authentifiés' : value === 'REJECTED' ? 'Rejetés' : 'Tous'}</Button>)}</CardContent></Card>
    {diplomas.isPending ? <p>Chargement des diplômes…</p> : diplomas.isError ? <Card><CardContent className="p-6 text-red-600">La file ONECS est indisponible.</CardContent></Card> : diplomas.data?.documents.length ? <div className="space-y-4">{diplomas.data.documents.map((document) => <Card key={document.id}><CardContent className="grid gap-4 p-5 lg:grid-cols-[1fr_220px]"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-950">{document.student ? `${document.student.lastName} ${document.student.firstName}` : 'Titulaire non renseigné'}</p><Badge>{document.onecsStatus === 'PENDING' ? 'À contrôler' : document.onecsStatus === 'AUTHENTICATED' ? 'Authentifié' : 'Rejeté'}</Badge></div><p className="mt-1 text-sm text-slate-600">{document.student?.matricule || 'Sans matricule'} · {document.institution?.name || 'Établissement inconnu'}</p><p className="mt-1 text-xs text-slate-500">Diplôme {document.number || 'sans numéro'} · émis le {new Date(document.createdAt).toLocaleDateString('fr-FR')}</p>{document.onecsReference && <p className="mt-2 text-sm font-semibold text-emerald-700">Référence ONECS : {document.onecsReference}</p>}{document.onecsNote && <p className="mt-2 text-sm text-red-700">Motif : {document.onecsNote}</p>}</div><div className="space-y-2"><Button variant="outline" className="w-full" onClick={() => download(document)}><Download className="mr-2 size-4" />Examiner le PDF</Button>{document.onecsStatus === 'PENDING' && <><Input placeholder="Motif obligatoire en cas de rejet" value={notes[document.id] || ''} onChange={(event) => setNotes((current) => ({ ...current, [document.id]: event.target.value }))} /><div className="grid grid-cols-2 gap-2"><Button disabled={processing === document.id} onClick={() => decide(document.id, 'AUTHENTICATED')}><CheckCircle2 className="mr-1 size-4" />Valider</Button><Button variant="destructive" disabled={processing === document.id} onClick={() => decide(document.id, 'REJECTED')}><XCircle className="mr-1 size-4" />Rejeter</Button></div></>}</div></CardContent></Card>)}</div> : <Card><CardContent className="p-8 text-center text-slate-600">Aucun diplôme dans cette file.</CardContent></Card>}
  </div>
}
