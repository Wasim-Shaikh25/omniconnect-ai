import { growthService } from "../infrastructure/container";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

export async function executeGrowthAction(actionType: string, params: unknown): Promise<ActionResult> {
  const typed = typeof params === "object" && params !== null ? (params as Record<string, unknown>) : {};

  switch (actionType) {
    case "CREATE_DM_CAMPAIGN": {
      const storeId = String(typed.storeId ?? "");
      const campaignType = String(typed.campaignType ?? "FOLLOWER_REENGAGE");
      if (!storeId) return { ok: false, message: "Missing storeId" };

      try {
        await growthService.createDmCampaign({
          storeId,
          campaignType,
          audienceCriteria: typed.audienceCriteria,
        });
        return { ok: true, message: "DM campaign created" };
      } catch (error) {
        const message = error instanceof Error ? error.message : "DM campaign creation failed";
        return { ok: false, message };
      }
    }

    case "CREATE_ALTERNATIVE_PRODUCT_CAMPAIGN": {
      const storeId = String(typed.storeId ?? "");
      const outOfStockProductTitle = String(typed.outOfStockProductTitle ?? "");
      const alternativeProductTitle = String(typed.alternativeProductTitle ?? "");
      if (!storeId || !outOfStockProductTitle || !alternativeProductTitle) {
        return { ok: false, message: "Missing store or product titles" };
      }

      try {
        await growthService.createDmCampaign({
          storeId,
          campaignType: "ALTERNATIVE_PRODUCT",
          audienceCriteria: {
            outOfStockProductTitle,
            alternativeProductTitle,
            ...(typed.audienceCriteria as Record<string, unknown> ?? {}),
          },
        });
        return { ok: true, message: `Alternative-product campaign for ${alternativeProductTitle} created` };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Alternative-product campaign creation failed";
        return { ok: false, message };
      }
    }

    default:
      return { ok: false, message: `Unsupported growth action type: ${actionType}` };
  }
}
