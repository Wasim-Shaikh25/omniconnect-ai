import type { NotificationQueries, NotificationService } from "@/modules/notifications";
import type { BusinessInsightRecord, RecommendationRecord } from "../domain/types";

export type NotificationDeliveryTier = "CRITICAL_INTERRUPT" | "ACTION_REQUIRED" | "TODAY_FEED" | "DIGEST" | "ON_DEMAND";

export interface ProactiveNotificationServiceInput {
  notifications: NotificationService;
  notificationQueries: NotificationQueries;
  cooldownMs?: number;
  quietHours?: { start: number; end: number };
}

function tierForInsight(insight: BusinessInsightRecord): NotificationDeliveryTier {
  if (insight.severity === "CRITICAL") return "CRITICAL_INTERRUPT";
  if (insight.severity === "HIGH") return "ACTION_REQUIRED";
  if (insight.severity === "MEDIUM") return "TODAY_FEED";
  return "DIGEST";
}

function tierForRecommendation(rec: RecommendationRecord): NotificationDeliveryTier {
  if (rec.riskTier === "TIER_4" || rec.urgency === "critical") return "CRITICAL_INTERRUPT";
  if (rec.riskTier === "TIER_3" || rec.urgency === "high") return "ACTION_REQUIRED";
  if (rec.riskTier === "TIER_2" || rec.urgency === "medium") return "TODAY_FEED";
  return "DIGEST";
}

function isQuietHour(now: Date, quietHours: { start: number; end: number }): boolean {
  const hour = now.getHours();
  if (quietHours.start < quietHours.end) {
    return hour >= quietHours.start && hour < quietHours.end;
  }
  return hour >= quietHours.start || hour < quietHours.end;
}

export function makeProactiveNotificationService(input: ProactiveNotificationServiceInput) {
  const cooldownMs = input.cooldownMs ?? 24 * 60 * 60 * 1000;
  const quietHours = input.quietHours ?? { start: 22, end: 8 };

  async function notifyInsight(insight: BusinessInsightRecord): Promise<void> {
    if (!insight.storeId) return;
    const tier = tierForInsight(insight);
    if (tier === "DIGEST" || tier === "ON_DEMAND") return;

    const dedupKey = `insight:${insight.id}`;
    const recent = await input.notificationQueries.findRecentByDedupKey(
      dedupKey,
      new Date(Date.now() - cooldownMs),
    );
    if (recent.length > 0) return;

    if (isQuietHour(new Date(), quietHours) && tier !== "CRITICAL_INTERRUPT") return;

    await input.notifications.notify({
      storeId: insight.storeId,
      type: "INTELLIGENCE",
      title: insight.title,
      body: insight.description,
      tier,
      dedupKey,
    });
  }

  async function notifyRecommendation(recommendation: RecommendationRecord): Promise<void> {
    if (!recommendation.storeId) return;
    const tier = tierForRecommendation(recommendation);
    if (tier === "DIGEST" || tier === "ON_DEMAND") return;

    const dedupKey = `recommendation:${recommendation.id}`;
    const recent = await input.notificationQueries.findRecentByDedupKey(
      dedupKey,
      new Date(Date.now() - cooldownMs),
    );
    if (recent.length > 0) return;

    if (isQuietHour(new Date(), quietHours) && tier !== "CRITICAL_INTERRUPT") return;

    await input.notifications.notify({
      storeId: recommendation.storeId,
      type: "INTELLIGENCE",
      title: recommendation.title,
      body: recommendation.description,
      tier,
      dedupKey,
    });
  }

  return { notifyInsight, notifyRecommendation };
}

export type ProactiveNotificationService = ReturnType<typeof makeProactiveNotificationService>;
