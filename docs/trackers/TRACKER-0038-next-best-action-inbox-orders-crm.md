# TRACKER-0038: 0038 — Next Best Action for Inbox, Orders, and CRM

- **Status:** Done
- **Owner:** Devin
- **Requirement:** `docs/requirements/REQ-0038-next-best-action-inbox-orders-crm.md`
- **Task:** `docs/tasks/TASK-0038-next-best-action-inbox-orders-crm.md`
- **Last updated:** 2026-07-29

## 1. Summary

Progress tracker for REQ-0038.

## 2. Subtasks

### Planning
- [x] Requirement approved and task created.

### Implementation / Verification
- [x] Inbox NBA server action and UI panel render for high-intent conversations.
- [x] Orders NBA server action returns at-risk high-value and post-delivery upsell lists.
- [x] CRM NBA server action returns retention and advocate candidates.
- [x] Cross-module wiring resolves Inbox ↔ CRM and Inbox ↔ Orders/Products references.
- [x] Proactive notification policy model/service with delivery tiers, dedup, cooldown, and user tuning.
- [x] End-to-end script exercises at least Inbox, Orders, and CRM NBA.
- [x] Lint + typecheck + build pass.

### Quality Gates
- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run test` passes.
- [x] `npm run build` passes.
- [x] `CHANGELOG.md` updated.

## 3. Acceptance Criteria

- [x] All linked requirement acceptance criteria are met.
- [x] All quality gates pass.

## 4. Notes / Blockers

- Migrated from legacy spec `docs/specs/0038-next-best-action-inbox-orders-crm.md`.
