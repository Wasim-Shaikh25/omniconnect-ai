# AGENTS.md — Canonical Engineering Standard for OmniConnect AI

> **This file is the single source of truth** for how ALL contributors — human or AI
> (Cursor, Windsurf, Claude, Devin, Copilot, etc.) — write code in this repository.
>
> Tool-specific rule files (`.cursorrules`, `.cursor/rules/*.mdc`, `.windsurfrules`,
> `CLAUDE.md`) intentionally point back here so there is exactly **one** standard.
> If any of them disagree with this file, **this file wins** — fix the other file.

---

## 0. The Non-Negotiable Workflow (READ THIS FIRST, EVERY TIME)

Before writing or changing ANY code, follow this loop **in order**. Do not skip steps.

```
1. READ  CHANGELOG.md              → understand what is done + what is next
2. READ  docs/specs/current-state.md → understand architecture, contracts, and current behavior
3. READ  the relevant requirement  → docs/requirements/REQ-<id>-<slug>.md
4. WRITE / UPDATE the requirement  → business what/why before any code
5. CREATE / UPDATE the task       → docs/tasks/TASK-<id>-<slug>.md (technical how, code refs, snippets)
6. CREATE / UPDATE the tracker      → docs/trackers/TRACKER-<id>-<slug>.md (progress checklist)
7. IMPLEMENT                        → code to match the requirement + task, respecting module boundaries
8. UPDATE docs/specs/current-state.md if architecture/contract changed
9. UPDATE CHANGELOG.md              → move item to "Done", add the next step under "Next"
10. VERIFY                           → lint + typecheck + tests + build/build:worker + task-status
```

**Rule of thumb:** *No code without a requirement. No work without a task and tracker. No session without reading the changelog and current-state first.*

### Document structure
- `docs/specs/current-state.md` — living system overview (architecture, data model, critical flows, current limitations). Updated whenever architecture or contracts change.
- `docs/requirements/REQ-<id>-<slug>.md` — business requirement with goals, non-goals, user stories, acceptance criteria.
- `docs/tasks/TASK-<id>-<slug>.md` — technical implementation plan with code snippets, file references, and subtasks.
- `docs/trackers/TRACKER-<id>-<slug>.md` — progress tracker; all checkboxes must be `x` before a task is "Done".
- `docs/templates/` — copy `REQ-TEMPLATE.md`, `TASK-TEMPLATE.md`, `TRACKER-TEMPLATE.md` for new work.
- `scripts/task-status.ts` — run `npx tsx scripts/task-status.ts` to see what is done and what is left.

### Spec-first / requirement-first
- Every feature/module change begins by creating or updating the requirement in `docs/requirements/`.
- The requirement describes **what** and **why** (behavior, contracts, edge cases, acceptance criteria), not line-by-line **how**.
- The task file describes **how** with code snippets, file references, and implementation steps.
- Code that diverges from its requirement is a bug — update the docs (with reasoning) or fix the code.

### Changelog-first
- **Start every working session by reading `CHANGELOG.md` and `docs/specs/current-state.md`.**
- The top `[Unreleased]` section always answers three questions:
  - **Done** — what has been completed
  - **In Progress** — what is being worked on right now
  - **Next** — what should be picked up next
- Update `CHANGELOG.md` as the **last** step of any unit of work.

### Task-driven / tracker-driven
- Every requirement has a matching `TASK-<id>` and `TRACKER-<id>`.
- The tracker is the source of truth for done vs. left.
- Run `npx tsx scripts/task-status.ts` before and after a session to verify status.
- A requirement is "Done" only when its tracker is 100% complete and quality gates pass.

---

## 1. Architecture Principles (Loose Coupling is Law)

This project uses **Domain-Driven Design (DDD)** with **Event-Driven Architecture** and the
**Repository Pattern**. See `docs/architecture/` for the full detail. The rules that MUST
be enforced in every change:

### Modules must NOT be tightly coupled
- Domain modules: `auth`, `users`, `organizations`, `ecommerce`, `meta`, `ai`, `coupons`,
  `crm`, `conversations`, `analytics`, `reports`, `notifications`.
- A module may depend on another module **only through its public contract** (its published
  interface / application service / domain events) — **never** by importing another module's
  internal files (domain entities, repositories, infra) directly.
- **No cross-module imports of internals.** If module A needs data from module B, it calls
  B's application-layer service/port or subscribes to B's domain events.
- **No circular dependencies** between modules. Ever.
- Communicate across modules with **domain events** wherever a synchronous call would create
  coupling (e.g. "new follower" → coupon generation → notification).

