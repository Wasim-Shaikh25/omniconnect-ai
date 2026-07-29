import { startIntelligenceWorker } from "@/modules/intelligence/server";
import { env } from "@/shared/config";
import { logger, initSentry } from "@/shared/observability";

initSentry();

// Importing the server barrel loads the composition root and registers queue
// handlers as a side effect, so we only need to start the worker here.
logger.info("worker.starting", { redisConfigured: Boolean(env.REDIS_URL) });

startIntelligenceWorker();

// Keep the Node process alive. With Redis, the BullMQ worker connection already
// prevents exit; this interval is a safety net for the in-memory fallback.
setInterval(() => {
  logger.info("worker.heartbeat");
}, 60000);
