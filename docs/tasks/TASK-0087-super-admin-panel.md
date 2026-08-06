# TASK-0087: Super Admin Panel

- **Status:** In Progress
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0087-super-admin-panel.md`
- **Tracker:** `docs/trackers/TRACKER-0087-super-admin-panel.md`
- **Module(s):** admin, billing
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Super admin: users, plans, payments, system health.
- **Last updated:** 2026-08-05

## 1. Summary

Build super admin panel: user management, plan CRUD, payment management via Stripe, system coupons, system health dashboard, adapter library.

## 2. References

- Requirement: `docs/requirements/REQ-0087-super-admin-panel.md`
- Related files:
  - `src/app/admin/` (existing, extend)

## 3. Implementation Plan

### Step 1 — User Management
List all users with search/filter/pagination. View user details (workspaces, projects, usage). Impersonation with audit log. Suspend/ban.

### Step 2 — Plan Management
CRUD subscription plans: name, feature limits, model restrictions, pricing.

### Step 3 — Payment Management
Stripe dashboard integration. View/change user plans, apply discounts, issue refunds.

### Step 4 — System Coupons
Create promotional coupons for OmniConnect subscriptions. Track usage.

### Step 5 — System Health
API usage rates, error rates, queue status, AI token consumption, OpenRouter spend.

### Step 6 — Adapter Library
List all generated adapters. Validation status. Approve/flag for review.

## 4. Subtasks

- [~] T-063: User management (list, view, search/filter/pagination, suspend/ban). Impersonation pending.
- [ ] T-064: Plan management (CRUD)
- [ ] T-065: Payment management (Stripe)
- [ ] T-066: System coupons
- [x] T-067: System health dashboard

## 5. Acceptance Criteria

- [ ] Matches REQ-0087 acceptance criteria.
- [x] Lint + typecheck + tests pass.
- [x] `CHANGELOG.md` updated.

## 6. Notes / Blockers

- Phase 4 — depends on RBAC (T-013) and billing (T-068).
