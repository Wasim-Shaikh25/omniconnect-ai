import { logger } from "@/shared/observability";
import { eventBus } from "@/shared/events";
import type {
  CatalogSyncRepository,
  CommerceAutomationService,
  MetaCommerceClient,
  ProductMappingRepository,
  ShoppableMediaRepository,
} from "./ports";
import { CatalogSynced, ShoppableMediaCreated } from "../domain/events";

export interface CommerceServiceDeps {
  productQueries: {
    listProducts(projectId: string, limit?: number): Promise<Array<{
      id: string;
      externalId: string;
      title: string;
      price: number | null;
      currency: string | null;
      inventory: number | null;
      imageUrl: string | null;
    }>>;
  };
  catalogSyncs: CatalogSyncRepository;
  mappings: ProductMappingRepository;
  media: ShoppableMediaRepository;
  metaCommerce: MetaCommerceClient;
}

export function makeCommerceAutomationService(deps: CommerceServiceDeps): CommerceAutomationService {
  return {
    async syncProductCatalog(projectId: string) {
      await deps.catalogSyncs.upsert(projectId, {
        status: "IN_PROGRESS",
      });

      try {
        const products = await deps.productQueries.listProducts(projectId, 100);
        const result = await deps.metaCommerce.pushCatalog(
          projectId,
          products.map((p) => ({
            productId: p.id,
            title: p.title,
            price: p.price,
            currency: p.currency,
            imageUrl: p.imageUrl,
          })),
        );

        await deps.mappings.saveMany(
          projectId,
          products.map((p) => ({
            productId: p.id,
            externalProductId:
              result.mappings.find((m) => m.productId === p.id)?.externalProductId ?? null,
            status: "SYNCED",
          })),
        );

        const completed = await deps.catalogSyncs.upsert(projectId, {
          externalCatalogId: result.externalCatalogId,
          status: "SUCCESS",
        });

        await eventBus.publish(
          new CatalogSynced(projectId, {
            projectId,
            syncId: completed.id,
            externalCatalogId: completed.externalCatalogId,
            productCount: products.length,
            status: "SUCCESS",
          }),
        );

        return completed;
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown";
        logger.error("commerce.syncProductCatalog.failed", { projectId, error: message });
        const failed = await deps.catalogSyncs.upsert(projectId, {
          status: "FAILED",
          errorLog: message,
        });
        await eventBus.publish(
          new CatalogSynced(projectId, {
            projectId,
            syncId: failed.id,
            externalCatalogId: null,
            productCount: 0,
            status: "FAILED",
          }),
        );
        return failed;
      }
    },

    async createShoppableMedia(projectId: string, input: {
      mediaType: string;
      caption?: string;
      productTagIds: string[];
    }) {
      const products = await deps.productQueries.listProducts(projectId, 100);
      const tags = input.productTagIds
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .map((p) => ({ productId: p.id, name: p.title }));

      const draft = await deps.media.create({
        projectId,
        mediaType: input.mediaType,
        caption: input.caption,
        productTags: tags,
        status: "DRAFT",
      });

      const published = await deps.metaCommerce.publishShoppableMedia(projectId, {
        mediaType: input.mediaType,
        caption: input.caption,
        productTags: tags,
      });

      const completed = await deps.media.updateExternalId(
        draft.id,
        published.externalMediaId,
        "PUBLISHED",
        published.permalink,
      );

      await eventBus.publish(
        new ShoppableMediaCreated(projectId, {
          projectId,
          mediaId: completed.id,
          externalMediaId: completed.externalMediaId,
          productTags: tags,
        }),
      );

      return completed;
    },
  };
}
