-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Conversation_storeId_idx" ON "Conversation"("storeId");

-- CreateIndex
CREATE INDEX "Conversation_storeId_customerId_idx" ON "Conversation"("storeId", "customerId");

-- CreateIndex
CREATE INDEX "Conversation_customerId_idx" ON "Conversation"("customerId");

-- CreateIndex
CREATE INDEX "Conversation_assignedHumanId_idx" ON "Conversation"("assignedHumanId");

-- CreateIndex
CREATE INDEX "CouponUsage_couponId_idx" ON "CouponUsage"("couponId");

-- CreateIndex
CREATE INDEX "CouponUsage_customerId_idx" ON "CouponUsage"("customerId");

-- CreateIndex
CREATE INDEX "Customer_storeId_idx" ON "Customer"("storeId");

-- CreateIndex
CREATE INDEX "Customer_igUserId_idx" ON "Customer"("igUserId");

-- CreateIndex
CREATE INDEX "Customer_fbUserId_idx" ON "Customer"("fbUserId");

-- CreateIndex
CREATE INDEX "Integration_storeId_type_idx" ON "Integration"("storeId", "type");

-- CreateIndex
CREATE INDEX "Integration_storeId_type_provider_idx" ON "Integration"("storeId", "type", "provider");

-- CreateIndex
CREATE INDEX "Integration_externalId_idx" ON "Integration"("externalId");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");

-- CreateIndex
CREATE INDEX "Report_storeId_generatedAt_idx" ON "Report"("storeId", "generatedAt");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Store_organizationId_idx" ON "Store"("organizationId");

-- CreateIndex
CREATE INDEX "VerificationToken_identifier_idx" ON "VerificationToken"("identifier");

-- CreateIndex
CREATE INDEX "VerificationToken_expires_idx" ON "VerificationToken"("expires");
