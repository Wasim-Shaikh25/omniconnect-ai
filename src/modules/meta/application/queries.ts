import type { MetaIntegrationRecord, MetaIntegrationRepository } from "./ports";

export interface MetaConnectionView {
  connected: boolean;
  integration: MetaIntegrationRecord | null;
}

export function makeMetaQueries(deps: {
  integrations: MetaIntegrationRepository;
}) {
  return {
    async getMetaConnection(projectId: string): Promise<MetaConnectionView> {
      const integration = await deps.integrations.findByStore(projectId);
      return { connected: !!integration, integration };
    },
  };
}

export type MetaQueries = ReturnType<typeof makeMetaQueries>;
