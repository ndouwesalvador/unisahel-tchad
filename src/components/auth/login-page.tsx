'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Mail,
  Lock,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react'

function FloatingShape({
  className,
  delay = 0,
  duration = 20,
}: {
  className: string
  delay?: number
  duration?: number
}) {
  return (
    <motion.div
      className={className}
      animate={{
        y: [-15, 15, -15],
        x: [-8, 8, -8],
        rotate: [0, 180, 360],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
    />
  )
}

export function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const rawCallbackUrl = searchParams.get('callbackUrl') || '/'
  const safeCallbackUrl = rawCallbackUrl.startsWith('/') && !rawCallbackUrl.startsWith('//') ? rawCallbackUrl : '/'
  const callbackUrl = safeCallbackUrl.startsWith('/dashboard') ? '/' : safeCallbackUrl

  // signIn already updates the NextAuth session cookie. Let SessionProvider
  // hydrate the local store on the destination page instead of making a
  // second /api/auth/session request before redirecting.
  const syncSessionAndRedirect = () => {
    window.location.href = callbackUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      })

      if (result?.error) {
        toast.error('Échec de la connexion', { description: result.error })
      } else {
        toast.success('Connexion réussie')
        await syncSessionAndRedirect()
      }
    } catch {
      toast.error('Erreur de connexion', { description: 'Veuillez réessayer' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 via-white to-[#f5e6d020] relative overflow-hidden px-4 py-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.07]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, var(--institution-primary) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <FloatingShape
        className="absolute top-[10%] left-[8%] w-24 h-24 rounded-full border border-[var(--institution-primary)] opacity-[0.04]"
        duration={25}
        delay={0}
      />
      <FloatingShape
        className="absolute top-[60%] right-[12%] w-32 h-32 rounded-full border border-[var(--institution-secondary)] opacity-[0.03]"
        duration={30}
        delay={2}
      />
      <FloatingShape
        className="absolute top-[30%] right-[25%] w-16 h-16 border border-[var(--institution-accent)] opacity-[0.05] rotate-45"
        duration={22}
        delay={1}
      />
      <FloatingShape
        className="absolute bottom-[15%] left-[20%] w-20 h-20 rounded-full border border-[var(--institution-secondary)] opacity-[0.04]"
        duration={28}
        delay={3}
      />
      <FloatingShape
        className="absolute top-[50%] left-[5%] w-12 h-12 border border-[var(--institution-primary)] opacity-[0.06] rotate-12"
        duration={18}
        delay={0.5}
      />
      <div className="absolute bottom-[30%] right-[8%] w-28 h-28 opacity-[0.03] pointer-events-none">
        <svg viewBox="0 0 100 100" className="w-full h-full text-[var(--institution-primary)]">
          <polygon points="50,3 97,25 97,75 50,97 3,75 3,25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--institution-secondary-05)] rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-gray-500 hover:text-[var(--institution-primary)] text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Retour à l&apos;accueil
        </button>

        <div className="bg-gradient-to-br from-[var(--institution-primary)] via-[var(--institution-secondary)] to-[var(--institution-accent)] p-[2px] rounded-2xl shadow-xl shadow-[var(--institution-primary-20)]">
          <Card className="border-0 bg-white rounded-[14px]">
            <CardHeader className="text-center pb-2">
              <div className="flex items-center justify-center gap-2 mb-2">
                <motion.div
                  className="p-2 rounded-lg bg-[var(--institution-primary)]"
                  animate={{ rotate: [0, 0, 0] }}
                  whileHover={{ scale: 1.05 }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <ShieldCheck className="size-5 text-white" />
                  </motion.div>
                </motion.div>
                <span className="text-lg font-bold text-[var(--institution-primary)]">
                  Uni
                  <motion.span
                    className="text-[var(--institution-secondary)]"
                    animate={{ opacity: [0.9, 1, 0.9] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    Sahel
                  </motion.span>
                </span>
              </div>
              <CardTitle className="text-xl font-bold text-[var(--institution-primary)]">Connexion</CardTitle>
              <CardDescription className="text-gray-500">
                Accédez à votre espace de gestion universitaire
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Adresse email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="nom@universite.td"
                      className="pl-10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                      Mot de passe
                    </Label>
                    <button
                      type="button"
                      onClick={() => toast.info('Réinitialisation indisponible', { description: 'Contactez l’administrateur de votre institution.' })}
                      className="text-xs text-[var(--institution-secondary)] hover:text-[var(--institution-secondary-dark)] font-medium"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Entrez votre mot de passe"
                      className="pl-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[var(--institution-secondary)] hover:bg-[var(--institution-secondary-dark)] text-white h-10"
                  disabled={isLoading}
                >
                  {isLoading ? 'Connexion...' : 'Connexion'}
                </Button>
              </form>

              <div className="relative my-6">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs text-gray-400">
                  ou
                </span>
              </div>

              <div className="bg-gradient-to-r from-[var(--institution-primary)] via-[var(--institution-secondary)] to-[var(--institution-accent)] p-[1.5px] rounded-lg">
                <motion.button
                  onClick={() => router.push('/student-login')}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-[6px] bg-white text-sm font-medium text-[var(--institution-primary)] hover:bg-[var(--institution-secondary-05)] transition-colors"
                >
                  <GraduationCap className="size-4 text-[var(--institution-secondary)]" />
                  Connexion étudiant
                </motion.button>
              </div>

              <p className="mt-4 text-center text-sm text-gray-500">
                Nouvel établissement ?{' '}
                <button
                  onClick={() => router.push('/signup')}
                  className="text-[var(--institution-secondary)] font-medium hover:underline"
                >
                  Créer un compte
                </button>
              </p>

            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  )
}
