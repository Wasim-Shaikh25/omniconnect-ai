# TASK-350: Unified Intelligence Layer — Live Progress Tracker

This file tracks all 139 subtasks from `TASK-350-unified-intelligence-layer.md` and is updated after every merged PR. Status legend:

- `[x]` Done — implemented and merged.
- `[~]` Partial — scaffolded or partly implemented; needs more work.
- `[ ]` Not started.

## Phase 0 — Alignment & instrumentation (Weeks 1–4)

- [~] 1. Finalize canonical signal and entity taxonomy across all modules.
- [x] 2. Design and implement `Signal` Prisma model/migration (canonical event envelope, source, lineage, freshness, quarantine status).
- [~] 3. Implement `SignalIngestionService`: schema/tenant validation, deduplication, late/out-of-order handling, recoverable quarantine queue.
- [~] 4. Define the first 20 governed metrics in `MetricDefinition` (revenue, conversion, AOV, repeat purchase, response time, high-intent conversation, etc.).
- [~] 5. Implement `MetricService` with formula engine, grain/dimensions, exclusions, timezone, currency behavior, and freshness SLA.
- [~] 6. Enforce workspace/entity authorization on every intelligence read/write path.
- [x] 7. Implement `EntityLink` model and `EntityResolutionService` with `verified`/`probable`/`possible`/`rejected` confidence levels and manual merge/split workflow.
- [~] 8. Build the customer identity graph across CRM, Inbox, Orders, and Meta signals.
- [x] 9. Implement `DataQualityIssue` model and data-quality gate (freshness, source connected, sample size, reconciliation issues).
- [~] 10. Instrument missing cross-module events (Inbox↔CRM, Orders, Content, Campaigns, Brand Deals, Affiliates, Competitor Intelligence, Integrations).
- [x] 11. Select and document the first three high-value stories: revenue decline diagnosis, high-intent conversation → purchase, customer re-engagement/repeat-purchase.
- [~] 12. Define AI and action risk policies (Tier 0–4, approval matrix, consent/frequency/fatigue rules).
- [ ] 13. Baseline current user behavior and business outcomes KPIs.
- [ ] 14. Conduct privacy and threat review for canonical signals and entity resolution.
- [x] 15. Demonstrate one end-to-end event trace in a test workspace.

## Phase 1 — Shared context MVP (Weeks 5–12)

- [x] 16. Implement unified customer timeline grouped by journey stage (Discovery → Engagement → Consideration → Purchase → Fulfillment → Retention → Advocacy).
- [~] 17. Implement `GET /v2/entities/{type}/{id}/timeline` with source, timestamp, confidence, related object, and attributed outcome.
- [x] 18. Add customer summary card with lifecycle/value band, current intent, risks/opportunities, consent, preferred channel, and best next action.
- [x] 19. Implement priority conversation context in `/inbox` and `/stores/[storeId]/conversations`.
- [~] 20. Implement shared semantic metric service consumed by Analytics, Reports, Dashboard, and Intelligence Panel.
- [~] 21. Add source freshness and data-quality indicators on Dashboard, CRM, Inbox, Orders, Campaigns, and Analytics screens.
- [x] 22. Implement cross-module deep links from intelligence objects to underlying records.
- [~] 23. Ensure CRM, Inbox, and Orders show a consistent customer identity with confidence labels.
- [~] 24. Verify permissions hold across UI, API, search, exports, and AI for shared context.

## Phase 2 — Explanatory intelligence (Weeks 13–20)

- [x] 25. Rebuild `/dashboard` as a prioritized **Today** feed: daily brief, critical risks, best opportunities, goal pacing, approvals/exceptions, what changed, learning, metrics.
- [~] 26. Implement `GET /v2/intelligence/feed` with cursor pagination, stable ranking, and filters (type, module, subject, goal, urgency, status, owner, confidence, date, risk tier).
- [x] 27. Implement `IntelligencePanel` shared component with three layers: What is happening? / Why is it happening? / What should I do next?
- [x] 28. Embed `IntelligencePanel` into Dashboard, CRM (`/customers/[customerId]`), Inbox, Orders, Campaigns, and Analytics.
- [x] 29. Implement baseline anomaly detection service (rules + statistical baselines) for signals and metrics.
- [x] 30. Implement revenue and funnel decomposition: traffic × conversion × AOV, plus new/repeat mix, product availability, campaign source, discounting, refunds, geography, customer segment.
- [x] 31. Implement `BusinessInsight` model and service with evidence, hypotheses, materiality score, reason codes, freshness, and lifecycle (`new`/`viewed`/`acted`/`dismissed`/`expired`/`resolved`).
- [~] 32. Implement evidence drawer UI with confidence language, alternative hypotheses, and missing/stale data warnings.
- [x] 33. Implement insight feedback controls: `POST /v2/intelligence/insights/{id}/dismiss` and `.../snooze` with reason capture.
- [~] 34. Implement insight deduplication so related signals collapse into one business story.

