-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phoneVerified" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "VerificationRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "channel" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VerificationRequest_tokenHash_key" ON "VerificationRequest"("tokenHash");

-- CreateIndex
CREATE INDEX "VerificationRequest_userId_purpose_idx" ON "VerificationRequest"("userId", "purpose");

-- CreateIndex
CREATE INDEX "VerificationRequest_target_purpose_idx" ON "VerificationRequest"("target", "purpose");

-- CreateIndex
CREATE INDEX "VerificationRequest_expiresAt_idx" ON "VerificationRequest"("expiresAt");

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
