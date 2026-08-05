import { growthService } from "../infrastructure/container";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

export async function executeGrowthAction(actionType: string, params: unknown): Promise<ActionResult> {
  const typed = typeof params === "object" && params !== null ? (params as Record<string, unknown>) : {};

  switch (actionType) {
    case "CREATE_DM_CAMPAIGN": {
      const projectId = String(typed.projectId ?? "");
      const campaignType = String(typed.campaignType ?? "FOLLOWER_REENGAGE");
      if (!projectId) return { ok: false, message: "Missing projectId" };

      try {
        await growthService.createDmCampaign({
          projectId,
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
      const projectId = String(typed.projectId ?? "");
      const outOfStockProductTitle = String(typed.outOfStockProductTitle ?? "");
      const alternativeProductTitle = String(typed.alternativeProductTitle ?? "");
      if (!projectId || !outOfStockProductTitle || !alternativeProductTitle) {
        return { ok: false, message: "Missing store or product titles" };
      }

      try {
        await growthService.createDmCampaign({
          projectId,
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
