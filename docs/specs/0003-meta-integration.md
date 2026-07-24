# Spec 0003: Meta Integration

- **Module(s):** meta
- **Status:** Draft
- **Owner:** wasim
- **Related task(s):** docs/tasks/backlog.md
- **Related ADR(s):** —
- **Last updated:** 2026-07-24

## 1. Summary
Webhook-based integration with Facebook Pages and Instagram Business accounts via Meta Graph, Messenger, and Instagram Messaging APIs. Receives DMs, page messages, comments, mentions, follows, and post interactions; stores interaction records.

## 2. Goals
- Connect FB Pages and IG Business accounts (OAuth + page tokens)
- Receive DMs, page messages, comment notifications, post interactions
- View conversation history; store customer interaction records
- Verify webhook signatures

## 3. Non-Goals
- Anything listed under Phase 2/3 in the Future Roadmap (see `docs/specs/0000-project-overview.md`).

## 4. Public Contract (loose coupling)
- Inbound webhook handler normalizes Meta events into domain events: `NewFollow`, `NewMessage`, `Comment`, `Mention`, `PageInteraction`.
- `MetaService` port: `sendMessage`, `getConversation`, `listPages`.
- `conversations`, `crm`, `ai`, `crm`/`coupons` subscribe to these events (loose coupling).

> Other modules interact ONLY through the contract above (application service / port /
> domain events). No module imports this module's internals. No circular dependencies.

## 5. Data / Persistence
`Integrations` (meta), `Conversations`, `Messages`, `Followers`, `Customers`. Ownership: `meta` (raw events) → normalized into `conversations`/`crm`.
All schema changes via Prisma migrations.

## 6. Notes
All external Meta calls behind an adapter in Infrastructure; Domain deals only with normalized events.

## 7. Acceptance Criteria (Definition of Done)
- [ ] Domain modeled (entities, events) with pure unit tests.
- [ ] Application services/ports implemented and exposed via the module's public barrel.
- [ ] Infrastructure adapters/repositories implemented (Prisma, external APIs).
- [ ] Presentation (routes/UI) wired where applicable, with RBAC.
- [ ] Lint + typecheck + tests pass; `CHANGELOG.md` updated.

> This is an initial stub. Expand using `_TEMPLATE.md` before implementation begins.
