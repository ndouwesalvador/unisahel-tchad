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
    const { text, type, difficulty, points, course } = body

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }
    if (type !== undefined && !KNOWN_QUESTION_TYPES.includes(type)) {
      return NextResponse.json({ error: `type must be one of: ${KNOWN_QUESTION_TYPES.join(', ')}` }, { status: 400 })
    }
    if (difficulty !== undefined && !KNOWN_DIFFICULTIES.includes(difficulty)) {
      return NextResponse.json({ error: `difficulty must be one of: ${KNOWN_DIFFICULTIES.join(', ')}` }, { status: 400 })
    }

    const question = await db.examBankQuestion.create({
      data: {
        tenantId,
        text: text.trim(),
        type: type ?? undefined,
        difficulty: difficulty ?? undefined,
        points: typeof points === 'number' && points > 0 ? Math.floor(points) : 1,
        course: course ? String(course).trim() : null,
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
    const { name, course, examDate, duration, questions, type } = body

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

    const exam = await db.onlineExam.create({
      data: {
        tenantId,
        name,
        course,
        examDate: examDate ? new Date(examDate) : new Date(),
        duration,
        questions,
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

export const GET = withTenantAuth(handleGet)

export const POST = withTenantAuth(async (user: SessionUser, tenantId: string, request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('entity') === 'question') {
    return createBankQuestionHandler(user, tenantId, request)
  }
  return handlePost(user, tenantId, request)
})
