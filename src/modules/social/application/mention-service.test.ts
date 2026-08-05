import { describe, it, expect } from "vitest";
import { makeMentionService } from "./mention-service";
import type { SocialMentionRecord, SocialMentionRepository } from "./ports";

function fakeMentionRepo(initial: SocialMentionRecord[] = []): SocialMentionRepository {
  const rows = [...initial];
  let idCounter = 1;
  return {
    async create(input) {
      const row: SocialMentionRecord = {
        id: `mention-${idCounter++}`,
        createdAt: new Date(),
        projectId: input.projectId,
        externalMediaId: input.externalMediaId ?? null,
        externalUserId: input.externalUserId ?? null,
        handle: input.handle ?? null,
        mediaUrl: input.mediaUrl ?? null,
        source: input.source,
        caption: input.caption ?? null,
        hashtags: input.hashtags ?? [],
      };
      rows.push(row);
      return row;
    },
    async listByStore(projectId, limit = 50) {
      return rows
        .filter((r) => r.projectId === projectId)
        .slice(0, limit)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    },
  };
}

const deterministicAnalyzer = {
  async analyze(caption: string | null) {
    const text = (caption ?? "").toLowerCase();
    if (text.includes("bad")) return { sentiment: "NEGATIVE" as const, confidence: 0.8, summary: "negative" };
    if (text.includes("love")) return { sentiment: "POSITIVE" as const, confidence: 0.8, summary: "positive" };
    return { sentiment: "NEUTRAL" as const, confidence: 0.5, summary: "neutral" };
  },
};

describe("makeMentionService", () => {
  it("syncs only new mentions by externalMediaId", async () => {
    const repo = fakeMentionRepo();
    const service = makeMentionService({
      mentions: repo,
      source: {
        async collect() {
          return [
            { projectId: "p1", source: "MENTION", externalMediaId: "m1", caption: "love it" },
            { projectId: "p1", source: "MENTION", externalMediaId: "m2", caption: "bad" },
          ] as Array<Omit<SocialMentionRecord, "id" | "createdAt">>;
        },
      },
      analyzer: deterministicAnalyzer,
    });

    const first = await service.syncMentions("p1");
    expect(first).toBe(2);

    const second = await service.syncMentions("p1");
    expect(second).toBe(0);
  });

  it("enriches stored mentions with sentiment", async () => {
    const repo = fakeMentionRepo();
    const service = makeMentionService({
      mentions: repo,
      source: {
        async collect() {
          return [{ projectId: "p1", source: "MENTION", externalMediaId: "m1", caption: "love it" }] as Array<
            Omit<SocialMentionRecord, "id" | "createdAt">
          >;
        },
      },
      analyzer: deterministicAnalyzer,
    });

    await service.syncMentions("p1");
    const mentions = await service.listMentionsWithSentiment("p1");
    expect(mentions).toHaveLength(1);
    expect(mentions[0]?.sentiment).toBe("POSITIVE");
    expect(mentions[0]?.summary).toBe("positive");
  });
});
