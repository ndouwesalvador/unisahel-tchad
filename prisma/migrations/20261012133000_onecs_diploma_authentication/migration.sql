ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ONECS';

ALTER TABLE "OfficialDocument"
ADD COLUMN "onecsStatus" TEXT,
ADD COLUMN "onecsReference" TEXT,
ADD COLUMN "onecsAuthenticatedBy" TEXT,
ADD COLUMN "onecsAuthenticatedAt" TIMESTAMP(3),
ADD COLUMN "onecsNote" TEXT;

CREATE UNIQUE INDEX "OfficialDocument_onecsReference_key"
ON "OfficialDocument"("onecsReference");

CREATE INDEX "OfficialDocument_type_onecsStatus_createdAt_idx"
ON "OfficialDocument"("type", "onecsStatus", "createdAt");
