-- CreateIndex
CREATE UNIQUE INDEX "Workspace_userId_name_key" ON "Workspace"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Project_userId_name_key" ON "Project"("userId", "name");
