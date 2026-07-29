import { eventBus } from "@/shared/events";
import { organizationQueries } from "@/modules/organizations";
import { ecommerceQueries } from "@/modules/ecommerce";
import { conversationQueries } from "@/modules/conversations";
import { crmQueries } from "@/modules/crm";
import { notificationQueries } from "@/modules/notifications";
import { makeAnalyticsQueries } from "../application/queries";
import { makeGetCompetitorBenchmark } from "../application/competitor-benchmark";
import { makeMarketingInsightsService } from "../application/marketing-insights";
import { PrismaTrackedAccountRepository } from "./tracked-account.repository";
import { PrismaMarketingInsightsRepository } from "./marketing-insights.repository";

const trackedAccounts = new PrismaTrackedAccountRepository();
export const marketingInsightsRepository = new PrismaMarketingInsightsRepository();
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
