import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { provisionStudentAccount } from '@/lib/student-portal'
import { generateTempPassword } from '@/lib/password'

const SUPPORTED_IMPORT_TYPES = ['Etudiants', 'Enseignants'] as const

const GRADE_ALIASES: Record<string, string> = {
  'professeur': 'PROFESSEUR_TITULAIRE',
  'professeur titulaire': 'PROFESSEUR_TITULAIRE',
  'maitre de conferences': 'MAITRE_CONFERENCES',
  'mcf': 'MAITRE_CONFERENCES',
  'maitre-assistant': 'MAITRE_ASSISTANT',
  'maitre assistant': 'MAITRE_ASSISTANT',
  'ma': 'MAITRE_ASSISTANT',
  'assistant': 'ASSISTANT',
  'vacataire': 'VACATAIRE',
}

function normalizeGrade(value: unknown): string {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return GRADE_ALIASES[text] || 'ASSISTANT'
}

function parseFrenchDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null
  const match = value.trim().match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/)
  if (!match) return null
  const [, day, month, year] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  return Number.isNaN(date.getTime()) ? null : date
}

function mapStatut(value: unknown): string {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (text === 'inscrit') return 'INSCRIT'
  return 'PRE_INSCRIT'
}

async function handleGet(_user: SessionUser, tenantId: string) {
  try {
    const [importLogs, exportLogs] = await Promise.all([
      db.importLog.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 50 }),
      db.exportLog.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 50 }),
    ])

    const now = new Date()
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const importsThisMonth = importLogs.filter((l) => l.createdAt >= monthStart).length
    const exportsThisMonth = exportLogs.filter((l) => l.createdAt >= monthStart).length
    const errorsThisMonth = importLogs.filter((l) => l.createdAt >= monthStart && l.status === 'Echoue').length

    return NextResponse.json({
      importHistory: importLogs,
      exportHistory: exportLogs,
      stats: {
        importsThisMonth,
        exportsThisMonth,
        pending: 0,
        errors: errorsThisMonth,
      },
    })
  } catch (error) {
    console.error('Import-export API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch import/export history', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function importStudents(tenantId: string, rows: Record<string, unknown>[]) {
  const programs = await db.program.findMany({ where: { tenantId }, select: { id: true, name: true } })
  const errors: string[] = []
  let successRows = 0
  let portalAccountsCreated = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const lineNumber = i + 2 // account for header row in the source spreadsheet
    const firstName = String(row['Prénom'] ?? row['Prenom'] ?? '').trim()
    const lastName = String(row['Nom'] ?? '').trim()

    if (!firstName || !lastName) {
      errors.push(`Ligne ${lineNumber}: nom ou prenom manquant`)
      continue
    }

    const matriculeRaw = row['Matricule']
    const matricule = typeof matriculeRaw === 'string' && matriculeRaw.trim() ? matriculeRaw.trim() : undefined

    try {
      if (matricule) {
        const existing = await db.student.findFirst({ where: { tenantId, matricule }, select: { id: true } })
        if (existing) {
          errors.push(`Ligne ${lineNumber}: matricule "${matricule}" deja utilise`)
          continue
        }
      }

      const filiereText = typeof row['Filière'] === 'string' ? row['Filière'] : typeof row['Filiere'] === 'string' ? (row['Filiere'] as string) : ''
      const matchedProgram = filiereText
        ? programs.find((p) => p.name.toLowerCase().includes(filiereText.trim().toLowerCase()))
        : undefined
      if (filiereText && !matchedProgram) {
        errors.push(`Ligne ${lineNumber}: filiere "${filiereText}" introuvable — etudiant cree sans filiere assignee`)
      }

      const created = await db.student.create({
        data: {
          tenantId,
          matricule,
          firstName,
          lastName,
          dateOfBirth: parseFrenchDate(row['Date naissance']),
          currentProgramId: matchedProgram?.id,
          status: mapStatut(row['Statut']),
        },
      })
      if (matricule) {
        const account = await provisionStudentAccount(tenantId, created.id, matricule, firstName, lastName)
        if (account) portalAccountsCreated += 1
      }
      successRows += 1
    } catch (rowError) {
      errors.push(`Ligne ${lineNumber}: ${rowError instanceof Error ? rowError.message : 'erreur inconnue'}`)
    }
  }

  return { successRows, errors, extra: { portalAccountsCreated } }
}

async function importTeachers(tenantId: string, rows: Record<string, unknown>[]) {
  const departments = await db.department.findMany({ where: { tenantId }, select: { id: true, name: true } })
  const settings = await db.tenantSettings.findUnique({ where: { tenantId }, select: { matriculePrefix: true } })
  const prefix = settings?.matriculePrefix || 'UNSH'
  const year = new Date().getFullYear()
  let seq = await db.teacher.count({ where: { tenantId } })

  const errors: string[] = []
  let successRows = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const lineNumber = i + 2
    const firstName = String(row['Prénom'] ?? row['Prenom'] ?? '').trim()
    const lastName = String(row['Nom'] ?? '').trim()
    const email = String(row['Email'] ?? row['email'] ?? '').trim()

    if (!firstName || !lastName) {
      errors.push(`Ligne ${lineNumber}: nom ou prenom manquant`)
      continue
    }
    if (!email) {
      errors.push(`Ligne ${lineNumber}: email manquant (obligatoire — il sert d'identifiant de connexion)`)
      continue
    }

    try {
      const emailTaken = await db.user.findUnique({ where: { email }, select: { id: true } })
      if (emailTaken) {
        errors.push(`Ligne ${lineNumber}: email "${email}" deja utilise`)
        continue
      }

      const deptText = typeof row['Département'] === 'string' ? row['Département'] : typeof row['Departement'] === 'string' ? (row['Departement'] as string) : ''
      const matchedDept = deptText ? departments.find((d) => d.name.toLowerCase().includes(deptText.trim().toLowerCase())) : undefined
      if (deptText && !matchedDept) {
        errors.push(`Ligne ${lineNumber}: departement "${deptText}" introuvable — enseignant cree sans departement`)
      }

      seq += 1
      const employeeId = `${prefix}-ENS-${year}-${String(seq).padStart(4, '0')}`
      const passwordHash = await bcrypt.hash(generateTempPassword(), 12)

      await db.$transaction(async (tx) => {
        const account = await tx.user.create({
          data: { tenantId, firstName, lastName, email, role: 'ENSEIGNANT', passwordHash, mustChangePassword: true },
        })
        await tx.teacher.create({
          data: {
            tenantId,
            userId: account.id,
            employeeId,
            grade: normalizeGrade(row['Grade']),
            specialization: typeof row['Spécialisation'] === 'string' ? (row['Spécialisation'] as string) : typeof row['Specialisation'] === 'string' ? (row['Specialisation'] as string) : null,
            departmentId: matchedDept?.id,
          },
        })
      })
      successRows += 1
    } catch (rowError) {
      errors.push(`Ligne ${lineNumber}: ${rowError instanceof Error ? rowError.message : 'erreur inconnue'}`)
    }
  }

  return { successRows, errors, extra: {} }
}

