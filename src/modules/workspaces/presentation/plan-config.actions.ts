"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSuperAdmin } from "@/modules/auth";
import { planConfigService, Plan } from "@/modules/workspaces";

const planKeySchema = z.enum(["FREE", "PRO", "BUSINESS"]);

const updatePlanConfigSchema = z.object({
  plan: planKeySchema,
  maxWorkspaces: z.coerce.number().int().min(0).optional(),
  maxProjects: z.coerce.number().int().min(0).optional(),
  monthlyAiReplies: z.coerce.number().int().min(0).optional(),
  maxProfileInspectionsPerDay: z.coerce.number().int().min(0).optional(),
  teamSeats: z.coerce.number().int().min(0).optional(),
  maxStores: z.coerce.number().int().min(0).optional(),
  maxCompetitors: z.coerce.number().int().min(0).optional(),
  maxAttributionLinksPerMonth: z.coerce.number().int().min(0).optional(),
  maxContentSchedulesPerMonth: z.coerce.number().int().min(0).optional(),
  allowedModels: z.string().transform((val) =>
    val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  ),
  priceMonthlyCents: z.coerce.number().int().min(0).optional(),
});

export type PlanConfigActionState =
  | { error?: string; ok?: boolean; message?: string }
  | undefined;

export async function getPlanConfigsAction(): Promise<{
  items: Awaited<ReturnType<typeof planConfigService.list>>;
}> {
  await requireSuperAdmin();
  const items = await planConfigService.list();
  return { items };
}

export async function updatePlanConfigAction(
  _prev: PlanConfigActionState,
  formData: FormData,
): Promise<PlanConfigActionState> {
  const admin = await requireSuperAdmin();
  if (!admin) return { error: "Forbidden" };

  const raw: Record<string, unknown> = {};
  formData.forEach((value, key) => {
    raw[key] = value;
  });

  const parsed = updatePlanConfigSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const data = parsed.data;
  const limitValue = (value: number | undefined): number | null => {
    if (value === undefined || Number.isNaN(value)) return null;
    return value === 0 ? null : value;
  };

  try {
    await planConfigService.upsert({
      plan: data.plan as Plan,
      maxWorkspaces: limitValue(data.maxWorkspaces),
      maxProjects: limitValue(data.maxProjects),
      monthlyAiReplies: limitValue(data.monthlyAiReplies),
      maxProfileInspectionsPerDay: limitValue(data.maxProfileInspectionsPerDay),
      teamSeats: limitValue(data.teamSeats),
      maxStores: limitValue(data.maxStores),
      maxCompetitors: limitValue(data.maxCompetitors),
      maxAttributionLinksPerMonth: limitValue(data.maxAttributionLinksPerMonth),
      maxContentSchedulesPerMonth: limitValue(data.maxContentSchedulesPerMonth),
      allowedModels: data.allowedModels,
      priceMonthlyCents: data.priceMonthlyCents ?? 0,
    });
    revalidatePath("/admin/plans");
    return { ok: true, message: `${data.plan} plan updated.` };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update plan config",
    };
  }
}
