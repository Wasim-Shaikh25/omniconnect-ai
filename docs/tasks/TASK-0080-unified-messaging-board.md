# TASK-0080: Unified Messaging Board

- **Status:** In Progress
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0080-unified-messaging-board.md`
- **Tracker:** `docs/trackers/TRACKER-0080-unified-messaging-board.md`
- **Module(s):** conversations, meta, ai
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Unified inbox: IG DM + FB Messenger + WhatsApp.
- **Last updated:** 2026-08-06 (T-075 mobile PWA optimization in progress)

## 1. Summary

The unified messaging capability lives in the existing `conversations` module (conversation/message persistence, unified inbox UI, and human takeover already scaffolded). This task finishes the pieces that are still missing: channel-specific outbound `MessageSender` for manual (and AI) replies, AI auto-reply gating by channel enable/disable + business hours, and the remaining webhook/WhatsApp coverage.

## 2. References

- Requirement: `docs/requirements/REQ-0080-unified-messaging-board.md`
- Related files:
  - `src/modules/conversations/`
  - `src/modules/meta/`
  - `src/modules/ai/application/generate-reply.ts`
  - `src/app/stores/[projectId]/conversations/[conversationId]/page.tsx`

## 3. Implementation Plan

### Step 1 — Manual reply from conversation detail
- Add `sendMessage` use-case in `conversations/application/send-message.ts` that appends a `HUMAN` message and, for `INSTAGRAM`/`FACEBOOK` channels, routes the outbound text through `MetaService.sendMessage`.
- Wire it in `conversations/infrastructure/container.ts` using `metaService` from `@/modules/meta/server`.
- Add `sendConversationMessageAction` in `conversations/presentation/actions.ts` with tenant-guard + validation.
- Add `ConversationMessageForm` component and render it on the conversation detail page.

### Step 2 — AI reply channel gating
- In `ai/application/generate-reply.ts`, after loading `AIConfiguration`, skip the AI reply when the conversation's channel is disabled in `channelSettings` or outside the configured `businessHoursStart..businessHoursEnd`.
- When disabled/out-of-hours, return `{ text: "", escalate: false }` so no message is sent; the human can reply later.

### Step 3 — Mobile PWA optimization for messaging UI (T-075)
- Add `OnlineStatus` client component that surfaces an offline alert using `navigator.onLine`.
- Make the conversation list (`/stores/[projectId]/conversations`) and detail page
  (`/stores/[projectId]/conversations/[conversationId]`) mobile-first: stacked
  list items, full-width action buttons, and a responsive message feed.

### Step 4 — Remaining webhook/WhatsApp work (future batch)
- WhatsApp webhook routing and channel-specific sender variants are deferred until Meta Business verification details are available.

## 4. Subtasks

- [x] T-005: Create Conversation/Message Prisma models.
- [x] T-032: Unified webhook handler (IG + FB; WhatsApp deferred).
- [x] T-033: MessageSender (channel-specific) — IG/FB manual + AI replies.
- [x] T-034: Unified inbox UI.
- [x] T-076: Human takeover toggle.
- [x] T-077: AI reply in conversations with channel enable + business-hours gating.
- [x] T-075: Mobile PWA optimization — responsive messaging UI, offline support (P2).
- [ ] T-078: WhatsApp Business API webhook + sender (deferred to later batch).

## 5. Acceptance Criteria

- [x] Manual reply form appends a `HUMAN` message and calls `MetaService.sendMessage` for IG/FB.
- [x] AI auto-reply respects `AIConfiguration.channelSettings` enable flag and business hours.
- [x] Tenant access is enforced for `sendConversationMessageAction`.
- [x] Matches remaining REQ-0080 acceptance criteria (WhatsApp deferred).
- [x] Lint + typecheck + tests pass.
- [x] `CHANGELOG.md` updated.

## 6. Notes / Blockers

- WhatsApp Business API requires Meta Business verification; the sender contract is in place but the WhatsApp route is not wired yet.
- `MetaService.sendMessage` is config-gated and no-ops when no page token is connected, so manual/AI replies are safe to exercise in dev.
