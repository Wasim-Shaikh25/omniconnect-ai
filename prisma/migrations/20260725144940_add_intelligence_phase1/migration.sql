-- CreateEnum
CREATE TYPE "ConfidenceLevel" AS ENUM ('VERIFIED', 'PROBABLE', 'POSSIBLE', 'REJECTED');

-- CreateEnum
CREATE TYPE "LinkStatus" AS ENUM ('ACTIVE', 'PENDING', 'REVOKED');

-- CreateEnum
CREATE TYPE "DataQualitySeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "DataQualityStatus" AS ENUM ('OPEN', 'RESOLVED', 'IGNORED');

-- CreateEnum
CREATE TYPE "MetricSnapshotStatus" AS ENUM ('FRESH', 'STALE', 'MISSING');

-- CreateTable
CREATE TABLE "Signal" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "stage" TEXT,
    "relatedEntities" JSONB,
    "data" JSONB,
    "lineage" JSONB,
    "source" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "freshnessMs" INTEGER,
    "qualityStatus" TEXT,
    "quarantineReason" TEXT,
    "traceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Signal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityLink" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "storeId" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "linkType" TEXT NOT NULL,
    "confidence" "ConfidenceLevel" NOT NULL,
    "resolutionMethod" TEXT,
    "status" "LinkStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntityLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataQualityIssue" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "storeId" TEXT,
    "source" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metricName" TEXT,
    "severity" "DataQualitySeverity" NOT NULL,
    "impact" TEXT,
    "status" "DataQualityStatus" NOT NULL DEFAULT 'OPEN',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "DataQualityIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricDefinition" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "formula" TEXT,
    "grain" TEXT,
    "dimensions" TEXT[],
    "source" TEXT NOT NULL,
    "freshnessSlaMs" INTEGER NOT NULL DEFAULT 3600000,
    "owner" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricSnapshot" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "storeId" TEXT,
    "value" DECIMAL(12,4),
    "dimensions" JSONB,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "MetricSnapshotStatus" NOT NULL DEFAULT 'MISSING',
    "sourceIds" TEXT[],
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Signal_organizationId_storeId_subjectType_subjectId_idx" ON "Signal"("organizationId", "storeId", "subjectType", "subjectId");

-- CreateIndex
CREATE INDEX "Signal_storeId_eventType_ingestedAt_idx" ON "Signal"("storeId", "eventType", "ingestedAt");

-- CreateIndex
CREATE INDEX "Signal_organizationId_ingestedAt_idx" ON "Signal"("organizationId", "ingestedAt");

-- CreateIndex
CREATE INDEX "EntityLink_organizationId_sourceType_sourceId_idx" ON "EntityLink"("organizationId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "EntityLink_organizationId_targetType_targetId_idx" ON "EntityLink"("organizationId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "EntityLink_storeId_confidence_idx" ON "EntityLink"("storeId", "confidence");

-- CreateIndex
CREATE INDEX "DataQualityIssue_organizationId_status_idx" ON "DataQualityIssue"("organizationId", "status");

-- CreateIndex
CREATE INDEX "DataQualityIssue_storeId_severity_idx" ON "DataQualityIssue"("storeId", "severity");

-- CreateIndex
CREATE UNIQUE INDEX "MetricDefinition_organizationId_name_key" ON "MetricDefinition"("organizationId", "name");

-- CreateIndex
CREATE INDEX "MetricSnapshot_organizationId_storeId_definitionId_computed_idx" ON "MetricSnapshot"("organizationId", "storeId", "definitionId", "computedAt");

-- CreateIndex
CREATE INDEX "MetricSnapshot_definitionId_periodStart_idx" ON "MetricSnapshot"("definitionId", "periodStart");

-- AddForeignKey
ALTER TABLE "MetricSnapshot" ADD CONSTRAINT "MetricSnapshot_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "MetricDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
