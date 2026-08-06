# TASK-0089: Intelligence Layer

- **Status:** Done
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0089-intelligence-layer.md`
- **Tracker:** `docs/trackers/TRACKER-0089-intelligence-layer.md`
- **Module(s):** intelligence, auth, ai
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Intelligence layer: plan-tier gating for all intelligence features.
- **Last updated:** 2026-08-06

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

- [x] T-073: Adapt intelligence features to new scope + expand
- [x] Add `IntelligenceFeature` + `canUseIntelligenceFeature` domain rule in `src/modules/intelligence/domain/access.ts`.
- [x] Add `plan` to `SessionUser` so every server action/page can read the current user's plan.
- [x] Gate intelligence read/mutating actions (`getRecommendationsAction`, `getPredictionsAction`, `getHypothesesAction`, `getBusinessLearningAction`, `getTodayActionsAction`, `getGoalsAction`, `getBusinessBrainContextAction`, `createGoalAction`, `createGoalAutomationAction`, `createGoalPlanWorkflowAction`, `launchGoalPlanWorkflowAction`, `approveRecommendationAction`, `executeActionPlanAction`, `completeDailyActionAction`, `skipDailyActionAction`, `askBusinessBrainAction`).
- [x] Hide Marketing Brain + Pro-only widgets on `/business-brain` and `/stores/[projectId]/daily-marketing` for Free users.
- [x] Unit test `canUseIntelligenceFeature` for all plans/features.

## 5. Acceptance Criteria

- [x] Matches REQ-0089 acceptance criteria.
- [x] Lint + typecheck + tests pass.
- [x] `CHANGELOG.md` updated.

## 6. Notes / Blockers

- Phase 4 — builds on all other modules.
