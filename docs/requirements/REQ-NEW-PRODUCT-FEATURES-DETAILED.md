# New Product Features — Detailed Specification Data

**Status:** Documented for review and discussion  
**Date:** 2026-08-04  
**Owner:** Product + Engineering  
**Purpose:** Capture all decisions, constraints, code snippets, and integration points for 8 new product features before writing formal REQ/TASK/TRACKER documents.

---

## 1. AI Coupon Issuance Tool (`issue_coupon`)

### Product Vision

- **When:** AI agent issues coupons mid-conversation based on system prompt strategy (not automatically on follow).
- **Who decides:** Marketing strategy via system prompt sections determines when to issue (e.g., on greeting, after negotiation, at checkout handoff).
- **Code enforces:** Hard limits on discount %, frequency per customer/store, and product scope.
- **Result:** Coupon code embeds tracking data; `CouponIssue` record created for attribution.

### Architecture

**AI Tool call:**
```typescript
// AI receives structured tool call, not free text
{
  name: "issue_coupon",
  input: {
    discountPercent: 15,      // 0–100
    maxUses: 1,               // or null for unlimited
    expiryDays: 7,
    productExternalIds: ["prod_123", "prod_456"],  // empty = store-wide
    description: "New customer welcome"
  }
}
```

**Code validation layer (before connector call):**
```typescript
// src/modules/ai/application/validate-coupon-request.ts
export async function validateCouponRequest(
  storeId: string,
  input: IssueCouponInput,
  userId: string,
  conversationId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  
  // 1. Merchant max discount cap (stored in Store model)
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (input.discountPercent > store.maxCouponDiscount) {
    return { ok: false, reason: "Exceeds merchant discount cap" };
  }

  // 2. Per-customer frequency cap (last 7 days)
  const recent = await prisma.couponIssue.count({
    where: {
      storeId,
      conversationId,  // or track by customer email if available
      createdAt: { gte: new Date(Date.now() - 7 * 86400000) },
    },
  });
  if (recent >= (store.couponFrequencyPerWeek ?? 1)) {
    return { ok: false, reason: "Customer has reached weekly coupon limit" };
  }

  // 3. Product scope validation
  if (input.productExternalIds.length > 0) {
    const products = await prisma.product.findMany({
      where: {
        storeId,
        externalId: { in: input.productExternalIds },
      },
    });
    if (products.length !== input.productExternalIds.length) {
      return { ok: false, reason: "One or more product IDs not found" };
    }
  }

  return { ok: true };
}
```

**Handler (after validation passes):**
```typescript
export async function issueCoupon(
  storeId: string,
  userId: string,
  conversationId: string,
  input: IssueCouponInput,
): Promise<{ couponCode: string; expiresAt: Date }> {
  
  const user = await getCurrentUser(userId);
  if (!user || user.storeId !== storeId) {
    throw new Error("Unauthorized");
  }

  // Validate first
  const validation = await validateCouponRequest(storeId, input, userId, conversationId);
  if (!validation.ok) {
    throw new Error(validation.reason);
  }

  // Generate coupon code
  const couponCode = generateCouponCode(user.email); // See section 2 for format

  // Create coupon on merchant platform
  const connectorResult = await connector.generateCoupon({
    code: couponCode,
    discountPercent: input.discountPercent,
    maxUses: input.maxUses,
    expiryDate: new Date(Date.now() + input.expiryDays * 86400000),
    productIds: input.productExternalIds,
  });

  // Record issuance for attribution
  const couponIssue = await prisma.couponIssue.create({
    data: {
      storeId,
      couponId: connectorResult.couponId,
      couponCode,
      conversationId,
      triggeringMessageId: null, // Passed in from caller
      platform: "instagram", // Or "facebook" / "whatsapp" from context
      postId: null, // Extracted from conversation metadata if available
      issuedByAI: true,
    },
  });

  return {
    couponCode,
    expiresAt: connectorResult.expiryDate,
  };
}
```

### Schema Changes

**New model:**
```prisma
model CouponIssue {
  id                 String   @id @default(cuid())
  storeId            String
  couponId           String   // External coupon ID from Shopify/WooCommerce
  couponCode         String
  conversationId     String
  triggeringMessageId String?  // Which message in the conversation triggered this
  platform           String   // "instagram" | "facebook" | "whatsapp"
  postId             String?  // Post/ad that led to the conversation
  issuedByAI         Boolean  @default(true)
  createdAt          DateTime @default(now())

  @@unique([conversationId, triggeringMessageId])
  @@index([storeId, postId])
  @@index([couponCode])
  @@index([conversationId])
}
```

**Store model additions:**
```prisma
model Store {
  // ... existing fields
  maxCouponDiscount         Int @default(50)      // % cap per merchant
  couponFrequencyPerWeek    Int @default(1)       // Max coupons per customer per week
}
```

### Constraints & Decisions

