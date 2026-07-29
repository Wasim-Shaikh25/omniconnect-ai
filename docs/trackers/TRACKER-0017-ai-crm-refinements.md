# TRACKER-0017: AI CRM Refinements — Lifecycle, Consent, Scoring, Segments

- **Status:** Done
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0017-ai-crm-refinements.md`
- **Task:** `docs/tasks/TASK-0017-ai-crm-refinements.md`
- **Last updated:** 2026-07-29

## 1. Summary

Progress tracker for REQ-0017.

## 2. Subtasks

### Planning
- [x] Requirement approved and task created.

### Implementation / Verification
- [x] Spec created and linked to backlog.
- [x] Schema migration adds lifecycle, consent, and last-activity fields.
- [x] `/customers` renders workspace customer list with scores and segment labels.
- [x] `/customers/[id]` shows profile, activity, and editable stage/consent.
- [x] Lint + typecheck + build pass.
- [x] CHANGELOG.md and backlog updated.

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

- Migrated from legacy spec `docs/specs/0017-ai-crm-refinements.md`.
