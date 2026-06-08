'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Bot,
  Send,
  X,
  ChevronDown,
  Minus,
  Sparkles,
  Paperclip,
} from 'lucide-react'

// ─── Simulated AI Responses ────────────────────────────────────────────────

const AI_RESPONSES: Record<string, string> = {
  inscript: `Pour inscrire un nouvel étudiant, voici les étapes à suivre :\n\n1. Allez dans la section **Étudiants**\n2. Cliquez sur le bouton **"Nouvelle inscription"**\n3. Remplissez le formulaire avec les informations personnelles de l'étudiant\n4. Sélectionnez le programme d'études (filière et niveau LMD)\n5. Téléchargez les documents requis (acte de naissance, diplômes, photos)\n6. Validez l'inscription\n\nL'étudiant recevra automatiquement son matricule par email. Souhaitez-vous que je vous guide pas à pas ?`,

  note: `Pour la saisie des notes :\n\n1. Allez dans **Notes** depuis le menu\n2. Sélectionnez l'UE concernée et le semestre\n3. Choisissez le type d'évaluation (devoir, examen, TP)\n4. Saisissez les notes pour chaque étudiant\n5. Le système calcule automatiquement les moyennes\n\nVous pouvez aussi importer les notes depuis un fichier Excel. Voulez-vous en savoir plus sur l'import ?`,

  releve: `Pour générer un relevé de notes :\n\n1. Allez dans **Documents**\n2. Sélectionnez **"Relevé de notes"**\n3. Choisissez l'étudiant et le semestre\n4. Le relevé est généré automatiquement avec toutes les UE validées\n\nLes relevés sont sécurisés avec un QR code de vérification. Vous pouvez aussi générer des relevés en lot pour toute une promotion.`,

  document: `Je peux vous aider avec la génération de documents :\n\n• **Relevés de notes** - Par étudiant ou par promotion\n• **Attestations d'inscription** - Avec QR code de vérification\n• **Certificats de scolarité** - Automatiques\n• **Diplômes** - Après délibération\n• **Cartes d'étudiant** - Avec photo\n\nAllez dans la section **Documents** pour accéder à tous ces modèles. Quel document souhaitez-vous générer ?`,

  paiement: `Concernant les paiements :\n\n1. Allez dans **Paiements** pour voir l'état des frais\n2. Vous pouvez filtrer par statut : payé, partiel, en retard\n3. Pour enregistrer un paiement, cliquez sur **"Nouveau paiement"**\n4. Sélectionnez l'étudiant et le type de frais (inscription, scolarité, etc.)\n5. Un reçu est généré automatiquement\n\nPour voir les paiements en retard, utilisez le filtre **"En retard"**. Voulez-vous que je vous montre les étudiants en retard de paiement ?`,

  jury: `Pour planifier un jury de délibération :\n\n1. Allez dans **Délibérations**\n2. Cliquez sur **"Nouvelle session"**\n3. Sélectionnez le programme, le semestre et la session (normale ou rattrapage)\n4. Ajoutez les membres du jury\n5. Définissez la date et l'heure\n\nPendant la délibération, le système affiche automatiquement les moyennes et propose les décisions (Admis, Ajourné, Compensé). Les PV sont générés automatiquement à la fin.`,

  deliber: `Pour organiser une délibération :\n\n1. Allez dans **Délibérations**\n2. Créez une nouvelle session de jury\n3. Le système prépare automatiquement les dossiers des étudiants\n4. Les moyennes sont calculées selon le système LMD\n5. Les décisions possibles sont : Admis, Ajourné, Compensé, Exclu\n\nLes procès-verbaux sont générés automatiquement et signables numériquement.`,
}

const DEFAULT_RESPONSE = `Je peux vous aider avec plusieurs fonctionnalités d'UniSahel :\n\n• **Inscription** des étudiants\n• **Saisie des notes** et calcul des moyennes\n• **Délibérations** et jurys\n• **Génération de documents** (relevés, attestations)\n• **Gestion des paiements** et reçus\n• **Système LMD** (Licence-Master-Doctorat)\n\nN'hésitez pas à me poser une question plus précise !`

function getAIResponse(message: string): string {
  const lower = message.toLowerCase()
  for (const [keyword, response] of Object.entries(AI_RESPONSES)) {
    if (lower.includes(keyword)) {
      return response
    }
  }
  if (lower.includes('lmd')) {
    return AI_RESPONSES['deliber']
  }
  if (lower.includes('aide') || lower.includes('help')) {
    return DEFAULT_RESPONSE
  }
  return `Merci pour votre question. ${DEFAULT_RESPONSE}`
}

// ─── Quick Action Chips ────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: 'Inscrire un étudiant', keyword: 'inscrire un étudiant' },
  { label: 'Saisir les notes', keyword: 'saisir les notes' },
  { label: 'Générer un relevé', keyword: 'générer un relevé de notes' },
  { label: 'Voir les paiements en retard', keyword: 'paiements en retard' },
  { label: 'Planifier un jury', keyword: 'planifier un jury de délibération' },
]

// ─── Typing Indicator ──────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5 px-4 py-2">
      <Avatar className="size-7 shrink-0">
        <AvatarFallback className="bg-gradient-to-br from-[#1a2744] to-[#2d7a4f] text-white text-[10px]">
          <Bot className="size-3.5" />
        </AvatarFallback>
      </Avatar>
      <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          <motion.span
            className="size-2 rounded-full bg-[#2d7a4f]"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
          />
          <motion.span
            className="size-2 rounded-full bg-[#2d7a4f]"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
          />
          <motion.span
            className="size-2 rounded-full bg-[#2d7a4f]"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Message Renderer ──────────────────────────────────────────────────────