| Decision | Value | Rationale |
|----------|-------|-----------|
| Dedup key | `[conversationId, triggeringMessageId]` | Prevent double-issuance if AI retry or same trigger fires twice |
| Frequency window | 7 days | Standard promotional window; user can override in settings |
| Scope validation | Check product IDs exist in store | Prevent invalid/non-existent products in coupon restrictions |
| Merchant caps | Configurable in `Store` model | SaaS table-stakes: MSO controls merchant strategy |
| AI decides when | Yes, via system prompt | Not automatic; marketing controls via prompt sections |

---

## 2. Coupon Code Format & Attribution Model

### Code Format

**Format:** `USERNAME-PLATFORM-POSTID-RANDOM` all uppercase

**Example:** `WASIM_K-IG-P4821-K7M2`

**Components:**
- `WASIM_K` — First 8 chars of username (underscores allowed, lowercase → uppercase on generation)
- `IG` — Platform abbreviation (IG = Instagram, FB = Facebook, WA = WhatsApp)
- `P4821` — Post/ad ID (first 5 chars, `P` prefix)
- `K7M2` — Random 4-char suffix (alphanumeric, no `0/O/1/I/L` to avoid confusion)

**Why this format:**
- Human-readable on receipts / customer-facing contexts
- Embedded data drives attribution without pixels
- Unguessable (random suffix) but memorable
- Uppercase enforced (WooCommerce lowercases all coupon codes)
- Username embedding prevents username-spoofing attacks but is not cryptographically secure (handled by `CouponIssue` record)

### Generation Code

```typescript
// src/shared/coupon-code.ts
import { randomBytes } from "crypto";

const SAFE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // No 0/O/1/I/L

export function generateCouponCode(email: string, platform: string, postId?: string): string {
  // Extract username (before @)
  const username = email.split("@")[0]
    .replace(/[^a-zA-Z0-9_]/g, "")  // Keep only alphanumeric + underscore
    .toUpperCase()
    .slice(0, 8)
    .padEnd(8, "X");  // Pad to 8 if shorter

  // Platform code
  const platformCode = {
    instagram: "IG",
    facebook: "FB",
    whatsapp: "WA",
  }[platform] || "XX";

  // Post ID code
  const postCode = postId ? `P${postId.slice(0, 4).toUpperCase()}` : "XXXX";

  // Random suffix
  const randomSuffix = Array.from(randomBytes(3))
    .map(b => SAFE_CHARS[b % SAFE_CHARS.length])
    .join("");

  return `${username}-${platformCode}-${postCode}-${randomSuffix}`;
}

// Reverse lookup (for customer service / order tracking)
export function parseCouponCode(code: string): {
  username: string;
  platform: string;
  postId?: string;
} {
  const [username, platform, postCode, _random] = code.split("-");
  return {
    username,
    platform: { IG: "instagram", FB: "facebook", WA: "whatsapp" }[platform] || platform,
    postId: postCode.replace("P", ""),
  };
}
```

### Attribution Join

**Orders → Coupons:**
```typescript
// In orders list / order detail
const order = await prisma.order.findUnique({
  where: { id: orderId },
  include: {
    couponIssue: {
      where: { couponCode: order.couponCode },
    },
  },
});

// Extract attribution
const attr = order.couponIssue[0];
if (attr) {
  console.log(`Post: ${attr.postId}, Platform: ${attr.platform}, Conversation: ${attr.conversationId}`);
}
```

**Bulk attribution (post→order):**
```typescript
const postOrders = await prisma.order.findMany({
  where: {
    couponIssue: {
      some: {
        postId: "4821",
        platform: "instagram",
      },
    },
  },
  include: { couponIssue: true },
});
```

### Schema Impact

```prisma
model Order {
  // ... existing fields
  couponCode    String?
  couponIssue   CouponIssue?  @relation(fields: [couponCode], references: [couponCode])
}

// Unique constraint ensures one CouponIssue per coupon code
model CouponIssue {
  // ... (see section 1)
  couponCode    String @unique
}
```

---

## 3. Checkout Link Generation (`create_checkout_link`)

### Product Vision

When customer confirms interest in a product, AI calls `create_checkout_link` with that product + optional coupon. AI returns direct checkout URL to customer (no redirect to storefront required, though customer can visit site if preferred).

### EcommerceConnector Interface Extension

**New method:**
```typescript
// src/modules/ecommerce/domain/connector.ts
export interface EcommerceConnector {
  // ... existing methods
  
  createCheckoutLink(input: {
    externalProductId: string;
    quantity?: number;  // Default 1
    couponCode?: string;
  }): Promise<{ url: string }>;
}
```

### Implementation per Platform

