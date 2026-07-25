# Spec 0012: Meta Commerce & Engagement Automation (Phase 2)

- **Module(s):** ecommerce, meta, crm, ai, notifications, commerce, social, growth
- **Status:** Implemented
- **Owner:** wasim
- **Related task(s):** `docs/tasks/backlog.md` (TASK-130)
- **Related ADR(s):** —
- **Last updated:** 2026-07-25

## 1. Summary
Extends OmniConnect from AI-driven replies and analytics into full social commerce automation on Meta. Covers Instagram Shop product catalog sync and product tagging, AI-powered comment/mention/DM engagement, Meta Lead Ads capture and nurturing, UGC collection and ambassador referrals, and conversational commerce (abandoned cart, back-in-stock, order tracking) via Instagram/Messenger DMs.

## 2. Goals
- **Instagram Shop & shoppable content:** sync Shopify products to a Meta catalog, tag products in posts/Reels, and surface shoppable content.
- **Engagement automation:** moderate, auto-reply, and route comments/mentions/story replies into DMs with AI-generated responses.
- **Lead generation:** capture leads from Meta Lead Ads and DM/comment opt-ins; score and nurture with AI.
- **UGC & advocacy:** detect brand @mentions, tags, and branded hashtags; request usage rights; curate a UGC gallery; run ambassador/referral programs.
- **Conversational commerce:** send order updates, abandoned-cart reminders, back-in-stock alerts, and review requests via DMs within Meta's messaging rules.
- **Follower lifecycle:** welcome DMs, follow-back workflows, segmented re-engagement campaigns.

## 3. Non-Goals
- Creating or managing Meta Ads campaigns (campaign setup, bidding, budget) — Phase 3.
- Automated visual/video generation (AI text and storyboards only).
- WhatsApp/Telegram multi-channel automation (Phase 2/3).
- Outbound marketing DMs that violate Meta's user-initiated conversation rules.
- Full checkout/order placement inside Instagram where not supported by region/account.

## 4. User Stories
- As a Store Owner, I want my Shopify catalog mirrored to Instagram Shop so customers can buy without leaving the app.
- As a Marketer, I want product tags suggested by AI when I create a Reel or post.
- As a Community Manager, I want spam and toxic comments auto-hidden and common questions auto-replied.
- As a Sales Rep, I want a customer who comments "how do I buy?" to receive a DM with a product link and discount.
- As a Marketer, I want leads from Instagram Lead Ads to appear in my CRM and be nurtured by AI.
- As a Brand, I want to collect and request rights for posts where customers tag us, then feature them in a UGC gallery.
- As a Creator, I want a unique referral code so I can earn commission on sales I drive.
- As a Customer, I want to receive an order-shipping update and back-in-stock alert via DM.

## 5. Domain Model

### Aggregates / Entities
- `MetaCatalogSync` — store-level catalog sync job and status.
- `MetaProductMapping` — maps an internal `Product` to a Meta catalog product.
- `ShoppableMedia` — a post/reel/story with AI-suggested or manually placed product tags.
- `SocialComment` — a comment on owned media (text, author, intent, sentiment, moderation flags, reply status).
- `SocialMention` — an @mention or tag of the brand on public media by another user.
- `SocialLead` — a lead captured from Lead Ads, DMs, or comments.
- `UgcAsset` — collected UGC media with creator, source, caption, rights status, and approval flag.
- `Ambassador` — a customer/creator enrolled in a referral program with a unique code.
- `ReferralOrder` — a Shopify order attributed to an ambassador code.
- `DmCampaign` — an outbound DM campaign (welcome, abandoned cart, back-in-stock, review request).
- `BackInStockSubscription` — a customer waiting for a restock.

### Domain Events
- `CatalogSynced`, `ProductTaggedOnMedia`
- `CommentReceived`, `CommentReplied`, `CommentHidden`
- `MentionReceived`, `MentionReplied`
- `LeadCaptured`, `LeadNurtured`
- `UgcMentionDetected`, `UgcRightsRequested`, `UgcRightsApproved`
- `AmbassadorEnrolled`, `ReferralConverted`
- `CartAbandoned`, `BackInStockAlertSent`, `OrderUpdatedDmSent`, `ReviewRequested`

## 6. Public Contract (loose coupling)
- `CommerceAutomationService` port:
  - `syncProductCatalog(storeId)`
  - `createShoppableMedia(storeId, input)`
  - `updateProductTags(storeId, mediaId, tags)`
- `EngagementAutomationService` port:
  - `handleComment(storeId, comment)`
  - `handleMention(storeId, mention)`
  - `handleStoryReply(storeId, reply)`
  - `sendWelcomeDm(storeId, externalUserId)`
  - `sendCampaignDm(storeId, campaignId)`
