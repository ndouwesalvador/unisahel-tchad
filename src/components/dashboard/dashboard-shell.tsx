'use client'

import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import { motion } from 'framer-motion'
import { signOut } from 'next-auth/react'
import { useAppStore, type AppUser, type AppView, type UserRole } from '@/lib/store'
import { useAcademicYears, useNotifications } from '@/lib/api-hooks'
import { useQuery } from '@tanstack/react-query'
import { DEFAULT_BRAND, readableBrandColor } from '@/lib/institution-branding'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Building2,
  BookOpen,
  ClipboardList,
  FileCheck,
  FileText,
  CreditCard,
  Heart,
  Briefcase,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
  Menu,
  Shield,
  School,
  Download,
  Megaphone,
  Calendar,
  CircleUser,
  Stethoscope,
  CheckSquare,
  Receipt,
  UserPlus,
  ClipboardCheck,
  BookOpenCheck,
  Award,
  Compass,
  MessageSquare,
  Monitor,
  Search,
  DoorOpen,
  Bus,
  UserCog,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import { NotificationPanel } from '@/components/notifications/notification-panel'
import { AIAssistantWidget } from '@/components/ai-assistant/ai-assistant-widget'

// ─── Lazy-loaded views ──────────────────────────────────────────────────────
//
// dashboard-shell.tsx used to statically import all ~40 view components,
// which bundled every module (payments, results, deliberation, statistics...)
// into the single JS chunk loaded on first paint, regardless of which view
// the user actually opens. That chunk measured 2.3MB. Loading each view on
// demand via next/dynamic means only the current view's code is fetched.
function ViewLoading() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="size-6 animate-spin text-[var(--institution-secondary)]" />
    </div>
  )
}
const lazyView = <P extends object>(loader: () => Promise<ComponentType<P>>) =>
  dynamic(loader, { loading: ViewLoading })

const DashboardHome = lazyView(() => import('./dashboard-home').then(m => m.DashboardHome))
const StudentsList = lazyView(() => import('@/components/students/students-list').then(m => m.StudentsList))
const StudentDetail = lazyView(() => import('@/components/students/student-detail').then(m => m.StudentDetail))
const StructurePage = lazyView(() => import('@/components/structure/structure-page').then(m => m.StructurePage))
const GradesPage = lazyView(() => import('@/components/grades/grades-page').then(m => m.GradesPage))
const DeliberationPage = lazyView(() => import('@/components/deliberation/deliberation-page').then(m => m.DeliberationPage))
const DocumentsPage = lazyView(() => import('@/components/documents/documents-page').then(m => m.DocumentsPage))
const PaymentsPage = lazyView(() => import('@/components/payments/payments-page').then(m => m.PaymentsPage))
const HealthPage = lazyView(() => import('@/components/health/health-page').then(m => m.HealthPage))
const StatisticsPage = lazyView(() => import('@/components/statistics/statistics-page').then(m => m.StatisticsPage))
const VerifyPage = lazyView(() => import('@/components/verify/verify-page').then(m => m.VerifyPage))
const SettingsPage = lazyView(() => import('@/components/settings/settings-page').then(m => m.SettingsPage))
const InstitutionPage = lazyView(() => import('@/components/institution/institution-page').then(m => m.InstitutionPage))
const PlatformInstitutionsPage = lazyView(() => import('@/components/platform/platform-institutions-page').then(m => m.PlatformInstitutionsPage))
const ForcedPasswordChange = lazyView(() => import('@/components/auth/forced-password-change').then(m => m.ForcedPasswordChange))
const StaffUsersPage = lazyView(() => import('@/components/users/staff-users-page').then(m => m.StaffUsersPage))
const TeachersPage = lazyView(() => import('@/components/teachers/teachers-page').then(m => m.TeachersPage))
const TeacherDetail = lazyView(() => import('@/components/teachers/teacher-detail').then(m => m.TeacherDetail))
const MaquettePage = lazyView(() => import('@/components/maquette/maquette-page').then(m => m.MaquettePage))
const TeacherUnitsPage = lazyView(() => import('@/components/teacher/teacher-workspace').then(m => m.TeacherUnitsPage))
const TeacherTimetablePage = lazyView(() => import('@/components/teacher/teacher-workspace').then(m => m.TeacherTimetablePage))
const TeacherAttendancePage = lazyView(() => import('@/components/teacher/teacher-workspace').then(m => m.TeacherAttendancePage))
const TeacherOnlineExamPage = lazyView(() => import('@/components/teacher/teacher-workspace').then(m => m.TeacherOnlineExamPage))
const TeacherMessagesPage = lazyView(() => import('@/components/teacher/teacher-workspace').then(m => m.TeacherMessagesPage))
const AnnouncementsPage = lazyView(() => import('@/components/announcements/announcements-page').then(m => m.AnnouncementsPage))
const ImportExportPage = lazyView(() => import('@/components/import-export/import-export-page').then(m => m.ImportExportPage))
const TimetablePage = lazyView(() => import('@/components/timetable/timetable-page').then(m => m.TimetablePage))
const StudentTimetablePage = lazyView(() => import('@/components/timetable/student-timetable-page').then(m => m.StudentTimetablePage))
const TeachingServicesPage = lazyView(() => import('@/components/teaching-services/teaching-services-page').then(m => m.TeachingServicesPage))
const OrganizationDashboard = lazyView(() => import('@/components/dashboard/organization-dashboard').then(m => m.OrganizationDashboard))
const CandidaturePage = lazyView(() => import('@/components/candidature/candidature-page').then(m => m.CandidaturePage))
const InscriptionPedagogiquePage = lazyView(() => import('@/components/inscription-pedagogique/inscription-pedagogique-page').then(m => m.InscriptionPedagogiquePage))
const ProfilePage = lazyView(() => import('@/components/profile/profile-page').then(m => m.ProfilePage))
const ExamSchedulingPage = lazyView(() => import('@/components/exam-scheduling/exam-scheduling-page').then(m => m.ExamSchedulingPage))
const ScholarshipsPage = lazyView(() => import('@/components/scholarships/scholarships-page').then(m => m.ScholarshipsPage))
const AlumniPage = lazyView(() => import('@/components/alumni/alumni-page').then(m => m.AlumniPage))
const AdvisingPage = lazyView(() => import('@/components/advising/advising-page').then(m => m.AdvisingPage))
const LibraryPage = lazyView(() => import('@/components/library/library-page').then(m => m.LibraryPage))
const AttendancePage = lazyView(() => import('@/components/attendance/attendance-page').then(m => m.AttendancePage))
const CommunicationPage = lazyView(() => import('@/components/communication/communication-page').then(m => m.CommunicationPage))
const OnlineExamPage = lazyView(() => import('@/components/online-exam/online-exam-page').then(m => m.OnlineExamPage))
const ReportsPage = lazyView(() => import('@/components/reports/reports-page').then(m => m.ReportsPage))
const InternshipsPage = lazyView(() => import('@/components/internships/internships-page').then(m => m.InternshipsPage))
const HrPage = lazyView(() => import('@/components/hr/hr-page').then(m => m.HrPage))
const RoomBookingPage = lazyView(() => import('@/components/room-booking/room-booking-page').then(m => m.RoomBookingPage))
const ResultsPage = lazyView(() => import('@/components/results/results-page').then(m => m.ResultsPage))
const TransportPage = lazyView(() => import('@/components/transport/transport-page').then(m => m.TransportPage))
const StudentExamPage = lazyView(() => import('@/components/online-exam/student-exam-page').then(m => m.StudentExamPage))

