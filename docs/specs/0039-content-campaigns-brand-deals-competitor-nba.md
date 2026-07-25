# 0039 — Next Best Action for Content, Campaigns, Brand Deals, and Competitor Intelligence

- **Module(s):** `intelligence`, `growth`, `branddeals`, `analytics`, `conversations`, `ecommerce`
- **Status:** Implemented
- **Owner:** wasim
- **Related task(s):** `docs/tasks/TASK-363-content-campaigns-brand-deals-competitor-nba.md`
- **Last updated:** 2026-07-25

## 1. Summary

Extend the per-module Next Best Action (NBA) surface to the remaining customer-facing modules: Content, Campaigns, Brand Deals, and Competitor Intelligence. This closes the first sweep of `TASK-350` product-experience NBA items and wires the cross-module contracts that feed these recommendations (Content ↔ Campaigns ↔ Analytics, CRM ↔ Campaigns ↔ Automation, Products ↔ Competitor Intelligence ↔ Content, Brand Deals ↔ Media Kit ↔ Content).

## 2. Goals

- Surface actionable next-best-action cards for Content, Campaigns, Brand Deals, and Competitor Intelligence.
- Convert module-specific events (`DmCampaignCreated`, `DmCampaignSent`, `UgcAssetCollected`, `AmbassadorEnrolled`, `ReferralConverted`, `BrandDealCreated`, `CompetitorInsightGenerated`) into canonical `Signal` timeline facts and `BusinessInsight` triggers.
- Add cross-module checks (consent/suppression/frequency) before campaign execution and link content/campaign outcomes to shared metrics.

## 3. Non-Goals

- Full multi-channel campaign optimization engine (budget allocation, audience lookalike, etc.).
- Advanced media kit → brand-deal pricing model.
- Live competitor benchmarking beyond existing `CompetitorInsight` rows.

## 4. User Stories

- As a marketer, I want the Content Studio to suggest which formats to repeat and which products to feature so that I can fill content gaps.
- As a store owner, I want Campaigns NBA to flag underperforming DM campaigns and recommend pausing or re-executing them.
- As a brand manager, I want follow-up reminders and risk flags on deals stuck in `NEGOTIATING` or `DELIVERED` but not `PAID`.
- As a strategist, I want Competitor Intelligence to suggest controlled content experiments instead of copying claims.

## 5. Domain Model

New output shapes in `intelligence/application/next-best-action.ts`:

```ts
export interface ContentNextBestAction {
  repeatFormats: { format: string; evidence: string }[];
  contentGaps: { topic: string; suggestedProductTitle: string | null }[];
  timing: string;
  suppressed: boolean;
  reasons: string[];
}

export interface CampaignsNextBestAction {
  underperforming: { campaignId: string; campaignType: string; sentCount: number; reason: string }[];
  highPerforming: { campaignId: string; campaignType: string; sentCount: number; reason: string }[];
  recommendedAction: string;
  suppressed: boolean;
  reasons: string[];
}

export interface BrandDealNextBestAction {
  followUps: { dealId: string; brandName: string; daysStuck: number; reason: string }[];
  deliverableRisks: { dealId: string; brandName: string; risk: string }[];
  recommendedAction: string;
}

export interface CompetitorNextBestAction {
  experiments: { pattern: string; suggestedAngle: string; guardrail: string }[];
  warnings: string[];
}
```

## 6. Public Contract

- `NextBestActionService.forContent(storeId)`
- `NextBestActionService.forCampaigns(storeId)`
- `NextBestActionService.forBrandDeals(storeId)`
- `NextBestActionService.forCompetitorIntelligence(storeId)`
- Server actions:
  - `getContentNextBestActionAction(storeId)`
  - `getCampaignsNextBestActionAction(storeId)`
  - `getBrandDealsNextBestActionAction(storeId)`
  - `getCompetitorNextBestActionAction(storeId)`
- Cross-module event ingestion from `growth` and `branddeals` into `Signal` via `intelligence/infrastructure/subscribers.ts`.
- `WorkspaceActionExecutor` support for `PAUSE_CAMPAIGN` and `CREATE_CONTENT_EXPERIMENT` (simulated by `DmCampaign` status update + `Signal` for now).

## 7. Data / Persistence

- Reuses existing `Signal`, `BusinessInsight`, `DmCampaign`, `UgcAsset`, `BrandDeal`, `CompetitorInsight` models.
- No new Prisma models; indexes reused.

## 8. API / UI Surface

- UI panels:
  - `ContentNextBestAction` on `/stores/[storeId]/content`
  - `CampaignsNextBestAction` on `/stores/[storeId]/campaigns`
  - `BrandDealsNextBestAction` on `/stores/[storeId]/brand-deals`
  - `CompetitorNextBestAction` on `/stores/[storeId]/commerce/competitors`

## 9. External Integrations

- None new; uses existing Meta/Shopify signals and `CompetitorInsight` rows.

## 10. Edge Cases & Failure Modes

- No UGC or campaigns: return empty arrays and `recommendedAction: "Create your first campaign or collect UGC."`
- Missing products: content gap cannot suggest a product.
- Brand deal with no `updatedAt`: fallback to `createdAt` for days-stuck calculation.

## 11. Security & Privacy

- Server actions check organization/store membership.
- Competitor recommendations avoid suggesting copy; only controlled experiments.

## 12. Testing Strategy

- End-to-end script `scripts/verify-task363.ts` creates DM campaigns, UGC, brand deals, and competitor insights, then asserts all four NBA outputs are non-empty.

## 13. Acceptance Criteria

- [x] Content NBA returns repeat formats and content gaps.
- [x] Campaigns NBA flags underperforming/high-performing DM/comment-unlock campaigns.
- [x] Brand Deals NBA recommends follow-ups and flags deliverable/payment risk.
- [x] Competitor Intelligence NBA suggests controlled experiments and warnings.
- [x] Cross-module signals are ingested for `DmCampaignCreated`, `DmCampaignSent`, `UgcAssetCollected`, `AmbassadorEnrolled`, `ReferralConverted`, `BrandDealCreated`, `CompetitorInsightGenerated`.
- [x] UI panels render on the four module pages.
- [x] End-to-end script passes.
- [x] Lint + typecheck + build pass.
