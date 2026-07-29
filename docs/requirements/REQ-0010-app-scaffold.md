---
description: Application Scaffold
---

# REQ-0010: Application Scaffold

- **Status:** Approved
- **Owner:** wasim
- **Module(s):** all (infrastructure/base)
- **Original spec path:** `docs/specs/0010-app-scaffold.md` (restructured)
- **Task:** `docs/tasks/TASK-0010-app-scaffold.md`
- **Tracker:** `docs/trackers/TRACKER-0010-app-scaffold.md`
- **Last updated:** 2026-07-29

> This file was migrated from `docs/specs/0010-app-scaffold.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


- **Module(s):** all (infrastructure/base)
- **Status:** Approved
- **Owner:** wasim
- **Related task(s):** docs/tasks/backlog.md (TASK-010)
- **Related ADR(s):** docs/decisions/0001-record-architecture-decisions.md
- **Last updated:** 2026-07-24

## 1. Summary
Create the buildable base application for OmniConnect AI: Next.js 15 (App Router) + TypeScript
+ TailwindCSS + ShadCN-style UI (dark/light), the DDD module skeleton for all 12 modules, a
shared kernel (base Entity, DomainEvent, Result), an in-process event bus abstraction, a
validated config module, and a Prisma schema covering the core tables. This is the foundation
every subsequent module builds on.

## 2. Goals
- Next.js 15 App Router + TypeScript (strict) + Tailwind, mobile-first, PWA-ready manifest.
- ShadCN-style component baseline with dark/light theme toggle.
- `src/modules/<module>/{domain,application,infrastructure,presentation,index.ts}` for all 12 modules.
- `src/shared/{kernel,events,config,observability}` primitives.
- Prisma schema with core tables and a `db` client singleton.
- Import-boundary lint rule blocking deep cross-module imports.
- `npm run lint`, `npm run typecheck`, `npm run build` all pass.

## 3. Non-Goals
- Real business logic per module (delivered in each module's own spec/task).
- Live external integrations (Meta/Shopify/OpenAI) — only interfaces/adapters stubs.
- Running migrations against a real database (schema authored; migration deferred to module work).

## 4. Layout
```
src/
  app/                      # Next.js App Router (thin presentation)
    layout.tsx, page.tsx, globals.css, providers.tsx
  components/ui/            # ShadCN-style primitives (button, card, ...)
  lib/                      # cn() util, etc.
  modules/<module>/
    domain/ application/ infrastructure/ presentation/ index.ts
  shared/
    kernel/  events/  config/  observability/
prisma/schema.prisma
```

## 5. Acceptance Criteria
- [ ] App builds, lints, typechecks.
- [ ] Landing page renders with theme toggle (dark/light).
- [ ] All 12 module folders exist with a public `index.ts` barrel.
- [ ] Shared kernel + event bus + validated config present.
- [ ] Prisma schema defines core tables; client singleton compiles.
- [ ] Import-boundary ESLint rule configured.
- [ ] CHANGELOG updated.
