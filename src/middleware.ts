import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export const runtime = 'nodejs'

const publicRoutes = ['/', '/login', '/api/auth', '/verify']

export async function middleware(req: NextRequest) {
  const { nextUrl } = req

  const isPublicRoute = publicRoutes.some((route) => nextUrl.pathname.startsWith(route))

  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Validate session via NextAuth
  const token = await getToken({ req })
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
