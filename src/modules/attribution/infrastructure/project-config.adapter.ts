import { ecommerceQueries } from "@/modules/ecommerce";
import { organizationQueries } from "@/modules/workspaces";
import type { ProjectConfig } from "../application/ports";

export const projectConfig: ProjectConfig = {
  async getEcommerceBaseUrl(projectId: string) {
    const [connection, store] = await Promise.all([
      ecommerceQueries.getStoreConnection(projectId),
      organizationQueries.getStoreById(projectId),
    ]);

    const baseUrl = connection?.integration?.shopDomain ?? store?.domain ?? null;
    const couponUrlPattern =
      typeof connection?.integration?.metadata?.couponUrlPattern === "string"
        ? (connection.integration.metadata.couponUrlPattern as string)
        : null;

    return { baseUrl, couponUrlPattern };
  },

  async getMetaPixelId() {
    return null;
  },
};
