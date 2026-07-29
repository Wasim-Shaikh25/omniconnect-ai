---
description: 0035 — UI Pages and Dark/Light Mode
---

# REQ-0035: 0035 — UI Pages and Dark/Light Mode

- **Status:** Implemented
- **Owner:** Devin
- **Module(s):** all
- **Original spec path:** `docs/specs/0035-ui-pages-dark-mode.md` (restructured)
- **Task:** `docs/tasks/TASK-0035-ui-pages-dark-mode.md`
- **Tracker:** `docs/trackers/TRACKER-0035-ui-pages-dark-mode.md`
- **Last updated:** 2026-07-29

> This file was migrated from `docs/specs/0035-ui-pages-dark-mode.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


## 1. Purpose

Finalize the core UI surface listed in TASK-120 and ensure the application supports dark/light mode consistently.

## 2. Scope

Core pages: Login, Dashboard, eCommerce/Meta connections (on store detail), AI settings (store detail + `/business-brain`), Conversations, Customers, Coupons, Reports, Analytics, Notifications, Account/Settings.

## 3. Requirements

- All listed routes render a usable page.
- Global navigation exposes all primary pages on desktop and mobile.
- Theme provider is wired and `ThemeToggle` is visible.
- No hard-coded light-mode colors (`bg-white`, `text-black`, etc.); use theme tokens.

## 4. Edge Cases

- Mobile nav collapses cleanly and hides on desktop.
- Unauthenticated users see only sign-in/sign-up links.
- Badges/notifications preserved.

## 5. Acceptance Criteria

- [ ] Listed routes exist and build.
- [ ] Primary navigation includes Dashboard, AI Brain, Inbox, Stores, Customers, Reports, Settings, Help, Notifications.
- [ ] Dark/light mode toggle works across pages.
- [ ] No lint/type errors.