**Shopify:**
```typescript
// src/modules/ecommerce/infrastructure/shopify-connector.ts
async createCheckoutLink(input: {
  externalProductId: string;
  quantity?: number;
  couponCode?: string;
}): Promise<{ url: string }> {
  const { externalProductId, quantity = 1, couponCode } = input;

  // Build URL directly
  const storeUrl = this.store.externalDomain; // e.g., "mystore.myshopify.com"
  const cartLine = `${externalProductId}:${quantity}`;
  const checkout = `https://${storeUrl}/cart/${encodeURIComponent(cartLine)}`;

  // Add coupon as query param
  const url = couponCode
    ? `${checkout}?discount=${encodeURIComponent(couponCode)}`
    : checkout;

  return { url };
}
```

**WooCommerce:**
```typescript
// src/modules/ecommerce/infrastructure/woocommerce-connector.ts
async createCheckoutLink(input: {
  externalProductId: string;
  quantity?: number;
  couponCode?: string;
}): Promise<{ url: string }> {
  const { externalProductId, quantity = 1, couponCode } = input;
  
  // Validate product exists
  const product = await this.api.get(`/products/${externalProductId}`);
  if (!product) throw new Error("Product not found");

  // WooCommerce checkout with product direct link
  const checkout = `${this.store.externalDomain}/checkout/?add-to-cart=${externalProductId}&quantity=${quantity}`;
  const url = couponCode
    ? `${checkout}&coupon=${encodeURIComponent(couponCode)}`
    : checkout;

  return { url };
}
```

**BigCommerce:**
```typescript
// src/modules/ecommerce/infrastructure/bigcommerce-connector.ts
async createCheckoutLink(input: {
  externalProductId: string;
  quantity?: number;
  couponCode?: string;
}): Promise<{ url: string }> {
  const { externalProductId, quantity = 1, couponCode } = input;

  // BigCommerce requires cart creation API
  const cartResp = await this.api.post("/carts", {
    line_items: [
      {
        product_id: parseInt(externalProductId),
        quantity,
      },
    ],
  });

  const cartId = cartResp.data.id;

  // Add coupon to cart if provided
  if (couponCode) {
    await this.api.post(`/carts/${cartId}/coupons`, {
      code: couponCode,
    });
  }

  // Redirect to checkout
  const checkoutUrl = `${this.store.externalDomain}/login.php?action=order_status&order_id=${cartId}`;
  // Note: BigCommerce has a different cart-to-checkout flow; verify exact endpoint

  return { url: checkoutUrl };
}
```

### AI Usage

```typescript
// In generate-reply flow, when customer picks a product
const product = await getProduct(productId);
const link = await connector.createCheckoutLink({
  externalProductId: product.externalId,
  quantity: parsedQuantity,
  couponCode: lastIssuedCouponCode,
});

const message = `Great choice! Here's your direct link: ${link.url}`;
```

### Constraints

| Decision | Value | Rationale |
|----------|-------|-----------|
| Quantity required | No (default 1) | Most impulse purchases are single unit |
| Coupon validation | Not in connector | Coupon must exist on platform; connector assumes it's valid |
| Cart expiry | Platform default (typically 7–30 days) | Don't override; let merchant control |
| Returns URL only | Yes, no redirect | AI decides whether to send to customer immediately or hold for later |

---

## 4. System Prompt Sections Architecture

### Product Vision

**Goal:** Give marketing control over AI bot behavior without code changes. System prompt is divided into 7 named sections, each with a specific purpose and clear bounds.

**Behavior drivers:**
- Which types of customers get coupons and when (new vs. returning)
- Negotiation tactics (price matching, volume discounts)
- Checkout handoff decision (when to offer link vs. recommend storefront)
- Escalation triggers (when to hand to human)

### Architecture

**Sections:**
```
SYSTEM_PROMPT_SECTIONS = {
  "identity": "Bot name, personality, tone (2–3 sentences)",
  "greeting": "How to greet returning vs. new customers (1–2 sentences per type)",
  "product_knowledge": "How to present inventory, features, benefits (guidelines, not product list)",
  "negotiation": "Tactics for discount negotiation, volume offers, payment terms (rules, not mechanics)",
  "coupon_issuance": "When to issue coupons, max frequency per customer, eligibility (new / returning / high-value only?)",
  "checkout_handoff": "When to offer checkout link vs. recommend visiting storefront (order value threshold?)",
  "escalation": "When to hand off to human (customer frustration signals, refund requests, complaints)",
}
```

**Stored in database:**
```prisma
model SystemPrompt {
  id        String @id @default(cuid())
  storeId   String
  version   Int    @default(1)

  identity        String   // Max 200 chars
  greeting        String   // Max 300 chars
  productKnowledge String  // Max 500 chars
  negotiation      String  // Max 500 chars
  couponIssuance   String  // Max 300 chars
  checkoutHandoff  String  // Max 300 chars
  escalation       String  // Max 300 chars

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([storeId, version])
}
```

**Rendering in AI module:**
```typescript
// src/modules/ai/application/generate-reply.ts
export async function generateReply(
  conversationId: string,
  storeId: string,
  messages: Message[],
): Promise<string> {
  
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: { systemPrompt: { orderBy: { version: "desc" }, take: 1 } },
  });

  const prompt = store.systemPrompt[0];

  const system = `
You are an AI bot for ${store.name}.

## Identity & Tone
${prompt.identity}

## Greeting
${prompt.greeting}

## Product Knowledge
${prompt.productKnowledge}

Your role is to:
1. Welcome customers and understand their needs
2. Recommend products from your inventory
3. Offer checkout links when appropriate
4. Provide discount codes when the strategy calls for it
5. Escalate to a human agent when needed

## Negotiation & Discounts
${prompt.negotiation}
Available tools: issue_coupon (to offer discount), create_checkout_link (to send checkout URL)

## Coupon Issuance Policy
${prompt.couponIssuance}

## Checkout & Purchase Flow
${prompt.checkoutHandoff}

## Escalation Policy
${prompt.escalation}
If escalation needed, call tool: escalate_to_human

---

Respond conversationally. Remember customer context. Be brief (under 150 words per message).
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: system },
      ...messages.map(m => ({ role: "user" as const, content: m.body })),
    ],
  });

  return response.choices[0].message.content ?? "";
}
```

