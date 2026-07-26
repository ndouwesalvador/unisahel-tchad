'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ShieldCheck,
  ArrowLeft,
  Mail,
  Lock,
  User,
  Building2,
  MapPin,
  Loader2,
} from 'lucide-react'

const countries = [
  'Tchad', 'Cameroun', 'Niger', 'Senegal', 'Mali',
  'Burkina Faso', "Cote d'Ivoire", 'Congo', 'RDC', 'Benin', 'Togo',
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

export function SignupPage() {
  const { setView } = useAppStore()
  const [institutionName, setInstitutionName] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    if (password.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caracteres')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institutionName, country, city, firstName, lastName, email, password }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        toast.error(data.error || "Echec de la creation du compte")
        setIsLoading(false)
        return
      }

      const result = await signIn('credentials', { email, password, redirect: false })
      if (result?.error) {
        toast.error('Compte cree, mais la connexion automatique a echoue', { description: 'Connectez-vous manuellement.' })
        setView('login')
        setIsLoading(false)
        return
      }

      toast.success('Bienvenue sur UniSahel !', { description: 'Votre etablissement a ete cree.' })
      window.location.href = '/'
    } catch {
      toast.error('Erreur', { description: 'Impossible de creer le compte. Veuillez reessayer.' })
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

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#2d7a4f05] rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-lg"
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
                <div className="p-2 rounded-lg bg-[#1a2744]">
                  <ShieldCheck className="size-5 text-white" />
                </div>
                <span className="text-lg font-bold text-[#1a2744]">
                  Uni<span className="text-[#2d7a4f]">Sahel</span>
                </span>
              </div>
              <CardTitle className="text-xl font-bold text-[#1a2744]">Creer votre compte</CardTitle>
              <CardDescription className="text-gray-500">
                Configurez votre etablissement en quelques minutes
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Votre etablissement</p>

                  <div className="space-y-2">
                    <Label htmlFor="institutionName" className="text-sm font-medium text-gray-700">
                      Nom de l&apos;etablissement
                    </Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                      <Input
                        id="institutionName"
                        placeholder="Universite de N'Djamena"
                        className="pl-10"
                        value={institutionName}
                        onChange={(e) => setInstitutionName(e.target.value)}
                        disabled={isLoading}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Pays</Label>
                      <Select value={country} onValueChange={setCountry} disabled={isLoading}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-sm font-medium text-gray-700">Ville</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                        <Input
                          id="city"
                          placeholder="N'Djamena"
                          className="pl-10"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Votre compte administrateur</p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">Prenom</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                        <Input
                          id="firstName"
                          placeholder="Amina"
                          className="pl-10"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          disabled={isLoading}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">Nom</Label>
                      <Input
                        id="lastName"
                        placeholder="Djibrine"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        disabled={isLoading}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">Adresse email</Label>
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
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium text-gray-700">Mot de passe</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="8 caracteres min."
                          className="pl-10"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={isLoading}
                          required
                          minLength={8}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Confirmer</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="Repetez"
                          className="pl-10"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          disabled={isLoading}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#2d7a4f] hover:bg-[#236b40] text-white h-10"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Creation en cours...
                    </>
                  ) : (
                    'Creer mon etablissement'
                  )}
                </Button>
              </form>

              <p className="mt-5 text-center text-sm text-gray-500">
                Deja un compte ?{' '}
                <button
                  onClick={() => setView('login')}
                  className="text-[#2d7a4f] font-medium hover:underline"
                >
                  Se connecter
                </button>
              </p>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  )
}