## Phase 3 — Next Best Action & goals (Weeks 21–30)

- [x] 35. Implement `Recommendation` model with subject, objective, reason codes, impact range, confidence, effort, urgency, risk tier, and eligibility.
- [ ] 36. Implement recommendation ranking engine: `expected_business_impact × confidence × urgency × strategic_alignment × actionability ÷ (effort × customer_risk × execution_cost)`.
- [~] 37. Display reason codes instead of unexplained precision scores.
- [x] 38. Implement `ActionPlan` model and service (executable steps, target objects, drafts, approvals, stop conditions, cost/volume estimate, measurement plan).
- [x] 39. Implement `Decision` model and lifecycle (`approved`/`edited`/`assigned`/`snoozed`/`rejected`/`expired`) with reasons.
- [~] 40. Implement `POST /v2/intelligence/recommendations/{id}/decisions` and `.../action-plans`.
- [ ] 41. Implement `POST /v2/intelligence/action-plans/{id}/validate` (simulation, sample contacts, edge cases).
- [x] 42. Implement `POST /v2/intelligence/action-plans/{id}/execute` with idempotency, audit, and policy checks.
- [x] 43. Implement `DecisionPolicyService` evaluating permissions, consent, channel rules, risk tier, audience size, financial exposure, frequency/fatigue, workspace policy, data confidence, and approval requirements.
- [x] 44. Implement `Goal` model and `GET /v2/goals/{id}/pacing` with on-track/at-risk/recommended correction.
- [~] 45. Implement goal-based automation wizard UI (`/automations/new?goal=...`) with outcome-first flow.
- [x] 46. Implement `Outcome` model and outcome linkage (`GET /v2/intelligence/action-plans/{id}/outcome`).

## Phase 4 — Predictions & learning (Weeks 31–42)

- [x] 47. Implement `Prediction` model with outcome, horizon, estimate/probability band, interval, model version, features, calibration, expiration.
- [~] 48. Implement revenue forecast service with range, period, drivers, data cutoff, historical error, and scenario-range fallback.
- [~] 49. Implement product stock-out risk prediction (probability band + estimated days of cover).
- [~] 50. Implement customer purchase propensity scoring (low/medium/high + influential recent signals).
- [~] 51. Implement customer inactivity/churn risk prediction (risk band, relationship value, drivers, intervention eligibility).
- [~] 52. Implement campaign goal-attainment forecast (projected range + underperforming funnel stage).
- [x] 53. Implement `BusinessLearning` model and learning UI (pattern statement, segments, evidence window, sample size, effect range, confidence, confounders, expiration, source experiments).
- [ ] 54. Implement experiment templates and holdout support (hypothesis, primary/guardrail metrics, eligibility, allocation, duration, stopping rule, result).
- [~] 55. Implement recommendation feedback loop: shown → accepted/edited/dismissed → executed → outcome window → incremental result → learning updated → ranking adjusted.
- [~] 56. Implement prediction display contract (outcome, horizon, probability band, data cutoff, top signals, missing factors, calibration, recommended intervention, “Why am I seeing this?”).

## Phase 5 — Scale & optimization (Ongoing)

- [~] 57. Expand intelligence stories to Brand Deals, Affiliates, Media Kit, and Competitor Intelligence modules.
- [~] 58. Improve recommendation ranking with user feedback and measured outcomes.
- [x] 59. Build agency portfolio intelligence view.
- [~] 60. Optimize cost, latency, and retrieval (cached facts, model routing, async narratives, budgets).
- [ ] 61. Localize narratives and policies.
- [ ] 62. Build privacy-preserving benchmarks where justified by terms.

## Core UIL services (build across phases)

