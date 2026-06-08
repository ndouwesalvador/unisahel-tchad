'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import {
  ArrowLeft,
  Save,
  Upload,
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
  MapPin,
  Phone,
  Mail,
  Stamp,
  QrCode,
  Shield,
  CheckCircle2,
  Star,
  Crown,
  Rocket,
  Stethoscope,
} from 'lucide-react'

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

// ─── Demo Data ───────────────────────────────────────────────────────────────
const demoFaculties: Faculty[] = [
  {
    id: 'f1',
    name: 'Faculte des Sciences',
    departments: [
      { id: 'd1', name: 'Informatique', programs: ['Licence Informatique', 'Master IA'] },
      { id: 'd2', name: 'Mathematiques', programs: ['Licence Maths', 'Master Statistiques'] },
      { id: 'd3', name: 'Physique', programs: ['Licence Physique'] },
    ],
  },
  {
    id: 'f2',
    name: 'Faculte de Droit',
    departments: [
      { id: 'd4', name: 'Droit Prive', programs: ['Licence Droit Prive', 'Master Droit des Affaires'] },
      { id: 'd5', name: 'Droit Public', programs: ['Licence Droit Public'] },
    ],
  },
  {
    id: 'f3',
    name: 'Faculte des Sciences de la Sante',
    departments: [
      { id: 'd6', name: 'Medecine', programs: ['Doctorat en Medecine'] },
      { id: 'd7', name: 'Pharmacie', programs: ['Doctorat en Pharmacie'] },
      { id: 'd8', name: 'Soins Infirmiers', programs: ['Licence Soins Infirmiers'] },
    ],
  },
]

const academicYears = [
  { id: 'ay1', label: '2025-2026', start: '2025-10-01', end: '2026-07-15', isCurrent: true },
  { id: 'ay2', label: '2024-2025', start: '2024-10-01', end: '2025-07-15', isCurrent: false },
  { id: 'ay3', label: '2023-2024', start: '2023-10-01', end: '2024-07-15', isCurrent: false },
]

const countries = [
  'Tchad', 'Cameroun', 'Niger', 'Senegal', 'Mali',
  'Burkina Faso', 'Cote d Ivoire', 'Congo', 'RDC', 'Benin', 'Togo'
]

