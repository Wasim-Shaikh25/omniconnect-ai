import { z } from "zod";
import { eventBus } from "@/shared/events";
import { Result, ok, err } from "@/shared/kernel";
import { ECOMMERCE_PROVIDERS } from "../domain/provider";
import { OrganizationNotFoundError } from "../domain/errors";
import { StoreCreated } from "../domain/events";
import { OrganizationRepository, StoreRecord, StoreRepository } from "./ports";

export const createStoreSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().min(1).max(120),
  provider: z.enum(ECOMMERCE_PROVIDERS).default("SHOPIFY"),
  domain: z.string().max(255).optional(),
});

export type CreateStoreInput = z.infer<typeof createStoreSchema>;

export function makeCreateStore(deps: {
  organizations: OrganizationRepository;
  stores: StoreRepository;
}) {
  return async function createStore(
    raw: CreateStoreInput,
  ): Promise<Result<StoreRecord, OrganizationNotFoundError>> {
    const input = createStoreSchema.parse(raw);

    const org = await deps.organizations.findById(input.organizationId);
    if (!org) return err(new OrganizationNotFoundError(input.organizationId));

    const store = await deps.stores.create({
      organizationId: input.organizationId,
      name: input.name,
      provider: input.provider,
      domain: input.domain ?? null,
    });

    await eventBus.publish(
      new StoreCreated(store.id, {
        storeId: store.id,
        organizationId: store.organizationId,
        name: store.name,
        provider: store.provider,
      }),
    );

    return ok(store);
  };
}
