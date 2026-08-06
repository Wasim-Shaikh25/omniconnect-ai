-- CreateTable
CREATE TABLE "GeneratedAdapter" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "platformName" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "credentials" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedAdapter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedAdapter_projectId_key" ON "GeneratedAdapter"("projectId");

-- CreateIndex
CREATE INDEX "GeneratedAdapter_projectId_idx" ON "GeneratedAdapter"("projectId");

-- AddForeignKey
ALTER TABLE "GeneratedAdapter" ADD CONSTRAINT "GeneratedAdapter_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
