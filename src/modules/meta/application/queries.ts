import type { MetaIntegrationRecord, MetaIntegrationRepository } from "./ports";

export interface MetaConnectionView {
  connected: boolean;
  integration: MetaIntegrationRecord | null;
}

export function makeMetaQueries(deps: {
  integrations: MetaIntegrationRepository;
}) {
  return {
    async getMetaConnection(storeId: string): Promise<MetaConnectionView> {
      const integration = await deps.integrations.findByStore(storeId);
      return { connected: !!integration, integration };
    },
  };
}

export type MetaQueries = ReturnType<typeof makeMetaQueries>;
