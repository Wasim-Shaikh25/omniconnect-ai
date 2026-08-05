-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- AlterEnum
BEGIN;
CREATE TYPE "Plan_new" AS ENUM ('FREE', 'PRO', 'BUSINESS');
ALTER TABLE "Organization" ALTER COLUMN "plan" DROP DEFAULT;
ALTER TABLE "Organization" ALTER COLUMN "plan" TYPE "Plan_new" USING ("plan"::text::"Plan_new");
ALTER TYPE "Plan" RENAME TO "Plan_old";
ALTER TYPE "Plan_new" RENAME TO "Plan";
DROP TYPE "Plan_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('USER', 'SUPER_ADMIN');
ALTER TABLE "OrganizationInvite" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TABLE "OrganizationInvite" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "OrganizationInvite" ALTER COLUMN "role" SET DEFAULT 'USER';
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';
COMMIT;

-- DropForeignKey
ALTER TABLE "AIConfiguration" DROP CONSTRAINT "AIConfiguration_storeId_fkey";

-- DropForeignKey
ALTER TABLE "AccountInsight" DROP CONSTRAINT "AccountInsight_storeId_fkey";

-- DropForeignKey
ALTER TABLE "Ambassador" DROP CONSTRAINT "Ambassador_storeId_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "BackInStockSubscription" DROP CONSTRAINT "BackInStockSubscription_storeId_fkey";

-- DropForeignKey
ALTER TABLE "BrandDeal" DROP CONSTRAINT "BrandDeal_storeId_fkey";

-- DropForeignKey
ALTER TABLE "Campaign" DROP CONSTRAINT "Campaign_storeId_fkey";

-- DropForeignKey
ALTER TABLE "Cart" DROP CONSTRAINT "Cart_storeId_fkey";

-- DropForeignKey
ALTER TABLE "CommentUnlockCampaign" DROP CONSTRAINT "CommentUnlockCampaign_storeId_fkey";

-- DropForeignKey
ALTER TABLE "ContentRecommendation" DROP CONSTRAINT "ContentRecommendation_storeId_fkey";

-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_storeId_fkey";

-- DropForeignKey
ALTER TABLE "Coupon" DROP CONSTRAINT "Coupon_storeId_fkey";

-- DropForeignKey
ALTER TABLE "Customer" DROP CONSTRAINT "Customer_storeId_fkey";

-- DropForeignKey
ALTER TABLE "DmCampaign" DROP CONSTRAINT "DmCampaign_storeId_fkey";

-- DropForeignKey
ALTER TABLE "Follower" DROP CONSTRAINT "Follower_storeId_fkey";

-- DropForeignKey
ALTER TABLE "Integration" DROP CONSTRAINT "Integration_storeId_fkey";

-- DropForeignKey
ALTER TABLE "MediaPost" DROP CONSTRAINT "MediaPost_storeId_fkey";

-- DropForeignKey
ALTER TABLE "MetaCatalogSync" DROP CONSTRAINT "MetaCatalogSync_storeId_fkey";

-- DropForeignKey
ALTER TABLE "MetaProductMapping" DROP CONSTRAINT "MetaProductMapping_storeId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_storeId_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationInvite" DROP CONSTRAINT "OrganizationInvite_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_storeId_fkey";

-- DropForeignKey
ALTER TABLE "ReferralOrder" DROP CONSTRAINT "ReferralOrder_storeId_fkey";

-- DropForeignKey
ALTER TABLE "ShoppableMedia" DROP CONSTRAINT "ShoppableMedia_storeId_fkey";

-- DropForeignKey
ALTER TABLE "SocialComment" DROP CONSTRAINT "SocialComment_storeId_fkey";

-- DropForeignKey
ALTER TABLE "SocialLead" DROP CONSTRAINT "SocialLead_storeId_fkey";

-- DropForeignKey
ALTER TABLE "SocialMention" DROP CONSTRAINT "SocialMention_storeId_fkey";

