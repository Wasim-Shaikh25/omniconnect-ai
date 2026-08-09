import { z } from "zod";
import { eventBus } from "@/shared/events";
import { Result, ok, err } from "@/shared/kernel";
import { ECOMMERCE_PROVIDERS } from "../domain/provider";
import {
  OrganizationNotFoundError,
  StoreLimitError,
  StoreNameExistsError,
} from "../domain/errors";
import { isWithinLimit, Plan, PLAN_LIMITS } from "../domain/plan";
import { StoreCreated } from "../domain/events";
import {
  OrganizationRepository,
  PlanConfigRepository,
  StoreRecord,
  StoreRepository,
} from "./ports";

export const createStoreSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1).max(120),
  provider: z.enum(ECOMMERCE_PROVIDERS).default("SHOPIFY"),
  domain: z.string().max(255).optional(),
});

export type CreateStoreInput = z.infer<typeof createStoreSchema>;

export function makeCreateStore(deps: {
  organizations: OrganizationRepository;
  stores: StoreRepository;
  planConfigs: PlanConfigRepository;
}) {
  async function resolveMaxStores(plan: Plan): Promise<number | null> {
    const config = await deps.planConfigs.findByPlan(plan);
    if (config && !config.isDefault) return config.maxStores;
    return PLAN_LIMITS[plan].maxStores;
  }

  async function resolveMaxProjects(plan: Plan): Promise<number | null> {
    const config = await deps.planConfigs.findByPlan(plan);
    if (config && !config.isDefault) return config.maxProjects;
    return PLAN_LIMITS[plan].maxProjects;
  }

  function stricterLimit(a: number | null, b: number | null): number | null {
    if (a === null) return b;
    if (b === null) return a;
    return Math.min(a, b);
  }

  return async function createStore(
    raw: CreateStoreInput,
  ): Promise<
    Result<StoreRecord, OrganizationNotFoundError | StoreLimitError | StoreNameExistsError>
  > {
    const input = createStoreSchema.parse(raw);

    const org = await deps.organizations.findById(input.userId);
    if (!org) return err(new OrganizationNotFoundError(input.userId));

    // Billing enforcement: respect both the store and project plan limits.
    const maxStores = await resolveMaxStores(org.plan);
    const maxProjects = await resolveMaxProjects(org.plan);
    const projectLimit = stricterLimit(maxStores, maxProjects);
    const existing = await deps.stores.listByOrganization(input.userId);
    if (!isWithinLimit(projectLimit, existing.length)) {
      return err(
        new StoreLimitError(
          `Your ${org.plan} plan allows up to ${projectLimit} store(s). Upgrade to add more.`,
        ),
      );
    }

    let store: StoreRecord;
    try {
      store = await deps.stores.create(
        {
          userId: input.userId,
          name: input.name,
          provider: input.provider,
          domain: input.domain ?? null,
        },
        projectLimit,
      );
    } catch (error) {
      if (error instanceof StoreNameExistsError) {
        return err(error);
      }
      throw error;
    }

    await eventBus.publish(
      new StoreCreated(store.id, {
        projectId: store.id,
        userId: store.userId,
        name: store.name,
        provider: store.provider,
      }),
    );

    return ok(store);
  };
}
