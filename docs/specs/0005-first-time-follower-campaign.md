# Spec 0005: First-Time Follower Campaign

- **Module(s):** crm, coupons, ai, notifications
- **Status:** Draft
- **Owner:** wasim
- **Related task(s):** docs/tasks/backlog.md
- **Related ADR(s):** —
- **Last updated:** 2026-07-24

## 1. Summary
Automated event-driven workflow: when a user follows an Instagram page, detect if first interaction, generate a personalized coupon, and send an AI welcome message with the code.

## 2. Goals
- Detect new follower (from `NewFollow` event)
- Check CRM to determine first interaction
- Generate personalized coupon (e.g. username JOHN_SMITH → code JOHN_SMITH, 10%)
- Send AI welcome message with the coupon
- Configurable: discount %, expiration, message template, eligibility rules

## 3. Non-Goals
- Anything listed under Phase 2/3 in the Future Roadmap (see `docs/specs/0000-project-overview.md`).

## 4. Public Contract (loose coupling)
- Orchestrated purely via domain events — no tight coupling: `NewFollow` → (crm) `FirstInteractionDetected` → (coupons) `CouponGenerated` → (ai/meta) welcome message → (notifications) `CouponSent`.
- Campaign settings live as a `Campaign` config consumed by handlers.

> Other modules interact ONLY through the contract above (application service / port /
> domain events). No module imports this module's internals. No circular dependencies.

## 5. Data / Persistence
`Campaigns`, `Followers`, `Customers`, `Coupons`, `CouponUsage`. Ownership spans modules via events.
All schema changes via Prisma migrations.

## 6. Notes
This spec is the canonical example of event-driven loose coupling; no module calls another's internals.

## 7. Acceptance Criteria (Definition of Done)
- [ ] Domain modeled (entities, events) with pure unit tests.
- [ ] Application services/ports implemented and exposed via the module's public barrel.
- [ ] Infrastructure adapters/repositories implemented (Prisma, external APIs).
- [ ] Presentation (routes/UI) wired where applicable, with RBAC.
- [ ] Lint + typecheck + tests pass; `CHANGELOG.md` updated.

> This is an initial stub. Expand using `_TEMPLATE.md` before implementation begins.
