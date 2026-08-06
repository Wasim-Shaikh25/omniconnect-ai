import type { IntegrationRecord, IntegrationRepository } from "./ports";

export interface AdapterLibraryResult {
  items: IntegrationRecord[];
  total: number;
}

export interface AdapterValidationResult {
  valid: boolean;
  error?: string;
}

export interface ConnectorResolver {
  forStore(projectId: string): Promise<{
    fetchStoreInfo(): Promise<unknown>;
  }>;
}

export interface AdapterLibraryService {
  listAdapters(options?: { provider?: string; isActive?: boolean; limit?: number; offset?: number }): Promise<AdapterLibraryResult>;
  toggleAdapter(id: string, isActive: boolean): Promise<IntegrationRecord | null>;
  validateAdapter(projectId: string): Promise<AdapterValidationResult>;
}

export function makeAdapterLibraryService(deps: {
  integrations: IntegrationRepository;
  connectorResolver: ConnectorResolver;
}): AdapterLibraryService {
  return {
    async listAdapters(options) {
      return deps.integrations.findAll(options);
    },

    async toggleAdapter(id, isActive) {
      return deps.integrations.updateStatus(id, isActive);
    },

    async validateAdapter(projectId) {
      try {
        const connector = await deps.connectorResolver.forStore(projectId);
        await connector.fetchStoreInfo();
        return { valid: true };
      } catch (error) {
        return {
          valid: false,
          error: error instanceof Error ? error.message : "Validation failed",
        };
      }
    },
  };
}
