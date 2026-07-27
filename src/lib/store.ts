import { create } from 'zustand'

export type AppView =
  | 'landing'
  | 'login'
  | 'signup'
  | 'student-login'
  | 'dashboard'
  | 'students'
  | 'student-detail'
  | 'teachers'
  | 'teacher-detail'
  | 'structure'
  | 'programs'
  | 'maquette'
  | 'grades'
  | 'deliberation'
  | 'documents'
  | 'payments'
  | 'health'
  | 'internships'
  | 'statistics'
  | 'settings'
  | 'institution'
  | 'verify'
  | 'announcements'
  | 'timetable'
  | 'import-export'
  | 'inscription-pedagogique'
  | 'scholarships'
  | 'profile'
  | 'candidature'
  | 'exam-scheduling'
  | 'alumni'
  | 'advising'
  | 'library'
  | 'attendance'
  | 'communication'
  | 'online-exam'
  | 'reports'
  | 'hr'
  | 'room-booking'
  | 'results'
  | 'transport'

export type UserRole = 
  | 'SUPER_ADMIN'
  | 'ADMIN_INSTITUTION'
  | 'RECTORAT'
  | 'SCOLARITE'
  | 'FACULTE'
  | 'DEPARTEMENT'
  | 'ENSEIGNANT'
  | 'RESPONSABLE_FILIERE'
  | 'JURY'
  | 'CAISSE'
  | 'ETUDIANT'
  | 'ETUDIANT_SANTE'
  | 'MAITRE_STAGE'
  | 'PARENT'

export interface AppUser {
  id: string
  tenantId: string
  email?: string
  login?: string
  firstName: string
  lastName: string
  role: UserRole
  photo?: string
  tenantName?: string
  tenantLogo?: string
  tenantSlug?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface AppState {
  currentView: AppView
  previousView: AppView | null
  user: AppUser | null
  isAuthenticated: boolean
  selectedTenantId: string | null
  selectedAcademicYearId: string | null
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  selectedStudentId: string | null
  selectedProgramId: string | null
  selectedTeacherId: string | null
  notificationsOpen: boolean
  chatOpen: boolean
  chatMessages: ChatMessage[]
  
  // Actions
  setView: (view: AppView) => void
  goBack: () => void
  login: (user: AppUser) => void
  logout: () => void
  setTenant: (tenantId: string) => void
  setAcademicYear: (yearId: string) => void
  toggleSidebar: () => void
  toggleSidebarCollapse: () => void
  selectStudent: (studentId: string | null) => void
  selectProgram: (programId: string | null) => void
  selectTeacher: (teacherId: string | null) => void
  toggleNotifications: () => void
  toggleChat: () => void
  addChatMessage: (msg: {role: 'user' | 'assistant', content: string}) => void
}

export const useAppStore = create<AppState>((set, _get) => ({
  currentView: 'landing',
  previousView: null,
  user: null,
  isAuthenticated: false,
  selectedTenantId: null,
  selectedAcademicYearId: null,
  sidebarOpen: true,
  sidebarCollapsed: false,
  selectedStudentId: null,
  selectedProgramId: null,
  selectedTeacherId: null,
  notificationsOpen: false,
  chatOpen: false,
  chatMessages: [
    {
      id: 'welcome',
      role: 'assistant',
      content: "Bonjour ! Je suis l'assistant UniSahel. Je peux vous aider avec :\n• Inscription et gestion des étudiants\n• Saisie des notes et délibérations\n• Génération de documents\n• Paiements et reçus\n• Questions sur le système LMD\n\nComment puis-je vous aider ?",
      timestamp: new Date(),
    }
  ],

  setView: (view) => set((state) => ({ 
    currentView: view, 
    previousView: state.currentView 
  })),
  
  goBack: () => set((state) => ({ 
    currentView: state.previousView || 'dashboard',
    previousView: null 
  })),
  
  login: (user) => set({ 
    user, 
    isAuthenticated: true, 
    currentView: 'dashboard',
    selectedTenantId: user.tenantId 
  }),
  
  logout: () => set({ 
    user: null, 
    isAuthenticated: false, 
    currentView: 'landing',
    selectedTenantId: null,
    selectedAcademicYearId: null,
    selectedStudentId: null,
    selectedProgramId: null,
    selectedTeacherId: null
  }),
  
  setTenant: (tenantId) => set({ selectedTenantId: tenantId }),
  setAcademicYear: (yearId) => set({ selectedAcademicYearId: yearId }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleSidebarCollapse: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  selectStudent: (studentId) => set({ selectedStudentId: studentId }),
  selectProgram: (programId) => set({ selectedProgramId: programId }),
  selectTeacher: (teacherId) => set({ selectedTeacherId: teacherId }),
  toggleNotifications: () => set((state) => ({ notificationsOpen: !state.notificationsOpen })),
  toggleChat: () => set((state) => ({ chatOpen: !state.chatOpen })),
  addChatMessage: (msg) => set((state) => ({
    chatMessages: [...state.chatMessages, {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role: msg.role,
      content: msg.content,
      timestamp: new Date(),
    }]
  })),
}))
