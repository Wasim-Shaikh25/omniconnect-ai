-- CreateEnum
CREATE TYPE "BusinessObjective" AS ENUM ('GROWTH', 'REVENUE', 'ENGAGEMENT', 'RETENTION', 'SUPPORT', 'BRAND');

-- CreateEnum
CREATE TYPE "DailyActionStatus" AS ENUM ('PENDING', 'DONE', 'SKIPPED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ActionOutcomeStatus" AS ENUM ('PENDING', 'IMPROVED', 'NO_CHANGE', 'WORSENED', 'CANCELLED');

-- AlterTable
ALTER TABLE "BrainConversationMemory" ADD COLUMN     "dailyActionId" TEXT,
ADD COLUMN     "outcomeId" TEXT;

-- AlterTable
ALTER TABLE "Recommendation" ADD COLUMN     "businessObjective" "BusinessObjective",
ADD COLUMN     "competitorContext" TEXT,
ADD COLUMN     "confidenceSignals" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "marketContext" TEXT,
ADD COLUMN     "reasoning" TEXT,
ADD COLUMN     "selfContext" TEXT;

-- CreateTable
CREATE TABLE "DailyAction" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "storeId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "objective" "BusinessObjective" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "priority" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sourceSignals" JSONB,
    "suggestedAction" TEXT,
    "deepLink" TEXT,
    "status" "DailyActionStatus" NOT NULL DEFAULT 'PENDING',
    "metricName" TEXT,
    "completedAt" TIMESTAMP(3),
    "skippedAt" TIMESTAMP(3),
    "feedback" TEXT,
    "outcomeId" TEXT,
    "generatedForDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionOutcome" (
    "id" TEXT NOT NULL,
    "actionId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "storeId" TEXT,
    "metricName" TEXT,
    "metricBefore" JSONB,
    "metricAfter" JSONB,
    "observationWindowHours" INTEGER NOT NULL DEFAULT 48,
    "measuredAt" TIMESTAMP(3),
    "status" "ActionOutcomeStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Journey" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "customerId" TEXT,
    "externalUserId" TEXT,
    "channel" TEXT,
    "outcome" TEXT NOT NULL DEFAULT 'OPEN',
    "attributedRevenue" DOUBLE PRECISION,
    "attributedPostId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Journey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JourneyStep" (
    "id" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "externalId" TEXT,
    "channel" TEXT,
    "details" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JourneyStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActionOutcome_actionId_key" ON "ActionOutcome"("actionId");

-- CreateIndex
CREATE INDEX "DailyAction_organizationId_status_createdAt_idx" ON "DailyAction"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "DailyAction_organizationId_storeId_status_generatedForDate_idx" ON "DailyAction"("organizationId", "storeId", "status", "generatedForDate");

-- CreateIndex
CREATE INDEX "ActionOutcome_organizationId_storeId_status_idx" ON "ActionOutcome"("organizationId", "storeId", "status");

-- CreateIndex
CREATE INDEX "Journey_organizationId_storeId_customerId_idx" ON "Journey"("organizationId", "storeId", "customerId");

-- CreateIndex
CREATE INDEX "Journey_storeId_externalUserId_idx" ON "Journey"("storeId", "externalUserId");

-- CreateIndex
CREATE INDEX "JourneyStep_journeyId_occurredAt_idx" ON "JourneyStep"("journeyId", "occurredAt");

-- CreateIndex
CREATE INDEX "Recommendation_organizationId_businessObjective_status_idx" ON "Recommendation"("organizationId", "businessObjective", "status");

-- AddForeignKey
ALTER TABLE "JourneyStep" ADD CONSTRAINT "JourneyStep_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
