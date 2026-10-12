ALTER TABLE "internships"
ADD COLUMN IF NOT EXISTS "supervisorUserId" TEXT;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'internships_supervisorUserId_fkey') THEN
    ALTER TABLE "internships"
    ADD CONSTRAINT "internships_supervisorUserId_fkey"
    FOREIGN KEY ("supervisorUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "internships_tenantId_supervisorUserId_idx"
ON "internships"("tenantId", "supervisorUserId");
