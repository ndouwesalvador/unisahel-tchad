export const runtime = 'nodejs'

if (process.env.VERCEL_URL) {
  process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`
}


import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth/config'

const handler = NextAuth(authConfig)

export { handler as GET, handler as POST }