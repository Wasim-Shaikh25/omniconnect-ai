import type {
  CatalogSyncRepository,
  CommerceQueries,
  ProductMappingRepository,
  ShoppableMediaRepository,
} from "./ports";

export function makeCommerceQueries(deps: {
  catalogSyncs: CatalogSyncRepository;
  mappings: ProductMappingRepository;
  media: ShoppableMediaRepository;
}): CommerceQueries {
  return {
    async getLatestCatalogSync(storeId: string) {
      return deps.catalogSyncs.findLatest(storeId);
    },
    async listProductMappings(storeId: string) {
      return deps.mappings.listByStore(storeId);
    },
    async listShoppableMedia(storeId: string) {
      return deps.media.listByStore(storeId);
    },
  };
}
