import { makeConnectMeta } from "../application/connect-meta";
import { makeProcessMetaWebhook } from "../application/process-webhook";
import { makeMetaQueries } from "../application/queries";
import { PrismaMetaIntegrationRepository } from "./meta-integration.repository";
import { GraphApiMetaService } from "./meta.service";

const integrations = new PrismaMetaIntegrationRepository();

/** Composition root for the meta module. */
export const connectMeta = makeConnectMeta({ integrations });
export const processMetaWebhook = makeProcessMetaWebhook({ integrations });
export const metaQueries = makeMetaQueries({ integrations });
export const metaService = new GraphApiMetaService(integrations);
