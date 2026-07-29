---
description: First-Time Follower Campaign
---

# REQ-0005: First-Time Follower Campaign

- **Status:** Implemented
- **Owner:** wasim
- **Module(s):** crm, coupons, ai, meta, notifications
- **Original spec path:** `docs/specs/0005-first-time-follower-campaign.md` (restructured)
- **Task:** `docs/tasks/TASK-0005-first-time-follower-campaign.md`
- **Tracker:** `docs/trackers/TRACKER-0005-first-time-follower-campaign.md`
- **Last updated:** 2026-07-29

> This file was migrated from `docs/specs/0005-first-time-follower-campaign.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


- **Module(s):** crm, coupons, ai, meta, notifications
- **Status:** Implemented
- **Owner:** wasim
- **Related task(s):** `docs/tasks/backlog.md` (TASK-080)
- **Related ADR(s):** —
- **Last updated:** 2026-07-25

## 1. Summary
An event-driven workflow that welcomes a first-time Instagram/Facebook follower with a personalized discount coupon and an AI-generated welcome message. The campaign is configurable per store (discount %, expiration, message template, eligibility rules) and orchestrated entirely through domain events so `crm`, `coupons`, `ai`, and `meta` remain loosely coupled.

## 2. Goals
- Detect a new follower from the `NewFollow`/`MetaFollowReceived` event.
- Determine if the follower has never interacted with the store before (no `Customer` and no `Follower` record).
- If eligible, generate a single-use, personalized coupon (e.g. username-based code, 10% off, 7-day expiry).
- Compose an AI welcome message that includes the coupon code and store tone.
- Send the welcome message via the `meta` outbound adapter.
- Persist a `Campaign` record and `Coupon`/`CouponUsage`/`Message` audit trail.
- Provide a campaign settings UI on the store page.

## 3. Non-Goals
- Re-engagement campaigns for existing followers (Phase 2).
- Multi-step nurture sequences.
- Advanced segmentation beyond first-interaction check.
- Any feature listed in Phase 2/3 of `docs/requirements/REQ-0000-project-overview.md`.

## 4. User Stories
- As a Store Owner, I want to automatically welcome new followers with a discount so they make a first purchase.
- As a Store Owner, I want to configure the discount percentage and coupon expiry so the offer fits my margins.
- As a Store Owner, I want the welcome message to match my brand voice so it feels personal.
- As a Store Owner, I want to see how many coupons were sent and used so I can measure the campaign.

## 5. Domain Model

### Entities / Aggregates
- `FirstTimeFollowerCampaign` (per-store config): enabled, discountPct, expiryDays, messageTemplate, toneOverride.
- `Follower` (crm): externalUserId, storeId, platform, username, firstDetectedAt, campaignEnrolledAt, couponId.
- `Coupon` (ecommerce): code, storeId, customerId, discountPct, status, expiresAt.
- `CampaignDispatch` (campaigns): id, storeId, followerId, couponId, messageText, status SENT|FAILED|REDEEMED, sentAt.

### Domain Events
- `FirstTimeFollowerDetected` (crm publishes) — payload: storeId, externalUserId, username, platform, followerId.
- `WelcomeCouponGenerated` (coupons publishes) — payload: storeId, externalUserId, couponId, code, discountPct, expiresAt.
- `WelcomeMessageSent` (meta/ai publishes) — payload: storeId, externalUserId, couponId, messageText.
- `CouponRedeemed` (ecommerce publishes) — payload: storeId, couponId, orderId, customerId.

## 6. Public Contract (loose coupling)
- `FirstTimeFollowerCampaignService` port:
  - `isEligible(storeId, externalUserId)`
  - `enroll(storeId, externalUserId, username)`
  - `getConfig(storeId)`
  - `updateConfig(storeId, input)`
- `CampaignDispatcher` port (campaigns module): handles `FirstTimeFollowerDetected` and orchestrates coupon generation + AI message + outbound send.
- Consumes: `FirstTimeFollowerDetected` from `crm`; `CouponRedeemed` for analytics.
- Emits: `WelcomeCouponGenerated`, `WelcomeMessageSent`.

> No module imports another module's internals. `crm` only knows followers; `coupons` only knows coupons; `ai` generates text; `meta` sends messages.

## 7. Data / Persistence
- `FirstTimeFollowerCampaign` table (id, storeId, enabled, discountPct, expiryDays, messageTemplate, toneOverride, createdAt, updatedAt).
- `Follower` table already exists in `crm`; add `couponId` and `campaignEnrolledAt` columns.
- `Coupon` table already exists; `customerId` links to `Customer` (nullable until a CRM record is created or the coupon is used).
- `CampaignDispatch` table (id, storeId, followerId, couponId, messageText, status, error, sentAt, createdAt).
- Unique index on `(storeId, externalUserId)` in `Follower` to prevent duplicate first-follower triggers.

## 8. API / UI Surface
- `/stores/[storeId]/campaigns/first-follower` — campaign settings form.
- Server action: `updateFirstTimeFollowerCampaign(storeId, input)`.
- Server action: `getFirstTimeFollowerCampaign(storeId)`.
- The dev simulator on `/stores/[storeId]` gets a "Simulate new follower" button that triggers the end-to-end flow and shows the generated coupon + message.

## 9. External Integrations
- **Meta Graph API** to send the welcome DM (`POST /me/messages` or Instagram Messaging API equivalent). Requires user-initiated conversation or an approved `ACCOUNT_UPDATE`/`POST_PURCHASE_UPDATE` message tag. For a follow event, the follower has not messaged the page yet, so a comment reply or Messenger "Get Started" may be needed. In the first version we send the welcome message via the existing `metaService.sendMessage` and document the 24h window limitation; the dev simulator bypasses the real API and logs the message.
- **AI Provider** (`ai` module) for composing the welcome copy from the template + coupon + store tone.
- **Coupon Generator** (`ecommerce` module) for creating the personalized coupon.

## 10. Edge Cases & Failure Modes
- Follower already exists → no coupon, no message (idempotent).
- Campaign disabled for the store → no action.
- AI provider unavailable → use a static fallback message with the coupon code.
- Meta send fails (e.g., 24h window, invalid token) → dispatch status `FAILED`, retry later if possible.
- Coupon generation fails → log error, no message sent.
- Username contains invalid characters for a coupon code → sanitize (uppercase, alphanum, fallback to random suffix).

## 11. Security & Privacy
- Store-scoped campaign settings; RBAC-gated.
- No PII beyond username/external id stored in `Follower`.
- Coupon codes are not logged in plaintext outside the database.

## 12. Testing Strategy
- Unit tests for `isEligible` and coupon code sanitization.
- Integration test for the event chain `FirstTimeFollowerDetected` → `WelcomeCouponGenerated` → `WelcomeMessageSent` with mocked `meta` and `ai` adapters.
- UI test for the campaign settings form and simulator.

## 13. Acceptance Criteria (Definition of Done)
- [ ] Domain modeled (`FirstTimeFollowerCampaign`, `CampaignDispatch`) and events defined.
- [ ] `FirstTimeFollowerCampaignService` port and Prisma repository implemented.
- [ ] Campaign dispatcher subscribes to `FirstTimeFollowerDetected`, generates coupon, AI message, and outbound send.
- [ ] UI page for campaign settings on `/stores/[storeId]/campaigns/first-follower`.
- [ ] Dev simulator supports "Simulate new follower" and shows result.
- [ ] Lint + typecheck + tests pass; `CHANGELOG.md` and `docs/tasks/backlog.md` updated.

## 14. Open Questions
1. Should the welcome message be sent as a DM immediately after follow, or only when the follower sends the first message? Meta's 24h rule may prevent the former.
2. Should the coupon be a fixed code per store or personalized per follower?
3. Do we track coupon redemptions at Shopify checkout or via a manual `redeemCoupon` action?
