---
description: Campaigns Hub
---

# REQ-0022: Campaigns Hub

- **Status:** In Progress
- **Owner:** wasim
- **Module(s):** coupons (presentation)
- **Original spec path:** `docs/specs/0022-campaigns-hub.md` (restructured)
- **Task:** `docs/tasks/TASK-0022-campaigns-hub.md`
- **Tracker:** `docs/trackers/TRACKER-0022-campaigns-hub.md`
- **Last updated:** 2026-07-29

> This file was migrated from `docs/specs/0022-campaigns-hub.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


- **Module(s):** coupons (presentation)
- **Status:** In Progress
- **Owner:** wasim
- **Related task(s):** `docs/tasks/backlog.md` (TASK-250)
- **Related ADR(s):** —
- **Last updated:** 2026-07-25

## 1. Summary
A store-scoped campaigns hub that lists active automation campaigns. First slice focuses on the existing first-time follower welcome campaign; future campaign types can be appended.

## 2. Goals
- Provide a single place to view all campaigns for a store.
- Surface the first-time follower campaign details and link to its configuration page.
- Avoid hard-campaign logic in the page; read via `couponsQueries.getCampaign`.

## 3. Non-Goals
- Campaign creation, editing, or scheduling from this page.
- New campaign types or schema changes.

## 4. User Stories
- As a Store Owner, I want to see which automations are active for my store.

## 5. Public Contract
- Route: `/stores/[storeId]/campaigns`.
- Uses `couponsQueries.getCampaign(storeId, "FIRST_TIME_FOLLOWER")`.

## 6. Data / Persistence
- Reads the existing `Campaign` table.
- No writes.

## 7. API / UI Surface
- Card list of campaigns with name, status, discount %, coupon TTL, and message template preview.
- Link to `/stores/[storeId]/campaigns/first-follower` to edit.
- Store detail page links to **Campaigns**.

## 8. External Integrations
- None.

## 9. Edge Cases & Failure Models
- No campaigns yet → show empty state with configure link.
- Campaign missing → `getOrCreateDefault` is not used; display a CTA to create/configure.

## 10. Security & Privacy
- `getCurrentUser` + org scoping.

## 11. Testing Strategy
- Integration: page renders for permitted store.
- UI: empty and populated states.

## 12. Acceptance Criteria (Definition of Done)
- [x] Spec created and linked to backlog.
- [x] `/stores/[storeId]/campaigns` lists the first-time follower campaign.
- [x] Store detail page links to Campaigns.
- [x] Lint + typecheck + build pass.
- [x] CHANGELOG.md and backlog updated.

## 13. Open Questions
1. Should the hub show campaign performance (sent coupons, redemptions)?
2. Should it support toggling campaigns on/off inline?
