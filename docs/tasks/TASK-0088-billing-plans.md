# TASK-0088: Billing & Plans

- **Status:** Done
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0088-billing-plans.md`
- **Tracker:** `docs/trackers/TRACKER-0088-billing-plans.md`
- **Module(s):** billing
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Stripe billing: Free/Pro/Business plans with enforcement.
- **Last updated:** 2026-08-05

## 1. Summary

Three-tier Stripe billing: Free, Pro, Business. SubscriptionPlan model with feature limits. Plan enforcement at service layer. Billing settings page.

## 2. References

- Requirement: `docs/requirements/REQ-0088-billing-plans.md`
- Related files:
  - `prisma/schema.prisma` (SubscriptionPlan model)
  - `src/modules/billing/` (existing, extend)

## 3. Implementation Plan

### Step 1 — SubscriptionPlan Model
Define plan with: maxWorkspaces, maxProjects, maxAiCallsPerDay, allowedModels, maxPostsPerMonth, maxInspectionsPerDay, allowedChannels, features.

### Step 2 — Stripe Integration
Checkout sessions, subscription webhooks, plan change handling.

### Step 3 — Usage Metering
Track AI calls/day, posts/month, inspections/day per user. Reset counters appropriately.

### Step 4 — Plan Enforcement
Service-layer checks before every limited action. Clear error messages with upgrade CTA.

### Step 5 — Billing UI
Current plan display, upgrade/downgrade flow, payment method, invoice history.

## 4. Subtasks

- [x] T-006: SubscriptionPlan Prisma model (Plan enum + PLAN_LIMITS matrix already in place).
- [x] T-068: Stripe billing lifecycle
- [x] T-069: Extend PlanLimits for competitors, attribution links, content scheduling.
- [x] T-070: Service-layer plan enforcement for competitor tracking and attribution links.
- [x] T-071: Billing settings page with current plan, usage, and upgrade CTA.

## 5. Acceptance Criteria

- [x] Matches REQ-0088 acceptance criteria.
- [x] Lint + typecheck + tests pass.
- [x] `CHANGELOG.md` updated.

## 6. Notes / Blockers

- Final pricing TBD.
