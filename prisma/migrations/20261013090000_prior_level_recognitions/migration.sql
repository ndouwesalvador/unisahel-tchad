CREATE TABLE IF NOT EXISTS "PriorLevelRecognition" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "levelId" TEXT NOT NULL,
  "sourceInstitution" TEXT NOT NULL,
  "sourceReference" TEXT NOT NULL,
  "sourceAcademicYear" TEXT NOT NULL,
  "sourceAwardDate" TIMESTAMP(3) NOT NULL,
  "creditsAcquired" INTEGER NOT NULL,
  "average" DOUBLE PRECISION,
  "status" TEXT NOT NULL DEFAULT 'APPROVED',
  "validatedById" TEXT NOT NULL,
  "validatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revocationReason" TEXT,
  "revokedById" TEXT,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PriorLevelRecognition_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PriorLevelRecognition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PriorLevelRecognition_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PriorLevelRecognition_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PriorLevelRecognition_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PriorLevelRecognition_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "PriorLevelRecognition_one_approved_level_key"
  ON "PriorLevelRecognition"("tenantId", "studentId", "programId", "levelId")
  WHERE "status" = 'APPROVED';
CREATE INDEX IF NOT EXISTS "PriorLevelRecognition_tenant_student_status_idx"
  ON "PriorLevelRecognition"("tenantId", "studentId", "status");
CREATE INDEX IF NOT EXISTS "PriorLevelRecognition_tenant_student_program_level_idx"
  ON "PriorLevelRecognition"("tenantId", "studentId", "programId", "levelId");
CREATE INDEX IF NOT EXISTS "PriorLevelRecognition_tenant_program_level_idx"
  ON "PriorLevelRecognition"("tenantId", "programId", "levelId");
