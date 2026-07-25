-- CreateEnum
CREATE TYPE "CustomerLifecycleStage" AS ENUM ('LEAD', 'PROSPECT', 'CUSTOMER', 'CHURNED');

-- CreateEnum
CREATE TYPE "CustomerConsent" AS ENUM ('PENDING', 'GRANTED', 'DECLINED');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "consent" "CustomerConsent" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "consentUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "lastActivityAt" TIMESTAMP(3),
ADD COLUMN     "lifecycleStage" "CustomerLifecycleStage" NOT NULL DEFAULT 'LEAD';
