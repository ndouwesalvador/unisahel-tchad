import { Prisma } from '@prisma/client'

export type CurriculumElementSnapshot = {
  id: string
  code: string | null
  name: string
  coefficient: number
  hoursCM: number
  hoursTD: number
  hoursTP: number
  hoursStage: number
  hoursPersonal: number
  orderIndex: number
}

export type CurriculumUnitSnapshot = {
  id: string
  code: string | null
  name: string
  credits: number
  type: string
  compensable: boolean
  orderIndex: number
  semesterId: string
  elements: CurriculumElementSnapshot[]
}

export type CurriculumSemesterSnapshot = {
  id: string
  code: string | null
  name: string
  orderIndex: number
  units: CurriculumUnitSnapshot[]
}

export type CurriculumSnapshot = {
  schemaVersion: 1
  capturedAt: string
  program: { id: string; code: string | null; name: string }
  level: { id: string; code: string | null; name: string; orderIndex: number }
  semesters: CurriculumSemesterSnapshot[]
}

type CurriculumClient = Pick<Prisma.TransactionClient, 'level' | 'curriculumVersion'>

export async function buildCurriculumSnapshot(
  client: CurriculumClient,
  tenantId: string,
  programId: string,
  levelId: string,
): Promise<CurriculumSnapshot> {
  const level = await client.level.findFirst({
    where: { id: levelId, programId, program: { tenantId } },
    select: {
      id: true,
      code: true,
      name: true,
      orderIndex: true,
      program: { select: { id: true, code: true, name: true } },
      semesters: {
        where: { isActive: true },
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          code: true,
          name: true,
          orderIndex: true,
          teachingUnits: {
            where: { isActive: true },
            orderBy: { orderIndex: 'asc' },
            select: {
              id: true,
              code: true,
              name: true,
              credits: true,
              type: true,
              compensable: true,
              orderIndex: true,
              courseElements: {
                where: { isActive: true },
                orderBy: { orderIndex: 'asc' },
                select: {
                  id: true,
                  code: true,
                  name: true,
                  coefficient: true,
                  hoursCM: true,
                  hoursTD: true,
                  hoursTP: true,
                  hoursStage: true,
                  hoursPersonal: true,
                  orderIndex: true,
                },
              },
            },
          },
        },
      },
    },
  })
  if (!level) throw new Error('CURRICULUM_LEVEL_NOT_FOUND')

  return {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    program: level.program,
    level: { id: level.id, code: level.code, name: level.name, orderIndex: level.orderIndex },
    semesters: level.semesters.map((semester) => ({
      id: semester.id,
      code: semester.code,
      name: semester.name,
      orderIndex: semester.orderIndex,
      units: semester.teachingUnits.map((unit) => ({
        id: unit.id,
        code: unit.code,
        name: unit.name,
        credits: unit.credits,
        type: unit.type,
        compensable: unit.compensable,
        orderIndex: unit.orderIndex,
        semesterId: semester.id,
        elements: unit.courseElements,
      })),
    })),
  }
}

export async function ensureFrozenCurriculumVersion(
  client: CurriculumClient,
  input: {
    tenantId: string
    academicYearId: string
    programId: string
    levelId: string
    createdById?: string | null
  },
) {
  const existing = await client.curriculumVersion.findFirst({
    where: {
      tenantId: input.tenantId,
      academicYearId: input.academicYearId,
      programId: input.programId,
      levelId: input.levelId,
      status: { in: ['PUBLISHED', 'FROZEN'] },
    },
    orderBy: { version: 'desc' },
  })
  if (existing) {
    return existing.status === 'FROZEN' ? existing : client.curriculumVersion.update({
      where: { id: existing.id },
      data: { status: 'FROZEN', frozenAt: new Date() },
    })
  }

  const snapshot = await buildCurriculumSnapshot(client, input.tenantId, input.programId, input.levelId)
  try {
    return await client.curriculumVersion.create({
      data: {
        tenantId: input.tenantId,
        academicYearId: input.academicYearId,
        programId: input.programId,
        levelId: input.levelId,
        version: 1,
        status: 'FROZEN',
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
        createdById: input.createdById ?? null,
      },
    })
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error
    const concurrent = await client.curriculumVersion.findFirst({
      where: {
        tenantId: input.tenantId,
        academicYearId: input.academicYearId,
        programId: input.programId,
        levelId: input.levelId,
        status: { in: ['PUBLISHED', 'FROZEN'] },
      },
      orderBy: { version: 'desc' },
    })
    if (!concurrent) throw error
    return concurrent
  }
}

export function parseCurriculumSnapshot(value: Prisma.JsonValue | null | undefined): CurriculumSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const candidate = value as unknown as Partial<CurriculumSnapshot>
  if (candidate.schemaVersion !== 1 || !candidate.program || !candidate.level || !Array.isArray(candidate.semesters)) return null
  return candidate as CurriculumSnapshot
}

export function curriculumIndex(snapshot: CurriculumSnapshot | null) {
  const units = new Map<string, CurriculumUnitSnapshot>()
  const elements = new Map<string, CurriculumElementSnapshot & { teachingUnitId: string; semesterId: string }>()
  const semesters = new Map<string, CurriculumSemesterSnapshot>()
  for (const semester of snapshot?.semesters ?? []) {
    semesters.set(semester.id, semester)
    for (const unit of semester.units) {
      units.set(unit.id, unit)
      for (const element of unit.elements) {
        elements.set(element.id, { ...element, teachingUnitId: unit.id, semesterId: semester.id })
      }
    }
  }
  return { units, elements, semesters }
}
