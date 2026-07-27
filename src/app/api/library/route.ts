import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'

const KNOWN_TYPES = ['livre', 'revue', 'these', 'memoire', 'rapport', 'ebook']
const KNOWN_CATEGORIES = ['sciences', 'droit', 'lettres', 'medecine', 'economie']
const FR_MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec']
const DEFAULT_LOAN_DAYS = 14

// GET /api/library - catalog, active loans, rooms, and usage stats
async function handleGet(_user: SessionUser, tenantId: string, _request: NextRequest) {
  try {
    const where = { tenantId }

    const [resources, activeLoans, rooms, allLoans, totalStudents] = await Promise.all([
      db.libraryResource.findMany({
        where,
        include: { _count: { select: { loans: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      db.libraryLoan.findMany({
        where: { ...where, returnedAt: null },
        include: {
          resource: { select: { title: true } },
          student: { select: { firstName: true, lastName: true, matricule: true } },
        },
        orderBy: { dueAt: 'asc' },
      }),
      db.libraryRoom.findMany({ where, orderBy: { createdAt: 'asc' } }),
      // Full loan history, used only to derive the usage stats below (monthly
      // trend, top categories, active borrowers, avg duration, on-time rate).
      // A single scan is fine at this stage (fresh feature, modest volume);
      // revisit with SQL-side aggregation if the table grows large.
      db.libraryLoan.findMany({
        where,
        select: {
          studentId: true,
          borrowedAt: true,
          returnedAt: true,
          dueAt: true,
          resource: { select: { category: true } },
        },
      }),
      db.student.count({ where }),
    ])

    // Soonest due date per resource, among currently active loans - used to
    // surface "Retour prevu" on catalog rows that are fully checked out.
    const nextDueByResource = new Map<string, Date>()
    for (const loan of activeLoans) {
      const current = nextDueByResource.get(loan.resourceId)
      if (!current || loan.dueAt < current) {
        nextDueByResource.set(loan.resourceId, loan.dueAt)
      }
    }

    const catalog = resources.map((r) => {
      let status: 'disponible' | 'emprunte' | 'en_reservation' | 'perdu' = 'disponible'
      if (r.status === 'perdu' || r.status === 'en_reservation') {
        status = r.status
      } else if (r.availableCopies <= 0) {
        status = 'emprunte'
      }
      const nextDue = nextDueByResource.get(r.id)
      return {
        id: r.id,
        title: r.title,
        type: r.type,
        category: r.category,
        status,
        borrowCount: r._count.loans,
        location: r.location || '',
        totalCopies: r.totalCopies,
        availableCopies: r.availableCopies,
        returnDate: status === 'emprunte' && nextDue
          ? nextDue.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
          : null,
      }
    })

    const now = new Date()
    const borrows = activeLoans.map((loan) => ({
      id: loan.id,
      studentName: `${loan.student.firstName} ${loan.student.lastName}`.trim(),
      matricule: loan.student.matricule || '',
      bookTitle: loan.resource.title,
      dateEmprunt: loan.borrowedAt.toLocaleDateString('fr-FR'),
      dateRetourPrevue: loan.dueAt.toLocaleDateString('fr-FR'),
      status: loan.dueAt < now ? 'en_retard' : 'a_l_heure',
    }))

    // ── Usage stats derived from the full loan history ─────────────────────
    const monthBuckets: { key: string; month: string; count: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      monthBuckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, month: FR_MONTHS_SHORT[d.getMonth()], count: 0 })
    }
    const monthIndex = new Map(monthBuckets.map((b) => [b.key, b]))

    const categoryCounts = new Map<string, number>()
    const borrowerIds = new Set<string>()
    let returnedCount = 0
    let onTimeCount = 0
    let totalReturnDurationMs = 0

    for (const loan of allLoans) {
      const key = `${loan.borrowedAt.getFullYear()}-${loan.borrowedAt.getMonth()}`
      const bucket = monthIndex.get(key)
      if (bucket) bucket.count += 1

      const category = loan.resource.category
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1)

      borrowerIds.add(loan.studentId)

      if (loan.returnedAt) {
        returnedCount += 1
        totalReturnDurationMs += loan.returnedAt.getTime() - loan.borrowedAt.getTime()
        if (loan.returnedAt <= loan.dueAt) onTimeCount += 1
      }
    }

    const topCategories = Array.from(categoryCounts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    const totalRoomCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0)
    const totalRoomOccupancy = rooms.reduce((sum, r) => sum + r.occupancy, 0)

    const stats = {
      totalResources: resources.length,
      totalCopies: resources.reduce((sum, r) => sum + r.totalCopies, 0),
      availableCopies: resources.reduce((sum, r) => sum + r.availableCopies, 0),
      activeLoans: activeLoans.length,
      overdueLoans: activeLoans.filter((l) => l.dueAt < now).length,
      totalRoomCapacity,
      totalRoomOccupancy,
      avgOccupancyPercent: totalRoomCapacity > 0 ? Math.round((totalRoomOccupancy / totalRoomCapacity) * 100) : 0,
      activeBorrowersCount: borrowerIds.size,
      totalStudents,
      avgBorrowDurationDays: returnedCount > 0
        ? Math.round((totalReturnDurationMs / returnedCount / (1000 * 60 * 60 * 24)) * 10) / 10
        : null,
      onTimeReturnRatePercent: returnedCount > 0 ? Math.round((onTimeCount / returnedCount) * 100) : null,
      totalLoansAllTime: allLoans.length,
      monthlyBorrows: monthBuckets.map((b) => ({ month: b.month, count: b.count })),
      topCategories,
    }

    return NextResponse.json({ catalog, borrows, rooms, stats })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Library API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch library data' },
      { status: 500 }
    )
  }
}

// POST /api/library - create a new catalog resource (add a book/document)
async function createResourceHandler(_user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const { title, type, category, location, totalCopies } = body

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    if (type !== undefined && !KNOWN_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${KNOWN_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    if (category !== undefined && !KNOWN_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `category must be one of: ${KNOWN_CATEGORIES.join(', ')}` },
        { status: 400 }
      )
    }

    const copies = typeof totalCopies === 'number' && totalCopies > 0 ? Math.floor(totalCopies) : 1

    const resource = await db.libraryResource.create({
      data: {
        tenantId,
        title: title.trim(),
        type: type ?? undefined,
        category: category ?? undefined,
        location: location ? String(location).trim() : null,
        totalCopies: copies,
        availableCopies: copies,
      },
    })

    return NextResponse.json({ resource }, { status: 201 })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Create library resource error:', error)
    return NextResponse.json(
      { error: 'Failed to create library resource' },
      { status: 500 }
    )
  }
}

