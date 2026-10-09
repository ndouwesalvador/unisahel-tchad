'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft,
  GraduationCap,
  KeyRound,
  User,
  Info,
} from 'lucide-react'

export function StudentLoginPage() {
  const router = useRouter()
  const [loginCode, setLoginCode] = useState('')
  const [pin, setPin] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async () => {
    if (!loginCode.trim() || !pin.trim()) {
      toast.error('Identifiants requis', { description: 'Saisissez votre matricule et votre code PIN.' })
      return
    }
    if (isLoading) return
    setIsLoading(true)
    try {
      const result = await signIn('credentials', {
        login: loginCode.trim(),
        pin: pin.trim(),
        redirect: false,
      })
      if (result?.error) {
        toast.error('Échec de la connexion', { description: 'Identifiant ou code PIN incorrect.' })
        setIsLoading(false)
      } else {
        router.replace('/')
        router.refresh()
      }
    } catch {
      toast.error('Erreur', { description: 'Impossible de se connecter.' })
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[var(--institution-primary)] via-[#1f3158] to-[var(--institution-secondary)] relative overflow-hidden px-4 py-8">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-white/5 rounded-full translate-y-1/3 -translate-x-1/3" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--institution-secondary-10)] rounded-full" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Back to staff login */}
        <button
          onClick={() => router.push('/login')}
          className="flex items-center gap-2 text-white/60 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Connexion personnel
        </button>

        <Card className="border-gray-200/50 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-[var(--institution-secondary)]">
                <GraduationCap className="size-5 text-white" />
              </div>
              <span className="text-lg font-bold text-[var(--institution-primary)]">
                Uni<span className="text-[var(--institution-secondary)]">Sahel</span>
              </span>
            </div>
            <CardTitle className="text-xl font-bold text-[var(--institution-primary)]">Espace Étudiant</CardTitle>
            <CardDescription className="text-gray-500">
              Consultez vos notes, documents et informations académiques
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            <form onSubmit={(event) => { event.preventDefault(); void handleSubmit() }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login" className="text-sm font-medium text-gray-700">
                  Login
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <Input
                    id="login"
                    type="text"
                    placeholder="UNSH-2026-L1-000245"
                    className="pl-10 font-mono text-sm"
                    value={loginCode}
                    onChange={(e) => setLoginCode(e.target.value.toUpperCase())}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pin" className="text-sm font-medium text-gray-700">
                  Code PIN
                </Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <Input
                    id="pin"
                    type="password"
                    placeholder="Entrez votre code PIN"
                    className="pl-10"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    maxLength={6}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button
                type="button"
                className="w-full bg-[var(--institution-secondary)] hover:bg-[var(--institution-secondary-dark)] text-white h-10"
                disabled={isLoading}
                onClick={() => void handleSubmit()}
              >
                {isLoading ? 'Connexion…' : 'Connexion'}
              </Button>
            </form>

            {/* Info notice */}
            <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-[var(--institution-primary-08)] border border-[var(--institution-primary-10)]">
              <Info className="size-4 text-[var(--institution-primary)] mt-0.5 shrink-0" />
              <p className="text-xs text-gray-600 leading-relaxed">
                Votre identifiant figure sur votre fiche d&apos;inscription. Si vous l&apos;avez perdu, adressez-vous au service de la scolarité.
              </p>
            </div>

            {/* Back to landing */}
            <button
              onClick={() => router.push('/')}
              className="w-full mt-4 text-center text-xs text-gray-400 hover:text-[var(--institution-secondary)] transition-colors"
            >
              Retour à l&apos;accueil
            </button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