### Example Sections (Default)

```
identity: "You are Salsa Bot, a friendly AI sales assistant for Wasim's spice store. You know spices inside and out and love helping customers find their perfect blend."

greeting: "Returning customers: Hey! Welcome back to Salsa! What can we help you find today? | New customers: Hi there! Welcome to Salsa. I'm here to help you discover amazing spices. What are you in the mood for?"

product_knowledge: "Present products by cuisine, heat level, and use case. Ask clarifying questions (e.g., Indian or Thai? Mild or spicy?). Always mention that sampler packs are available for explorers."

negotiation: "Offer volume discounts for orders over 5 items (10% off). Match competitor prices within 15% margin. Don't offer multi-buy coupons; instead suggest samplers."

coupon_issuance: "Offer welcome coupon (10% off) to new customers only, once per conversation. Returning customers: 15% off after second purchase. Never offer on first message; wait until customer is engaged."

checkout_handoff: "Offer direct checkout link when order value exceeds ₹500. For smaller orders, recommend visiting the website to explore other products."

escalation: "Escalate if customer: (a) asks for refund or return, (b) complains about product quality, (c) has been in conversation >20 minutes without resolution, (d) asks for custom blends."
```

### Merchant Dashboard

**UI for editing sections:**
```typescript
// src/app/stores/[id]/settings/prompt/page.tsx
export default async function PromptSettingsPage({
  params: { id },
}: {
  params: { id: string };
}) {
  const store = await prisma.store.findUnique({
    where: { id },
    include: { systemPrompt: { orderBy: { version: "desc" }, take: 1 } },
  });

  // Render form with 7 fields
  // On submit: create new SystemPrompt version (version + 1)
  // AI immediately uses latest version
}
```

### Versioning & Rollback

```typescript
// Publish a new version
async function publishPromptVersion(storeId: string, sections: SystemPromptSections) {
  const latest = await prisma.systemPrompt.findFirst({
    where: { storeId },
    orderBy: { version: "desc" },
  });

  await prisma.systemPrompt.create({
    data: {
      storeId,
      version: (latest?.version ?? 0) + 1,
      ...sections,
    },
  });
}

// Rollback to previous version
async function rollbackPromptVersion(storeId: string, toVersion: number) {
  // Just update active pointer (if using a separate `activePromptVersion` field on Store)
  // Or: create a new version that copies an old version's content
}
```

---

## 5. Remove Cart Table

### Current State

**Model (added in H7):**
```prisma
model Cart {
  id           String @id @default(cuid())
  storeId      String
  cartToken    String
  email        String      // Shopper PII
  items        Json        // Array of { productId, quantity }
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  expiresAt    DateTime?

  @@unique([storeId, cartToken])
}
```

**Event & subscriber:**
```typescript
// AbandonedCartDetected (published)
export class AbandonedCartDetected extends BaseDomainEvent<{
  cartId: string;
  email: string;
  items: Array<{ externalProductId: string; quantity: number }>;
}> {
  constructor(cartId: string, email: string, items: any[]) {
    super("AbandonedCartDetected", cartId, { cartId, email, items });
  }
}

// Cron job (every 6 hours)
async function sweepAbandonedCarts() {
  const stale = await prisma.cart.findMany({
    where: { expiresAt: { lt: new Date() } },
  });

  for (const cart of stale) {
    await eventBus.publish(
      new AbandonedCartDetected(cart.id, cart.email, cart.items),
    );
  }
}

// Subscriber
eventBus.subscribe("AbandonedCartDetected", async (event) => {
  // Send email to customer: "Your cart is waiting"
  // Track in analytics
});
```