- `LeadManagementService` port:
  - `captureLead(storeId, source, payload)`
  - `scoreAndNurtureLead(storeId, leadId)`
- `UgcService` port:
  - `collectMentions(storeId, since)`
  - `requestRights(storeId, assetId)`
  - `approveAsset(storeId, assetId)`
- `AmbassadorService` port:
  - `enrollAmbassador(storeId, customerId, terms)`
  - `trackReferral(storeId, orderId, code)`
- `ConversationalCommerceService` port:
  - `sendAbandonedCartDm(storeId, cartId)`
  - `sendBackInStockDm(storeId, productId)`
  - `sendOrderUpdateDm(storeId, orderId, status)`
  - `requestReviewDm(storeId, orderId)`

> Other modules interact ONLY through these ports. The `meta` module owns outbound adapters; the `ecommerce` module owns product/order data; `ai` provides classification/generation; `crm` owns `Customer` and `Follower`; `notifications` dispatches cross-channel alerts.

## 7. Data / Persistence
- `MetaCatalogSync` (id, storeId, externalCatalogId, status, lastSyncedAt, errorLog, createdAt).
- `MetaProductMapping` (id, storeId, productId, externalProductId, externalCatalogId, status, lastPushedAt).
- `ShoppableMedia` (id, storeId, externalMediaId, mediaType, caption, permalink, productTags JSON, status, createdAt).
- `SocialComment` (id, storeId, externalMediaId, externalCommentId, parentId, externalUserId, text, intent, sentiment, autoReplyText, repliedAt, hidden, deleted, createdAt).
- `SocialMention` (id, storeId, externalMediaId, externalUserId, handle, mediaUrl, source MENTION|TAG|HASHTAG, caption, hashtags[], createdAt).
- `SocialLead` (id, storeId, source LEAD_ADS|DM|COMMENT, externalFormId, externalLeadId, payload JSON, mappedFields JSON, status, score, customerId, assignedTo, createdAt, nurturedAt).
- `UgcAsset` (id, storeId, socialMentionId, creatorHandle, mediaUrl, mediaType, source, caption, rightsStatus PENDING|REQUESTED|APPROVED|DECLINED, approvedBy, approvedAt, createdAt).
- `Ambassador` (id, storeId, customerId, code, discountPct, commissionPct, status, totalReferrals, totalEarnings, createdAt).
- `ReferralOrder` (id, storeId, ambassadorId, orderId, orderAmount, commissionAmount, status PENDING|APPROVED|PAID, paidAt, createdAt).
- `DmCampaign` (id, storeId, campaignType WELCOME|ABANDONED_CART|BACK_IN_STOCK|REVIEW|RE_ENGAGE, audienceCriteria JSON, status, scheduledAt, sentAt, metrics JSON, createdAt).
- `BackInStockSubscription` (id, storeId, productId, externalUserId, customerId, createdAt, notifiedAt).

Indexes: all `storeId` foreign keys plus `external*` IDs for idempotency.

## 8. API / UI Surface
- `/commerce/catalog` — sync status, product mappings, last errors.
- `/commerce/shoppable-media` — create/view shoppable posts/Reels and AI tag suggestions.
- `/commerce/comments` — comment inbox, moderation queue, auto-reply rules.
- `/commerce/mentions` — brand @mentions and tags feed.
- `/commerce/leads` — lead list, scoring, AI nurture history.
- `/commerce/ugc` — UGC gallery, rights requests, approval workflow.
- `/commerce/ambassadors` — enroll, codes, referral sales, payout status.
- `/commerce/campaigns` — DM campaign templates (welcome, abandoned cart, back-in-stock, review request).
- Server actions: `syncMetaCatalog`, `tagProductsOnMedia`, `moderateComment`, `replyToComment`, `captureLead`, `collectUgc`, `requestUgcRights`, `enrollAmbassador`, `createDmCampaign`, `triggerAbandonedCart`.
- RBAC: Store Owner/Admin/Staff, scoped by tenant.

## 9. External Integrations

### Meta Commerce API
- Catalog create/update (`/{business-id}/owned_product_catalogs` or `/catalog` feed).
- Product CRUD (`/{catalog-id}/products` or `/batch` API).
- Product tagging on media (`POST /{ig-user-id}/media` with `product_tags`, then `/media_publish`).
- Permissions: `catalog_management`, `instagram_shopping_tag_products`, `instagram_basic`, `pages_read_engagement`.

### Meta Comment Moderation API
- `GET /{media-id}/comments`, `POST /{comment-id}/replies`, `POST /{comment-id}` (hide/unhide), `DELETE /{comment-id}`.
- Webhooks: `comments`, `live_comments`.
- Permissions: `instagram_manage_comments`, `instagram_basic`, `pages_read_engagement`.

