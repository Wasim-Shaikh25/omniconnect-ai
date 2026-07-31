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
- [ ] Declared/subscribed/unsubscribed lists generated (89 / 23 / ~66 at `33e2e0b`).
- [ ] `docs/specs/event-registry.md` created with every event classified.
- [ ] Events classified **Removed** deleted along with publication sites.
- [ ] Every **Planned** event carries a REQ id.
- [ ] Registry-completeness test added.
- [ ] "Planned requires a REQ id" test added.

### L2 — Navigation reachability
- [ ] `/support` added to the authenticated sidebar.
- [ ] `/analytics/journeys` reachable from the analytics nav.
- [ ] Duplicate `/stores` destination fixed.
- [ ] Active-state matching is exact; single-active test added.
- [ ] Route-coverage test with allow-list added.

### L3 — Admin nav injection
- [ ] Stable `key` added to each nav section.
- [ ] `sections[5]!` replaced with a keyed lookup.
- [ ] Non-null assertion removed.
- [ ] Reorder-safety test added.

### L4 — Debug logging
- [ ] `LOG_LEVEL` added to config.
- [ ] All log levels gated behind the threshold.
- [ ] Startup warning when debug logging is enabled in production.
- [ ] Documented in `.env.example` and `docs/deployment.md`.
- [ ] Test: `logger.debug` silent at the default level.

### L5 — Fly.io machine policy
- [ ] `min_machines_running = 1` set.
- [ ] `auto_stop_machines` disabled for the app process.
- [ ] Memory measured under SSR + AI generation load.
- [ ] VM sizing ADR recorded.
- [ ] Scale-to-zero constraint documented in `docs/deployment.md`.

### L7 — Escalation marker
- [ ] Case-insensitive detection implemented.
- [ ] Three-case unit test added and observed failing before the fix.
- [ ] Other AI output markers inventoried and made consistent.

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
