import { Resend } from 'resend'

let resendClient: Resend | null = null

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  if (!resendClient) resendClient = new Resend(apiKey)
  return resendClient
}

export interface SendEmailParams {
  to: string
  subject: string
  html: string
  from?: string
}

export interface SendEmailResult {
  success: boolean
  error?: string
}

// Sends via Resend when RESEND_API_KEY is configured. Without a key, this is
// a documented no-op (returns success: false) rather than a silent fake
// success - callers should treat email delivery as best-effort and never let
// it fail the underlying operation (payment validation, etc).
export async function sendEmail({ to, subject, html, from }: SendEmailParams): Promise<SendEmailResult> {
  const client = getResendClient()
  if (!client) {
    console.warn(`[email] RESEND_API_KEY not configured - skipped email to ${to} ("${subject}")`)
    return { success: false, error: 'RESEND_API_KEY not configured' }
  }

  try {
    // resend.dev is Resend's shared test sender - works without verifying a
    // custom domain. Switch to a verified domain address in production.
    const { error } = await client.emails.send({
      from: from || 'UniSahel <onboarding@resend.dev>',
      to,
      subject,
      html,
    })

    if (error) {
      console.error('[email] Resend send error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (e) {
    console.error('[email] Resend send exception:', e)
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}
