import { auth } from '@/lib/auth/config'
import { NextRequest, NextResponse } from 'next/server'

export interface SessionUser {
  id: string
  email?: string | null
  name?: string | null
  role: string
  // Null only for a platform-level SUPER_ADMIN, who belongs to no single
  // institution. Every other role always has a real tenantId.
  tenantId: string | null
  tenantName?: string
  tenantSlug?: string
  firstName: string
  lastName: string
  image?: string | null
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth()
  if (!session?.user) return null

  const user = session.user as SessionUser
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
    tenantName: user.tenantName,
    tenantSlug: user.tenantSlug,
    firstName: user.firstName,
    lastName: user.lastName,
    image: user.image,
  }
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) {
    throw new Error('UNAUTHORIZED')
  }
  return user
}

export async function requireRole(allowedRoles: string[]): Promise<SessionUser> {
  const user = await requireAuth()
  if (!allowedRoles.includes(user.role)) {
    throw new Error('FORBIDDEN')
  }
  return user
}

export async function getTenantId(): Promise<string | null> {
  const user = await requireAuth()
  return user.tenantId
}

export async function getUserId(): Promise<string> {
  const user = await requireAuth()
  return user.id
}

export function createAuthError(error: string): NextResponse {
  const status = error === 'UNAUTHORIZED' ? 401 : 403
  return NextResponse.json(
    { error, message: error === 'UNAUTHORIZED' ? 'Non authentifié' : 'Accès refusé' },
    { status }
  )
}

export function withAuth<T extends unknown[]>(
  handler: (user: SessionUser, ...args: T) => Promise<NextResponse>,
  allowedRoles?: string[]
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      const session = await auth()
      if (!session?.user) {
        return createAuthError('UNAUTHORIZED')
      }

      const u = session.user as SessionUser
      const sessionUser: SessionUser = {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        tenantId: u.tenantId,
        tenantName: u.tenantName,
        tenantSlug: u.tenantSlug,
        firstName: u.firstName,
        lastName: u.lastName,
        image: u.image,
      }

      if (allowedRoles && !allowedRoles.includes(sessionUser.role)) {
        return createAuthError('FORBIDDEN')
      }

      return handler(sessionUser, ...args)
    } catch (error) {
      if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
        return createAuthError(error.message)
      }
      // eslint-disable-next-line no-console
      console.error('Auth handler error:', error)
      return NextResponse.json(
        { error: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
        { status: 500 }
      )
    }
  }
}

export function withTenantAuth(
  handler: (user: SessionUser, tenantId: string, request: NextRequest) => Promise<NextResponse>,
  allowedRoles?: string[]
) {
  return async (request: NextRequest, _context?: { params: Promise<Record<string, string>> }): Promise<NextResponse> => {
    try {
      const session = await auth()
      if (!session?.user) {
        return createAuthError('UNAUTHORIZED')
      }

      const u = session.user as SessionUser
      const sessionUser: SessionUser = {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        tenantId: u.tenantId,
        tenantName: u.tenantName,
        tenantSlug: u.tenantSlug,
        firstName: u.firstName,
        lastName: u.lastName,
        image: u.image,
      }

      if (allowedRoles && !allowedRoles.includes(sessionUser.role)) {
        return createAuthError('FORBIDDEN')
      }

      const url = new URL(request.url)
      const tenantId = url.searchParams.get('tenantId') || sessionUser.tenantId

      if (!tenantId) {
        return NextResponse.json(
          { error: 'TENANT_REQUIRED', message: 'tenantId est requis' },
          { status: 400 }
        )
      }

      if (sessionUser.role !== 'SUPER_ADMIN' && sessionUser.tenantId !== tenantId) {
        return createAuthError('FORBIDDEN')
      }

      return handler(sessionUser, tenantId, request)
    } catch (error) {
      if (error instanceof Error && (error.message === 'UNAUTHORIZED' || error.message === 'FORBIDDEN')) {
        return createAuthError(error.message)
      }
      // eslint-disable-next-line no-console
      console.error('Tenant auth handler error:', error)
      return NextResponse.json(
        { error: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' },
        { status: 500 }
      )
    }
  }
}