-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "metaPixelId" TEXT;

-- CreateTable
CREATE TABLE "AttributionLink" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "couponId" TEXT,
    "fullUrl" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "utmSource" TEXT NOT NULL,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttributionLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttributionLink_shortCode_key" ON "AttributionLink"("shortCode");

-- CreateIndex
CREATE INDEX "AttributionLink_projectId_createdAt_idx" ON "AttributionLink"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "AttributionLink_shortCode_idx" ON "AttributionLink"("shortCode");

-- CreateIndex
CREATE INDEX "AttributionLink_couponId_idx" ON "AttributionLink"("couponId");

-- AddForeignKey
ALTER TABLE "AttributionLink" ADD CONSTRAINT "AttributionLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttributionLink" ADD CONSTRAINT "AttributionLink_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
