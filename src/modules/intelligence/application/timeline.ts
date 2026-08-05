import type { SignalRepository, EntityLinkRepository } from "./ports";
import type { JourneyStage, TimelineEvent, SignalRecord, ConfidenceLevel } from "../domain/types";

export interface TimelineQuery {
  userId: string;
  subjectType: string;
  subjectId: string;
  includeLinked?: boolean;
  limit?: number;
}

function stageFromSignal(signal: SignalRecord): JourneyStage | null {
  if (!signal.stage) return null;
  const stages: JourneyStage[] = [
    "Discovery",
    "Engagement",
    "Consideration",
    "Purchase",
    "Fulfillment",
    "Retention",
    "Advocacy",
  ];
  return stages.includes(signal.stage as JourneyStage) ? (signal.stage as JourneyStage) : null;
}

function describeSignal(signal: SignalRecord): { title: string; description: string | null } {
  const data = (signal.data ?? {}) as Record<string, unknown>;
  switch (signal.eventType) {
    case "MetaFollowReceived":
    case "FirstTimeFollowerDetected":
      return {
        title: "New follower",
        description: typeof data.username === "string" ? `@${data.username}` : null,
      };
    case "MetaMessageReceived":
    case "NewMessage":
      return {
        title: "Message received",
        description: typeof data.content === "string" ? data.content.slice(0, 120) : null,
      };
    case "ConversationTakenOver":
      return { title: "Human took over conversation", description: null };
    case "AIResumed":
      return { title: "AI resumed conversation", description: null };
    case "CouponGenerated":
      return {
        title: "Coupon sent",
        description: typeof data.code === "string" ? `Code: ${data.code}` : null,
      };
    case "ProductsSynced":
      return {
        title: "Products synced",
        description: typeof data.count === "number" ? `${data.count} products` : null,
      };
    case "CustomerProfileUpdated":
      return { title: "Profile updated", description: "Tags or interests changed" };
    case "OrderPlaced":
      return {
        title: "Order placed",
        description: `Total: ${data.total ?? "unknown"}`,
      };
    default:
      return { title: signal.eventType, description: null };
  }
}

function deepLinkFor(signal: SignalRecord): string | null {
  switch (signal.subjectType) {
    case "conversation":
      return `/stores/${signal.projectId}/conversations/${signal.subjectId}`;
    case "customer":
      return `/customers/${signal.subjectId}`;
    case "order":
      return `/stores/${signal.projectId}/orders`;
    default:
      return null;
  }
}

function toConfidence(value?: ConfidenceLevel): ConfidenceLevel | null {
  return value ?? null;
}

function toTimelineEvent(signal: SignalRecord): TimelineEvent {
  const { title, description } = describeSignal(signal);
  return {
    id: signal.id,
    type: signal.eventType,
    stage: stageFromSignal(signal),
    title,
    description,
    timestamp: signal.occurredAt,
    source: signal.source,
    confidence:
      toConfidence((signal.relatedEntities?.[0]?.confidence as ConfidenceLevel) ?? undefined) ??
      (signal.qualityStatus === "ok" ? "VERIFIED" : "PROBABLE"),
    relatedEntities: signal.relatedEntities.map((e) => ({
      type: e.type,
      id: e.id,
      label: `${e.type}:${e.id.slice(0, 8)}`,
    })),
    deepLink: deepLinkFor(signal),
  };
}

export function makeTimelineService(
  signals: SignalRepository,
  links: EntityLinkRepository,
) {
  return {
    async getTimeline(query: TimelineQuery): Promise<TimelineEvent[]> {
      const allSignals: SignalRecord[] = [];

      const subjectSignals = await signals.listBySubject(
        query.userId,
        query.subjectType,
        query.subjectId,
        query.limit ?? 100,
      );
      const relatedSignals = await signals.listByRelatedEntity(
        query.userId,
        query.subjectType,
        query.subjectId,
        query.limit ?? 100,
      );
      allSignals.push(...subjectSignals, ...relatedSignals);

      if (query.includeLinked !== false) {
        const related = await links.findByEntity(
          query.userId,
          query.subjectType,
          query.subjectId,
          true,
        );

        for (const link of related) {
          const [type, id] =
            link.sourceType === query.subjectType && link.sourceId === query.subjectId
              ? [link.targetType, link.targetId]
              : [link.sourceType, link.sourceId];
          const linked = await signals.listBySubject(query.userId, type, id, 20);
          allSignals.push(...linked);
        }
      }

      const unique = Array.from(new Map(allSignals.map((s) => [s.id, s])).values());
      const events = unique.map(toTimelineEvent);
      events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return events.slice(0, query.limit ?? 100);
    },
  };
}

export type TimelineService = ReturnType<typeof makeTimelineService>;
