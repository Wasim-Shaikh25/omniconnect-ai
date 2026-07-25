# Task 354: Phase 4 — Predictions & Learning

- **Status:** Done
- **Spec:** `docs/specs/0033-unified-intelligence-layer.md`
- **Module(s):** `intelligence`
- **Owner:** wasim
- **Changelog entry:** Implements Phase 4 of the Unified Intelligence Layer: predictions with probability bands, hypothesis management, and a closed learning loop via `BusinessLearning`.

## Description

Build on Phase 3 outcomes to add forecasting, risk prediction, and learning. Phase 4 introduces `Prediction`, `Hypothesis`, and `BusinessLearning` as first-class aggregates. The system should generate rule-based forecasts and risk scores (churn, stock-out, purchase propensity) with probability bands, test hypotheses linked to insights, and close the learning loop so successful action patterns improve future recommendation ranking.

## Subtasks

- [x] Add Prisma models + migration: `Prediction`, `Hypothesis`, `BusinessLearning`.
- [x] Add domain types/events for `PredictionRecord`, `HypothesisRecord`, `BusinessLearningRecord` and lifecycle events.
- [x] Extend `intelligence/application/ports.ts` with repositories for the new aggregates.
- [x] Implement Prisma repositories.
- [x] Implement `PredictionService` for churn, stock-out, and purchase-propensity forecasts with confidence intervals and abstention when history is insufficient.
- [x] Implement `HypothesisService` to generate/test hypotheses from `BusinessInsight` evidence.
- [x] Implement `BusinessLearningService` to update learned weights from `Outcome` records.
- [x] Wire learning into `ActionPlanService` so every executed plan feeds back into `BusinessLearning`.
- [x] Add server actions: `getPredictionsAction`, `getHypothesesAction`, `getBusinessLearningAction`.
- [x] Add UI components: `PredictionsPanel` and `LearningPanel` on `/dashboard` and `/stores/[storeId]`.
- [x] Run lint, typecheck, build; validate end-to-end (insight → prediction → action → outcome → learning update).

## Acceptance Criteria

- [x] `Prediction`, `Hypothesis`, and `BusinessLearning` tables exist and are populated by services.
- [x] Predictions display estimate, probability band, horizon, features, and calibration/expiration metadata.
- [x] The system abstains from predictions when data is insufficient and falls back to scenario ranges.
- [x] Hypotheses can be created from insights.
- [x] Outcomes feed back into `BusinessLearning` weights.
- [x] Dashboard and store pages show predictions and learning insights.
- [x] Lint + typecheck + build pass; no `any`/deep cross-module imports.
- [x] `CHANGELOG.md` and `docs/tasks/backlog.md` updated.
