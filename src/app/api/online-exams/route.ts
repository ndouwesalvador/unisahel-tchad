import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'

const KNOWN_QUESTION_TYPES = ['QCM', 'Dissertation', 'Vrai-Faux']
const KNOWN_DIFFICULTIES = ['Facile', 'Moyen', 'Difficile']

function computeMention(score: number, maxScore: number): string {
  const ratio = maxScore > 0 ? score / maxScore : 0
  if (ratio >= 0.9) return 'Excellent'
  if (ratio >= 0.7) return 'Tres Bien'
  if (ratio >= 0.6) return 'Bien'
  if (ratio >= 0.5) return 'Assez Bien'
  if (ratio >= 0.45) return 'Passable'
  return 'Insuffisant'
}

// Parses free-text durations like "2h00", "1h30", "45 min" into minutes.
// Falls back to 120 (2h) if the format isn't recognized rather than 0, since
// a 0-minute limit would make the exam instantly unsubmittable.
function parseDurationMinutes(duration: string): number {
  const hourMatch = duration.match(/(\d+)\s*h\s*(\d{0,2})/i)
  if (hourMatch) {
    const hours = parseInt(hourMatch[1], 10)
    const mins = hourMatch[2] ? parseInt(hourMatch[2], 10) : 0
    return hours * 60 + mins
  }
  const minMatch = duration.match(/(\d+)\s*min/i)
  if (minMatch) return parseInt(minMatch[1], 10)
  return 120
}

async function resolveCurrentStudent(userId: string, tenantId: string) {
  return db.student.findFirst({ where: { userId, tenantId }, select: { id: true, firstName: true, lastName: true } })
}

// GET /api/online-exams?scope=me - a logged-in student's own available exams + results
async function handleGetForStudent(user: SessionUser, tenantId: string) {
  try {
    const student = await resolveCurrentStudent(user.id, tenantId)
    if (!student) {
      return NextResponse.json({ error: 'No student profile linked to this account' }, { status: 403 })
    }

    const [exams, myResults] = await Promise.all([
      db.onlineExam.findMany({
        where: { tenantId, status: { in: ['PLANNED', 'IN_PROGRESS'] } },
        orderBy: { examDate: 'asc' },
      }),
      db.examResult.findMany({ where: { tenantId, studentId: student.id } }),
    ])

    const resultByExam = new Map(myResults.map((r) => [r.examId, r]))

    const availableExams = exams.map((e) => {
      const existing = resultByExam.get(e.id)
      return {
        id: e.id,
        name: e.name,
        course: e.course,
        examDate: e.examDate.toISOString(),
        duration: e.duration,
        questionCount: e.questionIds.length,
        type: e.type,
        submitted: Boolean(existing?.submittedAt),
        inProgress: Boolean(existing?.startedAt && !existing?.submittedAt),
        resultId: existing?.id ?? null,
        score: existing?.submittedAt ? existing.score : null,
        maxScore: existing?.maxScore ?? 20,
        status: existing?.status ?? null,
      }
    })

    return NextResponse.json({ exams: availableExams })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Student online exams error:', error)
    return NextResponse.json({ error: 'Failed to fetch exams' }, { status: 500 })
  }
}

