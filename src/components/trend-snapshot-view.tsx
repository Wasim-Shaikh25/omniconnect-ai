"use client";

import type { TrendSnapshot } from "@/modules/analytics";
import { JsonViewer } from "./json-viewer";
import { Card, CardContent } from "@/components/ui/card";

interface TrendSnapshotViewProps {
  snapshot: TrendSnapshot;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

function asObject(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function renderHashtagData(data: Record<string, unknown>) {
  const topMedia = asArray(data.topMedia) ?? [];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
        {data.hashtagId != null && (
          <div>
            <span className="text-xs text-muted-foreground">Hashtag ID</span>
            <p className="truncate">{String(data.hashtagId)}</p>
          </div>
        )}
        {data.userId != null && (
          <div>
            <span className="text-xs text-muted-foreground">User ID</span>
            <p className="truncate">{String(data.userId)}</p>
          </div>
        )}
      </div>
      {topMedia.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {topMedia.map((media, index) => {
            const item = asObject(media) ?? {};
            const caption = asString(item.caption);
            const permalink = asString(item.permalink);
            const mediaType = asString(item.mediaType) ?? "post";
            return (
              <Card key={index}>
                <CardContent className="p-4 text-sm">
                  <p className="text-xs text-muted-foreground uppercase">{mediaType}</p>
                  <p className="mt-1 line-clamp-2">{caption || "(no caption)"}</p>
                  {permalink && (
                    <a
                      href={permalink}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block truncate text-xs text-primary underline"
                    >
                      Open on Instagram
                    </a>
                  )}
                  {item.metrics != null && (
                    <div className="mt-2">
                      <JsonViewer data={item.metrics} maxDepth={3} defaultExpandedDepth={1} />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function renderNicheData(data: Record<string, unknown>) {
  const recommendations = asArray(data.recommendations) ?? [];
  return (
    <div className="space-y-4">
      {typeof data.reelCount === "number" && (
        <div>
          <span className="text-xs text-muted-foreground">Reels analyzed</span>
          <p>{data.reelCount.toLocaleString()}</p>
        </div>
      )}
      {recommendations.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Recommendations</p>
          {recommendations.map((rec, index) => {
            const item = asObject(rec) ?? {};
            const title = asString(item.title) ?? `Recommendation ${index + 1}`;
            const outline = asString(item.outline);
            const hashtags = asArray(item.hashtags)
              ?.map((h) => (typeof h === "string" ? h : ""))
              .filter(Boolean);
            const audioSuggestion = asString(item.audioSuggestion);
            return (
              <Card key={index}>
                <CardContent className="p-4 text-sm">
                  <p className="font-medium">{title}</p>
                  {outline && <p className="mt-1 text-muted-foreground">{outline}</p>}
                  {hashtags && hashtags.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">{hashtags.join(" ")}</p>
                  )}
                  {audioSuggestion && (
                    <p className="mt-1 text-xs">Suggested audio: {audioSuggestion}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {data.insights != null && (
        <div>
          <span className="text-xs text-muted-foreground">Insights</span>
          <p className="text-sm whitespace-pre-wrap">{String(data.insights)}</p>
        </div>
      )}
    </div>
  );
}

export function TrendSnapshotView({ snapshot }: TrendSnapshotViewProps) {
  const data = asObject(snapshot.data) ?? {};

  if (snapshot.type === "HASHTAG") {
    return renderHashtagData(data);
  }

  if (snapshot.type === "NICHE") {
    return renderNicheData(data);
  }

  return <JsonViewer data={snapshot.data} />;
}