async function handleImport(tenantId: string, body: { type?: string; fileName?: string; rows?: Record<string, unknown>[] }) {
  const { type, fileName, rows } = body

  if (!type || !SUPPORTED_IMPORT_TYPES.includes(type as (typeof SUPPORTED_IMPORT_TYPES)[number])) {
    return NextResponse.json(
      {
        error: 'IMPORT_TYPE_NOT_AVAILABLE',
        message: `L'import de type "${type ?? ''}" n'est pas encore disponible. Types pris en charge : ${SUPPORTED_IMPORT_TYPES.join(', ')}.`,
      },
      { status: 501 }
    )
  }

  if (!fileName || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'Fichier vide ou invalide' }, { status: 400 })
  }

  const { successRows, errors, extra } = type === 'Enseignants'
    ? await importTeachers(tenantId, rows)
    : await importStudents(tenantId, rows)

  const errorRows = rows.length - successRows
  const status = errorRows === 0 ? 'Succes' : successRows === 0 ? 'Echoue' : 'Partiel'

  const importLog = await db.importLog.create({
    data: {
      tenantId,
      type,
      fileName,
      status,
      totalRows: rows.length,
      successRows,
      errorRows,
      errors: errors.length > 0 ? JSON.stringify(errors.slice(0, 20)) : null,
    },
  })

  return NextResponse.json({ importLog, successRows, errorRows, errors, ...extra })
}

async function handleExportLog(tenantId: string, body: { type?: string; format?: string; rowCount?: number; fileSizeLabel?: string }) {
  const { type, format, rowCount, fileSizeLabel } = body
  if (!type || !format) {
    return NextResponse.json({ error: 'type et format requis' }, { status: 400 })
  }

  const exportLog = await db.exportLog.create({
    data: {
      tenantId,
      type,
      format,
      rowCount: typeof rowCount === 'number' ? rowCount : 0,
      fileSizeLabel: fileSizeLabel ?? null,
    },
  })

  return NextResponse.json({ exportLog })
}

async function handlePost(_user: SessionUser, tenantId: string, request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const body = await request.json()

    if (action === 'export') {
      return await handleExportLog(tenantId, body)
    }
    return await handleImport(tenantId, body)
  } catch (error) {
    console.error('Import-export API error:', error)
    return NextResponse.json(
      { error: 'Failed to process request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export const GET = withTenantAuth(handleGet)
export const POST = withTenantAuth(handlePost, ['SUPER_ADMIN', 'ADMIN_INSTITUTION', 'SCOLARITE'])
