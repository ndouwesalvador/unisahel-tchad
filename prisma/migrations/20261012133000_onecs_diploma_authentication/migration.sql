ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ONECS';

ALTER TABLE "OfficialDocument"
ADD COLUMN IF NOT EXISTS "onecsStatus" TEXT,
ADD COLUMN IF NOT EXISTS "onecsReference" TEXT,
ADD COLUMN IF NOT EXISTS "onecsAuthenticatedBy" TEXT,
ADD COLUMN IF NOT EXISTS "onecsAuthenticatedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "onecsNote" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "OfficialDocument_onecsReference_key"
ON "OfficialDocument"("onecsReference");

CREATE INDEX IF NOT EXISTS "OfficialDocument_type_onecsStatus_createdAt_idx"
ON "OfficialDocument"("type", "onecsStatus", "createdAt");
