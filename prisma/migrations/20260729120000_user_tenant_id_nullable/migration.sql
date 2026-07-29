-- Make User.tenantId nullable so a SUPER_ADMIN can exist without being
-- tied to any single institution (platform-level account).
ALTER TABLE "User" ALTER COLUMN "tenantId" DROP NOT NULL;
