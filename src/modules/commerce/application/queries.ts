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
    async getLatestCatalogSync(projectId: string) {
      return deps.catalogSyncs.findLatest(projectId);
    },
    async listProductMappings(projectId: string) {
      return deps.mappings.listByStore(projectId);
    },
    async listShoppableMedia(projectId: string) {
      return deps.media.listByStore(projectId);
    },
  };
}
