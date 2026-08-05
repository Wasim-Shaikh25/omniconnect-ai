"use server";

import { z } from "zod";
import { requireRole } from "@/modules/auth";
import { organizationQueries } from "@/modules/workspaces";
import { aiProvider } from "@/modules/ai/server";
import { metaService } from "@/modules/meta/server";
import { env } from "@/shared/config";
import {
  inspectProfile,
  makeMetaProfileFetcher,
  makeOpenRouterProfileNarrator,
  deterministicProfileNarrator,
  type ProfileInspectionResult,
} from "@/modules/inspector";

export interface InspectProfileState {
  error?: string;
  result?: ProfileInspectionResult;
  username?: string;
}

const inspectProfileSchema = z.object({
  projectId: z.string().min(1),
  username: z.string().min(1).max(120),
});

async function assertStoreInOrg(userId: string | null, projectId: string): Promise<boolean> {
  if (!userId) return false;
  const overview = await organizationQueries.getOrganizationOverview(userId);
  return overview?.stores.some((s) => s.id === projectId) ?? false;
}

function makeNarrator() {
  if (!env.OPENROUTER_API_KEY) {
    return deterministicProfileNarrator;
  }
  const model = env.AI_DEFAULT_MODEL ?? "openai/gpt-4o-mini";
  return makeOpenRouterProfileNarrator({ aiProvider, model });
}

export async function inspectProfileAction(
  _prev: InspectProfileState,
  formData: FormData,
): Promise<InspectProfileState> {
  const user = await requireRole("USER");
  const parsed = inspectProfileSchema.safeParse({
    projectId: formData.get("projectId"),
    username: formData.get("username"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (!(await assertStoreInOrg(user.userId, parsed.data.projectId))) {
    return { error: "Store not found in your organization." };
  }

  try {
    const fetcher = makeMetaProfileFetcher({
      baseUrl: "https://graph.facebook.com",
      apiVersion: "v21.0",
      getAccessToken: (projectId) => metaService.getAccessToken(projectId),
      getAccountId: (projectId) => metaService.getAccountId(projectId),
      mediaLimit: 25,
      commentLimit: 10,
    });

    const result = await inspectProfile(
      { fetcher, narrator: makeNarrator() },
      parsed.data.username,
      parsed.data.projectId,
    );

    if (!result) {
      return { error: `Profile @${parsed.data.username} could not be fetched.` };
    }

    return { result, username: parsed.data.username };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    return { error: message };
  }
}