// ─── Header ──────────────────────────────────────────────────────────────────
function InstitutionHeader() {
  const { goBack } = useAppStore()
  const facultiesCount = useCountUp(3, 1200)
  const programsCount = useCountUp(42, 1400)
  const staffCount = useCountUp(156, 1300)

  return (
    <div className="space-y-6">
      {/* Gradient Header Banner */}
      <div className="relative overflow-hidden rounded-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a2744] via-[#1f3050] to-[#2d7a4f]" />
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
                Parametres et reglages de l&apos;etablissement
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/10"><GraduationCap className="size-5 text-white" /></div>
                <div>
                  <p className="text-xl font-bold text-white">{facultiesCount}</p>
                  <p className="text-[10px] text-white/70">Facultes</p>
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
            <span className="text-xs font-medium text-[#1a2744]">Configuration de l&apos;universite</span>
            <span className="text-xs font-semibold text-[#2d7a4f]">72%</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#1a2744] via-[#2d7a4f] to-[#3da66a]"
              initial={{ width: 0 }}
              animate={{ width: '72%' }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          </div>
        </div>
        <Button className="bg-[#2d7a4f] hover:bg-[#236b40] text-white shrink-0">
          <Save className="size-4 mr-2" />
          Enregistrer
        </Button>
      </div>
    </div>
  )
}

// ─── Informations Tab ────────────────────────────────────────────────────────
function InformationsTab() {
  const [formData, setFormData] = useState({
    nomOfficiel: 'Universite de N\'Djamena',
    sigle: 'UND',
    devise: 'Scientia - Labor - Progressus',
    ministere: 'Ministere de l\'Enseignement Superieur',
    pays: 'Tchad',
    ville: 'N\'Djamena',
    adresse: 'BP 1117, N\'Djamena',
    telephone: '+235 66 00 00 00',
    email: 'contact@und.td',
    siteWeb: 'www.univ-ndjamena.td',
    recteurNom: 'Prof. Mahamat Saleh YOUNSSOUF',
    recteurTitre: 'Recteur',
  })

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Logo & Stamp uploads */}
        <div className="space-y-6">
          {/* Logo upload */}
          <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
          <Card className="border-l-4 border-l-[#2d7a4f]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Logo de l&apos;etablissement</CardTitle>
              <CardDescription>Logo officiel utilise sur les documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                <div className="w-32 h-32 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 hover:border-[#2d7a4f] transition-colors cursor-pointer group">
                  <div className="text-center">
                    <Building2 className="size-10 text-gray-300 group-hover:text-[#2d7a4f] transition-colors mx-auto" />
                    <span className="text-xs text-gray-400 mt-2 block">Clic pour televerser</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="text-xs">
                  <Upload className="size-3 mr-1" />
                  Changer le logo
                </Button>
              </div>
            </CardContent>
          </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
          <Card className="border-l-4 border-l-[#d4a853]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Cachet officiel</CardTitle>
              <CardDescription>Cachet appose sur les documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                <div className="w-28 h-28 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 hover:border-[#d4a853] transition-colors cursor-pointer group">
                  <div className="text-center">
                    <Stamp className="size-8 text-gray-300 group-hover:text-[#d4a853] transition-colors mx-auto" />
                    <span className="text-xs text-gray-400 mt-1 block">Cachet</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="text-xs">
                  <Upload className="size-3 mr-1" />
                  Changer le cachet
                </Button>
              </div>
            </CardContent>
          </Card>
          </motion.div>
        </div>

        {/* Right column: Form fields */}
        <div className="lg:col-span-2">
          <Card className="border-l-4 border-l-[#1a2744]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Informations generales</CardTitle>
              <CardDescription>Renseignez les informations officielles de l&apos;etablissement</CardDescription>
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
                <div className="sm:col-span-2">
                  <Label htmlFor="ministere">Ministere de tutelle</Label>
                  <Input
                    id="ministere"
                    value={formData.ministere}
                    onChange={(e) => handleChange('ministere', e.target.value)}
                    className="mt-1.5"
                  />
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
              </div>
              <div className="mt-6 flex justify-end">
                <Button className="bg-[#2d7a4f] hover:bg-[#236b40] text-white">
                  <Save className="size-4 mr-2" />
                  Enregistrer
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
  const [expandedFaculties, setExpandedFaculties] = useState<Record<string, boolean>>({ f1: true, f2: false, f3: false })

  const toggleFaculty = (id: string) => {
    setExpandedFaculties((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const totalDepartments = demoFaculties.reduce((acc, f) => acc + f.departments.length, 0)
  const totalPrograms = demoFaculties.reduce(
    (acc, f) => acc + f.departments.reduce((a, d) => a + d.programs.length, 0),
    0
  )

  const facultyColors = ['#2d7a4f', '#1a2744', '#d4a853']

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-[#2d7a4f]">{demoFaculties.length}</div>
            <div className="text-xs text-gray-500 mt-1">Facultes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-[#1a2744]">{totalDepartments}</div>
            <div className="text-xs text-gray-500 mt-1">Departements</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-[#d4a853]">{totalPrograms}</div>
            <div className="text-xs text-gray-500 mt-1">Filieres</div>
          </CardContent>
        </Card>
      </div>

      {/* Faculty hierarchy */}
      <div className="space-y-3">
        {demoFaculties.map((faculty, fi) => (
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
                  <h3 className="font-semibold text-[#1a2744]">{faculty.name}</h3>
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
                        <p className="font-medium text-sm text-[#1a2744]">{dept.name}</p>
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

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="outline" className="border-[#2d7a4f30] text-[#2d7a4f]">
          <Plus className="size-4 mr-2" />
          Ajouter faculte
        </Button>
        <Button variant="outline" className="border-[#1a274430] text-[#1a2744]">
          <Plus className="size-4 mr-2" />
          Ajouter departement
        </Button>
      </div>
    </div>
  )
}

// ─── Academique Tab ──────────────────────────────────────────────────────────
function AcademiqueTab() {
  const [system, setSystem] = useState('lmd')
  const [creditsSemester, setCreditsSemester] = useState('30')
  const [creditsYear, setCreditsYear] = useState('60')
  const [passingGrade, setPassingGrade] = useState('10')
  const [eliminationGrade, setEliminationGrade] = useState('7')

  return (
    <div className="space-y-6">
      {/* System selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Systeme d&apos;enseignement</CardTitle>
          <CardDescription>Choisissez le systeme academique de votre etablissement</CardDescription>
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
                    ? 'border-[#2d7a4f] bg-[#2d7a4f08] shadow-sm'
                    : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    system === sys.value ? 'bg-[#2d7a4f15]' : 'bg-gray-100'
                  }`}
                >
                  <sys.icon
                    className={`size-5 ${system === sys.value ? 'text-[#2d7a4f]' : 'text-gray-400'}`}
                  />
                </div>
                <span
                  className={`text-sm font-semibold ${
                    system === sys.value ? 'text-[#2d7a4f]' : 'text-gray-700'
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
              <CardTitle className="text-base">Annees academiques</CardTitle>
              <CardDescription>Gerez les annees academiques et definissez l&apos;annee en cours</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Plus className="size-3 mr-1" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {academicYears.map((year) => (
              <div
                key={year.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  year.isCurrent
                    ? 'border-[#2d7a4f30] bg-[#2d7a4f08]'
                    : 'border-gray-100 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Calendar className={`size-4 ${year.isCurrent ? 'text-[#2d7a4f]' : 'text-gray-400'}`} />
                  <div>
                    <p className={`font-medium text-sm ${year.isCurrent ? 'text-[#2d7a4f]' : 'text-[#1a2744]'}`}>
                      {year.label}
                    </p>
                    <p className="text-xs text-gray-400">
                      {year.start} au {year.end}
                    </p>
                  </div>
                </div>
                {year.isCurrent ? (
                  <Badge className="bg-[#2d7a4f] text-white text-xs">En cours</Badge>
                ) : (
                  <Button variant="ghost" size="sm" className="text-xs text-gray-500">
                    Definir en cours
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
              <Label>Credits par annee</Label>
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
                    <CheckCircle2 className="size-3.5 text-[#2d7a4f]" />
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
                <div className="absolute top-0 bottom-0 bg-[#2d7a4f] rounded-r-full" style={{ left: '50%', width: '50%' }} />
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
    </div>
  )
}

// ─── Documents Tab ───────────────────────────────────────────────────────────
function DocumentsTab() {
  const [qrPosition, setQrPosition] = useState('bottom-right')
  const [stampPosition, setStampPosition] = useState('bottom-left')

  return (
    <div className="space-y-6">
      {/* Document formats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Formats de documents</CardTitle>
          <CardDescription>Configurez les modeles de documents officiels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              'Releve de notes',
              'Attestation',
              'Diplome',
              'Recu de paiement',
              'Certificat de scolarite',
              'Carte etudiant',
              'Proces-verbal',
              'Attestation de stage',
            ].map((doc) => (
              <div
                key={doc}
                className="flex flex-col items-center gap-2 p-3 rounded-lg border border-gray-100 bg-white hover:border-[#2d7a4f20] hover:shadow-sm transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-lg bg-[#1a274408] flex items-center justify-center group-hover:bg-[#1a274415] transition-colors">
                  <FileText className="size-5 text-[#1a2744]/60" />
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
            <CardTitle className="text-base">Signataires</CardTitle>
            <CardDescription>Qui signe quel type de document</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { doc: 'Releve de notes', signataire: 'Directeur de scolarite' },
              { doc: 'Attestation', signataire: 'Recteur' },
              { doc: 'Diplome', signataire: 'Recteur + Ministre' },
              { doc: 'Recu', signataire: 'Agent de caisse' },
              { doc: 'Proces-verbal', signataire: 'President du jury' },
            ].map((item) => (
              <div key={item.doc} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                <span className="text-sm text-[#1a2744] font-medium">{item.doc}</span>
                <Badge variant="outline" className="text-xs">
                  {item.signataire}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* QR & Stamp positioning */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Positionnement</CardTitle>
            <CardDescription>Position du QR code et du cachet sur les documents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Position du QR code</Label>
              <Select value={qrPosition} onValueChange={setQrPosition}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top-right">En haut a droite</SelectItem>
                  <SelectItem value="bottom-right">En bas a droite</SelectItem>
                  <SelectItem value="bottom-left">En bas a gauche</SelectItem>
                  <SelectItem value="top-left">En haut a gauche</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Position du cachet</Label>
              <Select value={stampPosition} onValueChange={setStampPosition}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-left">En bas a gauche</SelectItem>
                  <SelectItem value="bottom-right">En bas a droite</SelectItem>
                  <SelectItem value="center">Au centre</SelectItem>
                  <SelectItem value="overlay">Superpose signature</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Mini preview */}
            <div className="mt-2">
              <Label className="mb-2 block">Apercu</Label>
              <div className="border border-gray-200 rounded-lg p-4 bg-white relative h-48">
                <div className="border-b border-gray-200 pb-2 mb-3">
                  <div className="h-3 w-32 bg-gray-100 rounded" />
                  <div className="h-2 w-24 bg-gray-50 rounded mt-1" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-2 bg-gray-50 rounded w-full" />
                  <div className="h-2 bg-gray-50 rounded w-4/5" />
                  <div className="h-2 bg-gray-50 rounded w-3/4" />
                </div>
                {/* QR code position */}
                <div
                  className={`absolute ${qrPosition === 'bottom-right' ? 'bottom-2 right-2' : qrPosition === 'bottom-left' ? 'bottom-2 left-2' : qrPosition === 'top-right' ? 'top-2 right-2' : 'top-2 left-2'}`}
                >
                  <div className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center bg-gray-50">
                    <QrCode className="size-4 text-gray-400" />
                  </div>
                </div>
                {/* Stamp position */}
                <div
                  className={`absolute ${stampPosition === 'bottom-left' ? 'bottom-2 left-2' : stampPosition === 'bottom-right' ? 'bottom-2 right-2' : stampPosition === 'center' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : 'bottom-8 right-8'}`}
                >
                  <div className="w-10 h-10 border-2 border-red-200 rounded-full flex items-center justify-center bg-red-50/50">
                    <Stamp className="size-3 text-red-300" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header/Footer template */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">En-tete et pied de page PDF</CardTitle>
          <CardDescription>Modele d&apos;en-tete et de pied de page pour les documents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>En-tete</Label>
              <div className="mt-1.5 p-3 rounded-lg border border-gray-200 bg-gray-50 min-h-20 text-xs text-gray-500 space-y-1">
                <div className="flex items-center gap-2">
                  <Building2 className="size-3" />
                  <span>REPUBLIQUE DU TCHAD</span>
                </div>
                <div className="flex items-center gap-2 pl-5">
                  <span>Ministere de l&apos;Enseignement Superieur</span>
                </div>
                <div className="flex items-center gap-2 font-semibold text-[#1a2744]">
                  <span>Universite de N&apos;Djamena</span>
                </div>
              </div>
            </div>
            <div>
              <Label>Pied de page</Label>
              <div className="mt-1.5 p-3 rounded-lg border border-gray-200 bg-gray-50 min-h-20 text-xs text-gray-500 space-y-1">
                <div className="flex items-center gap-2">
                  <MapPin className="size-3" />
                  <span>BP 1117, N&apos;Djamena, Tchad</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="size-3" />
                  <span>+235 66 00 00 00</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="size-3" />
                  <span>contact@und.td | www.univ-ndjamena.td</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Apparence Tab ───────────────────────────────────────────────────────────
function ApparenceTab() {
  const [primaryColor, setPrimaryColor] = useState('#1a2744')
  const [secondaryColor, setSecondaryColor] = useState('#2d7a4f')
  const [accentColor, setAccentColor] = useState('#d4a853')
  const [darkMode, setDarkMode] = useState(false)

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
              <Label>Couleur primaire (Bleu nuit)</Label>
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
              <Label>Couleur secondaire (Vert institutionnel)</Label>
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
              <Label>Couleur d&apos;accent (Dore)</Label>
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
            <div className="flex items-center justify-between pt-2">
              <div>
                <Label>Mode sombre</Label>
                <p className="text-xs text-gray-400 mt-0.5">Activer le theme sombre</p>
              </div>
              <Switch checked={darkMode} onCheckedChange={setDarkMode} />
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
            <div className={`rounded-xl border overflow-hidden ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
              {/* Header preview */}
              <div
                className="p-3 flex items-center gap-2"
                style={{ backgroundColor: primaryColor }}
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
              <div className={`p-4 space-y-3 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <div className={`h-3 rounded w-3/4 ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`} />
                <div className={`h-2 rounded w-1/2 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`} />
                <div className="flex gap-2 mt-3">
                  <div
                    className="h-7 rounded-md flex items-center justify-center px-3"
                    style={{ backgroundColor: secondaryColor }}
                  >
                    <span className="text-white text-xs font-medium">Valider</span>
                  </div>
                  <div
                    className={`h-7 rounded-md border flex items-center justify-center px-3 ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}
                  >
                    <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Annuler</span>
                  </div>
                </div>
              </div>
              {/* Accent preview */}
              <div className={`p-3 flex items-center gap-2 ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-100'} border-t`}>
                <div className="w-5 h-5 rounded" style={{ backgroundColor: accentColor }} />
                <div className={`h-2 rounded w-20 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
                <div className={`h-2 rounded w-12 ml-auto ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
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
          <CardDescription>Apercu du logo et du cachet sur les documents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6 items-center justify-center p-6 bg-gray-50 rounded-xl">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full border-2 border-gray-200 flex items-center justify-center bg-white">
                <Building2 className="size-8 text-gray-300" />
              </div>
              <p className="text-xs text-gray-400 mt-2">Logo</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 rounded-lg border-2 border-gray-200 flex items-center justify-center bg-white">
                <Stamp className="size-8 text-gray-300" />
              </div>
              <p className="text-xs text-gray-400 mt-2">Cachet</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 rounded border-2 border-gray-200 flex items-center justify-center bg-white">
                <QrCode className="size-8 text-gray-300" />
              </div>
              <p className="text-xs text-gray-400 mt-2">QR Code</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 rounded border-2 border-gray-200 flex items-center justify-center bg-white">
                <FileText className="size-8 text-gray-300" />
              </div>
              <p className="text-xs text-gray-400 mt-2">En-tete</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Abonnement Tab ──────────────────────────────────────────────────────────
function AbonnementTab() {
  const [currentPlan] = useState('pro')

  const plans = [
    {
      id: 'starter',
      name: 'STARTER',
      icon: Rocket,
      price: '150 000',
      period: '/mois',
      description: 'Pour les petits etablissements',
      features: [
        'Jusqu a 500 etudiants',
        '2 facultes',
        'Gestion LMD de base',
        'Documents PDF basiques',
        'Support email',
        '5 Go stockage',
      ],
      current: currentPlan === 'starter',
    },
    {
      id: 'pro',
      name: 'PRO',
      icon: Star,
      price: '350 000',
      period: '/mois',
      description: 'Pour les universites moyennes',
      features: [
        'Jusqu a 5 000 etudiants',
        'Facultes illimitees',
        'LMD + Classique + Sante',
        'Documents avances + QR code',
        'Support prioritaire 24/7',
        '50 Go stockage',
        'API et integrations',
        'Mobile Money',
      ],
      current: currentPlan === 'pro',
      popular: true,
    },
    {
      id: 'enterprise',
      name: 'ENTERPRISE',
      icon: Crown,
      price: 'Sur devis',
      period: '',
      description: 'Pour les grandes universites',
      features: [
        'Etudiants illimites',
        'Multi-etablissement',
        'Tous les systemes',
        'Personnalisation complete',
        'Support dedie',
        'Stockage illimite',
        'SLA garanti',
        'Formation sur site',
        'Hebergement prive',
      ],
      current: currentPlan === 'enterprise',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Current plan */}
      <Card className="border-[#2d7a4f30] bg-gradient-to-r from-[#2d7a4f08] to-transparent">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-[#2d7a4f] text-white">PRO</Badge>
                <span className="text-sm text-gray-500">Plan actuel</span>
              </div>
              <h3 className="text-xl font-bold text-[#1a2744]">Plan Professionnel</h3>
              <p className="text-sm text-gray-500 mt-1">350 000 FCFA / mois</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Modifier le plan
              </Button>
              <Button size="sm" className="bg-[#2d7a4f] hover:bg-[#236b40] text-white">
                Upgrader
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Etudiants', current: 2847, max: 5000, unit: '' },
          { label: 'Stockage', current: 18, max: 50, unit: ' Go' },
          { label: 'Facultes', current: 3, max: 99, unit: '' },
          { label: 'Utilisateurs', current: 42, max: 100, unit: '' },
        ].map((stat) => {
          const percentage = Math.min(Math.round((stat.current / stat.max) * 100), 100)
          return (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                <p className="text-lg font-bold text-[#1a2744]">
                  {stat.current.toLocaleString()}{stat.unit}
                </p>
                <p className="text-xs text-gray-400 mb-2">sur {stat.max.toLocaleString()}{stat.unit}</p>
                <Progress value={percentage} className="h-1.5" />
                <p className="text-xs text-gray-400 mt-1">{percentage}% utilise</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Plan comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative overflow-hidden ${
              plan.popular ? 'border-[#2d7a4f] shadow-md' : 'border-gray-100'
            }`}
          >
            {plan.popular && (
              <div className="absolute top-0 right-0 bg-[#2d7a4f] text-white text-xs font-medium px-3 py-1 rounded-bl-lg">
                Populaire
              </div>
            )}
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    plan.current ? 'bg-[#2d7a4f15]' : 'bg-gray-100'
                  }`}
                >
                  <plan.icon
                    className={`size-5 ${plan.current ? 'text-[#2d7a4f]' : 'text-gray-400'}`}
                  />
                </div>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
              </div>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <span className="text-2xl font-bold text-[#1a2744]">{plan.price}</span>
                <span className="text-sm text-gray-400">{plan.period}</span>
              </div>
              <div className="space-y-2">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2">
                    <CheckCircle2
                      className={`size-4 shrink-0 mt-0.5 ${
                        plan.current ? 'text-[#2d7a4f]' : 'text-gray-300'
                      }`}
                    />
                    <span className="text-xs text-gray-600">{feature}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                {plan.current ? (
                  <Button variant="outline" className="w-full" disabled>
                    Plan actuel
                  </Button>
                ) : (
                  <Button
                    className={`w-full ${
                      plan.popular
                        ? 'bg-[#2d7a4f] hover:bg-[#236b40] text-white'
                        : 'bg-[#1a2744] hover:bg-[#1a2744]/90 text-white'
                    }`}
                  >
                    {plan.id === 'enterprise' ? 'Nous contacter' : 'Upgrader'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
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
            <TabsTrigger value="informations" className="text-xs sm:text-sm data-[state=active]:bg-[#1a2744] data-[state=active]:text-white">
              <Building2 className="size-3.5 mr-1.5" />
              Informations
            </TabsTrigger>
            <TabsTrigger value="structure" className="text-xs sm:text-sm data-[state=active]:bg-[#1a2744] data-[state=active]:text-white">
              <GraduationCap className="size-3.5 mr-1.5" />
              Structure
            </TabsTrigger>
            <TabsTrigger value="academique" className="text-xs sm:text-sm data-[state=active]:bg-[#1a2744] data-[state=active]:text-white">
              <BookOpen className="size-3.5 mr-1.5" />
              Academique
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-xs sm:text-sm data-[state=active]:bg-[#1a2744] data-[state=active]:text-white">
              <FileText className="size-3.5 mr-1.5" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="apparence" className="text-xs sm:text-sm data-[state=active]:bg-[#1a2744] data-[state=active]:text-white">
              <Palette className="size-3.5 mr-1.5" />
              Apparence
            </TabsTrigger>
            <TabsTrigger value="abonnement" className="text-xs sm:text-sm data-[state=active]:bg-[#1a2744] data-[state=active]:text-white">
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
