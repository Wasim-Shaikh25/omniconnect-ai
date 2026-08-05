import type { AIConfigurationRepository, AIProvider } from "./ports";
import { AIContextBuilder } from "./ai-context";
import { selectModel } from "./model-router";

export interface GenerateTrendsInput {
  storeId: string;
  niche: string;
  format?: "REEL" | "POST" | "CAROUSEL" | "STORY" | "ANY" | null;
  count?: number;
}

export interface TrendIdea {
  title: string;
  format: string;
  hook: string;
  description: string;
  whyItWorks: string;
  hashtags: string[];
  audioSuggestion: string;
  predictedEngagementScore: number;
  bestTimeToPost: string;
  cta: string;
  predictedRevenue?: number | null;
  suggestedPublishAt?: Date | null;
  basedOnMediaIds?: string[];
}

export interface GenerateTrends {
  (input: GenerateTrendsInput): Promise<TrendIdea[]>;
}

const DEFAULT_TONE = "trendy, authentic, and platform-native";

export function makeGenerateTrends(deps: {
  aiProvider: AIProvider;
  aiConfigurationRepository: AIConfigurationRepository;
}): GenerateTrends {
  return async function generateTrends(input): Promise<TrendIdea[]> {
    const config = await deps.aiConfigurationRepository.getByStore(input.storeId);
    const tone = config?.tone ?? DEFAULT_TONE;
    const niche = input.niche || "eCommerce";
    const format = input.format ?? "ANY";
    const count = Math.min(Math.max(input.count ?? 5, 1), 10);

    const system = `You are a social media trend analyst for Instagram. Tone: ${tone}.
Niche: ${niche}. Format focus: ${format}.
Return a JSON array of ${count} current, high-performing content ideas that are trending or likely to trend on Instagram right now.
For each idea return:
- title (string, punchy idea name)
- format (string, one of Reel/Post/Carousel/Story)
- hook (string, scroll-stopping first line)
- description (string, 2-3 sentences describing the video/post)
- whyItWorks (string, 1 sentence explaining the trend mechanic)
- hashtags (array of 10-15 niche hashtags, no banned/spam ones)
- audioSuggestion (string, trending audio style or sound cue)
- predictedEngagementScore (number 0-100)
- bestTimeToPost (string, human-readable like "Tuesday, 11:00 AM EST")
- cta (string, a short call-to-action)
Return only a JSON array. Do not wrap in markdown.`;

    const user = `Niche: ${niche}. Format: ${format}.`;
    const context = new AIContextBuilder()
      .withSystem(system)
      .withUser(user)
      .withModel(selectModel("trends", config?.model).model)
      .withFallback(DEFAULT_DEV_OUTPUT)
      .withOperation("trends")
      .withMetadata({ storeId: input.storeId, niche, format })
      .build();

    const raw = await deps.aiProvider.complete(context.messages, {
      model: context.model,
      fallback: context.fallback,
    });

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return [parseSingleTrend(raw, format)];
      }
      return parsed
        .map((item) => parseTrend(item, format))
        .filter((t): t is TrendIdea => t !== null)
        .slice(0, count);
    } catch {
      return [parseSingleTrend(raw, format)];
    }
  };
}

const DEFAULT_DEV_OUTPUT = JSON.stringify([
  {
    title: "Behind-the-scenes packing reel",
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

function parseTrend(item: unknown, requestedFormat: string): TrendIdea | null {
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
  const predictedRevenue = typeof raw.predictedRevenue === "number" ? raw.predictedRevenue : null;
  const suggestedPublishAt = typeof raw.suggestedPublishAt === "string" ? new Date(raw.suggestedPublishAt) : null;
  const basedOnMediaIds = Array.isArray(raw.basedOnMediaIds)
    ? raw.basedOnMediaIds.filter((id): id is string => typeof id === "string")
    : undefined;
  return { title, format, hook, description, whyItWorks, hashtags, audioSuggestion, predictedEngagementScore: score, bestTimeToPost, cta, predictedRevenue, suggestedPublishAt, basedOnMediaIds };
}

function parseSingleTrend(raw: string, requestedFormat: string): TrendIdea {
  return {
    title: "Trending idea",
    format: requestedFormat,
    hook: raw.slice(0, 120),
    description: raw,
    whyItWorks: "AI returned unstructured output; refine the niche or try again.",
    hashtags: ["#trending", "#viral", "#smallbusiness"],
    audioSuggestion: "Trending audio",
    predictedEngagementScore: 50,
    bestTimeToPost: "Weekday, 11:00 AM local time",
    cta: "Tap the link in bio.",
    predictedRevenue: null,
    suggestedPublishAt: null,
    basedOnMediaIds: undefined,
  };
}
