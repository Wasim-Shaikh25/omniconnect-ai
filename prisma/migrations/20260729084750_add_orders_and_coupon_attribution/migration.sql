-- CreateEnum
CREATE TYPE "AttributionSource" AS ENUM ('META_POST', 'META_DM', 'META_STORY', 'META_LIVE', 'COUPON', 'DIRECT');

-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN     "lastUsedAt" TIMESTAMP(3),
ADD COLUMN     "revenueAttributed" DECIMAL(12,2),
ADD COLUMN     "usageCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "total" DECIMAL(12,2),
    "currency" TEXT,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "couponCode" TEXT,
    "customerRef" TEXT,
    "customerEmail" TEXT,
    "attributedMediaId" TEXT,
    "attributionSource" "AttributionSource",
    "isFirstTimeCustomer" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Order_storeId_attributedMediaId_idx" ON "Order"("storeId", "attributedMediaId");

-- CreateIndex
CREATE INDEX "Order_storeId_couponCode_idx" ON "Order"("storeId", "couponCode");

-- CreateIndex
CREATE INDEX "Order_storeId_orderDate_idx" ON "Order"("storeId", "orderDate");

-- CreateIndex
CREATE INDEX "Order_storeId_isFirstTimeCustomer_idx" ON "Order"("storeId", "isFirstTimeCustomer");

-- CreateIndex
CREATE UNIQUE INDEX "Order_storeId_externalId_key" ON "Order"("storeId", "externalId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
