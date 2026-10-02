CREATE TABLE IF NOT EXISTS "TeachingService" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "courseElementId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "requestingDepartmentId" TEXT NOT NULL,
  "homeDepartmentId" TEXT NOT NULL,
  "plannedHours" DOUBLE PRECISION NOT NULL,
  "requestReason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING_HOME',
  "requestedById" TEXT NOT NULL,
  "homeDecidedById" TEXT,
  "homeDecisionReason" TEXT,
  "homeDecidedAt" TIMESTAMP(3),
  "centralDecidedById" TEXT,
  "centralDecisionReason" TEXT,
  "centralDecidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TeachingService_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TeachingService_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TeachingService_courseElementId_fkey" FOREIGN KEY ("courseElementId") REFERENCES "CourseElement"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TeachingService_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TeachingService_requestingDepartmentId_fkey" FOREIGN KEY ("requestingDepartmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TeachingService_homeDepartmentId_fkey" FOREIGN KEY ("homeDepartmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TeachingService_plannedHours_check" CHECK ("plannedHours" > 0 AND "plannedHours" <= 1000),
  CONSTRAINT "TeachingService_status_check" CHECK ("status" IN ('PENDING_HOME', 'PENDING_CENTRAL', 'APPROVED', 'REJECTED'))
);

CREATE INDEX IF NOT EXISTS "TeachingService_tenantId_academicYearId_status_idx" ON "TeachingService"("tenantId", "academicYearId", "status");
CREATE INDEX IF NOT EXISTS "TeachingService_tenantId_requestingDepartmentId_idx" ON "TeachingService"("tenantId", "requestingDepartmentId");
CREATE INDEX IF NOT EXISTS "TeachingService_tenantId_homeDepartmentId_idx" ON "TeachingService"("tenantId", "homeDepartmentId");
CREATE INDEX IF NOT EXISTS "TeachingService_tenantId_teacherId_academicYearId_idx" ON "TeachingService"("tenantId", "teacherId", "academicYearId");
CREATE UNIQUE INDEX IF NOT EXISTS "TeachingService_active_assignment_unique"
  ON "TeachingService"("tenantId", "academicYearId", "courseElementId", "teacherId")
  WHERE "status" <> 'REJECTED';
