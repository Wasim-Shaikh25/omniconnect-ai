# Spec 0009: Notifications

- **Module(s):** notifications
- **Status:** Draft
- **Owner:** wasim
- **Related task(s):** docs/tasks/backlog.md
- **Related ADR(s):** —
- **Last updated:** 2026-07-24

## 1. Summary
Real-time and email notifications for new messages, new followers, coupon usage, escalation requests, and system errors. Channels: in-app and email.

## 2. Goals
- Notify on: new messages, new followers, coupon usage, escalation requests, system errors
- Channels: in-app notifications and email
- User-configurable preferences

## 3. Non-Goals
- Anything listed under Phase 2/3 in the Future Roadmap (see `docs/specs/0000-project-overview.md`).

## 4. Public Contract (loose coupling)
- `Notifier` port: `notify(userId, event)`; channel adapters (in-app, email) behind interfaces.
- Subscribes to domain events from `meta`, `coupons`, `ai`, and system error events.

> Other modules interact ONLY through the contract above (application service / port /
> domain events). No module imports this module's internals. No circular dependencies.

## 5. Data / Persistence
`Notifications` (userId, type, payload, read, channel, createdAt). Ownership: `notifications`.
All schema changes via Prisma migrations.

## 6. Notes
Delivery via BullMQ workers; channel adapters extensible like connectors.

## 7. Acceptance Criteria (Definition of Done)
- [ ] Domain modeled (entities, events) with pure unit tests.
- [ ] Application services/ports implemented and exposed via the module's public barrel.
- [ ] Infrastructure adapters/repositories implemented (Prisma, external APIs).
- [ ] Presentation (routes/UI) wired where applicable, with RBAC.
- [ ] Lint + typecheck + tests pass; `CHANGELOG.md` updated.

> This is an initial stub. Expand using `_TEMPLATE.md` before implementation begins.
