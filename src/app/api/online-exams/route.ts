import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { getTeacherScope } from '@/lib/auth/teacher-scope'

const KNOWN_QUESTION_TYPES = ['QCM', 'Dissertation', 'Vrai-Faux']
const KNOWN_DIFFICULTIES = ['Facile', 'Moyen', 'Difficile']
const EXAM_MANAGEMENT_ROLES = ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'RECTORAT', 'SCOLARITE', 'FACULTE', 'DEPARTEMENT', 'RESPONSABLE_FILIERE', 'ENSEIGNANT']

function computeMention(score: number, maxScore: number): string {
  const ratio = maxScore > 0 ? score / maxScore : 0
  if (ratio >= 0.9) return 'Excellent'
  if (ratio >= 0.7) return 'Très Bien'
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
      return NextResponse.json({ error: 'Aucun profil étudiant n’est lié à ce compte' }, { status: 403 })
    }

    const registrations = await db.pedagogicalRegistration.findMany({
      where: { studentId: student.id, status: 'ACTIVE', teachingUnit: { semester: { level: { program: { tenantId } } } } },
      select: { teachingUnitId: true },
    })
    const eligibleElements = registrations.length ? await db.courseElement.findMany({
      where: { teachingUnitId: { in: registrations.map((registration) => registration.teachingUnitId) } },
      select: { id: true },
    }) : []
    const myResults = await db.examResult.findMany({ where: { tenantId, studentId: student.id } })
    const submittedOrStartedExamIds = myResults.map((result) => result.examId)
    const exams = await db.onlineExam.findMany({
      where: {
        tenantId,
        AND: [
          { OR: [{ status: 'IN_PROGRESS' }, { id: { in: submittedOrStartedExamIds } }] },
          { OR: [
            { courseElementId: { in: eligibleElements.map((element) => element.id) } },
            { id: { in: submittedOrStartedExamIds } },
          ] },
        ],
      },
      orderBy: { examDate: 'asc' },
      take: 100,
    })

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
    return NextResponse.json({ error: 'Impossible de charger les examens' }, { status: 500 })
  }
}

