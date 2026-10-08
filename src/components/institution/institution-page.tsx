'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { useInstitution, useStructure, useHrStaff, useAcademicYears } from '@/lib/api-hooks'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  ArrowLeft,
  Save,
  Building2,
  GraduationCap,
  BookOpen,
  Users,
  Calendar,
  FileText,
  Palette,
  CreditCard,
  ChevronDown,
  ChevronRight,
  Plus,
  Settings,
  Stamp,
  QrCode,
  Shield,
  CheckCircle2,
  Star,
  Crown,
  Rocket,
  Stethoscope,
  ArrowUp,
  ArrowDown,
  Trash2,
} from 'lucide-react'
import { parseHeaderLines, readableBrandColor, validBrandColor } from '@/lib/institution-branding'

// ─── Custom useCountUp Hook ────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1400) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const startTime = performance.now()
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration])

  return value
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface Faculty {
  id: string
  name: string
  departments: Department[]
}

interface Department {
  id: string
  name: string
  programs: string[]
}

// ─── API Response Types (shape returned by GET /api/institution) ──────────
//
// Mirrors the TENANT_FIELDS / SETTINGS_FIELDS whitelists in
// src/app/api/institution/route.ts. useInstitution() is untyped (returns
// `any` from useSimpleGet), so we cast to this shape at the call site.

interface TenantSettingsData {
  creditsPerSemester: number
  creditsPerYear: number
  passingGrade: number
  eliminationGrade: number
  primaryColor: string
  secondaryColor: string
  accentColor: string
}

interface TenantData {
  id: string
  name: string
  shortName: string | null
  motto: string | null
  ministry: string | null
  country: string | null
  city: string | null
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  rectorName: string | null
  rectorTitle: string | null
  secondarySignerName: string | null
  secondarySignerTitle: string | null
  thirdSignerName: string | null
  thirdSignerTitle: string | null
  thirdSignature: string | null
  secondaryStamp: string | null
  thirdStamp: string | null
  arabicMotto: string | null
  contactPlacement: string
  sealSizeMm: number
  academicSystem: string
  logo: string | null
  secondaryLogo: string | null
  thirdLogo: string | null
  stamp: string | null
  signature: string | null
  secondarySignature: string | null
  headerLanguageMode: string
  arabicCountry: string | null
  arabicName: string | null
  arabicMinistry: string | null
  headerLinesFr: string | null
  headerLinesAr: string | null
  subscriptionPlan: string
  subscriptionEnd: string | null
  settings: TenantSettingsData | null
}

interface InstitutionStats {
  students: number
  teachers: number
  staffUsers: number
  payments: number
  documentsGenerated: number
}

interface InstitutionResponse {
  tenant: TenantData
  stats: InstitutionStats
}

// ─── API Response Types (shape returned by GET /api/structure) ────────────
//
// Only the fields StructureTab needs from the (much richer) /api/structure
// payload already consumed by src/components/structure/structure-page.tsx.

interface ApiProgram {
  id: string
  name: string
}

interface ApiDepartment {
  id: string
  name: string
  programs: ApiProgram[]
}

interface ApiFaculty {
  id: string
  name: string
  departments: ApiDepartment[]
}

function mapApiFaculty(faculty: ApiFaculty): Faculty {
  return {
    id: faculty.id,
    name: faculty.name,
    departments: faculty.departments.map((dept) => ({
      id: dept.id,
      name: dept.name,
      programs: dept.programs.map((p) => p.name),
    })),
  }
}

const countries = [
  'Tchad', 'Cameroun', 'Niger', 'Senegal', 'Mali',
  'Burkina Faso', 'Cote d Ivoire', 'Congo', 'RDC', 'Benin', 'Togo'
]

