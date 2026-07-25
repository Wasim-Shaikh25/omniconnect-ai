import { ecommerceQueries } from "@/modules/ecommerce";
import {
  PrismaCatalogSyncRepository,
  PrismaProductMappingRepository,
  PrismaShoppableMediaRepository,
} from "./repositories";
import { StubMetaCommerceClient } from "./meta-commerce.client";
import { makeCommerceAutomationService } from "../application/service";
import { makeCommerceQueries } from "../application/queries";

const catalogSyncs = new PrismaCatalogSyncRepository();
const mappings = new PrismaProductMappingRepository();
const media = new PrismaShoppableMediaRepository();
const metaCommerce = new StubMetaCommerceClient();

export const commerceService = makeCommerceAutomationService({
  productQueries: ecommerceQueries,
  catalogSyncs,
  mappings,
  media,
  metaCommerce,
});

export const commerceQueries = makeCommerceQueries({ catalogSyncs, mappings, media });
