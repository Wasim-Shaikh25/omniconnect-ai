-- AlterTable
ALTER TABLE "User" ADD COLUMN     "contentSchedulesResetAt" TIMESTAMP(3),
ADD COLUMN     "contentSchedulesThisMonth" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ScheduledPost" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "caption" TEXT,
    "mediaType" TEXT NOT NULL,
    "mediaUrls" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "externalId" TEXT,
    "jobId" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduledPost_projectId_status_scheduledAt_idx" ON "ScheduledPost"("projectId", "status", "scheduledAt");

-- CreateIndex
CREATE INDEX "ScheduledPost_userId_status_createdAt_idx" ON "ScheduledPost"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ScheduledPost_scheduledAt_status_idx" ON "ScheduledPost"("scheduledAt", "status");

-- AddForeignKey
ALTER TABLE "ScheduledPost" ADD CONSTRAINT "ScheduledPost_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
