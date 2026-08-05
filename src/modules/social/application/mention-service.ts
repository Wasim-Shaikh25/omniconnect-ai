import type { SocialMentionRecord, SocialMentionRepository } from "./ports";

export const MENTION_SENTIMENTS = ["POSITIVE", "NEGATIVE", "NEUTRAL", "MIXED"] as const;
export type MentionSentiment = (typeof MENTION_SENTIMENTS)[number];

export interface MentionWithSentiment extends SocialMentionRecord {
  sentiment: MentionSentiment;
  confidence: number;
  summary: string;
}

export interface MentionSentimentAnalyzer {
  analyze(caption: string | null): Promise<{ sentiment: MentionSentiment; confidence: number; summary: string }>;
}

export interface BrandMentionSource {
  collect(projectId: string, since?: Date): Promise<Array<Omit<SocialMentionRecord, "id" | "createdAt">>>;
}

export interface MentionServiceDeps {
  mentions: SocialMentionRepository;
  source: BrandMentionSource;
  analyzer: MentionSentimentAnalyzer;
}

export function makeMentionService(deps: MentionServiceDeps) {
  return {
    async syncMentions(projectId: string): Promise<number> {
      const collected = await deps.source.collect(projectId);
      const existing = await deps.mentions.listByStore(projectId, 1000);
      const seen = new Set(existing.map((m) => m.externalMediaId ?? m.id));
      const novel = collected.filter((m) => {
        const key = m.externalMediaId ?? "";
        return !seen.has(key);
      });
      await Promise.all(novel.map((m) => deps.mentions.create(m)));
      return novel.length;
    },
    async listMentionsWithSentiment(projectId: string, limit = 50): Promise<MentionWithSentiment[]> {
      const rows = await deps.mentions.listByStore(projectId, limit);
      const analyzed = await Promise.all(
        rows.map(async (row) => {
          const { sentiment, confidence, summary } = await deps.analyzer.analyze(row.caption);
          return { ...row, sentiment, confidence, summary };
        }),
      );
      return analyzed;
    },
  };
}
