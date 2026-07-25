import type { AIConfigurationRepository, AIProvider } from "./ports";

export interface GenerateCaptionsInput {
  storeId: string;
  mediaType: "POST" | "REEL" | "STORY";
  productNames: string[];
  niche?: string | null;
  goal?: string | null;
}

export interface GeneratedCaption {
  caption: string;
  hook: string;
  hashtags: string[];
  predictedEngagementScore: number;
  bestTimeToPost: string;
}

export interface GenerateCaptions {
  (input: GenerateCaptionsInput): Promise<GeneratedCaption[]>;
}

const DEFAULT_TONE = "friendly and concise";

export function makeGenerateCaptions(deps: {
  aiProvider: AIProvider;
  aiConfigurationRepository: AIConfigurationRepository;
}): GenerateCaptions {
  return async function generateCaptions(input): Promise<GeneratedCaption[]> {
    const config = await deps.aiConfigurationRepository.getByStore(
      input.storeId,
    );
    const tone = config?.tone ?? DEFAULT_TONE;
    const niche = input.niche ?? "eCommerce";
    const goal = input.goal ?? "drive engagement and clicks to the store";

    const productList =
      input.productNames.length > 0
        ? input.productNames.join(", ")
        : "your products";

    const system = `You are a viral Instagram / Reels copywriter for ${niche} brands.
Tone: ${tone}.
Task: write 3 high-performing ${input.mediaType.toLowerCase()} captions designed to ${goal}.
For each caption return a JSON object with:
- caption (string, includes CTA and emojis if appropriate)
- hook (string, the first 1-2 lines that stop the scroll)
- hashtags (array of 10-15 niche, specific, low-competition hashtags, no banned/spam ones)
- predictedEngagementScore (number 0-100, higher when the copy is shareable/saveable)
- bestTimeToPost (string, a human-readable time like "Tomorrow, 7:00 PM EST")
Return only a JSON array of 3 objects. Do not wrap in markdown.`;

    const user = `Media type: ${input.mediaType}. Tagged products: ${productList}.`;
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
        return [parseSingleCaption(raw, input.mediaType)];
      }
      return parsed
        .map((item) => parseCaption(item, input.mediaType))
        .filter((c): c is GeneratedCaption => c !== null);
    } catch {
      return [parseSingleCaption(raw, input.mediaType)];
    }
  };
}

const DEFAULT_DEV_OUTPUT = JSON.stringify([
  {
    caption:
      "✨ New drop alert! These pieces are made to stand out. Tap to shop — limited stock. 👆",
    hook: "New drop alert! 🔥",
    hashtags: ["#smallbusiness", "#shopsmall", "#newarrivals"],
    predictedEngagementScore: 72,
    bestTimeToPost: "Tomorrow, 7:00 PM EST",
  },
  {
    caption:
      "POV: you finally found the [product] that matches your vibe. 😍 Link in bio to grab yours!",
    hook: "POV: you finally found the one. ✨",
    hashtags: ["#pov", "#musthave", "#shopnow"],
    predictedEngagementScore: 68,
    bestTimeToPost: "Tomorrow, 12:00 PM EST",
  },
  {
    caption:
      "How we style our best-seller this week 🎥 Save this for inspo and tag a friend who needs this.",
    hook: "How we style our best-seller 👀",
    hashtags: ["#styleinspo", "#fyp", "#reelsindia"],
    predictedEngagementScore: 75,
    bestTimeToPost: "Saturday, 10:00 AM EST",
  },
]);

function parseCaption(
  item: unknown,
  mediaType: string,
): GeneratedCaption | null {
  if (typeof item !== "object" || item === null) return null;
  const candidate = item as Record<string, unknown>;
  const caption =
    typeof candidate.caption === "string"
      ? candidate.caption
      : String(candidate.caption ?? "");
  if (!caption) return null;
  return {
    caption,
    hook:
      typeof candidate.hook === "string" ? candidate.hook : caption.split("\n")[0] ?? caption,
    hashtags: Array.isArray(candidate.hashtags)
      ? candidate.hashtags.filter((h): h is string => typeof h === "string")
      : [],
    predictedEngagementScore:
      typeof candidate.predictedEngagementScore === "number"
        ? Math.min(100, Math.max(0, candidate.predictedEngagementScore))
        : 50,
    bestTimeToPost:
      typeof candidate.bestTimeToPost === "string"
        ? candidate.bestTimeToPost
        : defaultBestTime(mediaType),
  };
}

function parseSingleCaption(raw: string, mediaType: string): GeneratedCaption {
  return {
    caption: raw,
    hook: raw.split("\n")[0] ?? raw,
    hashtags: [],
    predictedEngagementScore: 50,
    bestTimeToPost: defaultBestTime(mediaType),
  };
}

function defaultBestTime(mediaType: string): string {
  return `Tomorrow, ${mediaType === "REEL" ? "7:00 PM" : "12:00 PM"} EST`;
}
