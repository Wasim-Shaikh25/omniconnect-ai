-- CreateTable
CREATE TABLE "BrainConversationMemory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "storeId" TEXT,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "acceptedAdviceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rejectedAdviceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "goals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrainConversationMemory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BrainConversationMemory_userId_storeId_idx" ON "BrainConversationMemory"("userId", "storeId");

-- CreateIndex
CREATE INDEX "BrainConversationMemory_organizationId_createdAt_idx" ON "BrainConversationMemory"("organizationId", "createdAt");
