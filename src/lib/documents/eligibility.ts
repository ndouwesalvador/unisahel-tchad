import { db } from '@/lib/db'

export class AwardEligibilityError extends Error {}

export interface ValidatedLevelAward {
  programId: string
  levelId: string
  academicYearId: string
  deliberationId: string
  decisionId: string
  decision: string
  juryDate: Date
  average: number
  creditsAcquired: number
  creditsRequired: number
  session: 'NORMALE' | 'RATTRAPAGE'
}

export async function getValidatedLevelAward(input: {
  tenantId: string
  studentId: string
  academicYearId: string
  programId: string
  levelId: string
}): Promise<ValidatedLevelAward> {
  const { tenantId, studentId, academicYearId, programId, levelId } = input
  const registrations = await db.administrativeRegistration.findMany({
    where: { tenantId, studentId, academicYearId, programId, levelId, status: 'INSCRIT' },
    select: { id: true },
    take: 2,
  })
  if (registrations.length !== 1) {
    throw new AwardEligibilityError('Une inscription administrative validée et non ambiguë est requise pour ce niveau et cette année')
  }

  const settings = await db.tenantSettings.findUnique({
    where: { tenantId }, select: { creditsPerYear: true, passingGrade: true },
  })
  const creditsRequired = settings?.creditsPerYear ?? 60
  const passingGrade = settings?.passingGrade ?? 10
  if (!Number.isInteger(creditsRequired) || creditsRequired <= 0 || !Number.isFinite(passingGrade) || passingGrade < 0 || passingGrade > 20) {
    throw new AwardEligibilityError('Paramètres de crédits ou de validation invalides pour cet établissement')
  }

  const deliberation = await db.deliberation.findFirst({
    where: {
      tenantId, academicYearId, isLocked: true, status: 'TERMINEE',
      OR: [{ programId: null }, { programId }],
      AND: [{ OR: [{ levelId: null }, { levelId }] }],
      decisions: { some: { studentId } },
    },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    include: { decisions: { where: { studentId }, take: 2 } },
  })
  if (!deliberation || deliberation.decisions.length !== 1) {
    throw new AwardEligibilityError('Aucune décision finale de jury validée pour cet étudiant, ce niveau et cette année')
  }
  const decision = deliberation.decisions[0]
  if (!['ADMI', 'COMPENSE'].includes(decision.decision) || decision.creditsAcquired < creditsRequired) {
    throw new AwardEligibilityError('La décision du jury ne confirme pas tous les crédits requis sans dette')
  }

  const units = await db.pedagogicalRegistration.findMany({
    where: {
      studentId, academicYearId, status: 'ACTIVE',
      student: { tenantId },
      teachingUnit: { semester: { levelId, level: { programId, program: { tenantId } } } },
    },
    select: {
      teachingUnitId: true,
      teachingUnit: {
        select: { credits: true, courseElements: { select: { id: true, coefficient: true } } },
      },
    },
  })
  const unitIds = units.map((unit) => unit.teachingUnitId)
  if (units.length === 0 || new Set(unitIds).size !== units.length ||
      units.some((unit) => unit.teachingUnit.credits <= 0 || unit.teachingUnit.courseElements.length === 0 ||
        unit.teachingUnit.courseElements.some((element) => !Number.isFinite(element.coefficient) || element.coefficient <= 0))) {
    throw new AwardEligibilityError('La maquette ou les inscriptions pédagogiques du niveau sont incomplètes')
  }
  const totalRegisteredCredits = units.reduce((sum, unit) => sum + unit.teachingUnit.credits, 0)
  if (totalRegisteredCredits < creditsRequired) {
    throw new AwardEligibilityError(`Crédits inscrits insuffisants : ${totalRegisteredCredits}/${creditsRequired}`)
  }

  const elementIds = units.flatMap((unit) => unit.teachingUnit.courseElements.map((element) => element.id))
  const session = deliberation.type === 'RATTRAPAGE' ? 'RATTRAPAGE' : 'NORMALE'
  const grades = await db.grade.findMany({
    where: {
      studentId, academicYearId, session,
      teachingUnitId: { in: unitIds }, courseElementId: { in: elementIds },
      student: { tenantId },
    },
    select: { teachingUnitId: true, courseElementId: true, finalGrade: true, isLocked: true, isAbsent: true, isDefaillant: true },
  })
  const gradesByElement = new Map<string, number>()
  for (const grade of grades) {
    if (!grade.courseElementId || !grade.isLocked || grade.isAbsent || grade.isDefaillant ||
        grade.finalGrade === null || !Number.isFinite(grade.finalGrade) ||
        grade.finalGrade < 0 || grade.finalGrade > 20 || gradesByElement.has(grade.courseElementId)) {
      throw new AwardEligibilityError('Notes verrouillées incohérentes ou en double')
    }
    const expectedUnit = units.find((unit) => unit.teachingUnit.courseElements.some((element) => element.id === grade.courseElementId))
    if (!expectedUnit || grade.teachingUnitId !== expectedUnit.teachingUnitId) {
      throw new AwardEligibilityError('Une note ne correspond pas à son unité d’enseignement')
    }
    gradesByElement.set(grade.courseElementId, grade.finalGrade)
  }

  for (const unit of units) {
    const elements = unit.teachingUnit.courseElements
    if (elements.some((element) => !gradesByElement.has(element.id))) {
      throw new AwardEligibilityError('Toutes les matières inscrites doivent être notées et verrouillées')
    }
    const coefficients = elements.reduce((sum, element) => sum + element.coefficient, 0)
    const average = elements.reduce((sum, element) => sum + gradesByElement.get(element.id)! * element.coefficient, 0) / coefficients
    if (Math.round(average * 100) / 100 < passingGrade) {
      throw new AwardEligibilityError('Une unité d’enseignement reste en dette ou non validée')
    }
  }
  if (decision.creditsAcquired !== totalRegisteredCredits || decision.average === null ||
      !Number.isFinite(decision.average) || decision.average < 0 || decision.average > 20) {
    throw new AwardEligibilityError('La décision du jury ne correspond pas aux crédits vérifiés du niveau')
  }

  return {
    programId, levelId, academicYearId,
    deliberationId: deliberation.id,
    decisionId: decision.id,
    decision: decision.decision,
    juryDate: deliberation.date,
    average: decision.average,
    creditsAcquired: totalRegisteredCredits,
    creditsRequired,
    session,
  }
}

