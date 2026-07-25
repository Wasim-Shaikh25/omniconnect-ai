-- CreateEnum
CREATE TYPE "NotificationDeliveryTier" AS ENUM ('CRITICAL_INTERRUPT', 'ACTION_REQUIRED', 'TODAY_FEED', 'DIGEST', 'ON_DEMAND');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'INTELLIGENCE';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "dedupKey" TEXT,
ADD COLUMN     "tier" "NotificationDeliveryTier" NOT NULL DEFAULT 'TODAY_FEED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notificationPreferences" JSONB;

-- CreateIndex
CREATE INDEX "Notification_dedupKey_createdAt_idx" ON "Notification"("dedupKey", "createdAt");
