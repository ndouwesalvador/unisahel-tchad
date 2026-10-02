-- One annual administrative enrollment per student and institution.
-- Existing duplicate data, if any, must be reviewed explicitly rather than deleted by a deploy.
CREATE UNIQUE INDEX IF NOT EXISTS "AdministrativeRegistration_tenantId_studentId_academicYearId_key"
  ON "AdministrativeRegistration"("tenantId", "studentId", "academicYearId");
