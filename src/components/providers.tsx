'use client'

import { SessionProvider, useSession } from 'next-auth/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { ReactNode } from 'react'
import { useAppStore } from '@/lib/store'

function SessionSync() {
  const { data: session, status } = useSession()
  const login = useAppStore((s) => s.login)
  const logout = useAppStore((s) => s.logout)

  useEffect(() => {
    if (status !== 'authenticated' && status !== 'unauthenticated') return

    if (session?.user) {
      const u = session.user as any
      login({
        id: u.id,
        tenantId: u.tenantId || '',
        email: u.email,
        login: u.login,
        firstName: u.firstName || u.name?.split(' ').slice(1).join(' ') || '',
        lastName: u.lastName || u.name?.split(' ')[0] || '',
        role: u.role || 'ETUDIANT',
        photo: u.photo,
        tenantName: u.tenantName,
        tenantLogo: u.tenantLogo,
        tenantSlug: u.tenantSlug,
        mustChangePassword: Boolean(u.mustChangePassword),
      })
    } else {
      logout()
    }
  }, [session, status, login, logout])

  return null
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            retry: 1,
          },
        },
      })
  )

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <SessionSync />
        {children}
      </QueryClientProvider>
    </SessionProvider>
  )
}