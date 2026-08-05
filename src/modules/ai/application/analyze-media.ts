import type { AIConfigurationRepository, AIProvider } from "./ports";
import { AIContextBuilder } from "./ai-context";
import { selectModel } from "./model-router";

export interface MediaMetricsInput {
  mediaType: string;
  caption: string | null;
  hashtags: string[];
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  plays: number | null;
  views: number | null;
  reach: number | null;
  impressions: number | null;
  engagementRate: number | null;
}

export interface MediaSlide {
  slide: number;
  visual: string;
  caption: string;
}

export interface MediaAnalysis {
  mediaPostId: string;
  whyItWorked: string;
  slideBySlideStoryboard: MediaSlide[];
  suggestedImprovements: string[];
  generatedAt: Date;
}

export interface AnalyzeMediaInput {
  storeId: string;
  mediaPostId: string;
  media: MediaMetricsInput;
}

export interface AnalyzeMedia {
  (input: AnalyzeMediaInput): Promise<MediaAnalysis>;
}

const DEFAULT_TONE = "trendy, authentic, and platform-native";

export function makeAnalyzeMedia(deps: {
  aiProvider: AIProvider;
  aiConfigurationRepository: AIConfigurationRepository;
}): AnalyzeMedia {
  return async function analyzeMedia(input): Promise<MediaAnalysis> {
    const config = await deps.aiConfigurationRepository.getByStore(input.storeId);
    const tone = config?.tone ?? DEFAULT_TONE;

    const system = `You are a Meta content strategist. Tone: ${tone}.
Analyze the provided Instagram/Facebook post metrics and caption. Return a JSON object only (no markdown) with the following keys:
- whyItWorked (string, 2-3 sentences explaining what made the post succeed or flop)
- slideBySlideStoryboard (array of 3-5 objects, each with slide (number), visual (string), caption (string)). Use this for Reels/carousels/stories; for single-image posts return 3 frames that tell a story.
- suggestedImprovements (array of 3-5 actionable strings)
Be concise and strategic. Do not mention that you are an AI.`;

    const user = `Media type: ${input.media.mediaType}
Caption: ${input.media.caption ?? "(no caption)"}
Hashtags: ${input.media.hashtags.join(", ")}
Metrics: likes=${input.media.likes ?? "n/a"}, comments=${input.media.comments ?? "n/a"}, shares=${input.media.shares ?? "n/a"}, saves=${input.media.saves ?? "n/a"}, plays=${input.media.plays ?? "n/a"}, views=${input.media.views ?? "n/a"}, reach=${input.media.reach ?? "n/a"}, impressions=${input.media.impressions ?? "n/a"}, engagementRate=${input.media.engagementRate ?? "n/a"}

Explain why it worked and provide a slide-by-slide storyboard.`;

    const context = new AIContextBuilder()
      .withSystem(system)
      .withUser(user)
      .withModel(selectModel("competitor-analysis", config?.model).model)
      .withFallback(DEFAULT_DEV_OUTPUT)
      .withOperation("media-analysis")
      .withMetadata({ storeId: input.storeId, mediaPostId: input.mediaPostId })
      .build();

    const raw = await deps.aiProvider.complete(context.messages, {
      model: context.model,
      fallback: context.fallback,
    });

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (typeof parsed !== "object" || parsed === null) return parseFallback(raw, input.mediaPostId);
      return parseAnalysis(parsed, input.mediaPostId);
    } catch {
      return parseFallback(raw, input.mediaPostId);
    }
  };
}

const DEFAULT_DEV_OUTPUT = JSON.stringify({
  whyItWorked: "This post combined a strong hook with a clear product CTA and native Reel pacing, which drove saves and shares.",
  slideBySlideStoryboard: [
    { slide: 1, visual: "Bold text overlay hook on a product close-up", caption: "The #1 reason [niche] lovers save this post." },
    { slide: 2, visual: "Short demo / transformation", caption: "See it in action — 3 seconds." },
    { slide: 3, visual: "User quote or benefit summary", caption: "Tap link in bio to shop before it sells out." },
  ],
  suggestedImprovements: [
    "Add a stronger first-frame hook",
    "Use 3-5 niche hashtags instead of broad tags",
    "Reply to every comment in the first 30 minutes",
    "Pin a CTA comment with a shoppable link",
    "Repost top performer as a carousel next week",
  ],
});

function parseFallback(raw: string, mediaPostId: string): MediaAnalysis {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === "object" && parsed !== null) return parseAnalysis(parsed, mediaPostId);
  } catch {
    // fall through
  }
  return parseAnalysis(JSON.parse(DEFAULT_DEV_OUTPUT) as unknown, mediaPostId);
}

function parseAnalysis(value: unknown, mediaPostId: string): MediaAnalysis {
  const obj = value as Record<string, unknown>;
  return {
    mediaPostId,
    whyItWorked: typeof obj.whyItWorked === "string" ? obj.whyItWorked : "",
    slideBySlideStoryboard: Array.isArray(obj.slideBySlideStoryboard)
      ? obj.slideBySlideStoryboard
          .map((s, index) => ({
            slide: typeof (s as Record<string, unknown>).slide === "number" ? ((s as Record<string, unknown>).slide as number) : index + 1,
            visual: typeof (s as Record<string, unknown>).visual === "string" ? ((s as Record<string, unknown>).visual as string) : "",
            caption: typeof (s as Record<string, unknown>).caption === "string" ? ((s as Record<string, unknown>).caption as string) : "",
          }))
          .slice(0, 5)
      : [],
    suggestedImprovements: Array.isArray(obj.suggestedImprovements)
      ? obj.suggestedImprovements.filter((s): s is string => typeof s === "string").slice(0, 5)
      : [],
    generatedAt: new Date(),
  };
}
