---
description: 0043 — Testing, Rollout, and Risk Mitigations
---

# REQ-0043: 0043 — Testing, Rollout, and Risk Mitigations

- **Status:** Implemented
- **Owner:** wasim
- **Module(s):** `intelligence`, cross-module
- **Original spec path:** `docs/specs/0043-testing-rollout-risk.md` (restructured)
- **Task:** `docs/tasks/TASK-0043-testing-rollout-risk.md`
- **Tracker:** `docs/trackers/TRACKER-0043-testing-rollout-risk.md`
- **Last updated:** 2026-07-29

> This file was migrated from `docs/specs/0043-testing-rollout-risk.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


- **Module(s):** `intelligence`, cross-module
- **Status:** Implemented
- **Owner:** wasim
- **Related task(s):** `docs/tasks/TASK-367-testing-rollout-risk.md`
- **Last updated:** 2026-07-25

## 1. Summary

Add a quality-assurance and safe-rollout layer for the Unified Intelligence Layer so every release can be validated against known data, intelligence, AI, and action scenarios before it reaches users.

## 2. Goals

- Automated data tests: schema compatibility, event idempotency, entity resolution accuracy, metric reconciliation, freshness/completeness, late/correction behavior.
- Automated intelligence tests: known-scenario detection, abstention when data insufficient, driver decomposition correctness, evidence reference resolution, ranking stability/expiry, deduplication.
- Automated AI tests: groundedness, uncertainty language, missing-data behavior, prompt-injection resistance, permission boundary, brand voice, tool validity, refusal of prohibited side effects.
- Automated action tests: approval rules, consent/suppression, idempotent retry, partial-failure recovery, undo/compensating action, audit completeness, outcome linkage.
- UAT scenarios as executable scripts: sales decline, high-value customer, campaign risk, data failure.
- Rollout controls: shadow/internal/design-partner/beta/GA gates with kill switches and rollback levers.
- Risk mitigation registry covering the main UIL failure modes.

## 3. Non-Goals

- Full CI/CD pipeline implementation.
- Load/chaos testing infrastructure.

## 4. User Stories

- As an engineer, I want a single command to run all UIL quality checks.
- As a product manager, I want rollout gates and rollback levers documented and wired to feature flags.
- As a developer, I want known failure modes captured in a registry so fixes have clear acceptance criteria.

## 5. Domain Model

```ts
export interface QualityCheck {
  name: string;
  category: "data" | "intelligence" | "ai" | "action" | "uat";
  passed: boolean;
  reason: string;
  durationMs: number;
}

export interface QualityReport {
  runAt: Date;
  overall: "PASS" | "FAIL";
  checks: QualityCheck[];
}

export interface RolloutGate {
  name: string;
  enabled: boolean;
  canExecuteOutboundActions: boolean;
  allowedEnvironments: string[];
}

export interface RiskMitigation {
  risk: string;
  mitigation: string;
  owner: string;
  status: "implemented" | "planned" | "monitoring";
}
```

## 6. Public Contract

- `QualityAssuranceService.runAll(input)`
- `QualityAssuranceService.runCategory(category, input)`
- `RolloutService.canExecute(gateName, environment)`
- `RolloutService.getGates()`
- `RiskMitigationRegistry.list()`
- `RiskMitigationRegistry.get(risk)`
- Server actions: `runQualityChecksAction`, `getRolloutGatesAction`, `getRiskMitigationsAction`
- UI: `/settings/quality` and `/settings/rollout` panels

## 7. Data / Persistence

- No new Prisma models. Rollout gates and risk mitigations are stored in code as config for now; future work may persist them.

## 8. API / UI Surface

- Settings → Quality: run checks and view results.
- Settings → Rollout: toggle gates (in-memory only).
- Risk mitigations listed in a read-only table.

## 9. External Integrations

- None.

## 10. Edge Cases & Failure Modes

- Missing data should fail the test with a clear message, not crash.
- Action execution in `shadow` mode records the result but does not actually call external APIs.
- Rollout gate `disabled` should block outbound actions regardless of environment.

## 11. Security & Privacy

- Quality checks use synthetic or seeded data only; no customer PII.
- Rollout gates can disable outbound execution globally.

## 12. Testing Strategy

- `scripts/verify-task367.ts` runs `QualityAssuranceService` and asserts `overall === PASS`.

## 13. Acceptance Criteria

- [x] Data tests implemented and passing.
- [x] Intelligence tests implemented and passing.
- [x] AI tests implemented and passing.
- [x] Action tests implemented and passing.
- [x] UAT scenarios as executable scripts.
- [x] Rollout gates and rollback controls defined.
- [x] Risk mitigation registry created.
- [x] UI added for quality and rollout controls.
- [x] End-to-end script passes.
- [x] Lint + typecheck + build pass.