**GDPR gap:**
- `Cart.email` stores shopper PII (first-party customer data)
- No inclusion in GDPR export (`customers/export` action)
- No inclusion in GDPR delete (`customers/redact` action)
- Retention unclear (expiry date allows manual extension)

### Removal Plan

**Phase 1: Data migration**
- Dump all non-expired Carts to JSON file (archive)
- Delete all Cart rows

**Phase 2: Code removal**
- Delete `Cart` model from `prisma/schema.prisma`
- Delete `AbandonedCartDetected` event class
- Delete sweep cron job
- Delete `AbandonedCartDetected` subscriber
- Remove any import of Cart from code

**Phase 3: Verify**
- Search for remaining `Cart` references
- Update analytics if Cart events were tracked
- No UI forms depend on Cart (data is not user-visible)

**Impact assessment:**
- **Metrics lost:** Cart abandonment rate (deprecated metric under bot-as-salesman model)
- **Behavior lost:** Abandoned cart email reminders (not AI's job)
- **No breaking change:** Cart was never exposed to customers; purely backend

### Rationale

Under the product vision ("bot is a salesman, not a checkout"):
- Cart is a second-order concern (checkout is merchant's responsibility)
- AI offers direct links, not shopping baskets
- Abandoned cart email is email marketing, not part of the bot's scope
- Storing customer email without GDPR handling is a compliance risk

---

## 6. WhatsApp Channel Support

### Product Vision

**Goal:** Third channel alongside Instagram and Facebook. Customers DM bot on WhatsApp; conversations appear in unified inbox; AI and human both support WhatsApp.

### Architecture

**Update enum:**
```prisma
enum ConversationChannel {
  INSTAGRAM
  FACEBOOK
  WHATSAPP
}
```

**Meta WhatsApp Business API:**
- Use same Meta webhook endpoint (`/api/meta/webhooks`)
- Signature verification identical (X-Hub-Signature)
- Message format different (WhatsApp message object vs. IG DM)
- No ephemeral messages (unlike IG Stories)

### Webhook Handling

**Incoming message (WhatsApp):**
```json
{
  "entry": [
    {
      "changes": [
        {
          "value": {
            "messages": [
              {
                "from": "919876543210",  // Phone number (E.164 format)
                "id": "wamid.xxx",
                "timestamp": "1234567890",
                "type": "text",
                "text": { "body": "Hi, I'm interested in your products" }
              }
            ],
            "contacts": [
              { "profile": { "name": "Raj" }, "wa_id": "919876543210" }
            ]
          }
        }
      ]
    }
  ]
}
```

**Create Conversation logic:**
```typescript
// src/modules/conversations/application/meta-webhooks.ts
async function handleWhatsAppMessage(payload: WhatsAppMessage) {
  const phoneNumber = payload.from;
  const displayName = payload.contact?.profile?.name ?? "WhatsApp User";

  // Find or create conversation
  let conversation = await prisma.conversation.findFirst({
    where: {
      storeId,
      channel: "WHATSAPP",
      externalUserId: phoneNumber,
    },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        storeId,
        channel: "WHATSAPP",
        externalUserId: phoneNumber,
        displayName,
        externalConversationId: payload.id,
      },
    });
  }

  // Create message
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      body: payload.text.body,
      externalMessageId: payload.id,
      provider: "WHATSAPP",
      direction: "INBOUND",
    },
  });

  // Generate AI reply (same as Instagram/Facebook)
  const reply = await generateReply(conversation.id, storeId, [/* ... */]);

  // Send back to WhatsApp
  await sendWhatsAppMessage(storeId, phoneNumber, reply);
}
```

### Sending Messages

**WhatsApp Message API:**
```typescript
// src/modules/conversations/infrastructure/meta-gateway.ts
async function sendWhatsAppMessage(
  storeId: string,
  recipientPhoneNumber: string,
  text: string,
): Promise<{ messageId: string }> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
  });

  const response = await fetch(
    `https://graph.instagram.com/v18.0/${store.metaPhoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${store.metaAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: recipientPhoneNumber,
        type: "text",
        text: { body: text },
      }),
    }
  );

  const data = await response.json();
  return { messageId: data.messages[0].id };
}
```

### UI Integration (Unified Inbox)

**No changes needed:**
- Conversation list already filters by `channel`
- Conversation detail already handles multi-channel display
- Only addition: WhatsApp badge/icon in conversation header
- Human takeover already routes to all channels equally

### Store Configuration

**New fields on `Store` model:**
```prisma
model Store {
  // ... existing
  metaPhoneNumberId  String?  // WhatsApp Business Account phone number ID
  whatsappWebhookUrl String?  // For webhook verification
  whatsappEnabled    Boolean  @default(false)
}
```

**Setup flow:**
1. Merchant connects Meta WhatsApp Business Account
2. System retrieves phone number ID from Meta API
3. Webhook URL registered with Meta
4. Incoming messages handled same as IG/FB

### Constraints

| Decision | Value | Rationale |
|----------|-------|-----------|
| Phone format | E.164 (country code + number) | Meta WhatsApp standard |
| Message types | Text only (phase 1) | Image/file support in phase 2 |
| Human takeover | Full support | Same as IG/FB |
| Broadcast vs DM | DM only | Broadcast messages are marketing, not bot conversations |

---

## 7. Dynamic Adapter Architecture (Remove Hardcoding)

### Current State (Problem)

**Hardcoded dispatch (anti-pattern):**
```typescript
// src/modules/ecommerce/application/get-connector.ts
export async function getConnector(store: Store): Promise<EcommerceConnector> {
  if (store.provider === "SHOPIFY") {
    return new ShopifyConnector(store);
  } else if (store.provider === "WOOCOMMERCE") {
    return new WooCommerceConnector(store);
  } else if (store.provider === "BIGCOMMERCE") {
    return new BigCommerceConnector(store);
  }
  throw new Error("Unsupported provider");
}
```

**Problems:**
- Adding a new provider requires code change + deploy
- Extensible architecture is only in words (interface), not practice
- GraphQL support requires forking connectors (REST-only today)

### Vision: Dynamic Resolution

**Goal:** Connector implementation chosen at runtime based on metadata, not code branches.

### New Architecture

**Registry pattern:**
```typescript
// src/modules/ecommerce/infrastructure/connector-registry.ts
export interface ConnectorFactory {
  create(store: Store): Promise<EcommerceConnector>;
  supportsProtocol(protocol: "REST" | "GraphQL"): boolean;
}

