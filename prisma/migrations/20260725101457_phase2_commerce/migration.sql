-- CreateEnum
CREATE TYPE "CatalogSyncStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "ShoppableMediaStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "CommentIntent" AS ENUM ('QUESTION', 'COMPLAINT', 'COMPLIMENT', 'SPAM', 'PURCHASE_INTENT', 'OTHER');

-- CreateEnum
CREATE TYPE "CommentSentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');

-- CreateEnum
CREATE TYPE "MentionSource" AS ENUM ('MENTION', 'TAG', 'HASHTAG');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('LEAD_ADS', 'DM', 'COMMENT', 'FOLLOW');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'SCORED', 'NURTURED', 'CONVERTED', 'DISQUALIFIED');

-- CreateEnum
CREATE TYPE "UgcRightsStatus" AS ENUM ('PENDING', 'REQUESTED', 'APPROVED', 'DECLINED');

-- CreateEnum
CREATE TYPE "AmbassadorStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ReferralOrderStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID');

-- CreateEnum
CREATE TYPE "DmCampaignType" AS ENUM ('WELCOME', 'ABANDONED_CART', 'BACK_IN_STOCK', 'REVIEW', 'RE_ENGAGE');

-- CreateEnum
CREATE TYPE "DmCampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENT');

-- CreateTable
CREATE TABLE "MetaCatalogSync" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "externalCatalogId" TEXT,
    "status" "CatalogSyncStatus" NOT NULL DEFAULT 'PENDING',
    "lastSyncedAt" TIMESTAMP(3),
    "errorLog" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaCatalogSync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetaProductMapping" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "externalProductId" TEXT,
    "externalCatalogId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "lastPushedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaProductMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoppableMedia" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "externalMediaId" TEXT,
    "mediaType" TEXT NOT NULL,
    "caption" TEXT,
    "permalink" TEXT,
    "productTags" JSONB,
    "status" "ShoppableMediaStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShoppableMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialComment" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "externalMediaId" TEXT,
    "externalCommentId" TEXT,
    "parentId" TEXT,
    "externalUserId" TEXT,
    "username" TEXT,
    "text" TEXT NOT NULL,
    "intent" "CommentIntent" NOT NULL DEFAULT 'OTHER',
    "sentiment" "CommentSentiment" NOT NULL DEFAULT 'NEUTRAL',
    "autoReplyText" TEXT,
    "repliedAt" TIMESTAMP(3),
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialMention" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "externalMediaId" TEXT,
    "externalUserId" TEXT,
    "handle" TEXT,
    "mediaUrl" TEXT,
    "source" "MentionSource" NOT NULL,
    "caption" TEXT,
    "hashtags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialMention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialLead" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "source" "LeadSource" NOT NULL,
    "externalFormId" TEXT,
    "externalLeadId" TEXT,
    "payload" JSONB,
    "mappedFields" JSONB,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "score" INTEGER NOT NULL DEFAULT 0,
    "customerId" TEXT,
    "assignedTo" TEXT,
    "nurturedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UgcAsset" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "socialMentionId" TEXT,
    "customerId" TEXT,
    "creatorHandle" TEXT,
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "source" "MentionSource" NOT NULL,
    "caption" TEXT,
    "rightsStatus" "UgcRightsStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UgcAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ambassador" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "customerId" TEXT,
    "code" TEXT NOT NULL,
    "discountPct" INTEGER NOT NULL DEFAULT 10,
    "commissionPct" INTEGER NOT NULL DEFAULT 5,
    "status" "AmbassadorStatus" NOT NULL DEFAULT 'PENDING',
    "totalReferrals" INTEGER NOT NULL DEFAULT 0,
    "totalEarnings" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ambassador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralOrder" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "ambassadorId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderAmount" DECIMAL(12,2) NOT NULL,
    "commissionAmount" DECIMAL(12,2) NOT NULL,
    "status" "ReferralOrderStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DmCampaign" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "campaignType" "DmCampaignType" NOT NULL,
    "audienceCriteria" JSONB,
    "status" "DmCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "metrics" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DmCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackInStockSubscription" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "externalUserId" TEXT,
    "customerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),

    CONSTRAINT "BackInStockSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MetaCatalogSync_storeId_status_idx" ON "MetaCatalogSync"("storeId", "status");

-- CreateIndex
CREATE INDEX "MetaProductMapping_storeId_status_idx" ON "MetaProductMapping"("storeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MetaProductMapping_storeId_productId_key" ON "MetaProductMapping"("storeId", "productId");

-- CreateIndex
CREATE INDEX "ShoppableMedia_storeId_status_idx" ON "ShoppableMedia"("storeId", "status");

-- CreateIndex
CREATE INDEX "SocialComment_storeId_hidden_createdAt_idx" ON "SocialComment"("storeId", "hidden", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SocialComment_storeId_externalCommentId_key" ON "SocialComment"("storeId", "externalCommentId");

-- CreateIndex
CREATE INDEX "SocialMention_storeId_source_idx" ON "SocialMention"("storeId", "source");

-- CreateIndex
CREATE INDEX "SocialLead_storeId_status_score_idx" ON "SocialLead"("storeId", "status", "score");

-- CreateIndex
CREATE INDEX "UgcAsset_storeId_rightsStatus_idx" ON "UgcAsset"("storeId", "rightsStatus");

-- CreateIndex
CREATE INDEX "Ambassador_storeId_status_idx" ON "Ambassador"("storeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Ambassador_storeId_code_key" ON "Ambassador"("storeId", "code");

-- CreateIndex
CREATE INDEX "ReferralOrder_storeId_status_idx" ON "ReferralOrder"("storeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralOrder_storeId_orderId_key" ON "ReferralOrder"("storeId", "orderId");

-- CreateIndex
CREATE INDEX "DmCampaign_storeId_campaignType_status_idx" ON "DmCampaign"("storeId", "campaignType", "status");

-- CreateIndex
CREATE INDEX "BackInStockSubscription_storeId_productId_idx" ON "BackInStockSubscription"("storeId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "BackInStockSubscription_storeId_productId_externalUserId_key" ON "BackInStockSubscription"("storeId", "productId", "externalUserId");

-- AddForeignKey
ALTER TABLE "MetaCatalogSync" ADD CONSTRAINT "MetaCatalogSync_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaProductMapping" ADD CONSTRAINT "MetaProductMapping_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaProductMapping" ADD CONSTRAINT "MetaProductMapping_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppableMedia" ADD CONSTRAINT "ShoppableMedia_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialComment" ADD CONSTRAINT "SocialComment_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialMention" ADD CONSTRAINT "SocialMention_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialLead" ADD CONSTRAINT "SocialLead_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialLead" ADD CONSTRAINT "SocialLead_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UgcAsset" ADD CONSTRAINT "UgcAsset_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UgcAsset" ADD CONSTRAINT "UgcAsset_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ambassador" ADD CONSTRAINT "Ambassador_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ambassador" ADD CONSTRAINT "Ambassador_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralOrder" ADD CONSTRAINT "ReferralOrder_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralOrder" ADD CONSTRAINT "ReferralOrder_ambassadorId_fkey" FOREIGN KEY ("ambassadorId") REFERENCES "Ambassador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmCampaign" ADD CONSTRAINT "DmCampaign_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackInStockSubscription" ADD CONSTRAINT "BackInStockSubscription_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackInStockSubscription" ADD CONSTRAINT "BackInStockSubscription_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackInStockSubscription" ADD CONSTRAINT "BackInStockSubscription_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
