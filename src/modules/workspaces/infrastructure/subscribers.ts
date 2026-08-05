import type { EventBus, EventHandler } from "@/shared/events";
import { eventBus } from "@/shared/events";
import { logger } from "@/shared/observability";
import { prisma } from "@/shared/database";
import type { UserRegisteredPayload } from "@/modules/auth";
import type { ProductsSyncedPayload } from "@/modules/ecommerce";
import { OrganizationCreated } from "../domain/events";

// Subscribes by event name so this file never imports another module's
// infrastructure — only the payload *type* (erased at build time).
const onUserRegistered: EventHandler = async (event) => {
  const { userId, email, autoProvisionOrganization } =
    event.payload as UserRegisteredPayload;

  // Credentials registrations intentionally do not auto-provision, so the
  // user is routed to `/onboarding` to create the workspace explicitly.
  if (autoProvisionOrganization === false) return;

  // Idempotency: an OAuth user should only be linked to their own tenant once.
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { userId: true },
  });
  if (existing?.userId) {
    logger.info("organizations.alreadyProvisioned", { userId });
    return;
  }

  const localPart = email.split("@")[0] ?? "My";

  // The owner User is its own tenant. The `users` subscriber will persist `userId`.
  await eventBus.publish(
    new OrganizationCreated(userId, {
      userId,
      ownerUserId: userId,
      name: `${localPart}'s Organization`,
    }),
  );
  logger.info("organizations.provisioned", { userId });
};

const onProductsSynced: EventHandler = async (event) => {
  const { projectId, count } = event.payload as ProductsSyncedPayload;

  try {
    await prisma.project.update({
      where: { id: projectId },
      data: { lastProductSyncAt: new Date() },
    });
    logger.info("organizations.productsSyncRecorded", { projectId, count });
  } catch (error) {
    logger.error("organizations.productsSyncRecordFailed", {
      projectId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/** Wires the organizations module's event subscribers. Call once at startup. */
export function registerOrganizationSubscribers(bus: EventBus = eventBus): void {
  bus.subscribe("UserRegistered", onUserRegistered);
  bus.subscribe("ProductsSynced", onProductsSynced);
}
