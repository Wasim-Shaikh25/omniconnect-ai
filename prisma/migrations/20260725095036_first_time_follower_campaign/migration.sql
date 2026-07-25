/*
  Warnings:

  - A unique constraint covering the columns `[storeId,type]` on the table `Campaign` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('FIRST_TIME_FOLLOWER');

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "type" "CampaignType" NOT NULL DEFAULT 'FIRST_TIME_FOLLOWER';

-- AlterTable
ALTER TABLE "Follower" ADD COLUMN     "campaignEnrolledAt" TIMESTAMP(3),
ADD COLUMN     "couponId" TEXT,
ADD COLUMN     "welcomeMessageText" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_storeId_type_key" ON "Campaign"("storeId", "type");