-- DropForeignKey
ALTER TABLE "Store" DROP CONSTRAINT "Store_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "TrendSnapshot" DROP CONSTRAINT "TrendSnapshot_storeId_fkey";

-- DropForeignKey
ALTER TABLE "UgcAsset" DROP CONSTRAINT "UgcAsset_storeId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_storeId_fkey";

-- DropIndex
DROP INDEX "AIConfiguration_storeId_key";

-- DropIndex
DROP INDEX "AccountInsight_storeId_date_idx";

-- DropIndex
DROP INDEX "ActionOutcome_organizationId_storeId_status_idx";

-- DropIndex
DROP INDEX "ActionPlan_organizationId_storeId_status_createdAt_idx";

-- DropIndex
DROP INDEX "Ambassador_storeId_code_key";

-- DropIndex
DROP INDEX "Ambassador_storeId_status_idx";

-- DropIndex
DROP INDEX "AuditLog_organizationId_action_idx";

-- DropIndex
DROP INDEX "AuditLog_organizationId_createdAt_idx";

-- DropIndex
DROP INDEX "BackInStockSubscription_storeId_productId_externalUserId_key";

-- DropIndex
DROP INDEX "BackInStockSubscription_storeId_productId_idx";

-- DropIndex
DROP INDEX "BrainConversationMemory_organizationId_createdAt_idx";

-- DropIndex
DROP INDEX "BrainConversationMemory_userId_storeId_idx";

-- DropIndex
DROP INDEX "BrandDeal_storeId_createdAt_idx";

-- DropIndex
DROP INDEX "BrandDeal_storeId_status_idx";

-- DropIndex
DROP INDEX "BusinessInsight_organizationId_status_generatedAt_idx";

-- DropIndex
DROP INDEX "BusinessInsight_organizationId_storeId_type_status_idx";

-- DropIndex
DROP INDEX "BusinessLearning_organizationId_ruleName_idx";

-- DropIndex
DROP INDEX "BusinessLearning_organizationId_storeId_ruleName_idx";

-- DropIndex
DROP INDEX "Campaign_storeId_type_key";

-- DropIndex
DROP INDEX "Cart_storeId_cartToken_key";

-- DropIndex
DROP INDEX "Cart_storeId_lastActivityAt_idx";

-- DropIndex
DROP INDEX "CommentUnlockCampaign_storeId_active_idx";

-- DropIndex
DROP INDEX "CommentUnlockCampaign_storeId_keyword_key";

-- DropIndex
DROP INDEX "CommentUnlockRedemption_storeId_externalUserId_idx";

-- DropIndex
DROP INDEX "CompetitorInsight_organizationId_capturedAt_idx";

-- DropIndex
DROP INDEX "CompetitorInsight_organizationId_storeId_metricName_idx";

-- DropIndex
DROP INDEX "ContentRecommendation_storeId_generatedAt_idx";

-- DropIndex
DROP INDEX "Conversation_storeId_customerId_idx";

-- DropIndex
DROP INDEX "Conversation_storeId_idx";

-- DropIndex
DROP INDEX "Coupon_storeId_code_key";

-- DropIndex
DROP INDEX "Customer_storeId_idx";

-- DropIndex
DROP INDEX "DailyAction_organizationId_status_createdAt_idx";

-- DropIndex
DROP INDEX "DailyAction_organizationId_storeId_status_generatedForDate_idx";

-- DropIndex
DROP INDEX "DataQualityIssue_organizationId_status_idx";

-- DropIndex
DROP INDEX "DataQualityIssue_storeId_severity_idx";

-- DropIndex
DROP INDEX "Decision_organizationId_actionPlanId_idx";

-- DropIndex
DROP INDEX "DmCampaign_storeId_campaignType_status_idx";

-- DropIndex
DROP INDEX "EntityLink_organizationId_sourceType_sourceId_idx";

-- DropIndex
DROP INDEX "EntityLink_organizationId_targetType_targetId_idx";

