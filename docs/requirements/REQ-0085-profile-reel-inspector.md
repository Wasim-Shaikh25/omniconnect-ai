---
description: Profile & Reel Inspector
---

# REQ-0085: Profile & Reel Inspector

- **Status:** Draft
- **Owner:** wasim
- **Product Charter:** `docs/specs/current-state.md`
- **Related Task:** `docs/tasks/TASK-0085-profile-reel-inspector.md`
- **Related Tracker:** `docs/trackers/TRACKER-0085-profile-reel-inspector.md`
- **Last updated:** 2026-08-05

## 1. Summary

Built entirely on free Meta APIs + AI estimation. No paid third-party data. Three confidence tiers: High (70%+), Medium (40-70%), Low (<40% = "insufficient data"). Uses Business Discovery API for public profile data and AI estimation for demographics (comment language, posting times, hashtag locality, tagged locations).

## 2. Goals

- Profile inspection: follower count, engagement rate, audience quality, demographics, top content, growth trend.
- Three-tier confidence system for AI-estimated data.
- Data sources: Business Discovery API (public), Instagram Insights API (own account), AI estimation.
- Periodic follower snapshots for growth trajectory graphs.
- Audience quality scoring: follower-to-engagement ratio, spam patterns.

## 3. Non-Goals

- Paid data providers (HypeAuditor, Modash, Phyllo).
- Real-time monitoring of external profiles.
- Follower list enumeration.

## 4. User Stories

- As a creator, I want to inspect any public Instagram profile's audience demographics.
- As a creator, I want to see clear confidence labels on AI-estimated data.
- As a merchant, I want to evaluate influencer profiles before partnerships.
- As a user, I want growth trend analysis (growing/stable/declining) for any profile.

## 5. Acceptance Criteria

- [ ] Business Discovery API fetch for public profile data.
- [ ] AI demographic estimation from comment language, posting times, hashtags, locations.
- [ ] Three confidence tiers: high (70%+), medium (40-70%), low (<40%).
- [ ] Low confidence metrics labeled "insufficient data" instead of showing unreliable numbers.
- [ ] Audience quality score based on engagement patterns and spam detection.
- [ ] Growth trend classification: growing, stable, declining.
- [ ] Inspector UI: username input, results dashboard with confidence labels.
- [ ] Plan limits: Free (3/day), Pro (50/day), Business (unlimited).

## 6. Scope & Dependencies

- Modules: `inspector` (new)
- Depends on: REQ-0077 (Project with Meta access token), REQ-0086 (OpenRouter for AI estimation)
- External: Instagram Business Discovery API, Instagram Insights API

## 7. Code Snippets

### Profile Inspection

```ts
// src/modules/inspector/application/inspect-profile.ts

interface ProfileInspectionResult {
  username: string;
  followerCount: number;
  engagementRate: number;
  audienceQuality: { score: number; label: "high" | "medium" | "low"; confidence: number };
  demographics: {
    confidence: "high" | "medium" | "low";
    topCountries: Array<{ country: string; percentage: number }>;
    topCities: Array<{ city: string; percentage: number }>;
    ageRanges: Array<{ range: string; percentage: number }>;
    genderSplit: { male: number; female: number; other: number };
  };
  topContent: Array<{ type: "reel" | "carousel" | "photo"; engagement: number; url: string }>;
  growthTrend: "growing" | "stable" | "declining";
}

async function inspectProfile(
  projectId: string,
  targetUsername: string,
): Promise<ProfileInspectionResult> {
  const project = await projectRepo.findById(projectId);
  const profile = await metaApi.businessDiscovery(targetUsername, project.metaAccessToken);
  const media = profile.media.data.slice(0, 50);
  const comments = await Promise.all(
    media.slice(0, 20).map(m => metaApi.getMediaComments(m.id, project.metaAccessToken))
  );

  const aiEstimation = await openRouter.chat({
    model: project.aiConfig?.modelOverrides?.inspector ?? env.AI_DEFAULT_MODEL,
    messages: [{
      role: "system",
      content: `Analyze this Instagram profile's audience demographics.
        Estimate geolocation, age, gender based on:
        - Comment languages and content
        - Posting times (timezone inference)
        - Hashtag localities (#mumbai, #nyc)
        - Tagged locations in posts
        - Engagement patterns
        Return with a confidence score (0-100).
        If confidence < 40, return "insufficient_data" for that metric.`,
    }, {
      role: "user",
      content: JSON.stringify({
        profile: { username: targetUsername, followers: profile.followers_count, bio: profile.biography },
        recentPosts: media.map(m => ({
          caption: m.caption, timestamp: m.timestamp,
          likes: m.like_count, comments: m.comments_count,
          location: m.location,
        })),
        sampleComments: comments.flat().slice(0, 200).map(c => c.text),
      }),
    }],
    response_format: { type: "json_object" },
  });

  return parseInspectionResult(profile, JSON.parse(aiEstimation.content));
}
```

## 8. Open Questions

None — three-tier confidence approach chosen in planning.
