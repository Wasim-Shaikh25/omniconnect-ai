-- CreateEnum
CREATE TYPE "BrandDealStatus" AS ENUM ('LEAD', 'NEGOTIATING', 'CONTRACTED', 'DELIVERED', 'PAID', 'CLOSED');

-- CreateTable
CREATE TABLE "BrandDeal" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "contactEmail" TEXT,
    "value" DOUBLE PRECISION,
    "status" "BrandDealStatus" NOT NULL DEFAULT 'LEAD',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandDeal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BrandDeal_storeId_status_idx" ON "BrandDeal"("storeId", "status");

-- CreateIndex
CREATE INDEX "BrandDeal_storeId_createdAt_idx" ON "BrandDeal"("storeId", "createdAt");

-- AddForeignKey
ALTER TABLE "BrandDeal" ADD CONSTRAINT "BrandDeal_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
