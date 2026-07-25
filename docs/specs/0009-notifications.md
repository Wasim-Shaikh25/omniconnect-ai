# Spec 0009: Notifications

- **Module(s):** notifications
- **Status:** Implemented
- **Owner:** wasim
- **Related task(s):** `docs/tasks/backlog.md` (TASK-100)
- **Related ADR(s):** —
- **Last updated:** 2026-07-25

## 1. Summary
Deliver in-app notifications (and a pluggable email adapter behind a port) for events that require store staff attention: new customer messages, new followers, generated coupons, escalation requests, and conversation status changes. Each user has a private notification feed with an unread badge; notifications can be marked as read.

## 2. Goals
- Create in-app notifications for domain events relevant to staff.
- Show an unread notification badge/count in the global header.
- Provide a `/notifications` page listing notifications with mark-as-read support.
- Keep email delivery behind a `NotificationChannel` adapter interface and stub it for Phase 1.
- Respect tenant boundaries: users only see notifications for their organization.

## 3. Non-Goals
- Real-time push/WebSocket delivery (Phase 2/3).
- Per-user notification preferences/frequency settings (Phase 2).
- Email provider integration beyond a port/stub.
- Phase 2 roadmap items (Meta commerce, analytics, etc.).

## 4. User Stories
- As a Store Owner, I want to see a badge when a new customer message arrives so I can respond quickly.
- As a Staff member, I want to see notifications when a follower joins or a coupon is generated.
- As a Staff member, I want to mark notifications as read so my badge clears.

## 5. Domain Model

### Entities / Aggregates
- `Notification` aggregate: id, userId, storeId?, type (`NotificationType` enum: NEW_MESSAGE, NEW_FOLLOWER, COUPON_GENERATED, ESCALATION, CONVERSATION_TAKEN_OVER, AI_RESUMED, COUPON_USED, SYSTEM_ERROR), channel (`IN_APP` | `EMAIL`), title, body, payload (Json), read (boolean), createdAt.

### Domain Events (notifications publishes)
- `NotificationCreated` (optional) — for any consumer that wants to react to notifications.

## 6. Public Contract (loose coupling)
- `NotificationService` / `NotificationQueries` exposed via the `notifications` public barrel:
  - `notify(input: { storeId; type; title; body; payload? }): Promise<void>` — creates notifications for all users in the organization that owns the store.
  - `listNotifications(userId, limit?): Promise<NotificationRecord[]>`
  - `markAsRead(userId, notificationId): Promise<void>`
  - `getUnreadCount(userId): Promise<number>`
- Other modules **MUST NOT** import notification internals; they either emit domain events that the notifications module subscribes to, or call `notify` through the barrel.

## 7. Data / Persistence
- Existing `Notification` Prisma model is extended with `storeId`, `title`, `body`, and `payload` optional.
- Index on `[userId, read, createdAt]` for fast unread + list queries.
- Prisma migration `20260725100603_notifications`.

## 8. API / UI Surface
- Server actions (presentation):
  - `listNotificationsAction()` — returns the current user's notifications.
  - `markNotificationAsReadAction(notificationId)` — sets `read = true`.
  - `getUnreadNotificationCountAction()` — returns unread count.
- Page `/notifications` with a list and a "Mark as read" button per row.
- Header: unread notification count badge next to a "Notifications" link in the dashboard/store layout.

## 9. External Integrations
- `EmailChannel` adapter stub (no-op in dev) behind `NotificationChannel` interface.
- Meta/Shopify/OpenAI events feed notifications through the internal event bus.

## 10. Edge Cases & Failure Modes
- If a store has no organization or no users, `notify` logs a warning and no-ops.
- Duplicate event deliveries are possible; notifications are idempotent by event nature (each event creates a new row).
- Mark-as-read for another user's notification is rejected by tenant check (userId match).
- Email adapter failure must not crash the in-app notification creation.

## 11. Security & Privacy
- RBAC: any authenticated user can view their own notifications and mark them read.
- Tenant isolation: notifications are scoped by `userId`; creation resolves organization users from `storeId`.
- PII: `payload` may contain conversation/external ids; never store secrets.

## 12. Testing Strategy
- Unit test: notification creation and unread count.
- Integration test: `NewMessage` event → notification rows created for org users.
- E2E: simulate a message, open `/notifications`, verify unread badge and mark as read.

## 13. Acceptance Criteria (Definition of Done)
- [ ] `NotificationRepository` and `NotificationService`/`NotificationQueries` implemented.
- [ ] Subscribers wired for `NewMessage`, `FirstTimeFollowerDetected`, `CouponGenerated`, `EscalationRequested`, `ConversationTakenOver`, `AIResumed`.
- [ ] Server actions `listNotificationsAction`, `markNotificationAsReadAction`, `getUnreadNotificationCountAction` exposed and RBAC-gated.
- [ ] `/notifications` page implemented with unread badge support.
- [ ] Header shows unread count badge.
- [ ] Lint + typecheck + build pass; `CHANGELOG.md` and `docs/tasks/backlog.md` updated.

## 14. Open Questions
1. Should we de-duplicate rapid events of the same type for the same conversation/follower within a short window?
2. Should email delivery attempt be backgrounded via a queue (BullMQ) or kept synchronous for Phase 1?
