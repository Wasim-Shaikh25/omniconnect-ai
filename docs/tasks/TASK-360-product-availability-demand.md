# Task 360: Product Availability & Demand Mismatch

- **Status:** Done
- **Spec:** `docs/specs/0036-product-availability-demand.md`
- **Module(s):** `ecommerce`, `intelligence`, `conversations`, `growth`
- **Owner:** wasim
- **Changelog entry:** Adds product availability and demand mismatch detection: out-of-stock/low-stock products that are mentioned in conversations trigger an insight and an alternative-product DM campaign recommendation.

## Description

Implement the first P1 post-UIL task from the strategy doc: detect when customers ask about out-of-stock products and recommend an alternative-product campaign.

## Subtasks

- [x] Extend `ProductsSynced` payload to include product inventory snapshots.
- [x] Update `intelligence` subscriber to ingest per-product inventory signals.
- [x] Add `detectProductAvailabilityAndDemand` to `DetectionService`.
- [x] Update `RecommendationService` to create `CREATE_ALTERNATIVE_PRODUCT_CAMPAIGN` recommendations.
- [x] Update `WorkspaceActionExecutor` and `ActionPlanService` target metric for the new action type.
- [x] Create end-to-end validation script.
- [x] Run lint, typecheck, build.
- [x] Update `CHANGELOG.md` and `docs/tasks/backlog.md`; create PR.

## Acceptance Criteria

- [x] Catalog sync emits per-product inventory signals.
- [x] Out-of-stock or low-stock products with recent message mentions generate a `BusinessInsight`.
- [x] Recommendation maps to an executable alternative-product campaign.
- [x] Execution creates a `DmCampaign` via the public `growth` service.
- [x] Lint + typecheck + build pass; no `any`/cross-module internal imports.