class ConnectorRegistry {
  private factories = new Map<string, ConnectorFactory>();

  register(provider: string, factory: ConnectorFactory): void {
    this.factories.set(provider, factory);
  }

  async resolve(store: Store): Promise<EcommerceConnector> {
    const factory = this.factories.get(store.provider);
    if (!factory) {
      throw new Error(`No connector registered for ${store.provider}`);
    }

    // Protocol selection (REST vs GraphQL)
    const protocol = store.preferredProtocol ?? "REST";
    if (!factory.supportsProtocol(protocol)) {
      throw new Error(`${store.provider} does not support ${protocol}`);
    }

    return factory.create(store);
  }
}

export const connectorRegistry = new ConnectorRegistry();

// Register at startup (src/server/bootstrap.ts)
connectorRegistry.register("SHOPIFY", new ShopifyConnectorFactory());
connectorRegistry.register("WOOCOMMERCE", new WooCommerceConnectorFactory());
connectorRegistry.register("BIGCOMMERCE", new BigCommerceConnectorFactory());
```

**Store model additions:**
```prisma
model Store {
  // ... existing
  provider               String   // "SHOPIFY" | "WOOCOMMERCE" | "BIGCOMMERCE" | custom
  providerConfig         Json     // Dynamic config per provider (API key, domain, etc.)
  preferredProtocol      String?  // "REST" | "GraphQL", default "REST"
}
```

**Factory implementations:**
```typescript
// src/modules/ecommerce/infrastructure/shopify-connector-factory.ts
export class ShopifyConnectorFactory implements ConnectorFactory {
  async create(store: Store): Promise<EcommerceConnector> {
    const config = store.providerConfig as ShopifyConfig;
    return new ShopifyConnector(store, config);
  }

  supportsProtocol(protocol: "REST" | "GraphQL"): boolean {
    return protocol === "REST" || protocol === "GraphQL";
  }
}

export class ShopifyConnector implements EcommerceConnector {
  constructor(
    private store: Store,
    private config: ShopifyConfig,
    private protocol: "REST" | "GraphQL" = "REST",
  ) {}

  async getProducts(): Promise<Product[]> {
    if (this.protocol === "GraphQL") {
      return this.getProductsGraphQL();
    }
    return this.getProductsREST();
  }

  private async getProductsREST(): Promise<Product[]> {
    // Existing implementation
  }

  private async getProductsGraphQL(): Promise<Product[]> {
    // New GraphQL implementation
  }
}
```

### SSRF Protection

**Risk:** Attacker controls store domain, fetches internal services via connector.

**Mitigation:**
```typescript
// src/modules/ecommerce/infrastructure/ssrf-guard.ts
export function validateStoreHost(
  store: Store,
  requestUrl: string,
): { ok: true } | { ok: false; reason: string } {
  
  // Only allow hosts that match the verified store domain
  const storeHost = new URL(store.externalDomain).hostname;
  const requestHost = new URL(requestUrl).hostname;

  if (requestHost !== storeHost) {
    return {
      ok: false,
      reason: `Request host ${requestHost} does not match store domain ${storeHost}`,
    };
  }

  // Reject private IPs
  if (isPrivateIp(requestHost)) {
    return {
      ok: false,
      reason: "Private IP addresses not allowed",
    };
  }

  return { ok: true };
}

