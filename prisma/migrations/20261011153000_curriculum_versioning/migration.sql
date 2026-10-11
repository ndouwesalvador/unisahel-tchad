-- Additive annual curriculum versioning. No historical row is deleted or
-- rewritten destructively; existing enrollments are backfilled by the build
-- companion after this schema is available.
CREATE TABLE IF NOT EXISTS "CurriculumVersion" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "levelId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'FROZEN',
  "snapshot" JSONB NOT NULL,
  "createdById" TEXT,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "frozenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CurriculumVersion_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AdministrativeRegistration" ADD COLUMN IF NOT EXISTS "curriculumVersionId" TEXT;
ALTER TABLE "Semester" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "TeachingUnit" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "CourseElement" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Grade" ADD COLUMN IF NOT EXISTS "curriculumVersionId" TEXT;
ALTER TABLE "Grade" ADD COLUMN IF NOT EXISTS "unitCodeSnapshot" TEXT;
ALTER TABLE "Grade" ADD COLUMN IF NOT EXISTS "unitNameSnapshot" TEXT;
ALTER TABLE "Grade" ADD COLUMN IF NOT EXISTS "unitCreditsSnapshot" INTEGER;
ALTER TABLE "Grade" ADD COLUMN IF NOT EXISTS "elementCodeSnapshot" TEXT;
ALTER TABLE "Grade" ADD COLUMN IF NOT EXISTS "elementNameSnapshot" TEXT;
ALTER TABLE "Grade" ADD COLUMN IF NOT EXISTS "elementCoefficientSnapshot" DOUBLE PRECISION;

CREATE UNIQUE INDEX IF NOT EXISTS "CurriculumVersion_tenantId_academicYearId_programId_levelId_version_key"
  ON "CurriculumVersion"("tenantId", "academicYearId", "programId", "levelId", "version");
CREATE INDEX IF NOT EXISTS "CurriculumVersion_tenantId_academicYearId_status_idx"
  ON "CurriculumVersion"("tenantId", "academicYearId", "status");
CREATE INDEX IF NOT EXISTS "CurriculumVersion_programId_levelId_academicYearId_idx"
  ON "CurriculumVersion"("programId", "levelId", "academicYearId");
CREATE INDEX IF NOT EXISTS "AdministrativeRegistration_curriculumVersionId_idx"
  ON "AdministrativeRegistration"("curriculumVersionId");
CREATE INDEX IF NOT EXISTS "Grade_curriculumVersionId_idx" ON "Grade"("curriculumVersionId");
CREATE INDEX IF NOT EXISTS "Semester_levelId_isActive_orderIndex_idx" ON "Semester"("levelId", "isActive", "orderIndex");
CREATE INDEX IF NOT EXISTS "TeachingUnit_semesterId_isActive_orderIndex_idx" ON "TeachingUnit"("semesterId", "isActive", "orderIndex");
CREATE INDEX IF NOT EXISTS "CourseElement_teachingUnitId_isActive_orderIndex_idx" ON "CourseElement"("teachingUnitId", "isActive", "orderIndex");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CurriculumVersion_tenantId_fkey') THEN
    ALTER TABLE "CurriculumVersion" ADD CONSTRAINT "CurriculumVersion_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CurriculumVersion_academicYearId_fkey') THEN
    ALTER TABLE "CurriculumVersion" ADD CONSTRAINT "CurriculumVersion_academicYearId_fkey"
      FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CurriculumVersion_programId_fkey') THEN
    ALTER TABLE "CurriculumVersion" ADD CONSTRAINT "CurriculumVersion_programId_fkey"
      FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CurriculumVersion_levelId_fkey') THEN
    ALTER TABLE "CurriculumVersion" ADD CONSTRAINT "CurriculumVersion_levelId_fkey"
      FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AdministrativeRegistration_curriculumVersionId_fkey') THEN
    ALTER TABLE "AdministrativeRegistration" ADD CONSTRAINT "AdministrativeRegistration_curriculumVersionId_fkey"
      FOREIGN KEY ("curriculumVersionId") REFERENCES "CurriculumVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Grade_curriculumVersionId_fkey') THEN
    ALTER TABLE "Grade" ADD CONSTRAINT "Grade_curriculumVersionId_fkey"
      FOREIGN KEY ("curriculumVersionId") REFERENCES "CurriculumVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Existing grade rows receive immutable labels and weights immediately. The
-- annual version id is filled by the idempotent backfill companion.
UPDATE "Grade" AS g SET
  "unitCodeSnapshot" = COALESCE(g."unitCodeSnapshot", (SELECT u."code" FROM "TeachingUnit" u WHERE u."id" = g."teachingUnitId")),
  "unitNameSnapshot" = COALESCE(g."unitNameSnapshot", (SELECT u."name" FROM "TeachingUnit" u WHERE u."id" = g."teachingUnitId")),
  "unitCreditsSnapshot" = COALESCE(g."unitCreditsSnapshot", (SELECT u."credits" FROM "TeachingUnit" u WHERE u."id" = g."teachingUnitId")),
  "elementCodeSnapshot" = COALESCE(g."elementCodeSnapshot", (SELECT e."code" FROM "CourseElement" e WHERE e."id" = g."courseElementId")),
  "elementNameSnapshot" = COALESCE(g."elementNameSnapshot", (SELECT e."name" FROM "CourseElement" e WHERE e."id" = g."courseElementId")),
  "elementCoefficientSnapshot" = COALESCE(g."elementCoefficientSnapshot", (SELECT e."coefficient" FROM "CourseElement" e WHERE e."id" = g."courseElementId"));
