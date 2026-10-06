CREATE TABLE IF NOT EXISTS "JuryAssignment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "departmentId" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "levelId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JuryAssignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "JuryAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "JuryAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "JuryAssignment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "JuryAssignment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "JuryAssignment_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "JuryAssignment_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "JuryAssignment_tenantId_userId_academicYearId_levelId_key"
  ON "JuryAssignment"("tenantId", "userId", "academicYearId", "levelId");
CREATE INDEX IF NOT EXISTS "JuryAssignment_tenantId_academicYearId_departmentId_idx"
  ON "JuryAssignment"("tenantId", "academicYearId", "departmentId");
CREATE INDEX IF NOT EXISTS "JuryAssignment_tenantId_academicYearId_programId_idx"
  ON "JuryAssignment"("tenantId", "academicYearId", "programId");

-- Preserve the actual working perimeter of existing jury accounts. A jury
-- which already entered or locked grades is assigned only to those levels.
INSERT INTO "JuryAssignment" ("id", "tenantId", "userId", "academicYearId", "departmentId", "programId", "levelId")
SELECT DISTINCT
  'jury_' || md5(u."id" || g."academicYearId" || l."id"),
  u."tenantId",
  u."id",
  g."academicYearId",
  p."departmentId",
  p."id",
  l."id"
FROM "User" u
JOIN "Grade" g ON g."enteredBy" = u."id" OR g."validatedBy" = u."id" OR g."lockedBy" = u."id"
JOIN "TeachingUnit" tu ON tu."id" = g."teachingUnitId"
JOIN "Semester" s ON s."id" = tu."semesterId"
JOIN "Level" l ON l."id" = s."levelId"
JOIN "Program" p ON p."id" = l."programId"
WHERE u."role" = 'JURY' AND u."tenantId" IS NOT NULL AND p."departmentId" IS NOT NULL
ON CONFLICT ("tenantId", "userId", "academicYearId", "levelId") DO NOTHING;

-- Existing deliberations are narrowed when all their students belong to the
-- same programme and level. This preserves the already finalized Master GE PV
-- while preventing it from being treated as faculty- or department-wide.
UPDATE "Deliberation" d
SET "programId" = cohort."programId", "levelId" = cohort."levelId"
FROM (
  SELECT dd."deliberationId",
    MIN(st."currentProgramId") AS "programId",
    MIN(st."currentLevelId") AS "levelId"
  FROM "DeliberationDecision" dd
  JOIN "Student" st ON st."id" = dd."studentId"
  GROUP BY dd."deliberationId"
  HAVING COUNT(DISTINCT st."currentProgramId") = 1
    AND COUNT(DISTINCT st."currentLevelId") = 1
) cohort
WHERE d."id" = cohort."deliberationId"
  AND d."programId" IS NULL
  AND d."levelId" IS NULL;

-- A department may have distinct juries for Licence, Master, or any other
-- level. Keep legacy department-wide sessions unique while allowing one
-- official session per exact programme/level perimeter.
DROP INDEX IF EXISTS "Deliberation_department_session_unique";
CREATE UNIQUE INDEX IF NOT EXISTS "Deliberation_program_level_session_unique"
  ON "Deliberation"("tenantId", "academicYearId", "departmentId", "programId", "levelId", "type")
  WHERE "departmentId" IS NOT NULL AND "programId" IS NOT NULL AND "levelId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Deliberation_legacy_department_session_unique"
  ON "Deliberation"("tenantId", "academicYearId", "departmentId", "type")
  WHERE "departmentId" IS NOT NULL AND "programId" IS NULL AND "levelId" IS NULL;

