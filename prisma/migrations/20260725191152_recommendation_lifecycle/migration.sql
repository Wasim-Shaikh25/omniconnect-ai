-- AlterTable
ALTER TABLE "Recommendation" ADD COLUMN     "producedByModule" TEXT NOT NULL DEFAULT 'intelligence',
ADD COLUMN     "producedByService" TEXT,
ADD COLUMN     "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "validUntil" TIMESTAMP(3),
ADD COLUMN     "invalidatedAt" TIMESTAMP(3),
ADD COLUMN     "invalidatedByEvent" TEXT;

-- CreateIndex
CREATE INDEX "Recommendation_organizationId_status_validFrom_idx" ON "Recommendation"("organizationId", "status", "validFrom");

-- CreateIndex
CREATE INDEX "Recommendation_producedByModule_idx" ON "Recommendation"("producedByModule");
