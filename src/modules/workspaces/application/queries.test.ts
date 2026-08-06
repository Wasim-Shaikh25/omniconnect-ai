import { describe, it, expect } from "vitest";
import { makeOrganizationQueries } from "./queries";
import { Plan } from "../domain/plan";
import type { OrganizationRepository, StoreRecord } from "./ports";
import type { SessionUser } from "@/modules/auth";

function makeOrgRepo(): OrganizationRepository {
  return {
    create: async () => { throw new Error("not used"); },
    findById: async (id: string) => ({
      id,
      name: "Org",
      plan: Plan.BUSINESS,
      subscriptionId: null,
      subscriptionStatus: null,
    }),
    updatePlan: async () => null,
    incrementAIReplies: async () => true,
    incrementProfileInspections: async () => true,
  } as unknown as OrganizationRepository;
}

function makeStoreRepo(): {
  repo: Parameters<typeof makeOrganizationQueries>[0]["stores"];
  records: StoreRecord[];
} {
  const records: StoreRecord[] = [
    {
      id: "store-a",
      userId: "org-1",
      name: "Store A",
      provider: "SHOPIFY",
      domain: null,
    },
    {
      id: "store-b",
      userId: "org-1",
      name: "Store B",
      provider: "SHOPIFY",
      domain: null,
    },
  ] as unknown as StoreRecord[];
  return {
    repo: {
      create: async (input: Parameters<Parameters<typeof makeOrganizationQueries>[0]["stores"]["create"]>[0]) =>
        ({ id: "new-store", ...input } as unknown as StoreRecord),
      listByOrganization: async () => records,
      findById: async () => null,
    } as unknown as Parameters<typeof makeOrganizationQueries>[0]["stores"],
    records,
  };
}

function makeUser(role: SessionUser["role"], projectId: string | null, id = "user-1"): SessionUser {
  return {
    id,
    email: "user@example.com",
    name: "User",
    role,
    isSuperAdmin: false,
    emailVerified: new Date(),
    phone: null,
    phoneVerified: null,
    userId: "org-1",
    projectId,
    plan: "FREE",
  };
}

describe("getOrganizationOverview store scoping", () => {
  it("returns all stores for an owner", async () => {
    const { repo } = makeStoreRepo();
    const queries = makeOrganizationQueries({
      organizations: makeOrgRepo(),
      stores: repo,
    });
    const overview = await queries.getOrganizationOverview(
      "org-1",
      makeUser("USER", null, "org-1"),
    );
    expect(overview?.stores).toHaveLength(2);
  });

  it("returns only the assigned store for staff", async () => {
    const { repo } = makeStoreRepo();
    const queries = makeOrganizationQueries({
      organizations: makeOrgRepo(),
      stores: repo,
    });
    const overview = await queries.getOrganizationOverview(
      "org-1",
      makeUser("USER", "store-a"),
    );
    expect(overview?.stores).toHaveLength(1);
    expect(overview?.stores[0]?.id).toBe("store-a");
  });

  it("returns empty stores for staff without an assignment", async () => {
    const { repo } = makeStoreRepo();
    const queries = makeOrganizationQueries({
      organizations: makeOrgRepo(),
      stores: repo,
    });
    const overview = await queries.getOrganizationOverview(
      "org-1",
      makeUser("USER", null),
    );
    expect(overview?.stores).toHaveLength(0);
  });
});