// GET /api/online-exams - exams, question bank, results, and proctoring incidents
async function handleGet(user: SessionUser, tenantId: string, _request: NextRequest) {
  try {
    const scope = user.role === 'ENSEIGNANT' ? await getTeacherScope(user, tenantId) : null
    const where = { tenantId, ...(scope ? { courseElementId: { in: scope.courseElementIds }, teacherId: scope.teacherId ?? '' } : {}) }
    const resultWhere = { tenantId, ...(scope ? { exam: { courseElementId: { in: scope.courseElementIds }, teacherId: scope.teacherId ?? '' } } : {}) }

    const [exams, planned, inProgress, completed, bankQuestions, resultRows, incidentRows, courses] = await Promise.all([
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
        where: resultWhere,
        include: { student: { select: { firstName: true, lastName: true, matricule: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      db.examIncident.findMany({
        where: resultWhere,
        include: {
          student: { select: { firstName: true, lastName: true } },
          exam: { select: { name: true } },
        },
        orderBy: { occurredAt: 'desc' },
        take: 100,
      }),
      db.courseElement.findMany({
        where: {
          ...(scope ? { id: { in: scope.courseElementIds } } : {}),
          teachingUnit: { semester: { level: { program: { tenantId, isActive: true } } } },
        },
        select: {
          id: true,
          code: true,
          name: true,
          teachingUnit: {
            select: {
              name: true,
              semester: { select: { name: true, level: { select: { name: true, program: { select: { name: true } } } } } },
            },
          },
        },
        orderBy: { name: 'asc' },
        take: 500,
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

    return NextResponse.json({ exams, stats, bankQuestions, results, incidents, courses })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Online exams API error:', error)
    return NextResponse.json(
      { error: 'Impossible de charger les examens en ligne' },
      { status: 500 }
    )
  }
}

// POST /api/online-exams?entity=question - add a question to the reusable bank
async function createBankQuestionHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    if (!EXAM_MANAGEMENT_ROLES.includes(user.role)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    const body = await request.json()
    const { text, type, difficulty, points, course, options, correctAnswer } = body
    const scope = user.role === 'ENSEIGNANT' ? await getTeacherScope(user, tenantId) : null
    const courseElementId = typeof body.courseElementId === 'string' ? body.courseElementId : null
    if (!courseElementId) return NextResponse.json({ error: 'Une matière est requise' }, { status: 400 })
    if (scope && (!scope.linked || !scope.courseElementIds.includes(courseElementId))) {
      return NextResponse.json({ error: 'Matière non attribuée' }, { status: 403 })
    }
    const element = courseElementId ? await db.courseElement.findFirst({ where: { id: courseElementId, teachingUnit: { semester: { level: { program: { tenantId } } } } }, select: { name: true } }) : null
    if (courseElementId && !element) return NextResponse.json({ error: 'Matière introuvable' }, { status: 404 })

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Le texte de la question est requis' }, { status: 400 })
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
    if (isAutoGradable && (cleanOptions.length < 2 || !Number.isInteger(correctAnswer) || correctAnswer < 0 || correctAnswer >= cleanOptions.length)) {
      return NextResponse.json({ error: 'La bonne réponse doit correspondre à une option proposée' }, { status: 400 })
    }

    const question = await db.examBankQuestion.create({
      data: {
        tenantId,
        courseElementId,
        teacherId: scope?.teacherId ?? null,
        text: text.trim(),
        type: type ?? undefined,
        difficulty: difficulty ?? undefined,
        points: typeof points === 'number' && points > 0 ? Math.floor(points) : 1,
        course: element?.name ?? (course ? String(course).trim() : null),
        options: isAutoGradable ? cleanOptions : [],
        correctAnswer: isAutoGradable && typeof correctAnswer === 'number' ? correctAnswer : null,
      },
    })

    return NextResponse.json({ question }, { status: 201 })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Create bank question error:', error)
    return NextResponse.json({ error: 'Impossible de créer la question' }, { status: 500 })
  }
}

// POST /api/online-exams - Create a new online exam
async function handlePost(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    if (!EXAM_MANAGEMENT_ROLES.includes(user.role)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    const body = await request.json()
    const { name, course, examDate, duration, type, questionIds } = body
    const scope = user.role === 'ENSEIGNANT' ? await getTeacherScope(user, tenantId) : null
    const courseElementId = typeof body.courseElementId === 'string' ? body.courseElementId : null
    if (!courseElementId) return NextResponse.json({ error: 'Une matière est requise' }, { status: 400 })
    if (scope && (!scope.linked || !scope.courseElementIds.includes(courseElementId))) {
      return NextResponse.json({ error: 'Matière non attribuée' }, { status: 403 })
    }
    const element = courseElementId ? await db.courseElement.findFirst({ where: { id: courseElementId, teachingUnit: { semester: { level: { program: { tenantId } } } } }, select: { name: true } }) : null
    if (courseElementId && !element) return NextResponse.json({ error: 'Matière introuvable' }, { status: 404 })
    const questions = Array.isArray(questionIds) ? questionIds.length : body.questions

    if (!name || !(element?.name || course) || !duration || !questions || !type) {
      return NextResponse.json(
        { error: 'Le nom, la matière, la durée, les questions et le type sont requis' },
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
        { error: 'Le nombre de questions doit être positif' },
        { status: 400 }
      )
    }

    let validQuestionIds: string[] = []
    if (Array.isArray(questionIds) && questionIds.length > 0) {
      const owned = await db.examBankQuestion.findMany({
        where: { tenantId, id: { in: questionIds.map(String) }, ...(scope ? { courseElementId, teacherId: scope.teacherId } : {}) },
        select: { id: true },
      })
      const ownedIds = new Set(owned.map((q) => q.id))
      validQuestionIds = questionIds.map(String).filter((id) => ownedIds.has(id))
      if (validQuestionIds.length !== questionIds.length) return NextResponse.json({ error: 'Une question ne relève pas de cette matière' }, { status: 403 })
    }

    const exam = await db.onlineExam.create({
      data: {
        tenantId,
        courseElementId,
        teacherId: scope?.teacherId ?? null,
        name,
        course: element?.name ?? course,
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
      { error: 'Impossible de créer l’examen en ligne' },
      { status: 500 }
    )
  }
}

// PUT /api/online-exams?entity=status&id=<examId> - explicit publication lifecycle.
// PLANNED is a draft, IN_PROGRESS is published to eligible students and
// COMPLETED closes the session while keeping submitted results visible.
async function updateExamStatusHandler(user: SessionUser, tenantId: string, request: NextRequest, examId: string) {
  try {
    if (!EXAM_MANAGEMENT_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }
    const body = await request.json().catch(() => null)
    const nextStatus = body?.status
    if (!['PLANNED', 'IN_PROGRESS', 'COMPLETED'].includes(nextStatus)) {
      return NextResponse.json({ error: 'Statut d’examen invalide' }, { status: 400 })
    }

    const scope = user.role === 'ENSEIGNANT' ? await getTeacherScope(user, tenantId) : null
    if (scope && !scope.linked) return NextResponse.json({ error: 'Profil enseignant non lié' }, { status: 403 })

    const exam = await db.onlineExam.findFirst({
      where: {
        id: examId,
        tenantId,
        ...(scope ? { teacherId: scope.teacherId ?? '', courseElementId: { in: scope.courseElementIds } } : {}),
      },
      select: { id: true, status: true, questionIds: true, courseElementId: true },
    })
    if (!exam) return NextResponse.json({ error: 'Examen introuvable ou hors de votre périmètre' }, { status: 404 })

    const allowedTransitions: Record<string, string[]> = {
      PLANNED: ['IN_PROGRESS'],
      IN_PROGRESS: ['PLANNED', 'COMPLETED'],
      COMPLETED: [],
    }
    if (exam.status === nextStatus) return NextResponse.json({ exam })
    if (!allowedTransitions[exam.status]?.includes(nextStatus)) {
      return NextResponse.json({ error: `Transition ${exam.status} → ${nextStatus} interdite` }, { status: 409 })
    }
    if (nextStatus === 'IN_PROGRESS' && (!exam.courseElementId || exam.questionIds.length === 0)) {
      return NextResponse.json({ error: 'Une matière réelle et au moins une question sont requises avant publication' }, { status: 409 })
    }
    if (nextStatus === 'PLANNED') {
      const startedSessions = await db.examResult.count({ where: { tenantId, examId, startedAt: { not: null } } })
      if (startedSessions > 0) {
        return NextResponse.json({ error: 'Impossible de retirer un examen déjà commencé par un étudiant' }, { status: 409 })
      }
    }

    const updated = await db.onlineExam.update({ where: { id: exam.id }, data: { status: nextStatus } })
    return NextResponse.json({ exam: updated })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Update online exam status error:', error)
    return NextResponse.json({ error: 'Impossible de modifier la publication de l’examen' }, { status: 500 })
  }
}

// POST /api/online-exams?entity=start-session - a student starts (or resumes) an exam
async function startSessionHandler(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const student = await resolveCurrentStudent(user.id, tenantId)
    if (!student) {
      return NextResponse.json({ error: 'Aucun profil étudiant n’est lié à ce compte' }, { status: 403 })
    }

    const body = await request.json()
    const { examId } = body
    if (!examId) {
      return NextResponse.json({ error: 'L’identifiant de l’examen est requis' }, { status: 400 })
    }

    const exam = await db.onlineExam.findFirst({ where: { id: examId, tenantId } })
    if (!exam) {
      return NextResponse.json({ error: 'Examen introuvable' }, { status: 404 })
    }
    if (exam.status !== 'IN_PROGRESS') {
      return NextResponse.json({ error: 'Cet examen n’est pas publié ou est déjà clôturé' }, { status: 409 })
    }
    if (exam.examDate.getTime() > Date.now()) {
      return NextResponse.json({ error: 'Cet examen n’est pas encore ouvert' }, { status: 409 })
    }
    if (exam.courseElementId && !await db.pedagogicalRegistration.findFirst({
      where: { studentId: student.id, teachingUnit: { courseElements: { some: { id: exam.courseElementId } } }, status: 'ACTIVE' },
      select: { id: true },
    })) return NextResponse.json({ error: 'Examen hors de votre inscription pédagogique' }, { status: 403 })
    if (exam.questionIds.length === 0) {
      return NextResponse.json({ error: 'Aucune question n’est encore configurée pour cet examen' }, { status: 409 })
    }

    let result = await db.examResult.findFirst({ where: { tenantId, examId, studentId: student.id } })
    if (result?.submittedAt) {
      return NextResponse.json({ error: 'Cet examen a déjà été soumis' }, { status: 409 })
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
    return NextResponse.json({ error: 'Impossible de démarrer la session d’examen' }, { status: 500 })
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
  if (['ETUDIANT', 'ETUDIANT_SANTE'].includes(user.role)) return handleGetForStudent(user, tenantId)
  if (searchParams.get('scope') === 'me') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }
  return handleGet(user, tenantId, request)
})

export const POST = withTenantAuth(async (user: SessionUser, tenantId: string, request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const entity = searchParams.get('entity')
  if (entity === 'question') {
    if (['ETUDIANT', 'ETUDIANT_SANTE'].includes(user.role)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    return createBankQuestionHandler(user, tenantId, request)
  }
  if (entity === 'start-session') {
    if (!['ETUDIANT', 'ETUDIANT_SANTE'].includes(user.role)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    return startSessionHandler(user, tenantId, request)
  }
  if (entity === 'submit-session') {
    if (!['ETUDIANT', 'ETUDIANT_SANTE'].includes(user.role)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    return submitSessionHandler(user, tenantId, request)
  }
  if (entity === 'incident') {
    if (!['ETUDIANT', 'ETUDIANT_SANTE'].includes(user.role)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    return createIncidentHandler(user, tenantId, request)
  }
  if (['ETUDIANT', 'ETUDIANT_SANTE'].includes(user.role)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  return handlePost(user, tenantId, request)
})

export const PUT = withTenantAuth(async (user: SessionUser, tenantId: string, request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (searchParams.get('entity') === 'answer' && id) {
    if (!['ETUDIANT', 'ETUDIANT_SANTE'].includes(user.role)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    return answerHandler(user, tenantId, request, id)
  }
  if (searchParams.get('entity') === 'status' && id) {
    if (['ETUDIANT', 'ETUDIANT_SANTE'].includes(user.role)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    return updateExamStatusHandler(user, tenantId, request, id)
  }
  return NextResponse.json({ error: 'Unsupported operation' }, { status: 400 })
})
