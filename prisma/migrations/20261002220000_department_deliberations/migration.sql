ALTER TABLE "Deliberation" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;
ALTER TABLE "Deliberation" ADD COLUMN IF NOT EXISTS "juryMembers" JSONB;
CREATE INDEX IF NOT EXISTS "Deliberation_tenantId_academicYearId_departmentId_idx"
  ON "Deliberation"("tenantId", "academicYearId", "departmentId");
-- This legacy constraint pre-dates program/level-scoped juries. The production
-- bootstrap replays additive migrations, so do not recreate the obsolete broad
-- department constraint once the scoped columns already exist. A later
-- migration replaces it with the program/level-aware indexes.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Deliberation'
      AND column_name = 'programId'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "Deliberation_department_session_unique"
      ON "Deliberation"("tenantId", "academicYearId", "departmentId", "type")
      WHERE "departmentId" IS NOT NULL;
  END IF;
END $$;
