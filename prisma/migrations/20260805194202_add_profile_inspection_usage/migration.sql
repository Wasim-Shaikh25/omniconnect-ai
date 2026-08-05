-- AlterTable
ALTER TABLE "User" ADD COLUMN     "profileInspectionsResetAt" TIMESTAMP(3),
ADD COLUMN     "profileInspectionsToday" INTEGER NOT NULL DEFAULT 0;
