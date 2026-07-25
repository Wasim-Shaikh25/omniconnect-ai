-- CreateTable
CREATE TABLE "RecommendationConflict" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "storeId" TEXT,
    "winnerId" TEXT NOT NULL,
    "runnerUpId" TEXT,
    "winnerTitle" TEXT NOT NULL,
    "runnerUpTitle" TEXT,
    "reason" TEXT NOT NULL,
    "appliedPolicy" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationConflict_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecommendationConflict_organizationId_storeId_idx" ON "RecommendationConflict"("organizationId", "storeId");

-- CreateIndex
CREATE INDEX "RecommendationConflict_resolvedAt_idx" ON "RecommendationConflict"("resolvedAt");
