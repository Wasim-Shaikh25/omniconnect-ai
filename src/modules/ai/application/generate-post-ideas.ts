import type { AIConfigurationRepository, AIProvider } from "./ports";
import type { TrendIdea } from "./generate-trends";
import type { MarketingMemoryRecord, DailyBriefRecord } from "@/modules/intelligence";

export interface GeneratePostIdeasInput {
  storeId: string;
  caption: string | null;
  hashtags: string[];
  mediaType: string;
  metrics: {
    likes?: number;
    comments?: number;
    shares?: number;
    plays?: number;
    impressions?: number;
    reach?: number;
  };
  ownerUsername?: string | null;
  count?: number;
  organizationId?: string;
}

export interface GeneratePostIdeas {
  (input: GeneratePostIdeasInput): Promise<TrendIdea[]>;
}

export interface MarketingMemoryPort {
  getMemory(organizationId: string, storeId: string): Promise<MarketingMemoryRecord>;
  getBrief(organizationId: string, storeId: string): Promise<DailyBriefRecord>;
}

const DEFAULT_TONE = "trendy, authentic, and platform-native";

export function makeGeneratePostIdeas(deps: {
  aiProvider: AIProvider;
  aiConfigurationRepository: AIConfigurationRepository;
  marketingMemory?: MarketingMemoryPort;
}): GeneratePostIdeas {
  return async function generatePostIdeas(input): Promise<TrendIdea[]> {
    const config = await deps.aiConfigurationRepository.getByStore(input.storeId);
    const tone = config?.tone ?? DEFAULT_TONE;
    const count = Math.min(Math.max(input.count ?? 3, 1), 10);

    let memory: MarketingMemoryRecord | undefined;
    let brief: DailyBriefRecord | undefined;
    if (deps.marketingMemory && input.organizationId) {
      try {
        memory = await deps.marketingMemory.getMemory(input.organizationId, input.storeId);
        brief = await deps.marketingMemory.getBrief(input.organizationId, input.storeId);
      } catch {
        // Marketing context is optional; fall back to provided post data.
      }
    }

    const topProducts = memory?.productScores
      .slice(0, 3)
      .map((p) => `${p.productTitle} (score ${Math.round(p.compositeScore * 100)})`)
      .join(", ") ?? "none";

    const dmPatterns = memory?.dmPatterns
      .slice(0, 3)
      .map((p) => `${p.category}: ${p.frequency}`)
      .join("; ") ?? "none";

    const commentPatterns = memory?.commentPatterns
      .slice(0, 3)
      .map((p) => `${p.category}: ${p.frequency}`)
      .join("; ") ?? "none";

    const trendingHashtags = memory?.trendingHashtags
      .map((h) => `#${h.tag}`)
      .join(" ") ?? "none";

    const system = `You are a social media content strategist for Instagram. Tone: ${tone}.
Analyze the provided post and generate a JSON array of ${count} fresh content ideas inspired by *why* this post worked (or what would make it work better).
Ground ideas in the brand's marketing memory: top products to promote, recent DM/comment themes, trending hashtags, and today's brief.
For each idea return:
- title (string, punchy idea name)
- format (string, one of Reel/Post/Carousel/Story)
- hook (string, scroll-stopping first line)
- description (string, 2-3 sentences describing the video/post)
- whyItWorks (string, 1 sentence explaining the trend mechanic, audience psychology, or marketing context)
- hashtags (array of 10-15 niche hashtags, no banned/spam ones)
- audioSuggestion (string, trending audio style or sound cue)
- predictedEngagementScore (number 0-100)
- bestTimeToPost (string, human-readable like "Tuesday, 11:00 AM EST")
- cta (string, a short call-to-action)
Return only a JSON array. Do not wrap in markdown.`;

    const user = `Post by @${input.ownerUsername ?? "unknown"} (${input.mediaType}):
Caption: ${input.caption ?? "(no caption)"}
Hashtags: ${input.hashtags.join(" ") || "(none)"}
Metrics: likes ${input.metrics.likes ?? 0}, comments ${input.metrics.comments ?? 0}, plays ${input.metrics.plays ?? 0}, reach ${input.metrics.reach ?? 0}.
Top products to promote: ${topProducts}
DM themes: ${dmPatterns}
Comment themes: ${commentPatterns}
Trending hashtags from mentions: ${trendingHashtags}
${brief ? `Today's brief: ${brief.priorities.join("; ")}. Content idea: ${brief.contentIdea ?? "none"}` : ""}
Generate content ideas that follow the same vibe, tie to the brand's current marketing priorities, and are original for our brand.`;

    const raw = await deps.aiProvider.complete(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { model: config?.model ?? "gpt-4o-mini", fallback: DEFAULT_DEV_OUTPUT },
    );

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return [parseSingleIdea(raw, input.mediaType)];
      }
      return parsed
        .map((item) => parseIdea(item, input.mediaType))
        .filter((t): t is TrendIdea => t !== null)
        .slice(0, count);
    } catch {
      return [parseSingleIdea(raw, input.mediaType)];
    }
  };
}

