'use client'

import { useEffect, useState } from 'react'
import NextImage from 'next/image'
import { Award, ImagePlus, LoaderCircle, RotateCcw, Save, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { defaultDiplomaDesign, parseDiplomaDesign, type DiplomaDesignConfig } from '@/lib/diploma-design'

interface DiplomaDesignerTenant {
  name: string
  shortName: string | null
  logo: string | null
  secondaryLogo: string | null
  thirdLogo: string | null
  motto: string | null
  headerLanguageMode: string
  headerLinesFr: string | null
  headerLinesAr: string | null
  diplomaDesign?: DiplomaDesignConfig
}

interface DiplomaDesignerProps {
  tenant: DiplomaDesignerTenant
  onSaved: () => void
}

const styleLabels: Record<DiplomaDesignConfig['style'], string> = {
  HERITAGE_TCHADIEN: 'Héritage tchadien',
  SAHEL_PRESTIGE: 'Prestige sahélien',
  ACADEMIQUE: 'Académique épuré',
}

const borderLabels: Record<DiplomaDesignConfig['border'], string> = {
  GUILLOCHE: 'Guilloches de sécurité',
  GEOMETRIQUE: 'Géométrique contemporain',
  DOUBLE_FILET: 'Double filet classique',
}

const patternLabels: Record<DiplomaDesignConfig['pattern'], string> = {
  ROSETTES: 'Rosettes',
  VAGUES: 'Vagues sahéliennes',
  DIAMANTS: 'Diamants',
  AUCUN: 'Aucun',
}

const stylePresets: Record<DiplomaDesignConfig['style'], Pick<DiplomaDesignConfig, 'border' | 'pattern' | 'primaryColor' | 'accentColor' | 'paperColor'>> = {
  HERITAGE_TCHADIEN: { border: 'GUILLOCHE', pattern: 'VAGUES', primaryColor: '#17365D', accentColor: '#B58A32', paperColor: '#FFFCF4' },
  SAHEL_PRESTIGE: { border: 'GEOMETRIQUE', pattern: 'ROSETTES', primaryColor: '#184F3A', accentColor: '#C08B35', paperColor: '#FFFDF7' },
  ACADEMIQUE: { border: 'DOUBLE_FILET', pattern: 'AUCUN', primaryColor: '#1F2937', accentColor: '#9A7B3F', paperColor: '#FFFFFF' },
}

export function DiplomaDesigner({ tenant, onSaved }: DiplomaDesignerProps) {
  const [design, setDesign] = useState(() => parseDiplomaDesign(tenant.diplomaDesign))
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<'diplomaEmblem' | 'diplomaMedallion' | null>(null)
  const [previewVersion, setPreviewVersion] = useState(0)

  useEffect(() => setDesign(parseDiplomaDesign(tenant.diplomaDesign)), [tenant.diplomaDesign])

  const update = <K extends keyof DiplomaDesignConfig>(field: K, value: DiplomaDesignConfig[K]) => {
    setDesign((current) => ({ ...current, [field]: value }))
  }

  const applyStyle = (style: DiplomaDesignConfig['style']) => {
    setDesign((current) => ({ ...current, style, ...stylePresets[style] }))
  }

  const upload = async (kind: 'diplomaEmblem' | 'diplomaMedallion', file?: File) => {
    if (!file) return
    setUploading(kind)
    try {
      const payload = new FormData()
      payload.set('kind', kind)
      payload.set('file', file)
      const response = await fetch('/api/institution/assets', { method: 'POST', body: payload })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Téléversement impossible')
      update(kind === 'diplomaEmblem' ? 'nationalEmblem' : 'medallion', body.dataUrl)
      toast.success('Visuel prêt à être enregistré')
    } catch (error) {
      toast.error('Téléversement impossible', { description: error instanceof Error ? error.message : 'Fichier invalide' })
    } finally {
      setUploading(null)
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/institution', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ diplomaDesign: design }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Enregistrement impossible')
      toast.success('Maquette du diplôme enregistrée')
      onSaved()
      setPreviewVersion((version) => version + 1)
    } catch (error) {
      toast.error('Maquette non enregistrée', { description: error instanceof Error ? error.message : 'Erreur inconnue' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg"><Award className="size-5 text-amber-300" />Atelier vectoriel du diplôme</CardTitle>
            <CardDescription className="mt-1 max-w-3xl text-slate-300">Personnalisez l’identité du diplôme sans déplacer les zones obligatoires. Le QR, les signatures, les marges A4 et la référence restent protégés.</CardDescription>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1.5 text-xs text-emerald-100"><ShieldCheck className="size-4" />Maquette imprimable sécurisée</div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 p-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,.55fr)] lg:p-6">
        <div className="min-w-0 space-y-3">
          <iframe
            key={previewVersion}
            title="Aperçu PDF exact du diplôme"
            src={`/api/institution/diploma-preview?v=${previewVersion}`}
            className="h-[min(68vw,680px)] min-h-[430px] w-full rounded-xl border bg-slate-100 shadow-sm"
          />
          <p className="text-xs text-slate-500">Cet aperçu utilise exactement le même moteur PDF, les mêmes en-têtes, logos, signatures, bordures et motifs que le diplôme généré. Enregistrez la maquette pour actualiser l’aperçu.</p>
        </div>

        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div><Label>Direction artistique</Label><Select value={design.style} onValueChange={(value) => applyStyle(value as DiplomaDesignConfig['style'])}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(styleLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Bordure</Label><Select value={design.border} onValueChange={(value) => update('border', value as DiplomaDesignConfig['border'])}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(borderLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Motif de fond</Label><Select value={design.pattern} onValueChange={(value) => update('pattern', value as DiplomaDesignConfig['pattern'])}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(patternLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {([['primaryColor', 'Texte'], ['accentColor', 'Dorure'], ['paperColor', 'Papier']] as const).map(([field, label]) => <div key={field}><Label htmlFor={field} className="text-xs">{label}</Label><Input id={field} type="color" value={design[field]} onChange={(event) => update(field, event.target.value.toUpperCase())} className="mt-1 h-10 cursor-pointer p-1" /></div>)}
          </div>

          <div className="space-y-3 rounded-xl border bg-slate-50 p-3">
            <div><Label>Filigrane central</Label><Select value={design.watermarkSource} onValueChange={(value) => setDesign((current) => ({ ...current, watermarkSource: value as DiplomaDesignConfig['watermarkSource'], showWatermark: value !== 'NONE' }))}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="EMBLEM">Emblème national</SelectItem><SelectItem value="LOGO">Logo de l’institution</SelectItem><SelectItem value="NONE">Aucun filigrane</SelectItem></SelectContent></Select></div>
            <div className={design.watermarkSource === 'NONE' ? 'opacity-50' : ''}><div className="flex items-center justify-between gap-3"><Label htmlFor="watermarkSize">Taille de l’emblème / filigrane</Label><span className="text-xs tabular-nums text-slate-500">{(design.watermarkSize * 2.54 / 72).toFixed(1)} cm</span></div><Input id="watermarkSize" type="range" min={120} max={360} step={5} value={design.watermarkSize} disabled={design.watermarkSource === 'NONE'} onChange={(event) => update('watermarkSize', Number(event.target.value))} className="mt-2 h-2 cursor-pointer p-0" /></div>
            <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium">Médaillon d’authenticité</p><p className="text-xs text-slate-500">Rosette vectorielle ou visuel personnalisé.</p></div><Switch checked={design.showMedallion} onCheckedChange={(checked) => update('showMedallion', checked)} /></div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-xl border p-3"><div className="mb-2 flex items-center gap-2"><ImagePlus className="size-4 text-slate-600" /><p className="text-sm font-medium">Emblème national</p></div>{design.nationalEmblem && <NextImage unoptimized src={design.nationalEmblem} alt="Emblème national" width={160} height={64} className="mb-2 h-16 w-full object-contain" />}<Input type="file" accept="image/png,image/jpeg,image/webp" disabled={Boolean(uploading)} onChange={(event) => void upload('diplomaEmblem', event.target.files?.[0])} /><Button type="button" variant="ghost" size="sm" className="mt-1" disabled={!design.nationalEmblem} onClick={() => update('nationalEmblem', undefined)}>Retirer</Button></div>
            <div className="rounded-xl border p-3"><div className="mb-2 flex items-center gap-2"><Award className="size-4 text-slate-600" /><p className="text-sm font-medium">Médaillon personnalisé</p></div>{design.medallion && <NextImage unoptimized src={design.medallion} alt="Médaillon" width={160} height={64} className="mb-2 h-16 w-full object-contain" />}<Input type="file" accept="image/png,image/jpeg,image/webp" disabled={Boolean(uploading)} onChange={(event) => void upload('diplomaMedallion', event.target.files?.[0])} /><Button type="button" variant="ghost" size="sm" className="mt-1" disabled={!design.medallion} onClick={() => update('medallion', undefined)}>Utiliser la rosette vectorielle</Button></div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setDesign({ ...defaultDiplomaDesign })}><RotateCcw className="mr-2 size-4" />Réinitialiser</Button>
            <Button type="button" onClick={() => void save()} disabled={saving || Boolean(uploading)} className="bg-slate-950 text-white hover:bg-slate-800">{saving ? <LoaderCircle className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}Enregistrer la maquette</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
