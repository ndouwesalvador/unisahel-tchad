-- AlterTable
ALTER TABLE "Deliberation" ADD COLUMN     "levelId" TEXT,
ADD COLUMN     "programId" TEXT;

-- AlterTable
ALTER TABLE "TenantSettings" ADD COLUMN     "pedagogicalRegistrationOpen" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "scheduled_exams" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "teachingUnitId" TEXT,
    "examDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "roomId" TEXT,
    "supervisorId" TEXT,
    "sessionType" TEXT NOT NULL DEFAULT 'NORMALE',
    "status" TEXT NOT NULL DEFAULT 'PLANIFIE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_exams_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scheduled_exams_tenantId_idx" ON "scheduled_exams"("tenantId");

-- AddForeignKey
ALTER TABLE "scheduled_exams" ADD CONSTRAINT "scheduled_exams_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_exams" ADD CONSTRAINT "scheduled_exams_teachingUnitId_fkey" FOREIGN KEY ("teachingUnitId") REFERENCES "TeachingUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_exams" ADD CONSTRAINT "scheduled_exams_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_exams" ADD CONSTRAINT "scheduled_exams_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- CreateIndex (added mid-batch, table confirmed empty before applying)
CREATE UNIQUE INDEX "PedagogicalRegistration_studentId_teachingUnitId_academicY_key" ON "PedagogicalRegistration"("studentId", "teachingUnitId", "academicYearId");
