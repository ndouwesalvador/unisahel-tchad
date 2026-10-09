import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { withAuth, type SessionUser } from '@/lib/auth/helpers'

const ENTITY_LABELS: Record<string, string> = {
  Student: 'un étudiant',
  Teacher: 'un enseignant',
  User: 'un compte utilisateur',
  Payment: 'un paiement',
  Grade: 'une note',
  Program: 'un programme',
  Announcement: 'une annonce',
  Tenant: "l'établissement",
  Admission: 'une candidature',
  TimetableSlot: "l'emploi du temps",
}

function safeParse(details: string | null): Record<string, unknown> | null {
  if (!details) return null
  try {
    return JSON.parse(details)
  } catch {
    return null
  }
}

function describeActivity(action: string, entity: string, details: Record<string, unknown> | null): string {
  const label = ENTITY_LABELS[entity] || entity
  const suffix = typeof details?.matricule === 'string' ? ` (${details.matricule})`
    : typeof details?.title === 'string' ? ` "${details.title}"`
    : typeof details?.receiptNumber === 'string' ? ` (${details.receiptNumber})`
    : ''
  switch (action) {
    case 'SIGN_IN': return 'Connexion au système'
    case 'CREATE': return `Création de ${label}${suffix}`
    case 'BULK_CREATE': return `Création en masse : ${label}`
    case 'UPDATE': return `Modification de ${label}${suffix}`
    case 'DELETE': return `Suppression de ${label}${suffix}`
    case 'LOCK': return `Verrouillage : ${label}`
    case 'UNLOCK': return `Déverrouillage : ${label}`
    default: return `${action} : ${label}`
  }
}

function parseUserAgent(ua: string | undefined): string {
  if (!ua) return 'Appareil inconnu'
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Navigateur'
  const os = /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Linux/.test(ua) ? 'Linux' : 'appareil inconnu'
  return `${browser} / ${os}`
}

// GET /api/profile - the current user's own real login history and activity
// feed, built from AuditLog (already recorded for every SIGN_IN and every
// CREATE/UPDATE/DELETE across the app). Replaces profile-page.tsx's fake
// loginHistory/activeSessions/activityData arrays. Location/IP-geolocation
// is intentionally not fabricated - no geo-IP service is wired up.
async function handleGet(user: SessionUser) {
  try {
    const now = new Date()
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const [logs, dbUser, connectionsThisMonth, actionsThisMonth] = await Promise.all([
      db.auditLog.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      db.user.findUnique({
        where: { id: user.id },
        select: {
          firstName: true, lastName: true, email: true, phone: true, passwordHash: true,
          isActive: true, createdAt: true, updatedAt: true, lastLoginAt: true,
          faculty: { select: { name: true } },
          department: { select: { name: true } },
          teacher: { select: {
            employeeId: true, grade: true, specialization: true,
            department: { select: { name: true } },
          } },
          student: { select: {
            currentProgram: { select: { name: true, department: { select: { name: true } } } },
            currentLevel: { select: { name: true } },
          } },
        },
      }),
      db.auditLog.count({ where: { userId: user.id, action: 'SIGN_IN', createdAt: { gte: monthStart } } }),
      db.auditLog.count({ where: { userId: user.id, action: { not: 'SIGN_IN' }, createdAt: { gte: monthStart } } }),
    ])

    const signIns = logs.filter((l) => l.action === 'SIGN_IN')

    const loginHistory = signIns.slice(0, 10).map((l) => {
      const details = safeParse(l.details)
      return {
        id: l.id,
        date: l.createdAt,
        ip: l.ipAddress || 'Inconnue',
        device: parseUserAgent(typeof details?.userAgent === 'string' ? details.userAgent : undefined),
      }
    })

    const currentSession = loginHistory[0] ?? null

    const activity = logs.slice(0, 30).map((l) => ({
      id: l.id,
      type: l.action === 'SIGN_IN' ? 'login' : l.action === 'DELETE' ? 'delete' : l.action === 'CREATE' || l.action === 'BULK_CREATE' ? 'create' : 'edit',
      description: describeActivity(l.action, l.entity, safeParse(l.details)),
      timestamp: l.createdAt,
    }))

    const departmentName = dbUser?.teacher?.department?.name
      ?? dbUser?.department?.name
      ?? dbUser?.student?.currentProgram?.department?.name
      ?? null
    const facultyName = dbUser?.faculty?.name ?? null

    return NextResponse.json({
      loginHistory,
      currentSession,
      activity,
      profile: {
        firstName: dbUser?.firstName ?? user.firstName,
        lastName: dbUser?.lastName ?? user.lastName,
        email: dbUser?.email ?? user.email ?? '',
        phone: dbUser?.phone ?? '',
        hasPassword: Boolean(dbUser?.passwordHash),
        isActive: dbUser?.isActive ?? true,
        createdAt: dbUser?.createdAt ?? null,
        updatedAt: dbUser?.updatedAt ?? null,
        lastLoginAt: dbUser?.lastLoginAt ?? currentSession?.date ?? null,
        departmentName,
        facultyName,
        programName: dbUser?.student?.currentProgram?.name ?? null,
        levelName: dbUser?.student?.currentLevel?.name ?? null,
        employeeId: dbUser?.teacher?.employeeId ?? null,
        grade: dbUser?.teacher?.grade ?? null,
        specialization: dbUser?.teacher?.specialization ?? null,
      },
      stats: { connectionsThisMonth, actionsThisMonth },
    })
  } catch (error) {
    console.error('Profile API error:', error)
    return NextResponse.json({ error: 'Impossible de charger le profil' }, { status: 500 })
  }
}

// PUT /api/profile - update own firstName/lastName/phone, or (with
// ?action=password) change own password. Email is intentionally not
// editable here - it doubles as the login identifier for Credentials auth.
async function handlePut(user: SessionUser, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const body = await request.json()

    if (searchParams.get('action') === 'password') {
      const { currentPassword, newPassword } = body
      if (!currentPassword || !newPassword || newPassword.length < 8) {
        return NextResponse.json({ error: 'Mot de passe actuel et nouveau mot de passe (8 caractères minimum) requis' }, { status: 400 })
      }
      const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } })
      if (!dbUser?.passwordHash) {
        return NextResponse.json({ error: "Ce compte n’utilise pas de mot de passe (connexion par code PIN)" }, { status: 409 })
      }
      const valid = await bcrypt.compare(currentPassword, dbUser.passwordHash)
      if (!valid) {
        return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 403 })
      }
      const newHash = await bcrypt.hash(newPassword, 12)
      await db.user.update({ where: { id: user.id }, data: { passwordHash: newHash, mustChangePassword: false } })
      return NextResponse.json({ ok: true })
    }

    const { firstName, lastName, phone } = body
    const data: Record<string, string> = {}
    if (typeof firstName === 'string' && firstName.trim()) data.firstName = firstName.trim()
    if (typeof lastName === 'string' && lastName.trim()) data.lastName = lastName.trim()
    if (typeof phone === 'string') data.phone = phone.trim()
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Aucun champ valide à mettre à jour' }, { status: 400 })
    }
    const updated = await db.user.update({ where: { id: user.id }, data })
    return NextResponse.json({ data: { firstName: updated.firstName, lastName: updated.lastName, phone: updated.phone } })
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json({ error: 'Impossible de mettre à jour le profil' }, { status: 500 })
  }
}

export const GET = withAuth(handleGet)
export const PUT = withAuth(handlePut)
