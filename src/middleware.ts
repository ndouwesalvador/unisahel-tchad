import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth/config'

export const runtime = 'nodejs'

const publicRoutes = ['/', '/login', '/api/auth', '/verify']

export async function middleware(req: NextRequest) {
  const { nextUrl } = req

  const isPublicRoute = publicRoutes.some((route) => nextUrl.pathname.startsWith(route))

  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Validate session via NextAuth
  const session = await auth()
  if (!session?.user) {
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
