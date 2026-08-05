import { eventBus } from "@/shared/events";
import { organizationQueries } from "@/modules/workspaces";
import { ecommerceQueries } from "@/modules/ecommerce";
import { conversationQueries } from "@/modules/conversations";
import { crmQueries } from "@/modules/crm";
import { socialQueries } from "@/modules/social";
import { notificationQueries } from "@/modules/notifications";
import { makeAnalyticsQueries } from "../application/queries";
import { metaService } from "@/modules/meta/server";
import {
  makeGetCompetitorBenchmark,
  makeGetCompetitorComparisonDashboard,
} from "../application/competitor-benchmark";
import { makeMarketingInsightsService } from "../application/marketing-insights";
import { makeQueryAnalytics } from "../application/query-analytics";
import { makePrismaDatasetFetcher } from "./prisma-dataset-fetcher";
import { env } from "@/shared/config";
import { PrismaTrackedAccountRepository } from "./tracked-account.repository";
import { PrismaMarketingInsightsRepository } from "./marketing-insights.repository";
import { PrismaDashboardShareRepository } from "./dashboard-share.repository";
import { makeDashboardShareCommands, makeDashboardShareQueries } from "../application/dashboard-share";

const trackedAccounts = new PrismaTrackedAccountRepository();
export const marketingInsightsRepository = new PrismaMarketingInsightsRepository();
const dashboardShares = new PrismaDashboardShareRepository();
export const marketingInsightsService = makeMarketingInsightsService({
  repository: marketingInsightsRepository,
});

/** Composition root for the analytics module. */
export const analyticsQueries = makeAnalyticsQueries({
  organizations: organizationQueries,
  ecommerce: ecommerceQueries,
  conversations: conversationQueries,
  crm: crmQueries,
  notifications: notificationQueries,
  trackedAccounts,
});

export const getCompetitorBenchmark = makeGetCompetitorBenchmark({
  trackedAccounts,
  eventBus,
});

export const getCompetitorComparisonDashboard = makeGetCompetitorComparisonDashboard({
  trackedAccounts,
  getAccountMedia: metaService.getAccountMedia.bind(metaService),
});

const fetchDataset = makePrismaDatasetFetcher({
  ecommerce: ecommerceQueries,
  crm: crmQueries,
  social: socialQueries,
  marketingInsights: marketingInsightsRepository,
});

export const queryAnalytics = makeQueryAnalytics({ fetchDataset });

export const dashboardShareCommands = makeDashboardShareCommands(dashboardShares, env.APP_URL);
export const dashboardShareQueries = makeDashboardShareQueries(dashboardShares);
