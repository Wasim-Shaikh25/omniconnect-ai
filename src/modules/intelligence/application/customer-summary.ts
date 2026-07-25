import type { EntityLinkRecord, CustomerIntelligenceSummary, ConfidenceLevel, JourneyStage } from "../domain/types";

type CustomerDetail = {
  id: string;
  storeId: string;
  username: string | null;
  igUserId: string | null;
  fbUserId: string | null;
  lifecycleStage: string;
  consent: string;
  tags: string[];
  interests: string[];
  engagementScore: number;
  leadScore: number;
  segment: string;
  activity: {
    conversationCount: number;
    messageCount: number;
    followerCount: number;
    couponUsageCount: number;
    lastMessageAt: Date | null;
  };
  storeName: string;
  coupons: { id: string; code: string; discountPct: number; status: string; expiresAt: Date | null }[];
  usages: { couponId: string; usedAt: Date; orderRef: string | null }[];
  followers: { id: string; igUserId: string | null; username: string | null }[];
};

type GetCustomerDetail = (organizationId: string, customerId: string) => Promise<CustomerDetail | null>;
type GetLinkedEntities = (organizationId: string, entityType: string, entityId: string) => Promise<EntityLinkRecord[]>;

function linkConfidence(links: EntityLinkRecord[]): ConfidenceLevel {
  if (links.length === 0) return "POSSIBLE";
  if (links.every((l) => l.confidence === "VERIFIED")) return "VERIFIED";
  if (links.some((l) => l.confidence === "VERIFIED")) return "PROBABLE";
  if (links.some((l) => l.confidence === "POSSIBLE" || l.confidence === "PROBABLE")) return "PROBABLE";
  return "POSSIBLE";
}

function bestNextAction(customer: CustomerDetail): string | null {
  if (customer.consent === "PENDING" && customer.lifecycleStage === "LEAD") {
    return "Ask for marketing consent";
  }
  if (customer.lifecycleStage === "PROSPECT" && customer.consent === "GRANTED") {
    return "Send a personalized coupon";
  }
  if (customer.lifecycleStage === "CUSTOMER" && customer.engagementScore < 40) {
    return "Re-engage with back-in-stock or new drop";
  }
  if (customer.lifecycleStage === "CHURNED") {
    return "Win-back campaign with exclusive offer";
  }
  return null;
}

function buildRisks(customer: CustomerDetail): string[] {
  const risks: string[] = [];
  if (customer.consent === "DECLINED") risks.push("Marketing consent declined");
  if (customer.lifecycleStage === "CHURNED") risks.push("Customer churned");
  if (customer.engagementScore < 30) risks.push("Low engagement");
  if (customer.consent === "PENDING") risks.push("Consent not captured");
  return risks;
}

function buildOpportunities(customer: CustomerDetail): string[] {
  const opportunities: string[] = [];
  if (customer.leadScore >= 60 && customer.consent === "GRANTED") {
    opportunities.push("High purchase intent");
  }
  if (customer.engagementScore >= 70) opportunities.push("VIP engagement");
  if (customer.followers.length > 0) opportunities.push("Potential ambassador");
  if (customer.usages.length === 0 && customer.coupons.length > 0) {
    opportunities.push("Unused coupons — prompt redemption");
  }
  return opportunities;
}

function preferredChannel(customer: CustomerDetail): string | null {
  if (customer.igUserId) return "INSTAGRAM";
  if (customer.fbUserId) return "FACEBOOK";
  return null;
}

export interface CustomerSummaryInput {
  customerId: string;
  organizationId: string;
  getCustomerDetail: GetCustomerDetail;
  getLinkedEntities: GetLinkedEntities;
}

export function makeCustomerSummaryService() {
  return {
    async buildSummary(input: CustomerSummaryInput): Promise<CustomerIntelligenceSummary | null> {
      const customer = await input.getCustomerDetail(input.organizationId, input.customerId);
      if (!customer) return null;

      const links = await input.getLinkedEntities(input.organizationId, "customer", customer.id);

      return {
        customerId: customer.id,
        storeId: customer.storeId,
        displayName: customer.username ?? customer.igUserId ?? customer.fbUserId ?? "Unknown",
        lifecycleStage: customer.lifecycleStage,
        consent: customer.consent,
        engagementScore: customer.engagementScore,
        leadScore: customer.leadScore,
        segment: customer.segment,
        confidence: linkConfidence(links),
        bestNextAction: bestNextAction(customer),
        risks: buildRisks(customer),
        opportunities: buildOpportunities(customer),
        preferredChannel: preferredChannel(customer),
        lastActivityAt: customer.activity.lastMessageAt,
        links,
        linkedEntities: links.map((l) => ({
          type: l.targetType,
          id: l.targetId,
          label: `${l.linkType} ${l.targetType}`,
          confidence: l.confidence,
        })),
      };
    },
  };
}

export type CustomerSummaryService = ReturnType<typeof makeCustomerSummaryService>;

export type { CustomerDetail, JourneyStage };