export async function getValidatedDiplomaAward(input: {
  tenantId: string
  studentId: string
  academicYearId: string
}) {
  const { tenantId, studentId, academicYearId } = input
  const finalYearRegistrations = await db.administrativeRegistration.findMany({
    where: { tenantId, studentId, academicYearId, status: 'INSCRIT' },
    select: { programId: true, levelId: true }, take: 2,
  })
  if (finalYearRegistrations.length !== 1) {
    throw new AwardEligibilityError('Une inscription finale unique est requise pour l’année du diplôme')
  }
  const finalRegistration = finalYearRegistrations[0]
  const program = await db.program.findFirst({
    where: { id: finalRegistration.programId, tenantId },
    select: {
      id: true, name: true, diplomaType: true, duration: true,
      levels: { orderBy: [{ orderIndex: 'asc' }, { id: 'asc' }], select: { id: true, name: true, orderIndex: true } },
    },
  })
  if (!program || !program.diplomaType?.trim() || !Number.isInteger(program.duration) || program.duration < 1 ||
      program.levels.length !== program.duration ||
      new Set(program.levels.map((level) => level.orderIndex)).size !== program.levels.length) {
    throw new AwardEligibilityError('Le diplôme, la durée et l’ordre des niveaux doivent être configurés sans ambiguïté dans le programme')
  }
  if (program.levels.at(-1)?.id !== finalRegistration.levelId) {
    throw new AwardEligibilityError('L’étudiant n’est pas inscrit au dernier niveau du programme pour cette année')
  }

  const registrations = await db.administrativeRegistration.findMany({
    where: { tenantId, studentId, programId: program.id, status: 'INSCRIT', academicYear: { tenantId } },
    select: {
      academicYearId: true, levelId: true,
      academicYear: { select: { startDate: true } },
    },
  })
  const finalYear = registrations.find((registration) => registration.academicYearId === academicYearId && registration.levelId === finalRegistration.levelId)
  if (!finalYear) throw new AwardEligibilityError('Année de diplomation introuvable dans le parcours')

  const awards: ValidatedLevelAward[] = []
  let previousStartDate = Number.NEGATIVE_INFINITY
  for (const level of program.levels) {
    const candidates = registrations
      .filter((registration) => registration.levelId === level.id && registration.academicYear.startDate <= finalYear.academicYear.startDate)
      .sort((a, b) => b.academicYear.startDate.getTime() - a.academicYear.startDate.getTime())
    const chosen = candidates[0]
    if (!chosen || (level.id === finalRegistration.levelId && chosen.academicYearId !== academicYearId) ||
        chosen.academicYear.startDate.getTime() <= previousStartDate) {
      throw new AwardEligibilityError(`Le niveau ${level.name} n’a pas de validation chronologique complète dans ce programme`)
    }
    const award = await getValidatedLevelAward({
      tenantId, studentId, academicYearId: chosen.academicYearId, programId: program.id, levelId: level.id,
    })
    awards.push(award)
    previousStartDate = chosen.academicYear.startDate.getTime()
  }

  return {
    program: { id: program.id, name: program.name, diplomaType: program.diplomaType.trim() },
    finalLevel: program.levels.at(-1)!,
    awards,
    creditsAcquired: awards.reduce((sum, award) => sum + award.creditsAcquired, 0),
    creditsRequired: awards.reduce((sum, award) => sum + award.creditsRequired, 0),
    finalDecision: awards.at(-1)!,
  }
}
