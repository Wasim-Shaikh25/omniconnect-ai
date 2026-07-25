# Task 353: Phase 3 — Next Best Action & Goals

- **Status:** Done
- **Spec:** `docs/specs/0033-unified-intelligence-layer.md`
- **Module(s):** `intelligence`, `dashboard`, `coupons`, `ecommerce`, `conversations`, `growth`
- **Owner:** wasim
- **Changelog entry:** Implements Phase 3 of the Unified Intelligence Layer: recommendations, action plans, decision policy, goal pacing, automation wizard wiring, and outcome tracking built on Phase 1 signals and Phase 2 insights.

## Description

Build on Phase 1 signals/metrics and Phase 2 insights to turn observations into executable next-best-actions and measurable goals. Phase 3 introduces `Recommendation`, `ActionPlan`, `Decision`, `Outcome`, and `Goal` as first-class aggregates, a risk-tiered `DecisionPolicyService`, an `OutcomeService`, and a `GoalService` for pacing. Recommendations are generated from open `BusinessInsight` records, ranked by impact/effort/risk, and surfaced in the dashboard/store UI for approve/dismiss/execute.

## Subtasks

- [x] Add Prisma models + migration: `Recommendation`, `ActionPlan`, `Decision`, `Outcome`, `Goal`.
- [x] Add domain types/events for `RecommendationRecord`, `ActionPlanRecord`, `DecisionRecord`, `OutcomeRecord`, `GoalRecord` and lifecycle events.
- [x] Extend `intelligence/application/ports.ts` with repositories for the new aggregates.
- [x] Implement Prisma repositories.
- [x] Implement `RecommendationService` that maps open insights to ranked recommendations with risk tiers and action parameters.
- [x] Implement `DecisionPolicyService` to decide whether a recommendation can be auto-executed or requires approval (based on risk tier + user role).
- [x] Implement `ActionPlanService` to convert accepted recommendations into executable plans and invoke the `ActionExecutor` port.
- [x] Implement `OutcomeService` to record pre/post metric snapshots and status.
- [x] Implement `GoalService` with pacing updates against metric snapshots.
- [x] Add server actions: `getRecommendationsAction`, `approveRecommendationAction`, `dismissRecommendationAction`, `executeActionPlanAction`, `getGoalsAction`, `createGoalAction`.
- [x] Add UI components: `RecommendationsPanel`, `GoalsPanel`.
- [x] Wire recommendations/goals into `/dashboard` and `/stores/[storeId]` pages.
- [x] Run lint, typecheck, build; validate end-to-end (insight → recommendation → approved plan → executed action → outcome).

## Acceptance Criteria

- [x] `Recommendation`, `ActionPlan`, `Decision`, `Outcome`, and `Goal` tables exist and are populated by services.
- [x] Open insights produce at least one prioritized recommendation per major insight type.
- [x] Decision policy respects risk tiers: tier 3/4 require explicit approval; tier 4 never auto-executes.
- [x] Approved action plans can be executed through an `ActionExecutor` port using existing module services (no cross-module internal imports).
- [x] Outcomes record before/after metric snapshots and status.
- [x] Goals track target metric, baseline, pacing, and status.
- [x] Dashboard and store pages show the Next Best Action panel and goal pacing.
- [x] Lint + typecheck + build pass; no `any`/deep cross-module imports.
- [x] `CHANGELOG.md` and `docs/tasks/backlog.md` updated.
