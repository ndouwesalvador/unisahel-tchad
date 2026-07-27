-- AlterTable
ALTER TABLE "exam_bank_questions" ADD COLUMN     "correctAnswer" INTEGER,
ADD COLUMN     "options" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "exam_results" ADD COLUMN     "answers" JSONB,
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "submittedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "online_exams" ADD COLUMN     "questionIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

