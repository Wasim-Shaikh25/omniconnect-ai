-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Store_deletedAt_idx" ON "Store"("deletedAt");
