-- Make AuditLog.tenantId nullable for platform-level events with no single
-- institution (a SUPER_ADMIN signing in, creating a new tenant, etc).
ALTER TABLE "AuditLog" ALTER COLUMN "tenantId" DROP NOT NULL;