- [x] 63. `SignalIngestionService` (§3.2.1).
- [x] 64. `EntityResolutionService` (§3.2.2).
- [~] 65. Business knowledge graph queries (§3.2.3).
- [x] 66. `MetricService` / semantic metric service (§3.2.4).
- [ ] 67. `FeatureService` for customer, product, content, campaign, and business features (§3.2.5).
- [x] 68. `DetectionService` for anomalies, thresholds, trends, sequences, opportunities, risks, goal pacing, data-quality problems (§3.2.6).
- [x] 69. `DiagnosisService` for evidence-backed candidate explanations (observed fact / likely contributor / hypothesis / unknown) (§3.2.7).
- [x] 70. `PredictionService` with abstention conditions and calibrated estimates (§3.2.8).
- [x] 71. `RecommendationService` for candidate actions, eligibility, impact estimation, ranking, and execution plans (§3.2.9).
- [x] 72. `DecisionPolicyService` for suggested/drafted/scheduled/approved/auto-executed transitions (§3.2.10).
- [x] 73. `OutcomeLearningService` for action-outcome linkage and learning updates (§3.2.11).

## Data model & canonical signals

- [x] 74. Add Prisma migrations for all UIL entities: `Signal`, `EntityLink`, `BusinessInsight`, `Hypothesis`, `Prediction`, `Recommendation`, `ActionPlan`, `Decision`, `Outcome`, `BusinessLearning`, `Goal`, `DataQualityIssue`, `MetricDefinition`, `MetricSnapshot`.
- [~] 75. Implement canonical signal taxonomy coverage: Customer, Conversation, Commerce, Content, Campaign, Partnership, Market, Operation signals.
- [~] 76. Implement canonical event envelope (`event_id`, `event_type`, `schema_version`, `workspace_id`, `occurred_at`, `ingested_at`, `source`, `subject`, `related_entities`, `data`, `lineage`, `trace_id`).
- [ ] 77. Implement at-least-once delivery, idempotent consumers, immutable canonical facts, correction-as-new-event, dead-letter queue, replay tooling, partitioned ordering, lag monitoring, and PII minimization.

## Product experience / Next Best Action per module

- [x] 78. **Orders:** resolve stock/fulfillment exceptions first; contact high-value at-risk customers; recommend complementary items post-delivery, suppress during unresolved support.
- [x] 79. **Inbox:** prioritize high-intent or high-value conversations; suggest evidence-based reply + relevant product; escalate risk/uncertainty; suppress sales during sensitive support.
- [x] 80. **CRM:** retain at-risk valuable customers; invite advocates; use early access/education/service over unnecessary discounting.
- [x] 81. **Content:** repeat/test successful formats; fill identified content gaps; connect idea to goal/audience; recommend timing from workspace history.
- [x] 82. **Campaigns:** correct audience/offer/channel/timing/budget; pause underperforming step with guardrails; duplicate success as controlled experiment.
- [x] 83. **Brand Deals:** follow up based on engagement/deadline; improve proposal packaging; surface performance evidence; flag deliverable/payment risk.
- [x] 84. **Competitor Intelligence:** convert patterns into controlled content experiments; avoid copying assets/unsupported claims; explain whether trend is broad or limited.

## Cross-module integration contracts

- [x] 85. Inbox ↔ CRM: resolve participant to contact, write intents/product mentions/assignments/resolution to timeline, read lifecycle/orders/consent/issues, hide internal notes from replies.
- [x] 86. Inbox ↔ Orders/Products: detect product/order references, show order state in conversation, attribute assisted conversion, suppress automation on refund/fraud/support exceptions.
- [~] 87. Content ↔ Campaigns ↔ Analytics: link content variants to objective/audience/offer/campaign, preserve publication metrics and downstream clicks/conversations/orders, compare variants, convert outcomes to learnings.
- [~] 88. CRM ↔ Campaigns ↔ Automation: use governed segments, re-evaluate consent/suppression before each send, write exposure/response to timeline, prevent overlapping journeys.
- [~] 89. Products ↔ Competitor Intelligence ↔ Content: combine internal demand and market signals, recommend content experiment, include stock/margin guardrails.
- [~] 90. Brand Deals ↔ Media Kit ↔ Content: record media-kit views/inquiries, link proposal claims to metrics, convert deliverables into content objects/approvals, feed results into deal reporting/pricing.
- [x] 91. Analytics ↔ Every module: shared metric IDs/filters/attribution/timezone/currency, deep links, annotations for operational actions, consistent freshness/quality warnings.
- [x] 92. Automation ↔ Every module: execute through domain APIs, respect module validation/audit/idempotency, subscribe to canonical events, return status/outcome refs to learning service.

## Goal-based automation & guardrails

