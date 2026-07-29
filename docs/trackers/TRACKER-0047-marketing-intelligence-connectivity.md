# TRACKER-0047: 0047 — Marketing Intelligence Connectivity

- **Status:** Todo
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0047-marketing-intelligence-connectivity.md`
- **Task:** `docs/tasks/TASK-0047-marketing-intelligence-connectivity.md`
- **Last updated:** 2026-07-29

## 1. Summary

Progress tracker for REQ-0047.

## 2. Subtasks

### Planning
- [ ] Requirement approved and task created.

### Implementation / Verification
- [ ] Competitor Analysis detects changes and produces benchmark gaps with actionable suggestions.
- [ ] Workspace vs competitor side-by-side comparison (`getWorkspaceCompetitorComparison` + UI).
- [ ] Repeated DM questions produce a `DmPatternDetected` insight and at least one campaign recommendation.
- [ ] Repeated comment objections produce a `CommentPatternDetected` insight and update product/campaign strategy.
- [ ] Each product has promotion scores and an explanation.
- [ ] `MarketingMemory` is computed on demand across `content`, `ai`, `commerce`, and `intelligence` flows and drives the Daily Marketing dashboard.
- [ ] Business Brain produces a daily marketing brief with all required sections.
- [ ] No raw PII is stored in `MarketingMemory` or insights (sample phrases redact usernames/phone/email; patterns store categories).
- [ ] Lint + typecheck + build pass.
- [ ] `CHANGELOG.md` and task tracker updated.

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

- Migrated from legacy spec `docs/specs/0047-marketing-intelligence-connectivity.md`.
