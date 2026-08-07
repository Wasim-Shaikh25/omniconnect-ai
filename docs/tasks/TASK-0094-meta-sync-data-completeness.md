# TASK-0094 — Meta Sync Data Completeness

## Requirement: REQ-0094

## Scope

Fix three silent data gaps in the Meta sync pipeline:
1. Media catalog pagination — fetch all posts, not just 25
2. `websiteClicks` stored as `null` — fetch real value from Page Insights API
3. `bioLength` hardcoded to 0 — fetch `biography` field from Meta and persist its length

## Steps

### 1. `meta.service.ts` — cursor pagination + new fields

```typescript
// src/modules/meta/infrastructure/meta.service.ts

// getAccountMedia: add pagination
async getAccountMedia(accessToken: string, igUserId: string, hardCap = 500) {
  const fields = "id,media_type,media_url,permalink,caption,timestamp,like_count,comments_count,thumbnail_url,children{...}";
  const allMedia = [];
  let url = `${this.baseUrl}/${igUserId}/media?fields=${fields}&limit=25&access_token=${accessToken}`;
  while (url && allMedia.length < hardCap) {
    const page = await this.fetchJson(url);
    allMedia.push(...(page.data ?? []));
    url = page.paging?.next ?? null;
  }
  return allMedia.slice(0, hardCap);
}

// getPageInsights: add biography, profile_picture_url, website_clicks
async getPageInsights(accessToken: string, igUserId: string) {
  const fields = "username,followers_count,media_count,biography,profile_picture_url";
  // ... also fetch website_clicks metric
}
```

### 2. `marketing-insights.ts` — drive pagination and persist new fields

- Pass all pages from `getAccountMedia` to `upsertMediaPost` loop
- Persist `biography.length` into `accountAnalytic.bioLength` column
- Persist real `websiteClicks` value from insights response

### 3. Schema migration — new columns on AccountAnalytic

```prisma
model AccountAnalytic {
  // existing fields...
  bioLength      Int      @default(0)
  websiteClicks  Int?
  biography      String?
  profilePictureUrl String?
}
```

### 4. `prisma-dataset-fetcher.ts` — use stored values

Replace `bioLength: 0` with `bioLength: accountAnalytic?.bioLength ?? 0`.
Replace `websiteClicks: 0` with `websiteClicks: accountAnalytic?.websiteClicks ?? null`.

### 5. Tests

- Unit test: `getAccountMedia` follows `paging.next` cursor until null
- Unit test: `syncAccountAnalytics` stores non-null `websiteClicks` and `biography`
- Unit test: `profile_quality` dataset reads from stored values

## References

- `src/modules/meta/infrastructure/meta.service.ts`
- `src/modules/analytics/application/marketing-insights.ts`
- `src/modules/analytics/infrastructure/prisma-dataset-fetcher.ts`
- `prisma/schema.prisma` → `AccountAnalytic` model
