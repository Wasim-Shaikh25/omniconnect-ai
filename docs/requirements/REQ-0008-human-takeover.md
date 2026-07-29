---
description: Human Takeover
---

# REQ-0008: Human Takeover

- **Status:** Implemented
- **Owner:** wasim
- **Module(s):** conversations, ai
- **Original spec path:** `docs/specs/0008-human-takeover.md` (restructured)
- **Task:** `docs/tasks/TASK-0008-human-takeover.md`
- **Tracker:** `docs/trackers/TRACKER-0008-human-takeover.md`
- **Last updated:** 2026-07-29

> This file was migrated from `docs/specs/0008-human-takeover.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


- **Module(s):** conversations, ai
- **Status:** Implemented
- **Owner:** wasim
- **Related task(s):** `docs/tasks/backlog.md` (TASK-090)
- **Related ADR(s):** —
- **Last updated:** 2026-07-25

## 1. Summary
Allow a store owner or staff member to manually take over an AI-driven conversation (pauses the AI) and later hand it back. While a conversation is in `HUMAN_ACTIVE` status, the AI must not auto-reply to new customer messages. Conversation history is preserved unchanged; the status change is audit-logged in the `Messages` table via a system note.

## 2. Goals
- Staff can view a list of conversations for a store.
- Staff can take over a conversation (status becomes `HUMAN_ACTIVE`, `assignedHumanId` set).
- Staff can resume AI (status becomes `AI_ACTIVE`, `assignedHumanId` cleared).
- AI `generateReply` checks conversation status and only replies when `AI_ACTIVE`.
- Preserve full conversation logs and show the current status/takeover state in the UI.

## 3. Non-Goals
- Real-time collaborative chat between multiple staff members.
- Assigning a specific staff member other than the current user.
- Phase 2/3 roadmap items (analytics, notifications, meta commerce, etc.).

## 4. User Stories
- As a Store Owner, I want to pause AI replies when a customer has a complex issue so I can chat directly.
- As a Staff member, I want to hand the conversation back to AI once the issue is resolved.
- As a Store Owner, I want to see which conversations are currently under human control so I can manage workload.

## 5. Domain Model

### Entities / Aggregates
- `Conversation` aggregate: id, storeId, channel, externalId, status (`AI_ACTIVE` | `HUMAN_ACTIVE`), `assignedHumanId` (nullable), createdAt, updatedAt.
- `Message` entity: conversationId, sender (`CUSTOMER` | `AI` | `HUMAN`), content, createdAt.
- `HumanAgent` (read-only user reference): current user id/name from auth session; not owned by this module.

### Domain Events
- `ConversationTakenOver` (conversations publishes): payload `{ conversationId, storeId, humanUserId }`.
- `AIResumed` (conversations publishes): payload `{ conversationId, storeId }`.

## 6. Public Contract (loose coupling)
- `ConversationService` port exposed via the `conversations` public barrel:
  - `takeOver(input: { conversationId; humanUserId }): Promise<ConversationRecord>`
  - `resumeAI(input: { conversationId }): Promise<ConversationRecord>`
- `ConversationQueries` already exposes `listConversations(storeId, limit?)` and `getConversation(id)`.
- `AI` module (generateReply) asks the conversation port for the conversation status before generating a reply. It will skip auto-reply for `HUMAN_ACTIVE` conversations.
- No other module may import `conversations` internals; only the public barrel and the events above.

## 7. Data / Persistence
- Prisma `Conversation` model already has `status` and `assignedHumanId` fields.
- Add a Prisma migration only if new fields are required; currently the model supports the feature.
- Optional: add a `HUMAN` message with content `"Agent took over the conversation."` / `"AI resumed."` to the `Message` table for audit.

## 8. API / UI Surface
- New page `/stores/[storeId]/conversations` listing conversations with status, external id, channel, and action buttons.
- Server actions:
  - `takeOverConversationAction(storeId, conversationId)` — RBAC `STORE_OWNER`/`ADMIN`/`STAFF`.
  - `resumeAIConversationAction(storeId, conversationId)` — same RBAC.
- New page `/stores/[storeId]/conversations/[conversationId]` (or inline detail) showing messages and takeover/resume controls.
- Store detail page gets a "View conversations" link/card.
- `Meta` dev simulator remains on the store page but does not need changes.

## 9. External Integrations
- Meta outbound send (`metaService.sendMessage`) is paused for `HUMAN_ACTIVE` conversations; no additional API calls.
- AI provider (`OpenAIProvider`) still called for `AI_ACTIVE` conversations only.

## 10. Edge Cases & Failure Modes
- Taking over an already `HUMAN_ACTIVE` conversation is idempotent.
- Resuming an already `AI_ACTIVE` conversation is idempotent.
- Unknown conversation id → 404 / not found error.
- Staff without `STAFF`, `STORE_OWNER`, or `ADMIN` role is forbidden.
- If the AI is mid-generation when a takeover happens, the race is bounded by the status check at the start of `generateReply`.

## 11. Security & Privacy
- RBAC: any authenticated user with `STAFF`, `STORE_OWNER`, or `ADMIN` role can manage conversations for their organization’s stores.
- Tenant check: the conversation must belong to a store in the current user’s organization.
- `assignedHumanId` is the current session user id; no arbitrary user ids accepted from clients.

## 12. Testing Strategy
- Unit test: status toggle logic and idempotency.
- Integration test: `takeOver` → `AIResumed` → `generateReply` does not produce a reply while `HUMAN_ACTIVE`.
- E2E: open conversations page, simulate a message, take over, send another message, verify AI does not auto-reply, resume AI.

## 13. Acceptance Criteria (Definition of Done)
- [ ] `ConversationService` port and `takeOver`/`resumeAI` use-cases implemented.
- [ ] `generateReply` checks status and skips `HUMAN_ACTIVE` conversations.
- [ ] Server actions `takeOverConversationAction` and `resumeAIConversationAction` exposed and RBAC-gated.
- [ ] Conversations list page `/stores/[storeId]/conversations` implemented with status and actions.
- [ ] Store detail page links to conversations list.
- [ ] Dev simulator can exercise a message, takeover, and resume flow.
- [ ] Lint + typecheck + build pass; `CHANGELOG.md` and `docs/tasks/backlog.md` updated.

## 14. Open Questions
1. Should the message detail page support sending a manual staff reply now, or only after TASK-100 Notifications?
2. Should we emit a notification event when a conversation is taken over?
