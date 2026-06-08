'use client'

import { Suspense } from 'react'
import { VerifyPage } from '@/components/verify/verify-page'

export default function VerifyRoute() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Chargement...</div>}>
      <VerifyPageInner />
    </Suspense>
  )
}

function VerifyPageInner() {
  return <VerifyPage />
}
