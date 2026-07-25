# 0035 — UI Pages and Dark/Light Mode

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