### Layering (per module)
```
Presentation   (Next.js routes / API controllers / UI) — no business logic
   ↓ depends on
Application    (use-cases, command/query handlers, orchestrations, ports)
   ↓ depends on
Domain         (entities, value objects, domain events, business rules) — NO framework/IO
   ↑ implemented by
Infrastructure (Prisma repositories, external API clients, queues, adapters)
```
- **Dependencies point inward.** Domain depends on nothing external. Infrastructure depends
  on Domain (implements its ports), never the reverse.
- The Domain layer must be **pure**: no Prisma, no fetch, no env vars, no framework imports.

### Connector / provider extensibility
- eCommerce and AI providers are behind interfaces. Adding a provider (WooCommerce, BigCommerce,
  a new LLM) means **implementing an interface only** — no changes to callers.
- eCommerce connector contract: `getProducts`, `getOrders`, `getCustomers`, `generateCoupon`,
  `disableCoupon`, `fetchDiscounts`, `fetchStoreInfo`. First provider: **Shopify**.

---

## 2. Tech Stack (do not substitute without an ADR)

| Concern         | Choice                                             |
|-----------------|----------------------------------------------------|
| Frontend        | Next.js 15 (App Router), TypeScript, TailwindCSS, ShadCN UI, mobile-first, PWA-ready |
| Backend         | Next.js route handlers / server actions (NestJS optional per module boundary), TypeScript |
| Database        | PostgreSQL                                          |
| ORM             | Prisma                                              |
| Queue           | BullMQ + Redis                                      |
| AI              | OpenAI API via a multi-model-ready provider interface |
| Auth            | NextAuth (Email + Google), JWT sessions, RBAC (Admin/Store Owner/Staff) |
| Storage         | AWS S3-compatible                                   |
| Observability   | Sentry + OpenTelemetry                              |

Changing any of these requires an ADR in `docs/decisions/`.

---

## 3. Coding Standards

- **Language:** TypeScript everywhere. `strict` mode on. No `any`; if you reach for `any`,
  `as`, `getattr`-style dynamic access, or `@ts-ignore`, you don't understand the type yet —
  go read it and model it correctly.
- **Naming:** `camelCase` variables/functions, `PascalCase` types/components/classes,
  `SCREAMING_SNAKE_CASE` constants, kebab-case file names (except React components: `PascalCase.tsx`).
- **Files:** small and focused. One primary export per file where reasonable.
- **Imports:** all at the top of the file. No imports inside functions. Prefer module-public
  barrels for cross-module access; deep-importing another module's internals is forbidden.
- **Errors:** fail loudly with typed errors; never swallow. Never log secrets/tokens/PII.
- **Comments:** default is none — rely on good names. Comment only non-obvious *why*. Never
  write comments that only describe a diff ("now also checks X").
- **Env/secrets:** access via a validated config module; never read `process.env` scattered
  around the codebase. Never commit `.env` or credentials.
- **Formatting/quality gates:** Prettier + ESLint + `tsc --noEmit` + tests must pass before commit.
  Pre-commit hooks enforce this; do not use `--no-verify`.
- **Tests:** unit-test the Domain layer (pure, fast); integration-test repositories and
  connectors against contracts. Do not edit tests just to make them pass.
- **Dependencies:** prefer versions published ≥7 days ago; no floating ranges (`latest`, `*`).

---

## 4. Database

Core tables (see `docs/architecture/` and per-module specs for fields/relations):
`Users`, `Organizations`, `Stores`, `Integrations`, `Products`, `Customers`, `Coupons`,
`CouponUsage`, `Conversations`, `Messages`, `Campaigns`, `Reports`, `Notifications`,
`Followers`, `AIConfigurations`.

- All schema changes go through **Prisma migrations** — never hand-edit generated SQL/artifacts.
- Every table maps to a module that owns it; other modules read it only via that module's repository/service.

---

## 5. Security & Privacy

- Defensive posture only. Never expose or log secrets/keys/tokens/customer PII.
- RBAC enforced at the application layer for every mutating use-case.
- Webhook endpoints (Meta) must verify signatures.
- Never weaken security controls (branch protection, `.npmrc`, release-age policies) to make
  CI pass — escalate instead.

---

## 6. Git & PR Hygiene

- Small, focused, spec-linked changes. Branch: `devin/<timestamp>-<slug>` or feature slug.
- Conventional-commit-style messages (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`).
- Every PR: links its spec + task, updates `CHANGELOG.md`, passes all quality gates.
- Do not `git add .`; never commit `.env`/credentials; never force-push `main`.

---

## 7. Definition of Done

A change is DONE only when:
- [ ] Spec created/updated in `docs/specs/`
- [ ] Task recorded/updated in `docs/tasks/`
- [ ] Code respects DDD layering + module boundaries (no cross-module internal imports)
- [ ] Lint + typecheck + tests pass
- [ ] `CHANGELOG.md` updated (Done / In Progress / Next)
- [ ] PR links spec + task
