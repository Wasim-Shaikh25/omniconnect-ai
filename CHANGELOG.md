# Changelog

All notable changes to **MetaBridge AI** are documented here.

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

### 🔨 In Progress
- Awaiting confirmation of the GitHub remote to open the first PR for this foundation.

### ⏭️ Next (proposed build order)
1. **Scaffold the app** — Next.js 15 + TS + Tailwind + ShadCN, Prisma + Postgres, BullMQ + Redis,
   NextAuth, config/env validation, Sentry/OTel wiring, PWA setup, module folder skeleton.
2. **Module 1 — Auth** (Email + Google, JWT, RBAC: Admin/Store Owner/Staff, profile mgmt).
3. **Users + Organizations + Stores** (multi-tenant foundation).
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
