---
description: Content Studio — MVP (ideas + captions)
---

# REQ-0018: Content Studio — MVP (ideas + captions)

- **Status:** Superseded — see REQ-0079
- **Owner:** wasim
- **Module(s):** content (client of `ai` and `ecommerce`)
- **Original spec path:** `docs/specs/0018-content-studio-mvp.md` (restructured)
- **Task:** `docs/tasks/TASK-0018-content-studio-mvp.md`
- **Tracker:** `docs/trackers/TRACKER-0018-content-studio-mvp.md`
- **Last updated:** 2026-07-29

> **⚠️ SUPERSEDED (Platform V2)** — replaced by:
> - `docs/requirements/REQ-0079-meta-growth-engine.md`
> Retained for historical reference only. Do not use for new implementation.

> This file was migrated from `docs/specs/0018-content-studio-mvp.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


- **Module(s):** content (client of `ai` and `ecommerce`)
- **Status:** Implemented
- **Owner:** wasim
- **Related task(s):** `docs/tasks/backlog.md` (TASK-210)
- **Related ADR(s):** —
- **Last updated:** 2026-07-25

## 1. Summary
A lightweight Content Studio page for a store where users can generate AI post ideas and captions. Reuses existing `ai` generation actions; no persistence in this MVP.

## 2. Goals
- Provide a single store-scoped page to generate content.
- Expose `generatePostIdeasAction` and `generateCaptionsAction` through a simple form UI.
- Show generated results with engagement scores and best-time-to-post hints.

## 3. Non-Goals
- Content calendar, scheduling, asset library, approvals, or publishing.
- Persisting drafts in the database.
- Multi-store aggregation.

## 4. User Stories
- As a Store Owner, I want to generate caption ideas for a product type so I can post faster.
- As a Manager, I want to see predicted engagement scores so I can choose the best caption.

## 5. Public Contract
- Reuses server actions from `@/modules/ai`:
  - `generatePostIdeasAction`
  - `generateCaptionsAction`
- New route: `/stores/[storeId]/content`.

## 6. Data / Persistence
- None new; actions read store AI config and product catalog.

## 7. API / UI Surface
- `/stores/[storeId]/content` with two tabs/sections:
  - **Ideas:** form with media type, caption/hashtags/metrics, count → list of `TrendIdea` cards.
  - **Captions:** form with media type, product multi-select, niche, goal → list of `GeneratedCaption` cards.
- Add a "Content" link on the store detail page.

## 8. External Integrations
- OpenAI via existing `ai` module (falls back to deterministic dev output when API key missing).

## 9. Edge Cases & Failure Models
- No products yet → caption still works with empty product list.
- No OpenAI key → deterministic fallback appears.
- Invalid store → 404 or unauthorized.

## 10. Security & Privacy
- `requireRole("STORE_OWNER")` enforced in actions.
- Store ownership verified against current user's organization.

## 11. Testing Strategy
- Unit: form validation and display helpers.
- Integration: action org-scoping and fallback output.
- UI: both generators render and reset correctly.

## 12. Acceptance Criteria (Definition of Done)
- [x] Spec created and linked to backlog.
- [x] `/stores/[storeId]/content` renders idea and caption generators.
- [x] Store detail page links to Content Studio.
- [x] Lint + typecheck + build pass.
- [x] CHANGELOG.md and backlog updated.

## 13. Open Questions
1. Should generated content be saved as `ContentItem` drafts?
2. Should scheduling/publishing integrate with Meta Graph API?
