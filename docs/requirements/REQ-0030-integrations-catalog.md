---
description: Integrations Catalog
---

# REQ-0030: Integrations Catalog

- **Status:** In Progress
- **Owner:** wasim
- **Module(s):** ecommerce, meta (presentation)
- **Original spec path:** `docs/specs/0030-integrations-catalog.md` (restructured)
- **Task:** `docs/tasks/TASK-0030-integrations-catalog.md`
- **Tracker:** `docs/trackers/TRACKER-0030-integrations-catalog.md`
- **Last updated:** 2026-07-29

> This file was migrated from `docs/specs/0030-integrations-catalog.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


- **Module(s):** ecommerce, meta (presentation)
- **Status:** In Progress
- **Owner:** wasim
- **Related task(s):** `docs/tasks/backlog.md` (TASK-320)
- **Related ADR(s):** —
- **Last updated:** 2026-07-25

## 1. Summary
A store-scoped integrations catalog and health dashboard. It shows which integrations are connected (eCommerce, Meta) and links to their configuration pages.

## 2. Goals
- Surface all integrations for a store in one place.
- Show connection status and basic health/metrics.
- Link to the store page for connect/disconnect actions.

## 3. Non-Goals
- Add/remove integrations inline in this slice.
- Health checks or uptime monitoring.

## 4. User Stories
- As a Store Owner, I want to see at a glance which integrations are connected.

## 5. Public Contract
- Route: `/stores/[storeId]/integrations`.
- Uses `ecommerceQueries.getStoreConnection` and `metaQueries.getMetaConnection`.

## 6. Data / Persistence
- Read-only; no writes.

## 7. API / UI Surface
- Cards for eCommerce and Meta integrations.
- Status badge (connected/disconnected), provider/channel, account/domain, product count.
- Link to manage on store page.

## 8. External Integrations
- None directly; reads integration records.

## 9. Edge Cases & Failure Models
- No integrations → show empty state with CTA to connect.

## 10. Security & Privacy
- `getCurrentUser` + org scoping. Do not display tokens.

## 11. Testing Strategy
- Integration: page renders for permitted store.
- UI: connected and disconnected states.

## 12. Acceptance Criteria (Definition of Done)
- [x] Spec created and linked to backlog.
- [x] `/stores/[storeId]/integrations` lists integration cards with status.
- [x] Store detail page links to Integrations.
- [x] Lint + typecheck + build pass.
- [x] CHANGELOG.md and backlog updated.

## 13. Open Questions
1. Should integrations be disconnectable from this page?
2. Should health status include last sync timestamp?
