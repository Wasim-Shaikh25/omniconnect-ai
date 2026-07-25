import { eventBus } from "@/shared/events";
import { organizationQueries } from "@/modules/organizations";
import { ecommerceQueries } from "@/modules/ecommerce";
import { conversationQueries } from "@/modules/conversations";
import { crmQueries } from "@/modules/crm";
import { socialQueries } from "@/modules/social";
import { notificationQueries } from "@/modules/notifications";
import { makeAnalyticsQueries } from "../application/queries";
import { makeGetMarketingPerformance } from "../application/marketing-analytics";
import { makeGetCompetitorBenchmark } from "../application/competitor-benchmark";
import { PrismaTrackedAccountRepository } from "./tracked-account.repository";

const trackedAccounts = new PrismaTrackedAccountRepository();

/** Composition root for the analytics module. */
export const analyticsQueries = makeAnalyticsQueries({
  organizations: organizationQueries,
  ecommerce: ecommerceQueries,
  conversations: conversationQueries,
  crm: crmQueries,
  notifications: notificationQueries,
  trackedAccounts,
});

export const getMarketingPerformance = makeGetMarketingPerformance({
  ecommerce: ecommerceQueries,
  conversations: conversationQueries,
  crm: crmQueries,
  social: socialQueries,
  eventBus,
});

export const getCompetitorBenchmark = makeGetCompetitorBenchmark({
  trackedAccounts,
  eventBus,
});
