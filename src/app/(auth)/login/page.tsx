'use client'

import { Suspense } from 'react'
import { LoginPage } from '@/components/auth/login-page'

function LoginContent() {
  return <LoginPage />
}

export default function LoginRoute() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement...</div>}>
      <LoginContent />
    </Suspense>
  )
}