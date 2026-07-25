-- CreateEnum
CREATE TYPE "CommentUnlockRewardType" AS ENUM ('LINK', 'COUPON', 'MESSAGE');

-- CreateEnum
CREATE TYPE "CommentUnlockStatus" AS ENUM ('PENDING', 'SENT', 'REFERRED');

-- CreateTable
CREATE TABLE "CommentUnlockCampaign" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "rewardType" "CommentUnlockRewardType" NOT NULL DEFAULT 'MESSAGE',
    "rewardValue" TEXT,
    "message" TEXT NOT NULL,
    "referralAsk" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommentUnlockCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentUnlockRedemption" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "externalUserId" TEXT NOT NULL,
    "username" TEXT,
    "commentId" TEXT,
    "status" "CommentUnlockStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "CommentUnlockRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommentUnlockCampaign_storeId_active_idx" ON "CommentUnlockCampaign"("storeId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "CommentUnlockCampaign_storeId_keyword_key" ON "CommentUnlockCampaign"("storeId", "keyword");

-- CreateIndex
CREATE INDEX "CommentUnlockRedemption_campaignId_status_idx" ON "CommentUnlockRedemption"("campaignId", "status");

-- CreateIndex
CREATE INDEX "CommentUnlockRedemption_storeId_externalUserId_idx" ON "CommentUnlockRedemption"("storeId", "externalUserId");

-- AddForeignKey
ALTER TABLE "CommentUnlockCampaign" ADD CONSTRAINT "CommentUnlockCampaign_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentUnlockRedemption" ADD CONSTRAINT "CommentUnlockRedemption_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "CommentUnlockCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
