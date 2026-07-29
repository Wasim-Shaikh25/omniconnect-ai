---
description: 0036 — Product Availability & Demand Mismatch
---

# REQ-0036: 0036 — Product Availability & Demand Mismatch

- **Status:** Draft
- **Owner:** Devin
- **Module(s):** all
- **Original spec path:** `docs/specs/0036-product-availability-demand.md` (restructured)
- **Task:** `docs/tasks/TASK-0036-product-availability-demand.md`
- **Tracker:** `docs/trackers/TRACKER-0036-product-availability-demand.md`
- **Last updated:** 2026-07-29

> This file was migrated from `docs/specs/0036-product-availability-demand.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


## 1. Purpose

Detect when customers are asking about products that are out of stock (or low stock) and recommend an alternative-product campaign to capture the demand elsewhere.

## 2. Scope

- Ingest per-product inventory from catalog sync events.
- Match recent customer messages to out-of-stock/low-stock product titles.
- Generate a `BusinessInsight` when demand overlaps with unavailable inventory.
- Generate a `Recommendation` to create an alternative-product DM campaign.
- Execute the action through the existing `growth` DM campaign flow.

## 3. Requirements

- Extend `ProductsSynced` domain event payload to carry `products: { externalId, title, inventory }[]`.
- `intelligence` subscribers ingest one `ProductInventory` signal per product.
- `DetectionService` analyzes product inventory signals and `NewMessage` signals from the last 7 days.
- For each out-of-stock product, count messages whose content contains the product title (case-insensitive).
- If at least one matching message is found, emit a `BusinessInsight`:
  - Type: `OPPORTUNITY` (out of stock) or `RISK` (low stock).
  - Severity: `HIGH` if > 5 messages, `MEDIUM` otherwise.
  - Evidence references matched signal ids.
- `RecommendationService` maps the insight to `CREATE_ALTERNATIVE_PRODUCT_CAMPAIGN`.
  - Picks the in-stock product with the highest inventory as the alternative.
  - Action params include `outOfStockProductTitle`, `alternativeProductTitle`, and `conversationIds`.
- `WorkspaceActionExecutor` handles `CREATE_ALTERNATIVE_PRODUCT_CAMPAIGN` by calling `growth.createDmCampaign` with `campaignType: "ALTERNATIVE_PRODUCT"`.
- `ActionPlanService` target metric maps the new action type to `conversation_count`.

## 4. Edge Cases

- No product signals → no insight.
- Product title match should be token-aware (avoid matching "Shoe" inside "Running Shoes"). Use whole-word/phrase containment.
- If no in-stock alternative exists, recommendation is not generated.
- Duplicate insights for the same product are suppressed by checking existing open insights.

## 5. Acceptance Criteria

- [ ] `ProductsSynced` carries product inventory list.
- [ ] `DetectionService` emits product availability/demand insights.
- [ ] `RecommendationService` creates alternative-product recommendations.
- [ ] `WorkspaceActionExecutor` creates a DM campaign.
- [ ] End-to-end script confirms: product sync → message mentioning product → insight → recommendation → executed campaign.
- [ ] Lint + typecheck + build pass.
