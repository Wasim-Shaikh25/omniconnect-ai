import { makeCrmCommands } from "../application/commands";
import { makeCrmQueries } from "../application/queries";
import { PrismaCustomerRepository } from "./customer.repository";
import { PrismaFollowerRepository } from "./follower.repository";

const customers = new PrismaCustomerRepository();
const followers = new PrismaFollowerRepository();

/** Composition root for the crm module. */
export const crmCommands = makeCrmCommands({ followers });
export const crmQueries = makeCrmQueries({ customers, followers });
