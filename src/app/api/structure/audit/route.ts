import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { db } from '@/lib/db'
import { withTenantAuth, type SessionUser } from '@/lib/auth/helpers'
import { duplicateNameGroups, normalizeStructureLabel } from '@/lib/structure-duplicates'
import { getLevelReferences, hasExternalLevelReferences } from '@/lib/structure-level-references'

async function handleGet(_user: SessionUser, tenantId: string, _request: NextRequest) {
  const programs = await db.program.findMany({
    where: { tenantId, isActive: true },
    select: {
      id: true,
      name: true,
      levels: {
        select: {
          id: true,
          name: true,
          code: true,
          isActive: true,
          semesters: {
            select: {
              id: true,
              name: true,
              teachingUnits: {
                select: {
                  id: true,
                  credits: true,
                  responsibleId: true,
                  _count: { select: { courseElements: true } },
                },
              },
            },
          },
        },
      },
    },
  })

  const groups = await Promise.all(programs.flatMap((program) =>
    duplicateNameGroups(program.levels).map(async (levels) => {
      const detailedLevels = await Promise.all(levels.map(async (level) => {
        const references = await getLevelReferences(db, tenantId, level.id)
        const units = level.semesters.flatMap((semester) => semester.teachingUnits)
        return {
          id: level.id,
          name: level.name,
          code: level.code,
          isActive: level.isActive,
          semesters: level.semesters.map((semester) => semester.name),
          teachingUnits: units.length,
          courseElements: units.reduce((sum, unit) => sum + unit._count.courseElements, 0),
          credits: units.reduce((sum, unit) => sum + unit.credits, 0),
          teacherResponsibilities: units.filter((unit) => unit.responsibleId).length,
          references,
        }
      }))
      return {
        programId: program.id,
        programName: program.name,
        levels: detailedLevels.map((level) => ({
          ...level,
          canDeleteDraft: !hasExternalLevelReferences(level.references) && level.courseElements === 0 && level.teacherResponsibilities === 0 && detailedLevels.some((other) => other.id !== level.id && other.isActive && (other.references.students > 0 || other.references.pedagogicalRegistrations > 0 || other.references.grades > 0)),
        })),
      }
    }),
  ))

  return NextResponse.json({ data: groups })
}

export const GET = withTenantAuth(handleGet, ['SUPER_ADMIN', 'ADMIN_INSTITUTION'])

const deleteRequest = z.object({
  candidateLevelId: z.string().min(1),
  keepLevelId: z.string().min(1),
}).refine((value) => value.candidateLevelId !== value.keepLevelId)

class DeleteRejected extends Error {
  constructor(message: string, public readonly status: number) { super(message) }
}

async function handleDelete(user: SessionUser, tenantId: string, request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = deleteRequest.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Niveaux à vérifier invalides.' }, { status: 400 })

  try {
    const result = await db.$transaction(async (tx) => {
      const [candidate, kept] = await Promise.all([
        tx.level.findFirst({
          where: { id: parsed.data.candidateLevelId, program: { tenantId } },
          include: { semesters: { include: { teachingUnits: { include: { courseElements: { select: { id: true } } } } } } },
        }),
        tx.level.findFirst({
          where: { id: parsed.data.keepLevelId, program: { tenantId }, isActive: true },
          select: { id: true, programId: true, name: true },
        }),
      ])
      if (!candidate || !kept) throw new DeleteRejected('Niveau introuvable dans cette institution.', 404)
      if (candidate.programId !== kept.programId || normalizeStructureLabel(candidate.name) !== normalizeStructureLabel(kept.name)) {
        throw new DeleteRejected('Ces niveaux ne sont pas des doublons dans le même programme.', 409)
      }

      const [candidateRefs, keptRefs] = await Promise.all([
        getLevelReferences(tx, tenantId, candidate.id),
        getLevelReferences(tx, tenantId, kept.id),
      ])
      const units = candidate.semesters.flatMap((semester) => semester.teachingUnits)
      if (hasExternalLevelReferences(candidateRefs) || units.some((unit) => unit.responsibleId || unit.courseElements.length > 0)) {
        throw new DeleteRejected('Ce niveau possède des données pédagogiques ou des rattachements à conserver.', 409)
      }
      if (keptRefs.students + keptRefs.pedagogicalRegistrations + keptRefs.grades === 0) {
        throw new DeleteRejected('Le niveau à conserver ne porte pas encore de parcours étudiant vérifié.', 409)
      }

      await tx.level.delete({ where: { id: candidate.id } })
      await tx.auditLog.create({
        data: {
          tenantId, userId: user.id, action: 'DELETE_DRAFT', entity: 'Level', entityId: candidate.id,
          details: JSON.stringify({ keptLevelId: kept.id, candidateSnapshot: candidate, references: candidateRefs }),
        },
      })
      return { deletedLevelId: candidate.id, keptLevelId: kept.id }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    return NextResponse.json({ data: result })
  } catch (error) {
    if (error instanceof DeleteRejected) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('Delete draft level error:', error)
    return NextResponse.json({ error: 'Suppression du brouillon impossible.' }, { status: 500 })
  }
}

export const DELETE = withTenantAuth(handleDelete, ['SUPER_ADMIN', 'ADMIN_INSTITUTION'])
