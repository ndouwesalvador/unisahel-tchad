'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useMyExams } from '@/lib/api-hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Monitor, Clock, CheckCircle2, ChevronLeft, ChevronRight, Send, AlertTriangle } from 'lucide-react'

interface AvailableExam {
  id: string
  name: string
  course: string
  examDate: string
  duration: string
  questionCount: number
  type: string
  submitted: boolean
  inProgress: boolean
  resultId: string | null
  score: number | null
  maxScore: number
  status: string | null
}

interface SessionQuestion {
  id: string
  text: string
  type: string
  points: number
  options: string[]
}

interface ActiveSession {
  resultId: string
  startedAt: string
  durationMinutes: number
  exam: { id: string; name: string; course: string; duration: string }
  questions: SessionQuestion[]
  answers: Record<string, number>
}

// Real proctoring: reports actual tab-switch / window-focus-loss events during
// a live session, unlike the admin preview panel's fixed demo incidents.
function useProctoring(examId: string | null, active: boolean) {
  useEffect(() => {
    if (!active || !examId) return

    const report = (type: string) => {
      fetch('/api/online-exams?entity=incident', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId, type }),
      }).catch(() => {})
    }

    const onVisibility = () => {
      if (document.hidden) report('Changement onglet')
    }
    const onBlur = () => report('Fenetre perdue')

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', onBlur)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', onBlur)
    }
  }, [examId, active])
}

