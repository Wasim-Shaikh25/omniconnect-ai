---
description: Store Followers Page
---

# REQ-0024: Store Followers Page

- **Status:** Implemented
- **Owner:** wasim
- **Module(s):** crm (presentation)
- **Original spec path:** `docs/specs/0024-followers-page.md` (restructured)
- **Task:** `docs/tasks/TASK-0024-followers-page.md`
- **Tracker:** `docs/trackers/TRACKER-0024-followers-page.md`
- **Last updated:** 2026-07-29

> This file was migrated from `docs/specs/0024-followers-page.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


- **Module(s):** crm (presentation)
- **Status:** Implemented
- **Owner:** wasim
- **Related task(s):** `docs/tasks/backlog.md` (TASK-270)
- **Related ADR(s):** —
- **Last updated:** 2026-07-25

## 1. Summary
A store-scoped followers page that lists Meta followers collected from follow events. This is a read-only UI page to surface the CRM follower data.

## 2. Goals
- Show all followers for a store with username and follow date.
- Provide a quick count and link back to the store.

## 3. Non-Goals
- Follower segmentation, messaging, or engagement actions.
- Editing/deleting followers.

## 4. User Stories
- As a Store Owner, I want to see who is following my store so I can gauge audience growth.

## 5. Public Contract
- Route: `/stores/[storeId]/followers`.
- Uses `crmQueries.listFollowers(storeId, limit?)`.

## 6. Data / Persistence
- Reads existing `Follower` records.
- No writes.

## 7. API / UI Surface
- Follower cards/list with username and followed-at date.
- Store detail page links to **Followers**.

## 8. External Integrations
- Meta webhook follow events already populate `Follower`.

## 9. Edge Cases & Failure Models
- No followers → empty state.

## 10. Security & Privacy
- `getCurrentUser` + org scoping.

## 11. Testing Strategy
- Integration: page renders for permitted store.
- UI: empty and populated states.

## 12. Acceptance Criteria (Definition of Done)
- [x] Spec created and linked to backlog.
- [x] `/stores/[storeId]/followers` lists followers.
- [x] Store detail page links to Followers.
- [x] Lint + typecheck + build pass.
- [x] CHANGELOG.md and backlog updated.

## 13. Open Questions
1. Should follower count/engagement be shown (e.g. last interaction)?
2. Should followers be linked to customer profiles?
