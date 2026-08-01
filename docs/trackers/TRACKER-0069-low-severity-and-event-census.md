# TRACKER-0069: Low-Severity Findings and Domain-Event Census

- **Status:** Todo
- **Owner:** Backend / Frontend
- **Requirement:** `docs/requirements/REQ-0069-low-severity-and-event-census.md`
- **Task:** `docs/tasks/TASK-0069-low-severity-and-event-census.md`
- **Last updated:** 2026-07-31

## 1. Summary

Six low-severity findings (L1–L5, L7) from `PRODUCTION_READINESS_AUDIT.md` §4, all re-verified as
open at `33e2e0b`. L6 (registration bot protection) is tracked in `REQ-0070`.

## 2. Subtasks

### Planning
- [ ] Requirement reviewed and approved.
- [ ] Per-event keep/delete policy agreed (default: keep if a REQ exists, else delete).
- [ ] Branch created from `main`.

### L1 — Event census
- [x] Declared/subscribed/unsubscribed lists generated (89 / 24 / 65 at 2026-08-01).
- [x] `docs/specs/event-registry.md` created with every event classified.
- [x] No events classified **Removed** in this pass.
- [x] Every **Planned** event carries a REQ id.
- [x] Registry-completeness test added (`src/test/event-registry.test.ts`).
- [x] "Planned requires a REQ id" test added.

### L2 — Navigation reachability
- [x] `/support` added to the authenticated sidebar.
- [x] `/analytics/journeys` reachable from the analytics nav.
- [x] Duplicate `/stores` destination fixed ("Campaigns" entry removed).
- [x] Active-state matching is exact; single-active test added (`src/components/app-shell.nav.test.ts`).
- [x] Route-coverage test with allow-list added (`src/components/app-shell.nav.test.ts`).

### L3 — Admin nav injection
- [x] `sections[5]!` replaced with a label lookup (`find` by `"Account"`).
- [x] Non-null assertion removed (`if (accountSection)`).
- [x] Reorder-safety covered by label lookup (no index dependency).

### L4 — Debug logging
- [x] `LOG_LEVEL` added to `src/shared/config/env.ts`.
- [x] All log levels gated behind the threshold in `src/shared/observability/logger.ts`.
- [x] Startup warning when debug logging is enabled in production (`src/instrumentation.ts`).
- [x] Documented in `.env.example` and `docs/deployment.md`.
- [x] Test: `logger.debug` silent at the default level (`src/shared/observability/logger.test.ts`).

### L5 — Fly.io machine policy
- [x] `min_machines_running = 1` set.
- [x] `auto_stop_machines` set to `"off"` for the app process.
- [x] Scale-to-zero decision recorded in `docs/decisions/0008-fly-machine-auto-stop.md`.
- [x] `docs/deployment.md` references the ADR and explains why scale-to-zero is unsafe for webhooks.
- [ ] Memory measured under SSR + AI generation load (requires production-like traffic).
- [x] Scale-to-zero constraint documented in `docs/deployment.md` (references ADR 0008).

### L7 — Escalation marker
- [x] Case-insensitive detection implemented in `src/modules/ai/application/generate-reply.ts`.
- [x] Three-case unit test added and observed failing before the fix (`src/modules/ai/application/generate-reply.test.ts`).
- [x] Other AI output markers inventoried: only `[ESCALATE]` is parsed from model output; prompt delimiters (`<<<USER_MESSAGE>>>`, `<<<DATA>>>`) are used for input hardening, not post-generation parsing.

### Verification
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run test` passes.
- [ ] `npm audit` reports 0 vulnerabilities.
- [ ] `npm run build` passes.
- [ ] `npm run build:worker` passes.
- [ ] `CHANGELOG.md` updated.
- [ ] `docs/specs/current-state.md` links the event registry.

## 3. Acceptance Criteria

- [ ] All `REQ-0069` acceptance criteria are met.
- [ ] All verification steps above pass.

## 4. Notes / Blockers

- The `AbandonedCartDetected` classification depends on the `REQ-0067` H7 subscriber decision.
- L5's `min_machines_running = 1` overlaps with `REQ-0067` H6; whoever lands first owns the edit.
- L2's `/support` sidebar entry must land with `REQ-0068` M14 (which removes `/support` from
  `publicPaths`) and `REQ-0072` (support discoverability).
