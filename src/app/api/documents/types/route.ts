import { NextResponse } from 'next/server'
import { withTenantAuth } from '@/lib/auth/helpers'
import { documentTypes } from '@/lib/pdf/templates'

async function handler() {
  return NextResponse.json({ types: documentTypes })
}

export const GET = withTenantAuth(handler as any)
