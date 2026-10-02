CREATE TABLE IF NOT EXISTS "TimetablePublication" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "departmentId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  "snapshot" JSONB NOT NULL,
  "reason" TEXT NOT NULL,
  "submittedById" TEXT,
  "reviewedById" TEXT,
  "reviewReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  CONSTRAINT "TimetablePublication_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TimetablePublication_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TimetablePublication_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TimetablePublication_status_check" CHECK ("status" IN ('LEGACY_BASELINE', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED'))
);
CREATE UNIQUE INDEX IF NOT EXISTS "TimetablePublication_tenantId_academicYearId_departmentId_version_key"
  ON "TimetablePublication"("tenantId", "academicYearId", "departmentId", "version");
CREATE INDEX IF NOT EXISTS "TimetablePublication_tenantId_academicYearId_status_idx"
  ON "TimetablePublication"("tenantId", "academicYearId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "TimetablePublication_one_pending_per_department"
  ON "TimetablePublication"("tenantId", "academicYearId", "departmentId") WHERE "status" = 'PENDING_REVIEW';

ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "recipientUserId" TEXT;
CREATE INDEX IF NOT EXISTS "notifications_tenantId_recipientUserId_isRead_idx"
  ON "notifications"("tenantId", "recipientUserId", "isRead");

-- This marker makes the compatibility snapshot a one-time backfill even though
-- production builds replay idempotent SQL (there is no Prisma migration history).
CREATE TABLE IF NOT EXISTS "DeploymentDataBackfill" ("key" TEXT PRIMARY KEY);
WITH marker AS (
  INSERT INTO "DeploymentDataBackfill"("key") VALUES ('timetable-legacy-baseline-v1')
  ON CONFLICT DO NOTHING RETURNING "key"
)
INSERT INTO "TimetablePublication" (
  "id", "tenantId", "academicYearId", "departmentId", "version", "status", "snapshot", "reason"
)
SELECT
  'legacy-' || md5(s."tenantId" || ':' || s."academicYearId" || ':' || p."departmentId"),
  s."tenantId", s."academicYearId", p."departmentId", 0, 'LEGACY_BASELINE',
  jsonb_agg(jsonb_build_object(
    'id', s."id", 'academicYearId', s."academicYearId", 'dayOfWeek', s."dayOfWeek",
    'startTime', s."startTime", 'endTime', s."endTime", 'type', s."type",
    'courseElementId', s."courseElementId", 'teacherId', s."teacherId",
    'roomId', s."roomId", 'programId', s."programId", 'levelId', s."levelId",
    'course', coalesce(c."name", ''),
    'teacher', trim(concat(coalesce(u."firstName", ''), ' ', coalesce(u."lastName", ''))),
    'room', coalesce(r."name", '')
  ) ORDER BY s."dayOfWeek", s."startTime", s."id"),
  'Reprise des créneaux déjà visibles avant la mise en place du circuit de publication.'
FROM "TimetableSlot" s
JOIN "Program" p ON p."id" = s."programId" AND p."tenantId" = s."tenantId" AND p."departmentId" IS NOT NULL
JOIN "Department" d ON d."id" = p."departmentId" AND d."tenantId" = s."tenantId"
JOIN "AcademicYear" y ON y."id" = s."academicYearId" AND y."tenantId" = s."tenantId"
LEFT JOIN "CourseElement" c ON c."id" = s."courseElementId"
LEFT JOIN "Teacher" t ON t."id" = s."teacherId" AND t."tenantId" = s."tenantId"
LEFT JOIN "User" u ON u."id" = t."userId"
LEFT JOIN "Room" r ON r."id" = s."roomId" AND r."tenantId" = s."tenantId"
WHERE EXISTS (SELECT 1 FROM marker)
GROUP BY s."tenantId", s."academicYearId", p."departmentId"
ON CONFLICT ("tenantId", "academicYearId", "departmentId", "version") DO NOTHING;