// ─── Navigation Config ────────────────────────────────────────────────────────

interface NavItem {
  icon: React.ElementType
  label: string
  view: AppView
  module?: 'health'
}

function normalizeAcademicSystem(value?: string | null) {
  return (value || 'lmd').trim().toLowerCase()
}

function isHealthAcademicSystem(value?: string | null) {
  return normalizeAcademicSystem(value) === 'sante'
}

function getVisibleNavItems(user: AppUser | null): NavItem[] {
  if (!user) return []

  return (roleNavItems[user.role] || []).filter((item) => {
    if (item.module === 'health') return isHealthAcademicSystem(user.tenantAcademicSystem)
    return true
  })
}

const roleNavItems: Record<UserRole, NavItem[]> = {
  // A SUPER_ADMIN belongs to no single institution (tenantId is null), so
  // every tenant-scoped view (dashboard stats, teachers, statistics,
  // settings) would 400. Their only real, functional view is the
  // platform-wide institutions list -- everything else lives inside a
  // specific institution once an ADMIN_INSTITUTION account is provisioned.
  SUPER_ADMIN: [
    { icon: School, label: 'Institutions', view: 'platform-institutions' },
  ],
  ADMIN_INSTITUTION: [
    { icon: LayoutDashboard, label: 'Tableau de bord', view: 'dashboard' },
    { icon: Users, label: 'Étudiants', view: 'students' },
    { icon: GraduationCap, label: 'Enseignants', view: 'teachers' },
    { icon: UserCog, label: 'Utilisateurs', view: 'staff-users' },
    { icon: UserPlus, label: 'Candidatures', view: 'candidature' },
    { icon: Building2, label: 'Structure', view: 'structure' },
    { icon: BookOpen, label: 'Programmes', view: 'programs' },
    { icon: ClipboardList, label: 'Maquettes', view: 'maquette' },
    { icon: FileCheck, label: 'Notes', view: 'grades' },
    { icon: CheckSquare, label: 'Délibérations', view: 'deliberation' },
    { icon: FileText, label: 'Documents', view: 'documents' },
    { icon: CreditCard, label: 'Paiements', view: 'payments' },
    { icon: Heart, label: 'Santé', view: 'health', module: 'health' },
    { icon: Briefcase, label: 'Stages', view: 'internships' },
    { icon: Calendar, label: 'Emploi du temps', view: 'timetable' },
    { icon: BookOpenCheck, label: 'Services enseignants', view: 'teaching-services' },
    { icon: ClipboardCheck, label: 'Examens', view: 'exam-scheduling' },
    { icon: Megaphone, label: 'Annonces', view: 'announcements' },
    { icon: Download, label: 'Import/Export', view: 'import-export' },
    { icon: BookOpenCheck, label: 'Inscriptions Péd.', view: 'inscription-pedagogique' },
    { icon: Award, label: 'Bourses', view: 'scholarships' },
    { icon: GraduationCap, label: 'Alumni', view: 'alumni' },
    { icon: Compass, label: 'Orientation', view: 'advising' },
    { icon: BookOpen, label: 'Bibliothèque', view: 'library' },
    { icon: ClipboardCheck, label: 'Présences', view: 'attendance' },
    { icon: MessageSquare, label: 'Messages', view: 'communication' },
    { icon: Monitor, label: 'Examens en ligne', view: 'online-exam' },
    { icon: BarChart3, label: 'Rapports', view: 'reports' },
    { icon: Users, label: 'Personnel', view: 'hr' },
    { icon: DoorOpen, label: 'Salles', view: 'room-booking' },
    { icon: Bus, label: 'Transport', view: 'transport' },
    { icon: Award, label: 'Résultats', view: 'results' },
    { icon: School, label: 'Institution', view: 'institution' },
  ],
  RECTORAT: [
    { icon: LayoutDashboard, label: 'Tableau de bord', view: 'dashboard' },
    { icon: Users, label: 'Étudiants', view: 'students' },
    { icon: BarChart3, label: 'Statistiques', view: 'statistics' },
    { icon: FileText, label: 'Documents', view: 'documents' },
    { icon: BarChart3, label: 'Rapports', view: 'reports' },
    { icon: Users, label: 'Personnel', view: 'hr' },
  ],
  SCOLARITE: [
    { icon: LayoutDashboard, label: 'Tableau de bord', view: 'dashboard' },
    { icon: Users, label: 'Étudiants', view: 'students' },
    { icon: GraduationCap, label: 'Enseignants', view: 'teachers' },
    { icon: UserCog, label: 'Utilisateurs / responsables', view: 'staff-users' },
    { icon: Building2, label: 'Structure', view: 'structure' },
    { icon: ClipboardList, label: 'Maquettes', view: 'maquette' },
    { icon: FileCheck, label: 'Notes', view: 'grades' },
    { icon: CheckSquare, label: 'Délibérations', view: 'deliberation' },
    { icon: UserPlus, label: 'Candidatures', view: 'candidature' },
    { icon: FileText, label: 'Documents', view: 'documents' },
    { icon: CreditCard, label: 'Paiements', view: 'payments' },
    { icon: Award, label: 'Bourses', view: 'scholarships' },
    { icon: Compass, label: 'Orientation', view: 'advising' },
    { icon: BookOpen, label: 'Bibliothèque', view: 'library' },
    { icon: ClipboardCheck, label: 'Présences', view: 'attendance' },
    { icon: Calendar, label: 'Emploi du temps', view: 'timetable' },
    { icon: BookOpenCheck, label: 'Services enseignants', view: 'teaching-services' },
    { icon: DoorOpen, label: 'Salles', view: 'room-booking' },
    { icon: Bus, label: 'Transport', view: 'transport' },
    { icon: Award, label: 'Resultats', view: 'results' },
    { icon: Megaphone, label: 'Annonces', view: 'announcements' },
    { icon: MessageSquare, label: 'Messages', view: 'communication' },
    { icon: BarChart3, label: 'Rapports', view: 'reports' },
  ],
  FACULTE: [
    { icon: LayoutDashboard, label: 'Tableau de bord', view: 'dashboard' },
    { icon: Calendar, label: 'Emploi du temps', view: 'timetable' },
    { icon: BookOpenCheck, label: 'Services enseignants', view: 'teaching-services' },
    { icon: CheckSquare, label: 'Délibérations', view: 'deliberation' },
  ],
  DEPARTEMENT: [
    { icon: LayoutDashboard, label: 'Tableau de bord', view: 'dashboard' },
    { icon: Users, label: 'Étudiants du département', view: 'students' },
    { icon: GraduationCap, label: 'Enseignants', view: 'teachers' },
    { icon: Building2, label: 'Structure', view: 'structure' },
    { icon: ClipboardList, label: 'Maquettes / UE', view: 'maquette' },
    { icon: Calendar, label: 'Emploi du temps', view: 'timetable' },
    { icon: BookOpenCheck, label: 'Services enseignants', view: 'teaching-services' },
    { icon: CheckSquare, label: 'Délibérations', view: 'deliberation' },
  ],
  ENSEIGNANT: [
    { icon: LayoutDashboard, label: 'Tableau de bord', view: 'dashboard' },
    { icon: BookOpen, label: 'Mes UE', view: 'maquette' },
    { icon: Users, label: 'Mes étudiants', view: 'students' },
    { icon: FileCheck, label: 'Notes', view: 'grades' },
    { icon: Calendar, label: 'Emploi du temps', view: 'timetable' },
    { icon: ClipboardCheck, label: 'Présences', view: 'attendance' },
    { icon: Monitor, label: 'Examens en ligne', view: 'online-exam' },
    { icon: MessageSquare, label: 'Messages', view: 'communication' },
  ],
  RESPONSABLE_FILIERE: [
    { icon: LayoutDashboard, label: 'Tableau de bord', view: 'dashboard' },
    { icon: Users, label: 'Étudiants', view: 'students' },
    { icon: FileCheck, label: 'Notes', view: 'grades' },
    { icon: CheckSquare, label: 'Délibérations', view: 'deliberation' },
    { icon: ClipboardCheck, label: 'Examens', view: 'exam-scheduling' },
    { icon: Compass, label: 'Orientation', view: 'advising' },
    { icon: ClipboardList, label: 'Maquettes', view: 'maquette' },
    { icon: Monitor, label: 'Examens en ligne', view: 'online-exam' },
    { icon: MessageSquare, label: 'Messages', view: 'communication' },
  ],
  JURY: [
    { icon: LayoutDashboard, label: 'Tableau de bord', view: 'dashboard' },
    { icon: CheckSquare, label: 'Délibérations', view: 'deliberation' },
    { icon: Users, label: 'Étudiants', view: 'students' },
  ],
  CAISSE: [
    { icon: LayoutDashboard, label: 'Tableau de bord', view: 'dashboard' },
    { icon: CreditCard, label: 'Paiements', view: 'payments' },
    { icon: Award, label: 'Bourses', view: 'scholarships' },
    { icon: Receipt, label: 'Reçus', view: 'documents' },
    { icon: BarChart3, label: 'Statistiques', view: 'statistics' },
  ],
  ETUDIANT: [
    { icon: LayoutDashboard, label: 'Tableau de bord', view: 'dashboard' },
    { icon: FileCheck, label: 'Mes Notes', view: 'grades' },
    { icon: FileText, label: 'Mes Documents', view: 'documents' },
    { icon: CreditCard, label: 'Mes Paiements', view: 'payments' },
    { icon: ClipboardList, label: 'Mes Absences', view: 'health' },
    { icon: Calendar, label: 'Emploi du temps', view: 'timetable' },
    { icon: Monitor, label: 'Mes Examens', view: 'student-exam' },
  ],
  ETUDIANT_SANTE: [
    { icon: LayoutDashboard, label: 'Tableau de bord', view: 'dashboard' },
    { icon: FileCheck, label: 'Mes Notes', view: 'grades' },
    { icon: FileText, label: 'Mes Documents', view: 'documents' },
    { icon: Briefcase, label: 'Mes Stages', view: 'internships' },
    { icon: Stethoscope, label: 'Mon Carnet', view: 'health' },
    { icon: Calendar, label: 'Emploi du temps', view: 'timetable' },
  ],
  MAITRE_STAGE: [
    { icon: LayoutDashboard, label: 'Tableau de bord', view: 'dashboard' },
    { icon: Briefcase, label: 'Stages', view: 'internships' },
    { icon: CheckSquare, label: 'Évaluations', view: 'grades' },
    { icon: Users, label: 'Étudiants', view: 'students' },
  ],
  PARENT: [
    { icon: LayoutDashboard, label: 'Tableau de bord', view: 'dashboard' },
    { icon: FileCheck, label: 'Notes', view: 'grades' },
    { icon: CreditCard, label: 'Paiements', view: 'payments' },
  ],
}

