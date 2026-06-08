import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth } from '@/lib/auth/helpers'

// GET /api/communications - List communications/broadcasts with stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId query parameter is required' },
        { status: 400 }
      )
    }

    const where = { tenantId }

    const [communications, sent, pending, failed] = await Promise.all([
      db.communication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      db.communication.count({ where: { ...where, status: 'SENT' } }),
      db.communication.count({ where: { ...where, status: 'PENDING' } }),
      db.communication.count({ where: { ...where, status: 'FAILED' } }),
    ])

    const stats = {
      total: sent + pending + failed,
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
async function handler(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantId, subject, audience, type, priority, channel, content } = body

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      )
    }

    if (!subject || !audience || !type || !channel) {
      return NextResponse.json(
        { error: 'subject, audience, type, and channel are required fields' },
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

    const communication = await db.communication.create({
      data: {
        tenantId,
        subject,
        audience,
        type,
        priority: priority ?? 'NORMAL',
        channel,
        content: content ?? null,
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

export const POST = withTenantAuth(handler as any)
