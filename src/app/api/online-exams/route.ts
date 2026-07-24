import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'

// GET /api/online-exams - List online exams with stats
async function handleGet(_user: SessionUser, tenantId: string, _request: NextRequest) {
  try {
    const where = { tenantId }

    const [exams, planned, inProgress, completed] = await Promise.all([
      db.onlineExam.findMany({
        where,
        orderBy: { examDate: 'desc' },
        take: 50,
      }),
      db.onlineExam.count({ where: { ...where, status: 'PLANNED' } }),
      db.onlineExam.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      db.onlineExam.count({ where: { ...where, status: 'COMPLETED' } }),
    ])

    const stats = {
      total: planned + inProgress + completed,
      planned,
      inProgress,
      completed,
    }

    return NextResponse.json({ exams, stats })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Online exams API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch online exams' },
      { status: 500 }
    )
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
export const POST = withTenantAuth(handlePost)
