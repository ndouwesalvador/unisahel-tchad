'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { signOut } from 'next-auth/react'
import { useAppStore, type AppView, type UserRole } from '@/lib/store'
import { useNotifications } from '@/lib/api-hooks'
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
} from 'lucide-react'
import { DashboardHome } from './dashboard-home'
import { StudentsList } from '@/components/students/students-list'
import { StudentDetail } from '@/components/students/student-detail'
import { StructurePage } from '@/components/structure/structure-page'
import { GradesPage } from '@/components/grades/grades-page'
import { DeliberationPage } from '@/components/deliberation/deliberation-page'
import { DocumentsPage } from '@/components/documents/documents-page'
import { PaymentsPage } from '@/components/payments/payments-page'
import { HealthPage } from '@/components/health/health-page'
import { StatisticsPage } from '@/components/statistics/statistics-page'
import { VerifyPage } from '@/components/verify/verify-page'
import { SettingsPage } from '@/components/settings/settings-page'
import { InstitutionPage } from '@/components/institution/institution-page'
import { PlatformInstitutionsPage } from '@/components/platform/platform-institutions-page'
import { TeachersPage } from '@/components/teachers/teachers-page'
import { TeacherDetail } from '@/components/teachers/teacher-detail'
import { MaquettePage } from '@/components/maquette/maquette-page'
import { AnnouncementsPage } from '@/components/announcements/announcements-page'
import { ImportExportPage } from '@/components/import-export/import-export-page'
import { TimetablePage } from '@/components/timetable/timetable-page'
import { CandidaturePage } from '@/components/candidature/candidature-page'
import { InscriptionPedagogiquePage } from '@/components/inscription-pedagogique/inscription-pedagogique-page'
import { ProfilePage } from '@/components/profile/profile-page'
import { ExamSchedulingPage } from '@/components/exam-scheduling/exam-scheduling-page'
import { ScholarshipsPage } from '@/components/scholarships/scholarships-page'
import { AlumniPage } from '@/components/alumni/alumni-page'
import { AdvisingPage } from '@/components/advising/advising-page'
import { LibraryPage } from '@/components/library/library-page'
import { AttendancePage } from '@/components/attendance/attendance-page'
import { CommunicationPage } from '@/components/communication/communication-page'
import { OnlineExamPage } from '@/components/online-exam/online-exam-page'
import { ReportsPage } from '@/components/reports/reports-page'
import { InternshipsPage } from '@/components/internships/internships-page'
import { HrPage } from '@/components/hr/hr-page'
import { RoomBookingPage } from '@/components/room-booking/room-booking-page'
import { ResultsPage } from '@/components/results/results-page'
import { TransportPage } from '@/components/transport/transport-page'
import { NotificationPanel } from '@/components/notifications/notification-panel'
import { StudentExamPage } from '@/components/online-exam/student-exam-page'
import { AIAssistantWidget } from '@/components/ai-assistant/ai-assistant-widget'

// ─── Navigation Config ────────────────────────────────────────────────────────

