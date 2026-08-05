# TASK-0080: Unified Messaging Board

- **Status:** Todo
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0080-unified-messaging-board.md`
- **Tracker:** `docs/trackers/TRACKER-0080-unified-messaging-board.md`
- **Module(s):** messaging (new), ai
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Unified inbox: IG DM + FB Messenger + WhatsApp.
- **Last updated:** 2026-08-05

## 1. Summary

Build unified messaging module: single webhook handler for IG/FB/WhatsApp, channel-specific MessageSender, unified inbox UI, AI auto-reply per channel, human takeover toggle.

## 2. References

- Requirement: `docs/requirements/REQ-0080-unified-messaging-board.md`
- Related files:
  - `src/modules/messaging/` (new module)
  - `src/app/api/webhooks/meta/route.ts`

## 3. Implementation Plan

### Step 1 — Prisma Models
Conversation (projectId, channel, externalThreadId, isAiHandling) and Message (conversationId, direction, senderType, content, externalId).

### Step 2 — Unified Webhook Handler
Single `/api/webhooks/meta` endpoint. HMAC-SHA256 verification. Route by platform: `entry.messaging` (IG/FB) vs `entry.changes.messages` (WhatsApp).

### Step 3 — MessageSender
Channel-specific sending: IG DM, FB Messenger (both via `/me/messages`), WhatsApp (via `/{phone_id}/messages`).

### Step 4 — Message Processing Worker
Find/create conversation → save message → check AI handling flag → load AI config → check channel settings → generate AI reply → send → save outbound message.

### Step 5 — Unified Inbox UI
Conversation list with channel badges (IG/FB/WA), message thread view, human takeover toggle, customer profile sidebar.

### Step 6 — Human Takeover
Toggle flag on conversation → stops AI auto-reply → notifies owner.

## 4. Subtasks

- [ ] T-005: Create Conversation/Message models
- [ ] T-032: Unified webhook handler
- [ ] T-033: MessageSender (channel-specific)
- [ ] T-034: Unified inbox UI
- [ ] T-076: Human takeover toggle
- [ ] T-077: AI reply in conversations

## 5. Acceptance Criteria

- [ ] Matches REQ-0080 acceptance criteria.
- [ ] Lint + typecheck + tests pass.
- [ ] `CHANGELOG.md` updated.

## 6. Notes / Blockers

- WhatsApp Business API requires Meta Business verification.
- WhatsApp conversation-based pricing: ~$0.01-0.06/msg.
