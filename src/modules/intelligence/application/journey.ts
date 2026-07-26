import { eventBus } from "@/shared/events";
import type { AppendTouchpointInput, JourneyRepository } from "./ports";
import type { JourneyOutcome, JourneyRecord, JourneyStepType } from "../domain/types";
import { JourneyUpdated } from "../domain/events";

/** Maps a terminal touchpoint type to the journey outcome it implies. */
const OUTCOME_BY_STEP: Partial<Record<JourneyStepType, JourneyOutcome>> = {
  ORDER: "PURCHASE",
  DM: "INQUIRY",
  PROFILE_VISIT: "OPEN",
  POST_VIEW: "OPEN",
  COUPON_SENT: "OPEN",
};

export interface JourneyServiceInput {
  journeys: JourneyRepository;
  now?: () => Date;
}

export function makeJourneyService(input: JourneyServiceInput) {
  const now = () => input.now?.() ?? new Date();

  async function appendTouchpoint(touchpoint: AppendTouchpointInput): Promise<JourneyRecord> {
    const key = { customerId: touchpoint.customerId, externalUserId: touchpoint.externalUserId };
    let journey = await input.journeys.findOpen(touchpoint.organizationId, touchpoint.storeId, key);

    if (!journey) {
      journey = await input.journeys.create({
        organizationId: touchpoint.organizationId,
        storeId: touchpoint.storeId,
        customerId: touchpoint.customerId ?? null,
        externalUserId: touchpoint.externalUserId ?? null,
        channel: touchpoint.channel ?? touchpoint.step.channel ?? null,
        outcome: "OPEN",
      });
    }

    const inferredOutcome = touchpoint.outcome ?? OUTCOME_BY_STEP[touchpoint.step.type] ?? "OPEN";
    // Never downgrade a terminal outcome once reached.
    const outcome: JourneyOutcome =
      journey.outcome === "PURCHASE" || journey.outcome === "CHURNED" ? journey.outcome : inferredOutcome;

    const attributedPostId =
      touchpoint.attributedPostId ??
      (touchpoint.step.type === "POST_VIEW" ? touchpoint.step.externalId ?? null : undefined);

    const updated = await input.journeys.appendStep(
      journey.id,
      {
        type: touchpoint.step.type,
        externalId: touchpoint.step.externalId ?? null,
        channel: touchpoint.step.channel ?? touchpoint.channel ?? null,
        details: touchpoint.step.details ?? null,
        occurredAt: touchpoint.step.occurredAt ?? now(),
      },
      {
        outcome,
        attributedRevenue: touchpoint.attributedRevenue,
        attributedPostId,
      },
    );

    await eventBus.publish(
      new JourneyUpdated(updated.id, {
        journeyId: updated.id,
        organizationId: updated.organizationId,
        storeId: updated.storeId,
        stepType: touchpoint.step.type,
        outcome: updated.outcome,
      }),
    );

    return updated;
  }

  async function getJourney(id: string): Promise<JourneyRecord | null> {
    return input.journeys.findById(id);
  }

  async function listJourneys(organizationId: string, storeId?: string, limit = 50): Promise<JourneyRecord[]> {
    return input.journeys.list(organizationId, storeId, limit);
  }

  async function findJourneys(
    organizationId: string,
    query: { storeId?: string; externalUserId?: string; customerId?: string; postId?: string; couponCode?: string },
    limit = 50,
  ): Promise<JourneyRecord[]> {
    return input.journeys.search(organizationId, query, limit);
  }

  return { appendTouchpoint, getJourney, listJourneys, findJourneys };
}

export type JourneyService = ReturnType<typeof makeJourneyService>;
