-- AlterTable
ALTER TABLE "Tender" ADD COLUMN     "structuralScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "structuralTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "textScore" INTEGER NOT NULL DEFAULT 0;

