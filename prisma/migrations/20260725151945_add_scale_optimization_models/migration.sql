-- CreateTable
CREATE TABLE "CompetitorInsight" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "storeId" TEXT,
    "competitorHandle" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "benchmarkDelta" DOUBLE PRECISION,
    "features" JSONB,
    "source" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitorInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioSnapshot" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "storeCount" INTEGER NOT NULL,
    "totalRevenueEstimate" DOUBLE PRECISION,
    "totalChurnRisk" DOUBLE PRECISION,
    "topRecommendationType" TEXT,
    "topRiskStoreId" TEXT,
    "features" JSONB,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemMetric" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "latencyMs" DOUBLE PRECISION,
    "costCents" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'OK',
    "traceId" TEXT,
    "metadata" JSONB,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompetitorInsight_organizationId_storeId_metricName_idx" ON "CompetitorInsight"("organizationId", "storeId", "metricName");

-- CreateIndex
CREATE INDEX "CompetitorInsight_organizationId_capturedAt_idx" ON "CompetitorInsight"("organizationId", "capturedAt");

-- CreateIndex
CREATE INDEX "PortfolioSnapshot_organizationId_generatedAt_idx" ON "PortfolioSnapshot"("organizationId", "generatedAt");

-- CreateIndex
CREATE INDEX "SystemMetric_organizationId_operation_recordedAt_idx" ON "SystemMetric"("organizationId", "operation", "recordedAt");

-- CreateIndex
CREATE INDEX "SystemMetric_organizationId_module_recordedAt_idx" ON "SystemMetric"("organizationId", "module", "recordedAt");
