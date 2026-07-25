-- CreateEnum
CREATE TYPE "InsightType" AS ENUM ('ANOMALY', 'OPPORTUNITY', 'RISK', 'INFO');

-- CreateEnum
CREATE TYPE "InsightSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "InsightStatus" AS ENUM ('OPEN', 'DISMISSED', 'SNOOZED', 'RESOLVED');

-- CreateTable
CREATE TABLE "BusinessInsight" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "storeId" TEXT,
    "type" "InsightType" NOT NULL,
    "severity" "InsightSeverity" NOT NULL,
    "status" "InsightStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence" JSONB,
    "deepLink" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dismissedAt" TIMESTAMP(3),
    "snoozedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessInsight_organizationId_status_generatedAt_idx" ON "BusinessInsight"("organizationId", "status", "generatedAt");

-- CreateIndex
CREATE INDEX "BusinessInsight_organizationId_storeId_type_status_idx" ON "BusinessInsight"("organizationId", "storeId", "type", "status");
