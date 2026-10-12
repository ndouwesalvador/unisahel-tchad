ALTER TABLE "internships"
ADD COLUMN "supervisorUserId" TEXT;

ALTER TABLE "internships"
ADD CONSTRAINT "internships_supervisorUserId_fkey"
FOREIGN KEY ("supervisorUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "internships_tenantId_supervisorUserId_idx"
ON "internships"("tenantId", "supervisorUserId");
