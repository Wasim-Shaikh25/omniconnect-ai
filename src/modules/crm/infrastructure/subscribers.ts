import type { EventBus, EventHandler } from "@/shared/events";
import { eventBus } from "@/shared/events";
import { logger } from "@/shared/observability";
import type { CouponGeneratedPayload } from "@/modules/ecommerce";
import type {
  MetaFollowReceivedPayload,
  MetaMessageReceivedPayload,
} from "@/modules/meta";
import { FirstTimeFollowerDetected } from "../domain/events";
import { PrismaCustomerRepository } from "./customer.repository";
import { PrismaFollowerRepository } from "./follower.repository";

const customers = new PrismaCustomerRepository();
const followers = new PrismaFollowerRepository();

// Subscribes by event name so this file imports only payload *types* from the
// ecommerce/meta barrels (erased at build time) — never their internals.
const onMetaMessageReceived: EventHandler = async (event) => {
  const p = event.payload as MetaMessageReceivedPayload;
  await customers.upsertByExternalId({
    storeId: p.storeId,
    channel: p.channel,
    externalUserId: p.externalUserId,
    username: p.username,
  });
};

const onMetaFollowReceived: EventHandler = async (event) => {
  const p = event.payload as MetaFollowReceivedPayload;
  const customer = await customers.upsertByExternalId({
    storeId: p.storeId,
    channel: p.channel,
    externalUserId: p.externalUserId,
    username: p.username,
  });

  const { isNew } = await followers.record({
    storeId: p.storeId,
    customerId: customer.id,
    externalUserId: p.externalUserId,
    username: p.username,
  });

  if (isNew) {
    await eventBus.publish(
      new FirstTimeFollowerDetected(customer.id, {
        storeId: p.storeId,
        customerId: customer.id,
        channel: p.channel,
        externalUserId: p.externalUserId,
        username: p.username,
      }),
    );
    logger.info("crm.firstTimeFollower", { storeId: p.storeId });
  }
};

const onCouponGenerated: EventHandler = async (event) => {
  const p = event.payload as CouponGeneratedPayload;
  if (!p.customerId) return;

  await customers.recordCouponSent({
    customerId: p.customerId,
    couponId: p.couponId,
  });
  logger.info("crm.couponSentRecorded", {
    storeId: p.storeId,
    customerId: p.customerId,
    couponId: p.couponId,
  });
};

/** Wires the crm module's event subscribers. Call once at startup. */
export function registerCrmSubscribers(bus: EventBus = eventBus): void {
  bus.subscribe("MetaMessageReceived", onMetaMessageReceived);
  bus.subscribe("MetaFollowReceived", onMetaFollowReceived);
  bus.subscribe("CouponGenerated", onCouponGenerated);
}
