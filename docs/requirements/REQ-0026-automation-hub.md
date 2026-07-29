---
description: Automation Hub
---

# REQ-0026: Automation Hub

- **Status:** Implemented
- **Owner:** wasim
- **Module(s):** automation (presentation) — builds on `coupons` and `growth`
- **Original spec path:** `docs/specs/0026-automation-hub.md` (restructured)
- **Task:** `docs/tasks/TASK-0026-automation-hub.md`
- **Tracker:** `docs/trackers/TRACKER-0026-automation-hub.md`
- **Last updated:** 2026-07-29

> This file was migrated from `docs/specs/0026-automation-hub.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


- **Module(s):** automation (presentation) — builds on `coupons` and `growth`
- **Status:** Implemented
- **Owner:** wasim
- **Related task(s):** `docs/tasks/backlog.md` (TASK-280)
- **Related ADR(s):** —
- **Last updated:** 2026-07-25

## 1. Summary
A store-scoped Automation Hub that gives a single view of the automations already available in the platform (welcome campaigns, DM campaigns, back-in-stock, comment-to-DM unlock, AI replies) and a path to the workflow builder coming in a later slice.

## 2. Goals
- Surface all active automation touchpoints for a store.
- Link directly to the existing configuration pages for each automation.
- Provide counts/status for each automation type.
- Reserve a place for the future visual workflow builder.

## 3. Non-Goals
- A new generic workflow builder or execution engine in this slice.
- New Prisma models or migrations.

## 4. User Stories
- As a Store Owner, I want to see all automations for my store in one place so I can enable/disable and configure them.

## 5. Public Contract
- Route: `/stores/[storeId]/automations`.
- Uses `couponsQueries.getCampaign` and `growthQueries.listCampaigns`/`listBackInStock`/`listCommentUnlockCampaigns`.

## 6. Data / Persistence
- Reads existing `Campaign`, `DmCampaign`, `BackInStockSubscription`, and `CommentUnlockCampaign` records.
- No writes.

## 7. API / UI Surface
- Cards for:
  - Welcome & follow-up (first-time follower campaign)
  - DM campaigns
  - Back-in-stock alerts
  - Comment-to-DM unlock
  - AI assistant (reply + escalation)
- Each card shows count/status and links to its configuration page.

## 8. External Integrations
- None.

## 9. Edge Cases & Failure Models
- No automations configured → show empty counts and CTAs.

## 10. Security & Privacy
- `getCurrentUser` + org scoping.

## 11. Testing Strategy
- Integration: page renders for permitted store.
- UI: empty and populated states.

## 12. Acceptance Criteria (Definition of Done)
- [x] Spec created and linked to backlog.
- [x] `/stores/[storeId]/automations` lists automation categories with status/links.
- [x] Store detail page links to Automations.
- [x] Lint + typecheck + build pass.
- [x] CHANGELOG.md and backlog updated.

## 13. Open Questions
1. Should we add a generic `AutomationRule` model for custom workflows?
2. Should the hub allow toggling automations inline?
