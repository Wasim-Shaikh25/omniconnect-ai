-- CreateEnum
CREATE TYPE "PredictionType" AS ENUM ('CHURN', 'STOCK_OUT', 'PURCHASE_PROPENSITY', 'REVENUE_FORECAST');

-- CreateEnum
CREATE TYPE "PredictionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'ABSTAINED');

-- CreateEnum
CREATE TYPE "HypothesisStatus" AS ENUM ('PROPOSED', 'VALIDATED', 'REFUTED');

-- CreateTable
CREATE TABLE "Prediction" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "storeId" TEXT,
    "predictionType" "PredictionType" NOT NULL,
    "targetEntityType" TEXT,
    "targetEntityId" TEXT,
    "horizon" TEXT NOT NULL,
    "estimate" DOUBLE PRECISION NOT NULL,
    "probability" DOUBLE PRECISION,
    "lowerBound" DOUBLE PRECISION,
    "upperBound" DOUBLE PRECISION,
    "features" JSONB,
    "calibration" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "PredictionStatus" NOT NULL DEFAULT 'ACTIVE',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hypothesis" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "storeId" TEXT,
    "insightId" TEXT,
    "statement" TEXT NOT NULL,
    "features" JSONB,
    "expectedOutcome" TEXT,
    "status" "HypothesisStatus" NOT NULL DEFAULT 'PROPOSED',
    "validatedAt" TIMESTAMP(3),
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hypothesis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessLearning" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "storeId" TEXT,
    "ruleName" TEXT NOT NULL,
    "condition" JSONB,
    "effect" JSONB,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastOutcomeAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessLearning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Prediction_organizationId_status_expiresAt_idx" ON "Prediction"("organizationId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "Prediction_organizationId_storeId_predictionType_status_idx" ON "Prediction"("organizationId", "storeId", "predictionType", "status");

-- CreateIndex
CREATE INDEX "Hypothesis_organizationId_status_createdAt_idx" ON "Hypothesis"("organizationId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Hypothesis_organizationId_storeId_insightId_idx" ON "Hypothesis"("organizationId", "storeId", "insightId");

-- CreateIndex
CREATE INDEX "BusinessLearning_organizationId_ruleName_idx" ON "BusinessLearning"("organizationId", "ruleName");

-- CreateIndex
CREATE INDEX "BusinessLearning_organizationId_storeId_ruleName_idx" ON "BusinessLearning"("organizationId", "storeId", "ruleName");
