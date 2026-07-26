'use client'

import { useAppStore } from '@/lib/store'
import { Providers } from '@/components/providers'
import { LandingPage } from '@/components/landing/landing-page'
import { LoginPage } from '@/components/auth/login-page'
import { SignupPage } from '@/components/auth/signup-page'
import { StudentLoginPage } from '@/components/auth/student-login-page'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { InstitutionPage } from '@/components/institution/institution-page'

export default function Home() {
  const { currentView, isAuthenticated } = useAppStore()

  return (
    <Providers>
      <div className="min-h-screen flex flex-col">
        {!isAuthenticated && currentView === 'landing' && <LandingPage />}
        {!isAuthenticated && currentView === 'login' && <LoginPage />}
        {!isAuthenticated && currentView === 'signup' && <SignupPage />}
        {!isAuthenticated && currentView === 'student-login' && <StudentLoginPage />}
        {!isAuthenticated && currentView === 'institution' && <InstitutionPage />}
        {isAuthenticated && currentView === 'institution' && <InstitutionPage />}
        {isAuthenticated && currentView !== 'institution' && <DashboardShell />}
      </div>
    </Providers>
  )
}