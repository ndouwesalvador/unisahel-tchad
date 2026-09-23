import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'

// GET /api/communications - List communications/broadcasts with stats
async function handleGet(_user: SessionUser, tenantId: string, _request: NextRequest) {
  try {
    const where = { tenantId }

    const [communications, total, sent, pending, failed] = await Promise.all([
      db.communication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      db.communication.count({ where }),
      db.communication.count({ where: { ...where, status: 'SENT' } }),
      db.communication.count({ where: { ...where, status: 'PENDING' } }),
      db.communication.count({ where: { ...where, status: 'FAILED' } }),
    ])

    const stats = {
      total,
      sent,
      pending,
      failed,
    }

    return NextResponse.json({ communications, stats })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Communications API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch communications' },
      { status: 500 }
    )
  }
}

// POST /api/communications - Create a new communication/broadcast
async function handlePost(_user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const { subject, audience, type, priority, channel, content } = body

    if (!subject?.trim() || !audience?.trim() || !type || !channel || !content?.trim()) {
      return NextResponse.json(
        { error: 'subject, audience, type, channel, and content are required fields' },
        { status: 400 }
      )
    }

    const validTypes = ['INFO', 'URGENT', 'ACADEMIC', 'ADMINISTRATIVE']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const validChannels = ['EMAIL', 'SMS', 'PUSH', 'IN_APP']
    if (!validChannels.includes(channel)) {
      return NextResponse.json(
        { error: `channel must be one of: ${validChannels.join(', ')}` },
        { status: 400 }
      )
    }

    const validPriorities = ['NORMAL', 'HIGH', 'CRITICAL']
    if (priority && !validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: `priority must be one of: ${validPriorities.join(', ')}` },
        { status: 400 }
      )
    }

    const communication = await db.communication.create({
      data: {
        tenantId,
        subject: subject.trim(),
        audience: audience.trim(),
        type,
        priority: priority ?? 'NORMAL',
        channel,
        content: content.trim(),
      },
    })

    return NextResponse.json({ communication }, { status: 201 })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Create communication error:', error)
    return NextResponse.json(
      { error: 'Failed to create communication' },
      { status: 500 }
    )
  }
}

// PATCH /api/communications - Update delivery status for a broadcast record
async function handlePatch(_user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status } = body
    const validStatuses = ['PENDING', 'SENT', 'FAILED']

    if (!id || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `id and status are required. status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const existing = await db.communication.findFirst({ where: { id, tenantId } })
    if (!existing) {
      return NextResponse.json({ error: 'Communication not found' }, { status: 404 })
    }

    const communication = await db.communication.update({
      where: { id },
      data: {
        status,
        sentDate: status === 'SENT' ? new Date() : status === 'PENDING' ? null : existing.sentDate,
      },
    })

    return NextResponse.json({ communication })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Update communication error:', error)
    return NextResponse.json(
      { error: 'Failed to update communication' },
      { status: 500 }
    )
  }
}

// DELETE /api/communications?id=... - Remove a broadcast record
async function handleDelete(_user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const existing = await db.communication.findFirst({ where: { id, tenantId } })
    if (!existing) {
      return NextResponse.json({ error: 'Communication not found' }, { status: 404 })
    }

    await db.communication.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Delete communication error:', error)
    return NextResponse.json(
      { error: 'Failed to delete communication' },
      { status: 500 }
    )
  }
}

export const GET = withTenantAuth(handleGet)
export const POST = withTenantAuth(handlePost)
export const PATCH = withTenantAuth(handlePatch)
export const DELETE = withTenantAuth(handleDelete)