// Use in connector:
async makeRequest(url: string, options: RequestInit) {
  const guard = validateStoreHost(this.store, url);
  if (!guard.ok) {
    throw new Error(guard.reason);
  }
  return fetch(url, options);
}
```

### GraphQL Adapter Example (Shopify)

**Why GraphQL matters:**
- Shopify REST Admin API deprecated (moved to GraphQL)
- Single query fetches only needed fields (vs REST N+1)
- Better for complex operations (webhook subscriptions)

**Implementation:**
```typescript
export class ShopifyGraphQLConnector implements EcommerceConnector {
  private gqlClient: GraphQLClient;

  constructor(store: Store, config: ShopifyConfig) {
    this.gqlClient = new GraphQLClient(
      `https://${config.domain}/admin/api/2024-09/graphql.json`,
      {
        headers: {
          "X-Shopify-Access-Token": config.accessToken,
        },
      }
    );
  }

  async getProducts(): Promise<Product[]> {
    const query = gql`
      query {
        products(first: 100) {
          edges {
            node {
              id
              title
              handle
              priceRange {
                minVariantPrice {
                  amount
                }
              }
            }
          }
        }
      }
    `;

    const data = await this.gqlClient.request(query);
    return data.products.edges.map(edge => ({
      externalId: edge.node.id,
      name: edge.node.title,
      slug: edge.node.handle,
      price: parseFloat(edge.node.priceRange.minVariantPrice.amount),
    }));
  }
}
```

### Protocol Selection

**User choice:**
- Merchant can opt into GraphQL for faster queries
- Default: REST (backwards compatible)
- Per-store setting: `Store.preferredProtocol`

**Fallback:**
- If GraphQL fails, connector falls back to REST
- Logged as a downgrade event

---

## 8. Business Intelligence Charts & Analytics

### Current State

**Problem:** 12 analytics pages render data as HTML tables only. Zero chart components.

**Pages affected:**
- `/stores/[id]/analytics/revenue`
- `/stores/[id]/analytics/customers`
- `/stores/[id]/analytics/products`
- `/stores/[id]/analytics/coupons`
- `/stores/[id]/analytics/conversations`
- `/stores/[id]/analytics/orders`
- + 6 others

### Required Chart Types

| Chart Type | Pages | Data Source | Purpose |
|-----------|-------|-------------|---------|
| Revenue trend (line) | Revenue | Orders (sum by date) | Track daily/weekly/monthly sales |
| Conversion funnel | Funnel | Conversations → Orders | Show drop-off stages |
| Product performance (bar) | Products | Orders (count by product) | Top sellers, slow movers |
| Coupon redemption (pie) | Coupons | Orders (count by coupon) | Which promotions convert |
| Customer lifetime value (scatter) | Customers | Orders (amount by customer) | Segment high-value |
| Post→Order attribution (waterfall) | Post Analytics | CouponIssue + Order | Which posts drive revenue |

### Chart Library Choice

**Recommendation:** Recharts (React, responsive, accessible, theme-aware)

**Why not others:**
- Chart.js: Vanilla JS, harder to integrate with React state
- D3: Overkill, steep learning curve
- Plotly: Heavier bundle, less customizable styling

### Implementation Example (Revenue Trend)

```typescript
// src/app/stores/[id]/analytics/revenue/page.tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getRevenueByDate } from '@/modules/analytics/get-revenue-by-date';

export default async function RevenueAnalyticsPage({
  params: { id: storeId },
}: {
  params: { id: string };
}) {
  const data = await getRevenueByDate(storeId, {
    from: new Date(Date.now() - 30 * 86400000), // Last 30 days
    to: new Date(),
  });

  // Transform to Recharts format
  const chartData = data.map(d => ({
    date: d.date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    revenue: d.totalRevenue,
    orders: d.orderCount,
  }));

  return (
    <div className="space-y-6">
      <h1>Revenue Analytics</h1>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold">Revenue Trend (30 days)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#0550AE" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Product breakdown bar chart */}
      <ProductPerformanceChart storeId={storeId} />

      {/* Coupon impact analysis */}
      <CouponRedemptionChart storeId={storeId} />
    </div>
  );
}
```

### Wiring `Order.updateAttribution()`

**Current state:** Method exists but nothing calls it.

```typescript
// src/modules/orders/domain/order.aggregate.ts
export class Order extends AggregateRoot {
  // ...
  
