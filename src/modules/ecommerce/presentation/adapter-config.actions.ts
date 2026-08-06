"use server";

import { z } from "zod";
import { requireRole } from "@/modules/auth";
import { organizationQueries } from "@/modules/workspaces";
import { adapterConfigGenerator } from "../infrastructure/ai-adapter-generator";
import { testAdapterConfig } from "../infrastructure/container";
import { validateAdapterConfigMapping } from "../infrastructure/adapter-config-schema";

export type AdapterConfigActionState =
  | {
      ok?: boolean;
      error?: string;
      config?: unknown;
      valid?: boolean;
      storeName?: string;
      productCount?: number;
    }
  | undefined;

async function assertStoreInOrg(
  userId: string | null,
  projectId: string,
): Promise<boolean> {
  if (!userId) return false;
  const overview = await organizationQueries.getOrganizationOverview(userId);
  return overview?.stores.some((s) => s.id === projectId) ?? false;
}

const generateSchema = z.object({
  platformName: z.string().min(1),
  apiDocs: z.string().min(1).max(20000),
  projectId: z.string().optional(),
});

export async function generateAdapterConfigAction(
  _prev: AdapterConfigActionState,
  formData: FormData,
): Promise<AdapterConfigActionState> {
  const user = await requireRole("USER");

  const raw: Record<string, unknown> = {};
  formData.forEach((value, key) => {
    raw[key] = value;
  });

  const parsed = generateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const config = await adapterConfigGenerator.generate({
      platformName: parsed.data.platformName,
      apiDocs: parsed.data.apiDocs,
      userId: user.userId ?? user.id,
      projectId: parsed.data.projectId ?? null,
    });
    return { ok: true, config: config as unknown };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate adapter configuration",
    };
  }
}

const testSchema = z.object({
  projectId: z.string().min(1),
  config: z.string().min(1),
  credentials: z.string().min(1),
});

export async function testAdapterConfigAction(
  _prev: AdapterConfigActionState,
  formData: FormData,
): Promise<AdapterConfigActionState> {
  const user = await requireRole("USER");

  const raw: Record<string, unknown> = {};
  formData.forEach((value, key) => {
    raw[key] = value;
  });

  const parsed = testSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (!(await assertStoreInOrg(user.userId, parsed.data.projectId))) {
    return { error: "Store not found in your organization." };
  }

  let config: unknown;
  let credentials: unknown;
  try {
    config = JSON.parse(parsed.data.config);
    credentials = JSON.parse(parsed.data.credentials);
  } catch {
    return { error: "Config or credentials are not valid JSON." };
  }

  let validatedConfig;
  try {
    validatedConfig = validateAdapterConfigMapping(config);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? `Invalid adapter config: ${error.message}`
          : "Invalid adapter config",
    };
  }

  if (!isRecordOfStrings(credentials)) {
    return { error: "Credentials must be a flat JSON object of strings." };
  }

  const result = await testAdapterConfig({
    projectId: parsed.data.projectId,
    config: validatedConfig,
    credentials,
  });

  if (result.valid) {
    return {
      ok: true,
      valid: true,
      storeName: result.storeName,
      productCount: result.productCount,
    };
  }
  return { error: result.error, valid: false };
}

function isRecordOfStrings(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return Object.values(record).every((v) => typeof v === "string");
}
