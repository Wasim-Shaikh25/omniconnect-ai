import type { EventBus, EventHandler } from "@/shared/events";
import { eventBus } from "@/shared/events";
import { logger } from "@/shared/observability";
import type { OrganizationCreatedPayload } from "@/modules/workspaces";
import { PrismaUserProfileRepository } from "./user.repository";

const users = new PrismaUserProfileRepository();

// Subscribes by event name; only the payload *type* is imported (erased at build).
const onOrganizationCreated: EventHandler = async (event) => {
  const { userId, ownerUserId } =
    event.payload as OrganizationCreatedPayload;
  await users.setOrganization(ownerUserId, userId);
  logger.info("users.linkedToOrganization", { ownerUserId, userId });
};

/** Wires the users module's event subscribers. Call once at startup. */
export function registerUsersSubscribers(bus: EventBus = eventBus): void {
  bus.subscribe("OrganizationCreated", onOrganizationCreated);
}
