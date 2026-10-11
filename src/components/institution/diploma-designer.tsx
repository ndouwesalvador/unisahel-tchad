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
import { parseHeaderLines } from '@/lib/institution-branding'

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

function DiplomaVectorPreview({ tenant, design }: { tenant: DiplomaDesignerTenant; design: DiplomaDesignConfig }) {
  const frenchLines = parseHeaderLines(tenant.headerLinesFr) ?? [tenant.name]
  const arabicLines = parseHeaderLines(tenant.headerLinesAr) ?? []
  const logos = [tenant.logo, tenant.secondaryLogo, tenant.thirdLogo].filter((logo): logo is string => Boolean(logo))
  const logoStart = 560 - ((logos.length - 1) * 58) / 2
  const wavePaths = Array.from({ length: 8 }, (_, index) => `M 45 ${105 + index * 70} Q 155 ${75 + index * 70} 265 ${105 + index * 70} T 485 ${105 + index * 70}`)
  const diamonds = Array.from({ length: 12 }, (_, index) => `${110 + index * 82},28 ${126 + index * 82},44 ${110 + index * 82},60 ${94 + index * 82},44`).join(' ')

  return (
    <svg viewBox="0 0 1120 790" role="img" aria-label="Aperçu vectoriel du diplôme" className="h-auto w-full rounded-xl border bg-white shadow-sm">
      <rect width="1120" height="790" fill={design.paperColor} />
      <rect x="20" y="20" width="1080" height="750" fill="none" stroke={design.accentColor} strokeWidth="4" />
      <rect x="30" y="30" width="1060" height="730" fill="none" stroke={design.primaryColor} strokeWidth={design.border === 'GEOMETRIQUE' ? 3 : 1.4} opacity="0.75" />
      {design.border !== 'DOUBLE_FILET' && <rect x="41" y="41" width="1038" height="708" fill="none" stroke={design.accentColor} strokeWidth="1" />}
      {design.border === 'GEOMETRIQUE' && <polyline points={diamonds} fill="none" stroke={design.accentColor} strokeWidth="1.4" opacity="0.45" />}
      {design.pattern === 'VAGUES' && wavePaths.flatMap((path, index) => [
        <path key={`left-${index}`} d={path} fill="none" stroke={design.primaryColor} strokeWidth="1" opacity="0.1" />,
        <path key={`right-${index}`} d={path} transform="translate(1120 0) scale(-1 1)" fill="none" stroke={design.primaryColor} strokeWidth="1" opacity="0.1" />,
      ])}
      {design.pattern === 'ROSETTES' && Array.from({ length: 9 }, (_, index) => <ellipse key={index} cx="560" cy="415" rx={100 + index * 16} ry={55 + index * 9} fill="none" stroke={index % 2 ? design.accentColor : design.primaryColor} opacity="0.09" />)}
      {design.pattern === 'DIAMANTS' && Array.from({ length: 8 }, (_, index) => <rect key={index} x={90 + index * 125} y="340" width="88" height="88" transform={`rotate(45 ${134 + index * 125} 384)`} fill="none" stroke={design.accentColor} opacity="0.08" />)}
      {design.showWatermark && tenant.logo && <image href={tenant.logo} x="420" y="270" width="280" height="280" preserveAspectRatio="xMidYMid meet" opacity="0.035" />}
      {design.nationalEmblem && <image href={design.nationalEmblem} x="58" y="55" width="74" height="74" preserveAspectRatio="xMidYMid meet" />}

      <g fill="#111827" fontFamily="Arial, sans-serif" textAnchor="middle">
        {frenchLines.slice(0, 5).map((line, index) => <text key={line + index} x="235" y={72 + index * 18} fontSize={index === frenchLines.length - 1 ? 14 : 11} fontWeight={index === frenchLines.length - 1 ? 700 : 500}>{line}</text>)}
        {tenant.headerLanguageMode === 'FR_AR' && arabicLines.slice(0, 5).map((line, index) => <text key={line + index} x="885" y={72 + index * 18} fontSize="12" direction="rtl">{line}</text>)}
        {logos.map((logo, index) => <image key={logo.slice(-18) + index} href={logo} x={logoStart + index * 58 - 23} y="56" width="46" height="58" preserveAspectRatio="xMidYMid meet" />)}
        <text x="560" y="143" fontSize="12" letterSpacing="3" fill={design.accentColor}>TITRE OFFICIEL</text>
        <text x="560" y="195" fontFamily="Georgia, serif" fontSize="47" fontWeight="700" letterSpacing="6" fill={design.primaryColor}>DIPLÔME</text>
        <text x="560" y="227" fontFamily="Georgia, serif" fontSize="16" fill="#46515d">Génie électrique et systèmes intelligents</text>
        <line x1="230" y1="252" x2="890" y2="252" stroke={design.accentColor} strokeWidth="1.5" />
        <text x="560" y="309" fontSize="14" letterSpacing="2" fill="#5f6973">LE CONSEIL ACADÉMIQUE DÉCERNE À</text>
        <text x="560" y="365" fontFamily="Georgia, serif" fontSize="34" fontWeight="700" fill={design.primaryColor}>NOM ET PRÉNOMS DU LAURÉAT</text>
        <text x="560" y="410" fontFamily="Georgia, serif" fontSize="18">le diplôme de</text>
        <text x="560" y="457" fontFamily="Georgia, serif" fontSize="29" fontWeight="700" fill={design.primaryColor}>MASTER</text>
        <text x="560" y="493" fontFamily="Georgia, serif" fontSize="15">après validation de 120 crédits du cursus · Mention Bien</text>
        <text x="560" y="529" fontSize="12" fill="#5f6973">Décision définitive du jury · Année académique 2026–2027</text>
      </g>

      {[240, 560, 880].map((x, index) => <g key={x} textAnchor="middle" fontFamily="Arial, sans-serif">
        <line x1={x - 92} y1="650" x2={x + 92} y2="650" stroke="#475569" />
        <text x={x} y="673" fontSize="11" fontWeight="700" fill="#111827">{index === 0 ? 'Président du jury' : index === 1 ? 'Chef de département' : 'Recteur / Directeur'}</text>
        <text x={x} y="692" fontSize="10" fill="#64748b">Nom du signataire</text>
      </g>)}
      <g transform="translate(72 664)">
        <rect width="64" height="64" fill="#fff" stroke={design.primaryColor} />
        {Array.from({ length: 6 }, (_, row) => Array.from({ length: 6 }, (_, column) => (row * 7 + column * 3) % 4 !== 0
          ? <rect key={`${row}-${column}`} x={5 + column * 9} y={5 + row * 9} width="7" height="7" fill={design.primaryColor} /> : null))}
      </g>
      {design.showMedallion && (design.medallion
        ? <image href={design.medallion} x="978" y="495" width="78" height="78" preserveAspectRatio="xMidYMid meet" />
        : <g transform="translate(1017 534)" textAnchor="middle"><circle r="40" fill="none" stroke={design.accentColor} strokeWidth="3" /><circle r="31" fill="none" stroke={design.primaryColor} /><text y="-2" fontSize="11" fontWeight="700" fill={design.primaryColor}>{tenant.shortName || 'UNIVERSITÉ'}</text><text y="15" fontSize="8" fill={design.accentColor}>EXCELLENCE</text></g>)}
      <text x="560" y="739" textAnchor="middle" fontSize="10" fill="#64748b">QR de vérification · référence unique · original numérique conservé</text>
    </svg>
  )
}

