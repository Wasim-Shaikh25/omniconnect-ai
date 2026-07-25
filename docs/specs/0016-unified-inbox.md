# Spec 0016: Unified Inbox (Global Conversation Triage)

- **Module(s):** conversations, crm, organizations
- **Status:** In Progress
- **Owner:** wasim
- **Related task(s):** `docs/tasks/backlog.md` (TASK-190)
- **Related ADR(s):** —
- **Last updated:** 2026-07-25

## 1. Summary
Deliver a workspace-scoped Unified Inbox (`/inbox`) that aggregates customer conversations across all stores, surfaces the latest message per thread, supports channel/status/search filters, and lets staff take over or resume AI for any conversation.

## 2. Goals
- Give support/sales teams a single view of all active conversations.
- Prioritize threads needing attention (customer reply, not human-handled).
- Provide one-click takeover/resume and a link to the full thread.

## 3. Non-Goals
- Real-time websocket updates.
- Bulk selection / bulk actions.
- Multi-workspace aggregation.

## 4. User Stories
- As a Store Owner, I want to see every conversation across my stores so I can triage quickly.
- As a Manager, I want to filter by AI/HUMAN status so I know which threads need my attention.
- As Support Staff, I want to take over a conversation from the inbox and reply on the detail page.

## 5. Domain Model
- `InboxItem` (read-only view):
  - conversationId, storeId, storeName, channel, status
  - participantName, customerId, externalId
  - lastMessage: `{ content, sender, createdAt }`
  - unread: boolean
  - updatedAt
- `UnifiedInboxFilter`: optional channel, status, search string.

## 6. Public Contract
- `conversationQueries.getUnifiedInbox(organizationId, userId, filter?)` returns `InboxItem[]`.
- `takeOverConversationAction` and `resumeAIConversationAction` work from `/inbox` and revalidate it.

## 7. Data / Persistence
- No new tables. Aggregates `Conversation`, `Message`, `Customer`, and `Store` records.
- Tenant-scoped by `organizationId`.

## 8. API / UI Surface
- `/inbox` — server-rendered inbox list.
  - Filter bar: channel (All/Instagram/Facebook), status (All/AI/HUMAN), search.
  - List rows: participant, store, last message preview, channel badge, status, timestamp, action buttons.
  - Empty state when no conversations.
- Global nav (`AppHeader`) includes **Inbox** link for signed-in users.

## 9. External Integrations
- None new.

## 10. Edge Cases & Failure Modes
- No stores → empty state with link to create a store.
- No conversations → empty state.
- Search with no matches → empty state.
- Permission denied → redirect to login.

## 11. Security & Privacy
- Only conversations from the user's `organizationId` are returned.
- Server actions verify store ownership before takeover/resume.

## 12. Testing Strategy
- Unit: filtering and participant-name lookup logic.
- Integration: create multiple store conversations, verify inbox aggregation and status filter.
- UI: filter interactions and empty states.

## 13. Acceptance Criteria (Definition of Done)
- [x] Spec created and linked to backlog.
- [x] `/inbox` renders all organization conversations with latest message.
- [x] Channel, status, and search filters work.
- [x] Takeover/resume actions update status and revalidate inbox.
- [x] Lint + typecheck + build pass.
- [x] CHANGELOG.md and backlog updated.

## 14. Open Questions
1. Should unread count be a separate badge/persisted per user?
2. Should the inbox support assignment to specific staff members?
