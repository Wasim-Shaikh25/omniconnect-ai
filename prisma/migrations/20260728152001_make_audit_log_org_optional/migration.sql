-- Make AuditLog.organizationId optional so platform-level admin actions
-- (super-admin toggles, SaaS coupon creation) can be logged without a fake FK.
ALTER TABLE "AuditLog" ALTER COLUMN "organizationId" DROP NOT NULL;
