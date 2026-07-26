import { describe, it, expect, beforeEach } from "vitest";
import { makeJourneyService } from "./journey";
import type { JourneyRepository } from "./ports";
import type { JourneyRecord } from "../domain/types";

let idCounter = 0;
const nextId = (p: string) => `${p}-${++idCounter}`;

function makeFakeJourneys(): JourneyRepository & { store: JourneyRecord[] } {
  const store: JourneyRecord[] = [];
  return {
    store,
    async findOpen(organizationId, storeId, key) {
      return (
        store.find(
          (j) =>
            j.organizationId === organizationId &&
            j.storeId === storeId &&
            j.outcome !== "PURCHASE" &&
            j.outcome !== "CHURNED" &&
            ((key.customerId && j.customerId === key.customerId) ||
              (key.externalUserId && j.externalUserId === key.externalUserId)),
        ) ?? null
      );
    },
    async create(journey) {
      const record: JourneyRecord = {
        ...journey,
        id: nextId("journey"),
        attributedRevenue: null,
        attributedPostId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        steps: [],
      };
      store.push(record);
      return record;
    },
    async appendStep(journeyId, step, update) {
      const j = store.find((x) => x.id === journeyId)!;
      j.steps.push({
        ...step,
        id: nextId("step"),
        journeyId,
        createdAt: new Date(),
      });
      if (update.outcome) j.outcome = update.outcome;
      if (update.attributedRevenue !== undefined && update.attributedRevenue !== null) {
        j.attributedRevenue = update.attributedRevenue;
      }
      if (update.attributedPostId !== undefined && update.attributedPostId !== null) {
        j.attributedPostId = update.attributedPostId;
      }
      return j;
    },
    async findById(id) {
      return store.find((j) => j.id === id) ?? null;
    },
    async list(organizationId, storeId) {
      return store.filter(
        (j) => j.organizationId === organizationId && (storeId ? j.storeId === storeId : true),
      );
    },
    async search() {
      return [];
    },
  };
}

describe("journeyService.appendTouchpoint", () => {
  beforeEach(() => {
    idCounter = 0;
  });

  it("links sequential touchpoints into a single journey", async () => {
    const journeys = makeFakeJourneys();
    const svc = makeJourneyService({ journeys });

    await svc.appendTouchpoint({
      organizationId: "org-1",
      storeId: "store-1",
      externalUserId: "u-1",
      step: { type: "POST_VIEW", externalId: "post-9" },
    });
    const j = await svc.appendTouchpoint({
      organizationId: "org-1",
      storeId: "store-1",
      externalUserId: "u-1",
      step: { type: "DM" },
    });

    expect(journeys.store.length).toBe(1);
    expect(j.steps.map((s) => s.type)).toEqual(["POST_VIEW", "DM"]);
    expect(j.attributedPostId).toBe("post-9");
    expect(j.outcome).toBe("INQUIRY");
  });

  it("marks PURCHASE on order and never downgrades a terminal outcome", async () => {
    const journeys = makeFakeJourneys();
    const svc = makeJourneyService({ journeys });

    await svc.appendTouchpoint({
      organizationId: "org-1",
      storeId: "store-1",
      customerId: "c-1",
      outcome: "PURCHASE",
      attributedRevenue: 99,
      step: { type: "ORDER", externalId: "order-1" },
    });
    const j = await svc.appendTouchpoint({
      organizationId: "org-1",
      storeId: "store-1",
      customerId: "c-1",
      step: { type: "DM" },
    });

    // A new journey is opened for post-terminal touchpoints; the purchased one keeps PURCHASE.
    const purchased = journeys.store.find((x) => x.outcome === "PURCHASE");
    expect(purchased).toBeDefined();
    expect(purchased!.attributedRevenue).toBe(99);
    expect(j.outcome).not.toBe("PURCHASE");
  });
});