// GET /api/online-exams - exams, question bank, results, and proctoring incidents
async function handleGet(_user: SessionUser, tenantId: string, _request: NextRequest) {
  try {
    const where = { tenantId }

    const [exams, planned, inProgress, completed, bankQuestions, resultRows, incidentRows] = await Promise.all([
      db.onlineExam.findMany({
        where,
        orderBy: { examDate: 'desc' },
        take: 50,
      }),
      db.onlineExam.count({ where: { ...where, status: 'PLANNED' } }),
      db.onlineExam.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      db.onlineExam.count({ where: { ...where, status: 'COMPLETED' } }),
      db.examBankQuestion.findMany({ where, orderBy: { createdAt: 'desc' } }),
      db.examResult.findMany({
        where,
        include: { student: { select: { firstName: true, lastName: true, matricule: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      db.examIncident.findMany({
        where,
        include: {
          student: { select: { firstName: true, lastName: true } },
          exam: { select: { name: true } },
        },
        orderBy: { occurredAt: 'desc' },
        take: 100,
      }),
    ])

    const stats = {
      total: planned + inProgress + completed,
      planned,
      inProgress,
      completed,
    }

    const results = resultRows.map((r) => ({
      id: r.id,
      name: r.student ? `${r.student.lastName.toUpperCase()} ${r.student.firstName}` : '—',
      matricule: r.student?.matricule || '—',
      score: r.score,
      maxScore: r.maxScore,
      timeTaken: r.timeTakenMinutes ? `${Math.floor(r.timeTakenMinutes / 60)}h ${r.timeTakenMinutes % 60}min` : '—',
      status: r.status,
      grade: r.score !== null ? computeMention(r.score, r.maxScore) : '—',
    }))

    const incidents = incidentRows.map((i) => ({
      id: i.id,
      studentName: i.student ? `${i.student.lastName.toUpperCase()} ${i.student.firstName}` : '—',
      exam: i.exam?.name || '—',
      type: i.type,
      timestamp: i.occurredAt.toLocaleString('fr-FR'),
      severity: i.severity,
    }))

    return NextResponse.json({ exams, stats, bankQuestions, results, incidents })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Online exams API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch online exams' },
      { status: 500 }
    )
  }
}

// POST /api/online-exams?entity=question - add a question to the reusable bank
async function createBankQuestionHandler(_user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const { text, type, difficulty, points, course, options, correctAnswer } = body

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }
    if (type !== undefined && !KNOWN_QUESTION_TYPES.includes(type)) {
      return NextResponse.json({ error: `type must be one of: ${KNOWN_QUESTION_TYPES.join(', ')}` }, { status: 400 })
    }
    if (difficulty !== undefined && !KNOWN_DIFFICULTIES.includes(difficulty)) {
      return NextResponse.json({ error: `difficulty must be one of: ${KNOWN_DIFFICULTIES.join(', ')}` }, { status: 400 })
    }

    const cleanOptions = Array.isArray(options) ? options.map(String).filter((o) => o.trim()) : []
    // Only QCM/Vrai-Faux can be auto-graded - Dissertation is stored without
    // options/correctAnswer and always requires manual correction.
    const isAutoGradable = type === 'QCM' || type === 'Vrai-Faux'
    if (isAutoGradable && cleanOptions.length >= 2 &&
        typeof correctAnswer === 'number' && (correctAnswer < 0 || correctAnswer >= cleanOptions.length)) {
      return NextResponse.json({ error: 'correctAnswer must be a valid index into options' }, { status: 400 })
    }

    const question = await db.examBankQuestion.create({
      data: {
        tenantId,
        text: text.trim(),
        type: type ?? undefined,
        difficulty: difficulty ?? undefined,
        points: typeof points === 'number' && points > 0 ? Math.floor(points) : 1,
        course: course ? String(course).trim() : null,
        options: isAutoGradable ? cleanOptions : [],
        correctAnswer: isAutoGradable && typeof correctAnswer === 'number' ? correctAnswer : null,
      },
    })

    return NextResponse.json({ question }, { status: 201 })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Create bank question error:', error)
    return NextResponse.json({ error: 'Failed to create question' }, { status: 500 })
  }
}

// POST /api/online-exams - Create a new online exam
async function handlePost(_user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const { name, course, examDate, duration, type, questionIds } = body
    const questions = Array.isArray(questionIds) ? questionIds.length : body.questions

    if (!name || !course || !duration || !questions || !type) {
      return NextResponse.json(
        { error: 'name, course, duration, questions, and type are required fields' },
        { status: 400 }
      )
    }

    const validTypes = ['QCM', 'DISSERTATION', 'MIXTE']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    if (typeof questions !== 'number' || questions < 1) {
      return NextResponse.json(
        { error: 'questions must be a positive number' },
        { status: 400 }
      )
    }

    let validQuestionIds: string[] = []
    if (Array.isArray(questionIds) && questionIds.length > 0) {
      const owned = await db.examBankQuestion.findMany({
        where: { tenantId, id: { in: questionIds.map(String) } },
        select: { id: true },
      })
      const ownedIds = new Set(owned.map((q) => q.id))
      validQuestionIds = questionIds.map(String).filter((id) => ownedIds.has(id))
    }

    const exam = await db.onlineExam.create({
      data: {
        tenantId,
        name,
        course,
        examDate: examDate ? new Date(examDate) : new Date(),
        duration,
        questions,
        questionIds: validQuestionIds,
        type,
      },
    })

    return NextResponse.json({ exam }, { status: 201 })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Create online exam error:', error)
    return NextResponse.json(
      { error: 'Failed to create online exam' },
      { status: 500 }
    )
  }
}

// POST /api/online-exams?entity=start-session - a student starts (or resumes) an exam
async function startSessionHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const student = await resolveCurrentStudent(user.id, tenantId)
    if (!student) {
      return NextResponse.json({ error: 'No student profile linked to this account' }, { status: 403 })
    }

    const body = await request.json()
    const { examId } = body
    if (!examId) {
      return NextResponse.json({ error: 'examId is required' }, { status: 400 })
    }

    const exam = await db.onlineExam.findFirst({ where: { id: examId, tenantId } })
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 })
    }
    if (exam.questionIds.length === 0) {
      return NextResponse.json({ error: 'This exam has no questions configured yet' }, { status: 409 })
    }

    let result = await db.examResult.findFirst({ where: { tenantId, examId, studentId: student.id } })
    if (result?.submittedAt) {
      return NextResponse.json({ error: 'This exam has already been submitted' }, { status: 409 })
    }
    if (!result) {
      result = await db.examResult.create({
        data: { tenantId, examId, studentId: student.id, startedAt: new Date(), maxScore: 20 },
      })
    }

    const questions = await db.examBankQuestion.findMany({ where: { id: { in: exam.questionIds }, tenantId } })
    const byId = new Map(questions.map((q) => [q.id, q]))
    // Preserve the exam's configured question order, strip correctAnswer so
    // the answer key never reaches the client during an active session.
    const orderedQuestions = exam.questionIds
      .map((id) => byId.get(id))
      .filter((q): q is NonNullable<typeof q> => Boolean(q))
      .map((q) => ({ id: q.id, text: q.text, type: q.type, points: q.points, options: q.options }))

    return NextResponse.json({
      resultId: result.id,
      startedAt: result.startedAt,
      durationMinutes: parseDurationMinutes(exam.duration),
      exam: { id: exam.id, name: exam.name, course: exam.course, duration: exam.duration },
      questions: orderedQuestions,
      answers: (result.answers as Record<string, number>) ?? {},
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Start exam session error:', error)
    return NextResponse.json({ error: 'Failed to start exam session' }, { status: 500 })
  }
}

