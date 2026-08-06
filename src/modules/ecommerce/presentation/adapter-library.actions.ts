"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSuperAdmin } from "@/modules/auth";
import { adapterLibrary } from "@/modules/ecommerce";

const toggleSchema = z.object({
  adapterId: z.string().min(1),
  isActive: z.enum(["true", "false"]),
});

const validateSchema = z.object({
  project: z.string().min(1),
});

export type AdapterLibraryActionState =
  | { error?: string; ok?: boolean; message?: string; valid?: boolean }
  | undefined;

export async function listAdaptersAction() {
  await requireSuperAdmin();
  return adapterLibrary.listAdapters({ limit: 1000 });
}

export async function toggleAdapterAction(
  _prev: AdapterLibraryActionState,
  formData: FormData,
): Promise<AdapterLibraryActionState> {
  const admin = await requireSuperAdmin();
  if (!admin) return { error: "Forbidden" };

  const raw: Record<string, unknown> = {};
  formData.forEach((value, key) => {
    raw[key] = value;
  });

  const parsed = toggleSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    await adapterLibrary.toggleAdapter(parsed.data.adapterId, parsed.data.isActive === "true");
    revalidatePath("/admin/adapters");
    return { ok: true, message: "Adapter status updated" };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to update adapter" };
  }
}

export async function validateAdapterAction(
  _prev: AdapterLibraryActionState,
  formData: FormData,
): Promise<AdapterLibraryActionState> {
  const admin = await requireSuperAdmin();
  if (!admin) return { error: "Forbidden" };

  const raw: Record<string, unknown> = {};
  formData.forEach((value, key) => {
    raw[key] = value;
  });

  const parsed = validateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await adapterLibrary.validateAdapter(parsed.data.project);
  return result.valid
    ? { ok: true, valid: true, message: "Connection is valid" }
    : { error: result.error ?? "Connection failed", valid: false };
}
