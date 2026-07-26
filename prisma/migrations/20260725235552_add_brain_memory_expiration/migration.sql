-- AlterTable
ALTER TABLE "BrainConversationMemory" ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "BrainConversationMemory_expiresAt_idx" ON "BrainConversationMemory"("expiresAt");
