import type { LeadQueries, LeadRepository, LeadService } from "./lead.ports";

function scoreFromPayload(source: string, payload: unknown): number {
  let score = 0;
  if (source === "DM" || source === "LEAD_ADS") score += 20;
  if (source === "COMMENT") score += 15;
  if (source === "FOLLOW") score += 5;

  const text = JSON.stringify(payload).toLowerCase();
  if (text.includes("buy") || text.includes("purchase") || text.includes("order")) score += 25;
  if (text.includes("price") || text.includes("discount") || text.includes("coupon")) score += 15;
  if (text.includes("?")) score += 5;
  return Math.min(score, 100);
}

export function makeLeadService(deps: { leads: LeadRepository }): LeadService & LeadQueries {
  return {
    async captureLead(input) {
      const score = scoreFromPayload(input.source, input.payload);
      return deps.leads.create({
        ...input,
        score,
        status: score >= 50 ? "SCORED" : "NEW",
      });
    },

    async scoreLead(id, storeId) {
      const lead = await deps.leads.listByStore(storeId).then((list) => list.find((l) => l.id === id));
      if (!lead) throw new Error("Lead not found");
      const score = scoreFromPayload(lead.source, lead.payload);
      const status = score >= 60 ? "SCORED" : lead.status;
      return deps.leads.updateScore(id, score, status);
    },

    async listLeads(storeId, limit = 50) {
      return deps.leads.listByStore(storeId, limit);
    },
  };
}
