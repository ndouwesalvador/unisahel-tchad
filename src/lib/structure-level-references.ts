import type { Prisma } from '@prisma/client'

export async function getLevelReferences(db: Prisma.TransactionClient, tenantId: string, levelId: string) {
  const [semesters, students, administrativeRegistrations, admissions, campaigns, deliberations, feeStructures, timetableSlots, pedagogicalRegistrations, grades, scheduledExams] = await Promise.all([
    db.semester.count({ where: { levelId } }),
    db.student.count({ where: { tenantId, currentLevelId: levelId } }),
    db.administrativeRegistration.count({ where: { tenantId, levelId } }),
    db.admission.count({ where: { tenantId, levelId } }),
    db.admissionCampaign.count({ where: { tenantId, levelId } }),
    db.deliberation.count({ where: { tenantId, levelId } }),
    db.feeStructure.count({ where: { tenantId, levelId } }),
    db.timetableSlot.count({ where: { tenantId, levelId } }),
    db.pedagogicalRegistration.count({ where: { teachingUnit: { semester: { levelId } } } }),
    db.grade.count({ where: { OR: [
      { teachingUnit: { semester: { levelId } } },
      { courseElement: { teachingUnit: { semester: { levelId } } } },
    ] } }),
    db.scheduledExam.count({ where: { tenantId, teachingUnit: { semester: { levelId } } } }),
  ])
  return { semesters, students, administrativeRegistrations, admissions, campaigns, deliberations, feeStructures, timetableSlots, pedagogicalRegistrations, grades, scheduledExams }
}

export function hasExternalLevelReferences(references: Awaited<ReturnType<typeof getLevelReferences>>): boolean {
  return Object.entries(references).some(([key, count]) => key !== 'semesters' && count > 0)
}
