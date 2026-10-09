import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getAuthSecret } from '@/lib/auth/secret'

export function isPublicPath(pathname: string) {
  return (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/student-login' ||
    pathname === '/signup' ||
    pathname === '/verify' ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/documents/verify/')
  )
}

export async function proxy(req: NextRequest) {
  const { nextUrl } = req

  if (isPublicPath(nextUrl.pathname)) {
    return NextResponse.next()
  }

  // Validate session via NextAuth
  const token = await getToken({
    req,
    secret: getAuthSecret(),
  })
  if (!token) {
    const callbackUrl = encodeURIComponent(nextUrl.pathname + nextUrl.search)
    return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
}
