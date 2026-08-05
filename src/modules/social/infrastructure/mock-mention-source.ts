import type { BrandMentionSource } from "../application/mention-service";
import type { SocialMentionRecord } from "../application/ports";

const SAMPLE_MENTIONS: Array<{ caption: string; source: string; handle: string }> = [
  { caption: "Love this brand! Where can I buy?", source: "MENTION", handle: "fan_user" },
  { caption: "Worst experience ever, never buying again.", source: "MENTION", handle: "angry_user" },
  { caption: "Check out my new post featuring @brand", source: "TAG", handle: "creator_one" },
  { caption: "Great products, amazing quality!", source: "HASHTAG", handle: "happy_one" },
  { caption: "Does anyone know if they ship internationally?", source: "MENTION", handle: "curious_one" },
];

export function makeMockBrandMentionSource(): BrandMentionSource {
  return {
    async collect(projectId: string) {
      return SAMPLE_MENTIONS.map((sample, index) => ({
        projectId,
        externalMediaId: `mock-media-${index}`,
        externalUserId: `mock-user-${index}`,
        handle: sample.handle,
        mediaUrl: `https://example.com/media/${projectId}/${index}`,
        source: sample.source,
        caption: sample.caption,
        hashtags: ["#brand", "#lifestyle"],
      })) satisfies Array<Omit<SocialMentionRecord, "id" | "createdAt">>;
    },
  };
}
