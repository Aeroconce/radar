-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Vertical" ADD VALUE 'ATTENDANCE';
ALTER TYPE "Vertical" ADD VALUE 'MAINTENANCE';
ALTER TYPE "Vertical" ADD VALUE 'PHARMA_LOGISTICS';

-- AlterTable
ALTER TABLE "Tender" ADD COLUMN     "opportunitySignals" TEXT[] DEFAULT ARRAY[]::TEXT[];

