# TRACKER-0051: Platform Administration — Super Admin, SaaS Coupons, Support Tickets, and Operational Logging

- **Status:** Todo
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0051-platform-admin-coupons-tickets-logging.md`
- **Task:** `docs/tasks/TASK-0051-platform-admin-coupons-tickets-logging.md`
- **Last updated:** 2026-07-29

## 1. Summary

Progress tracker for REQ-0051.

## 2. Subtasks

### Planning
- [ ] Requirement approved and task created.

### Implementation / Verification
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

### Quality Gates
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run test` passes.
- [ ] `npm run build` passes.
- [ ] `CHANGELOG.md` updated.

## 3. Acceptance Criteria

- [ ] All linked requirement acceptance criteria are met.
- [ ] All quality gates pass.

## 4. Notes / Blockers

- Migrated from legacy spec `docs/specs/0051-platform-admin-coupons-tickets-logging.md`.
