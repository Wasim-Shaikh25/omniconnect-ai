import { eventBus } from "@/shared/events";
import type { SignalRepository } from "./ports";
import { SignalIngested } from "../domain/events";
import type { JourneyStage, SignalRecord } from "../domain/types";

export interface IngestSignalInput {
  userId: string;
  projectId: string;
  eventType: string;
  subjectType: string;
  subjectId: string;
  stage?: JourneyStage | null;
  relatedEntities?: Array<{ type: string; id: string; confidence?: string }>;
  data?: unknown;
  lineage?: unknown;
  source: string;
  occurredAt: Date;
  traceId?: string | null;
}

const eventTypeToStage: Record<string, JourneyStage> = {
  MetaFollowReceived: "Discovery",
  FirstTimeFollowerDetected: "Discovery",
  MetaMessageReceived: "Engagement",
  NewMessage: "Engagement",
  ConversationTakenOver: "Engagement",
  AIResumed: "Engagement",
  CouponGenerated: "Consideration",
  CouponDisabled: "Consideration",
  ProductsSynced: "Advocacy",
  CustomerProfileUpdated: "Retention",
};

function toConfidence(value?: string): SignalRecord["relatedEntities"][number]["confidence"] {
  if (value === "VERIFIED" || value === "PROBABLE" || value === "POSSIBLE" || value === "REJECTED") {
    return value;
  }
  return undefined;
}

export function makeSignalIngestionService(signals: SignalRepository) {
  return {
    async ingest(input: IngestSignalInput): Promise<SignalRecord> {
      const stage = input.stage ?? eventTypeToStage[input.eventType] ?? null;
      const ingestedAt = new Date();
      const freshnessMs = ingestedAt.getTime() - input.occurredAt.getTime();

      const qualityStatus = freshnessMs > 600_000 ? "stale" : "ok";

      const signal = await signals.save({
        userId: input.userId,
        projectId: input.projectId,
        eventType: input.eventType,
        schemaVersion: 1,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        stage,
        relatedEntities:
          input.relatedEntities?.map((e) => ({
            type: e.type,
            id: e.id,
            confidence: toConfidence(e.confidence),
          })) ?? [],
        data: input.data ?? null,
        lineage: input.lineage ?? null,
        source: input.source,
        occurredAt: input.occurredAt,
        ingestedAt,
        freshnessMs,
        qualityStatus,
        quarantineReason: qualityStatus === "stale" ? "Freshness SLA exceeded" : null,
        traceId: input.traceId ?? null,
      });

      await eventBus.publish(new SignalIngested(signal.id, { signal }));
      return signal;
    },
  };
}

export type SignalIngestionService = ReturnType<typeof makeSignalIngestionService>;
