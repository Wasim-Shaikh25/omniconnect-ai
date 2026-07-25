# Task 369: Validation-Driven Additions

- **Status:** Done
- **Spec:** `docs/specs/0045-validation-driven-additions.md`
- **Module(s):** `intelligence`, cross-module
- **Owner:** wasim
- **Changelog entry:** Adds validation-driven additions from the first TASK-350 completeness pass.

## Description

Implement the remaining `TASK-350` subtasks identified during the first completeness pass: unified context, knowledge graph, feature profiles, goal-plan generation, learning hierarchy, model ops, prediction prioritization, user feedback, Today feed drill-downs, chart acceptance, and data-quality gate.

## Subtasks (11)

- [x] 126. Resolve the five fragmentation forms (data, context, decision, learning, experience) by unifying identity, metrics, timeline, recommendations, and shared UI patterns.
- [x] 129. Implement the knowledge graph query set: content→conversation→product influence, Instagram exchange→purchase, campaign/coupon→order attribution, content patterns→brand outreach, segment response to early access vs discounts.
- [x] 130. Implement feature and profile outputs per §3.2.5: customer RFM/affinity/channel preference/response-time/lifecycle/discount sensitivity/propensity/churn risk; product velocity/margin proxy/stock-cover/return/mentions/demand/cross-sell; content format/topic/hook/CTA/timing/response/attributed revenue; campaign audience/offer/sequence/channel/cost/conversion/fatigue; business seasonality/forecast/anomalies/goal pacing/constraints.
- [x] 131. Implement the full goal-plan generation flow: user edits/approves, system creates a versioned workflow in the existing automation engine, test run, launch with control/holdout, and post-launch recommendation to continue/adjust/pause/conclude.
- [x] 132. Implement learning evidence hierarchy: workspace-specific, segment-specific, anonymized benchmark, and general product guidance with confidence labels.
- [x] 133. Implement model operations: version datasets/features/models/thresholds/policies, temporal-split validation, baseline comparison, calibration/drift/segment/latency/cost monitoring, abstention, feature flags, shadow mode, rollback.
- [x] 134. Implement prediction prioritization criteria (predicted event matters, intervention possible, result measurable, data sufficient, error costs manageable) and abstention when not met.
- [x] 135. Implement the "I understand why" user rating, verified hours saved, and false positive/negative rate tracking in intelligence KPI dashboards.
- [x] 136. Implement Today feed interaction requirements: every sentence expands into evidence, "Why?", "Compared with what?", "What changed?" drill-downs, and dismissal reason improving future ranking.
- [x] 138. Implement narrative analytics chart acceptance rule: promote a chart to default dashboard only if it supports a stated decision; otherwise keep in exploration/custom reports.
- [x] 139. Implement the data-quality gate check before high-priority insight generation: required sources connected, freshness within threshold, identity confidence sufficient, metric definition valid, minimum history/sample available, no unresolved reconciliation issue.

## Acceptance Criteria

- [x] `UnifiedContextService` returns a consolidated workspace context.
- [x] `KnowledgeGraphService` returns the five required query results.
- [x] `FeatureService` exposes customer, product, content, campaign, and business feature profiles.
- [x] Goal-plan generation supports versioned workflows, test runs, and holdout launch.
- [x] Learning evidence hierarchy is documented and queryable.
- [x] Model ops tracking includes versions, validation, drift, abstention, and rollback.
- [x] Prediction prioritization criteria applied with abstention when not met.
- [x] User feedback ratings ("I understand why") and hours saved tracked.
- [x] Today feed supports drill-downs and dismissal reasons.
- [x] Chart acceptance rule enforced before dashboard promotion.
- [x] Data-quality gate blocks high-priority insight generation when checks fail.
- [x] `scripts/verify-task369.ts` passes.
- [x] Lint + typecheck + build pass.
