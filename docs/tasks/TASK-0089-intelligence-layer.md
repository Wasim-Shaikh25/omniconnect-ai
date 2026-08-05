# TASK-0089: Intelligence Layer

- **Status:** Todo
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0089-intelligence-layer.md`
- **Tracker:** `docs/trackers/TRACKER-0089-intelligence-layer.md`
- **Module(s):** intelligence
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Intelligence layer: daily brief, brain, predictions, signals.
- **Last updated:** 2026-08-05

## 1. Summary

Keep and expand all intelligence features: Daily Brief, Marketing Brain/Memory, Next Best Action, Signal Detection, Predictions, Hypotheses, Business Learnings, Operating Model. Adapt existing implementations to new workspace/project scope.

## 2. References

- Requirement: `docs/requirements/REQ-0089-intelligence-layer.md`
- Related files:
  - `src/modules/intelligence/` (existing)
  - `src/modules/ai/application/brain-memory.ts`

## 3. Implementation Plan

### Step 1 — Scope Migration
Update all intelligence queries from org/store to user/workspace/project scope.

### Step 2 — Daily Brief
AI-generated morning summary: key metrics, trends, anomalies, action items. Scheduled via BullMQ cron.

### Step 3 — Marketing Brain
Persistent context per project: what's working, what's been tried, brand patterns. Updated after each campaign.

### Step 4 — Intelligence Features
Next Best Action, Signal Detection, Predictions, Hypotheses, Business Learnings — adapt to new data model.

### Step 5 — Plan Gating
Free: Daily Brief only. Pro: Full intelligence. Business: Full + predictions.

## 4. Subtasks

- [ ] T-073: Adapt intelligence features to new scope + expand

## 5. Acceptance Criteria

- [ ] Matches REQ-0089 acceptance criteria.
- [ ] Lint + typecheck + tests pass.
- [ ] `CHANGELOG.md` updated.

## 6. Notes / Blockers

- Phase 4 — builds on all other modules.
