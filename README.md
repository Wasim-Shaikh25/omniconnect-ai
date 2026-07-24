# OmniConnect AI

An intelligent bridge between **Meta platforms** (Instagram & Facebook) and **eCommerce
platforms** (Shopify first, provider-agnostic). OmniConnect AI monitors messages, comments,
and interactions, replies with a configurable AI assistant, onboards first-time followers with
personalized discount codes, manages coupons/products through a universal connector, and
surfaces AI-driven marketing insights.

> **Status:** Foundation phase — governance, specs, tasks, changelog, and architecture docs.
> Application code is scaffolded in the "Next" section of the changelog.

## Start here (every contributor, human or AI)
1. Read **[`CHANGELOG.md`](./CHANGELOG.md)** — what's Done / In Progress / Next.
2. Read **[`AGENTS.md`](./AGENTS.md)** — the single engineering standard (spec-first,
   changelog-first, task-driven, DDD, loose coupling).
3. Read the relevant spec in **[`docs/specs/`](./docs/specs/)** before changing code.

## The workflow (non-negotiable)
```
read CHANGELOG → read/update SPEC → create TASK → implement → update CHANGELOG → verify
```
No code without a spec. No work without a task. No session without reading the changelog.

## Architecture (loose coupling is law)
Domain-Driven Design + Repository Pattern + Event-Driven Architecture across loosely-coupled
modules. Modules talk only through public contracts (application services) or domain events —
never by importing each other's internals. See **[`docs/architecture/`](./docs/architecture/)**.

Modules: `auth`, `users`, `organizations`, `ecommerce`, `meta`, `ai`, `coupons`, `crm`,
`conversations`, `analytics`, `reports`, `notifications`.

## Tech stack
Next.js 15 · TypeScript · TailwindCSS · ShadCN UI · PostgreSQL · Prisma · BullMQ + Redis ·
OpenAI (multi-model-ready) · NextAuth · AWS S3-compatible · Sentry + OpenTelemetry.

## Repository layout
```
AGENTS.md            Single source of truth (engineering standard)
CLAUDE.md            Claude rules → AGENTS.md
.cursorrules         Cursor rules → AGENTS.md
.cursor/rules/*.mdc  Scoped Cursor rules
.windsurfrules       Windsurf rules → AGENTS.md
CHANGELOG.md         Read first every session
docs/
  specs/             Spec-first: one spec per module/feature
  tasks/             Task-driven backlog + templates
  architecture/      DDD layers, module boundaries, event-driven design
  decisions/         ADRs
```

## AI assistant rules
`AGENTS.md` is canonical. `CLAUDE.md`, `.cursorrules`, `.cursor/rules/*.mdc`, and
`.windsurfrules` all defer to it so every tool follows one standard.
