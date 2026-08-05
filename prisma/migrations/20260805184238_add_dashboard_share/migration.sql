-- CreateTable
CREATE TABLE "DashboardShare" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "title" TEXT,
    "schema" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DashboardShare_token_key" ON "DashboardShare"("token");

-- CreateIndex
CREATE INDEX "DashboardShare_token_idx" ON "DashboardShare"("token");

-- CreateIndex
CREATE INDEX "DashboardShare_projectId_createdAt_idx" ON "DashboardShare"("projectId", "createdAt");

-- AddForeignKey
ALTER TABLE "DashboardShare" ADD CONSTRAINT "DashboardShare_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
