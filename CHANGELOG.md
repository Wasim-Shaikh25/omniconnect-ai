# Changelog

All notable changes to **OmniConnect AI** are documented here.

> **READ THIS FIRST every session.** This changelog is the entry point to the project.
> The `[Unreleased]` section below always answers: what is **Done**, what is **In Progress**,
> and what is **Next**. Update it as the *last* step of any unit of work.
>
> Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
> [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### ✅ Done
- **Project governance & foundation**
  - Canonical engineering standard (`AGENTS.md`) — single source of truth for humans + AI tools.
  - Tool-specific rule files pointing back to `AGENTS.md`: `.cursorrules`, `.cursor/rules/*.mdc`,
    `.windsurfrules`, `CLAUDE.md`.
  - Changelog-first workflow (this file).
  - Spec-first scaffolding: `docs/specs/` (template + project overview + per-module stubs).
  - Task tracking: `docs/tasks/` (template + backlog).
  - Architecture docs: `docs/architecture/` (overview, DDD layers, module boundaries,
    event-driven, loose-coupling rules).
  - ADR process: `docs/decisions/` (template + ADR-0001).

### ✅ Done (continued)
- **TASK-010 — App scaffold** (spec `0010`):
  - Next.js 15.5.21 (patched) + TypeScript (strict) + TailwindCSS + ShadCN-style UI.
  - Dark/light theming via `next-themes` + theme toggle; PWA manifest; landing page.
  - DDD module skeleton for all 12 modules (`domain/application/infrastructure/presentation`
    + public `index.ts` barrel + README each).
  - Shared kernel (`Entity`, `AggregateRoot`, `UniqueId`, `DomainEvent`, `Result`),
    in-memory event bus, validated config (`zod`), structured logger, Prisma client singleton.
  - Prisma schema with all core tables + enums.
  - ESLint import-boundary rule blocking deep cross-module imports; Prettier config; `.env.example`.
  - `npm run lint`, `typecheck`, and `build` all pass; 0 npm audit vulnerabilities.
- **TASK-020 — Authentication module** (spec `0001`):
  - NextAuth (Auth.js) v5 + Prisma adapter, **JWT session strategy**.
  - Credentials provider (email + **bcrypt**, cost 12); **Google** auto-enabled when configured.
  - RBAC: `Role` (Admin/Store Owner/Staff) in JWT + session; `roleSatisfies` hierarchy;
    `getCurrentUser`/`requireUser`/`requireRole` session guards exposed via the barrel.
  - Domain events `UserRegistered`/`UserLoggedIn` on the shared event bus.
  - Pages `/login`, `/register`, protected `/dashboard`, route handler `/api/auth/[...nextauth]`;
    server actions for login/register/sign-out; auto sign-in after registration.
  - Prisma: `emailVerified` + NextAuth `Account`/`Session`/`VerificationToken` models (migrations
    `init`, `auth_models`).
  - Verified end-to-end against Dockerized Postgres; lint + typecheck + build pass; 0 audit vulns.

### 🔨 In Progress
- Repo kept local on the VM per user (no remote/PR yet).
- Local infra: Postgres + Redis run as Docker containers (`omni-pg`, `omni-redis`).
- Next: **TASK-030 — Users + Organizations + Stores** (multi-tenant foundation).

### ⏭️ Next (proposed build order)
1. ~~Scaffold the app~~ ✅ done (TASK-010).
2. ~~**Module 1 — Auth**~~ ✅ done (TASK-020).
3. **Users + Organizations + Stores** (multi-tenant foundation). ← next
4. **Module 2 — eCommerce connector framework** + Shopify provider (OAuth, products, coupons).
5. **Module 3 — Meta integration** (webhooks, FB Pages + IG Business, events).
6. **Module 6 — Customer Memory (CRM)** + **Module 4 — AI Assistant** (per-page system prompts).
7. **Module 5 — First-time follower campaign** (event-driven: follow → coupon → message).
8. **Module 8 — Human takeover**, **Module 9 — Notifications**.
9. **Module 7 — Marketing insights dashboard** + **Reports**.
10. UI pages (Login, Dashboard, connections, AI settings, conversations, customers, coupons,
    reports, analytics, notifications, account) with dark/light mode.

> Each item above must start with its own spec (`docs/specs/`) and task (`docs/tasks/`)
> before implementation, per `AGENTS.md` §0.

---

## Release history

_No releases yet._
