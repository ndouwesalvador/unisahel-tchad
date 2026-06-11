'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Shield,
  ArrowLeft,
  Mail,
  Lock,
  User,
  GraduationCap,
  Settings,
  BookOpen,
  ShieldCheck,
} from 'lucide-react'

type DemoRole = {
  label: string
  role: 'SUPER_ADMIN' | 'ADMIN_INSTITUTION' | 'ENSEIGNANT' | 'SCOLARITE'
  email: string
  firstName: string
  lastName: string
  icon: React.ElementType
}

const demoRoles: DemoRole[] = [
  {
    label: 'Super Admin',
    role: 'SUPER_ADMIN',
    email: 'admin@unisahel.africa',
    firstName: 'Super',
    lastName: 'Admin',
    icon: Settings,
  },
  {
    label: 'Admin Institution',
    role: 'ADMIN_INSTITUTION',
    email: 'admin@unive-ndjamena.td',
    firstName: 'Admin',
    lastName: 'Principal',
    icon: Shield,
  },
  {
    label: 'Enseignant',
    role: 'ENSEIGNANT',
    email: 'prof@unive-ndjamena.td',
    firstName: 'Moussa',
    lastName: 'Hissein',
    icon: BookOpen,
  },
  {
    label: 'Scolarite',
    role: 'SCOLARITE',
    email: 'scolarite@unive-ndjamena.td',
    firstName: 'Fatime',
    lastName: 'Abakar',
    icon: User,
  },
]

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
  const { setView } = useAppStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const callbackUrl = searchParams.get('callbackUrl') || '/'

  const handleDemoLogin = async (demo: DemoRole) => {
    setEmail(demo.email)
    setPassword('password123')
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email: demo.email,
        password: 'password123',
        redirect: false,
        callbackUrl,
      })

      if (result?.error) {
        toast.error('Échec de la connexion', { description: result.error })
      } else {
        toast.success('Connexion réussie')
        window.location.href = callbackUrl
      }
    } catch {
      toast.error('Erreur de connexion', { description: 'Veuillez réessayer' })
    } finally {
      setIsLoading(false)
    }
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
        window.location.href = callbackUrl
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
            backgroundImage: 'radial-gradient(circle, #1a2744 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <FloatingShape
        className="absolute top-[10%] left-[8%] w-24 h-24 rounded-full border border-[#1a2744] opacity-[0.04]"
        duration={25}
        delay={0}
      />
      <FloatingShape
        className="absolute top-[60%] right-[12%] w-32 h-32 rounded-full border border-[#2d7a4f] opacity-[0.03]"
        duration={30}
        delay={2}
      />
      <FloatingShape
        className="absolute top-[30%] right-[25%] w-16 h-16 border border-[#d4a853] opacity-[0.05] rotate-45"
        duration={22}
        delay={1}
      />
      <FloatingShape
        className="absolute bottom-[15%] left-[20%] w-20 h-20 rounded-full border border-[#2d7a4f] opacity-[0.04]"
        duration={28}
        delay={3}
      />
      <FloatingShape
        className="absolute top-[50%] left-[5%] w-12 h-12 border border-[#1a2744] opacity-[0.06] rotate-12"
        duration={18}
        delay={0.5}
      />
      <div className="absolute bottom-[30%] right-[8%] w-28 h-28 opacity-[0.03] pointer-events-none">
        <svg viewBox="0 0 100 100" className="w-full h-full text-[#1a2744]">
          <polygon points="50,3 97,25 97,75 50,97 3,75 3,25" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#2d7a4f05] rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <button
          onClick={() => setView('landing')}
          className="flex items-center gap-2 text-gray-500 hover:text-[#1a2744] text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Retour a l&apos;accueil
        </button>

        <div className="bg-gradient-to-br from-[#1a2744] via-[#2d7a4f] to-[#d4a853] p-[2px] rounded-2xl shadow-xl shadow-[#1a274420]">
          <Card className="border-0 bg-white rounded-[14px]">
            <CardHeader className="text-center pb-2">
              <div className="flex items-center justify-center gap-2 mb-2">
                <motion.div
                  className="p-2 rounded-lg bg-[#1a2744]"
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
                <span className="text-lg font-bold text-[#1a2744]">
                  Uni
                  <motion.span
                    className="text-[#2d7a4f]"
                    animate={{ opacity: [0.9, 1, 0.9] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    Sahel
                  </motion.span>
                </span>
              </div>
              <CardTitle className="text-xl font-bold text-[#1a2744]">Connexion</CardTitle>
              <CardDescription className="text-gray-500">
                Accedez a votre espace de gestion universitaire
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
                      onClick={() => toast.info('Fonctionnalite de reinitialisation disponible en version complete')}
                      className="text-xs text-[#2d7a4f] hover:text-[#236b40] font-medium"
                    >
                      Mot de passe oublie ?
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
                  className="w-full bg-[#2d7a4f] hover:bg-[#236b40] text-white h-10"
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

              <div className="bg-gradient-to-r from-[#1a2744] via-[#2d7a4f] to-[#d4a853] p-[1.5px] rounded-lg">
                <motion.button
                  onClick={() => setView('student-login')}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-[6px] bg-white text-sm font-medium text-[#1a2744] hover:bg-[#2d7a4f05] transition-colors"
                >
                  <GraduationCap className="size-4 text-[#2d7a4f]" />
                  Connexion etudiant
                </motion.button>
              </div>

              <div className="mt-6 p-4 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Mode demonstration
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {demoRoles.map((demo) => (
                    <motion.div
                      key={demo.role}
                      whileHover={{ scale: 1.03 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start text-xs h-9 border-gray-200 hover:border-l-2 hover:border-l-[#2d7a4f] hover:bg-[#2d7a4f08] transition-all duration-200 w-full"
                        onClick={() => handleDemoLogin(demo)}
                        disabled={isLoading}
                      >
                        <demo.icon className="size-3.5 mr-1.5 text-[#2d7a4f]" />
                        {demo.label}
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  )
}