export function DiplomaDesigner({ tenant, onSaved }: DiplomaDesignerProps) {
  const [design, setDesign] = useState(() => parseDiplomaDesign(tenant.diplomaDesign))
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<'diplomaEmblem' | 'diplomaMedallion' | null>(null)

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
          <DiplomaVectorPreview tenant={tenant} design={design} />
          <p className="text-xs text-slate-500">Aperçu vectoriel proportionnel au format A4 paysage. Le PDF final réutilise les mêmes couleurs, motifs et visuels.</p>
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
            <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium">Filigrane du logo</p><p className="text-xs text-slate-500">Visible en transparence au centre.</p></div><Switch checked={design.showWatermark} onCheckedChange={(checked) => update('showWatermark', checked)} /></div>
            <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium">Médaillon d’authenticité</p><p className="text-xs text-slate-500">Rosette vectorielle ou visuel personnalisé.</p></div><Switch checked={design.showMedallion} onCheckedChange={(checked) => update('showMedallion', checked)} /></div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-xl border p-3"><div className="mb-2 flex items-center gap-2"><ImagePlus className="size-4 text-slate-600" /><p className="text-sm font-medium">Emblème national facultatif</p></div>{design.nationalEmblem && <NextImage unoptimized src={design.nationalEmblem} alt="Emblème national" width={160} height={64} className="mb-2 h-16 w-full object-contain" />}<Input type="file" accept="image/png,image/jpeg,image/webp" disabled={Boolean(uploading)} onChange={(event) => void upload('diplomaEmblem', event.target.files?.[0])} /><Button type="button" variant="ghost" size="sm" className="mt-1" disabled={!design.nationalEmblem} onClick={() => update('nationalEmblem', undefined)}>Retirer</Button></div>
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