- [x] 93. Implement outcome-first automation templates: increase repeat purchases, recover abandoned carts/conversations, improve response time, re-engage inactive customers, product launch, collect reviews, grow affiliates, improve brand-deal follow-up.
- [x] 94. Implement goal-plan generation flow: goal selection, data readiness, eligible audience, channels, consent, constraints, AI strategy, rationale, drafts, delays, stop conditions, reach/risk, approval, test run, launch, control/holdout, measurement.
- [x] 95. Implement automation guardrails: audience preview/count, consent/suppression validation, frequency/fatigue, conflict detection, max spend/discount exposure, stop conditions, test contacts, approval by risk tier, versioning/rollback, live run history, global kill switch, per-workflow pause.
- [x] 96. Implement AI-generated workflow acceptance criteria: every node maps to supported action, clear goal/success event, explicit entry/exit, no duplicate enrollment, suppression at send time, estimated audience/volume, highlighted assumptions, editable workflow.

## AI behavior, governance & trust

- [x] 97. Implement AI response contract: direct conclusion, evidence/period, likely drivers, confidence/uncertainty, missing/stale data, recommended action, expected result range, preview/execute link.
- [x] 98. Implement allowlisted tool use through the decision policy engine with schema validation, idempotency keys, and audit events.
- [x] 99. Implement risk tier enforcement (Tier 0–4) across UI and API.
- [x] 100. Implement grounding/prompt-injection resistance: retrieved data cannot override policies, tool permissions independent of model text, server-generated evidence refs, PII redaction in logs.
- [x] 101. Enforce trust language: “likely contributed,” “associated with,” or “consistent with” for observational; “caused” only with causal/experimental backing; estimated impact as a range with assumptions.

## P0–P3 backlog alignment

- [~] 102. Complete all P0 items: canonical event envelope, auth enforcement, customer identity graph, unified timeline, metric dictionary/semantic service, freshness/quality status, insight/recommendation/action/decision/outcome objects, evidence drawer, audit/trace correlation.
- [~] 103. Complete all P1 items: Today feed, revenue/funnel diagnosis, high-intent conversation prioritization, customer next-best action, product availability/demand mismatch, campaign pacing risk, recommendation preview/edit/assign/dismiss, proactive notification policy.
- [~] 104. Complete all P2 items: goal creation/pacing, goal-based automation templates, action-plan validation/simulation, experiment/holdout, outcome linkage, workspace learning memory.
- [~] 105. Complete all P3 items: revenue forecast, purchase/inactivity risk, stock-out prediction, deal close probability, content outcome range, agency portfolio intelligence.
- [~] 106. Honor explicit deprioritization: no new top-level modules, no generic AI chat, no complex models before reliable identity/metrics, no fully autonomous outbound actions, no broad competitor recommendations without compliance.

## KPIs, monitoring & operating rhythm

- [x] 107. Implement North-star metric **IAVA** (Intelligence-Assisted Value Actions) tracking.
- [x] 108. Implement supporting KPIs: active-workspace insight coverage, open/evidence rates, time to insight, recommendation acceptance/edit/completion, dismissal reasons, attributed revenue, prevented loss, forecast calibration, unsupported-claim rate, permission failures, alert mute rate, signal freshness, identity confidence, entity-link coverage, insight latency, action success, outcome-linkage coverage.
- [~] 109. Implement operating-rhythm dashboards/views: intelligence quality, outcome, data quality, safety, product, and monthly model/rule reviews.

## Testing, rollout & risk mitigations

- [x] 110. **Data tests:** schema compatibility, event uniqueness/idempotency, entity resolution accuracy, metric reconciliation, freshness/completeness, late/correction behavior.
- [x] 111. **Intelligence tests:** known scenario detection, abstention when data insufficient, driver decomposition correctness, evidence reference resolution, ranking stability/expiry, deduplication.
- [x] 112. **AI tests:** groundedness, uncertainty language, missing-data behavior, prompt-injection resistance, permission boundary, brand voice, tool validity, refusal of prohibited side effects.
- [x] 113. **Action tests:** approval rules, consent/suppression, idempotent retry, partial failure recovery, undo/compensating action, audit completeness, outcome linkage.
- [x] 114. **UAT scenarios:** sales decline, high-value customer, campaign risk, data failure as integration tests.
- [x] 115. **Rollout:** shadow mode, internal mode, design-partner pilot, controlled beta, GA gates, rollback controls (disable generator, revert rules/model, deterministic baseline, disable outbound execution, pause provider/workflow).
- [x] 116. **Risk mitigations:** incorrect explanations, alert fatigue, identity errors, bad data, automation harm, prediction overconfidence, optimization conflict, cold start, cost/latency, cross-module ownership conflict.

