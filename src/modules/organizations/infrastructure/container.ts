import { makeCreateStore } from "../application/create-store";
import { makeOrganizationQueries } from "../application/queries";
import { PrismaOrganizationRepository } from "./organization.repository";
import { PrismaStoreRepository } from "./store.repository";

const organizations = new PrismaOrganizationRepository();
const stores = new PrismaStoreRepository();

/** Composition root for the organizations module. */
export const organizationRepository = organizations;
export const createStore = makeCreateStore({ organizations, stores });
export const organizationQueries = makeOrganizationQueries({
  organizations,
  stores,
});