// POST /api/library?action=borrow - record a new loan for a student
async function borrowHandler(_user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const { resourceId, studentId, dueAt } = body

    if (!resourceId || !studentId) {
      return NextResponse.json(
        { error: 'resourceId and studentId are required fields' },
        { status: 400 }
      )
    }

    const [resource, student] = await Promise.all([
      db.libraryResource.findFirst({ where: { id: resourceId, tenantId } }),
      db.student.findFirst({ where: { id: studentId, tenantId } }),
    ])

    if (!resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 })
    }
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }
    if (resource.availableCopies <= 0) {
      return NextResponse.json(
        { error: 'No copies available for this resource' },
        { status: 409 }
      )
    }

    const dueDate = dueAt
      ? new Date(dueAt)
      : new Date(Date.now() + DEFAULT_LOAN_DAYS * 24 * 60 * 60 * 1000)

    const loan = await db.$transaction(async (tx) => {
      const created = await tx.libraryLoan.create({
        data: {
          tenantId,
          resourceId,
          studentId,
          dueAt: dueDate,
        },
      })
      await tx.libraryResource.update({
        where: { id: resourceId },
        data: { availableCopies: { decrement: 1 } },
      })
      return created
    })

    return NextResponse.json({ loan }, { status: 201 })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Create library loan error:', error)
    return NextResponse.json(
      { error: 'Failed to record loan' },
      { status: 500 }
    )
  }
}

// PUT /api/library?id=<loanId>&action=return - mark an active loan as returned
async function returnLoanHandler(_user: SessionUser, tenantId: string, id: string) {
  try {
    const loan = await db.libraryLoan.findFirst({ where: { id, tenantId } })
    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
    }
    if (loan.returnedAt) {
      return NextResponse.json({ error: 'This loan has already been returned' }, { status: 400 })
    }

    const updated = await db.$transaction(async (tx) => {
      const returned = await tx.libraryLoan.update({
        where: { id },
        data: { returnedAt: new Date() },
      })
      await tx.libraryResource.update({
        where: { id: loan.resourceId },
        data: { availableCopies: { increment: 1 } },
      })
      return returned
    })

    return NextResponse.json({ loan: updated })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Return library loan error:', error)
    return NextResponse.json(
      { error: 'Failed to return loan' },
      { status: 500 }
    )
  }
}

// PUT /api/library?id=<roomId>&action=occupancy - front-desk headcount update
async function updateOccupancyHandler(_user: SessionUser, tenantId: string, request: NextRequest, id: string) {
  try {
    const body = await request.json()
    const { occupancy } = body

    if (typeof occupancy !== 'number' || !Number.isFinite(occupancy) || occupancy < 0) {
      return NextResponse.json(
        { error: 'occupancy must be a non-negative number' },
        { status: 400 }
      )
    }

    const room = await db.libraryRoom.findFirst({ where: { id, tenantId } })
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    const updated = await db.libraryRoom.update({
      where: { id },
      data: { occupancy: Math.floor(occupancy) },
    })

    return NextResponse.json({ room: updated })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Update library room occupancy error:', error)
    return NextResponse.json(
      { error: 'Failed to update room occupancy' },
      { status: 500 }
    )
  }
}

export const GET = withTenantAuth(handleGet)

export const POST = withTenantAuth(async (user: SessionUser, tenantId: string, request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (action === 'borrow') {
    return borrowHandler(user, tenantId, request)
  }
  return createResourceHandler(user, tenantId, request)
})

export const PUT = withTenantAuth(async (user: SessionUser, tenantId: string, request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 })
  }
  if (action === 'occupancy') {
    return updateOccupancyHandler(user, tenantId, request, id)
  }
  if (action === 'return') {
    return returnLoanHandler(user, tenantId, id)
  }
  return NextResponse.json(
    { error: 'action query parameter must be one of: return, occupancy' },
    { status: 400 }
  )
})
