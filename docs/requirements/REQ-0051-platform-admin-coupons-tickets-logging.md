---
description: Platform Administration — Super Admin, SaaS Coupons, Support Tickets, and Operational Logging
---

# REQ-0051: Platform Administration — Super Admin, SaaS Coupons, Support Tickets, and Operational Logging

- **Status:** In Progress
- **Owner:** wasim
- **Module(s):** `auth`, `users`, `organizations`, `support`, `billing`, `shared/observability`
- **Original spec path:** `docs/specs/0051-platform-admin-coupons-tickets-logging.md` (restructured)
- **Task:** `docs/tasks/TASK-0051-platform-admin-coupons-tickets-logging.md`
- **Tracker:** `docs/trackers/TRACKER-0051-platform-admin-coupons-tickets-logging.md`
- **Last updated:** 2026-07-29

> This file was migrated from `docs/specs/0051-platform-admin-coupons-tickets-logging.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


- **Module(s):** `auth`, `users`, `organizations`, `support`, `billing`, `shared/observability`
- **Status:** In Progress
- **Owner:** wasim
- **Related task(s):** `docs/tasks/TASK-375-platform-admin-coupons-tickets-logging.md`
- **Related ADR(s):** —
- **Last updated:** 2026-07-26

## 1. Summary

Give the OmniConnect AI founder a secure, isolated platform-admin surface to manage the SaaS itself: view all tenants (organizations/users), issue flexible percentage discount coupons for subscription plans, triage user support tickets, and inspect centralized application/system logs. This is distinct from the existing organization-scoped `ADMIN`/`STORE_OWNER` roles; a super admin operates across tenants and controls platform-level features.

## 2. Goals

- Introduce a `SUPER_ADMIN` capability (a `User.isSuperAdmin` flag plus a guard) that is independent of organization role.
- Build a `/admin` dashboard with sections for tenants, users, SaaS coupons, support tickets, and system logs.
- Allow super admins to create SaaS coupon codes with a flexible percentage discount (1–100%), usage cap, expiration, and plan eligibility; codes are redeemable during Stripe Checkout.
- Allow users to open support tickets; super admins can view, assign, update status/priority, and reply.
- Provide a centralized `SystemLog` table and an admin log viewer so operational and application errors can be triaged.
- Wire server actions so that every admin mutation writes an `AuditLog` entry for traceability.

## 3. Non-Goals

- Usage-based metering, per-seat billing, or proration.
- Real-time log streaming or external log aggregation (Sentry/OpenTelemetry remain optional; this slice stores logs in-app).
- Fixed-amount (flat $) SaaS coupons in this iteration (percentage only; Stripe `percent_off`).
- Automated ticket routing or AI reply suggestions.
- Feature flags to enable/disable product modules for individual tenants (keep the UI structure for future feature toggles, but not implement policy engine in this slice).

## 4. User Stories

- As the founder, I want a `/admin` area so I can manage the whole platform without switching organizations.
- As the founder, I want to generate coupon codes with any percentage discount so I can run promotions for SaaS users.
- As a SaaS user, I want to enter a coupon code when upgrading so I receive the configured discount.
- As a SaaS user, I want to open a support ticket when I hit an issue and see its status.
- As the founder, I want to see user tickets, change their status, and reply so I can triage issues.
- As the founder, I want to see application errors and system events in one place so I can investigate problems.

## 5. Domain Model

- `User.isSuperAdmin: boolean` — platform super-user flag, orthogonal to `Role`.
- `SaaSCoupon` — aggregate owned by `organizations` module extension for billing.
  - `code: String @unique` (uppercase alphanumeric, `_`, `-`).
  - `discountPct: Int` (1–100).
  - `maxUses: Int?`, `usedCount: Int @default(0)`.
  - `expiresAt: DateTime?`.
  - `appliesTo: String[]` (plan names `FREE`, `STARTER`, `PRO`; empty = all).
  - `isActive: Boolean @default(true)`.
  - `stripeCouponId`, `stripePromotionCodeId` (optional; used to apply discount in Stripe Checkout).
  - `createdBy`, `createdAt`, `updatedAt`.
  - Domain event `SaaSCouponCreated`.
- `SupportTicket` — aggregate for user support.
  - `organizationId`, `userId` (reporter).
  - `title`, `description`.
  - `status: TicketStatus` (`OPEN`, `IN_PROGRESS`, `WAITING`, `CLOSED`).
  - `priority: TicketPriority` (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
  - `category: TicketCategory` (`BILLING`, `TECHNICAL`, `FEATURE_REQUEST`, `OTHER`).
  - `assignedTo: String?`.
  - `createdAt`, `updatedAt`.
  - `TicketComment` child with `message`, `isInternal` (admin-only note), `userId`, `createdAt`.
  - Domain event `SupportTicketCreated`, `SupportTicketUpdated`.
- `SystemLog` — operational logging record.
  - `level: SystemLogLevel` (`DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`).
  - `service`, `message`, `stackTrace?`, `metadata: Json?`.
  - `organizationId?`, `userId?`.
  - `createdAt`.

## 6. Public Contract

- `auth` module exposes `requireSuperAdmin()` guard.
- `organizations` module exposes:
  - `createSaaSCouponAction`, `listSaaSCouponsAction`, `applyCouponToCheckoutAction`.
  - `getOrganizationOverview` already exists; admin queries list all orgs/users for super admins.
- New `support` module exposes:
  - `createTicketAction`, `listMyTicketsAction` (user), `listAllTicketsAction`, `updateTicketAction`, `addTicketCommentAction`.
- `shared/observability` module exposes `logSystemError` / `logSystemInfo` helpers and `listSystemLogsAction` (super admin).

## 7. Data / Persistence

- Prisma schema additions:
  - `User.isSuperAdmin Boolean @default(false)`.
  - New `SaaSCoupon` model with unique `code`, indexes on `isActive` + `expiresAt`.
  - New `SupportTicket` + `TicketComment` models with indexes on `organizationId`, `status`, `userId`.
  - New `SystemLog` model with index on `level` + `createdAt`.
- All schema changes via `npx prisma migrate dev`.

## 8. API / UI Surface

### Super admin guard
- `requireSuperAdmin()` throws `ForbiddenError` if `!user.isSuperAdmin`.

### Admin pages (super admin only)
- `/admin` — dashboard with counts: organizations, users, coupons, open tickets, recent logs.
- `/admin/organizations` — list all organizations with plan/status.
- `/admin/users` — list all users, toggle `isSuperAdmin` (super admin only), link to organization.
- `/admin/coupons` — list/create SaaS coupons; form with code, discount %, max uses, expiration, plan eligibility, active toggle.
- `/admin/tickets` — list all support tickets with filters (status, priority, category); detail with status update, priority change, assign, add comment.
- `/admin/logs` — list system logs, filter by level/service, newest first.

### User-facing pages
- `/support` (or `/help/tickets`) — create ticket form, list my tickets.
- `/settings/billing` — coupon code input before checkout; validates and creates Stripe Checkout with discount applied.

### Server actions
- `createSaaSCouponAction` — validates input, creates Stripe coupon + promotion code, persists.
- `listSaaSCouponsAction` — paginated list for admin.
- `applyCouponToCheckoutAction` — validates code, returns Stripe promotion code ID or error.
- `createTicketAction` — user creates ticket.
- `listMyTicketsAction` / `listAllTicketsAction`.
- `updateTicketAction` / `addTicketCommentAction`.
- `listSystemLogsAction` / `logSystemError` (used in error boundaries and catch blocks).

## 9. External Integrations

- **Stripe**: when a super admin creates a SaaS coupon, call `stripe.coupons.create({ percent_off, max_redemptions, redeem_by, duration: 'forever' })` and `stripe.promotionCodes.create({ coupon, code })`. Persist both IDs. At checkout, pass `discounts: [{ promotion_code: stripePromotionCodeId }]` if a valid code is supplied; otherwise `allow_promotion_codes: false`.
- If Stripe keys are missing, coupon creation is disabled with an alert.

## 10. Edge Cases & Failure Modes

- Duplicate coupon code → enforce uniqueness at DB + Stripe; return validation error.
- Coupon expired or max uses reached → reject at validation.
- Coupon not applicable to selected plan → reject.
- Stripe coupon creation fails → do not persist the local coupon; show error.
- Ticket created by unauthenticated user → reject.
- Non-super admin accessing `/admin/*` → 403 / redirect to `/dashboard`.
- First super admin must be seeded manually or promoted via a one-off script; no self-service elevation.

## 11. Security & Privacy

- Every `/admin` page and action gated by `requireSuperAdmin()`.
- Super admin can see cross-tenant data; never expose PII unnecessarily in logs or ticket list.
- `SystemLog` metadata must not include secrets, tokens, or full payment payloads.
- Ticket comments marked `isInternal` are never returned to non-admin users.
- Audit every admin action into `AuditLog` (`action`, `resource`, `resourceId`, `details`).

## 12. Testing Strategy

- Unit: coupon validation schema, ticket status transitions.
- Integration: create coupon → Stripe test coupon created → checkout session includes promotion code.
- UI: `/admin` redirects non-super admin; super admin can create/list coupons and tickets.
- End-to-end: user creates ticket → admin updates status and replies → user sees update.

## 13. Acceptance Criteria (Definition of Done)

- [ ] Spec and task tracker created.
- [ ] Prisma migration adds `User.isSuperAdmin`, `SaaSCoupon`, `SupportTicket`, `TicketComment`, `SystemLog`.
- [ ] `requireSuperAdmin()` guard and admin layout/page exist.
- [ ] Super admin can create SaaS coupons with arbitrary percentage discount and Stripe sync.
- [ ] Users can apply coupon codes during Stripe Checkout and receive the discount.
- [ ] Users can create/view support tickets; super admins can triage and reply.
- [ ] System logs are persisted and viewable in `/admin/logs`.
- [ ] All admin mutations write `AuditLog` entries.
- [ ] `npm run lint`, `npm run typecheck`, `npm run build` pass.
- [ ] CHANGELOG.md updated; PR created and linked to spec/task.

## 14. Open Questions

1. Should a super admin be able to impersonate/assume an organization tenant? (Deferred.)
2. Should coupons support fixed-amount ($) discounts or annual billing? (Deferred.)
3. Should tickets notify users via email? (Deferred; in-app notifications for now.)
