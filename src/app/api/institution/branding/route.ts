import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'

// Every tenant member needs the visual identity, but not the institutional
// signatures, seals, contact details or other settings from /api/institution.
async function handleGet(_user: SessionUser, tenantId: string, _request: NextRequest) {
  const settings = await db.tenantSettings.findUnique({
    where: { tenantId },
    select: { primaryColor: true, secondaryColor: true, accentColor: true },
  })
  return NextResponse.json({ settings })
}

export const GET = withTenantAuth(handleGet)