function ChatMessage({
  message,
  onQuickAction,
}: {
  message: { id: string; role: 'user' | 'assistant'; content: string; timestamp: Date }
  onQuickAction: (keyword: string) => void
}) {
  const isWelcome = message.id === 'welcome'
  const timeStr = message.timestamp.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  if (message.role === 'user') {
    return (
      <div className="flex justify-end px-4 py-1.5">
        <div className="max-w-[80%]">
          <div className="bg-[#1a2744] text-white rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
          </div>
          <p className="text-[10px] text-gray-400 mt-1 text-right">{timeStr}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2.5 px-4 py-1.5">
      <Avatar className="size-7 shrink-0 mt-0.5">
        <AvatarFallback className="bg-gradient-to-br from-[#1a2744] to-[#2d7a4f] text-white text-[10px]">
          <Bot className="size-3.5" />
        </AvatarFallback>
      </Avatar>
      <div className="max-w-[80%]">
        <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
        <p className="text-[10px] text-gray-400 mt-1">{timeStr}</p>
        {isWelcome && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={() => onQuickAction(action.keyword)}
                className="text-xs px-3 py-1.5 rounded-full border border-[#2d7a4f30] text-[#2d7a4f] bg-[#2d7a4f08] hover:bg-[#2d7a4f15] hover:border-[#2d7a4f50] transition-colors font-medium"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Widget Component ─────────────────────────────────────────────────

export function AIAssistantWidget() {
  const { chatOpen, toggleChat, chatMessages, addChatMessage } = useAppStore()
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages, isTyping, scrollToBottom])

  useEffect(() => {
    if (chatOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [chatOpen])

  const simulateAIResponse = useCallback(
    (userMessage: string) => {
      setIsTyping(true)
      const delay = 1000 + Math.random() * 1000
      setTimeout(() => {
        const response = getAIResponse(userMessage)
        addChatMessage({ role: 'assistant', content: response })
        setIsTyping(false)
      }, delay)
    },
    [addChatMessage]
  )

  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim()
    if (!trimmed || isTyping) return

    addChatMessage({ role: 'user', content: trimmed })
    setInputValue('')
    simulateAIResponse(trimmed)
  }, [inputValue, isTyping, addChatMessage, simulateAIResponse])

  const handleQuickAction = useCallback(
    (keyword: string) => {
      addChatMessage({ role: 'user', content: keyword })
      simulateAIResponse(keyword)
    },
    [addChatMessage, simulateAIResponse]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  return (
    <div>
      {/* Floating Trigger Button */}
      <AnimatePresence>
        {!chatOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            onClick={toggleChat}
            className="fixed bottom-6 right-6 z-50 size-14 rounded-full bg-gradient-to-br from-[#1a2744] to-[#2d7a4f] shadow-lg hover:shadow-xl flex items-center justify-center group"
            aria-label="Ouvrir l'assistant IA"
          >
            <Sparkles className="size-6 text-white group-hover:scale-110 transition-transform" />
            {/* Pulse ring */}
            <motion.span
              className="absolute inset-0 rounded-full bg-gradient-to-br from-[#1a2744] to-[#2d7a4f]"
              animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
            />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{
              opacity: 1,
              y: isMinimized ? 0 : 0,
              scale: 1,
              height: isMinimized ? 'auto' : 'auto',
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] rounded-2xl shadow-2xl overflow-hidden border border-gray-200 bg-white flex flex-col"
            style={{ maxHeight: isMinimized ? 'auto' : '520px' }}
          >
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-[#1a2744] to-[#2d7a4f] px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <Bot className="size-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white leading-tight">Assistant UniSahel</h3>
                  <p className="text-[10px] text-white/60 font-medium">Powered by IA</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  aria-label={isMinimized ? 'Agrandir' : 'Réduire'}
                >
                  {isMinimized ? (
                    <ChevronDown className="size-4 text-white/80 rotate-180" />
                  ) : (
                    <Minus className="size-4 text-white/80" />
                  )}
                </button>
                <button
                  onClick={toggleChat}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  aria-label="Fermer"
                >
                  <X className="size-4 text-white/80" />
                </button>
              </div>
            </div>

            {/* Chat Body - hidden when minimized */}
            {!isMinimized && (
              <div className="flex flex-col flex-1 overflow-hidden" style={{ maxHeight: '460px' }}>
                {/* Messages Area */}
                <ScrollArea className="flex-1 py-3" ref={scrollRef}>
                  <div className="space-y-1">
                    {chatMessages.map((msg) => (
                      <ChatMessage
                        key={msg.id}
                        message={msg}
                        onQuickAction={handleQuickAction}
                      />
                    ))}
                    {isTyping && <TypingIndicator />}
                  </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="border-t border-gray-100 p-3 bg-gray-50/50 shrink-0">
                  <div className="flex items-center gap-2">
                    <button
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                      aria-label="Joindre un fichier"
                    >
                      <Paperclip className="size-4" />
                    </button>
                    <Input
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Posez votre question..."
                      className="flex-1 h-9 text-sm border-gray-200 focus:border-[#2d7a4f] focus:ring-[#2d7a4f20]"
                      disabled={isTyping}
                    />
                    <Button
                      onClick={handleSend}
                      disabled={!inputValue.trim() || isTyping}
                      size="sm"
                      className="size-9 p-0 bg-gradient-to-r from-[#1a2744] to-[#2d7a4f] hover:from-[#1e2f52] hover:to-[#348c5a] text-white rounded-lg shrink-0"
                      aria-label="Envoyer"
                    >
                      <Send className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
