import type { EventBus, EventHandler } from "@/shared/events";
import { eventBus } from "@/shared/events";
import { logger } from "@/shared/observability";
import { prisma } from "@/shared/database";
import type { UserRegisteredPayload } from "@/modules/auth";
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

  // Idempotency: a user may already have an organization (e.g. re-login,
  // onboarding retried) and should not get a second one.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  });
  if (user?.organizationId) {
    logger.info("organizations.alreadyProvisioned", { userId, organizationId: user.organizationId });
    return;
  }

  const localPart = email.split("@")[0] ?? "My";
  const org = await organizations.create({ name: `${localPart}'s Organization` });

  await eventBus.publish(
    new OrganizationCreated(org.id, {
      organizationId: org.id,
      ownerUserId: userId,
      name: org.name,
    }),
  );
  logger.info("organizations.provisioned", { organizationId: org.id, userId });
};

/** Wires the organizations module's event subscribers. Call once at startup. */
export function registerOrganizationSubscribers(bus: EventBus = eventBus): void {
  bus.subscribe("UserRegistered", onUserRegistered);
}
