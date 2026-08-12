-- RenameTable
ALTER TABLE "User" RENAME COLUMN "stripeCustomerId" TO "paymentCustomerId";

-- DropColumns
ALTER TABLE "SaaSCoupon" DROP COLUMN IF EXISTS "stripeCouponId";
ALTER TABLE "SaaSCoupon" DROP COLUMN IF EXISTS "stripePromotionCodeId";
