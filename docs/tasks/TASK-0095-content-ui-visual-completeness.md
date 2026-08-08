# TASK-0095 — Content UI Visual Completeness

## Requirement: REQ-0095

## Steps

### 1. Post thumbnail on content list page

In `src/app/stores/[projectId]/analytics/content/page.tsx` add inside each `<CardContent>`:
```tsx
{(post.thumbnailUrl ?? post.mediaUrl) && (
  <img
    src={post.thumbnailUrl ?? post.mediaUrl!}
    alt={post.caption?.slice(0, 60) ?? post.mediaType}
    className="mb-3 h-28 w-28 rounded object-cover"
  />
)}
```

### 2. Post thumbnail + engagement rate on detail page

In `src/app/stores/[projectId]/analytics/content/[mediaPostId]/page.tsx`:
- Add same thumbnail `<img>` before the metrics grid
- Add `{ label: "Engagement rate", value: post.latestInsight?.engagementRate ? `${(post.latestInsight.engagementRate * 100).toFixed(2)}%` : "—" }` to the metrics array (replacing or adding alongside "Views")

### 3. Instagram profile card on analytics main page

In `src/app/stores/[projectId]/analytics/page.tsx`, update the "Connected Meta account" card:
```tsx
{view.audience.pageInsights && (
  <Card>
    <CardHeader>
      <div className="flex items-center gap-3">
        {view.audience.pageInsights.profilePictureUrl && (
          <img src={view.audience.pageInsights.profilePictureUrl} className="h-12 w-12 rounded-full" />
        )}
        <div>
          <CardTitle>@{view.audience.pageInsights.username ?? "unknown"}</CardTitle>
          {view.audience.pageInsights.biography && (
            <CardDescription>{view.audience.pageInsights.biography}</CardDescription>
          )}
        </div>
      </div>
    </CardHeader>
    ...existing metrics...
  </Card>
)}
```
Note: `profilePictureUrl` and `biography` only appear after REQ-0094 is implemented.
This UI can render them conditionally now as a forward-compatible empty state.

### 4. Story-specific metrics

- Prisma schema: add `storyExits Int?`, `storyTapsForward Int?`, `storyTapsBack Int?`, `storyReplies Int?` to `MediaInsight` model
- `meta.service.ts`: for `STORY` type media, call `/${mediaId}/insights?metric=exits,taps_forward,taps_back,replies&access_token=...`
- `marketing-insights.ts`: store these in `upsertMediaInsight`
- `content/[mediaPostId]/page.tsx`: render a "Story metrics" section conditionally when `post.mediaType === "STORY"` and any story field is non-null

### 5. Tests

- Test: list page renders img element when `thumbnailUrl` is set
- Test: detail page includes engagementRate in output
- Test: story metric fields stored and rendered

## References

- `src/app/stores/[projectId]/analytics/content/page.tsx`
- `src/app/stores/[projectId]/analytics/content/[mediaPostId]/page.tsx`
- `src/app/stores/[projectId]/analytics/page.tsx`
- `src/modules/meta/infrastructure/meta.service.ts`
- `src/modules/analytics/application/marketing-insights.ts`
- `prisma/schema.prisma` → `MediaInsight` model
