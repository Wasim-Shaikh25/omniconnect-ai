# Spec 0008: Human Takeover

- **Module(s):** conversations
- **Status:** Draft
- **Owner:** wasim
- **Related task(s):** docs/tasks/backlog.md
- **Related ADR(s):** —
- **Last updated:** 2026-07-24

## 1. Summary
Store owner/staff can take over a conversation, disabling the AI for it, and resume AI later. Conversation status toggles between AI Active and Human Active; all logs are preserved.

## 2. Goals
- Take over a conversation (disable AI per conversation)
- Resume AI later
- Status: AI Active / Human Active
- Preserve full conversation logs

## 3. Non-Goals
- Anything listed under Phase 2/3 in the Future Roadmap (see `docs/specs/0000-project-overview.md`).

## 4. Public Contract (loose coupling)
- `ConversationService` port: `takeOver(conversationId)`, `resumeAI(conversationId)`, `getStatus`.
- Emits `ConversationTakenOver`, `AIResumed`; `ai` module checks status before replying (via port).

> Other modules interact ONLY through the contract above (application service / port /
> domain events). No module imports this module's internals. No circular dependencies.

## 5. Data / Persistence
`Conversations` (status, assignedHumanId), `Messages`. Ownership: `conversations`.
All schema changes via Prisma migrations.

## 6. Notes
AI assistant must consult conversation status through the port before generating replies.

## 7. Acceptance Criteria (Definition of Done)
- [ ] Domain modeled (entities, events) with pure unit tests.
- [ ] Application services/ports implemented and exposed via the module's public barrel.
- [ ] Infrastructure adapters/repositories implemented (Prisma, external APIs).
- [ ] Presentation (routes/UI) wired where applicable, with RBAC.
- [ ] Lint + typecheck + tests pass; `CHANGELOG.md` updated.

> This is an initial stub. Expand using `_TEMPLATE.md` before implementation begins.
