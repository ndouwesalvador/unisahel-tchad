import NextAuth, { getServerSession } from 'next-auth'
import type { Adapter } from 'next-auth/adapters'
import type { JWT } from 'next-auth/jwt'
import type { Session, User } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { z } from 'zod'
import { getAuthSecret } from '@/lib/auth/secret'

export const authConfig = {
  secret: getAuthSecret(),
  adapter: PrismaAdapter(db) as Adapter,
  session: { strategy: 'jwt' as const },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'admin@univ.td' },
        password: { label: 'Mot de passe', type: 'password' },
        login: { label: 'Login', type: 'text', placeholder: 'UNSH-2026-L1-000245' },
        pin: { label: 'Code PIN', type: 'text', placeholder: '123456' },
      },
      authorize: async (credentials) => {
        const parsed = z
          .object({
            email: z.string().email().optional(),
            password: z.string().min(6).optional(),
            login: z.string().optional(),
            pin: z.string().length(6).optional(),
          })
          .safeParse(credentials)

        if (!parsed.success) return null

        const { email, password, login, pin } = parsed.data

        let user
        if (email) {
          user = await db.user.findFirst({
            where: { email, isActive: true },
            include: { tenant: true },
          })
        } else if (login) {
          user = await db.user.findFirst({
            where: { login, isActive: true },
            include: { tenant: true },
          })
        } else {
          return null
        }

        if (!user) return null

        if (password && user.passwordHash) {
          const valid = await bcrypt.compare(password, user.passwordHash)
          if (!valid) return null
        } else if (password && !user.passwordHash) {
          return null
        }

        if (pin && user.pinHash) {
          const valid = await bcrypt.compare(pin, user.pinHash)
          if (!valid) return null
        } else if (pin && !user.pinHash) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenantId: user.tenantId,
          tenantName: user.tenant?.name,
          tenantSlug: user.tenant?.slug,
          image: user.photo,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        const raw = user as unknown as Record<string, unknown>
        token.id = user.id
        token.role = raw.role as JWT['role']
        token.tenantId = raw.tenantId as string | null
        token.tenantName = raw.tenantName as string
        token.tenantSlug = raw.tenantSlug as string
        token.firstName = raw.firstName as JWT['firstName']
        token.lastName = raw.lastName as JWT['lastName']
      }
      return token
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        const raw = token as unknown as Record<string, unknown>
        session.user.id = raw.id as string
        session.user.role = raw.role as Session['user']['role']
        session.user.tenantId = raw.tenantId as string | null
        session.user.tenantName = raw.tenantName as string
        session.user.tenantSlug = raw.tenantSlug as string
        session.user.firstName = raw.firstName as Session['user']['firstName']
        session.user.lastName = raw.lastName as Session['user']['lastName']
      }
      return session
    },
  },
  events: {
    async signIn(message: { user: User; isNewUser?: boolean }) {
      const { user, isNewUser } = message
      if (!user?.id) return
      const raw = user as unknown as Record<string, unknown>
      const tenantId = raw.tenantId as string | null

      let ipAddress: string | undefined
      let userAgent: string | undefined
      try {
        const { headers } = await import('next/headers')
        const h = await headers()
        ipAddress = h.get('x-forwarded-for')?.split(',')[0].trim() || undefined
        userAgent = h.get('user-agent') || undefined
      } catch {
        // headers() is only available inside a request context - best effort only
      }

      await db.auditLog.create({
        data: {
          tenantId,
          userId: user.id,
          action: 'SIGN_IN',
          entity: 'User',
          entityId: user.id,
          ipAddress,
          details: JSON.stringify({ signInMethod: 'credentials', isNewUser, userAgent }),
        },
      })
    },
  },
}

export const auth = () => getServerSession(authConfig)