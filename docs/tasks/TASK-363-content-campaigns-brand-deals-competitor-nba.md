# Task 363: Next Best Action for Content, Campaigns, Brand Deals, and Competitor Intelligence

- **Status:** In Progress
- **Spec:** `docs/specs/0039-content-campaigns-brand-deals-competitor-nba.md`
- **Module(s):** `intelligence`, `growth`, `branddeals`, `analytics`, `conversations`, `ecommerce`
- **Owner:** wasim
- **Changelog entry:** Adds per-module Next Best Action for Content, Campaigns, Brand Deals, and Competitor Intelligence plus cross-module wiring.

## Description

Implement the second per-module Next Best Action batch from `TASK-350`, covering the remaining product surfaces and the cross-module contracts that feed them.

## Subtasks (9)

- [x] 81. **Content NBA:** repeat/test successful formats; fill identified content gaps; connect idea to goal/audience; recommend timing from workspace history.
- [x] 82. **Campaigns NBA:** correct audience/offer/channel/timing/budget; pause underperforming step with guardrails; duplicate success as controlled experiment.
- [x] 83. **Brand Deals:** follow up based on engagement/deadline; improve proposal packaging; surface performance evidence; flag deliverable/payment risk.
- [x] 84. **Competitor Intelligence:** convert patterns into controlled content experiments; avoid copying assets/unsupported claims; explain whether trend is broad or limited.
- [~] 87. **Content ↔ Campaigns ↔ Analytics:** link content variants to objective/audience/offer/campaign, preserve publication metrics and downstream clicks/conversations/orders, compare variants, convert outcomes to learnings.
- [~] 88. **CRM ↔ Campaigns ↔ Automation:** use governed segments, re-evaluate consent/suppression before each send, write exposure/response to timeline, prevent overlapping journeys.
- [~] 89. **Products ↔ Competitor Intelligence ↔ Content:** combine internal demand and market signals, recommend content experiment, include stock/margin guardrails.
- [~] 90. **Brand Deals ↔ Media Kit ↔ Content:** record media-kit views/inquiries, link proposal claims to metrics, convert deliverables into content objects/approvals, feed results into deal reporting/pricing.
- [x] 137. **Brand-deal follow-up next-best action and CRM advocate recommendations:** Instagram 8–10 PM follow-up, suppress promo during support, invite to ambassador after verified positive outcome.

## Acceptance Criteria

- [x] Content NBA returns repeat formats and content gaps.
- [x] Campaigns NBA flags underperforming/high-performing DM/comment-unlock campaigns.
- [x] Brand Deals NBA recommends follow-ups and flags deliverable/payment risk.
- [x] Competitor Intelligence NBA suggests controlled experiments and warnings.
- [x] Cross-module signals are ingested for `DmCampaignCreated`, `DmCampaignSent`, `UgcAssetCollected`, `AmbassadorEnrolled`, `ReferralConverted`, `BrandDealCreated`, `CompetitorInsightGenerated`.
- [x] UI panels render on the four module pages.
- [x] End-to-end script passes.
- [x] Lint + typecheck + build pass.
