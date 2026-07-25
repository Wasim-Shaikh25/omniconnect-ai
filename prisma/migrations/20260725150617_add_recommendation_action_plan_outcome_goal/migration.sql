-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'EDITED', 'DISMISSED', 'SNOOZED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RiskTier" AS ENUM ('TIER_1', 'TIER_2', 'TIER_3', 'TIER_4');

-- CreateEnum
CREATE TYPE "ActionPlanStatus" AS ENUM ('DRAFT', 'APPROVED', 'EXECUTED', 'FAILED', 'STOPPED');

-- CreateEnum
CREATE TYPE "DecisionType" AS ENUM ('APPROVED', 'EDITED', 'ASSIGNED', 'SNOOZED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "OutcomeStatus" AS ENUM ('PENDING', 'SUCCESS', 'PARTIAL', 'FAILURE', 'ABORTED');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ACHIEVED', 'MISSED', 'ABANDONED');

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "storeId" TEXT,
    "insightId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "objective" TEXT,
    "reasonCodes" TEXT[],
    "impactRange" JSONB,
    "confidence" DOUBLE PRECISION,
    "effort" TEXT,
    "urgency" TEXT,
    "riskTier" "RiskTier" NOT NULL,
    "eligibility" JSONB,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'PROPOSED',
    "actionType" TEXT NOT NULL,
    "actionParams" JSONB,
    "deepLink" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dismissedAt" TIMESTAMP(3),
    "snoozedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionPlan" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "storeId" TEXT,
    "recommendationId" TEXT,
    "title" TEXT NOT NULL,
    "steps" JSONB,
    "targetMetric" TEXT,
    "expectedImpact" JSONB,
    "status" "ActionPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedBy" TEXT,
    "executedAt" TIMESTAMP(3),
    "stoppedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actionPlanId" TEXT NOT NULL,
    "recommendationId" TEXT,
    "decisionType" "DecisionType" NOT NULL,
    "reason" TEXT,
    "decidedBy" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outcome" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "storeId" TEXT,
    "actionPlanId" TEXT NOT NULL,
    "metricName" TEXT,
    "beforeValue" DOUBLE PRECISION,
    "afterValue" DOUBLE PRECISION,
    "observationWindowDays" INTEGER NOT NULL DEFAULT 7,
    "measuredAt" TIMESTAMP(3),
    "status" "OutcomeStatus" NOT NULL DEFAULT 'PENDING',
    "attribution" TEXT,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Outcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "storeId" TEXT,
    "name" TEXT NOT NULL,
    "targetMetric" TEXT NOT NULL,
    "baseline" DOUBLE PRECISION,
    "target" DOUBLE PRECISION,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "ownerUserId" TEXT,
    "pacing" JSONB,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Recommendation_organizationId_status_generatedAt_idx" ON "Recommendation"("organizationId", "status", "generatedAt");

-- CreateIndex
CREATE INDEX "Recommendation_organizationId_storeId_status_riskTier_idx" ON "Recommendation"("organizationId", "storeId", "status", "riskTier");

-- CreateIndex
CREATE INDEX "ActionPlan_organizationId_storeId_status_createdAt_idx" ON "ActionPlan"("organizationId", "storeId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Decision_organizationId_actionPlanId_idx" ON "Decision"("organizationId", "actionPlanId");

-- CreateIndex
CREATE INDEX "Outcome_organizationId_storeId_actionPlanId_idx" ON "Outcome"("organizationId", "storeId", "actionPlanId");

-- CreateIndex
CREATE INDEX "Goal_organizationId_status_endDate_idx" ON "Goal"("organizationId", "status", "endDate");

-- CreateIndex
CREATE INDEX "Goal_organizationId_storeId_targetMetric_status_idx" ON "Goal"("organizationId", "storeId", "targetMetric", "status");