interface NavItem {
  icon: React.ElementType
  label: string
  view: AppView
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
    { icon: UserPlus, label: 'Candidatures', view: 'candidature' },
    { icon: Building2, label: 'Structure', view: 'structure' },
    { icon: BookOpen, label: 'Programmes', view: 'programs' },
    { icon: ClipboardList, label: 'Maquettes', view: 'maquette' },
    { icon: FileCheck, label: 'Notes', view: 'grades' },
    { icon: CheckSquare, label: 'Délibérations', view: 'deliberation' },
    { icon: FileText, label: 'Documents', view: 'documents' },
    { icon: CreditCard, label: 'Paiements', view: 'payments' },
    { icon: Heart, label: 'Santé', view: 'health' },
    { icon: Briefcase, label: 'Stages', view: 'internships' },
    { icon: Calendar, label: 'Emploi du temps', view: 'timetable' },
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
    { icon: Award, label: 'Resultats', view: 'results' },
    { icon: Settings, label: 'Paramètres', view: 'settings' },
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
    { icon: UserPlus, label: 'Candidatures', view: 'candidature' },
    { icon: FileText, label: 'Documents', view: 'documents' },
    { icon: CreditCard, label: 'Paiements', view: 'payments' },
    { icon: Award, label: 'Bourses', view: 'scholarships' },
    { icon: Compass, label: 'Orientation', view: 'advising' },
    { icon: BookOpen, label: 'Bibliothèque', view: 'library' },
    { icon: ClipboardCheck, label: 'Présences', view: 'attendance' },
    { icon: DoorOpen, label: 'Salles', view: 'room-booking' },
    { icon: Bus, label: 'Transport', view: 'transport' },
    { icon: Award, label: 'Resultats', view: 'results' },
    { icon: Megaphone, label: 'Annonces', view: 'announcements' },
    { icon: MessageSquare, label: 'Messages', view: 'communication' },
    { icon: BarChart3, label: 'Rapports', view: 'reports' },
  ],
  FACULTE: [
    { icon: LayoutDashboard, label: 'Tableau de bord', view: 'dashboard' },
    { icon: Users, label: 'Étudiants', view: 'students' },
    { icon: UserPlus, label: 'Candidatures', view: 'candidature' },
    { icon: FileCheck, label: 'Notes', view: 'grades' },
    { icon: CheckSquare, label: 'Délibérations', view: 'deliberation' },
    { icon: FileText, label: 'Documents', view: 'documents' },
    { icon: Calendar, label: 'Emploi du temps', view: 'timetable' },
    { icon: ClipboardCheck, label: 'Examens', view: 'exam-scheduling' },
    { icon: DoorOpen, label: 'Salles', view: 'room-booking' },
    { icon: Award, label: 'Resultats', view: 'results' },
    { icon: BarChart3, label: 'Rapports', view: 'reports' },
  ],
  DEPARTEMENT: [
    { icon: LayoutDashboard, label: 'Tableau de bord', view: 'dashboard' },
    { icon: Users, label: 'Étudiants', view: 'students' },
    { icon: FileCheck, label: 'Notes', view: 'grades' },
    { icon: CheckSquare, label: 'Délibérations', view: 'deliberation' },
    { icon: FileText, label: 'Documents', view: 'documents' },
    { icon: BarChart3, label: 'Rapports', view: 'reports' },
  ],
  ENSEIGNANT: [
    { icon: LayoutDashboard, label: 'Tableau de bord', view: 'dashboard' },
    { icon: BookOpen, label: 'Mes UE', view: 'maquette' },
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
    { icon: Award, label: 'Resultats', view: 'results' },
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
  FACULTE: 'Faculté',
  DEPARTEMENT: 'Département',
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
  internships: 'Stages & Internships',
  statistics: 'Statistiques',
  settings: 'Paramètres',
  institution: 'Institution',
  'platform-institutions': 'Institutions',
  verify: 'Vérification',
  announcements: 'Annonces',
  timetable: 'Emploi du temps',
  'import-export': 'Import/Export',
  'inscription-pedagogique': 'Inscription Pédagogique',
  scholarships: 'Bourses & Aide financière',
  profile: 'Profil',
  candidature: 'Candidatures',
  'exam-scheduling': 'Planification des Examens',
  alumni: 'Alumni & Anciens Étudiants',
  library: 'Bibliothèque & Ressources',
  advising: 'Orientation & Conseils Academiques',
  attendance: 'Presences & Absences',
  communication: 'Communication & Messagerie',
  'online-exam': 'Examens en Ligne',
  'student-exam': 'Mes Examens',
  reports: 'Rapports & Analyses',
  hr: 'Gestion du Personnel',
  'room-booking': 'Reservation des Salles',
  transport: 'Transport & Navette',
  results: 'Gestion des Resultats',
}