const DEFAULT_DEV_OUTPUT = JSON.stringify([
  {
    title: "Behind-the-scenes inspired Reel",
    format: "REEL",
    hook: "POV: your order is being packed with extra love ✨",
    description:
      "A fast-cut 15-second Reel showing an order being packed, sealed, and decorated. Add a trending lo-fi or soft-pop audio cue.",
    whyItWorks: "Behind-the-scenes content builds trust and satisfies the 'satisfying' content craving.",
    hashtags: ["#behindthescenes", "#smallbusiness", "#packingorders", "#satisfying", "#shoplocal"],
    audioSuggestion: "Trending soft-pop / ASMR packing sound",
    predictedEngagementScore: 78,
    bestTimeToPost: "Tuesday, 11:00 AM EST",
    cta: "Tap the link in bio to shop the drop.",
  },
  {
    title: "This or that carousel",
    format: "CAROUSEL",
    hook: "Which vibe are you today? A or B 👇",
    description:
      "A 3-slide carousel: two product variations, a poll in the caption, and a final slide with a shoppable link.",
    whyItWorks: "Poll-style carousels drive saves and comments because people love giving opinions.",
    hashtags: ["#thisorthat", "#poll", "#shopping", "#musthave", "#styleinspo"],
    audioSuggestion: "Light, upbeat trending audio",
    predictedEngagementScore: 72,
    bestTimeToPost: "Thursday, 7:00 PM EST",
    cta: "Comment A or B for a surprise DM discount.",
  },
]);

function parseIdea(item: unknown, requestedFormat: string): TrendIdea | null {
  if (typeof item !== "object" || item === null) return null;
  const raw = item as Record<string, unknown>;
  const title = typeof raw.title === "string" ? raw.title : "Trend idea";
  const format = typeof raw.format === "string" ? raw.format : requestedFormat;
  const hook = typeof raw.hook === "string" ? raw.hook : "";
  const description = typeof raw.description === "string" ? raw.description : "";
  const whyItWorks = typeof raw.whyItWorks === "string" ? raw.whyItWorks : "";
  const hashtags = Array.isArray(raw.hashtags)
    ? raw.hashtags.filter((h): h is string => typeof h === "string")
    : [];
  const audioSuggestion = typeof raw.audioSuggestion === "string" ? raw.audioSuggestion : "";
  const score = typeof raw.predictedEngagementScore === "number" ? raw.predictedEngagementScore : 0;
  const bestTimeToPost = typeof raw.bestTimeToPost === "string" ? raw.bestTimeToPost : "";
  const cta = typeof raw.cta === "string" ? raw.cta : "";
  return { title, format, hook, description, whyItWorks, hashtags, audioSuggestion, predictedEngagementScore: score, bestTimeToPost, cta };
}

function parseSingleIdea(raw: string, requestedFormat: string): TrendIdea {
  return {
    title: "Idea inspired by post",
    format: requestedFormat,
    hook: raw.slice(0, 120),
    description: raw,
    whyItWorks: "AI returned unstructured output; refine the post or try again.",
    hashtags: ["#trending", "#viral", "#smallbusiness"],
    audioSuggestion: "Trending audio",
    predictedEngagementScore: 50,
    bestTimeToPost: "Weekday, 11:00 AM local time",
    cta: "Tap the link in bio.",
  };
}