## Operating model, 30-day plan & success criteria

- [x] 117. Establish UIL program governance: appoint executive sponsor, product architect, and cross-functional squads (Intelligence Platform, Decision Experience, Workflow & Execution, Domain, Trust & Quality).
- [x] 118. Select and sign off the first three intelligence stories (revenue decline, high-intent conversation → purchase, repeat-purchase re-engagement) and lock the 90-day delivery plan.
- [x] 119. Map required entities, events, metrics, and actions for each selected story.
- [x] 120. Inventory current source freshness, identity quality, and data gaps across all connected integrations.
- [x] 121. Build offline evaluation cases from real, permissioned workspace scenarios for the first stories.
- [x] 122. Define and approve the action risk and approval matrix (Tier 0–4) before any outbound automation.
- [x] 123. Demonstrate the end-to-end Week 4 thin slice: order/inventory signals → revenue anomaly → stock-related driver → eligible customer demand from Inbox → alternative-product campaign recommendation → preview and approval → outcome tracking.
- [x] 124. Review the thin slice for accuracy, usefulness, safety, latency, and architectural reuse.
- [x] 125. Define and track first-year success criteria (weekly qualified insights, traceable evidence, initial story precision/action completion, consistent identity/metrics, measurable recommendations, healthy opt-out/dismissal rates, zero critical permission failures, forecast baselines, reusable story infrastructure).

## Validation-driven additions (from first completeness pass)

- [~] 126. Resolve the five fragmentation forms (data, context, decision, learning, experience) by unifying identity, metrics, timeline, recommendations, and shared UI patterns.
- [x] 127. Implement Customer 360 header (relationship summary, lifecycle/value band, current intent, risks/opportunities, consent, preferred channel, best next action) on `/customers/[customerId]`.
- [x] 128. Implement proactive intelligence interruption policy: delivery tiers (critical interrupt, action required, Today feed, digest, on-demand), interruption score, cooldown windows, user tuning (topics, channels, quiet hours, thresholds), and deduplication.
- [ ] 129. Implement the knowledge graph query set: content→conversation→product influence, Instagram exchange→purchase, campaign/coupon→order attribution, content patterns→brand outreach, segment response to early access vs discounts.
- [ ] 130. Implement feature and profile outputs per §3.2.5: customer RFM/affinity/channel preference/response-time/lifecycle/discount sensitivity/propensity/churn risk; product velocity/margin proxy/stock-cover/return/mentions/demand/cross-sell; content format/topic/hook/CTA/timing/response/attributed revenue; campaign audience/offer/sequence/channel/cost/conversion/fatigue; business seasonality/forecast/anomalies/goal pacing/constraints.
- [ ] 131. Implement the full goal-plan generation flow: user edits/approves, system creates a versioned workflow in the existing automation engine, test run, launch with control/holdout, and post-launch recommendation to continue/adjust/pause/conclude.
- [ ] 132. Implement learning evidence hierarchy: workspace-specific, segment-specific, anonymized benchmark, and general product guidance with confidence labels.
- [ ] 133. Implement model operations: version datasets/features/models/thresholds/policies, temporal-split validation, baseline comparison, calibration/drift/segment/latency/cost monitoring, abstention, feature flags, shadow mode, rollback.
- [ ] 134. Implement prediction prioritization criteria (predicted event matters, intervention possible, result measurable, data sufficient, error costs manageable) and abstention when not met.
- [ ] 135. Implement the "I understand why" user rating, verified hours saved, and false positive/negative rate tracking in intelligence KPI dashboards.
- [ ] 136. Implement Today feed interaction requirements: every sentence expands into evidence, "Why?", "Compared with what?", "What changed?" drill-downs, and dismissal reason improving future ranking.
- [x] 137. Implement brand-deal follow-up next-best action and CRM advocate/early-access/suppression recommendations.
- [ ] 138. Implement narrative analytics chart acceptance rule: promote a chart to default dashboard only if it supports a stated decision; otherwise keep in exploration/custom reports.
- [ ] 139. Implement the data-quality gate check before high-priority insight generation: required sources connected, freshness within threshold, identity confidence sufficient, metric definition valid, minimum history/sample available, no unresolved reconciliation issue.

---

Last updated: 2026-07-25 after TASK-368.
