# TRACKER-0038: 0038 — Next Best Action for Inbox, Orders, and CRM

- **Status:** Todo
- **Owner:** Devin
- **Requirement:** `docs/requirements/REQ-0038-next-best-action-inbox-orders-crm.md`
- **Task:** `docs/tasks/TASK-0038-next-best-action-inbox-orders-crm.md`
- **Last updated:** 2026-07-29

## 1. Summary

Progress tracker for REQ-0038.

## 2. Subtasks

### Planning
- [ ] Requirement approved and task created.

### Implementation / Verification
- [ ] Inbox NBA server action and UI panel render for high-intent conversations.
- [ ] Orders NBA server action returns at-risk high-value and post-delivery upsell lists.
- [ ] CRM NBA server action returns retention and advocate candidates.
- [ ] Cross-module wiring resolves Inbox ↔ CRM and Inbox ↔ Orders/Products references.
- [ ] Proactive notification policy model/service with delivery tiers, dedup, cooldown, and user tuning.
- [ ] End-to-end script exercises at least Inbox, Orders, and CRM NBA.
- [ ] Lint + typecheck + build pass.

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

- Migrated from legacy spec `docs/specs/0038-next-best-action-inbox-orders-crm.md`.
