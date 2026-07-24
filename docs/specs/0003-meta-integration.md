# Spec 0003: Meta Integration

- **Module(s):** meta (+ event consumers: crm, conversations)
- **Status:** Implemented (Phase 1)
- **Owner:** wasim
- **Related task(s):** docs/tasks/backlog.md (TASK-050)
- **Related ADR(s):** —
- **Last updated:** 2026-07-24

## 1. Summary
Webhook-based integration with Facebook Pages and Instagram Business accounts. The `meta`
module verifies + ingests Meta webhooks, **normalizes** them into domain events, and
publishes them on the shared bus. It **does not** write conversation/customer tables —
`conversations` and `crm` subscribe and own that persistence (loose coupling in action).

## 2. Goals
- Webhook **verification** (GET `hub.challenge`) against a configured verify token.
- Webhook **signature** check (`X-Hub-Signature-256`, HMAC-SHA256 with the app secret).
- Normalize inbound payloads → `MetaMessageReceived`, `MetaFollowReceived`,
  `MetaCommentReceived` (channel = INSTAGRAM | FACEBOOK).
- Map an incoming page/IG account → the owning Store via a `META` `Integration` record.
- Connect a Page/IG account to a store (store page token); `MetaService.sendMessage` adapter
  (Graph API, config-gated).
- A **dev simulator** action so the whole event-driven flow is testable without live Meta.

## 3. Non-Goals
- Full OAuth install/login-with-Facebook flow (accepts an existing page token for now).
- Comment/mention replies, post publishing, Ads — Phase 2/3.

## 4. Public Contract (loose coupling)
`@/modules/meta`:
- Events: `MetaMessageReceived`, `MetaFollowReceived`, `MetaCommentReceived` (+ payload types).
- `verifyWebhookChallenge`, `processMetaWebhook` (normalize + publish), `simulateInbound`.
- `connectMetaAction`, `simulateInboundAction`, `metaQueries.getMetaConnection`.

`@/modules/crm` (owns Customer + Follower): subscribes to `MetaFollowReceived` /
`MetaMessageReceived` → upserts Customer, records Follower. Exposes `crmQueries`
(`listFollowers`, `listCustomers`) + `FirstTimeFollowerDetected` event (for TASK-080).

`@/modules/conversations` (owns Conversation + Message): subscribes to `MetaMessageReceived`
→ upserts the Conversation and appends the CUSTOMER Message. Exposes `conversationQueries`
(`listConversations`, `getConversation`).

> Cross-module only via events + public queries. `meta` never imports crm/conversations
> internals and never writes their tables. No cycles.

## 5. Data / Persistence
- `Integration` (type=META, externalId=page/IG id, accessToken=page token) — owned by `meta`.
- `Customer`, `Follower` — owned by `crm`.
- `Conversation`, `Message` — owned by `conversations`.
- No schema changes required (tables already exist). All changes via Prisma migrations.

## 6. Security
- Verify token + app secret read via validated config; never logged.
- Signature verified before processing; invalid signatures → 401, no side effects.
- Page tokens stored per-store in `Integration`, read only in infrastructure.

## 7. Acceptance Criteria (DoD)
- [x] GET verification returns the challenge only when the token matches.
- [x] POST validates the signature, normalizes events, publishes domain events.
- [x] crm records Customer + Follower; conversations records Conversation + Message — via events.
- [x] Store detail page shows Meta connection, a dev simulator, recent conversations + followers.
- [x] Lint + typecheck + build pass; `CHANGELOG.md` updated.

## 8. Follow-ups
- Real Login-with-Facebook OAuth + page subscription management.
- AI auto-reply (TASK-070) + first-time-follower coupon campaign (TASK-080) subscribe next.
- Signature check + delivery retries hardening; per-page rate limiting.
