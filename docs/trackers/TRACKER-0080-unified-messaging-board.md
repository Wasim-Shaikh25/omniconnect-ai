# TRACKER-0080: Unified Messaging Board

- **Status:** In Progress
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0080-unified-messaging-board.md`
- **Task:** `docs/tasks/TASK-0080-unified-messaging-board.md`
- **Last updated:** 2026-08-06 (T-075 mobile PWA optimization implemented)

## 1. Summary

Progress tracker for REQ-0080: Unified Messaging Board. The `conversations` module already owns the models, unified inbox UI, human takeover, and IG/FB webhook ingestion. This batch wires channel-specific outbound sending, manual human replies, and AI auto-reply gating; WhatsApp remains deferred.

## 2. Subtasks

### Planning
- [x] Requirement REQ-0080 approved.
- [x] Task file TASK-0080 created/updated.
- [x] Branch created.

### Implementation
- [x] T-005: Create Conversation/Message Prisma models.
- [x] T-032: Unified webhook handler (IG + FB; WhatsApp deferred).
- [x] T-033: MessageSender (channel-specific sending) — IG/FB wired via `MetaService.sendMessage`.
- [x] T-034: Unified inbox UI.
- [x] T-076: Human takeover toggle.
- [x] T-077: AI reply in conversations with channel enable + business-hours gating.
- [x] T-075: Mobile PWA optimization — responsive messaging UI, offline support (P2).
- [ ] T-078: WhatsApp Business API webhook + sender.

### Verification
- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm run test` passes.
- [x] `npm run build` passes.
- [x] `CHANGELOG.md` updated.
- [x] `docs/specs/current-state.md` updated if needed.

## 3. Acceptance Criteria

- [x] All linked requirement acceptance criteria are met.
- [x] All verification steps above pass.

## 4. Notes / Blockers

- WhatsApp Business API requires Meta Business verification and is deferred to a later batch.
