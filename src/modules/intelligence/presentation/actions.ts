"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser, requireRole } from "@/modules/auth";
import { organizationQueries } from "@/modules/organizations";
import { customerDirectory } from "@/modules/crm";
import {
  timelineService,
  customerSummaryService,
  entityResolutionService,
  dataQualityService,
  metricService,
} from "../infrastructure/container";

export interface IntelligenceActionState {
  error?: string;
  ok?: boolean;
  message?: string;
}

const metricSchema = z.object({
  name: z.string().min(1),
  storeId: z.string().optional(),
});

const linkIdSchema = z.object({
  linkId: z.string().min(1),
});

const mergeLinkSchema = z.object({
  linkId: z.string().min(1),
});

async function assertCustomerInOrg(
  organizationId: string | null,
  customerId: string,
): Promise<boolean> {
  if (!organizationId) return false;
  const customer = await customerDirectory.getCustomerDetail(organizationId, customerId);
  return !!customer;
}

export async function getCustomerTimelineAction(customerId: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { events: [] };
  const organizationId = user.organizationId;
  if (!(await assertCustomerInOrg(organizationId, customerId))) {
    return { events: [] };
  }

  const events = await timelineService.getTimeline({
    organizationId,
    subjectType: "customer",
    subjectId: customerId,
    includeLinked: true,
  });
  return { events };
}

export async function getCustomerIntelligenceAction(customerId: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { summary: null };
  const organizationId = user.organizationId;
  if (!(await assertCustomerInOrg(organizationId, customerId))) {
    return { summary: null };
  }

  const summary = await customerSummaryService.buildSummary({
    customerId,
    organizationId,
    getCustomerDetail: customerDirectory.getCustomerDetail.bind(customerDirectory),
    getLinkedEntities: entityResolutionService.getLinkedEntities.bind(entityResolutionService),
  });
  return { summary };
}

export async function getDataQualityIssuesAction(storeId?: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { issues: [] };
  const organizationId = user.organizationId;

  if (storeId) {
    const overview = await organizationQueries.getOrganizationOverview(organizationId);
    if (!overview?.stores.some((s) => s.id === storeId)) return { issues: [] };
  }

  const definitions = await metricService.getDefinitions();
  await Promise.all(
    definitions.map((d) => dataQualityService.inspectMetric(d.name, organizationId, storeId ?? null)),
  );

  const issues = await dataQualityService.getOpenIssues(organizationId, storeId);
  return { issues };
}

export async function getMetricAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return { error: "Unauthorized" };
  const organizationId = user.organizationId;

  const parsed = metricSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, storeId } = parsed.data;
  if (storeId) {
    const overview = await organizationQueries.getOrganizationOverview(organizationId);
    if (!overview?.stores.some((s) => s.id === storeId)) {
      return { error: "Store not found" };
    }
  }

  const snapshot = await metricService.getMetric(name, organizationId, storeId ?? null);
  return { snapshot };
}

export async function mergeEntityAction(formData: FormData): Promise<void> {
  const user = await requireRole("STAFF");
  if (!user.organizationId) return;
  const parsed = mergeLinkSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  const link = await entityResolutionService.getLinkById(parsed.data.linkId);
  if (!link || link.organizationId !== user.organizationId) return;

  await entityResolutionService.merge(parsed.data.linkId);
  revalidatePath("/customers");
  revalidatePath(`/customers/${link.targetId}`);
}

export async function splitEntityAction(formData: FormData): Promise<void> {
  const user = await requireRole("STAFF");
  if (!user.organizationId) return;
  const parsed = linkIdSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  const link = await entityResolutionService.getLinkById(parsed.data.linkId);
  if (!link || link.organizationId !== user.organizationId) return;

  await entityResolutionService.split(parsed.data.linkId);
  revalidatePath("/customers");
  revalidatePath(`/customers/${link.targetId}`);
}
