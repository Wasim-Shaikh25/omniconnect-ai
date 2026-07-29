---
description: 0045 — Validation-Driven Additions
---

# REQ-0045: 0045 — Validation-Driven Additions

- **Status:** Implemented
- **Owner:** wasim
- **Module(s):** `intelligence` + cross-module
- **Original spec path:** `docs/specs/0045-validation-driven-additions.md` (restructured)
- **Task:** `docs/tasks/TASK-0045-validation-driven-additions.md`
- **Tracker:** `docs/trackers/TRACKER-0045-validation-driven-additions.md`
- **Last updated:** 2026-07-29

> This file was migrated from `docs/specs/0045-validation-driven-additions.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


- **Module(s):** `intelligence` + cross-module
- **Status:** Done
- **Owner:** wasim
- **Related task(s):** `docs/tasks/TASK-369-validation-driven-additions.md`
- **Last updated:** 2026-07-25

## 1. Summary

Close the remaining `TASK-350` validation-driven gaps identified during the first completeness pass: unified context, knowledge-graph queries, feature profiles, full goal-plan generation, learning evidence hierarchy, model operations, prediction prioritization, user feedback tracking, Today-feed drill-downs, chart acceptance rules, and data-quality gating before insight generation.

## 2. Goals

- Provide a single unified context view across identity, metrics, timeline, recommendations, and actions.
- Add knowledge-graph queries for content↔conversation↔product, Instagram exchange→purchase, campaign/coupon attribution, content→brand outreach, and segment response.
- Expose feature/profile outputs for customers, products, content, campaigns, and business.
- Extend goal-plan generation with versioned workflows, test runs, control/holdout, and post-launch recommendations.
- Add learning evidence hierarchy (workspace, segment, benchmark, general) with confidence labels.
- Add model-ops tracking (versions, validation, drift, abstention, rollback).
- Enforce prediction prioritization criteria and abstention.
- Add "I understand why" rating, hours saved, and false-positive/negative tracking.
- Add Today feed drill-downs and dismissal reasons.
- Add chart-acceptance rules for default dashboard promotion.
- Add data-quality gate before high-priority insight generation.

## 3. Non-Goals

- Replacing the primary event/Prisma store with a graph database.
- Real-time feature pipelines or external ML model training.

## 4. Public Contract

- `UnifiedContextService.getContext(workspaceId, storeId)`
- `KnowledgeGraphService` query methods
- `FeatureService.getCustomerFeatures`, `getProductFeatures`, `getContentFeatures`, `getCampaignFeatures`, `getBusinessFeatures`
- `GoalPlanGenerationService.createVersionedWorkflow`, `testRun`, `launchWithHoldout`
- `LearningEvidenceService.getHierarchy`
- `ModelOpsService.getModelOps`, `canDeploy`, `shouldAbstain`
- `PredictionPrioritizationService.scorePrediction`, `abstainIfNeeded`
- `IntelligenceFeedbackService.submitRating`, `getKpis`
- `IntelligenceFeedService.getDrillDown`, `dismissWithReason`
- `ChartAcceptanceService.evaluate(chart)`
- `DataQualityGate.check(ctx)`

## 5. UI / API Surface

- `/settings/unified-context` read-only context view
- `/business-brain` already exists; add feature-profile outputs and chart acceptance UI
- Today feed drill-down buttons on `/dashboard` and store detail pages

## 6. Testing Strategy

- `scripts/verify-task369.ts` exercises unified context, knowledge graph, features, goal plan versioning, learning hierarchy, model ops, prediction prioritization, feedback tracking, data-quality gate, and chart acceptance.

## 7. Acceptance Criteria

- [ ] `UnifiedContextService` returns a consolidated workspace context.
- [ ] `KnowledgeGraphService` returns the five required query results.
- [ ] `FeatureService` exposes customer, product, content, campaign, and business feature profiles.
- [ ] Goal-plan generation supports versioned workflows, test runs, and holdout launch.
- [ ] Learning evidence hierarchy is documented and queryable.
- [ ] Model ops tracking includes versions, validation, drift, abstention, and rollback.
- [ ] Prediction prioritization criteria applied with abstention when not met.
- [ ] User feedback ratings ("I understand why") and hours saved tracked.
- [ ] Today feed supports drill-downs and dismissal reasons.
- [ ] Chart acceptance rule enforced before dashboard promotion.
- [ ] Data-quality gate blocks high-priority insight generation when checks fail.
- [ ] `scripts/verify-task369.ts` passes.
- [ ] Lint + typecheck + build pass.
