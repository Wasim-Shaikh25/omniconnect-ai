-- CreateTable
CREATE TABLE "PlanConfig" (
    "id" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "maxWorkspaces" INTEGER,
    "maxProjects" INTEGER,
    "monthlyAiReplies" INTEGER,
    "maxProfileInspectionsPerDay" INTEGER,
    "teamSeats" INTEGER,
    "maxStores" INTEGER,
    "maxCompetitors" INTEGER,
    "maxAttributionLinksPerMonth" INTEGER,
    "maxContentSchedulesPerMonth" INTEGER,
    "allowedModels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "priceMonthlyCents" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanConfig_plan_key" ON "PlanConfig"("plan");
