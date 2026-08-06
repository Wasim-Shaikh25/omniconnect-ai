import { z } from "zod";
import { eventBus } from "@/shared/events";
import { Result, ok, err } from "@/shared/kernel";
import { ECOMMERCE_PROVIDERS } from "../domain/provider";
import { OrganizationNotFoundError, StoreLimitError } from "../domain/errors";
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

  return async function createStore(
    raw: CreateStoreInput,
  ): Promise<Result<StoreRecord, OrganizationNotFoundError | StoreLimitError>> {
    const input = createStoreSchema.parse(raw);

    const org = await deps.organizations.findById(input.userId);
    if (!org) return err(new OrganizationNotFoundError(input.userId));

    // Billing enforcement: respect the plan's store limit.
    const maxStores = await resolveMaxStores(org.plan);
    const existing = await deps.stores.listByOrganization(input.userId);
    if (!isWithinLimit(maxStores, existing.length)) {
      return err(
        new StoreLimitError(
          `Your ${org.plan} plan allows up to ${maxStores} store(s). Upgrade to add more.`,
        ),
      );
    }

    const store = await deps.stores.create(
      {
        userId: input.userId,
        name: input.name,
        provider: input.provider,
        domain: input.domain ?? null,
      },
      maxStores,
    );

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
