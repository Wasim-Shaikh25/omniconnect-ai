---
description: Billing & Plans
---

# REQ-0088: Billing & Plans

- **Status:** Draft
- **Owner:** wasim
- **Product Charter:** `docs/specs/current-state.md`
- **Related Task:** `docs/tasks/TASK-0088-billing-plans.md`
- **Related Tracker:** `docs/trackers/TRACKER-0088-billing-plans.md`
- **Supersedes:** `REQ-0071-billing-monetization-completeness.md`
- **Last updated:** 2026-08-05

## 1. Summary

Three-tier billing system via Stripe: Free, Pro, Business. Plan limits enforced across workspaces, projects, AI calls, models, content scheduling, profile inspections, messaging channels, dashboards, competitor tracking, attribution links, and intelligence features.

## 2. Goals

- SubscriptionPlan model with feature limit matrix.
- Stripe subscription lifecycle: create, upgrade, downgrade, cancel.
- Usage metering: AI calls per day, content posts per month, inspections per day.
- Plan enforcement at service layer (not UI-only).

## 3. Non-Goals

- Usage-based billing (fixed tiers only).
- Multiple payment methods per user.
- Invoicing for enterprise.

## 4. User Stories

- As a free user, I want 1 workspace, 1 project, and 20 AI calls per day.
- As a user, I want to upgrade my plan and immediately get increased limits.
- As a user, I want clear messaging when I hit a plan limit.

## 5. Acceptance Criteria

- [ ] Three plans defined: Free, Pro, Business.
- [ ] Plan limits table:

| Feature | Free | Pro | Business |
|---------|------|-----|----------|
| Workspaces | 1 | Unlimited | Unlimited |
| Projects | 1 | 10 | Unlimited |
| AI Calls/Day | 20 | 200 | Unlimited |
| AI Models | gpt-4o-mini | GPT-4o, Claude, Llama | Any |
| Content Scheduling | 5 posts/month | Unlimited | Unlimited |
| Profile Inspections | 3/day | 50/day | Unlimited |
| Messaging Channels | Instagram only | IG + FB + WhatsApp | All + priority |
| Dynamic Dashboards | Basic | Full | Full + export |
| Competitor Tracking | 1 | 10 | Unlimited |
| Attribution Links | 10/month | Unlimited | Unlimited |
| Intelligence | Daily Brief | Full | Full + predictions |

- [ ] Stripe checkout, webhooks, subscription management.
- [ ] Plan enforcement at service layer.
- [ ] Billing settings page: current plan, upgrade, payment method, invoices.

## 6. Scope & Dependencies

- Modules: `billing`
- Depends on: REQ-0077 (Workspace/Project for limit enforcement)
- External: Stripe API

## 7. Open Questions

- Final pricing for Pro and Business tiers TBD.
