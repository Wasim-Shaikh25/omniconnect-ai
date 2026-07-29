---
description: Unified Intelligence Layer (OmniConnect 2.0)
---

# REQ-0033: Unified Intelligence Layer (OmniConnect 2.0)

- **Status:** Implemented
- **Owner:** wasim
- **Module(s):** `intelligence` (new horizontal module) + `analytics`, `crm`, `conversations`, `ecommerce`, `campaigns`, `content`, `branddeals`, `affiliates`, `reports`, `notifications`
- **Original spec path:** `docs/specs/0033-unified-intelligence-layer.md` (restructured)
- **Task:** `docs/tasks/TASK-0033-unified-intelligence-layer.md`
- **Tracker:** `docs/trackers/TRACKER-0033-unified-intelligence-layer.md`
- **Last updated:** 2026-07-29

> This file was migrated from `docs/specs/0033-unified-intelligence-layer.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


- **Module(s):** `intelligence` (new horizontal module) + `analytics`, `crm`, `conversations`, `ecommerce`, `campaigns`, `content`, `branddeals`, `affiliates`, `reports`, `notifications`
- **Status:** Implemented
- **Owner:** wasim
- **Related task(s):** `docs/tasks/TASK-350-unified-intelligence-layer.md`
- **Related ADR(s):** —
- **Last updated:** 2026-07-25

## 1. Summary

Add a horizontal **Unified Intelligence Layer (UIL)** beneath and across the existing product modules. The UIL ingests normalized signals from every module and integration, resolves identities and business context, detects material changes, explains likely causes, produces calibrated predictions, recommends the next best action, and learns from measured outcomes.

The user experiences this as a prioritized **Today** feed on the dashboard, a shared **Intelligence Panel** embedded in every module, a unified customer and business timeline, narrative analytics attached to key metrics, goal-based automation plans, proactive alerts/ opportunities/risks, and evidence-backed actions with preview and approval.

This is an architectural and product-experience program, not an isolated AI feature. See `OmniConnect_2.0_Unified_Intelligence_Strategy.md` for the full strategy.

## 2. Goals

- Provide one governed semantic layer for metrics, entities, and signals.
- Surface **what is happening**, **why it is happening**, and **what to do next** in one consistent pattern.
- Make insights first-class, persistent objects with evidence, hypotheses, lifecycle, and executable recommendations.
- Enable goal-based automation with guardrails, approvals, simulations, and outcome tracking.
- Build a closed learning loop: action → outcome → `BusinessLearning` → improved ranking.
- Keep human authority scaling with risk and never auto-execute high-impact outbound actions without approval.

## 3. Non-Goals

- A standalone “AI Insights” module that users must remember to open.
- Generic advice disconnected from workspace data.
- Causality claims without appropriate evidence or experimental backing.
- Auto-sending high-impact campaigns/messages without configured approval.
- Replacing source systems as authoritative owners of unavailable data.
- Predictions for entities with insufficient history.
- Optimizing engagement at the expense of consent, customer trust, or profitability.

## 4. User Stories

- As a Store Owner, I want a daily prioritized brief so I know what needs my attention first.
- As a Marketer, I want to understand why revenue changed and which lever to pull without switching screens.
- As a Support Lead, I want the Inbox to show high-intent or high-risk conversations with customer context.
- As a Store Owner, I want recommended actions I can preview, edit, assign, snooze, dismiss, or approve.
- As an Analyst, I want forecasts and predictions with probability bands, freshness, and known limitations.
- As an Admin, I want every automated action to be idempotent, audited, and reversible when appropriate.

## 5. Domain Model

The `intelligence` module owns the following aggregates and value objects:

- `Signal` — canonical observed event with schema version, source lineage, freshness, quality status, and quarantine state.
- `EntityLink` — typed relationship between entities with confidence (`verified` | `probable` | `possible` | `rejected`), resolution method, status, and provenance.
- `BusinessInsight` — material observation, opportunity, risk, anomaly, or explanation with evidence, hypotheses, recommended actions, materiality, freshness, and lifecycle.
- `Hypothesis` — candidate explanation with evidence-for/against, confidence, validation method, and status.
- `Prediction` — outcome, horizon, estimate/probability band, interval, model version, features summary, calibration, and expiration.
- `Recommendation` — proposed action with subject, objective, reason codes, impact range, confidence, effort, urgency, risk tier, and eligibility.
- `ActionPlan` — executable steps, target objects, drafts, approvals, stop conditions, cost/volume estimate, and measurement plan.
- `Decision` — user or policy decision (`approved` | `edited` | `assigned` | `snoozed` | `rejected` | `expired`) with reason.
- `Outcome` — result tied to an action with observation window, metric values, attribution/experiment method, confidence, and status.
- `BusinessLearning` — versioned conditional pattern derived from outcomes and experiments.
- `Goal` — business objective, target metric, baseline, target, dates, owner, pacing, and linked recommendations.
- `DataQualityIssue` — affected source/entity/metric, severity, period, impact, status, and resolution.
- `MetricDefinition` / `MetricSnapshot` — governed semantic metric with formula, grain, dimensions, exclusions, source, freshness SLA, timezone/currency behavior, owner, and version.

Other modules continue to own their domain objects and emit canonical signals for the UIL to consume.

## 6. Public Contract

### Ports / Application Services

- `SignalIngestionService.ingest(signal)`
- `EntityResolutionService.resolve(signal)` and `mergeOrSplitLinks(...)`
- `KnowledgeGraphService.queryGraph(...)`
- `MetricService.getMetric(definitionId, filters, period)`
- `FeatureService.computeFeatures(entityType, entityId)`
- `DetectionService.detect(workspaceId, signalStream)`
- `DiagnosisService.explain(insight)`
- `PredictionService.predict(workspaceId, predictionType, target)`
- `RecommendationService.generate(insight)` and `rank(...)`
- `DecisionPolicyService.canExecute(actionPlan)`
- `OutcomeLearningService.recordOutcome(...)` and `applyLearning(...)`
- `TimelineService.getTimeline(entityType, entityId)`
- `IntelligenceFeedService.query(...)`

### Domain Events Published

- `BusinessInsightGenerated`
- `PredictionGenerated`
- `RecommendationGenerated`
- `RecommendationAccepted` / `RecommendationEdited` / `RecommendationDismissed` / `RecommendationSnoozed`
- `ActionPlanApproved` / `ActionPlanExecuted` / `ActionPlanFailed` / `ActionPlanStopped`
- `OutcomeMeasured`
- `BusinessLearningUpdated`
- `DataQualityIssueDetected` / `DataQualityIssueResolved`
- `GoalPacingChanged`

### Cross-Module Rules

- Other modules must consume UIL outputs only through the public ports and events above.
- UIL must consume source module data through their public contracts, not by deep imports.
- No circular dependencies: `intelligence` may depend on shared kernel and public contracts; modules may depend on `intelligence` public contract.

## 7. Data / Persistence

Prisma migrations must add the tables for the domain model in §5, with at least:

- `Signal`, `EntityLink`, `BusinessInsight`, `Hypothesis`, `Prediction`, `Recommendation`, `ActionPlan`, `Decision`, `Outcome`, `BusinessLearning`, `Goal`, `DataQualityIssue`, `MetricDefinition`, `MetricSnapshot`.
- Proper tenant scoping (`organizationId`, `storeId` where applicable).
- Indexes for `(workspaceId, status, createdAt)`, `(storeId, type, status)`, `(entityType, entityId, confidence)`, and `(signalType, workspaceId, ingestedAt)`.
- JSON columns for `evidence`, `data`, `lineage`, `reasonCodes`, `impactRange`.

## 8. API / UI Surface

### New Routes / API Endpoints

- `GET  /v2/intelligence/feed`
- `GET  /v2/intelligence/insights/{id}`
- `POST /v2/intelligence/insights/{id}/dismiss`
- `POST /v2/intelligence/insights/{id}/snooze`
- `GET  /v2/intelligence/recommendations/{id}`
- `POST /v2/intelligence/recommendations/{id}/decisions`
- `POST /v2/intelligence/recommendations/{id}/action-plans`
- `POST /v2/intelligence/action-plans/{id}/validate`
- `POST /v2/intelligence/action-plans/{id}/execute`
- `GET  /v2/intelligence/action-plans/{id}/outcome`
- `GET  /v2/entities/{type}/{id}/timeline`
- `GET  /v2/entities/{type}/{id}/intelligence`
- `GET  /v2/goals/{id}/pacing`

### UI Components / Pages

- `IntelligencePanel` — shared three-layer panel (`What is happening?` / `Why is it happening?` / `What should I do next?`).
- `TodayFeed` — prioritized dashboard home replacing widget-first layout.
- `EvidenceDrawer` — drill-down from any insight/statement to data, assumptions, and missing sources.
- `TimelineView` — unified journey timeline grouped by stage (Discovery → Engagement → Consideration → Purchase → Fulfillment → Retention → Advocacy).
- `NarrativeChart` — chart wrapper with headline, context, drivers, confidence, decision, and expected result.
- `ActionPreview` / `ActionEditor` — preview/edit/assign/snooze/dismiss/approve controls.
- `GoalPlanner` / `AutomationGoalWizard` — outcome-first automation setup.

## 9. External Integrations

The UIL does not introduce new third-party integrations. It consumes signals produced by existing modules (Meta Graph API, Shopify, OpenAI, etc.) and reuses the `ecommerce`, `meta`, `ai`, and `notifications` connectors.

## 10. Edge Cases & Failure Modes

- **Stale or missing data:** surface `DataQualityIssue` and abstain from high-priority business advice.
- **Low identity confidence:** do not use `possible` links for consequential actions; request review.
- **Insufficient history:** prediction service must abstain and show scenario ranges or rules-based fallback.
- **Duplicate signals:** idempotent ingestion keyed by `event_id` + source + workspace.
- **Late / out-of-order events:** recompute affected insights and emit correction signals.
- **Overconfidence:** predictions display intervals, calibration, and known missing factors.
- **Action conflict:** decision policy engine detects overlapping campaigns and suppression rules.
- **Permission boundary failure:** zero critical failures target; every action checks RBAC, consent, and tenant scope.

## 11. Security & Privacy

- All UIL endpoints require RBAC (`ADMIN`, `STORE_OWNER`, `STAFF`) and tenant scoping.
- Risk tier enforcement: Tier 3/4 actions require explicit approval; Tier 4 never auto-executes.
- Consent and suppression evaluated at execution time, not just enrollment.
- PII minimized in event payloads and model logs; evidence references are server-generated and authorization-checked.
- Prompt-injection resistance: retrieved messages, webhooks, and documents are untrusted; tool permissions are independent of model text.
- Every side effect uses idempotency keys and produces an audit event.

## 12. Testing Strategy

- **Domain unit tests:** pure ranking, scoring, policy evaluation, hypothesis confidence, signal deduplication.
- **Repository/contract tests:** Prisma repositories for all new entities; metric reconciliation against source mocks.
- **Integration tests:** end-to-end thin slices (e.g. order+inventory signals → revenue anomaly → recommended campaign → approved → outcome tracked).
- **AI tests:** groundedness, uncertainty language, missing-data behavior, prompt-injection resistance, tool validity, refusal of prohibited side effects.
- **User acceptance scenarios:** Sales decline, High-value customer, Campaign risk, Data failure.

## 13. Acceptance Criteria (Definition of Done)

- [x] Spec 0033 and linked task file are created and committed.
- [x] All P0 foundation services (`Signal`, `EntityLink`, `MetricDefinition`, `BusinessInsight`, `Recommendation`, `ActionPlan`, `Decision`, `Outcome`, `DataQualityIssue`) have Prisma models, repositories, and domain logic.
- [x] Shared APIs from §8 are implemented and RBAC-scoped.
- [x] `IntelligencePanel` and `TodayFeed` are visible on dashboard and embedded in at least CRM, Inbox, Orders, and Analytics.
- [x] At least the three initial stories (revenue decline, high-intent conversation, repeat-purchase re-engagement) work end-to-end.
- [x] Recommendation ranking, risk tiers, approval workflow, and outcome linkage are implemented.
- [x] Learning loop is closed: outcome measured → `BusinessLearning` updated → future ranking adjusted.
- [x] Lint + typecheck + build pass; no new `any` or cross-module deep imports.
- [x] `CHANGELOG.md` and `docs/tasks/backlog.md` updated.

## 14. Open Questions

1. Should the `intelligence` module live as a new top-level `src/modules/intelligence` or as extensions inside existing modules until it stabilizes?
2. Which queue implementation (BullMQ/Redis vs in-memory event bus) will canonical signals use for production?
3. Do we need a separate `Metric` microservice or keep it inside `intelligence`?
4. Which model provider powers predictions, and how do we handle offline/abstention fallbacks?
