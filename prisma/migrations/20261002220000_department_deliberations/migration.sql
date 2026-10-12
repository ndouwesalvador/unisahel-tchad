ALTER TABLE "Deliberation" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;
ALTER TABLE "Deliberation" ADD COLUMN IF NOT EXISTS "juryMembers" JSONB;
CREATE INDEX IF NOT EXISTS "Deliberation_tenantId_academicYearId_departmentId_idx"
  ON "Deliberation"("tenantId", "academicYearId", "departmentId");
-- Do not recreate the former department-wide unique constraint here. It cannot
-- represent distinct juries for Licence, Master I and Master II, and the
-- production bootstrap deliberately replays this additive migration. The
-- mandatory jury-level migration later in the same bootstrap creates the
-- program/level-aware constraint plus a legacy-only department constraint.
