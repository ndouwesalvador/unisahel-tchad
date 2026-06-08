'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Stethoscope,
  Building2,
  CheckCircle2,
  Clock,
  Heart,
  Activity,
  Plus,
  MapPin,
  Calendar,
  Users,
  ClipboardCheck,
  BookOpen,
  Moon,
  Sun,
  Star,
  Thermometer,
  Pill,
  Scissors,
  ShieldCheck,
  GraduationCap,
  Eye,
  XCircle,
  AlertTriangle,
} from 'lucide-react'

// ─── Demo Data ────────────────────────────────────────────────────────────────

const hospitals = [
  { id: '1', nom: 'Hopital General de Reference de N\'Djamena', type: 'CHU', ville: 'N\'Djamena', adresse: 'Avenue Charles de Gaulle', departements: ['Urgences', 'Chirurgie', 'Pediatrie', 'Maternite', 'Medecine interne'], internes: 18, status: 'actif' },
  { id: '2', nom: 'Hopital de la Mere et de l\'Enfant', type: 'Hopital regional', ville: 'N\'Djamena', adresse: 'Rue du 11 Aout', departements: ['Pediatrie', 'Maternite', 'Neonatologie'], internes: 12, status: 'actif' },
  { id: '3', nom: 'Centre de Sante de Moundou', type: 'Centre de sante', ville: 'Moundou', adresse: 'Quartier Sarh', departements: ['Medecine generale', 'Maternite', 'Vaccination'], internes: 8, status: 'alerte' },
]

