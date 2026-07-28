-- CreateTable
CREATE TABLE "IntelligenceFeedback" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "insightId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "understood" BOOLEAN NOT NULL,
    "hoursSaved" INTEGER NOT NULL DEFAULT 0,
    "falsePositive" BOOLEAN NOT NULL DEFAULT false,
    "falseNegative" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntelligenceFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntelligenceDismissal" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "insightId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntelligenceDismissal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalPlanVersion" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "workflowId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "holdoutPct" INTEGER NOT NULL DEFAULT 10,
    "postLaunchRecommendation" TEXT NOT NULL DEFAULT 'continue',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoalPlanVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolloutGate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RolloutGate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntelligenceFeedback_organizationId_idx" ON "IntelligenceFeedback"("organizationId");

-- CreateIndex
CREATE INDEX "IntelligenceFeedback_insightId_idx" ON "IntelligenceFeedback"("insightId");

-- CreateIndex
CREATE INDEX "IntelligenceFeedback_userId_idx" ON "IntelligenceFeedback"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "IntelligenceDismissal_insightId_key" ON "IntelligenceDismissal"("insightId");

-- CreateIndex
CREATE INDEX "IntelligenceDismissal_organizationId_idx" ON "IntelligenceDismissal"("organizationId");

-- CreateIndex
CREATE INDEX "IntelligenceDismissal_insightId_idx" ON "IntelligenceDismissal"("insightId");

-- CreateIndex
CREATE INDEX "IntelligenceDismissal_userId_idx" ON "IntelligenceDismissal"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GoalPlanVersion_workflowId_key" ON "GoalPlanVersion"("workflowId");

-- CreateIndex
CREATE INDEX "GoalPlanVersion_goalId_idx" ON "GoalPlanVersion"("goalId");

-- CreateIndex
CREATE INDEX "GoalPlanVersion_organizationId_idx" ON "GoalPlanVersion"("organizationId");

-- CreateIndex
CREATE INDEX "RolloutGate_organizationId_idx" ON "RolloutGate"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "RolloutGate_organizationId_name_key" ON "RolloutGate"("organizationId", "name");
