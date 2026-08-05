# TASK-0083a: Dashboard Export Review Fixes

- **Status:** Done
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0083-business-intelligence.md`
- **Tracker:** `docs/trackers/TRACKER-0083a-dashboard-export-review-fixes.md`
- **Module(s):** auth, analytics, ai
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Fix Devin Review findings on PR #149 dashboard export/share feature.
- **Last updated:** 2026-08-05

## 1. Summary

Address post-merge Devin Review findings from PR #149 so the dashboard export/share feature works correctly and passes automated checks.

## 2. References

- Requirement: `docs/requirements/REQ-0083-business-intelligence.md`
- Related files:
  - `src/modules/auth/infrastructure/public-paths.ts`
  - `src/modules/analytics/application/ports.ts`
  - `src/modules/analytics/presentation/dashboard-share.actions.ts`
  - `src/test/security/cross-tenant-action-census.test.ts`

## 3. Implementation Plan

### Step 1 — Public share route
Add `/share` to `PUBLIC_PATHS` so anonymous users can open `/share/d/[token]` without being redirected to login.

### Step 2 — Import ordering
Move the `DashboardSchema` import in `src/modules/analytics/application/ports.ts` to the top of the file.

### Step 3 — Cross-tenant action census coverage
Broaden `actionFiles()` in `cross-tenant-action-census.test.ts` to also scan `*.actions.ts` files under `presentation/` so `dashboard-share.actions.ts` (and other split action files) are verified.

### Step 4 — Dashboard schema validation
Validate the `DashboardSchema` payload in `createDashboardShareAction` with a Zod schema before persisting it, preventing malformed snapshots from breaking the public share page.

## 4. Subtasks

- [x] T-001: Add `/share` to public paths.
- [x] T-002: Move `DashboardSchema` import to top of `ports.ts`.
- [x] T-003: Broaden cross-tenant action census to `*.actions.ts`.
- [x] T-004: Validate `DashboardSchema` in `createDashboardShareAction`.

## 5. Acceptance Criteria

- [x] Shared dashboard links work for unauthenticated visitors.
- [x] `ports.ts` imports are at the top of the file.
- [x] `dashboard-share.actions.ts` is covered by the cross-tenant guard census.
- [x] Malformed dashboard schemas are rejected before persistence.
- [x] Lint + typecheck + tests + build pass.
- [x] `CHANGELOG.md` updated.
