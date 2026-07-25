import { organizationQueries } from "@/modules/organizations";
import { ecommerceQueries } from "@/modules/ecommerce";
import { conversationQueries } from "@/modules/conversations";
import { crmQueries } from "@/modules/crm";
import { notificationQueries } from "@/modules/notifications";
import { makeAnalyticsQueries } from "../application/queries";
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
