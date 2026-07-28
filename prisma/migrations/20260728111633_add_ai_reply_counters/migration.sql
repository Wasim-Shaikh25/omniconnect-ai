-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "aiRepliesResetAt" TIMESTAMP(3),
ADD COLUMN     "aiRepliesThisMonth" INTEGER NOT NULL DEFAULT 0;
