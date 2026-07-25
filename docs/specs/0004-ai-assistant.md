# Spec 0004: AI Customer Assistant

- **Module(s):** ai
- **Status:** In Progress
- **Owner:** wasim
- **Related task(s):** docs/tasks/backlog.md (TASK-070)
- **Related ADR(s):** —
- **Last updated:** 2026-07-25

## 1. Summary
Per-page configurable AI assistant. Each connected store has a custom system prompt (tone, brand voice, welcome/coupon/sales strategy, escalation rules). Understands intent, answers FAQs, recommends products, explains discounts, and escalates to humans.

## 2. Goals
- Per-store `AIConfiguration` (system prompt + strategy settings).
- Multi-model-ready provider interface (OpenAI first via `fetch`).
- Reply generation triggered by `NewMessage` domain event.
- Context assembly from CRM memory, recent conversation messages, products and coupons.
- Human escalation via `[ESCALATE]` marker, publishing `EscalationRequested` and pausing AI replies.
- AI settings UI on the store page, RBAC-gated.

## 3. Non-Goals
- Phase 2/3 roadmap items (see `docs/specs/0000-project-overview.md`).
- Real-time/long-polling chat UI (replies are appended to `Conversation` and sent via Meta outbound).

## 4. Public Contract (loose coupling)
- `AIProvider` interface: `complete(messages, config)` — swap models by implementing it.
- `AssistantService` port: `generateReply(conversationId)`.
- `AIConfigurationRepository` port: `getByStore`, `getOrCreateDefault`, `update`.
- Consumes `NewMessage` from `conversations`; emits `ReplyGenerated` and `EscalationRequested`.
- Reads product/coupon data via `ecommerce` queries and customer memory via `crm` queries.

> Other modules interact ONLY through the contract above (application service / port / domain events). No module imports this module's internals. No circular dependencies.

## 5. Data / Persistence
`AIConfiguration` (per store: prompt, tone, strategies, escalation rules, model). All schema changes via Prisma migrations.

## 6. Notes
Prompts + retrieved context are assembled in the application layer; the domain owns the `ReplyGenerated`/`EscalationRequested` events. Outbound delivery is delegated to the `meta` module.

## 7. Acceptance Criteria (Definition of Done)
- [x] Domain modeled (`ReplyGenerated`, `EscalationRequested`).
- [x] `AIProvider` and `AssistantService` ports implemented; OpenAI provider shipped.
- [x] `AIConfigurationRepository` implemented in Prisma.
- [x] `generateReply` use-case assembles context and calls the provider.
- [x] AI subscribers wired to `NewMessage`; replies appended and sent outbound.
- [x] AI settings server action + form on store page.
- [x] Lint + typecheck pass; `CHANGELOG.md` updated.
