---
description: Viral Growth & Follower Acceleration
---

# REQ-0013: Viral Growth & Follower Acceleration

- **Status:** Implemented
- **Owner:** wasim
- **Module(s):** growth, social, ai, analytics
- **Original spec path:** `docs/specs/0013-viral-growth.md` (restructured)
- **Task:** `docs/tasks/TASK-0013-viral-growth.md`
- **Tracker:** `docs/trackers/TRACKER-0013-viral-growth.md`
- **Last updated:** 2026-07-29

> This file was migrated from `docs/specs/0013-viral-growth.md` as part of the unified requirement/task/tracker restructure. The original content is preserved below.


- **Module(s):** growth, social, ai, analytics
- **Status:** Implemented
- **Owner:** wasim
- **Related task(s):** `docs/tasks/backlog.md` (TASK-160)
- **Related ADR(s):** —
- **Last updated:** 2026-07-25

## 1. Goal

Add product features that help OmniConnect AI users grow their Instagram / Facebook follower count and increase the probability of content going viral, while staying within Meta's terms of service.

## 2. Background research

- Instagram's 2026 algorithm strongly rewards **shares / sends per reach** as the top ranking signal for Reels.
- Reels generate **~36% more reach** than other post types; carousels drive **~12% more engagement**.
- Posting **3–5 times per week** grows followers ~2× faster than 1–2 posts/week.
- Comment auto-replies can boost engagement **+21%**.
- Giveaways, collab posts, and comment-to-DM unlock loops are the dominant viral mechanics used by growth tools (e.g. UnlockDM, KickoffLabs, ReplyKaro).
- Instagram natively supports: **Collaborative posts** (co-authored Reels/posts), **Broadcast channels**, **Creator Marketplace**, **Gifts/Badges/Subscriptions**.

## 3. Feature candidates

### Phase A — Quick wins (low implementation effort)

1. **AI viral caption / hook generator**
   - One-click generate 5 caption variants with strong hooks, CTAs, and niche hashtags.
   - Score each variant with a predicted engagement score based on past post performance.

2. **Optimal posting time recommendation**
   - Use follower activity data (when available) or store timezone + niche defaults.
   - Surface "Best time to post" in the shoppable-media / content composer.

3. **Comment-to-DM unlock loop**
   - Store owner sets a keyword (e.g. `GUIDE`) and a reward (link, PDF, coupon code).
   - Fan comments the keyword; system auto-DMs the reward and asks them to share.
   - Track keyword-triggered comments, DMs sent, and reward redemptions.

4. **Hashtag / geotag suggestion engine**
   - Suggest 20–30 niche hashtags and local geotags per post.
   - Avoid banned / oversaturated tags; prioritize tags where the brand has a chance to rank in Top.

### Phase B — Viral mechanics (medium effort)

5. **Giveaway / contest campaigns**
   - Create a giveaway landing page with entry actions: follow, like, share to Story, tag friends, subscribe to email.
   - Award bonus entries for referrals with unique share links.
   - Pick a random winner and notify via DM/email.

6. **Follower referral program (for existing customers)**
   - Existing followers get a unique referral link.
   - Referred friends follow the account; referrer unlocks a coupon or reward.
   - Extend the current ambassador/referral model to non-purchase actions (follows, email signups).

7. **Collaborative post / Collab planner**
   - Plan co-authored posts with other brands/creators.
   - Track invite status, publish date, and combined reach estimate.

8. **UGC challenge / branded hashtag campaign**
   - Launch a branded hashtag challenge; collect submissions under `UgcAsset`.
   - Leaderboard by engagement; auto-request usage rights for top posts.
   - Repurpose approved UGC into Reels or carousel ads.

### Phase C — Advanced / platform-dependent (high effort)

9. **Broadcast channel management**
   - Create and schedule broadcast channel messages (text, voice, video, polls).
   - Cross-post to Stories and DM subscribers with one click.

10. **Creator Marketplace integration**
    - Search/filter creators by niche, follower count, engagement rate, audience location.
    - Track campaign proposals, deliverables, and payouts.

11. **Viral content analytics dashboard**
    - Track sends-per-reach, saves, shares, and follower velocity per post/Reel.
    - Surface "why it worked" AI insights and content recommendations.
    - Compare against competitors / niche benchmarks.

12. **Predictive trend / audio / reel script assistant**
    - Recommend trending audio and hooks before they peak.
    - Generate slide-by-slide Reel storyboards and scripts.

## 4. Proposed MVP (Phase A)

Implement in this order:

1. AI caption/hook generator in the shoppable-media composer.
2. Optimal posting time suggestion.
3. Comment-to-DM unlock loop (keyword trigger + reward DM).
4. Hashtag suggestion engine.

## 5. Architecture notes

- Keep new features inside the existing `growth`, `social`, and `ai` modules.
- Reuse `DmCampaign` / `Conversation` infrastructure for DM unlocks.
- Extend `UgcAsset` for hashtag campaign submissions.
- Use `MetaService` adapter for any direct API calls; stub in dev.

## 6. Acceptance criteria

- [x] Users can generate AI captions/hooks for posts in the shoppable-media composer.
- [x] Composer suggests best posting time and hashtags.
- [x] Comment keyword triggers an automated DM reward flow (comment-to-DM unlock loop).
- [ ] Campaign analytics show shares/sends/follower growth per post.
- [x] `lint`, `typecheck`, and `build` pass; docs/backlog updated.
