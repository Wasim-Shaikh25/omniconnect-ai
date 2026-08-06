/*
  Warnings:

  - You are about to drop the column `contentSchedulesResetAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `contentSchedulesThisMonth` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ScheduledPost" ADD COLUMN     "scheduledAtTimezone" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "contentSchedulesResetAt",
DROP COLUMN "contentSchedulesThisMonth";
