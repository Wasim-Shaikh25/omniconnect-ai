---
description: Workspace Reports
---

# REQ-0025: Workspace Reports

- **Status:** In Progress
- **Owner:** wasim
- **Module(s):** analytics/presentation
- **Original spec path:** `docs/specs/0025-workspace-reports.md` (restructured)
- **Task:** `docs/tasks/TASK-0025-workspace-reports.md`
- **Tracker:** `docs/trackers/TRACKER-0025-workspace-reports.md`
- **Last updated:** 2026-07-29

> This file was migrated from `docs/specs/0025-workspace-reports.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


- **Module(s):** analytics/presentation
- **Status:** In Progress
- **Owner:** wasim
- **Related task(s):** `docs/tasks/backlog.md` (TASK-280)
- **Related ADR(s):** —
- **Last updated:** 2026-07-25

## 1. Summary
A global `/reports` page that gives a workspace-level snapshot: total KPIs and a per-store breakdown of products, conversations, followers, and coupons.

## 2. Goals
- Surface high-level workspace metrics.
- Provide a per-store breakdown so owners can compare activity across stores.
- Reuse existing public queries; no new modules or schema changes.

## 3. Non-Goals
- Date-range filtering, CSV export, or scheduled report generation.
- New analytics data model or persistence.

## 4. User Stories
- As an Admin/Store Owner, I want a single report view of all workspace activity.

## 5. Public Contract
- Route: `/reports`.
- Uses `analyticsQueries.getWorkspaceKpis`, `organizationQueries.getOrganizationOverview`, `ecommerceQueries.*`, `crmQueries.listFollowers`, `conversationQueries.listConversations`.

## 6. Data / Persistence
- Reads existing data from ecommerce, CRM, and conversation modules.
- No writes.

## 7. API / UI Surface
- KPI cards: stores, products, conversations, followers, coupons, unread notifications.
- Per-store table with product count, coupons, followers, conversations, connection status.

## 8. External Integrations
- None.

## 9. Edge Cases & Failure Models
- No organization/stores → redirect or empty state.

## 10. Security & Privacy
- `getCurrentUser` + org scoping.

## 11. Testing Strategy
- Integration: page renders for authenticated user.
- UI: populated table and empty state.

## 12. Acceptance Criteria (Definition of Done)
- [x] Spec created and linked to backlog.
- [x] `/reports` renders workspace KPIs and per-store breakdown.
- [x] Lint + typecheck + build pass.
- [x] CHANGELOG.md and backlog updated.

## 13. Open Questions
1. Should reports be exportable (CSV/PDF)?
2. Should there be date-range filters?
