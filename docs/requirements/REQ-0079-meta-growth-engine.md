---
description: Meta Growth Engine
---

# REQ-0079: Meta Growth Engine

- **Status:** Implemented
- **Owner:** wasim
- **Product Charter:** `docs/specs/current-state.md`
- **Related Task:** `docs/tasks/TASK-0079-meta-growth-engine.md`
- **Related Tracker:** `docs/trackers/TRACKER-0079-meta-growth-engine.md`
- **Supersedes:** Portions of `REQ-0003-meta-integration.md`, `REQ-0018-content-studio-mvp.md`
- **Last updated:** 2026-08-06 (T-021 Meta OAuth flow landed; T-022 WhatsApp Business API connection deferred to post-Meta-Business-verification)

## 1. Summary

Build the Meta Growth Engine pillar: content publishing via Instagram Content Publishing API (two-step container flow), content scheduling via BullMQ delayed jobs, hashtag intelligence using Meta Hashtag API + AI scoring, and best-time-to-post analysis using Instagram Insights follower online times + AI correlation.

## 2. Goals

- Content publishing: photo, carousel, Reel, Story via Instagram Content Publishing API.
- Content scheduling: save to DB, BullMQ delayed job, publish at scheduled time.
- Content Studio UI: AI idea generation, caption editor, hashtag suggestions, schedule picker.
- Hashtag intelligence: Meta Hashtag Search API (30 unique/7 days) + AI competition/reach/relevance scoring.
- Best time to post: Insights API `online_followers` + AI correlation with historical engagement.

## 3. Non-Goals

- TikTok/YouTube/Pinterest publishing.
- Direct media upload to Meta (requires hosted URLs — use S3-compatible storage).
- Facebook Stories (Instagram Stories only in initial scope).

## 4. User Stories

- As a creator, I want to schedule Instagram posts/reels with AI-generated captions and hashtags.
- As a merchant, I want to know the best time to post for maximum engagement.
- As a user, I want hashtag suggestions scored by competition level and relevance.

## 5. Acceptance Criteria

- [x] Content publishing: create media container → poll until FINISHED → publish.
- [x] Support photo, carousel, Reel, Story media types.
- [x] Scheduled posts stored in DB with BullMQ delayed job.
- [x] Content Studio UI with caption editor, publish form, and schedule picker.
- [x] Content calendar UI: visual grid preview and drag-to-reschedule for scheduled posts.
- [x] Hashtag intelligence: AI scores competition, reach, relevance for suggested tags.
- [x] Best time to post: returns day/hour/score based on follower online times + post history.
- [x] Rate limiting: respect 200 calls/hr Instagram Graph API limit.

## 6. Scope & Dependencies

- Modules: `content` (new), `meta`
- Depends on: REQ-0077 (Project with metaAccountId), Meta OAuth (T-021)
- Augmented by: REQ-0091 (hashtag scoring and best-time-to-post are deterministic; `generate-trends` numeric predictions are sourced from the analysis engine, not invented by the LLM — see T-086)
- External: Instagram Content Publishing API, Instagram Insights API, Instagram Hashtag API

## 7. Code Snippets

### Content Scheduling

```ts
// src/modules/content/application/schedule-post.ts

interface SchedulePostInput {
  projectId: string;
  type: "IMAGE" | "CAROUSEL" | "REEL" | "STORY";
  caption: string;
  mediaUrls: string[];
  hashtags: string[];
  scheduledAt: Date;
}

async function schedulePost(userId: string, input: SchedulePostInput) {
  const project = await projectRepo.findByIdAndUser(input.projectId, userId);
  const post = await scheduledPostRepo.create({
    ...input,
    status: input.scheduledAt ? "SCHEDULED" : "PUBLISHING",
  });

  if (!input.scheduledAt) {
    await publishQueue.add("publish-post", { postId: post.id });
  } else {
    const delay = input.scheduledAt.getTime() - Date.now();
    await publishQueue.add("publish-post", { postId: post.id }, { delay });
  }
  return post;
}
```

### Hashtag Intelligence

```ts
// src/modules/content/application/hashtag-intelligence.ts

interface HashtagAnalysis {
  tag: string;
  reachEstimate: "high" | "medium" | "low";
  competitionLevel: "high" | "medium" | "low";
  relevanceScore: number;
  recommendation: "use_now" | "use_over_time" | "skip";
}

async function analyzeHashtags(
  projectId: string,
  contentTopic: string,
): Promise<HashtagAnalysis[]> {
  const metaHashtags = await metaApi.searchHashtags(contentTopic, project.metaAccessToken);
  const hashtagMedia = await Promise.all(
    metaHashtags.slice(0, 10).map(h =>
      metaApi.getHashtagTopMedia(h.id, project.metaAccessToken)
    ),
  );
  const analysis = await openRouter.chat({
    model: project.aiConfig.modelOverrides?.content ?? env.AI_CONTENT_MODEL,
    messages: [
      { role: "system", content: "Analyze these hashtags for an Instagram post. Rate competition, relevance, and reach." },
      { role: "user", content: JSON.stringify({ topic: contentTopic, hashtags: hashtagMedia }) },
    ],
    response_format: { type: "json_object" },
  });
  return JSON.parse(analysis.content);
}
```

## 8. Open Questions

None.
