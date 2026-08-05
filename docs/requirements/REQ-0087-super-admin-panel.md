---
description: Super Admin Panel
---

# REQ-0087: Super Admin Panel

- **Status:** Draft
- **Owner:** wasim
- **Product Charter:** `docs/specs/current-state.md`
- **Related Task:** `docs/tasks/TASK-0087-super-admin-panel.md`
- **Related Tracker:** `docs/trackers/TRACKER-0087-super-admin-panel.md`
- **Supersedes:** Portions of `REQ-0052-super-admin-workspace-project-auth-improvements.md`
- **Last updated:** 2026-08-05

## 1. Summary

Platform-level admin panel for SUPER_ADMIN role. Sections: Users (view, impersonate, suspend), Plans & Billing (create/edit plans, feature limits, model restrictions), Payment Management (Stripe refunds, plan changes), System Coupons (subscription promotions), Offers (trials, upgrade promotions), AI Assistant (admin AI with platform-wide data), System Health (API usage, queues, errors, AI spend), Adapter Library (view/approve generated adapters).

## 2. Goals

- User management: list, view details, impersonate, suspend/ban.
- Plan management: CRUD subscription plans with feature limits and model restrictions.
- Payment management: Stripe dashboard, refunds, discounts, plan changes.
- System coupons: promotional coupons for OmniConnect subscriptions.
- System health: API usage rates, error rates, queue status, AI token consumption, OpenRouter spend.
- Adapter library: view all generated adapters, validate, approve, flag.

## 3. Non-Goals

- Customer-facing admin tools.
- Direct database access.
- Billing system implementation (see REQ-0088).

## 4. User Stories

- As a super admin, I want to view all users, their workspaces, projects, and usage.
- As a super admin, I want to impersonate a user for debugging support issues.
- As a super admin, I want to create and modify subscription plans.
- As a super admin, I want to monitor system health and AI spending.

## 5. Acceptance Criteria

- [ ] Super admin routes protected by SUPER_ADMIN role check.
- [ ] User list with search, filter, and pagination.
- [ ] Impersonation: temporary session as another user with audit log.
- [ ] Plan CRUD with feature limit matrix.
- [ ] System health dashboard: API calls, queue depth, error rate, AI token usage.
- [ ] Adapter library: list generated adapters with validation status.

## 6. Scope & Dependencies

- Modules: `admin` (extended), `billing`
- Depends on: REQ-0076 (SUPER_ADMIN role), REQ-0088 (billing/plans)

## 7. Open Questions

None.
