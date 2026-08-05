/*
  Warnings:

  - The `escalationRules` column on the `AIConfiguration` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "AIConfiguration" ADD COLUMN     "brandVoice" TEXT,
ADD COLUMN     "channelSettings" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "enabledSkills" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "knowledgeBase" TEXT,
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "modelOverrides" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "salesRules" JSONB NOT NULL DEFAULT '{}',
DROP COLUMN "escalationRules",
ADD COLUMN     "escalationRules" JSONB NOT NULL DEFAULT '{}';