const hospitalTypeConfig: Record<string, { label: string; className: string }> = {
  CHU: { label: 'CHU', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' },
  hopital_regional: { label: 'Hopital regional', className: 'bg-[#1a274415] text-[#1a2744] border-0' },
  centre_sante: { label: 'Centre de sante', className: 'bg-[#d4a85315] text-[#d4a853] border-0' },
}

const stages = [
  { id: '1', etudiant: 'HISSEIN Mariam', filiere: 'Soins Infirmiers', hopital: 'Hopital General', service: 'Urgences', debut: '01/02/2025', fin: '30/04/2025', maitre: 'Dr. Mahamat Ali', statut: 'en_cours' },
  { id: '2', etudiant: 'SALEH Hassana', filiere: 'Soins Infirmiers', hopital: 'Hopital de la Mere', service: 'Maternite', debut: '01/02/2025', fin: '30/04/2025', maitre: 'Dr. Khadija Adam', statut: 'en_cours' },
  { id: '3', etudiant: 'RAMADANE Zara', filiere: 'Sages-femmes', hopital: 'Hopital de la Mere', service: 'Neonatologie', debut: '01/11/2024', fin: '31/01/2025', maitre: 'Dr. Fatime Ngaro', statut: 'termine' },
  { id: '4', etudiant: 'ADAM Khadija', filiere: 'Sages-femmes', hopital: 'Hopital General', service: 'Maternite', debut: '15/03/2025', fin: '15/06/2025', maitre: 'Dr. Ache Madjee', statut: 'planifie' },
  { id: '5', etudiant: 'BICHARA Hawa', filiere: 'Laborantins', hopital: 'Centre de Sante', service: 'Laboratoire', debut: '01/02/2025', fin: '30/04/2025', maitre: 'Labo. Chef Idriss', statut: 'en_cours' },
  { id: '6', etudiant: 'NGARNDMI Halime', filiere: 'Soins Infirmiers', hopital: 'Hopital General', service: 'Cardiologie', debut: '01/03/2025', fin: '31/05/2025', maitre: 'Dr. Seid Ibrahim', statut: 'planifie' },
  { id: '7', etudiant: 'ABAKAR Adam', filiere: 'Pharmacie', hopital: 'Centre de Sante', service: 'Pharmacie', debut: '01/02/2025', fin: '30/04/2025', maitre: 'Pharm. Fatime', statut: 'en_cours' },
  { id: '8', etudiant: 'DJIBRINE Amina', filiere: 'Soins Infirmiers', hopital: 'Hopital General', service: 'Chirurgie', debut: '15/01/2025', fin: '15/04/2025', maitre: 'Dr. Hassan Djibril', statut: 'valide' },
  { id: '9', etudiant: 'MAHAMAT Youssouf', filiere: 'Sages-femmes', hopital: 'Hopital de la Mere', service: 'Maternite', debut: '01/10/2024', fin: '31/12/2024', maitre: 'Dr. Ngaro Fatime', statut: 'termine' },
  { id: '10', etudiant: 'KHAMIS Fatime', filiere: 'Pharmacie', hopital: 'Centre de Sante', service: 'Pharmacie', debut: '01/01/2025', fin: '31/03/2025', maitre: 'Pharm. Abdoulaye', statut: 'en_cours' },
]

const stageStatusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  en_cours: { label: 'En cours', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0', icon: Activity },
  termine: { label: 'Termine', className: 'bg-[#1a274415] text-[#1a2744] border-0', icon: CheckCircle2 },
  planifie: { label: 'Planifie', className: 'bg-[#d4a85315] text-[#d4a853] border-0', icon: Clock },
  valide: { label: 'Valide', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0', icon: CheckCircle2 },
}

// Competence categories with skills
const competenceCategories = [
  {
    id: 'soins_infirmiers',
    nom: 'Soins infirmiers',
    icon: Heart,
    competences: [
      { id: 's1', nom: 'Prise de constantes vitales', statut: 'validee', validateur: 'Dr. Mahamat Ali', date: '15/02/2025' },
      { id: 's2', nom: 'Injection intramusculaire', statut: 'validee', validateur: 'Infirmier Chef Hassan', date: '20/02/2025' },
      { id: 's3', nom: 'Pose de perfusion', statut: 'en_cours', validateur: '', date: '' },
      { id: 's4', nom: 'Pansement simple', statut: 'validee', validateur: 'Dr. Khadija Adam', date: '10/03/2025' },
      { id: 's5', nom: 'Soins de plaie chirurgicale', statut: 'non_acquise', validateur: '', date: '' },
    ],
  },
  {
    id: 'diagnostique',
    nom: 'Diagnostique',
    icon: Thermometer,
    competences: [
      { id: 'd1', nom: 'Electrocardiogramme', statut: 'en_cours', validateur: '', date: '' },
      { id: 'd2', nom: 'Auscultation pulmonaire', statut: 'validee', validateur: 'Dr. Seid Ibrahim', date: '05/03/2025' },
      { id: 'd3', nom: 'Examen neurologique', statut: 'non_acquise', validateur: '', date: '' },
      { id: 'd4', nom: 'Palpation abdominale', statut: 'en_cours', validateur: '', date: '' },
    ],
  },
  {
    id: 'pharmacie',
    nom: 'Pharmacie',
    icon: Pill,
    competences: [
      { id: 'p1', nom: 'Preparation de medicaments', statut: 'validee', validateur: 'Pharm. Fatime', date: '12/02/2025' },
      { id: 'p2', nom: 'Dispensation de medicaments', statut: 'validee', validateur: 'Pharm. Abdoulaye', date: '18/02/2025' },
      { id: 'p3', nom: 'Calcul de posologie', statut: 'en_cours', validateur: '', date: '' },
      { id: 'p4', nom: 'Gestion des stocks', statut: 'non_acquise', validateur: '', date: '' },
      { id: 'p5', nom: 'Conseil au patient', statut: 'validee', validateur: 'Pharm. Fatime', date: '28/02/2025' },
    ],
  },
  {
    id: 'chirurgie',
    nom: 'Chirurgie',
    icon: Scissors,
    competences: [
      { id: 'c1', nom: 'Preparation du champ operatoire', statut: 'validee', validateur: 'Dr. Hassan Djibril', date: '10/02/2025' },
      { id: 'c2', nom: 'Suture simple', statut: 'en_cours', validateur: '', date: '' },
      { id: 'c3', nom: 'Aide operatoire', statut: 'non_acquise', validateur: '', date: '' },
      { id: 'c4', nom: 'Retrait de points', statut: 'validee', validateur: 'Dr. Seid Ibrahim', date: '15/03/2025' },
    ],
  },
  {
    id: 'hygiene',
    nom: 'Hygiene',
    icon: ShieldCheck,
    competences: [
      { id: 'h1', nom: 'Lavage des mains chirurgical', statut: 'validee', validateur: 'Infirmier Chef Hassan', date: '05/02/2025' },
      { id: 'h2', nom: 'Desinfection du materiel', statut: 'validee', validateur: 'Dr. Mahamat Ali', date: '08/02/2025' },
      { id: 'h3', nom: 'Gestion des dechets medicaux', statut: 'en_cours', validateur: '', date: '' },
      { id: 'h4', nom: 'Isolement septique', statut: 'non_acquise', validateur: '', date: '' },
      { id: 'h5', nom: 'Sterilisation des instruments', statut: 'validee', validateur: 'Infirmier Chef Hassan', date: '20/02/2025' },
      { id: 'h6', nom: 'Protocole anti-infectieux', statut: 'en_cours', validateur: '', date: '' },
    ],
  },
  {
    id: 'ethique',
    nom: 'Ethique',
    icon: BookOpen,
    competences: [
      { id: 'e1', nom: 'Secret medical', statut: 'validee', validateur: 'Dr. Khadija Adam', date: '01/02/2025' },
      { id: 'e2', nom: 'Consentement eclaire', statut: 'validee', validateur: 'Dr. Ngaro Fatime', date: '05/02/2025' },
      { id: 'e3', nom: 'Deontologie medicale', statut: 'en_cours', validateur: '', date: '' },
      { id: 'e4', nom: 'Droit des patients', statut: 'non_acquise', validateur: '', date: '' },
    ],
  },
]

const competenceStatutConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  validee: { label: 'Validee', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0', icon: CheckCircle2 },
  en_cours: { label: 'En cours', className: 'bg-[#d4a85315] text-[#d4a853] border-0', icon: Clock },
  non_acquise: { label: 'Non acquise', className: 'bg-gray-100 text-gray-500 border-0', icon: XCircle },
}

// Carnet de stage data
const carnetData = {
  etudiant: 'HISSEIN Mariam',
  matricule: 'UDN/L2-SI/2024/007',
  hopital: 'Hopital General de Reference de N\'Djamena',
  service: 'Urgences',
  debut: '01/02/2025',
  fin: '30/04/2025',
  maitre: 'Dr. Mahamat Ali',
  presences: [
    { date: '03/02/2025', present: true },
    { date: '04/02/2025', present: true },
    { date: '05/02/2025', present: true },
    { date: '06/02/2025', present: false },
    { date: '07/02/2025', present: true },
    { date: '10/02/2025', present: true },
    { date: '11/02/2025', present: true },
    { date: '12/02/2025', present: true },
    { date: '13/02/2025', present: true },
    { date: '14/02/2025', present: true },
  ],
  competencesValidees: ['Prise de constantes vitales', 'Injection intramusculaire', 'Pansement simple'],
  evaluation: {
    comportement: 16,
    competence: 14,
    pratique: 15,
    note: 15,
    statut: 'en_cours_validation',
  },
}

// Gardes data
const gardes = [
  { id: '1', date: '03/03/2025', etudiant: 'HISSEIN Mariam', hopital: 'Hopital General', service: 'Urgences', shift: 'nuit', statut: 'effectuee' },
  { id: '2', date: '05/03/2025', etudiant: 'SALEH Hassana', hopital: 'Hopital de la Mere', service: 'Maternite', shift: 'jour', statut: 'effectuee' },
  { id: '3', date: '07/03/2025', etudiant: 'BICHARA Hawa', hopital: 'Centre de Sante', service: 'Laboratoire', shift: 'nuit', statut: 'effectuee' },
  { id: '4', date: '10/03/2025', etudiant: 'ABAKAR Adam', hopital: 'Centre de Sante', service: 'Pharmacie', shift: 'jour', statut: 'effectuee' },
  { id: '5', date: '12/03/2025', etudiant: 'DJIBRINE Amina', hopital: 'Hopital General', service: 'Chirurgie', shift: 'nuit', statut: 'effectuee' },
  { id: '6', date: '15/03/2025', etudiant: 'KHAMIS Fatime', hopital: 'Centre de Sante', service: 'Pharmacie', shift: 'jour', statut: 'planifiee' },
  { id: '7', date: '17/03/2025', etudiant: 'NGARNDMI Halime', hopital: 'Hopital General', service: 'Cardiologie', shift: 'nuit', statut: 'planifiee' },
  { id: '8', date: '20/03/2025', etudiant: 'ADAM Khadija', hopital: 'Hopital General', service: 'Maternite', shift: 'jour', statut: 'planifiee' },
  { id: '9', date: '22/03/2025', etudiant: 'MAHAMAT Youssouf', hopital: 'Hopital de la Mere', service: 'Maternite', shift: 'nuit', statut: 'planifiee' },
]

const shiftConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  jour: { label: 'Jour', className: 'bg-[#d4a85315] text-[#d4a853] border-0', icon: Sun },
  nuit: { label: 'Nuit', className: 'bg-[#1a274415] text-[#1a2744] border-0', icon: Moon },
}

const gardeStatutConfig: Record<string, { label: string; className: string }> = {
  effectuee: { label: 'Effectuee', className: 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' },
  planifiee: { label: 'Planifiee', className: 'bg-[#d4a85315] text-[#d4a853] border-0' },
  annulee: { label: 'Annulee', className: 'bg-red-50 text-red-500 border-0' },
}

// Sanitary alerts
const alertesSanitaires = [
  { id: '1', text: 'Stage CHU complet - S2 2025', severity: 'warning' },
  { id: '2', text: 'Competence non validee: 12 etudiants', severity: 'critical' },
  { id: '3', text: 'Vaccination obligatoire a jour requise', severity: 'info' },
]

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

export function HealthPage() {
  const [activeTab, setActiveTab] = useState('hopitaux')
  const [stageHopitalFilter, setStageHopitalFilter] = useState('all')
  const [stageStatutFilter, setStageStatutFilter] = useState('all')
  const [selectedCarnetStudent, setSelectedCarnetStudent] = useState('hissein_mariam')

  // Stats
  const stagesEnCours = stages.filter(s => s.statut === 'en_cours').length
  const totalCompetences = competenceCategories.reduce((acc, cat) => acc + cat.competences.length, 0)
  const competencesValidees = competenceCategories.reduce((acc, cat) => acc + cat.competences.filter(c => c.statut === 'validee').length, 0)
  const etudiantsEnStage = stages.filter(s => s.statut === 'en_cours' || s.statut === 'valide').length
  const competencePercent = totalCompetences > 0 ? Math.round((competencesValidees / totalCompetences) * 100) : 0

  // Animated stats (using computed values)
  const animatedEtudiantsSante = useCountUp(etudiantsEnStage, 1400)
  const animatedStagesActifs = useCountUp(stagesEnCours, 1200)
  const animatedCompVal = useCountUp(competencePercent, 1300)

  // Filtered stages
  const filteredStages = stages.filter(s => {
    const matchHopital = stageHopitalFilter === 'all' || s.hopital === stageHopitalFilter
    const matchStatut = stageStatutFilter === 'all' || s.statut === stageStatutFilter
    return matchHopital && matchStatut
  })

  // Attendance percentage for carnet
  const presencesCount = carnetData.presences.filter(p => p.present).length
  const attendancePercent = carnetData.presences.length > 0 ? Math.round((presencesCount / carnetData.presences.length) * 100) : 0
  const computedNoteGlobale = Math.round((carnetData.evaluation.comportement + carnetData.evaluation.competence + carnetData.evaluation.pratique) / 3)

  return (
    <div className="space-y-5">
      {/* Gradient Header Banner */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-[#1a2744] via-[#1f3050] to-[#2d7a4f] p-6 text-white relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE0YzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptLTQgMmMtMS4xIDAtMi0uOS0yLTJzLjktMiAyLTIgMiAuOSAyIDItLjkgMi0yIDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
          <div className="relative">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Stethoscope className="size-6 text-white/80" />
                <h1 className="text-2xl font-bold">Gestion des ecoles de sante</h1>
              </div>
              <p className="text-white/70 text-sm">Formations sanitaires et paramedicales</p>
            </motion.div>

            {/* Hero Stats */}
            <motion.div
              className="grid grid-cols-3 gap-3 mt-5"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/15">
                <p className="text-2xl font-bold text-white">{animatedEtudiantsSante}</p>
                <p className="text-[11px] text-white/70 mt-0.5">Etudiants sante</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/15">
                <p className="text-2xl font-bold text-white">{animatedStagesActifs}</p>
                <p className="text-[11px] text-white/70 mt-0.5">Stages actifs</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/15">
                <p className="text-2xl font-bold text-white">{animatedCompVal}%</p>
                <p className="text-[11px] text-white/70 mt-0.5">Competences validees</p>
              </div>
            </motion.div>
          </div>
        </div>
      </Card>

      {/* Alertes sanitaires mini-card + Stats row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {/* Alertes sanitaires */}
        <motion.div
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="lg:col-span-1"
        >
          <Card className="border-l-4 border-l-[#d4a853] h-full">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                <AlertTriangle className="size-4 text-[#d4a853]" />
                Alertes sanitaires
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              {alertesSanitaires.map((alerte) => (
                <div
                  key={alerte.id}
                  className={`flex items-start gap-2 p-2 rounded-lg text-xs ${
                    alerte.severity === 'critical'
                      ? 'bg-red-50 border border-red-100'
                      : alerte.severity === 'warning'
                        ? 'bg-[#d4a85308] border border-[#d4a85320]'
                        : 'bg-blue-50 border border-blue-100'
                  }`}
                >
                  <motion.div
                    className={`w-2 h-2 rounded-full mt-1 shrink-0 ${
                      alerte.severity === 'critical'
                        ? 'bg-red-500'
                        : alerte.severity === 'warning'
                          ? 'bg-[#d4a853]'
                          : 'bg-blue-500'
                    }`}
                    animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <span className={`${
                    alerte.severity === 'critical'
                      ? 'text-red-700'
                      : alerte.severity === 'warning'
                        ? 'text-[#1a2744]'
                        : 'text-blue-700'
                  }`}>
                    {alerte.text}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Cards */}
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#2d7a4f15] flex items-center justify-center shrink-0">
              <Building2 className="size-5 text-[#2d7a4f]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1a2744]">3</p>
              <p className="text-[11px] text-gray-500">Hopitaux partenaires</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#1a274415] flex items-center justify-center shrink-0">
              <Stethoscope className="size-5 text-[#1a2744]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1a2744]">{stagesEnCours}</p>
              <p className="text-[11px] text-gray-500">Stages en cours</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#d4a85315] flex items-center justify-center shrink-0">
              <ClipboardCheck className="size-5 text-[#d4a853]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#d4a853]">{totalCompetences}</p>
              <p className="text-[11px] text-gray-500">Competences a valider</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-100 h-10 p-1 flex-wrap">
          <TabsTrigger value="hopitaux" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#1a2744]">Hopitaux</TabsTrigger>
          <TabsTrigger value="stages" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#1a2744]">Stages cliniques</TabsTrigger>
          <TabsTrigger value="competences" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#1a2744]">Competences</TabsTrigger>
          <TabsTrigger value="carnets" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#1a2744]">Carnets de stage</TabsTrigger>
          <TabsTrigger value="gardes" className="text-xs data-[state=active]:bg-white data-[state=active]:text-[#1a2744]">Gardes</TabsTrigger>
        </TabsList>

        {/* ─── Hopitaux Tab ─── */}
        <TabsContent value="hopitaux" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hospitals.map((hopital, i) => {
              const typeConfig = hospitalTypeConfig[hopital.type] || hospitalTypeConfig.centre_sante
              const isActif = hopital.status === 'actif'
              return (
                <motion.div
                  key={hopital.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.4, delay: i * 0.12, ease: 'easeOut' }}
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-lg bg-[#2d7a4f15] flex items-center justify-center shrink-0">
                            <Building2 className="size-5 text-[#2d7a4f]" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-[#1a2744] leading-tight">{hopital.nom}</h3>
                            <div className="flex items-center gap-1 mt-1">
                              <MapPin className="size-3 text-gray-400" />
                              <span className="text-xs text-gray-500">{hopital.adresse}, {hopital.ville}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Pulsing status indicator */}
                          <motion.div
                            className={`w-2.5 h-2.5 rounded-full ${isActif ? 'bg-[#2d7a4f]' : 'bg-[#d4a853]'}`}
                            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                          <Badge className={`text-[10px] shrink-0 ${typeConfig.className}`}>
                            {typeConfig.label}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-2 mt-4">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 flex items-center gap-1.5">
                            <Activity className="size-3.5" />
                            Services cliniques
                          </span>
                          <span className="font-semibold text-[#1a2744]">{hopital.departements.length}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 flex items-center gap-1.5">
                            <Users className="size-3.5" />
                            Internes actifs
                          </span>
                          <span className="font-semibold text-[#2d7a4f]">{hopital.internes}</span>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {hopital.departements.slice(0, 3).map((dept) => (
                          <Badge key={dept} className="text-[10px] bg-gray-100 text-gray-600 border-0">
                            {dept}
                          </Badge>
                        ))}
                        {hopital.departements.length > 3 && (
                          <Badge className="text-[10px] bg-gray-100 text-gray-400 border-0">
                            +{hopital.departements.length - 3}
                          </Badge>
                        )}
                      </div>
                      <Button variant="outline" size="sm" className="w-full mt-4 text-xs h-8 text-[#2d7a4f] border-[#2d7a4f30] hover:bg-[#2d7a4f10]" onClick={() => toast.info(hopital.nom, { description: `${hopital.departements.length} services - ${hopital.internes} internes` })}>
                        <Eye className="size-3.5 mr-1.5" />
                        Voir details
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </TabsContent>

        {/* ─── Stages Tab ─── */}
        <TabsContent value="stages" className="mt-4">
          <div className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select value={stageHopitalFilter} onValueChange={setStageHopitalFilter}>
                <SelectTrigger className="h-9 text-sm w-full">
                  <SelectValue placeholder="Hopital" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les hopitaux</SelectItem>
                  <SelectItem value="Hopital General">Hopital General</SelectItem>
                  <SelectItem value="Hopital de la Mere">Hopital de la Mere</SelectItem>
                  <SelectItem value="Centre de Sante">Centre de Sante</SelectItem>
                </SelectContent>
              </Select>
              <Select value={stageStatutFilter} onValueChange={setStageStatutFilter}>
                <SelectTrigger className="h-9 text-sm w-full">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="en_cours">En cours</SelectItem>
                  <SelectItem value="termine">Termine</SelectItem>
                  <SelectItem value="planifie">Planifie</SelectItem>
                  <SelectItem value="valide">Valide</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Badge className="text-[10px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">
                  {filteredStages.length} stages
                </Badge>
              </div>
            </div>

            {/* Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="text-xs font-semibold">Etudiant</TableHead>
                        <TableHead className="text-xs font-semibold">Filiere</TableHead>
                        <TableHead className="text-xs font-semibold">Hopital</TableHead>
                        <TableHead className="text-xs font-semibold">Service</TableHead>
                        <TableHead className="text-xs font-semibold">Periode</TableHead>
                        <TableHead className="text-xs font-semibold">Maitre de stage</TableHead>
                        <TableHead className="text-xs font-semibold">Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStages.map((stage) => {
                        const config = stageStatusConfig[stage.statut]
                        const StatusIcon = config?.icon || Clock
                        return (
                          <TableRow key={stage.id} className="hover:bg-gray-50/50">
                            <TableCell className="text-sm font-medium text-[#1a2744] py-2.5">{stage.etudiant}</TableCell>
                            <TableCell className="text-sm text-gray-600 py-2.5">{stage.filiere}</TableCell>
                            <TableCell className="text-sm text-gray-600 py-2.5">{stage.hopital}</TableCell>
                            <TableCell className="text-sm text-gray-500 py-2.5">{stage.service}</TableCell>
                            <TableCell className="text-xs text-gray-500 py-2.5 whitespace-nowrap">{stage.debut} - {stage.fin}</TableCell>
                            <TableCell className="text-sm text-gray-500 py-2.5">{stage.maitre}</TableCell>
                            <TableCell className="py-2.5">
                              <Badge className={`text-[10px] ${config?.className || ''}`}>
                                <StatusIcon className="size-3 mr-1" />
                                {config?.label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Competences Tab ─── */}
        <TabsContent value="competences" className="mt-4">
          <div className="space-y-4">
            {/* Overall progress */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[#1a2744]">Progression globale</span>
                  <span className="text-sm font-bold text-[#2d7a4f]">{competencesValidees}/{totalCompetences} validees</span>
                </div>
                <Progress value={Math.round((competencesValidees / totalCompetences) * 100)} className="h-2" />
              </CardContent>
            </Card>

            {/* Categories grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {competenceCategories.map((category) => {
                const CatIcon = category.icon
                const validated = category.competences.filter(c => c.statut === 'validee').length
                const total = category.competences.length
                const percent = Math.round((validated / total) * 100)
                return (
                  <Card key={category.id} className="overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-[#1a2744] to-[#2d7a4f]" />
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-[#1a274410] flex items-center justify-center">
                            <CatIcon className="size-4 text-[#1a2744]" />
                          </div>
                          <CardTitle className="text-sm font-semibold text-[#1a2744]">{category.nom}</CardTitle>
                        </div>
                        <Badge className={`text-[10px] ${percent === 100 ? 'bg-[#2d7a4f15] text-[#2d7a4f] border-0' : 'bg-gray-100 text-gray-500 border-0'}`}>
                          {percent}%
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Progress value={percent} className="h-1.5 mb-3" />
                      <div className="space-y-2">
                        {category.competences.map((comp) => {
                          const compConfig = competenceStatutConfig[comp.statut]
                          const CompIcon = compConfig?.icon || Clock
                          return (
                            <div key={comp.id} className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <CompIcon className={`size-3.5 shrink-0 ${comp.statut === 'validee' ? 'text-[#2d7a4f]' : comp.statut === 'non_acquise' ? 'text-gray-400' : 'text-[#d4a853]'}`} />
                                <span className={`text-xs truncate ${comp.statut === 'validee' ? 'text-[#1a2744] font-medium' : 'text-gray-500'}`}>{comp.nom}</span>
                              </div>
                              <Badge className={`text-[9px] shrink-0 ${compConfig?.className || ''}`}>
                                {compConfig?.label}
                              </Badge>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </TabsContent>

        {/* ─── Carnets de stage Tab ─── */}
        <TabsContent value="carnets" className="mt-4">
          <div className="space-y-4">
            {/* Student selector */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select value={selectedCarnetStudent} onValueChange={setSelectedCarnetStudent}>
                    <SelectTrigger className="h-9 text-sm w-full">
                      <SelectValue placeholder="Selectionner un etudiant" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hissein_mariam">HISSEIN Mariam</SelectItem>
                      <SelectItem value="saleh_hassana">SALEH Hassana</SelectItem>
                      <SelectItem value="bichara_hawa">BICHARA Hawa</SelectItem>
                      <SelectItem value="abakar_adam">ABAKAR Adam</SelectItem>
                    </SelectContent>
                  </Select>
                  <Badge className="text-[10px] bg-[#2d7a4f15] text-[#2d7a4f] border-0 self-center w-fit">
                    Carnet numerique
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Carnet content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Stage info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                    <GraduationCap className="size-4 text-[#2d7a4f]" />
                    Informations du stage
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase">Hopital</p>
                      <p className="text-xs font-medium text-[#1a2744]">{carnetData.hopital}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase">Service</p>
                      <p className="text-xs font-medium text-[#1a2744]">{carnetData.service}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase">Debut</p>
                      <p className="text-xs font-medium text-[#1a2744]">{carnetData.debut}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase">Fin</p>
                      <p className="text-xs font-medium text-[#1a2744]">{carnetData.fin}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase">Maitre de stage</p>
                    <p className="text-xs font-medium text-[#1a2744]">{carnetData.maitre}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Attendance grid */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                      <Calendar className="size-4 text-[#1a2744]" />
                      Presences
                    </CardTitle>
                    <Badge className="text-[10px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">
                      {attendancePercent}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Progress value={attendancePercent} className="h-1.5 mb-3" />
                  <div className="grid grid-cols-5 gap-1.5">
                    {carnetData.presences.map((p, i) => (
                      <div
                        key={i}
                        className={`flex flex-col items-center gap-0.5 p-1.5 rounded text-center ${
                          p.present ? 'bg-[#2d7a4f10]' : 'bg-red-50'
                        }`}
                      >
                        <span className="text-[9px] text-gray-400">{p.date.split('/').slice(0, 2).join('/')}</span>
                        {p.present ? (
                          <CheckCircle2 className="size-3.5 text-[#2d7a4f]" />
                        ) : (
                          <XCircle className="size-3.5 text-red-400" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Skills validated */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                    <ClipboardCheck className="size-4 text-[#d4a853]" />
                    Competences validees
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {carnetData.competencesValidees.map((comp, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded bg-[#2d7a4f08]">
                        <CheckCircle2 className="size-4 text-[#2d7a4f] shrink-0" />
                        <span className="text-xs text-[#1a2744] font-medium">{comp}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Evaluation */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-[#1a2744] flex items-center gap-2">
                    <Star className="size-4 text-[#d4a853]" />
                    Evaluation du superviseur
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Comportement</span>
                      <span className="text-xs font-semibold text-[#1a2744]">{carnetData.evaluation.comportement}/20</span>
                    </div>
                    <Progress value={(carnetData.evaluation.comportement / 20) * 100} className="h-1.5" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Competence</span>
                      <span className="text-xs font-semibold text-[#1a2744]">{carnetData.evaluation.competence}/20</span>
                    </div>
                    <Progress value={(carnetData.evaluation.competence / 20) * 100} className="h-1.5" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Pratique</span>
                      <span className="text-xs font-semibold text-[#1a2744]">{carnetData.evaluation.pratique}/20</span>
                    </div>
                    <Progress value={(carnetData.evaluation.pratique / 20) * 100} className="h-1.5" />
                  </div>
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#1a2744]">Note globale</span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-[#2d7a4f]">{computedNoteGlobale}/20</span>
                      <Badge className="text-[10px] bg-[#d4a85315] text-[#d4a853] border-0">
                        En cours de validation
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ─── Gardes Tab ─── */}
        <TabsContent value="gardes" className="mt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge className="text-[10px] bg-[#1a274415] text-[#1a2744] border-0">
                {gardes.length} gardes programmees
              </Badge>
              <Button size="sm" className="bg-[#2d7a4f] hover:bg-[#236b40] text-white text-xs h-8" onClick={() => toast.success('Garde ajoutée', { description: 'Nouvelle garde planifiée avec succès' })}>
                <Plus className="size-3.5 mr-1.5" />
                Ajouter une garde
              </Button>
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="text-xs font-semibold">Date</TableHead>
                        <TableHead className="text-xs font-semibold">Etudiant</TableHead>
                        <TableHead className="text-xs font-semibold">Hopital</TableHead>
                        <TableHead className="text-xs font-semibold">Service</TableHead>
                        <TableHead className="text-xs font-semibold">Tranche</TableHead>
                        <TableHead className="text-xs font-semibold">Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gardes.map((garde) => {
                        const shiftC = shiftConfig[garde.shift]
                        const ShiftIcon = shiftC?.icon || Sun
                        const gardeStatut = gardeStatutConfig[garde.statut]
                        return (
                          <TableRow key={garde.id} className="hover:bg-gray-50/50">
                            <TableCell className="text-sm text-[#1a2744] py-2.5 whitespace-nowrap">{garde.date}</TableCell>
                            <TableCell className="text-sm font-medium text-[#1a2744] py-2.5">{garde.etudiant}</TableCell>
                            <TableCell className="text-sm text-gray-600 py-2.5">{garde.hopital}</TableCell>
                            <TableCell className="text-sm text-gray-500 py-2.5">{garde.service}</TableCell>
                            <TableCell className="py-2.5">
                              <Badge className={`text-[10px] ${shiftC?.className || ''}`}>
                                <ShiftIcon className="size-3 mr-1" />
                                {shiftC?.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2.5">
                              <Badge className={`text-[10px] ${gardeStatut?.className || ''}`}>
                                {gardeStatut?.label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
