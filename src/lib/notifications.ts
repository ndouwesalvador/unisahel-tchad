import { db } from '@/lib/db'

export interface CreateNotificationInput {
  type?: string // success, info, warning, mention, error
  category: string // Academique, Paiement, Administratif, Systeme
  title: string
  description: string
  link?: string
}

// Creates a real, tenant-scoped notification row. Import this from any API
// route that wants to emit a notification when a real event happens
// (a payment validated, a candidature received, etc). Never throws silently
// on invalid input - callers are expected to pass valid tenantId/data.
export async function createNotification(tenantId: string, data: CreateNotificationInput) {
  return db.notification.create({
    data: {
      tenantId,
      type: data.type ?? 'info',
      category: data.category,
      title: data.title,
      description: data.description,
      link: data.link ?? null,
    },
  })
}
