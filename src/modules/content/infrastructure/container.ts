import { eventBus } from "@/shared/events";
import { generatePostIdeas } from "@/modules/ai/server";
import { metaService } from "@/modules/meta/server";
import { organizationQueries } from "@/modules/workspaces";
import { makeGenerateContentIdeas } from "../application/generate-content-ideas";
import { makePublishMedia } from "../application/publish-media";

export const generateContentIdeas = makeGenerateContentIdeas({
  generatePostIdeas,
  eventBus,
  getOrganizationIdByStoreId: organizationQueries.getOrganizationIdByStoreId,
});

export const publishMedia = makePublishMedia({
  publishMedia: metaService.publishMedia.bind(metaService),
});
