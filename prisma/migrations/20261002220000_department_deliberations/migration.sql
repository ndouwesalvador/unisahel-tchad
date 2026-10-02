ALTER TABLE "Deliberation" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;
ALTER TABLE "Deliberation" ADD COLUMN IF NOT EXISTS "juryMembers" JSONB;
CREATE INDEX IF NOT EXISTS "Deliberation_tenantId_academicYearId_departmentId_idx"
  ON "Deliberation"("tenantId", "academicYearId", "departmentId");
CREATE UNIQUE INDEX IF NOT EXISTS "Deliberation_department_session_unique"
  ON "Deliberation"("tenantId", "academicYearId", "departmentId", "type")
  WHERE "departmentId" IS NOT NULL;
