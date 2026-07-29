'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { KeyRound, LogOut } from 'lucide-react'

// Gates the whole app for any account still on a one-time temp password
// (Super Admin bootstrap, institution admins, teachers, staff -- all
// provisioned with mustChangePassword: true). Without this the flag was
// set on creation but never actually enforced anywhere.
export function ForcedPasswordChange() {
  const { update } = useSession()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) {
      toast.error('Le nouveau mot de passe doit contenir au moins 8 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Les deux mots de passe ne correspondent pas')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/profile?action=password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const body = await res.json()
      if (!res.ok) {
        toast.error(body.error || 'Impossible de changer le mot de passe')
        return
      }
      await update()
      toast.success('Mot de passe mis a jour')
    } catch {
      toast.error('Erreur reseau, veuillez reessayer')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-[#1a274415] flex items-center justify-center">
            <KeyRound className="size-6 text-[#1a2744]" />
          </div>
          <CardTitle className="text-[#1a2744]">Choisissez votre mot de passe</CardTitle>
          <CardDescription>
            Votre compte a ete cree avec un mot de passe temporaire. Vous devez le remplacer avant de continuer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fpc-current" className="text-sm">Mot de passe temporaire</Label>
              <Input
                id="fpc-current"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fpc-new" className="text-sm">Nouveau mot de passe</Label>
              <Input
                id="fpc-new"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fpc-confirm" className="text-sm">Confirmer le mot de passe</Label>
              <Input
                id="fpc-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <Button type="submit" className="w-full bg-[#1a2744] hover:bg-[#243352] text-white" disabled={isLoading}>
              {isLoading ? 'Enregistrement...' : 'Valider et continuer'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-xs text-gray-500"
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              <LogOut className="size-3.5 mr-1.5" />
              Se deconnecter
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