### Meta Mentions API
- `GET /{ig-user-id}?fields=mentioned_comment,mentioned_media`.
- `POST /{ig-user-id}/mentions?media_id=...&message=...`.
- Webhooks: `mentions` field.
- Permissions: `instagram_basic`, `instagram_manage_comments`, `pages_read_engagement`.

### Meta Lead Ads & Webhooks
- Webhook subscription to `leadgen` on the connected Page.
- `GET /{lead-id}` and `GET /{form-id}/leads` for retrieval.
- Permissions: `leads_retrieval`, `ads_management`, `pages_manage_metadata`, `pages_read_engagement`.

### Instagram Messaging / Messenger Platform
- Send DM replies, order updates, and template messages.
- Must respect 24-hour user-initiated conversation window; use approved message tags (`ACCOUNT_UPDATE`, `POST_PURCHASE_UPDATE`, `CONFIRMED_EVENT_UPDATE`) outside the window.
- Permissions: `instagram_basic`, `instagram_manage_messages` / `pages_messaging`.

### Shopify Connector (existing)
- Product sync to Meta catalog, order webhooks for referral tracking, abandoned cart detection, shipping/fulfillment events.

### AI Provider (existing)
- Intent/sentiment classification for comments and DMs.
- Auto-reply and DM copy generation.
- Lead scoring rationale and nurture sequences.
- Product tag and shoppable caption suggestions.

## 10. Edge Cases & Failure Modes
- Product removed from Shopify after catalog push → soft-disable mapping; do not delete in Meta catalog immediately to preserve historical tags.
- High comment volume → queue in BullMQ; apply per-token rate limits and backoff.
- DM 24h window expired → fall back to a visible comment reply or queue for human agent unless a message tag applies.
- Customer opts out / says "stop" → record preference and suppress future DM campaigns.
- Lead form fields differ per ad → store raw payload plus a per-store field mapping config; allow manual mapping UI.
- UGC creator denies rights → mark `DECLINED` and exclude from gallery; do not repost.
- Ambassador code collision → unique `@@unique([storeId, code])` constraint.
- Meta rejects a product tag (e.g., unsupported category) → surface error in UI with reason.

## 11. Security & Privacy
- Meta tokens live only in the `Integration` table and are accessed by the `meta` infrastructure layer.
- Lead payload PII stored encrypted at rest; log only masked identifiers.
- DM campaigns require opt-in evidence; store consent timestamp and source.
- Comment/DM content logged for moderation but not used for unrelated marketing without consent.
- Rate-limit all outbound Meta calls per store to avoid token suspension.

## 12. Testing Strategy
- Mock Graph API batch/catalog/comment/lead/messaging endpoints for unit tests.
- Contract tests for `MetaCommerceClient`, `MetaCommentClient`, `MetaLeadClient`, `MetaMessagingClient`.
- Integration tests for Shopify order → referral commission attribution.
- UI tests for comment moderation queue, UGC rights flow, and campaign creation.

## 13. Acceptance Criteria (Definition of Done)
- [x] Domain modeled (entities + events) and exposed via public ports.
- [x] Infrastructure adapters for Meta Commerce, Comments, Mentions, Leads, Messaging, UGC, Ambassador, and Messaging — stub implementations for all Phase 2 ports; live Graph API adapters can be plugged in later.
- [ ] Shopify-side hooks for catalog, orders, and abandoned cart events.
- [x] UI pages for catalog, shoppable media, comments, mentions, leads, UGC, ambassadors, and campaigns — implemented as `/stores/[storeId]/commerce/{catalog,comments,leads,growth}`.
- [~] AI integration for intent, replies, lead scoring, and product-tag suggestions — heuristic intent/sentiment and scoring implemented; OpenAI integration pending.
- [x] Lint + typecheck + tests pass; `CHANGELOG.md` and `docs/tasks/backlog.md` updated.

## 14. Phasing/Roadmap
- **Phase 2A — Instagram Shop:** Meta catalog sync, product mapping, shoppable media tagging.
- **Phase 2B — Engagement automation:** Comment moderation, auto-reply, mention handling, comment-to-DM.
- **Phase 2C — Lead capture:** Lead Ads webhooks, lead scoring, AI nurture.
- **Phase 2D — UGC & advocacy:** Mention/tag collection, rights workflow, ambassador/referral codes.
- **Phase 2E — Conversational commerce:** Abandoned cart, back-in-stock, order updates, review requests.

## 15. Open Questions
1. Should Meta catalog sync be native Graph API calls or a Meta Commerce Manager feed URL?
2. Which message tags will we request during app review for outbound DMs?
3. Should comment/lead processing use BullMQ from day one or start synchronous?
4. Ambassador payout: in-app credits, PayPal, Stripe Connect, or manual?
5. Do we allow AI to auto-hide comments without human approval, or queue for review?