// ─── Sidebar Component ────────────────────────────────────────────────────────

function SidebarContent() {
  const { user, currentView, setView, logout, sidebarCollapsed } = useAppStore()

  if (!user) return null

  const handleLogout = async () => {
    await signOut({ redirect: false })
    logout()
  }

  const navItems = roleNavItems[user.role] || []
  const initials = `${user.firstName[0]}${user.lastName[0]}`

  return (
    <div className="flex flex-col h-full bg-[#1a2744] text-white">
      {/* Logo area */}
      <div className={`relative flex items-center gap-3 px-4 py-5 ${sidebarCollapsed ? 'justify-center' : ''}`}>
        <div className="relative p-1.5 rounded-lg bg-[#2d7a4f] shrink-0">
          <Shield className="size-5 text-white" />
          {/* Pulsing green dot indicator */}
          <motion.div
            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#3da66a]"
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
              Uni<span className="text-[#3da66a]">Sahel</span>
            </div>
            <div className="text-[10px] text-white/50 truncate">
              {user.role === 'SUPER_ADMIN' ? 'Administration plateforme' : (user.tenantName || 'Établissement')}
            </div>
          </motion.div>
        )}
        {/* Animated gradient border-bottom */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-[#2d7a4f40] via-[#3da66a60] to-[#2d7a4f40]"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* User info */}
      <div className={`flex items-center gap-3 px-4 py-3 border-b border-white/10 ${sidebarCollapsed ? 'justify-center' : ''}`}>
        <div className="relative shrink-0">
          <Avatar className="size-9 border-2 border-[#2d7a4f]">
            <AvatarFallback className="bg-[#2d7a4f] text-white text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {/* Green online indicator dot */}
          <motion.div
            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#3da66a] border-2 border-[#1a2744]"
            animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        {!sidebarCollapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden min-w-0">
            <div className="text-sm font-medium truncate">{user.firstName} {user.lastName}</div>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-gradient-to-r from-[#2d7a4f30] to-[#2d7a4f10] text-[#3da66a] border-0 mt-0.5">
              {roleLabels[user.role]}
            </Badge>
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        <nav className="space-y-0.5 px-2">
          {navItems.map((item) => {
            const isActive = currentView === item.view
            return (
              <button
                key={item.view}
                onClick={() => setView(item.view)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative overflow-hidden ${
                  sidebarCollapsed ? 'justify-center' : ''
                } ${
                  isActive
                    ? 'bg-[#2d7a4f20] text-white'
                    : 'text-white/60 hover:text-white hover:bg-gradient-to-r hover:from-[#2d7a4f10] hover:to-transparent'
                }`}
              >
                {/* Animated gradient left border for active item */}
                {isActive && (
                  <motion.div
                    className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#2d7a4f] to-[#3da66a]"
                    animate={{ scaleY: [0.8, 1, 0.8], opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ transformOrigin: 'center' }}
                  />
                )}
                <item.icon className={`size-[18px] shrink-0 transition-colors duration-200 ${isActive ? 'text-[#3da66a]' : 'text-white/50 group-hover:text-[#3da66a]'}`} />
                {!sidebarCollapsed && (
                  <span className="truncate">{item.label}</span>
                )}
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-[#1a2744] border border-white/20 rounded text-xs text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">
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
          onClick={() => setView('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors ${sidebarCollapsed ? 'justify-center' : ''}`}
        >
          <Settings className="size-[18px] shrink-0" />
          {!sidebarCollapsed && <span>Paramètres</span>}
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
  switch (view) {
    case 'dashboard':
      // A SUPER_ADMIN has no tenant of their own -- /api/dashboard is
      // tenant-scoped, so their "dashboard" is the platform-wide view.
      return user?.role === 'SUPER_ADMIN' ? <PlatformInstitutionsPage /> : <DashboardHome />
    case 'platform-institutions':
      return <PlatformInstitutionsPage />
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
  const { user, currentView, setView, logout, sidebarCollapsed, toggleSidebarCollapse, toggleNotifications } = useAppStore()
  const { data: notificationsData } = useNotifications()
  const unreadCount: number = notificationsData?.unreadCount ?? 0
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await signOut({ redirect: false })
    logout()
  }

  if (!user) return null

  const initials = `${user.firstName[0]}${user.lastName[0]}`
  const academicYears = [
    { id: '2024-2025', label: '2024 - 2025' },
    { id: '2023-2024', label: '2023 - 2024' },
    { id: '2022-2023', label: '2022 - 2023' },
  ]

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
        <SheetContent side="left" className="p-0 w-[260px] bg-[#1a2744]">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Area */}
      <motion.div
        initial={false}
        animate={{ marginLeft: sidebarCollapsed ? 72 : 260 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="flex-1 flex flex-col min-h-screen"
      >
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white shadow-sm">
          <div className="flex items-center justify-between h-14 px-4 lg:px-6">
            {/* Left: Mobile menu + Breadcrumb */}
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                onClick={() => setMobileOpen(true)}
                aria-label="Menu"
              >
                <Menu className="size-5 text-gray-600" />
              </button>
              <nav className="flex items-center gap-1.5 text-sm">
                <span className="text-gray-500">UniSahel</span>
                <span className="text-gray-400">/</span>
                <span className="font-medium text-[#1a2744]">{viewLabels[currentView]}</span>
              </nav>
            </div>

            {/* Center: Search Bar (hidden on mobile) */}
            <div className="hidden md:flex items-center gap-2 flex-1 max-w-md mx-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  placeholder="Rechercher..."
                  className="pl-9 h-8 text-sm bg-gray-50 border-gray-200 focus:ring-2 focus:ring-[#2d7a4f20] focus:border-[#2d7a4f] transition-all"
                />
              </div>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 text-[10px] text-gray-400 font-medium shrink-0">
                <span className="text-[11px]">⌘</span>
                <span>K</span>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 lg:gap-3">
              {/* Academic Year Selector */}
              <Select defaultValue="2024-2025">
                <SelectTrigger className="w-[140px] h-8 text-xs hidden sm:flex">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((y) => (
                    <SelectItem key={y.id} value={y.id}>{y.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Notifications */}
              <button
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
                onClick={toggleNotifications}
                aria-label="Notifications"
              >
                <Bell className="size-[18px] text-gray-500" />
                {unreadCount > 0 && (
                  <motion.span
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-[#2d7a4f] text-white text-[10px] font-bold rounded-full px-1 ring-2 ring-[#2d7a4f20]"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    {unreadCount}
                  </motion.span>
                )}
              </button>

              {/* Verify */}
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:flex text-xs text-[#2d7a4f] hover:text-[#236b40]"
                onClick={() => setView('verify')}
              >
                Vérifier document
              </Button>

              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 transition-colors group">
                    <Avatar className="size-8 border-2 border-[#2d7a4f20] group-hover:ring-2 group-hover:ring-[#2d7a4f30] transition-all">
                      <AvatarFallback className="bg-[#2d7a4f] text-white text-xs font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-left">
                      <div className="text-xs font-medium text-[#1a2744] leading-tight">{user.firstName} {user.lastName}</div>
                      <div className="text-[10px] text-gray-400">{roleLabels[user.role]}</div>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setView('profile')}>
                    <CircleUser className="size-4 mr-2" />
                    Mon profil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setView('settings')}>
                    <Settings className="size-4 mr-2" />
                    Paramètres
                  </DropdownMenuItem>
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
          <div className="h-0.5 bg-gradient-to-r from-[#1a2744] via-[#2d7a4f] to-[#d4a853]" />
        </header>

        {/* Content Area */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
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
      <NotificationPanel />

      {/* AI Assistant Widget */}
      <AIAssistantWidget />
    </div>
  )
}
