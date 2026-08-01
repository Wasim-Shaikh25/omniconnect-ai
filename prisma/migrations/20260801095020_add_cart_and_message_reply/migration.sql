/*
  Warnings:

  - A unique constraint covering the columns `[conversationId,inReplyToMessageId]` on the table `Message` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "inReplyToMessageId" TEXT;

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "cartToken" TEXT NOT NULL,
    "email" TEXT,
    "lineItemTitles" TEXT[],
    "totalPrice" DECIMAL(12,2),
    "currency" TEXT,
    "recoveredUrl" TEXT,
    "lastActivityAt" TIMESTAMP(3) NOT NULL,
    "notifiedAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cart_storeId_lastActivityAt_idx" ON "Cart"("storeId", "lastActivityAt");

-- CreateIndex
CREATE INDEX "Cart_notifiedAt_idx" ON "Cart"("notifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_storeId_cartToken_key" ON "Cart"("storeId", "cartToken");

-- CreateIndex
CREATE UNIQUE INDEX "Message_conversationId_inReplyToMessageId_key" ON "Message"("conversationId", "inReplyToMessageId");

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
