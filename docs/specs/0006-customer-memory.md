# Spec 0006: Customer Memory System (CRM)

- **Module(s):** crm
- **Status:** Implemented
- **Owner:** wasim
- **Related task(s):** docs/tasks/backlog.md (TASK-060)
- **Related ADR(s):** —
- **Last updated:** 2026-07-25

## 1. Summary
Unified customer profile database enabling personalized AI conversations. Stores IG/FB user IDs, username, conversation history references, sent coupons, coupon usage, interests, and tags.

## 2. Goals
- Customer profile keyed by IG/FB user IDs + username per store.
- Track sent coupons (`Coupon.customerId`) and coupon usage (`CouponUsage`).
- Maintain interests and tags for segmentation/personalization.
- Expose memory to the AI assistant through a public `CustomerMemory` port.
- Emit `CustomerProfileUpdated` when the profile changes.

## 3. Non-Goals
- Phase 2/3 roadmap items (see `docs/specs/0000-project-overview.md`).
- Storing full message text in CRM; conversation content remains in the `conversations` module.

## 4. Public Contract (loose coupling)
- `CustomerMemory` port:
  - `getProfile(input: { storeId; externalUserId; channel })` — return `CustomerProfile` (customer, coupons, usages) or `null`.
  - `tag(input: { customerId; tags?; interests? })` — merge tags/interests and emit `CustomerProfileUpdated`.
  - `recordCouponSent(input: { customerId; couponId })` — mark a coupon as sent in memory (adds a `coupon-sent` tag).
  - `recordCouponUsed(input: { customerId; couponId; orderRef? })` — record a `CouponUsage` and add a `coupon-used` tag.
- Consumes `CouponGenerated` from `ecommerce` to tag the customer.
- Emits `CustomerProfileUpdated` on changes.

> Other modules interact ONLY through the contract above (application service / port / domain events). No module imports this module's internals. No circular dependencies.

## 5. Data / Persistence
`Customer` (igUserId, fbUserId, username, interests[], tags[]), links to `Coupon` (sent) and `CouponUsage` (used). All schema changes via Prisma migrations.

## 6. Notes
PII handling per Security spec; memory retrieval scoped to the owning store/channel.

## 7. Acceptance Criteria (Definition of Done)
- [x] `CustomerMemory` port modeled and implemented by `PrismaCustomerRepository`.
- [x] `getProfile` aggregates coupons/usages by store + external id + channel.
- [x] `tag`, `recordCouponSent`, `recordCouponUsed` implemented.
- [x] `CustomerProfileUpdated` emitted and exported.
- [x] CRM subscribes to `CouponGenerated` and tags the customer.
- [x] Lint + typecheck pass; `CHANGELOG.md` updated.
