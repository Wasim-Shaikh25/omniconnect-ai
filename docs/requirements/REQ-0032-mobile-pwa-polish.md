---
description: Mobile Responsive Quick Actions & PWA Polish
---

# REQ-0032: Mobile Responsive Quick Actions & PWA Polish

- **Status:** Implemented
- **Owner:** wasim
- **Module(s):** ui / app shell
- **Original spec path:** `docs/specs/0032-mobile-pwa-polish.md` (restructured)
- **Task:** `docs/tasks/TASK-0032-mobile-pwa-polish.md`
- **Tracker:** `docs/trackers/TRACKER-0032-mobile-pwa-polish.md`
- **Last updated:** 2026-07-29

> This file was migrated from `docs/specs/0032-mobile-pwa-polish.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


- **Module(s):** ui / app shell
- **Status:** Implemented
- **Owner:** wasim
- **Related task(s):** `docs/tasks/backlog.md` (TASK-340)
- **Related ADR(s):** —
- **Last updated:** 2026-07-25

## 1. Summary
Polish the app shell for small screens and add PWA basics: a web app manifest and a mobile-friendly navigation menu.

## 2. Goals
- Provide a collapsible mobile navigation in the global header.
- Add a `manifest.webmanifest` so the app can be installed as a PWA.
- Keep desktop header unchanged.

## 3. Non-Goals
- Service worker / offline support in this slice.
- Push notifications or add-to-home-screen prompt logic.

## 4. User Stories
- As a user on mobile, I want to open the main nav without horizontal scrolling.

## 5. Public Contract
- `MobileNav` client component in `src/components/mobile-nav.tsx`.
- `/manifest.webmanifest` generated from `src/app/manifest.ts`.

## 6. Data / Persistence
- None.

## 7. API / UI Surface
- Hamburger button on small screens toggles a vertical menu with the same links as the desktop nav.
- Desktop nav remains a horizontal row.
- Manifest includes name, short_name, start_url, display, background/theme colors, icons placeholder.

## 8. External Integrations
- None.

## 9. Edge Cases & Failure Models
- Menu should close when a link is clicked.
- No JS: graceful fallback to a wrapping nav (acceptable for MVP).

## 10. Security & Privacy
- No changes.

## 11. Testing Strategy
- UI: resize viewport; mobile menu toggles and links work.
- Build: `/manifest.webmanifest` is generated.

## 12. Acceptance Criteria (Definition of Done)
- [x] Spec created and linked to backlog.
- [x] `/manifest.webmanifest` generated.
- [x] Mobile hamburger navigation added.
- [x] AppHeader uses the mobile nav and desktop nav.
- [x] Lint + typecheck + build pass.
- [x] CHANGELOG.md and backlog updated.

## 13. Open Questions
1. Should the mobile menu be a slide-out sheet or dropdown?
2. Should we add a floating quick-action button for mobile dashboards?
