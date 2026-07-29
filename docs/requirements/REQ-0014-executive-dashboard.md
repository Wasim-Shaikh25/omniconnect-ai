---
description: Executive Dashboard & Workspace KPIs
---

# REQ-0014: Executive Dashboard & Workspace KPIs

- **Status:** In Progress
- **Owner:** wasim
- **Module(s):** analytics, organizations, ecommerce, crm, conversations, ai
- **Original spec path:** `docs/specs/0014-executive-dashboard.md` (restructured)
- **Task:** `docs/tasks/TASK-0014-executive-dashboard.md`
- **Tracker:** `docs/trackers/TRACKER-0014-executive-dashboard.md`
- **Last updated:** 2026-07-29

> This file was migrated from `docs/specs/0014-executive-dashboard.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


- **Module(s):** analytics, organizations, ecommerce, crm, conversations, ai
- **Status:** In Progress
- **Owner:** wasim
- **Related task(s):** `docs/tasks/backlog.md` (TASK-170)
- **Related ADR(s):** —
- **Last updated:** 2026-07-25

## 1. Summary
Deliver a workspace-scoped Executive Dashboard (`/dashboard`) that gives an at-a-glance view of business health: store count, products, conversations, followers, coupons, and connected integrations. It surfaces quick actions and a link to the AI Business Brain for natural-language questions.

## 2. Goals
- Show trusted, tenant-scoped KPIs for the current organization.
- Surface recent stores and one-click navigation to common modules.
- Provide an entry point to AI-generated daily briefings and recommendations.

## 3. Non-Goals
- Full analytics charts or report builder (Spec 0007).
- Scheduled/periodic reports.
- Multi-workspace portfolio view.

## 4. User Stories
- As an Owner, I want to see my workspace health immediately after login so I can decide what to act on.
- As a Manager, I want to see conversation and follower counts so I can prioritize customer engagement.

## 5. Domain Model
- `WorkspaceKpiSnapshot` (read-only view): stores, products, conversations, followers, coupons, leads, notifications, connected integrations.
- `Recommendation` (placeholder): title, type, confidence, reason, cta.

## 6. Public Contract
- `analyticsQueries.getWorkspaceKpis(organizationId)` returns `WorkspaceKpiSnapshot`.
- Dashboard page is presentation-only and composes existing module queries.

## 7. Data / Persistence
- No new tables. Aggregates are computed from existing `Store`, `Product`, `Conversation`, `Follower`, `Coupon`, `SocialLead`, `Integration`, and `Notification` records.
- All queries are tenant-scoped by `organizationId` via the user's session.

## 8. API / UI Surface
- `/dashboard` — server-rendered executive dashboard.
  - KPI cards (stores, products, conversations, followers, coupons, leads, unread notifications).
  - Recent stores list with deep links.
  - Quick-action cards to Stores, Conversations, Trends, Competitors, and AI Business Brain.
- RBAC: any authenticated organization member can view.

## 9. External Integrations
- None new.

## 10. Edge Cases & Failure Modes
- No stores → empty state with "Create your first store" CTA.
- No data yet → cards show 0 and helper text.
- Permission denied → redirect to login or show restricted message.

## 11. Security & Privacy
- Data is scoped to the user's `organizationId`. Server actions verify store ownership.
- No PII displayed beyond the user's own email and workspace name.

## 12. Testing Strategy
- Unit: KPI aggregation logic.
- Integration: dashboard renders with seeded workspace data.
- UI: navigation links and empty states.

## 13. Acceptance Criteria (Definition of Done)
- [x] Spec created and linked to backlog.
- [x] `/dashboard` renders workspace KPIs and quick actions.
- [x] Navigation updated to include Dashboard and AI Business Brain.
- [x] Lint + typecheck + build pass.
- [x] CHANGELOG.md and backlog updated.

## 14. Open Questions
1. Should revenue/orders be included once the Orders module is built?
2. Should the dashboard be customizable per role?
