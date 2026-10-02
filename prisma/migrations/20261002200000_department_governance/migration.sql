-- Nullable scope columns preserve existing accounts. A faculty/department role
-- without a valid scope is denied access by the application until assigned.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "facultyId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;

CREATE INDEX IF NOT EXISTS "User_tenantId_facultyId_idx" ON "User"("tenantId", "facultyId");
CREATE INDEX IF NOT EXISTS "User_tenantId_departmentId_idx" ON "User"("tenantId", "departmentId");

DO $$ BEGIN
  ALTER TABLE "User" ADD CONSTRAINT "User_facultyId_fkey"
    FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey"
    FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
