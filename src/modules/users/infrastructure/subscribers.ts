import type { EventBus, EventHandler } from "@/shared/events";
import { eventBus } from "@/shared/events";
import { logger } from "@/shared/observability";
import type { OrganizationCreatedPayload } from "@/modules/organizations";
import { PrismaUserProfileRepository } from "./user.repository";

const users = new PrismaUserProfileRepository();

// Subscribes by event name; only the payload *type* is imported (erased at build).
const onOrganizationCreated: EventHandler = async (event) => {
  const { organizationId, ownerUserId } =
    event.payload as OrganizationCreatedPayload;
  await users.setOrganization(ownerUserId, organizationId);
  logger.info("users.linkedToOrganization", { ownerUserId, organizationId });
};

/** Wires the users module's event subscribers. Call once at startup. */
export function registerUsersSubscribers(bus: EventBus = eventBus): void {
  bus.subscribe("OrganizationCreated", onOrganizationCreated);
}
