-- AlterTable
ALTER TABLE "Admission" ADD COLUMN     "niveau" TEXT,
ADD COLUMN     "numero" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'Premiere_inscription';

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'administratif',
ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'normal';
