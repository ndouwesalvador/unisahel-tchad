import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'

const VALID_TYPES = ['INFO', 'URGENT', 'PAYMENT', 'RESULT', 'EXAM', 'STAGE']
const VALID_PRIORITIES = ['urgent', 'important', 'normal']
const VALID_CATEGORIES = ['academique', 'administratif', 'urgence', 'evenement']
const VALID_TARGETS = ['ALL', 'STUDENTS', 'TEACHERS', 'STAFF']

// GET /api/announcements - list announcements
async function handleGet(_user: SessionUser, tenantId: string, _request: NextRequest) {
  try {
    const announcements = await db.announcement.findMany({
      where: { tenantId },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    })

    return NextResponse.json({
      announcements,
      stats: {
        total: announcements.length,
        pinned: announcements.filter((a) => a.isPinned).length,
        urgent: announcements.filter((a) => a.priority === 'urgent').length,
      },
    })
  } catch (error) {
    console.error('Announcements API error:', error)
    return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 })
  }
}

// POST /api/announcements - create a new announcement
async function handlePost(user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const { title, content, type, priority, category, target, isPinned } = body

    if (!title || !content) {
      return NextResponse.json({ error: 'title and content are required fields' }, { status: 400 })
    }

    if (type && !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 })
    }
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return NextResponse.json({ error: `priority must be one of: ${VALID_PRIORITIES.join(', ')}` }, { status: 400 })
    }
    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` }, { status: 400 })
    }
    if (target && !VALID_TARGETS.includes(target)) {
      return NextResponse.json({ error: `target must be one of: ${VALID_TARGETS.join(', ')}` }, { status: 400 })
    }

    const announcement = await db.announcement.create({
      data: {
        tenantId,
        title,
        content,
        type: type ?? undefined,
        priority: priority ?? undefined,
        category: category ?? undefined,
        target: target ?? undefined,
        isPinned: typeof isPinned === 'boolean' ? isPinned : undefined,
        isPublished: true,
        publishedAt: new Date(),
        publishedBy: `${user.firstName} ${user.lastName}`,
      },
    })

    await db.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: 'CREATE',
        entity: 'Announcement',
        entityId: announcement.id,
        details: JSON.stringify({ title: announcement.title }),
      },
    })

    return NextResponse.json({ announcement }, { status: 201 })
  } catch (error) {
    console.error('Create announcement error:', error)
    return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 })
  }
}

export const GET = withTenantAuth(handleGet)
export const POST = withTenantAuth(handlePost)
