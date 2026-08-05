import { describe, it, expect } from "vitest";
import { makeCreateStore } from "./create-store";
import { StoreLimitError } from "../domain/errors";
import { Plan } from "../domain/plan";
import type { OrganizationRepository, StoreRecord, StoreRepository } from "./ports";

function makeOrgRepo(plan: Plan): OrganizationRepository {
  return {
    create: async () => { throw new Error("not used"); },
    findById: async (id: string) => ({
      id,
      name: "Org",
      plan,
      subscriptionId: null,
      subscriptionStatus: null,
    }),
    updatePlan: async () => null,
  } as unknown as OrganizationRepository;
}

function makeStoreRepo(count: number): StoreRepository {
  const stores: StoreRecord[] = Array.from({ length: count }, (_, i) => ({
    id: `store-${i}`,
    userId: "org-1",
    name: `Store ${i}`,
    provider: "SHOPIFY",
    domain: null,
  })) as unknown as StoreRecord[];
  return {
    create: async (input: Parameters<StoreRepository["create"]>[0]) =>
      ({ id: "new-store", ...input } as unknown as StoreRecord),
    listByOrganization: async () => stores,
    findById: async () => null,
  } as unknown as StoreRepository;
}

describe("createStore billing enforcement", () => {
  it("blocks creating a second store on the FREE plan", async () => {
    const createStore = makeCreateStore({
      organizations: makeOrgRepo(Plan.FREE),
      stores: makeStoreRepo(1),
    });
    const result = await createStore({ userId: "org-1", name: "Second", provider: "SHOPIFY" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(StoreLimitError);
  });

  it("allows unlimited stores on the PRO plan", async () => {
    const createStore = makeCreateStore({
      organizations: makeOrgRepo(Plan.PRO),
      stores: makeStoreRepo(25),
    });
    const result = await createStore({ userId: "org-1", name: "Another", provider: "SHOPIFY" });
    expect(result.ok).toBe(true);
  });
});
