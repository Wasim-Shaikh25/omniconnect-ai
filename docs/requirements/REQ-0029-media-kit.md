---
description: Media Kit
---

# REQ-0029: Media Kit

- **Status:** Cancelled
- **Owner:** wasim
- **Module(s):** growth / presentation
- **Original spec path:** `docs/specs/0029-media-kit.md` (restructured)
- **Task:** `docs/tasks/TASK-0029-media-kit.md`
- **Tracker:** `docs/trackers/TRACKER-0029-media-kit.md`
- **Last updated:** 2026-07-29

> This file was migrated from `docs/specs/0029-media-kit.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


- **Module(s):** growth / presentation
- **Status:** Cancelled
- **Owner:** wasim
- **Related task(s):** `docs/tasks/backlog.md` (TASK-310)
- **Related ADR(s):** —
- **Last updated:** 2026-07-25

## 1. Summary
A store-scoped Media Kit page that creators can share with brands. It shows follower/store metrics, top products, recent content, and an elevator pitch.

## 2. Goals
- Surface the store's public-facing metrics and highlights.
- Provide a clean, printable/shareable view for sponsorship outreach.
- Reuse existing public queries; no new data model.

## 3. Non-Goals
- PDF export, public shareable link, or editable design customization in this slice.
- New image upload or asset management.

## 4. User Stories
- As a Store Owner, I want a one-page media kit I can screenshot or print to share with brands.

## 5. Public Contract
- Route: `/stores/[storeId]/media-kit`.
- Uses `organizationQueries.getOrganizationOverview`, `ecommerceQueries.getStoreConnection`/`listProducts`, `crmQueries.listFollowers`, `conversationQueries.listConversations`, `analyticsQueries` for KPIs.

## 6. Data / Persistence
- Read-only; no writes.

## 7. API / UI Surface
- Store header, description/elevator pitch.
- KPIs: followers, products, conversations, orders/revenue (if available), top products.
- Recent public content placeholder (future UGC integration).
- Print-friendly layout.

## 8. External Integrations
- None.

## 9. Edge Cases & Failure Models
- Missing data → show "—" or empty state.

## 10. Security & Privacy
- `getCurrentUser` + org scoping.

## 11. Testing Strategy
- Integration: page renders for permitted store.
- UI: populated and empty states.

## 12. Acceptance Criteria (Definition of Done)
- [x] Spec created and linked to backlog.
- [x] `/stores/[storeId]/media-kit` renders store metrics and highlights.
- [x] Store detail page links to Media Kit.
- [x] Lint + typecheck + build pass.
- [x] CHANGELOG.md and backlog updated.

## 13. Open Questions
1. Should the media kit be publicly accessible via a tokenized link?
2. Should it support custom brand colors or uploaded hero images?
