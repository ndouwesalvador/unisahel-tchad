-- DropForeignKey
ALTER TABLE "online_exams" DROP CONSTRAINT "online_exams_tenantId_fkey";

-- AddForeignKey
ALTER TABLE "online_exams" ADD CONSTRAINT "online_exams_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

