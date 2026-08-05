# TASK-0084: Attribution & Checkout Links

- **Status:** Todo
- **Owner:** wasim
- **Requirement:** `docs/requirements/REQ-0084-attribution-checkout-links.md`
- **Tracker:** `docs/trackers/TRACKER-0084-attribution-checkout-links.md`
- **Module(s):** attribution (new), meta, coupons, ecommerce
- **Changelog entry:** `CHANGELOG.md [Unreleased]` — Dual attribution: coupon + UTM, checkout links, CAPI.
- **Last updated:** 2026-08-05

## 1. Summary

Build attribution module: link generator (coupon auto-apply + UTM), order webhook attribution matching, Meta Conversions API for server-side purchase events.

## 2. References

- Requirement: `docs/requirements/REQ-0084-attribution-checkout-links.md`
- Related files:
  - `src/modules/attribution/` (new module)
  - `src/modules/meta/application/conversions-api.ts` (new)

## 3. Implementation Plan

### Step 1 — AttributionLink Prisma Model
projectId, couponId, fullUrl, shortCode, utmSource, utmMedium, utmCampaign, clicks, conversions, revenue.

### Step 2 — Link Generator
Build checkout URL with platform-specific coupon auto-apply pattern + UTM params. Generate short code.

### Step 3 — Order Webhook Handler
Match coupon code → find attribution link → increment conversion count + revenue.

### Step 4 — Meta Conversions API
Server-side Purchase event with SHA-256 hashed user data. event_id for Pixel dedup.

### Step 5 — Attribution Dashboard
Revenue per campaign, per coupon, per channel. Conversion funnel visualization.

## 4. Subtasks

- [ ] T-006: Create AttributionLink Prisma model
- [ ] T-035: Attribution link generator
- [ ] T-036: Order webhook → attribution matching
- [ ] T-026: Meta Conversions API

## 5. Acceptance Criteria

- [ ] Matches REQ-0084 acceptance criteria.
- [ ] Lint + typecheck + tests pass.
- [ ] `CHANGELOG.md` updated.

## 6. Notes / Blockers

- couponUrlPattern varies by e-commerce platform — stored in adapter config.