export function StudentExamPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useMyExams()
  const exams: AvailableExam[] = data?.exams || []

  const [session, setSession] = useState<ActiveSession | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const submittedRef = useRef(false)

  useProctoring(session?.exam.id ?? null, Boolean(session))

  const startExam = async (examId: string) => {
    try {
      const res = await fetch('/api/online-exams?entity=start-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Impossible de demarrer l'examen")
      submittedRef.current = false
      setSession(json)
      setAnswers(json.answers || {})
      setCurrentIndex(0)
      const elapsedMs = Date.now() - new Date(json.startedAt).getTime()
      const remaining = Math.max(0, json.durationMinutes * 60 - Math.floor(elapsedMs / 1000))
      setRemainingSeconds(remaining)
    } catch (e) {
      toast.error('Erreur', { description: e instanceof Error ? e.message : "Impossible de demarrer l'examen" })
    }
  }

  const submitExam = useCallback(async () => {
    if (!session || submittedRef.current) return
    submittedRef.current = true
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/online-exams?entity=submit-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultId: session.resultId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Echec de la soumission')
      toast.success('Examen soumis avec succes')
      queryClient.invalidateQueries({ queryKey: ['myExams'] })
      setSession(null)
      setShowConfirm(false)
    } catch (e) {
      submittedRef.current = false
      toast.error('Erreur', { description: e instanceof Error ? e.message : 'Echec de la soumission' })
    } finally {
      setIsSubmitting(false)
    }
  }, [session, queryClient])

  useEffect(() => {
    if (!session || remainingSeconds <= 0) return
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          submitExam()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [session, remainingSeconds, submitExam])

  const selectAnswer = async (questionId: string, optionIndex: number) => {
    if (!session) return
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }))
    try {
      await fetch(`/api/online-exams?entity=answer&id=${session.resultId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, optionIndex }),
      })
    } catch {
      toast.error('Reponse non enregistree - verifiez votre connexion')
    }
  }

  const hours = Math.floor(remainingSeconds / 3600)
  const minutes = Math.floor((remainingSeconds % 3600) / 60)
  const seconds = remainingSeconds % 60
  const timerDisplay = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  // ─── Active session view ────────────────────────────────────────────────
  if (session) {
    const question = session.questions[currentIndex]
    const answeredCount = Object.keys(answers).length

    return (
      <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
        <Card className="border-l-4 border-l-[#2d7a4f]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-[#1a2744]">{session.exam.name}</CardTitle>
                <p className="text-xs text-gray-400 mt-0.5">{session.exam.course}</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1a274410] border border-[#1a274420]">
                <Clock className="size-4 text-[#1a2744]" />
                <span className={`text-sm font-bold font-mono ${remainingSeconds < 300 ? 'text-[#c62828]' : 'text-[#1a2744]'}`}>{timerDisplay}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">Progression</span>
                <span className="text-xs font-semibold text-[#2d7a4f]">{answeredCount}/{session.questions.length} repondues</span>
              </div>
              <Progress value={(answeredCount / session.questions.length) * 100} className="h-2" />
            </div>

            {question ? (
              <div className="p-4 rounded-lg border border-gray-200 bg-white">
                <span className="text-xs font-semibold text-[#1a2744] bg-[#1a274410] px-2 py-1 rounded">
                  Question {currentIndex + 1} / {session.questions.length}
                </span>
                <p className="text-sm text-[#1a2744] font-medium my-4 leading-relaxed">{question.text}</p>
                {question.options.length > 0 ? (
                  <div className="space-y-2">
                    {question.options.map((option, idx) => (
                      <label
                        key={idx}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          answers[question.id] === idx ? 'border-[#2d7a4f] bg-[#2d7a4f08]' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${question.id}`}
                          checked={answers[question.id] === idx}
                          onChange={() => selectAnswer(question.id, idx)}
                          className="accent-[#2d7a4f]"
                        />
                        <span className="text-sm text-gray-700">{option}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">
                    Question a reponse libre - sera corrigee manuellement par un enseignant.
                  </p>
                )}
              </div>
            ) : null}

            <div className="flex items-center justify-between mt-4">
              <Button size="sm" variant="outline" onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))} disabled={currentIndex === 0}>
                <ChevronLeft className="size-3.5 mr-1" /> Precedente
              </Button>
              {currentIndex < session.questions.length - 1 ? (
                <Button size="sm" className="bg-[#1a2744] hover:bg-[#1a2744]/90 text-white" onClick={() => setCurrentIndex((p) => Math.min(session.questions.length - 1, p + 1))}>
                  Suivante <ChevronRight className="size-3.5 ml-1" />
                </Button>
              ) : (
                <Button size="sm" className="bg-[#2d7a4f] hover:bg-[#236b40] text-white" onClick={() => setShowConfirm(true)}>
                  <Send className="size-3.5 mr-1.5" /> Soumettre l&apos;examen
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {showConfirm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowConfirm(false)}>
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-[#d4a85315] flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle className="size-7 text-[#d4a853]" />
                </div>
                <h3 className="text-lg font-bold text-[#1a2744] mb-2">Confirmer la soumission</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Vous avez repondu a {answeredCount} question(s) sur {session.questions.length}.
                  {answeredCount < session.questions.length && (
                    <span className="text-[#c62828] font-medium"> {session.questions.length - answeredCount} question(s) sans reponse.</span>
                  )}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 text-xs" onClick={() => setShowConfirm(false)}>Continuer l&apos;examen</Button>
                  <Button className="flex-1 text-xs bg-[#2d7a4f] hover:bg-[#236b40] text-white" onClick={submitExam} disabled={isSubmitting}>
                    {isSubmitting ? 'Envoi...' : 'Confirmer'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── Exam list view ─────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-[#1a2744] flex items-center gap-2">
          <Monitor className="size-6" /> Mes examens en ligne
        </h1>
        <p className="text-sm text-gray-500 mt-1">Consultez et passez vos examens programmes</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400">Chargement...</p>
      ) : exams.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-gray-400">Aucun examen programme pour le moment.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exams.map((exam) => (
            <Card key={exam.id} className="border-l-4 border-l-[#1a2744]">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm font-semibold text-[#1a2744]">{exam.name}</p>
                    <p className="text-xs text-gray-400">{exam.course}</p>
                  </div>
                  {exam.submitted ? (
                    <Badge className="text-[10px] bg-[#2d7a4f15] text-[#2d7a4f] border-0">
                      <CheckCircle2 className="size-3 mr-1" /> Termine
                    </Badge>
                  ) : exam.inProgress ? (
                    <Badge className="text-[10px] bg-[#d4a85315] text-[#d4a853] border-0">En cours</Badge>
                  ) : (
                    <Badge className="text-[10px] bg-[#1a274410] text-[#1a2744] border-0">A passer</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                  <span>{new Date(exam.examDate).toLocaleDateString('fr-FR')}</span>
                  <span>{exam.duration}</span>
                  <span>{exam.questionCount} question(s)</span>
                </div>
                {exam.submitted ? (
                  <p className="text-xs font-semibold text-[#1a2744]">
                    {exam.score !== null ? `Note: ${exam.score}/${exam.maxScore}` : 'En cours de correction'}
                  </p>
                ) : (
                  <Button
                    size="sm"
                    className="w-full text-xs bg-[#2d7a4f] hover:bg-[#236b40] text-white"
                    onClick={() => startExam(exam.id)}
                    disabled={exam.questionCount === 0}
                  >
                    {exam.inProgress ? 'Reprendre' : 'Commencer'}
                  </Button>
                )}
                {exam.questionCount === 0 && !exam.submitted && (
                  <p className="text-[10px] text-gray-400 text-center mt-1">Questions pas encore configurees</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
