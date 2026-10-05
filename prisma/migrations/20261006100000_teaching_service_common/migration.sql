ALTER TABLE "TeachingService" ADD COLUMN IF NOT EXISTS "isCommon" BOOLEAN NOT NULL DEFAULT false;

-- Backfill assignments previously stored only on CourseElement.teacherId.
-- The teacher workspace reads annual services, so preserve those existing
-- maquette assignments as immediately approved services for the current year.
INSERT INTO "TeachingService" (
  "id", "tenantId", "academicYearId", "courseElementId", "teacherId",
  "requestingDepartmentId", "homeDepartmentId", "plannedHours", "requestReason",
  "isCommon", "status", "requestedById", "centralDecidedById",
  "centralDecisionReason", "centralDecidedAt", "createdAt", "updatedAt"
)
SELECT
  md5('legacy-teaching-service:' || ay."id" || ':' || ce."id" || ':' || ce."teacherId"),
  p."tenantId", ay."id", ce."id", ce."teacherId",
  p."departmentId", t."departmentId",
  GREATEST(1, COALESCE(ce."hoursCM", 0) + COALESCE(ce."hoursTD", 0) + COALESCE(ce."hoursTP", 0) + COALESCE(ce."hoursStage", 0) + COALESCE(ce."hoursPersonal", 0)),
  'Affectation historique depuis la maquette', false, 'APPROVED', ce."teacherId", ce."teacherId",
  'Rétrocompatibilité maquette', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "CourseElement" ce
JOIN "TeachingUnit" tu ON tu."id" = ce."teachingUnitId"
JOIN "Semester" se ON se."id" = tu."semesterId"
JOIN "Level" le ON le."id" = se."levelId"
JOIN "Program" p ON p."id" = le."programId"
JOIN "Teacher" t ON t."id" = ce."teacherId"
JOIN "AcademicYear" ay ON ay."tenantId" = p."tenantId" AND ay."isCurrent" = true
WHERE ce."teacherId" IS NOT NULL
  AND p."departmentId" IS NOT NULL
  AND t."departmentId" IS NOT NULL
  AND p."isActive" = true
  AND t."isActive" = true
  AND NOT EXISTS (
    SELECT 1 FROM "TeachingService" ts
    WHERE ts."tenantId" = p."tenantId" AND ts."academicYearId" = ay."id"
      AND ts."courseElementId" = ce."id" AND ts."teacherId" = ce."teacherId"
      AND ts."status" <> 'REJECTED'
  );
