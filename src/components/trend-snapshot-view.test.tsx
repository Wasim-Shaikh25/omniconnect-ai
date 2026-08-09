import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { TrendSnapshotView } from "./trend-snapshot-view";
import type { TrendSnapshot } from "@/modules/analytics";

function makeSnapshot(type: TrendSnapshot["type"], data: Record<string, unknown>): TrendSnapshot {
  return {
    id: "ts-1",
    projectId: "p1",
    type,
    query: "q",
    data,
    fetchedAt: new Date("2026-01-01"),
  };
}

describe("TrendSnapshotView", () => {
  it("renders a HASHTAG snapshot with top media and metrics", () => {
    const snapshot = makeSnapshot("HASHTAG", {
      hashtagId: "123",
      userId: "u1",
      topMedia: [
        { caption: "Best reel", permalink: "https://instagram.com/p/1", mediaType: "REEL", metrics: { likes: 10 } },
      ],
    });
    const html = renderToString(<TrendSnapshotView snapshot={snapshot} />);
    expect(html).toContain("Hashtag ID");
    expect(html).toContain("123");
    expect(html).toContain("Best reel");
    expect(html).toContain("Open on Instagram");
    expect(html).toContain("REEL");
    expect(html).toContain("likes");
    expect(html).toContain("10");
  });

  it("renders a NICHE snapshot with recommendations and insights", () => {
    const snapshot = makeSnapshot("NICHE", {
      reelCount: 7,
      recommendations: [
        { title: "Do a tutorial", outline: "Step by step", hashtags: ["#diy"], audioSuggestion: "trending" },
      ],
      insights: "Niche is growing fast",
    });
    const html = renderToString(<TrendSnapshotView snapshot={snapshot} />);
    expect(html).toContain("Reels analyzed");
    expect(html).toContain("7");
    expect(html).toContain("Do a tutorial");
    expect(html).toContain("Step by step");
    expect(html).toContain("#diy");
    expect(html).toContain("Suggested audio:");
    expect(html).toContain("trending");
    expect(html).toContain("Niche is growing fast");
  });

  it("falls back to JsonViewer for unknown snapshot types", () => {
    const snapshot = makeSnapshot("AUDIO", { name: "track" });
    const html = renderToString(<TrendSnapshotView snapshot={snapshot} />);
    expect(html).toContain("name");
    expect(html).toContain("track");
  });

  it("renders empty state when top media is missing", () => {
    const snapshot = makeSnapshot("HASHTAG", { hashtagId: "456" });
    const html = renderToString(<TrendSnapshotView snapshot={snapshot} />);
    expect(html).toContain("456");
    expect(html).not.toContain("Open on Instagram");
  });
});