// ─── Header ──────────────────────────────────────────────────────────────────
function InstitutionHeader() {
  const { goBack } = useAppStore()
  const { data: structureData } = useStructure() as { data: { stats?: { faculties: number; programs: number } } | undefined }
  const { data: hrData } = useHrStaff() as { data: { stats?: { total: number } } | undefined }
  const facultiesCount = useCountUp(structureData?.stats?.faculties ?? 0, 1200)
  const programsCount = useCountUp(structureData?.stats?.programs ?? 0, 1400)
  const staffCount = useCountUp(hrData?.stats?.total ?? 0, 1300)

  return (
    <div className="space-y-6">
      {/* Gradient Header Banner */}
      <div className="relative overflow-hidden rounded-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--institution-primary)] via-[var(--institution-primary-light)] to-[var(--institution-secondary)]" />
        <svg className="absolute inset-0 w-full h-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="institution-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="40" height="40" fill="none" stroke="white" strokeWidth="0.5" />
              <circle cx="20" cy="20" r="3" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#institution-pattern)" />
        </svg>
        <div className="relative z-10 px-6 py-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Button variant="ghost" size="sm" onClick={goBack} className="text-white/70 hover:text-white hover:bg-white/10 -ml-2">
                  <ArrowLeft className="size-4 mr-1" />
                  Retour
                </Button>
              </div>
              <h1 className="text-2xl font-bold text-white">
                Configuration de l&apos;institution
              </h1>
              <p className="text-sm text-white/70 mt-1">
                Paramètres et réglages de l&apos;établissement
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/10"><GraduationCap className="size-5 text-white" /></div>
                <div>
                  <p className="text-xl font-bold text-white">{facultiesCount}</p>
                  <p className="text-[10px] text-white/70">Facultés</p>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/10"><BookOpen className="size-5 text-white" /></div>
                <div>
                  <p className="text-xl font-bold text-white">{programsCount}</p>
                  <p className="text-[10px] text-white/70">Programmes</p>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/10"><Users className="size-5 text-white" /></div>
                <div>
                  <p className="text-xl font-bold text-white">{staffCount}</p>
                  <p className="text-[10px] text-white/70">Personnel</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* University Setup Completion */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-[var(--institution-primary)]">Configuration de l&apos;université</span>
            <span className="text-xs font-semibold text-[var(--institution-secondary)]">72%</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[var(--institution-primary)] via-[var(--institution-secondary)] to-[var(--institution-secondary-bright)]"
              initial={{ width: 0 }}
              animate={{ width: '72%' }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          </div>
        </div>
        <Button className="bg-[var(--institution-secondary)] hover:bg-[var(--institution-secondary-dark)] text-white shrink-0">
          <Save className="size-4 mr-2" />
          Enregistrer
        </Button>
      </div>
    </div>
  )
}

// ─── Informations Tab ────────────────────────────────────────────────────────
function InformationsTab() {
  const { data: institutionQuery, isLoading, refetch } = useInstitution() as {
    data: InstitutionResponse | undefined
    isLoading: boolean
    refetch: () => void
  }

  const [formData, setFormData] = useState({
    nomOfficiel: '',
    sigle: '',
    devise: '',
    ministere: '',
    pays: '',
    ville: '',
    adresse: '',
    telephone: '',
    email: '',
    siteWeb: '',
    recteurNom: '',
    recteurTitre: 'Recteur',
    logo: '',
    secondaryLogo: '',
    thirdLogo: '',
    stamp: '',
    signature: '',
    secondarySignerName: '',
    secondarySignerTitle: '',
    secondarySignature: '',
    thirdSignerName: '',
    thirdSignerTitle: '',
    thirdSignature: '',
    secondaryStamp: '',
    thirdStamp: '',
    arabicMotto: '',
    contactPlacement: 'BOTTOM',
    sealSizeMm: 35,
    headerLanguageMode: 'FR_ONLY',
    arabicCountry: '',
    arabicName: '',
    arabicMinistry: '',
    headerLinesFr: [] as string[],
    headerLinesAr: [] as string[],
  })
  const [initialized, setInitialized] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingKind, setUploadingKind] = useState<string | null>(null)

  useEffect(() => {
    if (institutionQuery?.tenant && !initialized) {
      const t = institutionQuery.tenant
      setFormData({
        nomOfficiel: t.name || '',
        sigle: t.shortName || '',
        devise: t.motto || '',
        ministere: t.ministry || '',
        pays: t.country || '',
        ville: t.city || '',
        adresse: t.address || '',
        telephone: t.phone || '',
        email: t.email || '',
        siteWeb: t.website || '',
        recteurNom: t.rectorName || '',
        recteurTitre: t.rectorTitle || 'Recteur',
        logo: t.logo || '',
        secondaryLogo: t.secondaryLogo || '',
        thirdLogo: t.thirdLogo || '',
        stamp: t.stamp || '',
        signature: t.signature || '',
        secondarySignerName: t.secondarySignerName || '',
        secondarySignerTitle: t.secondarySignerTitle || '',
        secondarySignature: t.secondarySignature || '',
        thirdSignerName: t.thirdSignerName || '',
        thirdSignerTitle: t.thirdSignerTitle || '',
        thirdSignature: t.thirdSignature || '',
        secondaryStamp: t.secondaryStamp || '',
        thirdStamp: t.thirdStamp || '',
        arabicMotto: t.arabicMotto || '',
        contactPlacement: t.contactPlacement || 'BOTTOM',
        sealSizeMm: t.sealSizeMm || 35,
        headerLanguageMode: t.headerLanguageMode || 'FR_ONLY',
        arabicCountry: t.arabicCountry || '',
        arabicName: t.arabicName || '',
        arabicMinistry: t.arabicMinistry || '',
        headerLinesFr: parseHeaderLines(t.headerLinesFr) ?? [t.country, t.ministry, t.name].filter((line): line is string => Boolean(line)),
        headerLinesAr: parseHeaderLines(t.headerLinesAr) ?? [t.arabicCountry, t.arabicMinistry, t.arabicName].filter((line): line is string => Boolean(line)),
      })
      setInitialized(true)
    }
  }, [institutionQuery, initialized])

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const editHeaderLine = (side: 'headerLinesFr' | 'headerLinesAr', index: number, value: string) => {
    setFormData((prev) => ({ ...prev, [side]: prev[side].map((line, position) => position === index ? value : line) }))
  }
  const moveHeaderLine = (side: 'headerLinesFr' | 'headerLinesAr', index: number, direction: -1 | 1) => {
    setFormData((prev) => {
      const lines = [...prev[side]]
      const next = index + direction
      if (next < 0 || next >= lines.length) return prev
      ;[lines[index], lines[next]] = [lines[next], lines[index]]
      return { ...prev, [side]: lines }
    })
  }

  const handleAssetUpload = async (kind: 'logo' | 'secondaryLogo' | 'thirdLogo' | 'stamp' | 'signature' | 'secondarySignature' | 'thirdSignature' | 'secondaryStamp' | 'thirdStamp', file?: File) => {
    if (!file) return
    setUploadingKind(kind)
    try {
      const payload = new FormData()
      payload.set('kind', kind)
      payload.set('file', file)
      const response = await fetch('/api/institution/assets', { method: 'POST', body: payload })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Téléversement impossible')
      setFormData((current) => ({ ...current, [kind]: result.dataUrl }))
      void refetch()
      toast.success('Visuel enregistré')
    } catch (error) {
      toast.error('Téléversement impossible', { description: error instanceof Error ? error.message : 'Fichier invalide' })
    } finally {
      setUploadingKind(null)
    }
  }

  const handleSave = async () => {
    if (!formData.headerLinesFr.some((line) => line.trim())) {
      toast.error('Ajoutez au moins une ligne française à l’en-tête officiel.')
      return
    }
    if (formData.headerLanguageMode === 'FR_AR' && !formData.headerLinesAr.some((line) => line.trim())) {
      toast.error('Ajoutez au moins une ligne rédigée en arabe avant d’activer l’en-tête bilingue.')
      return
    }
    if ([...formData.headerLinesFr, ...formData.headerLinesAr].some((line) => !line.trim() || line.length > 130)) {
      toast.error('Chaque ligne d’en-tête doit contenir de 1 à 130 caractères.')
      return
    }
    setIsSaving(true)
    try {
      const res = await fetch('/api/institution', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.nomOfficiel,
          shortName: formData.sigle,
          motto: formData.devise,
          ministry: formData.ministere,
          country: formData.pays,
          city: formData.ville,
          address: formData.adresse,
          phone: formData.telephone,
          email: formData.email,
          website: formData.siteWeb,
          rectorName: formData.recteurNom,
          rectorTitle: formData.recteurTitre,
          secondarySignerName: formData.secondarySignerName,
          secondarySignerTitle: formData.secondarySignerTitle,
          thirdSignerName: formData.thirdSignerName,
          thirdSignerTitle: formData.thirdSignerTitle,
          arabicMotto: formData.arabicMotto,
          contactPlacement: formData.contactPlacement,
          sealSizeMm: formData.sealSizeMm,
          headerLanguageMode: formData.headerLanguageMode,
          arabicCountry: formData.arabicCountry,
          arabicName: formData.arabicName,
          arabicMinistry: formData.arabicMinistry,
          headerLinesFr: formData.headerLinesFr,
          headerLinesAr: formData.headerLinesAr,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Echec de l'enregistrement")
      toast.success('Informations enregistrées')
      refetch()
    } catch (error) {
      toast.error('Erreur', { description: error instanceof Error ? error.message : "Echec de l'enregistrement" })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-gray-400">
        Chargement...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Logo & Stamp uploads */}
        <div className="space-y-6">
          {/* Logo upload */}
          <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
          <Card className="border-l-4 border-l-[var(--institution-secondary)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Logo de l&apos;établissement</CardTitle>
              <CardDescription>Logo officiel utilise sur les documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-3">
                <div className="w-32 h-32 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden">
                  {formData.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- stored institution artwork
                    <img src={formData.logo} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <Building2 className="size-10 text-gray-300 mx-auto" />
                  )}
                </div>
                <Input type="file" accept="image/png,image/jpeg,image/webp" aria-label="Téléverser le logo officiel" disabled={Boolean(uploadingKind)} onChange={(event) => void handleAssetUpload('logo', event.target.files?.[0])} />
                <p className="text-[10px] text-gray-500 text-center">{uploadingKind === 'logo' ? 'Téléversement…' : 'PNG, JPEG ou WebP · 2 Mo maximum'}</p>
              </div>
            </CardContent>
          </Card>
          </motion.div>

          <Card className="border-l-4 border-l-[var(--institution-secondary)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Logos complémentaires</CardTitle>
              <CardDescription>Jusqu’à deux logos supplémentaires, centrés avec le logo principal sur tous les documents officiels.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3 min-h-20">
                {[['logo', formData.logo, 'Principal'], ['secondaryLogo', formData.secondaryLogo, 'Secondaire'], ['thirdLogo', formData.thirdLogo, 'Troisième']].map(([kind, image, label]) => (
                  <div key={kind} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                    <div className="h-14 w-14 overflow-hidden rounded-md border bg-white">
                      {image ? <img src={image} alt={`Logo ${label}`} className="h-full w-full object-contain" /> : <Building2 className="mx-auto mt-3 size-7 text-gray-300" />}
                    </div>
                    <span className="text-[10px] text-gray-500">{label}</span>
                  </div>
                ))}
              </div>
              <div className="grid gap-2">
                {([['secondaryLogo', 'Téléverser le logo secondaire'], ['thirdLogo', 'Téléverser le troisième logo']] as const).map(([kind, label]) => (
                  <Input key={kind} type="file" accept="image/png,image/jpeg,image/webp" aria-label={label} disabled={Boolean(uploadingKind)} onChange={(event) => void handleAssetUpload(kind, event.target.files?.[0])} />
                ))}
              </div>
              <p className="text-[10px] text-gray-500">Les logos sont recadrés et optimisés automatiquement (PNG, JPEG ou WebP, 2 Mo maximum).</p>
            </CardContent>
          </Card>

          <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
          <Card className="border-l-4 border-l-[var(--institution-accent)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Cachet officiel</CardTitle>
              <CardDescription>Cachet appose sur les documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-3">
                <div className="w-28 h-28 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden">
                  {formData.stamp ? (
                    // eslint-disable-next-line @next/next/no-img-element -- stored institution artwork
                    <img src={formData.stamp} alt="Cachet" className="w-full h-full object-contain" />
                  ) : (
                    <Stamp className="size-8 text-gray-300 mx-auto" />
                  )}
                </div>
                <Input type="file" accept="image/png,image/jpeg,image/webp" aria-label="Téléverser le cachet officiel" disabled={Boolean(uploadingKind)} onChange={(event) => void handleAssetUpload('stamp', event.target.files?.[0])} />
              </div>
            </CardContent>
          </Card>
          </motion.div>
          <Card className="border-l-4 border-l-[var(--institution-primary)]">
            <CardHeader className="pb-3"><CardTitle className="text-base">Signataire de droite</CardTitle><CardDescription>Signature du responsable, accompagnée du cachet officiel. Ce visuel ne vaut pas signature cryptographique.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {formData.signature && <div className="h-20 border rounded-lg bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- stored institution artwork */}
                <img src={formData.signature} alt="Signature enregistrée" className="h-full w-full object-contain" />
              </div>}
              <Input type="file" accept="image/png,image/jpeg,image/webp" aria-label="Téléverser la signature" disabled={Boolean(uploadingKind)} onChange={(event) => void handleAssetUpload('signature', event.target.files?.[0])} />
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-[#176341]">
            <CardHeader className="pb-3"><CardTitle className="text-base">Signataire de gauche</CardTitle><CardDescription>Nom et signature requis pour valider un relevé officiel. Son cachet ou logo est facultatif.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {formData.secondarySignature && <div className="h-20 border rounded-lg bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- stored institution artwork */}
                <img src={formData.secondarySignature} alt="Signature du second signataire" className="h-full w-full object-contain" />
              </div>}
              <Input type="file" accept="image/png,image/jpeg,image/webp" aria-label="Téléverser la signature du second signataire" disabled={Boolean(uploadingKind)} onChange={(event) => void handleAssetUpload('secondarySignature', event.target.files?.[0])} />
              {formData.secondaryStamp && <div className="h-20 border rounded-lg bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- stored institution artwork */}
                <img src={formData.secondaryStamp} alt="Cachet du signataire de gauche" className="h-full w-full object-contain" />
              </div>}
              <Label>Cachet ou logo du signataire de gauche (facultatif)</Label>
              <Input type="file" accept="image/png,image/jpeg,image/webp" aria-label="Téléverser le cachet du signataire de gauche" disabled={Boolean(uploadingKind)} onChange={(event) => void handleAssetUpload('secondaryStamp', event.target.files?.[0])} />
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-[#c6a142]">
            <CardHeader className="pb-3"><CardTitle className="text-base">Signataire central facultatif</CardTitle><CardDescription>Deux signataires par défaut ; ajoutez un troisième nom et sa signature si nécessaire.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {formData.thirdSignature && <div className="h-20 border rounded-lg bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- stored institution artwork */}
                <img src={formData.thirdSignature} alt="Signature du troisième signataire" className="h-full w-full object-contain" />
              </div>}
              <Input type="file" accept="image/png,image/jpeg,image/webp" aria-label="Téléverser la signature du troisième signataire" disabled={Boolean(uploadingKind)} onChange={(event) => void handleAssetUpload('thirdSignature', event.target.files?.[0])} />
              {formData.thirdStamp && <div className="h-20 border rounded-lg bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- stored institution artwork */}
                <img src={formData.thirdStamp} alt="Cachet du signataire central" className="h-full w-full object-contain" />
              </div>}
              <Label>Cachet ou logo du signataire central (facultatif)</Label>
              <Input type="file" accept="image/png,image/jpeg,image/webp" aria-label="Téléverser le cachet du signataire central" disabled={Boolean(uploadingKind)} onChange={(event) => void handleAssetUpload('thirdStamp', event.target.files?.[0])} />
            </CardContent>
          </Card>
        </div>

        {/* Right column: Form fields */}
        <div className="lg:col-span-2">
          <Card className="border-l-4 border-l-[var(--institution-primary)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Informations generales</CardTitle>
              <CardDescription>Renseignez les informations officielles de l&apos;établissement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="nomOfficiel">Nom officiel</Label>
                  <Input
                    id="nomOfficiel"
                    value={formData.nomOfficiel}
                    onChange={(e) => handleChange('nomOfficiel', e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="sigle">Sigle</Label>
                  <Input
                    id="sigle"
                    value={formData.sigle}
                    onChange={(e) => handleChange('sigle', e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="devise">Devise</Label>
                  <Input
                    id="devise"
                    value={formData.devise}
                    onChange={(e) => handleChange('devise', e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                {formData.headerLanguageMode === 'FR_AR' && <div>
                  <Label htmlFor="arabicMotto">Devise en arabe (rédigée par l’institution)</Label>
                  <Input id="arabicMotto" dir="rtl" maxLength={130} value={formData.arabicMotto} onChange={(event) => handleChange('arabicMotto', event.target.value)} className="mt-1.5" />
                </div>}
                <div className="sm:col-span-2">
                  <Label htmlFor="ministere">Ministere de tutelle</Label>
                  <Input
                    id="ministere"
                    value={formData.ministere}
                    onChange={(e) => handleChange('ministere', e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Langue de l’en-tête officiel</Label>
                  <Select value={formData.headerLanguageMode} onValueChange={(value) => handleChange('headerLanguageMode', value)}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="FR_ONLY">Français uniquement</SelectItem><SelectItem value="FR_AR">Français et arabe</SelectItem></SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">L’arabe est facultatif et rédigé par votre institution, jamais ajouté automatiquement.</p>
                </div>
                <div>
                  <Label>Coordonnées et référence sur les documents</Label>
                  <Select value={formData.contactPlacement} onValueChange={(value) => handleChange('contactPlacement', value)}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="BOTTOM">En bas (recommandé)</SelectItem><SelectItem value="TOP">Sous l’en-tête</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sealSizeMm">Diamètre des cachets : {formData.sealSizeMm} mm</Label>
                  <Input id="sealSizeMm" type="range" min={30} max={40} step={1} value={formData.sealSizeMm} onChange={(event) => setFormData((prev) => ({ ...prev, sealSizeMm: Number(event.target.value) }))} className="mt-3" />
                </div>
                <div className="sm:col-span-2 grid gap-5 sm:grid-cols-2">
                  {(['headerLinesFr', ...(formData.headerLanguageMode === 'FR_AR' ? ['headerLinesAr'] : [])] as Array<'headerLinesFr' | 'headerLinesAr'>).map((side) => <div key={side} className="rounded-lg border p-3 space-y-2">
                    <Label>{side === 'headerLinesFr' ? 'Colonne française, à gauche' : 'Colonne arabe, à droite'}</Label>
                    <p className="text-xs text-gray-500">Ajoutez, retirez et réordonnez jusqu’à 10 lignes officielles.</p>
                    {formData[side].map((line, index) => <div key={`${side}-${index}`} className="flex items-center gap-1">
                      <Input aria-label={`Ligne ${index + 1} ${side === 'headerLinesFr' ? 'française' : 'arabe'}`} dir={side === 'headerLinesAr' ? 'rtl' : 'ltr'} value={line} maxLength={130} onChange={(event) => editHeaderLine(side, index, event.target.value)} />
                      <Button type="button" variant="ghost" size="icon" aria-label="Monter la ligne" disabled={index === 0} onClick={() => moveHeaderLine(side, index, -1)}><ArrowUp className="size-4" /></Button>
                      <Button type="button" variant="ghost" size="icon" aria-label="Descendre la ligne" disabled={index === formData[side].length - 1} onClick={() => moveHeaderLine(side, index, 1)}><ArrowDown className="size-4" /></Button>
                      <Button type="button" variant="ghost" size="icon" aria-label="Supprimer la ligne" onClick={() => setFormData((prev) => ({ ...prev, [side]: prev[side].filter((_, position) => position !== index) }))}><Trash2 className="size-4" /></Button>
                    </div>)}
                    <Button type="button" variant="outline" size="sm" disabled={formData[side].length >= 10} onClick={() => setFormData((prev) => ({ ...prev, [side]: [...prev[side], ''] }))}><Plus className="size-4 mr-1" />Ajouter une ligne</Button>
                  </div>)}
                </div>
                <div>
                  <Label htmlFor="pays">Pays</Label>
                  <Select value={formData.pays} onValueChange={(v) => handleChange('pays', v)}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="ville">Ville</Label>
                  <Input
                    id="ville"
                    value={formData.ville}
                    onChange={(e) => handleChange('ville', e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="adresse">Adresse</Label>
                  <Input
                    id="adresse"
                    value={formData.adresse}
                    onChange={(e) => handleChange('adresse', e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="telephone">Telephone</Label>
                  <Input
                    id="telephone"
                    value={formData.telephone}
                    onChange={(e) => handleChange('telephone', e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="siteWeb">Site web</Label>
                  <Input
                    id="siteWeb"
                    value={formData.siteWeb}
                    onChange={(e) => handleChange('siteWeb', e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Separator className="my-2" />
                </div>
                <div>
                  <Label htmlFor="recteurNom">Recteur / Directeur</Label>
                  <Input
                    id="recteurNom"
                    value={formData.recteurNom}
                    onChange={(e) => handleChange('recteurNom', e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="recteurTitre">Titre</Label>
                  <Select value={formData.recteurTitre} onValueChange={(v) => handleChange('recteurTitre', v)}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Recteur">Recteur</SelectItem>
                      <SelectItem value="Directeur General">Directeur General</SelectItem>
                      <SelectItem value="President">President</SelectItem>
                      <SelectItem value="Administrateur">Administrateur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="secondarySignerName">Nom du signataire de gauche</Label>
                  <Input id="secondarySignerName" value={formData.secondarySignerName} onChange={(event) => handleChange('secondarySignerName', event.target.value)} className="mt-1.5" placeholder="Ex. président du jury" />
                </div>
                <div>
                  <Label htmlFor="secondarySignerTitle">Fonction du signataire de gauche</Label>
                  <Input id="secondarySignerTitle" value={formData.secondarySignerTitle} onChange={(event) => handleChange('secondarySignerTitle', event.target.value)} className="mt-1.5" placeholder="Ex. Président du jury" />
                </div>
                <div>
                  <Label htmlFor="thirdSignerName">Nom du signataire central</Label>
                  <Input id="thirdSignerName" value={formData.thirdSignerName} onChange={(event) => handleChange('thirdSignerName', event.target.value)} className="mt-1.5" placeholder="Nom officiel" />
                </div>
                <div>
                  <Label htmlFor="thirdSignerTitle">Fonction du signataire central</Label>
                  <Input id="thirdSignerTitle" value={formData.thirdSignerTitle} onChange={(event) => handleChange('thirdSignerTitle', event.target.value)} className="mt-1.5" placeholder="Fonction officielle" />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Button
                  className="bg-[var(--institution-secondary)] hover:bg-[var(--institution-secondary-dark)] text-white"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  <Save className="size-4 mr-2" />
                  {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ─── Structure Tab ───────────────────────────────────────────────────────────
function StructureTab() {
  const queryClient = useQueryClient()
  const { data: structureQuery, isLoading } = useStructure() as {
    data: { faculties?: ApiFaculty[] } | undefined
    isLoading: boolean
  }

  const rawFaculties = (structureQuery?.faculties || []) as ApiFaculty[]
  const faculties: Faculty[] = rawFaculties.map(mapApiFaculty)

  const [expandedFaculties, setExpandedFaculties] = useState<Record<string, boolean>>({})
  const [showAddFaculty, setShowAddFaculty] = useState(false)
  const [facultyForm, setFacultyForm] = useState({ name: '', shortName: '', deanName: '' })
  const [isSavingFaculty, setIsSavingFaculty] = useState(false)
  const [showAddDepartment, setShowAddDepartment] = useState(false)
  const [departmentForm, setDepartmentForm] = useState({ facultyId: '', name: '', shortName: '', headName: '' })
  const [isSavingDepartment, setIsSavingDepartment] = useState(false)

  const toggleFaculty = (id: string) => {
    setExpandedFaculties((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleAddFaculty = async () => {
    if (!facultyForm.name || !facultyForm.shortName) {
      toast.error('Champs requis', { description: 'Nom et sigle sont obligatoires' })
      return
    }
    setIsSavingFaculty(true)
    try {
      const res = await fetch('/api/structure?type=faculty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(facultyForm),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || "Echec de la creation")
      toast.success('Faculte creee', { description: facultyForm.name })
      queryClient.invalidateQueries({ queryKey: ['structure'] })
      setShowAddFaculty(false)
      setFacultyForm({ name: '', shortName: '', deanName: '' })
    } catch (error) {
      toast.error('Erreur', { description: error instanceof Error ? error.message : "Echec de la creation" })
    } finally {
      setIsSavingFaculty(false)
    }
  }

  const handleAddDepartment = async () => {
    if (!departmentForm.facultyId || !departmentForm.name || !departmentForm.shortName) {
      toast.error('Champs requis', { description: 'Faculte, nom et sigle sont obligatoires' })
      return
    }
    setIsSavingDepartment(true)
    try {
      const res = await fetch('/api/structure?type=department', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(departmentForm),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || "Echec de la creation")
      toast.success('Departement cree', { description: departmentForm.name })
      queryClient.invalidateQueries({ queryKey: ['structure'] })
      setShowAddDepartment(false)
      setDepartmentForm({ facultyId: '', name: '', shortName: '', headName: '' })
    } catch (error) {
      toast.error('Erreur', { description: error instanceof Error ? error.message : "Echec de la creation" })
    } finally {
      setIsSavingDepartment(false)
    }
  }

  const totalDepartments = faculties.reduce((acc, f) => acc + f.departments.length, 0)
  const totalPrograms = faculties.reduce(
    (acc, f) => acc + f.departments.reduce((a, d) => a + d.programs.length, 0),
    0
  )

  const facultyColors = ['var(--institution-secondary)', 'var(--institution-primary)', 'var(--institution-accent)']

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-gray-400">
        Chargement...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-[var(--institution-secondary)]">{faculties.length}</div>
            <div className="text-xs text-gray-500 mt-1">Facultés</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-[var(--institution-primary)]">{totalDepartments}</div>
            <div className="text-xs text-gray-500 mt-1">Departements</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-[var(--institution-accent)]">{totalPrograms}</div>
            <div className="text-xs text-gray-500 mt-1">Filieres</div>
          </CardContent>
        </Card>
      </div>

      {/* Faculty hierarchy */}
      {faculties.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-gray-400">
            Aucune faculté configurée pour le moment.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {faculties.map((faculty, fi) => (
            <Card key={faculty.id} className="overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleFaculty(faculty.id)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-1 h-8 rounded-full"
                    style={{ backgroundColor: facultyColors[fi % facultyColors.length] }}
                  />
                  <div>
                    <h3 className="font-semibold text-[var(--institution-primary)]">{faculty.name}</h3>
                    <p className="text-xs text-gray-500">
                      {faculty.departments.length} departements, {faculty.departments.reduce((a, d) => a + d.programs.length, 0)} filieres
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {faculty.departments.length} dept.
                  </Badge>
                  {expandedFaculties[faculty.id] ? (
                    <ChevronDown className="size-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="size-4 text-gray-400" />
                  )}
                </div>
              </div>

              {expandedFaculties[faculty.id] && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-2 bg-gray-50/50">
                    {faculty.departments.map((dept) => (
                      <div
                        key={dept.id}
                        className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-100"
                      >
                        <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                          <BookOpen className="size-3 text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-[var(--institution-primary)]">{dept.name}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {dept.programs.map((prog) => (
                              <Badge key={prog} variant="outline" className="text-xs font-normal">
                                {prog}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="outline" className="border-[var(--institution-secondary-30)] text-[var(--institution-secondary)]" onClick={() => setShowAddFaculty(true)}>
          <Plus className="size-4 mr-2" />
          Ajouter faculte
        </Button>
        <Button
          variant="outline"
          className="border-[var(--institution-primary-30)] text-[var(--institution-primary)]"
          disabled={rawFaculties.length === 0}
          onClick={() => setShowAddDepartment(true)}
        >
          <Plus className="size-4 mr-2" />
          Ajouter departement
        </Button>
      </div>

      {/* Add faculty dialog */}
      <Dialog open={showAddFaculty} onOpenChange={setShowAddFaculty}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une faculte</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm">Nom</Label>
              <Input value={facultyForm.name} onChange={(e) => setFacultyForm((f) => ({ ...f, name: e.target.value }))} placeholder="Faculte des Sciences" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Sigle</Label>
              <Input value={facultyForm.shortName} onChange={(e) => setFacultyForm((f) => ({ ...f, shortName: e.target.value }))} placeholder="FS" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Doyen (optionnel)</Label>
              <Input value={facultyForm.deanName} onChange={(e) => setFacultyForm((f) => ({ ...f, deanName: e.target.value }))} />
            </div>
            <Button className="w-full bg-[var(--institution-secondary)] hover:bg-[var(--institution-secondary-dark)] text-white" disabled={isSavingFaculty} onClick={handleAddFaculty}>
              {isSavingFaculty ? 'Creation...' : 'Creer la faculte'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add department dialog */}
      <Dialog open={showAddDepartment} onOpenChange={setShowAddDepartment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un departement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm">Faculte</Label>
              <Select value={departmentForm.facultyId} onValueChange={(v) => setDepartmentForm((f) => ({ ...f, facultyId: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner une faculté" /></SelectTrigger>
                <SelectContent>
                  {rawFaculties.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Nom</Label>
              <Input value={departmentForm.name} onChange={(e) => setDepartmentForm((f) => ({ ...f, name: e.target.value }))} placeholder="Departement d'Informatique" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Sigle</Label>
              <Input value={departmentForm.shortName} onChange={(e) => setDepartmentForm((f) => ({ ...f, shortName: e.target.value }))} placeholder="INFO" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Chef de departement (optionnel)</Label>
              <Input value={departmentForm.headName} onChange={(e) => setDepartmentForm((f) => ({ ...f, headName: e.target.value }))} />
            </div>
            <Button className="w-full bg-[var(--institution-secondary)] hover:bg-[var(--institution-secondary-dark)] text-white" disabled={isSavingDepartment} onClick={handleAddDepartment}>
              {isSavingDepartment ? 'Creation...' : 'Creer le departement'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Academique Tab ──────────────────────────────────────────────────────────
const VALID_ACADEMIC_SYSTEMS = ['lmd', 'classique', 'hybride', 'sante'] as const

function AcademiqueTab() {
  const { data: institutionQuery, isLoading, refetch } = useInstitution() as {
    data: InstitutionResponse | undefined
    isLoading: boolean
    refetch: () => void
  }
  const { data: academicYearsData } = useAcademicYears() as {
    data: { data: { id: string; name: string; startDate: string; endDate: string; isCurrent: boolean }[] } | undefined
  }
  const queryClient = useQueryClient()
  const updateUser = useAppStore((s) => s.updateUser)
  const academicYears = academicYearsData?.data ?? []

  const [system, setSystem] = useState('lmd')
  const [creditsSemester, setCreditsSemester] = useState('30')
  const [creditsYear, setCreditsYear] = useState('60')
  const [passingGrade, setPassingGrade] = useState('10')
  const [eliminationGrade, setEliminationGrade] = useState('7')
  const [initialized, setInitialized] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showAddYear, setShowAddYear] = useState(false)
  const [newYearName, setNewYearName] = useState('')
  const [newYearStart, setNewYearStart] = useState('')
  const [newYearEnd, setNewYearEnd] = useState('')
  const [isSavingYear, setIsSavingYear] = useState(false)
  const [settingCurrentId, setSettingCurrentId] = useState<string | null>(null)

  const handleAddYear = async () => {
    if (!newYearName || !newYearStart || !newYearEnd) {
      toast.error('Champs requis', { description: "Nom, date de debut et date de fin sont obligatoires" })
      return
    }
    setIsSavingYear(true)
    try {
      const res = await fetch('/api/academic-years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newYearName, startDate: newYearStart, endDate: newYearEnd }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Echec de la creation")
      }
      toast.success('Année académique créée')
      queryClient.invalidateQueries({ queryKey: ['academicYears'] })
      setShowAddYear(false)
      setNewYearName('')
      setNewYearStart('')
      setNewYearEnd('')
    } catch (error) {
      toast.error('Erreur', { description: error instanceof Error ? error.message : "Echec de la creation" })
    } finally {
      setIsSavingYear(false)
    }
  }

  const handleSetCurrentYear = async (id: string) => {
    setSettingCurrentId(id)
    try {
      const res = await fetch('/api/academic-years', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error("Echec de la mise a jour")
      toast.success('Année académique en cours mise à jour')
      queryClient.invalidateQueries({ queryKey: ['academicYears'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })
    } catch (error) {
      toast.error('Erreur', { description: error instanceof Error ? error.message : "Echec de la mise a jour" })
    } finally {
      setSettingCurrentId(null)
    }
  }

  useEffect(() => {
    if (institutionQuery?.tenant && !initialized) {
      const t = institutionQuery.tenant
      const apiSystem = (t.academicSystem || '').toLowerCase()
      setSystem((VALID_ACADEMIC_SYSTEMS as readonly string[]).includes(apiSystem) ? apiSystem : 'lmd')
      setCreditsSemester(String(t.settings?.creditsPerSemester ?? 30))
      setCreditsYear(String(t.settings?.creditsPerYear ?? 60))
      setPassingGrade(String(t.settings?.passingGrade ?? 10))
      setEliminationGrade(String(t.settings?.eliminationGrade ?? 7))
      setInitialized(true)
    }
  }, [institutionQuery, initialized])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/institution', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academicSystem: system,
          creditsPerSemester: Number(creditsSemester),
          creditsPerYear: Number(creditsYear),
          passingGrade: Number(passingGrade),
          eliminationGrade: Number(eliminationGrade),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Echec de l'enregistrement")
      toast.success('Configuration académique enregistrée')
      updateUser({ tenantAcademicSystem: system })
      refetch()
    } catch (error) {
      toast.error('Erreur', { description: error instanceof Error ? error.message : "Echec de l'enregistrement" })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-gray-400">
        Chargement...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* System selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Systeme d&apos;enseignement</CardTitle>
          <CardDescription>Choisissez le système académique de votre établissement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { value: 'lmd', label: 'LMD', icon: GraduationCap, desc: 'Licence-Master-Doctorat' },
              { value: 'classique', label: 'Classique', icon: BookOpen, desc: 'Systeme classique' },
              { value: 'hybride', label: 'Hybride', icon: Settings, desc: 'LMD + Classique' },
              { value: 'sante', label: 'Sante', icon: Stethoscope, desc: 'Ecoles de sante' },
            ].map((sys) => (
              <button
                key={sys.value}
                onClick={() => setSystem(sys.value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  system === sys.value
                    ? 'border-[var(--institution-secondary)] bg-[var(--institution-secondary-08)] shadow-sm'
                    : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    system === sys.value ? 'bg-[var(--institution-secondary-15)]' : 'bg-gray-100'
                  }`}
                >
                  <sys.icon
                    className={`size-5 ${system === sys.value ? 'text-[var(--institution-secondary)]' : 'text-gray-400'}`}
                  />
                </div>
                <span
                  className={`text-sm font-semibold ${
                    system === sys.value ? 'text-[var(--institution-secondary)]' : 'text-gray-700'
                  }`}
                >
                  {sys.label}
                </span>
                <span className="text-xs text-gray-400">{sys.desc}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Academic year manager */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Années académiques</CardTitle>
              <CardDescription>Gérez les années académiques et définissez l&apos;année en cours</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowAddYear(true)}>
              <Plus className="size-3 mr-1" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {academicYears.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Aucune année académique configurée.</p>
          ) : (
            <div className="space-y-2">
              {academicYears.map((year) => (
                <div
                  key={year.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    year.isCurrent
                      ? 'border-[var(--institution-secondary-30)] bg-[var(--institution-secondary-08)]'
                      : 'border-gray-100 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Calendar className={`size-4 ${year.isCurrent ? 'text-[var(--institution-secondary)]' : 'text-gray-400'}`} />
                    <div>
                      <p className={`font-medium text-sm ${year.isCurrent ? 'text-[var(--institution-secondary)]' : 'text-[var(--institution-primary)]'}`}>
                        {year.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(year.startDate).toLocaleDateString('fr-FR')} au {new Date(year.endDate).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  {year.isCurrent ? (
                    <Badge className="bg-[var(--institution-secondary)] text-white text-xs">En cours</Badge>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-gray-500"
                      disabled={settingCurrentId === year.id}
                      onClick={() => handleSetCurrentYear(year.id)}
                    >
                      {settingCurrentId === year.id ? 'Mise a jour...' : 'Definir en cours'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddYear} onOpenChange={setShowAddYear}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une année académique</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm">Nom (ex: 2026-2027)</Label>
              <Input value={newYearName} onChange={(e) => setNewYearName(e.target.value)} placeholder="2026-2027" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Date de debut</Label>
                <Input type="date" value={newYearStart} onChange={(e) => setNewYearStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Date de fin</Label>
                <Input type="date" value={newYearEnd} onChange={(e) => setNewYearEnd(e.target.value)} />
              </div>
            </div>
            <Button className="w-full bg-[var(--institution-secondary)] hover:bg-[var(--institution-secondary-dark)] text-white" disabled={isSavingYear} onClick={handleAddYear}>
              {isSavingYear ? 'Création…' : "Créer l’année académique"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Semester & grades configuration */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Configuration des semestres</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Credits par semestre</Label>
              <Select value={creditsSemester} onValueChange={setCreditsSemester}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24">24 credits</SelectItem>
                  <SelectItem value="27">27 credits</SelectItem>
                  <SelectItem value="30">30 credits</SelectItem>
                  <SelectItem value="33">33 credits</SelectItem>
                  <SelectItem value="36">36 credits</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Crédits par année</Label>
              <Select value={creditsYear} onValueChange={setCreditsYear}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="48">48 credits</SelectItem>
                  <SelectItem value="54">54 credits</SelectItem>
                  <SelectItem value="60">60 credits</SelectItem>
                  <SelectItem value="66">66 credits</SelectItem>
                  <SelectItem value="72">72 credits</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sessions d&apos;examen</Label>
              <div className="mt-1.5 space-y-1.5">
                {['Session normale', 'Session de rattrapage', 'Session exceptionnelle'].map((s) => (
                  <div key={s} className="flex items-center gap-2 p-2 rounded bg-gray-50 text-sm text-gray-700">
                    <CheckCircle2 className="size-3.5 text-[var(--institution-secondary)]" />
                    {s}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Notes et validation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Note de passage</Label>
              <Select value={passingGrade} onValueChange={setPassingGrade}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 / 20</SelectItem>
                  <SelectItem value="12">12 / 20</SelectItem>
                  <SelectItem value="14">14 / 20</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Note d&apos;elimination</Label>
              <Select value={eliminationGrade} onValueChange={setEliminationGrade}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 / 20</SelectItem>
                  <SelectItem value="7">7 / 20</SelectItem>
                  <SelectItem value="8">8 / 20</SelectItem>
                  <SelectItem value="0">Pas d elimination</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="pt-2">
              <Label className="mb-2 block">Apercu des seuils</Label>
              <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 bg-red-400 rounded-l-full" style={{ width: '25%' }} />
                <div className="absolute top-0 bottom-0 bg-yellow-400" style={{ left: '25%', width: '25%' }} />
                <div className="absolute top-0 bottom-0 bg-[var(--institution-secondary)] rounded-r-full" style={{ left: '50%', width: '50%' }} />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Elimine</span>
                <span>Passable</span>
                <span>Valide</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          className="bg-[var(--institution-secondary)] hover:bg-[var(--institution-secondary-dark)] text-white"
          onClick={handleSave}
          disabled={isSaving}
        >
          <Save className="size-4 mr-2" />
          {isSaving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  )
}

// ─── Documents Tab ───────────────────────────────────────────────────────────
function DocumentsTab() {
  const { data: institutionQuery, isLoading } = useInstitution() as {
    data: InstitutionResponse | undefined
    isLoading: boolean
  }
  const tenant = institutionQuery?.tenant

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-gray-400">
        Chargement...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Document formats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Types de documents generes</CardTitle>
          <CardDescription>Chaque document est un PDF vérifiable, muni d&apos;un code de contrôle et d&apos;un QR code.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              'Releve de notes',
              'Attestation',
              'Diplome',
              'Reçu de paiement',
              'Proces-verbal',
            ].map((doc) => (
              <div
                key={doc}
                className="flex flex-col items-center gap-2 p-3 rounded-lg border border-gray-100 bg-white"
              >
                <div className="w-10 h-10 rounded-lg bg-[var(--institution-primary-08)] flex items-center justify-center">
                  <FileText className="size-5 text-[var(--institution-primary)]/60" />
                </div>
                <span className="text-xs font-medium text-gray-700 text-center">{doc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Signature configuration */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Trois signataires du relevé</CardTitle>
            <CardDescription>Configurez leurs noms et signatures dans l&apos;onglet Informations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {([
              { place: 'Gauche', name: tenant?.secondarySignerName, title: tenant?.secondarySignerTitle, signed: Boolean(tenant?.secondarySignature) },
              { place: 'Centre', name: tenant?.thirdSignerName, title: tenant?.thirdSignerTitle, signed: Boolean(tenant?.thirdSignature) },
              { place: 'Droite + cachet', name: tenant?.rectorName, title: tenant?.rectorTitle, signed: Boolean(tenant?.signature && tenant?.stamp) },
            ] as const).map((signer) => <div key={signer.place} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--institution-accent-55)] bg-[var(--institution-accent-08)] p-2 text-xs">
              <div><p className="font-semibold text-[var(--institution-primary)]">{signer.place} · {signer.name || 'Nom à renseigner'}</p><p className="text-gray-600">{signer.title || 'Fonction à renseigner'}</p></div>
              <span className={signer.name && signer.signed ? 'text-[#176341]' : 'text-amber-800'}>{signer.name && signer.signed ? 'Complet' : 'Incomplet'}</span>
            </div>)}
          </CardContent>
        </Card>

        {/* Verification */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Verification</CardTitle>
            <CardDescription>Référence et intégrité du PDF sont deux vérifications distinctes.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--institution-secondary-08)] border border-[var(--institution-secondary-20)]">
              <div className="w-9 h-9 rounded-lg bg-[var(--institution-secondary-15)] flex items-center justify-center shrink-0">
                <QrCode className="size-4 text-[var(--institution-secondary)]" />
              </div>
              <p className="text-xs text-gray-600">
                Le QR vérifie la référence et sa validation. Pour les nouveaux PDF validés, le fichier peut aussi être comparé à l’original conservé sur <span className="font-mono text-[var(--institution-secondary)]">/verify</span>. Une image de signature ou de cachet ne remplace pas un certificat numérique.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header/Footer preview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">En-tete des documents generes</CardTitle>
          <CardDescription>Compose a partir des informations de l&apos;onglet Informations — aucun champ separe a remplir ici</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-3 rounded-lg border border-gray-200 bg-gray-50 max-w-md text-xs text-gray-500 space-y-1">
            <div className="flex items-center gap-2 font-semibold text-[var(--institution-primary)] text-sm">
              <Building2 className="size-3.5" />
              <span>{tenant?.name || 'Nom de l’institution'}</span>
            </div>
            <div className="flex items-center gap-2 pl-5">
              <span>{[tenant?.address, tenant?.city].filter(Boolean).join(', ') || 'Adresse non renseignee'}</span>
            </div>
            <div className="flex items-center gap-2 pl-5">
              <span>{[tenant?.phone, tenant?.email].filter(Boolean).join(' | ') || 'Contact non renseigne'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Apparence Tab ───────────────────────────────────────────────────────────
function ApparenceTab() {
  const queryClient = useQueryClient()
  const { data: institutionQuery, isLoading, refetch } = useInstitution() as {
    data: InstitutionResponse | undefined
    isLoading: boolean
    refetch: () => void
  }
  const tenant = institutionQuery?.tenant

  const [primaryColor, setPrimaryColor] = useState('#1a2744')
  const [secondaryColor, setSecondaryColor] = useState('#2d7a4f')
  const [accentColor, setAccentColor] = useState('#d4a853')
  const [initialized, setInitialized] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (tenant?.settings && !initialized) {
      setPrimaryColor(tenant.settings.primaryColor || '#1a2744')
      setSecondaryColor(tenant.settings.secondaryColor || '#2d7a4f')
      setAccentColor(tenant.settings.accentColor || '#d4a853')
      setInitialized(true)
    }
  }, [tenant, initialized])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/institution', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryColor, secondaryColor, accentColor }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Echec de l'enregistrement")
      toast.success('Couleurs enregistrées')
      refetch()
      void queryClient.invalidateQueries({ queryKey: ['institution-theme'] })
    } catch (error) {
      toast.error('Erreur', { description: error instanceof Error ? error.message : "Echec de l'enregistrement" })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-gray-400">
        Chargement...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Color pickers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Couleurs de l&apos;institution</CardTitle>
            <CardDescription>Personnalisez les couleurs de votre plateforme</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Couleur primaire (navigation et titres)</Label>
              <div className="flex items-center gap-3 mt-1.5">
                <div className="relative">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200"
                  />
                </div>
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="max-w-32 font-mono text-sm"
                />
              </div>
            </div>
            <div>
              <Label>Couleur secondaire (actions et repères)</Label>
              <div className="flex items-center gap-3 mt-1.5">
                <div className="relative">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200"
                  />
                </div>
                <Input
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="max-w-32 font-mono text-sm"
                />
              </div>
            </div>
            <div>
              <Label>Couleur d&apos;accent (détails et surlignages)</Label>
              <div className="flex items-center gap-3 mt-1.5">
                <div className="relative">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-gray-200"
                  />
                </div>
                <Input
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="max-w-32 font-mono text-sm"
                />
              </div>
            </div>
            <div className="pt-2">
              <Button className="bg-[var(--institution-secondary)] hover:bg-[var(--institution-secondary-dark)] text-white" onClick={handleSave} disabled={isSaving || ![primaryColor, secondaryColor, accentColor].every(validBrandColor)}>
                <Save className="size-4 mr-2" />
                {isSaving ? 'Enregistrement...' : 'Enregistrer les couleurs'}
              </Button>
              <p className="text-xs text-gray-500 mt-2">Les teintes trop claires sont foncées automatiquement sur les boutons et menus pour préserver la lisibilité.</p>
            </div>
          </CardContent>
        </Card>

        {/* Preview card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Apercu en direct</CardTitle>
            <CardDescription>Apercu de vos couleurs sur l&apos;interface</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border overflow-hidden bg-white">
              {/* Header preview */}
              <div
                className="p-3 flex items-center gap-2"
                style={{ backgroundColor: readableBrandColor(primaryColor) }}
              >
                <div className="w-6 h-6 rounded bg-white/20 flex items-center justify-center">
                  <Shield className="size-3.5 text-white" />
                </div>
                <span className="text-white text-sm font-bold">UniSahel</span>
                <div className="ml-auto flex gap-1.5">
                  <div className="w-4 h-1.5 rounded bg-white/30" />
                  <div className="w-4 h-1.5 rounded bg-white/30" />
                  <div className="w-4 h-1.5 rounded bg-white/30" />
                </div>
              </div>
              {/* Content preview */}
              <div className="p-4 space-y-3 bg-gray-50">
                <div className="h-3 rounded w-3/4 bg-gray-200" />
                <div className="h-2 rounded w-1/2 bg-gray-100" />
                <div className="flex gap-2 mt-3">
                  <div
                    className="h-7 rounded-md flex items-center justify-center px-3"
                    style={{ backgroundColor: readableBrandColor(secondaryColor) }}
                  >
                    <span className="text-white text-xs font-medium">Valider</span>
                  </div>
                  <div className="h-7 rounded-md border flex items-center justify-center px-3 border-gray-200">
                    <span className="text-xs text-gray-600">Annuler</span>
                  </div>
                </div>
              </div>
              {/* Accent preview */}
              <div className="p-3 flex items-center gap-2 bg-white border-gray-100 border-t">
                <div className="w-5 h-5 rounded" style={{ backgroundColor: accentColor }} />
                <div className="h-2 rounded w-20 bg-gray-200" />
                <div className="h-2 rounded w-12 ml-auto bg-gray-200" />
              </div>
            </div>

            {/* Color swatches */}
            <div className="mt-4 flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: primaryColor }} />
                <span className="text-xs text-gray-500">Primaire</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: secondaryColor }} />
                <span className="text-xs text-gray-500">Secondaire</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: accentColor }} />
                <span className="text-xs text-gray-500">Accent</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logo & stamp preview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Logo et cachet</CardTitle>
          <CardDescription>Definis dans l&apos;onglet Informations — utilises sur les documents officiels generes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6 items-center justify-center p-6 bg-gray-50 rounded-xl">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full border-2 border-gray-200 flex items-center justify-center bg-white overflow-hidden">
                {tenant?.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- externally hosted logo URL, not a local asset
                  <img src={tenant.logo} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <Building2 className="size-8 text-gray-300" />
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2">Logo</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 rounded-lg border-2 border-gray-200 flex items-center justify-center bg-white overflow-hidden">
                {tenant?.stamp ? (
                  // eslint-disable-next-line @next/next/no-img-element -- externally hosted stamp URL, not a local asset
                  <img src={tenant.stamp} alt="Cachet" className="w-full h-full object-contain" />
                ) : (
                  <Stamp className="size-8 text-gray-300" />
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2">Cachet</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 rounded border-2 border-gray-200 flex items-center justify-center bg-white">
                <QrCode className="size-8 text-gray-300" />
              </div>
              <p className="text-xs text-gray-400 mt-2">QR Code</p>
              <p className="text-[9px] text-gray-400">Sur chaque document</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Abonnement Tab ──────────────────────────────────────────────────────────
const PLAN_LABELS: Record<string, string> = { STARTER: 'Starter', PRO: 'Pro', ENTERPRISE: 'Entreprise' }

function AbonnementTab() {
  const { data: institutionQuery, isLoading } = useInstitution() as {
    data: InstitutionResponse | undefined
    isLoading: boolean
  }
  const tenant = institutionQuery?.tenant
  const stats = institutionQuery?.stats

  const plans = [
    {
      id: 'STARTER',
      icon: Rocket,
      description: 'Pour les petits établissements',
      features: ['Gestion LMD de base', 'Documents PDF avec QR code', 'Enregistrement des paiements'],
    },
    {
      id: 'PRO',
      icon: Star,
      description: 'Pour les universités moyennes',
      features: ['LMD, classique et santé', 'Facultés et départements illimités', 'Import et export en masse'],
    },
    {
      id: 'ENTERPRISE',
      icon: Crown,
      description: 'Pour les grandes universités',
      features: ['Tous les systèmes académiques', 'Personnalisation complète', 'Support dédié'],
    },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-gray-400">
        Chargement...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current plan */}
      <Card className="border-[var(--institution-secondary-30)] bg-gradient-to-r from-[var(--institution-secondary-08)] to-transparent">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-[var(--institution-secondary)] text-white">{PLAN_LABELS[tenant?.subscriptionPlan || 'STARTER']}</Badge>
                <span className="text-sm text-gray-500">Plan actuel</span>
              </div>
              <h3 className="text-xl font-bold text-[var(--institution-primary)]">
                Plan {PLAN_LABELS[tenant?.subscriptionPlan || 'STARTER']}
              </h3>
              {tenant?.subscriptionEnd && (
                <p className="text-sm text-gray-500 mt-1">
                  Valide jusqu&apos;au {new Date(tenant.subscriptionEnd).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="mailto:contact@unisahel.africa?subject=Changement%20de%20plan">Contacter le support pour changer de plan</a>
            </Button>
          </div>
          <p className="text-[11px] text-gray-400 mt-3">
            Le plan et la facturation sont geres par l&apos;equipe UniSahel, pas en libre-service depuis cette page.
          </p>
        </CardContent>
      </Card>

      {/* Real usage stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Étudiants', value: stats?.students ?? 0 },
          { label: 'Enseignants', value: stats?.teachers ?? 0 },
          { label: 'Personnel', value: stats?.staffUsers ?? 0 },
          { label: 'Documents generes', value: stats?.documentsGenerated ?? 0 },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
              <p className="text-lg font-bold text-[var(--institution-primary)]">{stat.value.toLocaleString('fr-FR')}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Plan comparison (informational only -- no self-service billing exists) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = (tenant?.subscriptionPlan || 'STARTER') === plan.id
          return (
            <Card key={plan.id} className={isCurrent ? 'border-[var(--institution-secondary)] shadow-md' : 'border-gray-100'}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isCurrent ? 'bg-[var(--institution-secondary-15)]' : 'bg-gray-100'}`}>
                    <plan.icon className={`size-5 ${isCurrent ? 'text-[var(--institution-secondary)]' : 'text-gray-400'}`} />
                  </div>
                  <CardTitle className="text-lg">{PLAN_LABELS[plan.id]}</CardTitle>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2">
                      <CheckCircle2 className={`size-4 shrink-0 mt-0.5 ${isCurrent ? 'text-[var(--institution-secondary)]' : 'text-gray-300'}`} />
                      <span className="text-xs text-gray-600">{feature}</span>
                    </div>
                  ))}
                </div>
                {isCurrent && (
                  <Badge variant="outline" className="mt-4 text-xs">Plan actuel</Badge>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Institution Page ───────────────────────────────────────────────────
export function InstitutionPage() {
  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <InstitutionHeader />

        <Tabs defaultValue="informations" className="space-y-6">
          <TabsList className="bg-white border border-gray-100 shadow-sm p-1 h-auto flex-wrap gap-1">
            <TabsTrigger value="informations" className="text-xs sm:text-sm data-[state=active]:bg-[var(--institution-primary)] data-[state=active]:text-white">
              <Building2 className="size-3.5 mr-1.5" />
              Informations
            </TabsTrigger>
            <TabsTrigger value="structure" className="text-xs sm:text-sm data-[state=active]:bg-[var(--institution-primary)] data-[state=active]:text-white">
              <GraduationCap className="size-3.5 mr-1.5" />
              Structure
            </TabsTrigger>
            <TabsTrigger value="academique" className="text-xs sm:text-sm data-[state=active]:bg-[var(--institution-primary)] data-[state=active]:text-white">
              <BookOpen className="size-3.5 mr-1.5" />
              Académique
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-xs sm:text-sm data-[state=active]:bg-[var(--institution-primary)] data-[state=active]:text-white">
              <FileText className="size-3.5 mr-1.5" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="apparence" className="text-xs sm:text-sm data-[state=active]:bg-[var(--institution-primary)] data-[state=active]:text-white">
              <Palette className="size-3.5 mr-1.5" />
              Apparence
            </TabsTrigger>
            <TabsTrigger value="abonnement" className="text-xs sm:text-sm data-[state=active]:bg-[var(--institution-primary)] data-[state=active]:text-white">
              <CreditCard className="size-3.5 mr-1.5" />
              Abonnement
            </TabsTrigger>
          </TabsList>

          <TabsContent value="informations">
            <InformationsTab />
          </TabsContent>
          <TabsContent value="structure">
            <StructureTab />
          </TabsContent>
          <TabsContent value="academique">
            <AcademiqueTab />
          </TabsContent>
          <TabsContent value="documents">
            <DocumentsTab />
          </TabsContent>
          <TabsContent value="apparence">
            <ApparenceTab />
          </TabsContent>
          <TabsContent value="abonnement">
            <AbonnementTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
