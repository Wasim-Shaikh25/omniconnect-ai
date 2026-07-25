export interface CatalogSyncRecord {
  id: string;
  storeId: string;
  externalCatalogId: string | null;
  status: string;
  lastSyncedAt: Date | null;
  errorLog: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductMappingRecord {
  id: string;
  storeId: string;
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
  storeId: string;
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
  upsert(storeId: string, input: {
    externalCatalogId?: string | null;
    status: string;
    errorLog?: string | null;
  }): Promise<CatalogSyncRecord>;
  findLatest(storeId: string): Promise<CatalogSyncRecord | null>;
}

export interface ProductMappingRepository {
  saveMany(storeId: string, products: Array<{
    productId: string;
    externalProductId: string | null;
    status: string;
    errorMessage?: string | null;
  }>): Promise<void>;
  listByStore(storeId: string): Promise<ProductMappingRecord[]>;
}

export interface ShoppableMediaRepository {
  create(input: {
    storeId: string;
    mediaType: string;
    caption?: string;
    productTags: unknown;
    status?: string;
  }): Promise<ShoppableMediaRecord>;
  updateExternalId(id: string, externalMediaId: string, status: string, permalink?: string): Promise<ShoppableMediaRecord>;
  listByStore(storeId: string): Promise<ShoppableMediaRecord[]>;
}

export interface MetaCommerceClient {
  pushCatalog(storeId: string, products: Array<{
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
  publishShoppableMedia(storeId: string, input: {
    mediaType: string;
    caption?: string;
    productTags: Array<{ productId: string; name: string }>;
  }): Promise<{ externalMediaId: string; permalink: string }>;
}

export interface CommerceAutomationService {
  syncProductCatalog(storeId: string): Promise<CatalogSyncRecord>;
  createShoppableMedia(storeId: string, input: {
    mediaType: string;
    caption?: string;
    productTagIds: string[];
  }): Promise<ShoppableMediaRecord>;
}

export interface CommerceQueries {
  getLatestCatalogSync(storeId: string): Promise<CatalogSyncRecord | null>;
  listProductMappings(storeId: string): Promise<ProductMappingRecord[]>;
  listShoppableMedia(storeId: string): Promise<ShoppableMediaRecord[]>;
}