// PUT /api/online-exams?entity=answer&id=<resultId> - autosave one answer
async function answerHandler(user: SessionUser, tenantId: string, request: NextRequest, resultId: string) {
  try {
    const student = await resolveCurrentStudent(user.id, tenantId)
    if (!student) {
      return NextResponse.json({ error: 'No student profile linked to this account' }, { status: 403 })
    }

    const result = await db.examResult.findFirst({ where: { id: resultId, tenantId, studentId: student.id } })
    if (!result) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    if (result.submittedAt) {
      return NextResponse.json({ error: 'This exam has already been submitted' }, { status: 409 })
    }

    const body = await request.json()
    const { questionId, optionIndex } = body
    if (!questionId || typeof optionIndex !== 'number') {
      return NextResponse.json({ error: 'questionId and optionIndex are required' }, { status: 400 })
    }

    const currentAnswers = (result.answers as Record<string, number>) ?? {}
    const updated = { ...currentAnswers, [questionId]: optionIndex }

    await db.examResult.update({ where: { id: resultId }, data: { answers: updated } })

    return NextResponse.json({ ok: true })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Save exam answer error:', error)
    return NextResponse.json({ error: 'Failed to save answer' }, { status: 500 })
  }
}

// POST /api/online-exams?entity=submit-session - final submission + auto-grading
async function submitSessionHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const student = await resolveCurrentStudent(user.id, tenantId)
    if (!student) {
      return NextResponse.json({ error: 'No student profile linked to this account' }, { status: 403 })
    }

    const body = await request.json()
    const { resultId } = body
    if (!resultId) {
      return NextResponse.json({ error: 'resultId is required' }, { status: 400 })
    }

    const result = await db.examResult.findFirst({
      where: { id: resultId, tenantId, studentId: student.id },
      include: { exam: true },
    })
    if (!result) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    if (result.submittedAt) {
      return NextResponse.json({ error: 'This exam has already been submitted' }, { status: 409 })
    }

    const questions = await db.examBankQuestion.findMany({ where: { id: { in: result.exam.questionIds }, tenantId } })
    const answers = (result.answers as Record<string, number>) ?? {}

    let earnedPoints = 0
    let autoGradablePoints = 0
    let hasUngradable = false

    for (const q of questions) {
      if (q.correctAnswer === null || q.correctAnswer === undefined) {
        hasUngradable = true
        continue
      }
      autoGradablePoints += q.points
      if (answers[q.id] === q.correctAnswer) {
        earnedPoints += q.points
      }
    }

    const score = autoGradablePoints > 0 ? Math.round((earnedPoints / autoGradablePoints) * 20 * 100) / 100 : null
    const startedAt = result.startedAt ?? new Date()
    const timeTakenMinutes = Math.max(1, Math.round((Date.now() - startedAt.getTime()) / 60000))

    const settings = await db.tenantSettings.findUnique({ where: { tenantId }, select: { passingGrade: true } })
    const passingGrade = settings?.passingGrade ?? 10

    const status = hasUngradable
      ? 'EN_CORRECTION'
      : score !== null && score >= passingGrade
        ? 'REUSSI'
        : 'ECHOUE'

    const updated = await db.examResult.update({
      where: { id: resultId },
      data: { submittedAt: new Date(), score, timeTakenMinutes, status },
    })

    return NextResponse.json({ result: updated })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Submit exam session error:', error)
    return NextResponse.json({ error: 'Failed to submit exam' }, { status: 500 })
  }
}

