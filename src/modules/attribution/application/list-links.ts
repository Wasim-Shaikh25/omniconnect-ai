import type { AttributionLink, AttributionLinkRepository } from "./ports";

export interface ListAttributionLinks {
  (projectId: string, options?: { limit?: number; offset?: number }): Promise<AttributionLink[]>;
}

export function makeListAttributionLinks(links: AttributionLinkRepository): ListAttributionLinks {
  return async function listAttributionLinks(projectId, options) {
    return links.listByProject(projectId, options);
  };
}
