import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'

const NOTIFICATIONS_LIMIT = 50

// GET /api/notifications - list the tenant's most recent notifications + unread count
async function handleGet(_user: SessionUser, tenantId: string, _request: NextRequest) {
  try {
    const where = { tenantId }

    const [notifications, unreadCount] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: NOTIFICATIONS_LIMIT,
      }),
      db.notification.count({ where: { ...where, isRead: false } }),
    ])

    return NextResponse.json({ notifications, unreadCount })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Notifications API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

const NOTIFICATION_ACTIONS = ['read', 'read-all'] as const

// PUT /api/notifications?id=X - mark one notification read (action: 'read')
// PUT /api/notifications - mark every unread notification for the tenant read (action: 'read-all')
async function handlePut(_user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    const body = await request.json().catch(() => ({}))
    const { action } = body

    if (!action || !NOTIFICATION_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: `action must be one of: ${NOTIFICATION_ACTIONS.join(', ')}` },
        { status: 400 }
      )
    }

    if (action === 'read-all') {
      const result = await db.notification.updateMany({
        where: { tenantId, isRead: false },
        data: { isRead: true },
      })
      return NextResponse.json({ count: result.count })
    }

    // action === 'read'
    if (!id) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 })
    }

    const existing = await db.notification.findFirst({ where: { id, tenantId } })
    if (!existing) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    const notification = await db.notification.update({
      where: { id },
      data: { isRead: true },
    })

    return NextResponse.json({ notification })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Update notification error:', error)
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    )
  }
}

export const GET = withTenantAuth(handleGet)
export const PUT = withTenantAuth(handlePut)