-- DropIndex
DROP INDEX "EntityLink_storeId_confidence_idx";

-- DropIndex
DROP INDEX "Follower_storeId_igUserId_key";

-- DropIndex
DROP INDEX "Goal_organizationId_status_endDate_idx";

-- DropIndex
DROP INDEX "Goal_organizationId_storeId_targetMetric_status_idx";

-- DropIndex
DROP INDEX "GoalPlanVersion_organizationId_idx";

-- DropIndex
DROP INDEX "Hypothesis_organizationId_status_createdAt_idx";

-- DropIndex
DROP INDEX "Hypothesis_organizationId_storeId_insightId_idx";

-- DropIndex
DROP INDEX "IntelligenceDismissal_organizationId_idx";

-- DropIndex
DROP INDEX "IntelligenceFeedback_organizationId_idx";

-- DropIndex
DROP INDEX "Journey_organizationId_storeId_customerId_idx";

-- DropIndex
DROP INDEX "Journey_storeId_externalUserId_idx";

-- DropIndex
DROP INDEX "MediaPost_storeId_externalId_key";

-- DropIndex
DROP INDEX "MediaPost_storeId_publishedAt_idx";

-- DropIndex
DROP INDEX "MetaCatalogSync_storeId_status_idx";

-- DropIndex
DROP INDEX "MetaProductMapping_storeId_productId_key";

-- DropIndex
DROP INDEX "MetaProductMapping_storeId_status_idx";

-- DropIndex
DROP INDEX "MetricDefinition_organizationId_name_key";

-- DropIndex
DROP INDEX "MetricSnapshot_organizationId_storeId_definitionId_computed_idx";

-- DropIndex
DROP INDEX "Order_storeId_attributedMediaId_idx";

-- DropIndex
DROP INDEX "Order_storeId_couponCode_idx";

-- DropIndex
DROP INDEX "Order_storeId_externalId_key";

-- DropIndex
DROP INDEX "Order_storeId_isFirstTimeCustomer_idx";

-- DropIndex
DROP INDEX "Order_storeId_orderDate_idx";

-- DropIndex
DROP INDEX "OrganizationInvite_organizationId_email_key";

-- DropIndex
DROP INDEX "OrganizationInvite_organizationId_status_idx";

-- DropIndex
DROP INDEX "Outcome_organizationId_storeId_actionPlanId_idx";

-- DropIndex
DROP INDEX "PortfolioSnapshot_organizationId_generatedAt_idx";

-- DropIndex
DROP INDEX "Prediction_organizationId_status_expiresAt_idx";

-- DropIndex
DROP INDEX "Prediction_organizationId_storeId_predictionType_status_idx";

-- DropIndex
DROP INDEX "Product_storeId_externalId_key";

-- DropIndex
DROP INDEX "Recommendation_organizationId_businessObjective_status_idx";

-- DropIndex
DROP INDEX "Recommendation_organizationId_status_generatedAt_idx";

-- DropIndex
DROP INDEX "Recommendation_organizationId_storeId_status_riskTier_idx";

-- DropIndex
DROP INDEX "RecommendationConflict_organizationId_storeId_idx";

-- DropIndex
DROP INDEX "ReferralOrder_storeId_orderId_key";

-- DropIndex
DROP INDEX "ReferralOrder_storeId_status_idx";

-- DropIndex
DROP INDEX "Report_storeId_generatedAt_idx";

-- DropIndex
DROP INDEX "RolloutGate_organizationId_idx";

-- DropIndex
DROP INDEX "RolloutGate_organizationId_name_key";

-- DropIndex
DROP INDEX "ShoppableMedia_storeId_status_idx";

-- DropIndex
DROP INDEX "Signal_organizationId_ingestedAt_idx";

-- DropIndex
DROP INDEX "Signal_organizationId_storeId_subjectType_subjectId_idx";

-- DropIndex
DROP INDEX "Signal_storeId_eventType_ingestedAt_idx";

