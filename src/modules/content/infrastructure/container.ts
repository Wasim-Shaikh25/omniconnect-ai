import { eventBus } from "@/shared/events";
import { generatePostIdeas } from "@/modules/ai/server";
import { organizationQueries } from "@/modules/organizations";
import { makeGenerateContentIdeas } from "../application/generate-content-ideas";

export const generateContentIdeas = makeGenerateContentIdeas({
  generatePostIdeas,
  eventBus,
  getOrganizationIdByStoreId: organizationQueries.getOrganizationIdByStoreId,
});
