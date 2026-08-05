export interface CatalogSyncRecord {
  id: string;
  projectId: string;
  externalCatalogId: string | null;
  status: string;
  lastSyncedAt: Date | null;
  errorLog: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductMappingRecord {
  id: string;
  projectId: string;
  productId: string;
  externalProductId: string | null;
  externalCatalogId: string | null;
  status: string;
  lastPushedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShoppableMediaRecord {
  id: string;
  projectId: string;
  externalMediaId: string | null;
  mediaType: string;
  caption: string | null;
  permalink: string | null;
  productTags: unknown;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CatalogSyncRepository {
  upsert(projectId: string, input: {
    externalCatalogId?: string | null;
    status: string;
    errorLog?: string | null;
  }): Promise<CatalogSyncRecord>;
  findLatest(projectId: string): Promise<CatalogSyncRecord | null>;
}

export interface ProductMappingRepository {
  saveMany(projectId: string, products: Array<{
    productId: string;
    externalProductId: string | null;
    status: string;
    errorMessage?: string | null;
  }>): Promise<void>;
  listByStore(projectId: string, limit?: number): Promise<ProductMappingRecord[]>;
}

export interface ShoppableMediaRepository {
  create(input: {
    projectId: string;
    mediaType: string;
    caption?: string;
    productTags: unknown;
    status?: string;
  }): Promise<ShoppableMediaRecord>;
  updateExternalId(id: string, externalMediaId: string, status: string, permalink?: string): Promise<ShoppableMediaRecord>;
  listByStore(projectId: string, limit?: number): Promise<ShoppableMediaRecord[]>;
}

export interface MetaCommerceClient {
  pushCatalog(projectId: string, products: Array<{
    productId: string;
    title: string;
    description?: string | null;
    price?: number | null;
    currency?: string | null;
    imageUrl?: string | null;
  }>): Promise<{
    externalCatalogId: string;
    mappings: Array<{ productId: string; externalProductId: string }>;
  }>;
  publishShoppableMedia(projectId: string, input: {
    mediaType: string;
    caption?: string;
    productTags: Array<{ productId: string; name: string }>;
  }): Promise<{ externalMediaId: string; permalink: string }>;
}

export interface CommerceAutomationService {
  syncProductCatalog(projectId: string): Promise<CatalogSyncRecord>;
  createShoppableMedia(projectId: string, input: {
    mediaType: string;
    caption?: string;
    productTagIds: string[];
  }): Promise<ShoppableMediaRecord>;
}

export interface CommerceQueries {
  getLatestCatalogSync(projectId: string): Promise<CatalogSyncRecord | null>;
  listProductMappings(projectId: string): Promise<ProductMappingRecord[]>;
  listShoppableMedia(projectId: string): Promise<ShoppableMediaRecord[]>;
}
