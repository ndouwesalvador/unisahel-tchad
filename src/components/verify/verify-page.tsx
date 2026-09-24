'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { QrDisplay } from '@/components/ui/qr-display'
import {
  Search,
  Shield,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  FileText,
  Building2,
  Calendar,
  User,
  Fingerprint,
  ShieldCheck,
  Clock,
  Hash,
} from 'lucide-react'

type VerificationResult = {
  type: string
  etudiant: string
  matricule: string
  institution: string
  date: string
  valide: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VerifyPage() {
  const { setView } = useAppStore()
  const searchParams = useSearchParams()
  const [code, setCode] = useState('')
  const [searchResult, setSearchResult] = useState<VerificationResult | null | undefined>(undefined)
  const [searched, setSearched] = useState(false)
  const [verifying, setVerifying] = useState(false)

  const verifyCode = useCallback(async (rawCode: string) => {
    if (!rawCode.trim()) return
    setVerifying(true)
    setSearched(false)
    try {
      const res = await fetch(`/api/documents/verify/${encodeURIComponent(rawCode.trim().toUpperCase())}`)
      const data = await res.json()
      if (data.valid) {
        setSearchResult({
          type: data.document.type,
          etudiant: data.document.student?.name || 'Document collectif',
          matricule: data.document.student?.matricule || '',
          institution: data.document.institution || '—',
          date: data.document.generatedAt ? new Date(data.document.generatedAt).toLocaleDateString('fr-FR') : '',
          valide: true,
        })
      } else {
        setSearchResult({ type: '', etudiant: '', matricule: '', institution: '', date: '', valide: false })
      }
    } catch {
      setSearchResult({ type: '', etudiant: '', matricule: '', institution: '', date: '', valide: false })
    } finally {
      setSearched(true)
      setVerifying(false)
    }
  }, [])

  const handleSearch = () => verifyCode(code)

  // Auto-fill and verify when arriving via a scanned QR code (/verify?code=XXX)
  useEffect(() => {
    const codeFromUrl = searchParams.get('code')
    if (codeFromUrl) {
      setCode(codeFromUrl)
      verifyCode(codeFromUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handleReset = () => {
    setCode('')
    setSearchResult(undefined)
    setSearched(false)
  }

  return (
    <div className="space-y-0 -m-4 lg:-m-6">
      {/* ─────────────────── Hero Section ─────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#1a2744] via-[#1f3055] to-[#2d7a4f]">
        {/* Background decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 rounded-full border-2 border-white" />
          <div className="absolute bottom-10 right-20 w-60 h-60 rounded-full border border-white" />
          <div className="absolute top-1/2 left-1/3 w-20 h-20 rounded-full border border-white" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 py-12 sm:py-16 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div className="w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mx-auto mb-6 border border-white/20 shadow-lg">
              <Shield className="size-10 text-white" />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-2xl sm:text-3xl font-bold text-white mb-3"
          >
            Vérification de documents officiels
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-white/70 text-sm sm:text-base max-w-lg mx-auto"
          >
            Vérifiez l&apos;authenticité de vos documents UniSahel en entrant le code de vérification ou en scannant le QR code
          </motion.p>

          {/* Back button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={() => {
              setView('dashboard')
              window.location.href = '/'
            }}
            className="mt-6 inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="size-4" />
            Retour au tableau de bord
          </motion.button>
        </div>
      </div>

      {/* ─────────────────── Main Content ─────────────────── */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Verification Input */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="shadow-lg border-0 shadow-gray-200/50">
              <CardContent className="p-6">
                <h2 className="text-base font-semibold text-[#1a2744] mb-4 flex items-center gap-2">
                  <Search className="size-5 text-[#2d7a4f]" />
                  Vérifier un document
                </h2>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Code de vérification</label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                      <Input
                        placeholder="Code figurant sous le QR code"
                        className="pl-9 h-12 text-sm font-mono tracking-wider"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400">Saisissez le code imprimé sur le document officiel.</p>
                  </div>

                  <div>
                    <Button
                      className="w-full h-11 bg-gradient-to-r from-[#2d7a4f] to-[#3da66a] hover:from-[#236b40] hover:to-[#2d7a4f] text-white text-sm"
                      onClick={handleSearch}
                      disabled={verifying}
                    >
                      {verifying ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                          className="size-4 border-2 border-white/30 border-t-white rounded-full mr-2"
                        />
                      ) : (
                        <ShieldCheck className="size-4 mr-2" />
                      )}
                      {verifying ? 'Vérification...' : 'Vérifier'}
                    </Button>
                  </div>
                </div>

                {/* Result */}
                <AnimatePresence>
                  {searched && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="mt-6"
                    >
                      {searchResult && searchResult.valide ? (
                        /* Valid Document */
                        <div className="border-2 border-[#2d7a4f30] rounded-xl p-5 bg-gradient-to-br from-[#2d7a4f08] to-[#2d7a4f03]">
                          <div className="flex items-center gap-3 mb-4">
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                              className="w-12 h-12 rounded-full bg-[#2d7a4f15] flex items-center justify-center"
                            >
                              <CheckCircle2 className="size-6 text-[#2d7a4f]" />
                            </motion.div>
                            <div>
                              <h3 className="font-semibold text-[#2d7a4f]">Document authentique</h3>
                              <p className="text-xs text-gray-500">Ce document a été vérifié et authentifié avec succès</p>
                            </div>
                            <Badge className="ml-auto bg-[#2d7a4f] text-white text-[10px] border-0">
                              <CheckCircle2 className="size-3 mr-1" />
                              Authentique
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex items-start gap-3 p-2.5 rounded-lg bg-white/60">
                              <FileText className="size-4 text-[#2d7a4f] mt-0.5 shrink-0" />
                              <div>
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider">Type de document</span>
                                <p className="text-sm font-medium text-[#1a2744]">{searchResult.type}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3 p-2.5 rounded-lg bg-white/60">
                              <User className="size-4 text-[#2d7a4f] mt-0.5 shrink-0" />
                              <div>
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider">Étudiant</span>
                                <p className="text-sm font-medium text-[#1a2744]">{searchResult.etudiant}</p>
                                <p className="text-[10px] text-gray-400 font-mono">{searchResult.matricule}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3 p-2.5 rounded-lg bg-white/60">
                              <Building2 className="size-4 text-[#2d7a4f] mt-0.5 shrink-0" />
                              <div>
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider">Institution</span>
                                <p className="text-sm font-medium text-[#1a2744]">{searchResult.institution}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3 p-2.5 rounded-lg bg-white/60">
                              <Calendar className="size-4 text-[#2d7a4f] mt-0.5 shrink-0" />
                              <div>
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider">Date d&apos;émission</span>
                                <p className="text-sm font-medium text-[#1a2744]">{searchResult.date}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-white/60 sm:col-span-2">
                              <QrDisplay value={`${typeof window !== 'undefined' ? window.location.origin : ''}/verify?code=${code.toUpperCase()}`} size={100} />
                              <div className="text-center">
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider">Code de vérification</span>
                                <p className="text-sm font-mono font-bold text-[#2d7a4f]">{code.toUpperCase()}</p>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between text-[10px] text-gray-400 border-t border-[#2d7a4f15] pt-3">
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              Vérifié le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Fingerprint className="size-3" />
                              Empreinte numérique validée
                            </span>
                          </div>
                        </div>
                      ) : (
                        /* Invalid Document */
                        <div className="border-2 border-[#c6282830] rounded-xl p-5 bg-gradient-to-br from-[#c6282808] to-[#c6282803]">
                          <div className="flex items-center gap-3 mb-4">
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                              className="w-12 h-12 rounded-full bg-[#c6282815] flex items-center justify-center"
                            >
                              <XCircle className="size-6 text-[#c62828]" />
                            </motion.div>
                            <div>
                              <h3 className="font-semibold text-[#c62828]">Document non trouvé ou invalide</h3>
                              <p className="text-xs text-gray-500">Aucun document officiel ne correspond à ce code</p>
                            </div>
                          </div>

                          <div className="p-3 rounded-lg bg-[#c6282808] border border-[#c6282810]">
                            <p className="text-xs font-medium text-[#1a2744] mb-2">Causes possibles :</p>
                            <ul className="text-xs text-gray-500 space-y-1">
                              <li className="flex items-start gap-2">
                                <span className="text-[#c62828] mt-0.5">•</span>
                                Le code de vérification est incorrect ou incomplet
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-[#c62828] mt-0.5">•</span>
                                Le document a été révoqué par l&apos;institution
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-[#c62828] mt-0.5">•</span>
                                Le document est un faux et ne figure pas dans notre base
                              </li>
                            </ul>
                          </div>
                        </div>
                      )}

                      <div className="mt-4 flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs flex-1"
                          onClick={handleReset}
                        >
                          Nouvelle vérification
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-[#2d7a4f] hover:text-[#236b40]"
                          onClick={handleReset}
                        >
                          Effacer
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar: Trust + Help */}
          <div className="lg:col-span-2 space-y-4">
            {/* Trust Card */}
            <Card className="shadow-lg border-0 shadow-gray-200/50">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-[#1a2744] mb-4 flex items-center gap-2">
                  <ShieldCheck className="size-4 text-[#2d7a4f]" />
                  Vérification sécurisée
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#2d7a4f08] border border-[#2d7a4f15]">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#2d7a4f15] flex items-center justify-center">
                        <FileText className="size-4 text-[#2d7a4f]" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[#1a2744]">Base officielle</p>
                        <p className="text-[11px] text-gray-500">Chaque code est recherché dans les documents réellement générés.</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#1a274408] border border-[#1a274415]">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#1a274415] flex items-center justify-center">
                        <ShieldCheck className="size-4 text-[#1a2744]" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[#1a2744]">Empreinte numérique</p>
                        <p className="text-[11px] text-gray-500">Un code absent ou révoqué est refusé automatiquement.</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#d4a85308] border border-[#d4a85320]">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#d4a85315] flex items-center justify-center">
                        <Fingerprint className="size-4 text-[#d4a853]" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[#1a2744]">Traçabilité</p>
                        <p className="text-[11px] text-gray-500">Le résultat affiche uniquement les données associées au code officiel.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* How It Works Card */}
            <Card className="shadow-lg border-0 shadow-gray-200/50">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-[#1a2744] mb-4">Comment ça marche ?</h3>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1a2744] to-[#2d3a54] flex items-center justify-center shrink-0 text-white text-xs font-bold">
                      1
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#1a2744]">Scannez le QR code</p>
                      <p className="text-xs text-gray-400">Utilisez votre appareil photo pour scanner le QR code sur le document</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2d7a4f] to-[#3da66a] flex items-center justify-center shrink-0 text-white text-xs font-bold">
                      2
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#1a2744]">Entrez le code</p>
                      <p className="text-xs text-gray-400">Ou saisissez manuellement le code de vérification</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#d4a853] to-[#e0be6e] flex items-center justify-center shrink-0 text-white text-xs font-bold">
                      3
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#1a2744]">Vérifiez l&apos;authenticité</p>
                      <p className="text-xs text-gray-400">Le système confirme si le document est authentique</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