const roleLabels: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN_INSTITUTION: 'Admin Institution',
  RECTORAT: 'Rectorat',
  SCOLARITE: 'Scolarité',
  FACULTE: 'Doyen / direction de faculté',
  DEPARTEMENT: 'Chef de département',
  ENSEIGNANT: 'Enseignant',
  RESPONSABLE_FILIERE: 'Resp. Filière',
  JURY: 'Jury',
  CAISSE: 'Caisse',
  ETUDIANT: 'Étudiant',
  ETUDIANT_SANTE: 'Étudiant Santé',
  MAITRE_STAGE: 'Maître de Stage',
  PARENT: 'Parent',
}

const viewLabels: Record<AppView, string> = {
  landing: 'Accueil',
  login: 'Connexion',
  signup: 'Créer un compte',
  'student-login': 'Connexion Étudiant',
  dashboard: 'Tableau de bord',
  students: 'Étudiants',
  'student-detail': 'Détail Étudiant',
  teachers: 'Enseignants',
  'teacher-detail': 'Détail Enseignant',
  structure: 'Structure Académique',
  programs: 'Programmes',
  maquette: 'Maquettes',
  grades: 'Notes',
  deliberation: 'Délibérations',
  documents: 'Documents',
  payments: 'Paiements',
  health: 'Santé',
  internships: 'Stages',
  statistics: 'Statistiques',
  settings: 'Paramètres',
  institution: 'Institution',
  'platform-institutions': 'Institutions',
  'staff-users': 'Utilisateurs',
  verify: 'Vérification',
  announcements: 'Annonces',
  timetable: 'Emploi du temps',
  'teaching-services': 'Services enseignants',
  'import-export': 'Import/Export',
  'inscription-pedagogique': 'Inscription Pédagogique',
  scholarships: 'Bourses & Aide financière',
  profile: 'Profil',
  candidature: 'Candidatures',
  'exam-scheduling': 'Planification des Examens',
  alumni: 'Alumni & Anciens Étudiants',
  library: 'Bibliothèque & Ressources',
  advising: 'Orientation & Conseils académiques',
  attendance: 'Présences & Absences',
  communication: 'Communication & Messagerie',
  'online-exam': 'Examens en Ligne',
  'student-exam': 'Mes Examens',
  reports: 'Rapports & Analyses',
  hr: 'Gestion du Personnel',
  'room-booking': 'Réservation des Salles',
  transport: 'Transport & Navette',
  results: 'Gestion des Résultats',
}