-- DropIndex
DROP INDEX "SocialComment_storeId_externalCommentId_key";

-- DropIndex
DROP INDEX "SocialComment_storeId_hidden_createdAt_idx";

-- DropIndex
DROP INDEX "SocialLead_storeId_status_score_idx";

-- DropIndex
DROP INDEX "SocialMention_storeId_source_idx";

-- DropIndex
DROP INDEX "SupportTicket_organizationId_status_idx";

-- DropIndex
DROP INDEX "SystemLog_organizationId_createdAt_idx";

-- DropIndex
DROP INDEX "SystemMetric_organizationId_module_recordedAt_idx";

-- DropIndex
DROP INDEX "SystemMetric_organizationId_operation_recordedAt_idx";

-- DropIndex
DROP INDEX "TrackedAccount_storeId_handle_idx";

-- DropIndex
DROP INDEX "TrendSnapshot_storeId_type_query_fetchedAt_idx";

-- DropIndex
DROP INDEX "UgcAsset_storeId_rightsStatus_idx";

-- DropIndex
DROP INDEX "User_organizationId_idx";

-- DropIndex
DROP INDEX "User_storeId_idx";

-- AlterTable
ALTER TABLE "AIConfiguration" DROP COLUMN "storeId",
ADD COLUMN     "aiName" TEXT,
ADD COLUMN     "projectId" TEXT NOT NULL,
ALTER COLUMN "systemPrompt" SET DEFAULT 'You are a helpful AI assistant for this brand.';

-- AlterTable
ALTER TABLE "AccountInsight" DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ActionOutcome" DROP COLUMN "organizationId",
DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ActionPlan" DROP COLUMN "organizationId",
DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Ambassador" DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "organizationId",
ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "BackInStockSubscription" DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "BrainConversationMemory" DROP COLUMN "organizationId",
DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT;

-- AlterTable
ALTER TABLE "BrandDeal" DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "BusinessInsight" DROP COLUMN "organizationId",
DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "BusinessLearning" DROP COLUMN "organizationId",
DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Campaign" DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Cart" DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "CommentUnlockCampaign" DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "CommentUnlockRedemption" DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "CompetitorInsight" DROP COLUMN "organizationId",
DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ContentRecommendation" DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Conversation" DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Coupon" DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "DailyAction" DROP COLUMN "organizationId",
DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "DataQualityIssue" DROP COLUMN "organizationId",
DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Decision" DROP COLUMN "organizationId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "DmCampaign" DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "EntityLink" DROP COLUMN "organizationId",
DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ExportRequest" DROP COLUMN "organizationId";

-- AlterTable
ALTER TABLE "Follower" DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Goal" DROP COLUMN "organizationId",
DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "GoalPlanVersion" DROP COLUMN "organizationId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Hypothesis" DROP COLUMN "organizationId",
DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "IntelligenceDismissal" DROP COLUMN "organizationId";

-- AlterTable
ALTER TABLE "IntelligenceFeedback" DROP COLUMN "organizationId";

-- AlterTable
ALTER TABLE "Journey" DROP COLUMN "organizationId",
DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "MediaPost" DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "MetaCatalogSync" DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "MetaProductMapping" DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "MetricDefinition" DROP COLUMN "organizationId",
ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "MetricSnapshot" DROP COLUMN "organizationId",
DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "OrganizationInvite" DROP COLUMN "organizationId",
DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "role" SET DEFAULT 'USER',
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Outcome" DROP COLUMN "organizationId",
DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PortfolioSnapshot" DROP COLUMN "organizationId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Prediction" DROP COLUMN "organizationId",
DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Recommendation" DROP COLUMN "organizationId",
DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "RecommendationConflict" DROP COLUMN "organizationId",
DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ReferralOrder" DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Report" DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "RolloutGate" DROP COLUMN "organizationId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ShoppableMedia" DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Signal" DROP COLUMN "organizationId",
DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SocialComment" DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SocialLead" DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SocialMention" DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SupportTicket" DROP COLUMN "organizationId";

