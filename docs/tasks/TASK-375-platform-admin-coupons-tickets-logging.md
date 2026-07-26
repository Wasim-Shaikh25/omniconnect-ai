# Task 375: Platform Administration — Super Admin, SaaS Coupons, Support Tickets, and Operational Logging

- **Status:** Done
- **Spec:** `docs/specs/0051-platform-admin-coupons-tickets-logging.md`
- **Module(s):** `auth`, `users`, `organizations`, `support`, `shared/observability`, `app`
- **Owner:** wasim
- **Changelog entry:** Added to CHANGELOG.md `[Unreleased]`.

## Description

Build the founder-facing platform administration surface so the OmniConnect AI SaaS can be operated end-to-end: a super admin can view all tenants, generate flexible percentage discount coupons that apply at Stripe Checkout, triage support tickets opened by users, and inspect centralized system logs. This task implements spec `0051`.

## Subtasks

- [x] Read CHANGELOG.md and existing billing/admin specs.
- [x] Write spec `0051-platform-admin-coupons-tickets-logging.md`.
- [x] Prisma schema migration (`User.isSuperAdmin`, `SaaSCoupon`, `SupportTicket`, `TicketComment`, `SystemLog`).
- [x] Run `npx prisma migrate dev` and `npx prisma generate`.
- [x] Add `requireSuperAdmin()` guard in `auth` module.
- [x] Add super admin list queries for organizations and users.
- [x] Implement SaaS coupon use-cases, repository, and server actions (Stripe sync).
- [x] Implement support ticket use-cases, repository, and server actions.
- [x] Implement system logging repository and helpers.
- [x] Build `/admin` dashboard and sub-pages (organizations, users, coupons, tickets, logs).
- [x] Build `/support` user ticket page and update `/settings/billing` coupon input.
- [x] Wire coupon promotion code into Stripe Checkout.
- [x] Run `npm run lint`, `npm run typecheck`, `npm run build`.
- [x] Update `CHANGELOG.md` and open PR.

## Acceptance Criteria

- [x] Matches spec `0051` acceptance criteria.
- [x] Lint + typecheck + build pass.
- [x] `CHANGELOG.md` updated.

## Notes / Blockers

- Stripe test/live keys required for full coupon end-to-end; UI falls back to a missing-Stripe alert when keys are absent.
- First super admin must be seeded via SQL or a one-off script; no self-elevation is allowed.