const INCIDENT_TYPES = ['Changement onglet', 'Tentative copie', 'Anomalie temps', 'IP differente', 'Fenetre perdue']

// POST /api/online-exams?entity=incident - real proctoring event reported by the client during a live session
async function createIncidentHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const student = await resolveCurrentStudent(user.id, tenantId)
    if (!student) {
      return NextResponse.json({ error: 'No student profile linked to this account' }, { status: 403 })
    }

    const body = await request.json()
    const { examId, type } = body
    if (!examId || !type || !INCIDENT_TYPES.includes(type)) {
      return NextResponse.json({ error: `type must be one of: ${INCIDENT_TYPES.join(', ')}` }, { status: 400 })
    }

    const severity = type === 'Tentative copie' || type === 'IP differente' ? 'Critique'
      : type === 'Changement onglet' || type === 'Anomalie temps' ? 'Elevee'
      : 'Moyenne'

    const incident = await db.examIncident.create({
      data: { tenantId, examId, studentId: student.id, type, severity },
    })

    return NextResponse.json({ incident }, { status: 201 })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Create exam incident error:', error)
    return NextResponse.json({ error: 'Failed to record incident' }, { status: 500 })
  }
}

export const GET = withTenantAuth(async (user: SessionUser, tenantId: string, request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('scope') === 'me') {
    return handleGetForStudent(user, tenantId)
  }
  return handleGet(user, tenantId, request)
})

export const POST = withTenantAuth(async (user: SessionUser, tenantId: string, request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const entity = searchParams.get('entity')
  if (entity === 'question') {
    return createBankQuestionHandler(user, tenantId, request)
  }
  if (entity === 'start-session') {
    return startSessionHandler(user, tenantId, request)
  }
  if (entity === 'submit-session') {
    return submitSessionHandler(user, tenantId, request)
  }
  if (entity === 'incident') {
    return createIncidentHandler(user, tenantId, request)
  }
  return handlePost(user, tenantId, request)
})

export const PUT = withTenantAuth(async (user: SessionUser, tenantId: string, request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (searchParams.get('entity') === 'answer' && id) {
    return answerHandler(user, tenantId, request, id)
  }
  return NextResponse.json({ error: 'Unsupported operation' }, { status: 400 })
})
