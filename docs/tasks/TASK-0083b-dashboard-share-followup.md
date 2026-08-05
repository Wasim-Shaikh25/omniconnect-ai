# TASK-0083b: Dashboard Share Follow-up Fixes

- **Status:** Done
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0083-business-intelligence.md`
- **Tracker:** `docs/trackers/TRACKER-0083b-dashboard-share-followup.md`
- **Module(s):** ai, analytics, auth
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Fix Devin Review findings on PR #151.
- **Last updated:** 2026-08-05

## 1. Summary

Fix the remaining Devin Review findings on PR #151: the cross-tenant action census must still cover `presentation/actions.ts` files, and the `DashboardSchema` Zod validator should match the domain type without a forced cast.

## 2. References

- Requirement: `docs/requirements/REQ-0083-business-intelligence.md`
- Related files:
  - `src/modules/ai/application/generate-dashboard.ts`
  - `src/modules/ai/index.ts`
  - `src/modules/analytics/presentation/dashboard-share.actions.ts`
  - `src/test/security/cross-tenant-action-census.test.ts`

## 3. Implementation Plan

### Step 1 — Census filter
Fix `actionFiles()` in `cross-tenant-action-census.test.ts` so it matches both `actions.ts`/`actions.tsx` and `*.actions.ts`/`*.actions.tsx` files under `presentation/`.

### Step 2 — Domain-accurate Zod schema
Move the `DashboardSchema` Zod validator into `src/modules/ai/application/generate-dashboard.ts`, model `KPI`/`chart`/`table` data as a discriminated union by `type`, and re-export it from the `ai` public barrel. Use it in `createDashboardShareAction` without `as` casts.

## 4. Subtasks

- [x] T-001: Fix census filter to cover all presentation action files.
- [x] T-002: Add `dashboardSchema` to `ai` module and export it.
- [x] T-003: Replace the loose `DashboardSchema` validator in `dashboard-share.actions.ts` with the domain-accurate schema.

## 5. Acceptance Criteria

- [x] Cross-tenant action census covers every action file under `presentation/`.
- [x] `createDashboardShareAction` validates widget data by type without forced casts.
- [x] Lint + typecheck + tests + build pass.
- [x] `CHANGELOG.md` updated.