// ─── Sidebar Component ────────────────────────────────────────────────────────

function SidebarContent({ onNavigate }: { onNavigate?: () => void } = {}) {
  const { user, currentView, setView, logout, sidebarCollapsed } = useAppStore()

  if (!user) return null

  const handleLogout = async () => {
    await signOut({ redirect: false })
    logout()
  }

  const navItems = getVisibleNavItems(user)
  const initials = `${user.firstName[0]}${user.lastName[0]}`

  return (
    <div className="flex flex-col h-full bg-[var(--institution-primary)] text-white">
      {/* Logo area */}
      <div className={`relative flex items-center gap-3 px-4 py-5 ${sidebarCollapsed ? 'justify-center' : ''}`}>
        <div className="relative p-1.5 rounded-lg bg-[var(--institution-secondary)] shrink-0">
          <Shield className="size-5 text-white" />
          {/* Pulsing green dot indicator */}
          <motion.div
            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--institution-secondary-bright)]"
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        {!sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="overflow-hidden"
          >
            <div className="text-lg font-bold tracking-tight">
              Uni<span className="text-white">Sahel</span>
            </div>
            <div className="text-[10px] text-white/80 truncate">
              {user.role === 'SUPER_ADMIN' ? 'Administration plateforme' : (user.tenantName || 'Établissement')}
            </div>
          </motion.div>
        )}
        {/* Animated gradient border-bottom */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-[var(--institution-secondary-40)] via-[var(--institution-secondary-bright-60)] to-[var(--institution-secondary-40)]"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* User info */}
      <div className={`flex items-center gap-3 px-4 py-3 border-b border-white/10 ${sidebarCollapsed ? 'justify-center' : ''}`}>
        <div className="relative shrink-0">
          <Avatar className="size-9 border-2 border-[var(--institution-secondary)]">
            <AvatarFallback className="bg-[var(--institution-secondary)] text-white text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {/* Green online indicator dot */}
          <motion.div
            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--institution-secondary-bright)] border-2 border-[var(--institution-primary)]"
            animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        {!sidebarCollapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden min-w-0">
            <div className="text-sm font-medium truncate">{user.firstName} {user.lastName}</div>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-gradient-to-r from-[var(--institution-secondary-30)] to-[var(--institution-secondary-10)] text-white border-0 mt-0.5">
              {roleLabels[user.role]}
            </Badge>
          </motion.div>
        )}
      </div>

      {/* Navigation -- min-h-0 lets this flex child shrink below its content
          height so the ScrollArea actually clips and scrolls, instead of
          growing to fit every item and pushing the bottom actions off-screen
          (the classic flexbox min-height:auto trap). */}
      <ScrollArea className="flex-1 min-h-0 py-2">
        <nav className="space-y-0.5 px-2">
          {navItems.map((item) => {
            const isActive = currentView === item.view
            return (
              <button
                key={item.view}
                onClick={() => { setView(item.view); onNavigate?.() }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative overflow-hidden ${
                  sidebarCollapsed ? 'justify-center' : ''
                } ${
                  isActive
                    ? 'bg-[var(--institution-secondary-20)] text-white'
                    : 'text-white/85 hover:text-white hover:bg-gradient-to-r hover:from-[var(--institution-secondary-10)] hover:to-transparent'
                }`}
              >
                {/* Animated gradient left border for active item */}
                {isActive && (
                  <motion.div
                    className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[var(--institution-secondary)] to-[var(--institution-secondary-bright)]"
                    animate={{ scaleY: [0.8, 1, 0.8], opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ transformOrigin: 'center' }}
                  />
                )}
                <item.icon className={`size-[18px] shrink-0 transition-colors duration-200 ${isActive ? 'text-white' : 'text-white/80 group-hover:text-white'}`} />
                {!sidebarCollapsed && (
                  <span className="truncate">{item.label}</span>
                )}
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-[var(--institution-primary)] border border-white/20 rounded text-xs text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                    {item.label}
                  </div>
                )}
              </button>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Bottom actions */}
      <div className="border-t border-white/10 p-3 space-y-1">
        <button
          onClick={() => { setView(['ENSEIGNANT', 'FACULTE', 'DEPARTEMENT'].includes(user.role) ? 'profile' : 'settings'); onNavigate?.() }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/85 hover:text-white hover:bg-white/5 transition-colors ${sidebarCollapsed ? 'justify-center' : ''}`}
        >
          <Settings className="size-[18px] shrink-0" />
          {!sidebarCollapsed && <span>{['ENSEIGNANT', 'FACULTE', 'DEPARTEMENT'].includes(user.role) ? 'Mon profil' : 'Paramètres'}</span>}
        </button>
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400/80 hover:text-red-300 hover:bg-red-500/10 transition-colors ${sidebarCollapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="size-[18px] shrink-0" />
          {!sidebarCollapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </div>
  )
}

// ─── Main Content Renderer ────────────────────────────────────────────────────

function MainContent({ view }: { view: AppView }) {
  const { user } = useAppStore()
  if (user?.role === 'FACULTE' || user?.role === 'DEPARTEMENT') {
    // These screens are intentionally shared with the central administration,
    // but their APIs apply the user's faculty/department scope server-side.
    // Keep them reachable from the local dashboard instead of falling back to
    // the organization overview for every unlisted view.
    if (view === 'students') return <StudentsList />
    if (view === 'teachers') return <TeachersPage />
    if (view === 'structure') return <StructurePage />
    if (view === 'maquette' || view === 'programs') return <MaquettePage />
    if (view === 'grades') return <GradesPage />
    if (view === 'reports') return <ReportsPage />
    if (view === 'timetable') return <TimetablePage />
    if (view === 'teaching-services') return <TeachingServicesPage />
    if (view === 'deliberation') return <DeliberationPage />
    if (view === 'profile') return <ProfilePage />
    return <OrganizationDashboard />
  }
  if (user?.role === 'ENSEIGNANT') {
    if (view === 'maquette') return <TeacherUnitsPage />
    if (view === 'timetable') return <TeacherTimetablePage />
    if (view === 'attendance') return <TeacherAttendancePage />
    if (view === 'online-exam') return <TeacherOnlineExamPage />
    if (view === 'communication') return <TeacherMessagesPage />
    if (!['dashboard', 'grades', 'profile'].includes(view)) return <DashboardHome />
  }
  if ((user?.role === 'ETUDIANT' || user?.role === 'ETUDIANT_SANTE') && view === 'timetable') return <StudentTimetablePage />
  if (view === 'health' && !isHealthAcademicSystem(user?.tenantAcademicSystem)) {
    return <DashboardHome />
  }
  switch (view) {
    case 'dashboard':
      // A SUPER_ADMIN has no tenant of their own -- /api/dashboard is
      // tenant-scoped, so their "dashboard" is the platform-wide view.
      return user?.role === 'SUPER_ADMIN' ? <PlatformInstitutionsPage /> : <DashboardHome />
    case 'platform-institutions':
      return <PlatformInstitutionsPage />
    case 'staff-users':
      return <StaffUsersPage />
    case 'students':
      return <StudentsList />
    case 'student-detail':
      return <StudentDetail />
    case 'structure':
      return <StructurePage />
    case 'grades':
      return <GradesPage />
    case 'deliberation':
      return <DeliberationPage />
    case 'documents':
      return <DocumentsPage />
    case 'payments':
      return <PaymentsPage />
    case 'health':
      return <HealthPage />
    case 'internships':
      return <InternshipsPage />
    case 'statistics':
      return <StatisticsPage />
    case 'verify':
      return <VerifyPage />
    case 'profile':
      return <ProfilePage />
    case 'settings':
      return <SettingsPage />
    case 'institution':
      return <InstitutionPage />
    case 'teachers':
      return <TeachersPage />
    case 'teacher-detail':
      return <TeacherDetail />
    case 'programs':
    case 'maquette':
      return <MaquettePage />
    case 'announcements':
      return <AnnouncementsPage />
    case 'timetable':
      return <TimetablePage />
    case 'teaching-services':
      return <TeachingServicesPage />
    case 'import-export':
      return <ImportExportPage />
    case 'candidature':
      return <CandidaturePage />
    case 'exam-scheduling':
      return <ExamSchedulingPage />
    case 'inscription-pedagogique':
      return <InscriptionPedagogiquePage />
    case 'scholarships':
      return <ScholarshipsPage />
    case 'alumni':
      return <AlumniPage />
    case 'library':
      return <LibraryPage />
    case 'advising':
      return <AdvisingPage />
    case 'attendance':
      return <AttendancePage />
    case 'communication':
      return <CommunicationPage />
    case 'online-exam':
      return <OnlineExamPage />
    case 'student-exam':
      return <StudentExamPage />
    case 'reports':
      return <ReportsPage />
    case 'hr':
      return <HrPage />
    case 'room-booking':
      return <RoomBookingPage />
    case 'transport':
      return <TransportPage />
    case 'results':
      return <ResultsPage />
    default:
      return <DashboardHome />
  }
}

// ─── Dashboard Shell ──────────────────────────────────────────────────────────

export function DashboardShell() {
  const { user, currentView, setView, logout, sidebarCollapsed, toggleSidebarCollapse, toggleNotifications, selectedAcademicYearId, setAcademicYear } = useAppStore()
  const { data: institutionTheme } = useQuery<{ settings: { primaryColor: string; secondaryColor: string; accentColor: string } | null }>({
    queryKey: ['institution-theme', user?.tenantId],
    enabled: Boolean(user?.tenantId),
    queryFn: async () => {
      const response = await fetch('/api/institution/branding')
      if (!response.ok) throw new Error('Impossible de charger la palette institutionnelle')
      return response.json()
    },
  })
  useEffect(() => {
    if (!user?.tenantId) return
    const settings = institutionTheme?.settings
    const primary = readableBrandColor(settings?.primaryColor || DEFAULT_BRAND.primaryColor)
    const secondary = readableBrandColor(settings?.secondaryColor || DEFAULT_BRAND.secondaryColor)
    const accent = settings?.accentColor || DEFAULT_BRAND.accentColor
    const root = document.documentElement
    root.style.setProperty('--institution-primary', primary)
    root.style.setProperty('--institution-secondary', secondary)
    root.style.setProperty('--institution-accent', accent)
    root.style.setProperty('--primary', primary)
    root.style.setProperty('--ring', secondary)
    root.style.setProperty('--chart-1', primary)
    root.style.setProperty('--chart-2', secondary)
    root.style.setProperty('--chart-3', accent)
    root.style.setProperty('--sidebar', primary)
    root.style.setProperty('--sidebar-primary', secondary)
    return () => {
      root.style.removeProperty('--institution-primary')
      root.style.removeProperty('--institution-secondary')
      root.style.removeProperty('--institution-accent')
      for (const token of ['--primary', '--ring', '--chart-1', '--chart-2', '--chart-3', '--sidebar', '--sidebar-primary']) root.style.removeProperty(token)
    }
  }, [user?.tenantId, institutionTheme])
  const { data: notificationsData } = useNotifications()
  const { data: academicYearsData } = useAcademicYears({ enabled: Boolean(user?.tenantId) && user?.role !== 'SUPER_ADMIN' })
  const unreadCount: number = notificationsData?.unreadCount ?? 0
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    const sync = () => setIsDesktop(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  const handleLogout = async () => {
    await signOut({ redirect: false })
    logout()
  }

  const academicYears: { id: string; name: string; isCurrent?: boolean }[] = academicYearsData?.data ?? []
  const currentAcademicYearId = selectedAcademicYearId || academicYears.find((year) => year.isCurrent)?.id || academicYears[0]?.id
  const visibleNavItems = useMemo(() => getVisibleNavItems(user), [user])
  useEffect(() => {
    if (user?.role !== 'ENSEIGNANT') return
    if (!['dashboard', 'maquette', 'grades', 'timetable', 'attendance', 'online-exam', 'communication', 'profile'].includes(currentView)) setView('dashboard')
  }, [user?.role, currentView, setView])
  useEffect(() => {
    if (user?.role !== 'FACULTE' && user?.role !== 'DEPARTEMENT') return
    if (!['dashboard', 'timetable', 'teaching-services', 'deliberation', 'profile'].includes(currentView)) setView('dashboard')
  }, [user?.role, currentView, setView])
  const searchTerm = searchQuery.trim().toLowerCase()
  const searchResults = searchTerm
    ? visibleNavItems.filter((item) => {
        const viewLabel = viewLabels[item.view]?.toLowerCase() || ''
        return item.label.toLowerCase().includes(searchTerm) || viewLabel.includes(searchTerm)
      }).slice(0, 8)
    : []

  const openSearchResult = (view: AppView) => {
    setView(view)
    setSearchQuery('')
  }

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  if (!user) return null

  if (user.mustChangePassword) return <ForcedPasswordChange />

  const initials = `${user.firstName[0]}${user.lastName[0]}`

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 72 : 260 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="hidden lg:flex flex-col fixed top-0 left-0 bottom-0 z-40 shadow-xl"
      >
        <SidebarContent />
        {/* Collapse toggle */}
        <button
          onClick={toggleSidebarCollapse}
          className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors z-50"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="size-3 text-gray-500" />
          ) : (
            <ChevronLeft className="size-3 text-gray-500" />
          )}
        </button>
      </motion.aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[min(280px,85vw)] bg-[var(--institution-primary)] p-0">
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main Area */}
      <motion.div
        initial={false}
        animate={{ marginLeft: isDesktop ? (sidebarCollapsed ? 72 : 260) : 0 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="flex min-w-0 flex-1 flex-col min-h-screen"
      >
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white shadow-sm">
          <div className="flex h-14 items-center justify-between px-3 sm:px-4 lg:px-6">
            {/* Left: Mobile menu + Breadcrumb */}
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                onClick={() => setMobileOpen(true)}
                aria-label="Menu"
              >
                <Menu className="size-5 text-gray-600" />
              </button>
              <nav className="flex min-w-0 items-center gap-1.5 text-sm">
                <span className="hidden text-gray-500 sm:inline">UniSahel</span>
                <span className="hidden text-gray-400 sm:inline">/</span>
                <span className="max-w-[48vw] truncate font-medium text-[var(--institution-primary)]">{user.role === 'ENSEIGNANT' && currentView === 'maquette' ? 'Mes UE' : viewLabels[currentView]}</span>
              </nav>
            </div>

            {/* Center: Search Bar (hidden on mobile) */}
            <div className="hidden md:flex items-center gap-2 flex-1 max-w-md mx-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && searchResults[0]) {
                      event.preventDefault()
                      openSearchResult(searchResults[0].view)
                    }
                    if (event.key === 'Escape') {
                      setSearchQuery('')
                    }
                  }}
                  placeholder="Rechercher..."
                  className="pl-9 h-8 text-sm bg-gray-50 border-gray-200 focus:ring-2 focus:ring-[var(--institution-secondary-20)] focus:border-[var(--institution-secondary)] transition-all"
                />
                {searchTerm && (
                  <div className="absolute left-0 right-0 top-10 z-50 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                    {searchResults.length > 0 ? (
                      searchResults.map((item) => (
                        <button
                          key={item.view}
                          type="button"
                          onClick={() => openSearchResult(item.view)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-[var(--institution-secondary-10)] hover:text-[var(--institution-primary)]"
                        >
                          <item.icon className="size-4 text-[var(--institution-secondary)]" />
                          <span>{item.label}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500">Aucun résultat</div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 text-[10px] text-gray-400 font-medium shrink-0">
                <span className="text-[11px]">⌘</span>
                <span>K</span>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 lg:gap-3">
              {/* Academic Year Selector */}
              <Select value={currentAcademicYearId} onValueChange={setAcademicYear} disabled={academicYears.length === 0}>
                <SelectTrigger className="w-[140px] h-8 text-xs hidden sm:flex">
                  <SelectValue placeholder="Aucune année" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((y) => (
                    <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Notifications */}
              {user.role !== 'ENSEIGNANT' && <button
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
                onClick={toggleNotifications}
                aria-label="Notifications"
              >
                <Bell className="size-[18px] text-gray-500" />
                {unreadCount > 0 && (
                  <motion.span
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-[var(--institution-secondary)] text-white text-[10px] font-bold rounded-full px-1 ring-2 ring-[var(--institution-secondary-20)]"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    {unreadCount}
                  </motion.span>
                )}
              </button>}

              {/* Verify */}
              {user.role !== 'ENSEIGNANT' && <Button
                variant="ghost"
                size="sm"
                className="hidden sm:flex text-xs text-[var(--institution-secondary)] hover:text-[var(--institution-secondary-dark)]"
                onClick={() => setView('verify')}
              >
                Vérifier document
              </Button>}

              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 transition-colors group">
                    <Avatar className="size-8 border-2 border-[var(--institution-secondary-20)] group-hover:ring-2 group-hover:ring-[var(--institution-secondary-30)] transition-all">
                      <AvatarFallback className="bg-[var(--institution-secondary)] text-white text-xs font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-left">
                      <div className="text-xs font-medium text-[var(--institution-primary)] leading-tight">{user.firstName} {user.lastName}</div>
                      <div className="text-[10px] text-gray-400">{roleLabels[user.role]}</div>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setView('profile')}>
                    <CircleUser className="size-4 mr-2" />
                    Mon profil
                  </DropdownMenuItem>
                  {!['ENSEIGNANT', 'FACULTE', 'DEPARTEMENT'].includes(user.role) && <DropdownMenuItem onClick={() => setView('settings')}>
                    <Settings className="size-4 mr-2" />
                    Paramètres
                  </DropdownMenuItem>}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="size-4 mr-2" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {/* Gradient bottom border */}
          <div className="h-0.5 bg-gradient-to-r from-[var(--institution-primary)] via-[var(--institution-secondary)] to-[var(--institution-accent)]" />
        </header>

        {/* Content Area */}
        <main className="min-w-0 flex-1 overflow-auto p-3 sm:p-4 lg:p-6">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 12, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <MainContent view={currentView} />
          </motion.div>
        </main>
      </motion.div>

      {/* Notification Panel */}
      {user.role !== 'ENSEIGNANT' && <NotificationPanel />}

      {/* AI Assistant Widget */}
      {user.role !== 'ENSEIGNANT' && <AIAssistantWidget />}
    </div>
  )
}
