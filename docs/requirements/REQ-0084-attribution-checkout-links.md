---
description: Attribution & Direct Checkout Links
---

# REQ-0084: Attribution & Direct Checkout Links

- **Status:** Implemented
- **Owner:** wasim
- **Product Charter:** `docs/specs/current-state.md`
- **Related Task:** `docs/tasks/TASK-0084-attribution-checkout-links.md`
- **Related Tracker:** `docs/trackers/TRACKER-0084-attribution-checkout-links.md`
- **Last updated:** 2026-08-05

## 1. Summary

Dual attribution strategy: coupon-based (primary, individual-level, highest reliability) + UTM-only (secondary, platform-level). Attribution link generator creates checkout URLs with coupon auto-apply + UTM parameters. Order webhook handler closes the attribution loop by matching coupon codes to links. Meta Conversions API (CAPI) for server-side purchase attribution (+19% more conversions for ads).

## 2. Goals

- Attribution link generator: coupon + UTM link creation with short codes.
- Platform-specific coupon auto-apply URL patterns (e.g., Shopify `/discount/CODE`).
- Order webhook handler: match coupon code to attribution link, record conversion.
- Meta Conversions API: server-side purchase event sending with event_id dedup.
- AttributionLink model tracking clicks, conversions, revenue.

## 3. Non-Goals

- Client-side pixel tracking (handled by Meta Pixel, not our concern).
- Click tracking/URL shortener (short codes for internal reference only).

## 4. User Stories

- As a merchant, I want checkout links that auto-apply coupons so I can track which campaigns drive sales.
- As a merchant, I want to see revenue attribution per campaign, per coupon, per channel.
- As a merchant running Meta ads, I want server-side purchase events for better ad optimization.

## 5. Acceptance Criteria

- [x] Attribution link generation with coupon auto-apply + UTM parameters.
- [x] Platform-specific URL patterns from adapter config (couponUrlPattern).
- [x] Order webhook matches coupon code → attribution link → increments conversion count + revenue.
- [x] Meta CAPI sends Purchase events with SHA-256 hashed user data and event_id dedup.
- [x] Dashboard shows revenue per campaign, per coupon, per channel.

## 6. Scope & Dependencies

- Modules: `attribution` (new), `meta`, `coupons`, `ecommerce`
- Depends on: REQ-0078 (adapter for order webhooks + coupon URL patterns), REQ-0077 (Project)

## 7. Code Snippets

### Attribution Link Generation

```ts
// src/modules/attribution/application/create-link.ts

async function createAttributionLink(input: CreateLinkInput): Promise<AttributionLink> {
  const project = await projectRepo.findById(input.projectId);
  const connection = await ecommerceRepo.findConnectionByProject(input.projectId);
  const adapter = await adapterRepo.findById(connection.adapterId);
  const storeUrl = connection.credentials.shopDomain;

  let checkoutUrl: string;
  const coupon = input.couponId ? await couponRepo.findById(input.couponId) : null;

  if (coupon && adapter.configMapping.couponUrlPattern) {
    checkoutUrl = `https://${storeUrl}${adapter.configMapping.couponUrlPattern.replace("{{code}}", coupon.code)}`;
  } else if (coupon) {
    checkoutUrl = `https://${storeUrl}/checkout?discount=${coupon.code}`;
  } else {
    checkoutUrl = `https://${storeUrl}`;
  }

  const url = new URL(checkoutUrl);
  url.searchParams.set("utm_source", input.utmSource);
  if (input.utmMedium) url.searchParams.set("utm_medium", input.utmMedium);
  if (input.utmCampaign) url.searchParams.set("utm_campaign", input.utmCampaign);

  const shortCode = generateShortCode();
  return attributionLinkRepo.create({
    projectId: input.projectId,
    couponId: input.couponId,
    fullUrl: url.toString(),
    shortCode,
    utmSource: input.utmSource,
    utmMedium: input.utmMedium,
    utmCampaign: input.utmCampaign,
  });
}
```

### Order Webhook Attribution Matching

```ts
async function handleOrderWebhook(projectId: string, order: ConnectorOrder) {
  if (order.couponCode) {
    const coupon = await couponRepo.findByCode(projectId, order.couponCode);
    if (coupon) {
      const link = await attributionLinkRepo.findByCoupon(coupon.id);
      if (link) {
        await attributionLinkRepo.incrementConversion(link.id, order.total);
      }
      await couponRepo.incrementRedemption(coupon.id, order.total);
    }
  }
}
```

### Meta Conversions API

```ts
// src/modules/meta/application/conversions-api.ts

async function sendPurchaseEvent(project: Project, order: ConnectorOrder) {
  const eventId = `purchase_${order.externalId}_${Date.now()}`;
  await fetch(`https://graph.facebook.com/v21.0/${project.metaPixelId}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: [{
        event_name: "Purchase",
        event_time: Math.floor(order.createdAt.getTime() / 1000),
        event_id: eventId,
        action_source: "website",
        user_data: {
          em: [hashSHA256(order.customerEmail)],
          external_id: [hashSHA256(order.customerRef)],
        },
        custom_data: {
          currency: order.currency ?? "USD",
          value: order.total,
          content_ids: order.lineItems?.map(i => i.externalId),
          content_type: "product",
        },
      }],
      access_token: decrypt(project.metaAccessToken),
    }),
  });
}
```

## 8. Open Questions

None.
