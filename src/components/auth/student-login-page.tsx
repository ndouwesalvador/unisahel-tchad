'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { signIn } from 'next-auth/react'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
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
  const { setView, login } = useAppStore()
  const [loginCode, setLoginCode] = useState('')
  const [pin, setPin] = useState('')

  const handleDemoLogin = async () => {
    const result = await signIn('credentials', {
      login: 'UNSH-2026-L1-000245',
      pin: '123456',
      redirect: false,
    })
    if (result?.error) {
      toast.error('Échec de la connexion', { description: 'Login ou PIN incorrect' })
    } else {
      window.location.href = '/'
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const result = await signIn('credentials', {
        login: loginCode || 'UNSH-2026-L1-000245',
        pin: pin || '123456',
        redirect: false,
      })
      if (result?.error) {
        toast.error('Échec de la connexion', { description: 'Login ou PIN incorrect' })
      } else {
        window.location.href = '/'
      }
    } catch {
      toast.error('Erreur', { description: 'Impossible de se connecter' })
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#1a2744] via-[#1f3158] to-[#2d7a4f] relative overflow-hidden px-4 py-8">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-white/5 rounded-full translate-y-1/3 -translate-x-1/3" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#2d7a4f10] rounded-full" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Back to staff login */}
        <button
          onClick={() => setView('login')}
          className="flex items-center gap-2 text-white/60 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Connexion personnel
        </button>

        <Card className="border-gray-200/50 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-[#2d7a4f]">
                <GraduationCap className="size-5 text-white" />
              </div>
              <span className="text-lg font-bold text-[#1a2744]">
                Uni<span className="text-[#2d7a4f]">Sahel</span>
              </span>
            </div>
            <CardTitle className="text-xl font-bold text-[#1a2744]">Espace Etudiant</CardTitle>
            <CardDescription className="text-gray-500">
              Consultez vos notes, documents et informations academiques
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#2d7a4f] hover:bg-[#236b40] text-white h-10"
              >
                Connexion
              </Button>
            </form>

            {/* Info notice */}
            <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-[#1a274408] border border-[#1a274410]">
              <Info className="size-4 text-[#1a2744] mt-0.5 shrink-0" />
              <p className="text-xs text-gray-600 leading-relaxed">
                Votre login a ete imprime sur votre fiche d&apos;inscription. Si vous l&apos;avez perdu, veuillez vous adresser au service de la scolarite.
              </p>
            </div>

            {/* Demo Section */}
            <div className="mt-5 p-4 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Mode demonstration
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-center text-xs h-9 border-gray-200 hover:border-[#2d7a4f40] hover:bg-[#2d7a4f08]"
                onClick={handleDemoLogin}
              >
                <GraduationCap className="size-3.5 mr-1.5 text-[#2d7a4f]" />
                Connexion en tant qu&apos;etudiant
              </Button>
            </div>

            {/* Back to landing */}
            <button
              onClick={() => setView('landing')}
              className="w-full mt-4 text-center text-xs text-gray-400 hover:text-[#2d7a4f] transition-colors"
            >
              Retour a l&apos;accueil
            </button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
