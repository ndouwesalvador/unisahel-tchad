-- Additive identifiers: existing institution records remain unchanged and
-- remain visible to administration, but are not attributed to a teacher.
ALTER TABLE "attendances" ADD COLUMN IF NOT EXISTS "studentId" TEXT;
ALTER TABLE "attendances" ADD COLUMN IF NOT EXISTS "courseElementId" TEXT;
ALTER TABLE "attendances" ADD COLUMN IF NOT EXISTS "academicYearId" TEXT;
ALTER TABLE "attendances" ADD COLUMN IF NOT EXISTS "teacherId" TEXT;
CREATE INDEX IF NOT EXISTS "attendances_tenantId_courseElementId_academicYearId_idx" ON "attendances"("tenantId", "courseElementId", "academicYearId");
CREATE UNIQUE INDEX IF NOT EXISTS "attendances_teacher_session_key" ON "attendances"("tenantId", "studentId", "courseElementId", "academicYearId", "date", "timeSlot");

ALTER TABLE "online_exams" ADD COLUMN IF NOT EXISTS "courseElementId" TEXT;
ALTER TABLE "online_exams" ADD COLUMN IF NOT EXISTS "teacherId" TEXT;
CREATE INDEX IF NOT EXISTS "online_exams_tenantId_courseElementId_idx" ON "online_exams"("tenantId", "courseElementId");

ALTER TABLE "exam_bank_questions" ADD COLUMN IF NOT EXISTS "courseElementId" TEXT;
ALTER TABLE "exam_bank_questions" ADD COLUMN IF NOT EXISTS "teacherId" TEXT;
CREATE INDEX IF NOT EXISTS "exam_bank_questions_tenantId_courseElementId_idx" ON "exam_bank_questions"("tenantId", "courseElementId");

ALTER TABLE "communications" ADD COLUMN IF NOT EXISTS "courseElementId" TEXT;
ALTER TABLE "communications" ADD COLUMN IF NOT EXISTS "teacherId" TEXT;
CREATE INDEX IF NOT EXISTS "communications_tenantId_teacherId_idx" ON "communications"("tenantId", "teacherId");
