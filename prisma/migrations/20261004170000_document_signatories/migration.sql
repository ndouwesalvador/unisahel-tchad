ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "secondarySignerName" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "secondarySignerTitle" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "secondarySignature" TEXT;
