import 'next-auth'
import { UserRole } from '@prisma/client'

declare module 'next-auth' {
  interface User {
    id: string
    role: UserRole
    tenantId: string | null
    tenantName?: string
    tenantSlug?: string
    firstName: string
    lastName: string
  }

  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: UserRole
      tenantId: string | null
      tenantName?: string
      tenantSlug?: string
      firstName: string
      lastName: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: UserRole
    tenantId: string | null
    tenantName?: string
    tenantSlug?: string
    firstName: string
    lastName: string
  }
}