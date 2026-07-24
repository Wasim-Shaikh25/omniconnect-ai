# Spec 0006: Customer Memory System (CRM)

- **Module(s):** crm
- **Status:** Draft
- **Owner:** wasim
- **Related task(s):** docs/tasks/backlog.md
- **Related ADR(s):** —
- **Last updated:** 2026-07-24

## 1. Summary
Unified customer profile database enabling personalized AI conversations. Stores IG/FB user IDs, username, conversation history, sent coupons, coupon usage, interests, and tags.

## 2. Goals
- Customer profile keyed by IG/FB user IDs + username
- Track conversation history, sent coupons, coupon usage, interests, tags
- Expose memory to the AI assistant for personalization (returning-user recall)

## 3. Non-Goals
- Anything listed under Phase 2/3 in the Future Roadmap (see `docs/specs/0000-project-overview.md`).

## 4. Public Contract (loose coupling)
- `CustomerMemory` port: `getProfile(externalId)`, `recordInteraction`, `tag`, `recordCoupon`.
- Consumes events from `meta`, `coupons`, `conversations`; emits `CustomerProfileUpdated`.
- `ai` reads memory via this port only.

> Other modules interact ONLY through the contract above (application service / port /
> domain events). No module imports this module's internals. No circular dependencies.

## 5. Data / Persistence
`Customers` (igUserId, fbUserId, username, interests[], tags[], ...), links to `Conversations`, `Coupons`, `CouponUsage`. Ownership: `crm`.
All schema changes via Prisma migrations.

## 6. Notes
PII handling per Security spec; memory retrieval scoped to the owning organization/store.

## 7. Acceptance Criteria (Definition of Done)
- [ ] Domain modeled (entities, events) with pure unit tests.
- [ ] Application services/ports implemented and exposed via the module's public barrel.
- [ ] Infrastructure adapters/repositories implemented (Prisma, external APIs).
- [ ] Presentation (routes/UI) wired where applicable, with RBAC.
- [ ] Lint + typecheck + tests pass; `CHANGELOG.md` updated.

> This is an initial stub. Expand using `_TEMPLATE.md` before implementation begins.
