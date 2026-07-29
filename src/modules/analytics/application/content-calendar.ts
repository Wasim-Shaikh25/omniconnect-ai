import type { MetaMediaItem } from "@/modules/meta";
import type { OrderRecord, ProductRecord } from "@/modules/ecommerce";
import { getBestTimeToPost } from "./best-time-to-post";

export interface ContentCalendarSlot {
  date: Date;
  publishAt: Date;
  dayOfWeek: string;
  hour: number;
  format: "REEL" | "CAROUSEL" | "POST" | "STORY";
  suggestedCaption: string;
  suggestedHashtags: string[];
  productNames: string[];
  reason: string;
}

function dayIndexFromName(name: string): number | null {
  const idx = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(name);
  return idx >= 0 ? idx : null;
}

const FORMATS: ContentCalendarSlot["format"][] = ["REEL", "CAROUSEL", "POST", "STORY", "REEL"];

function pickFormat(index: number): ContentCalendarSlot["format"] {
  return FORMATS[index % FORMATS.length] ?? "REEL";
}

export function getContentCalendar(input: {
  media: MetaMediaItem[];
  orders: Pick<OrderRecord, "orderDate" | "total">[];
  products: Pick<ProductRecord, "title">[];
  days?: number;
  timezoneOffsetHours?: number;
}): ContentCalendarSlot[] {
  const windows = getBestTimeToPost({ media: input.media, orders: input.orders, topN: 20 });
  const days = input.days ?? 7;
  const now = new Date();
  const slots: ContentCalendarSlot[] = [];

  for (let i = 0; i < days; i++) {
    const candidate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const dayIndex = candidate.getUTCDay();
    const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dayIndex] ?? "Monday";

    let window = windows.find((w) => dayIndexFromName(w.dayOfWeek) === dayIndex);
    if (!window) window = windows[0];
    if (!window) {
      window = { dayOfWeek: dayName, hour: 11, label: `${dayName} 11:00 UTC`, engagementScore: 0, revenueScore: 0, compositeScore: 0, postCount: 0, orderCount: 0 };
    }

    const publishAt = new Date(Date.UTC(candidate.getUTCFullYear(), candidate.getUTCMonth(), candidate.getUTCDate(), window.hour, 0, 0));
    const offset = (input.timezoneOffsetHours ?? 0) * 60 * 60 * 1000;
    const localPublishAt = new Date(publishAt.getTime() + offset);

    const productsToFeature = input.products.slice(0, 3).map((p) => p.title);
    const format = pickFormat(i);

    const hooks: Record<ContentCalendarSlot["format"], string> = {
      REEL: "Show your best-seller in action — 15 seconds, no fluff.",
      CAROUSEL: "3-slide before/after or this-or-that with a poll in the caption.",
      POST: "Single-image lifestyle shot with a clear CTA and one product link.",
      STORY: "Behind-the-scenes or quick FAQ sticker with a swipe-up/link sticker.",
    };

    const topHashtags = input.media
      .flatMap((m) => m.hashtags)
      .reduce<Record<string, number>>((acc, tag) => {
        acc[tag] = (acc[tag] ?? 0) + 1;
        return acc;
      }, {});
    const trendingHashtags = Object.entries(topHashtags)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => `#${tag}`);

    slots.push({
      date: candidate,
      publishAt: localPublishAt,
      dayOfWeek: window.dayOfWeek,
      hour: window.hour,
      format,
      suggestedCaption: hooks[format],
      suggestedHashtags: trendingHashtags.length > 0 ? trendingHashtags : ["#smallbusiness", "#trending", "#shoplocal"],
      productNames: productsToFeature,
      reason: `Best posting window based on ${window.postCount} post(s) and ${window.orderCount} order(s) at ${window.label} (score ${Math.round(window.compositeScore)}).`,
    });
  }

  return slots;
}