-- AlterTable
ALTER TABLE "SystemLog" DROP COLUMN "organizationId";

-- AlterTable
ALTER TABLE "SystemMetric" DROP COLUMN "organizationId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TrackedAccount" DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TrendSnapshot" DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "UgcAsset" DROP COLUMN "storeId",
ADD COLUMN     "projectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "organizationId",
DROP COLUMN "storeId",
ADD COLUMN     "age" INTEGER,
ADD COLUMN     "aiRepliesResetAt" TIMESTAMP(3),
ADD COLUMN     "aiRepliesThisMonth" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "maxAiCallsPerDay" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "maxProjects" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "maxWorkspaces" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "mobile" TEXT,
ADD COLUMN     "mobileVerified" TIMESTAMP(3),
ADD COLUMN     "plan" "Plan" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "projectId" TEXT,
ADD COLUMN     "subscriptionId" TEXT,
ADD COLUMN     "subscriptionStatus" TEXT,
ADD COLUMN     "userId" TEXT,
ALTER COLUMN "role" SET DEFAULT 'USER';

-- DropTable
DROP TABLE "Integration";

-- DropTable
DROP TABLE "Organization";

-- DropTable
DROP TABLE "Store";

-- DropEnum
DROP TYPE "IntegrationType";

-- DropEnum
DROP TYPE "InviteStatus";

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT,
    "domain" TEXT,
    "metaAccountId" TEXT,
    "metaAccessToken" TEXT,
    "metaTokenExpiresAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "lastProductSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EcommerceConnection" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "baseUrl" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "config" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EcommerceConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "feature" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL,
    "completionTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "cost" DECIMAL(12,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Workspace_userId_idx" ON "Workspace"("userId");

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- CreateIndex
CREATE INDEX "Project_workspaceId_idx" ON "Project"("workspaceId");

-- CreateIndex
CREATE INDEX "EcommerceConnection_projectId_idx" ON "EcommerceConnection"("projectId");

-- CreateIndex
CREATE INDEX "EcommerceConnection_provider_idx" ON "EcommerceConnection"("provider");

-- CreateIndex
CREATE INDEX "TokenUsage_userId_createdAt_idx" ON "TokenUsage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "TokenUsage_projectId_createdAt_idx" ON "TokenUsage"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "TokenUsage_feature_createdAt_idx" ON "TokenUsage"("feature", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AIConfiguration_projectId_key" ON "AIConfiguration"("projectId");

-- CreateIndex
CREATE INDEX "AIConfiguration_projectId_idx" ON "AIConfiguration"("projectId");

-- CreateIndex
CREATE INDEX "AccountInsight_projectId_date_idx" ON "AccountInsight"("projectId", "date");

-- CreateIndex
CREATE INDEX "ActionOutcome_userId_projectId_status_idx" ON "ActionOutcome"("userId", "projectId", "status");

