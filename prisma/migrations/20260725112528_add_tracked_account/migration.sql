-- CreateTable
CREATE TABLE "TrackedAccount" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'INSTAGRAM',
    "handle" TEXT NOT NULL,
    "niche" TEXT,
    "note" TEXT,
    "lastMedia" JSONB,
    "lastAnalysis" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackedAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrackedAccount_storeId_handle_idx" ON "TrackedAccount"("storeId", "handle");
