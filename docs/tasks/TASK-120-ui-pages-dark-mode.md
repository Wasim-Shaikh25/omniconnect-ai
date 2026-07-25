# Task 120: UI Pages and Dark/Light Mode

- **Status:** Done
- **Spec:** `docs/specs/0035-ui-pages-dark-mode.md`
- **Module(s):** `presentation`
- **Owner:** wasim
- **Changelog entry:** Completes TASK-120 by ensuring all core UI pages exist, navigation exposes them, and dark/light mode is consistent.

## Description

Finalize the core UI surface (Login, Dashboard, Connections, AI Settings, Conversations, Customers, Coupons, Reports, Analytics, Notifications, Account/Settings) and ensure dark/light mode works consistently.

## Subtasks

- [x] Audit existing pages against TASK-120 list.
- [x] Create spec `0035-ui-pages-dark-mode.md`.
- [x] Add missing primary navigation links (Reports, Settings) to desktop and mobile nav.
- [x] Verify theme provider, theme toggle, and no hard-coded light colors.
- [x] Run lint, typecheck, build; validate end-to-end.
- [x] Update `CHANGELOG.md` and `docs/tasks/backlog.md`; create PR.

## Acceptance Criteria

- [x] All core routes exist and build.
- [x] Primary navigation includes Dashboard, AI Brain, Inbox, Stores, Customers, Reports, Settings, Help, Notifications.
- [x] Dark/light mode toggle works across pages.
- [x] Lint + typecheck + build pass.