  updateAttribution(input: {
    couponCode?: string;
    platform?: string;
    postId?: string;
  }): void {
    if (input.couponCode) {
      this.couponCode = input.couponCode;
    }
    if (input.platform) {
      this.platform = input.platform;
    }
    if (input.postId) {
      this.postId = input.postId;
    }
    
    this.addDomainEvent(
      new OrderAttributionUpdated(this.id, {
        couponCode: this.couponCode,
        platform: this.platform,
        postId: this.postId,
      })
    );
  }
}
```

**Wire it:**
```typescript
// src/modules/orders/application/capture-order.ts
// When Shopify/WooCommerce webhook delivers an order, extract coupon + attribution
export async function captureOrder(
  storeId: string,
  externalOrder: ExternalOrder,
): Promise<void> {
  const order = Order.create({
    storeId,
    externalId: externalOrder.id,
    // ... other fields
  });

  // Check if order has a coupon
  const couponIssue = await prisma.couponIssue.findUnique({
    where: { couponCode: externalOrder.couponCode },
  });

  if (couponIssue) {
    order.updateAttribution({
      couponCode: externalOrder.couponCode,
      platform: couponIssue.platform,
      postId: couponIssue.postId,
    });
  }

  await orderRepository.save(order);
}
```

### Analytics Query Examples

```typescript
// src/modules/analytics/get-revenue-by-date.ts
export async function getRevenueByDate(
  storeId: string,
  options: { from: Date; to: Date },
): Promise<Array<{ date: Date; totalRevenue: number; orderCount: number }>> {
  const orders = await prisma.order.findMany({
    where: {
      storeId,
      createdAt: { gte: options.from, lte: options.to },
    },
    select: {
      createdAt: true,
      total: true,
    },
  });

  // Group by date
  const byDate = new Map<string, { revenue: number; count: number }>();
  for (const order of orders) {
    const dateKey = order.createdAt.toISOString().split('T')[0];
    const existing = byDate.get(dateKey) ?? { revenue: 0, count: 0 };
    byDate.set(dateKey, {
      revenue: existing.revenue + order.total,
      count: existing.count + 1,
    });
  }

  return Array.from(byDate.entries()).map(([date, data]) => ({
    date: new Date(date),
    totalRevenue: data.revenue,
    orderCount: data.count,
  }));
}

// Post→Order attribution
export async function getPostAttribution(
  storeId: string,
  postId: string,
): Promise<{
  issued: number;
  redeemed: number;
  revenue: number;
  uniqueCustomers: number;
}> {
  const issues = await prisma.couponIssue.findMany({
    where: { storeId, postId },
  });

  const orders = await prisma.order.findMany({
    where: {
      storeId,
      couponCode: { in: issues.map(i => i.couponCode) },
    },
  });

  const uniqueEmails = new Set(orders.map(o => o.customerEmail));

  return {
    issued: issues.length,
    redeemed: orders.length,
    revenue: orders.reduce((sum, o) => sum + o.total, 0),
    uniqueCustomers: uniqueEmails.size,
  };
}
```

### Dashboard Wire-Up

**After `Order.updateAttribution()` is called consistently**, these queries power analytics pages and executive dashboard:

```typescript
// 1. Real-time revenue chart
// 2. Top 5 products by revenue
// 3. Coupon ROI (redemption rate × revenue impact)
// 4. Post performance waterfall (impressions → DMs → orders → revenue)
// 5. Avg customer LTV by acquisition channel
```

---

## Summary of New Features

| Feature | Status | Key Files | Schema Impact | Decisions Pending |
|---------|--------|-----------|----------------|------------------|
| **1. issue_coupon** | Specified | `coupon-validation.ts`, `issue-coupon.ts` | CouponIssue model | Frequency cap default value |
| **2. Coupon code format** | Specified | `coupon-code.ts` | CouponIssue fields | None |
| **3. create_checkout_link** | Specified | `shopify-connector.ts`, `woocommerce-connector.ts`, `bigcommerce-connector.ts` | None | BigCommerce exact endpoint |
| **4. System prompt sections** | Specified | `generate-reply.ts`, `prompt-settings.ts` | SystemPrompt model | Default section content (examples given) |
| **5. Remove Cart table** | Specified | `schema.prisma` | Delete Cart model | Archive location for existing carts |
| **6. WhatsApp channel** | Specified | `meta-webhooks.ts`, `meta-gateway.ts` | Add WHATSAPP to enum | Phone number validation rules |
| **7. Dynamic adapter** | Specified | `connector-registry.ts` | Store.preferredProtocol | Migration plan for existing stores |
| **8. Charts & analytics** | Specified | `revenue.page.tsx`, `product-performance.ts` | Order.platform, Order.postId | Chart library finalization (Recharts recommended) |

---

## Next Steps for Discussion

1. **Confirm defaults** — Coupon frequency cap, max discount %, system prompt templates
2. **Prioritize** — Which of these 8 should ship first? (Suggest: 1, 2, 3 first; then 4, 5; then 6, 7, 8)
3. **Dependencies** — Some features block others (e.g., CouponIssue needed before Order.updateAttribution works)
4. **Timeline** — Estimate effort per feature (not included in this doc; for dev discussion)
5. **Migration** — For existing stores, how to roll out new features? (E.g., Cart removal may need audit + consent)

