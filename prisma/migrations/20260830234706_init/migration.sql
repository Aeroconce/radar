-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'REVIEWER');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('NEW', 'IN_REVIEW', 'VIABLE', 'DISCARDED', 'SUBMITTED', 'AWARDED', 'LOST');

-- CreateEnum
CREATE TYPE "Vertical" AS ENUM ('APPOINTMENTS', 'FIXED_ASSETS', 'DOCUMENT_MGMT', 'QUALITY_ACCREDITATION', 'WEB_DEVELOPMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "BuyerType" AS ENUM ('HOSPITAL', 'HEALTH_SERVICE', 'MUNICIPAL_HEALTH', 'MUNICIPALITY', 'HIGHER_EDUCATION', 'PUBLIC_SERVICE', 'OTHER');

-- CreateEnum
CREATE TYPE "ProcessType" AS ENUM ('L1', 'LE', 'LP', 'LQ', 'LR', 'LS', 'OTHER');

-- CreateEnum
CREATE TYPE "AttachmentKind" AS ENUM ('BASES', 'ANNEX', 'FORUM', 'AWARD_ACT', 'OTHER');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('SWEEP', 'HISTORY', 'AWARDS', 'ALERTS', 'CLEANUP', 'SEED');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NEW_HIGH_AFFINITY', 'CLOSING_SOON', 'QUESTIONS_CLOSING', 'AWARD_PUBLISHED', 'DAILY_DIGEST');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'REVIEWER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tender" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "processType" "ProcessType" NOT NULL,
    "buyerOrganism" TEXT NOT NULL,
    "buyerUnit" TEXT NOT NULL DEFAULT '',
    "buyerCode" TEXT,
    "buyerType" "BuyerType" NOT NULL DEFAULT 'OTHER',
    "region" TEXT NOT NULL DEFAULT '',
    "estimatedAmount" DECIMAL(16,2),
    "currency" TEXT NOT NULL DEFAULT 'CLP',
    "durationValue" INTEGER,
    "durationUnit" TEXT,
    "requiresContract" BOOLEAN,
    "publishedAt" TIMESTAMP(3),
    "questionsUntil" TIMESTAMP(3),
    "answersAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "awardEstimatedAt" TIMESTAMP(3),
    "portalStatus" INTEGER,
    "vertical" "Vertical" NOT NULL DEFAULT 'OTHER',
    "affinityScore" INTEGER NOT NULL DEFAULT 0,
    "outOfScale" BOOLEAN NOT NULL DEFAULT false,
    "matchedTerms" TEXT[],
    "incumbentSignals" TEXT[],
    "items" JSONB,
    "raw" JSONB NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'NEW',

    CONSTRAINT "Tender_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeenTender" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "closesAt" TIMESTAMP(3),
    "portalStatus" INTEGER,
    "lastScore" INTEGER NOT NULL DEFAULT 0,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeenTender_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL,
    "reasons" TEXT[],
    "note" TEXT NOT NULL DEFAULT '',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "kind" "AttachmentKind" NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricalAward" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "buyerOrganism" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT '',
    "vertical" "Vertical" NOT NULL DEFAULT 'OTHER',
    "awardedAt" TIMESTAMP(3),
    "bidderCount" INTEGER,
    "estimatedNet" DECIMAL(16,2),
    "awardedNet" DECIMAL(16,2),
    "durationValue" INTEGER,
    "durationUnit" TEXT,
    "awardActUrl" TEXT,
    "raw" JSONB,

    CONSTRAINT "HistoricalAward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricalBid" (
    "id" TEXT NOT NULL,
    "awardId" TEXT NOT NULL,
    "supplierRut" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "amount" DECIMAL(16,2) NOT NULL,
    "unitPrice" BOOLEAN NOT NULL DEFAULT false,
    "result" TEXT NOT NULL,

    CONSTRAINT "HistoricalBid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffinityRule" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "vertical" "Vertical",
    "pattern" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffinityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "tenderId" TEXT,
    "payload" JSONB NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "providerId" TEXT,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRun" (
    "id" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "ok" BOOLEAN,
    "counters" JSONB,
    "error" TEXT,

    CONSTRAINT "JobRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "userName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "detail" TEXT NOT NULL,
    "ip" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Tender_code_key" ON "Tender"("code");

-- CreateIndex
CREATE INDEX "Tender_reviewStatus_idx" ON "Tender"("reviewStatus");

-- CreateIndex
CREATE INDEX "Tender_vertical_idx" ON "Tender"("vertical");

-- CreateIndex
CREATE INDEX "Tender_closesAt_idx" ON "Tender"("closesAt");

-- CreateIndex
CREATE INDEX "Tender_affinityScore_idx" ON "Tender"("affinityScore");

-- CreateIndex
CREATE INDEX "Tender_buyerType_idx" ON "Tender"("buyerType");

-- CreateIndex
CREATE INDEX "SeenTender_selected_idx" ON "SeenTender"("selected");

-- CreateIndex
CREATE INDEX "SeenTender_lastSeenAt_idx" ON "SeenTender"("lastSeenAt");

-- CreateIndex
CREATE INDEX "Review_tenderId_createdAt_idx" ON "Review"("tenderId", "createdAt");

-- CreateIndex
CREATE INDEX "Attachment_tenderId_idx" ON "Attachment"("tenderId");

-- CreateIndex
CREATE UNIQUE INDEX "HistoricalAward_code_key" ON "HistoricalAward"("code");

-- CreateIndex
CREATE INDEX "HistoricalAward_vertical_idx" ON "HistoricalAward"("vertical");

-- CreateIndex
CREATE INDEX "HistoricalAward_awardedAt_idx" ON "HistoricalAward"("awardedAt");

-- CreateIndex
CREATE INDEX "HistoricalBid_supplierRut_idx" ON "HistoricalBid"("supplierRut");

-- CreateIndex
CREATE INDEX "HistoricalBid_supplierName_idx" ON "HistoricalBid"("supplierName");

-- CreateIndex
CREATE INDEX "HistoricalBid_awardId_idx" ON "HistoricalBid"("awardId");

-- CreateIndex
CREATE INDEX "AffinityRule_kind_active_idx" ON "AffinityRule"("kind", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");

-- CreateIndex
CREATE INDEX "Notification_type_createdAt_idx" ON "Notification"("type", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_status_idx" ON "Notification"("status");

-- CreateIndex
CREATE INDEX "JobRun_type_startedAt_idx" ON "JobRun"("type", "startedAt");

-- CreateIndex
CREATE INDEX "AuditLog_at_idx" ON "AuditLog"("at");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricalBid" ADD CONSTRAINT "HistoricalBid_awardId_fkey" FOREIGN KEY ("awardId") REFERENCES "HistoricalAward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE SET NULL ON UPDATE CASCADE;
