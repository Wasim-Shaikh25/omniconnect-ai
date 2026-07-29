-- AlterTable
ALTER TABLE "Store" ADD COLUMN "lastProductSyncAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Product_deletedAt_idx" ON "Product"("deletedAt");

-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Coupon_deletedAt_idx" ON "Coupon"("deletedAt");
