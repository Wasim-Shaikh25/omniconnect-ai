import { organizationQueries } from "@/modules/workspaces";
import { makeCrmCommands } from "../application/commands";
import { makeCrmQueries } from "../application/queries";
import { makeDetectCrmInsights } from "../application/detect-insights";
import { makeCustomerDirectory } from "../application/customer-directory";
import { PrismaCustomerRepository } from "./customer.repository";
import { PrismaFollowerRepository } from "./follower.repository";

const customers = new PrismaCustomerRepository();
const followers = new PrismaFollowerRepository();

/** Composition root for the crm module. */
export const crmCommands = makeCrmCommands({ customers, followers });
export const crmQueries = makeCrmQueries({ customers, followers });
export const detectCrmInsights = makeDetectCrmInsights({ crm: crmQueries });

export const customerDirectory = makeCustomerDirectory({
  organizations: organizationQueries,
  customers,
  followers,
});
