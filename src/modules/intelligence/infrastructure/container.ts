import { organizationQueries } from "@/modules/organizations";
import { ecommerceQueries } from "@/modules/ecommerce";
import { conversationQueries } from "@/modules/conversations";
import { crmQueries } from "@/modules/crm";
import { makeSignalIngestionService } from "../application/signal-ingestion";
import { makeEntityResolutionService } from "../application/entity-resolution";
import { makeTimelineService } from "../application/timeline";
import { makeMetricService } from "../application/metrics";
import { makeDataQualityService } from "../application/data-quality";
import { makeCustomerSummaryService } from "../application/customer-summary";
import type { MetricSourceProvider } from "../application/metrics";
import { makeDetectionService } from "../application/detection";
import { makeIntelligenceFeed } from "../application/intelligence-feed";
import {
  PrismaSignalRepository,
  PrismaEntityLinkRepository,
  PrismaDataQualityRepository,
  PrismaMetricRepository,
  PrismaBusinessInsightRepository,
} from "./repositories";

const signals = new PrismaSignalRepository();
const links = new PrismaEntityLinkRepository();
const issues = new PrismaDataQualityRepository();
const metrics = new PrismaMetricRepository();
const insights = new PrismaBusinessInsightRepository();

const metricProvider: MetricSourceProvider = {
  getWorkspaceOverview: organizationQueries.getOrganizationOverview.bind(organizationQueries),
  getConversationCount: async (storeId: string) => {
    const rows = await conversationQueries.listConversations(storeId, 1000);
    return rows.length;
  },
  getFollowerCount: async (storeId: string) => {
    const rows = await crmQueries.listFollowers(storeId, 1000);
    return rows.length;
  },
  getCouponCount: async (storeId: string) => {
    const rows = await ecommerceQueries.listCoupons(storeId, 1000);
    return rows.length;
  },
  getProductCount: async (storeId: string) => {
    const rows = await ecommerceQueries.listProducts(storeId, 1000);
    return rows.length;
  },
  getLastMessageAt: async (storeId: string) => {
    const conversations = await conversationQueries.listConversations(storeId, 500);
    const details = await Promise.all(
      conversations.map((c) => conversationQueries.getConversation(c.id)),
    );
    let latest: Date | null = null;
    for (const detail of details) {
      if (!detail) continue;
      for (const message of detail.messages) {
        if (message.sender === "CUSTOMER" && (!latest || message.createdAt > latest)) {
          latest = message.createdAt;
        }
      }
    }
    return latest;
  },
};

export const signalIngestionService = makeSignalIngestionService(signals);
export const entityResolutionService = makeEntityResolutionService(links);
export const timelineService = makeTimelineService(signals, links);
export const metricService = makeMetricService(metrics, metricProvider);
export const dataQualityService = makeDataQualityService(issues, metrics);
export const customerSummaryService = makeCustomerSummaryService();
export const detectionService = makeDetectionService({
  signals,
  insights,
  metrics,
  ecommerce: ecommerceQueries,
  conversations: conversationQueries,
  crm: crmQueries,
});
export const intelligenceFeedService = makeIntelligenceFeed({ insights });

export { signals, links, issues, metrics, insights };
