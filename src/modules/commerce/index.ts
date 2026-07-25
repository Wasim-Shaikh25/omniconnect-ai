/**
 * Commerce module — public barrel.
 *
 * This is the ONLY file other modules may import from `@/modules/commerce`.
 * It exposes the automation service, queries, domain events, and presentation
 * actions. See docs/architecture/module-boundaries.md.
 *
 * Responsibility: Phase 2 social commerce automation (catalog sync,
 * shoppable media, and product tagging).
 */
export const MODULE_NAME = "commerce" as const;

// Domain events
export { CatalogSynced, ShoppableMediaCreated } from "./domain/events";
export type {
  CatalogSyncedPayload,
  ShoppableMediaCreatedPayload,
} from "./domain/events";

// Application
export type {
  CatalogSyncRecord,
  ProductMappingRecord,
  ShoppableMediaRecord,
  CommerceAutomationService,
  CommerceQueries,
} from "./application/ports";

// Infrastructure composition root
export { commerceService, commerceQueries } from "./infrastructure/container";

// Presentation
export {
  syncMetaCatalogAction,
  createShoppableMediaAction,
  listCommerceCatalogAction,
} from "./presentation/actions";
export type { CommerceCatalogView } from "./presentation/actions";
