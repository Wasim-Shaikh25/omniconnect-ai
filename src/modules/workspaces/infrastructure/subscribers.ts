import type { EventBus, EventHandler } from "@/shared/events";
import { eventBus } from "@/shared/events";
import { logger } from "@/shared/observability";
import { prisma } from "@/shared/database";
import type { UserRegisteredPayload } from "@/modules/auth";
import type { ProductsSyncedPayload } from "@/modules/ecommerce";
import { OrganizationCreated } from "../domain/events";
import { PrismaOrganizationRepository } from "./organization.repository";

const organizations = new PrismaOrganizationRepository();

// Subscribes by event name so this file never imports another module's
// infrastructure — only the payload *type* (erased at build time).
const onUserRegistered: EventHandler = async (event) => {
  const { userId, email, autoProvisionOrganization } =
    event.payload as UserRegisteredPayload;

  // Credentials registrations intentionally do not auto-provision, so the
  // user is routed to `/onboarding` to create the workspace explicitly.
  if (autoProvisionOrganization === false) return;

  // Idempotency: a user may already have a workspace and should not get a second one.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { workspaces: { select: { id: true }, take: 1 } },
  });
  if (user?.workspaces.length) {
    logger.info("organizations.alreadyProvisioned", { userId });
    return;
  }

  const localPart = email.split("@")[0] ?? "My";
  const org = await organizations.create({
    name: `${localPart}'s Organization`,
    email,
  });

  await eventBus.publish(
    new OrganizationCreated(org.id, {
      userId: org.id,
      ownerUserId: userId,
      name: org.name,
    }),
  );
  logger.info("organizations.provisioned", { userId: org.id });
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
