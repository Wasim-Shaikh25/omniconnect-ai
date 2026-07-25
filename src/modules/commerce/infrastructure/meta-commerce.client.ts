import { logger } from "@/shared/observability";
import type { MetaCommerceClient } from "../application/ports";

export class StubMetaCommerceClient implements MetaCommerceClient {
  async pushCatalog(
    storeId: string,
    products: Array<{
      productId: string;
      title: string;
      description?: string | null;
      price?: number | null;
      currency?: string | null;
      imageUrl?: string | null;
    }>,
  ): Promise<{
    externalCatalogId: string;
    mappings: Array<{ productId: string; externalProductId: string }>;
  }> {
    logger.info("commerce.meta.pushCatalog.stub", { storeId, count: products.length });
    const externalCatalogId = `catalog-${storeId}-${Date.now()}`;
    const mappings = products.map((p) => ({
      productId: p.productId,
      externalProductId: `ext-${p.productId}`,
    }));
    return { externalCatalogId, mappings };
  }

  async publishShoppableMedia(
    storeId: string,
    input: {
      mediaType: string;
      caption?: string;
      productTags: Array<{ productId: string; name: string }>;
    },
  ): Promise<{ externalMediaId: string; permalink: string }> {
    logger.info("commerce.meta.publishShoppableMedia.stub", {
      storeId,
      mediaType: input.mediaType,
      tagCount: input.productTags.length,
    });
    const externalMediaId = `media-${storeId}-${Date.now()}`;
    return {
      externalMediaId,
      permalink: `https://instagram.com/p/${externalMediaId}`,
    };
  }
}
