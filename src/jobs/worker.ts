import { startIntelligenceWorker } from "@/modules/intelligence/server";
import { env } from "@/shared/config";
import { logger, initSentry } from "@/shared/observability";
import { ensureSubscribers } from "@/server/subscribers";
import { startBullMQWorker } from "@/shared/queue/worker";
import { EVENTS_QUEUE } from "@/shared/events/queue-event-bus";
import { startWebhookRetention } from "./retention";
import { startAbandonedCartSweep } from "./abandoned-carts";

initSentry();

// Wire event subscribers before starting the event worker so the job registry
// knows how to dispatch each domain-event queue job.
ensureSubscribers();

logger.info("worker.starting", { redisConfigured: Boolean(env.REDIS_URL) });

startIntelligenceWorker();
if (env.REDIS_URL) {
  startBullMQWorker(EVENTS_QUEUE);
}
startWebhookRetention();
startAbandonedCartSweep();

// Keep the Node process alive. With Redis, the BullMQ worker connection already
// prevents exit; this interval is a safety net for the in-memory fallback.
setInterval(() => {
  logger.info("worker.heartbeat");
}, 60000);
