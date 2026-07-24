# Spec 0004: AI Customer Assistant

- **Module(s):** ai
- **Status:** Draft
- **Owner:** wasim
- **Related task(s):** docs/tasks/backlog.md
- **Related ADR(s):** —
- **Last updated:** 2026-07-24

## 1. Summary
Per-page configurable AI assistant. Each connected page has a custom system prompt (tone, brand voice, welcome/coupon/sales strategy, escalation rules). Understands intent, answers FAQs, recommends products, explains discounts, handles objections, and escalates to humans.

## 2. Goals
- Per-page `AIConfiguration` (system prompt + strategy settings)
- Intent understanding, FAQ answering, product recommendations, discount explanation
- Objection handling and human escalation triggers
- Multi-model-ready provider interface (OpenAI first)

## 3. Non-Goals
- Anything listed under Phase 2/3 in the Future Roadmap (see `docs/specs/0000-project-overview.md`).

## 4. Public Contract (loose coupling)
- `AIProvider` interface: `complete(messages, config)` — swap models by implementing it.
- `AssistantService` port: `generateReply(conversationId)`.
- Consumes `NewMessage`/`NewFollow` events; may emit `EscalationRequested`, `ReplyGenerated`.
- Reads product/coupon data via `ecommerce`/`coupons` ports and customer memory via `crm` port.

> Other modules interact ONLY through the contract above (application service / port /
> domain events). No module imports this module's internals. No circular dependencies.

## 5. Data / Persistence
`AIConfigurations` (per store/page: prompt, tone, strategies, escalation rules). Ownership: `ai`.
All schema changes via Prisma migrations.

## 6. Notes
Prompts + retrieved context assembled in Application layer; Domain holds strategy rules, not IO.

## 7. Acceptance Criteria (Definition of Done)
- [ ] Domain modeled (entities, events) with pure unit tests.
- [ ] Application services/ports implemented and exposed via the module's public barrel.
- [ ] Infrastructure adapters/repositories implemented (Prisma, external APIs).
- [ ] Presentation (routes/UI) wired where applicable, with RBAC.
- [ ] Lint + typecheck + tests pass; `CHANGELOG.md` updated.

> This is an initial stub. Expand using `_TEMPLATE.md` before implementation begins.