-- CreateIndex
CREATE INDEX "ActionPlan_userId_projectId_status_createdAt_idx" ON "ActionPlan"("userId", "projectId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Ambassador_projectId_status_idx" ON "Ambassador"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Ambassador_projectId_code_key" ON "Ambassador"("projectId", "code");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_action_idx" ON "AuditLog"("userId", "action");

-- CreateIndex
CREATE INDEX "BackInStockSubscription_projectId_productId_idx" ON "BackInStockSubscription"("projectId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "BackInStockSubscription_projectId_productId_externalUserId_key" ON "BackInStockSubscription"("projectId", "productId", "externalUserId");

-- CreateIndex
CREATE INDEX "BrainConversationMemory_userId_projectId_idx" ON "BrainConversationMemory"("userId", "projectId");

-- CreateIndex
CREATE INDEX "BrainConversationMemory_userId_createdAt_idx" ON "BrainConversationMemory"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "BrandDeal_projectId_status_idx" ON "BrandDeal"("projectId", "status");

-- CreateIndex
CREATE INDEX "BrandDeal_projectId_createdAt_idx" ON "BrandDeal"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "BusinessInsight_userId_status_generatedAt_idx" ON "BusinessInsight"("userId", "status", "generatedAt");

-- CreateIndex
CREATE INDEX "BusinessInsight_userId_projectId_type_status_idx" ON "BusinessInsight"("userId", "projectId", "type", "status");

-- CreateIndex
CREATE INDEX "BusinessLearning_userId_ruleName_idx" ON "BusinessLearning"("userId", "ruleName");

-- CreateIndex
CREATE INDEX "BusinessLearning_userId_projectId_ruleName_idx" ON "BusinessLearning"("userId", "projectId", "ruleName");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_projectId_type_key" ON "Campaign"("projectId", "type");

-- CreateIndex
CREATE INDEX "Cart_projectId_lastActivityAt_idx" ON "Cart"("projectId", "lastActivityAt");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_projectId_cartToken_key" ON "Cart"("projectId", "cartToken");

-- CreateIndex
CREATE INDEX "CommentUnlockCampaign_projectId_active_idx" ON "CommentUnlockCampaign"("projectId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "CommentUnlockCampaign_projectId_keyword_key" ON "CommentUnlockCampaign"("projectId", "keyword");

-- CreateIndex
CREATE INDEX "CommentUnlockRedemption_projectId_externalUserId_idx" ON "CommentUnlockRedemption"("projectId", "externalUserId");

-- CreateIndex
CREATE INDEX "CompetitorInsight_userId_projectId_metricName_idx" ON "CompetitorInsight"("userId", "projectId", "metricName");

-- CreateIndex
CREATE INDEX "CompetitorInsight_userId_capturedAt_idx" ON "CompetitorInsight"("userId", "capturedAt");

-- CreateIndex
CREATE INDEX "ContentRecommendation_projectId_generatedAt_idx" ON "ContentRecommendation"("projectId", "generatedAt");

-- CreateIndex
CREATE INDEX "Conversation_projectId_idx" ON "Conversation"("projectId");

-- CreateIndex
CREATE INDEX "Conversation_projectId_customerId_idx" ON "Conversation"("projectId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_projectId_code_key" ON "Coupon"("projectId", "code");

-- CreateIndex
CREATE INDEX "Customer_projectId_idx" ON "Customer"("projectId");

-- CreateIndex
CREATE INDEX "DailyAction_userId_status_createdAt_idx" ON "DailyAction"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "DailyAction_userId_projectId_status_generatedForDate_idx" ON "DailyAction"("userId", "projectId", "status", "generatedForDate");

-- CreateIndex
CREATE INDEX "DataQualityIssue_userId_status_idx" ON "DataQualityIssue"("userId", "status");

-- CreateIndex
CREATE INDEX "DataQualityIssue_projectId_severity_idx" ON "DataQualityIssue"("projectId", "severity");

-- CreateIndex
CREATE INDEX "Decision_userId_actionPlanId_idx" ON "Decision"("userId", "actionPlanId");

-- CreateIndex
CREATE INDEX "DmCampaign_projectId_campaignType_status_idx" ON "DmCampaign"("projectId", "campaignType", "status");

-- CreateIndex
CREATE INDEX "EntityLink_userId_sourceType_sourceId_idx" ON "EntityLink"("userId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "EntityLink_userId_targetType_targetId_idx" ON "EntityLink"("userId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "EntityLink_projectId_confidence_idx" ON "EntityLink"("projectId", "confidence");

-- CreateIndex
CREATE UNIQUE INDEX "Follower_projectId_igUserId_key" ON "Follower"("projectId", "igUserId");

-- CreateIndex
CREATE INDEX "Goal_userId_status_endDate_idx" ON "Goal"("userId", "status", "endDate");

-- CreateIndex
CREATE INDEX "Goal_userId_projectId_targetMetric_status_idx" ON "Goal"("userId", "projectId", "targetMetric", "status");

-- CreateIndex
CREATE INDEX "GoalPlanVersion_userId_idx" ON "GoalPlanVersion"("userId");

-- CreateIndex
CREATE INDEX "Hypothesis_userId_status_createdAt_idx" ON "Hypothesis"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Hypothesis_userId_projectId_insightId_idx" ON "Hypothesis"("userId", "projectId", "insightId");

-- CreateIndex
CREATE INDEX "Journey_userId_projectId_customerId_idx" ON "Journey"("userId", "projectId", "customerId");

-- CreateIndex
CREATE INDEX "Journey_projectId_externalUserId_idx" ON "Journey"("projectId", "externalUserId");

-- CreateIndex
CREATE INDEX "MediaPost_projectId_publishedAt_idx" ON "MediaPost"("projectId", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MediaPost_projectId_externalId_key" ON "MediaPost"("projectId", "externalId");

-- CreateIndex
CREATE INDEX "MetaCatalogSync_projectId_status_idx" ON "MetaCatalogSync"("projectId", "status");

-- CreateIndex
CREATE INDEX "MetaProductMapping_projectId_status_idx" ON "MetaProductMapping"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MetaProductMapping_projectId_productId_key" ON "MetaProductMapping"("projectId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "MetricDefinition_userId_name_key" ON "MetricDefinition"("userId", "name");

-- CreateIndex
CREATE INDEX "MetricSnapshot_userId_projectId_definitionId_computedAt_idx" ON "MetricSnapshot"("userId", "projectId", "definitionId", "computedAt");

-- CreateIndex
CREATE INDEX "Order_projectId_attributedMediaId_idx" ON "Order"("projectId", "attributedMediaId");

-- CreateIndex
CREATE INDEX "Order_projectId_couponCode_idx" ON "Order"("projectId", "couponCode");

-- CreateIndex
CREATE INDEX "Order_projectId_orderDate_idx" ON "Order"("projectId", "orderDate");

-- CreateIndex
CREATE INDEX "Order_projectId_isFirstTimeCustomer_idx" ON "Order"("projectId", "isFirstTimeCustomer");

-- CreateIndex
CREATE UNIQUE INDEX "Order_projectId_externalId_key" ON "Order"("projectId", "externalId");

-- CreateIndex
CREATE INDEX "OrganizationInvite_userId_status_idx" ON "OrganizationInvite"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationInvite_userId_email_key" ON "OrganizationInvite"("userId", "email");

-- CreateIndex
CREATE INDEX "Outcome_userId_projectId_actionPlanId_idx" ON "Outcome"("userId", "projectId", "actionPlanId");

-- CreateIndex
CREATE INDEX "PortfolioSnapshot_userId_generatedAt_idx" ON "PortfolioSnapshot"("userId", "generatedAt");

-- CreateIndex
CREATE INDEX "Prediction_userId_status_expiresAt_idx" ON "Prediction"("userId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "Prediction_userId_projectId_predictionType_status_idx" ON "Prediction"("userId", "projectId", "predictionType", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Product_projectId_externalId_key" ON "Product"("projectId", "externalId");

-- CreateIndex
CREATE INDEX "Recommendation_userId_status_generatedAt_idx" ON "Recommendation"("userId", "status", "generatedAt");

-- CreateIndex
CREATE INDEX "Recommendation_userId_projectId_status_riskTier_idx" ON "Recommendation"("userId", "projectId", "status", "riskTier");

-- CreateIndex
CREATE INDEX "Recommendation_userId_businessObjective_status_idx" ON "Recommendation"("userId", "businessObjective", "status");

-- CreateIndex
CREATE INDEX "RecommendationConflict_userId_projectId_idx" ON "RecommendationConflict"("userId", "projectId");

-- CreateIndex
CREATE INDEX "ReferralOrder_projectId_status_idx" ON "ReferralOrder"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralOrder_projectId_orderId_key" ON "ReferralOrder"("projectId", "orderId");

-- CreateIndex
CREATE INDEX "Report_projectId_generatedAt_idx" ON "Report"("projectId", "generatedAt");

-- CreateIndex
CREATE INDEX "RolloutGate_userId_idx" ON "RolloutGate"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RolloutGate_userId_name_key" ON "RolloutGate"("userId", "name");

-- CreateIndex
CREATE INDEX "ShoppableMedia_projectId_status_idx" ON "ShoppableMedia"("projectId", "status");

-- CreateIndex
CREATE INDEX "Signal_userId_projectId_subjectType_subjectId_idx" ON "Signal"("userId", "projectId", "subjectType", "subjectId");

-- CreateIndex
CREATE INDEX "Signal_projectId_eventType_ingestedAt_idx" ON "Signal"("projectId", "eventType", "ingestedAt");

-- CreateIndex
CREATE INDEX "Signal_userId_ingestedAt_idx" ON "Signal"("userId", "ingestedAt");

-- CreateIndex
CREATE INDEX "SocialComment_projectId_hidden_createdAt_idx" ON "SocialComment"("projectId", "hidden", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SocialComment_projectId_externalCommentId_key" ON "SocialComment"("projectId", "externalCommentId");

-- CreateIndex
CREATE INDEX "SocialLead_projectId_status_score_idx" ON "SocialLead"("projectId", "status", "score");

-- CreateIndex
CREATE INDEX "SocialMention_projectId_source_idx" ON "SocialMention"("projectId", "source");

-- CreateIndex
CREATE INDEX "SupportTicket_userId_status_idx" ON "SupportTicket"("userId", "status");

-- CreateIndex
CREATE INDEX "SystemLog_userId_createdAt_idx" ON "SystemLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SystemMetric_userId_operation_recordedAt_idx" ON "SystemMetric"("userId", "operation", "recordedAt");

-- CreateIndex
CREATE INDEX "SystemMetric_userId_module_recordedAt_idx" ON "SystemMetric"("userId", "module", "recordedAt");

-- CreateIndex
CREATE INDEX "TrackedAccount_projectId_handle_idx" ON "TrackedAccount"("projectId", "handle");

-- CreateIndex
CREATE INDEX "TrendSnapshot_projectId_type_query_fetchedAt_idx" ON "TrendSnapshot"("projectId", "type", "query", "fetchedAt");

-- CreateIndex
CREATE INDEX "UgcAsset_projectId_rightsStatus_idx" ON "UgcAsset"("projectId", "rightsStatus");

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EcommerceConnection" ADD CONSTRAINT "EcommerceConnection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIConfiguration" ADD CONSTRAINT "AIConfiguration_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenUsage" ADD CONSTRAINT "TokenUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenUsage" ADD CONSTRAINT "TokenUsage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follower" ADD CONSTRAINT "Follower_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaPost" ADD CONSTRAINT "MediaPost_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountInsight" ADD CONSTRAINT "AccountInsight_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrendSnapshot" ADD CONSTRAINT "TrendSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentRecommendation" ADD CONSTRAINT "ContentRecommendation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaCatalogSync" ADD CONSTRAINT "MetaCatalogSync_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaProductMapping" ADD CONSTRAINT "MetaProductMapping_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppableMedia" ADD CONSTRAINT "ShoppableMedia_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialComment" ADD CONSTRAINT "SocialComment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialMention" ADD CONSTRAINT "SocialMention_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialLead" ADD CONSTRAINT "SocialLead_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UgcAsset" ADD CONSTRAINT "UgcAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ambassador" ADD CONSTRAINT "Ambassador_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralOrder" ADD CONSTRAINT "ReferralOrder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DmCampaign" ADD CONSTRAINT "DmCampaign_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackInStockSubscription" ADD CONSTRAINT "BackInStockSubscription_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentUnlockCampaign" ADD CONSTRAINT "CommentUnlockCampaign_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandDeal" ADD CONSTRAINT "BrandDeal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

