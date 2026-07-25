import type { EcommerceQueries, ProductRecord } from "@/modules/ecommerce";
import type { CrmQueries, CustomerListView, customerDirectory } from "@/modules/crm";
import type { ConversationQueries } from "@/modules/conversations";
import { growthQueries } from "@/modules/growth";
import { brandDealQueries } from "@/modules/branddeals";
import type { SignalRepository } from "./ports";
import type { SignalRecord } from "../domain/types";
import type { CompetitorIntelligenceService } from "./competitor-intelligence";

export type CustomerDirectory = typeof customerDirectory;

export type Priority = "high" | "medium" | "low";

export interface SuggestedProduct {
  id: string;
  title: string;
  price: number;
  currency: string;
  inStock: boolean;
  reason: string;
}

export interface InboxNextBestAction {
  priority: Priority;
  priorityScore: number;
  suppressSales: boolean;
  reason: string;
  suggestedReply: string;
  relevantProducts: SuggestedProduct[];
  risks: string[];
}

export interface AtRiskCustomer {
  customerId: string;
  displayName: string;
  lifetimeValue: number;
  currency: string;
  reason: string;
}

export interface PostDeliveryUpsell {
  orderId: string;
  customerId?: string;
  customerName?: string;
  productTitle: string;
  upsellProduct: SuggestedProduct;
}

export interface OrdersNextBestAction {
  atRiskHighValueCustomers: AtRiskCustomer[];
  postDeliveryUpsells: PostDeliveryUpsell[];
  suppressed: boolean;
  reasons: string[];
}

export interface CrmCandidate {
  customerId: string;
  displayName: string;
  segment: string;
  reason: string;
}

export interface CustomerNextBestAction {
  retentionCandidates: CrmCandidate[];
  advocateCandidates: CrmCandidate[];
  suppressed: boolean;
  reasons: string[];
}

export interface ContentNextBestAction {
  repeatFormats: { format: string; evidence: string }[];
  contentGaps: { topic: string; suggestedProductTitle: string | null }[];
  timing: string;
  suppressed: boolean;
  reasons: string[];
}

export interface CampaignsNextBestAction {
  underperforming: { campaignId: string; campaignType: string; sentCount: number; reason: string }[];
  highPerforming: { campaignId: string; campaignType: string; sentCount: number; reason: string }[];
  recommendedAction: string;
  suppressed: boolean;
  reasons: string[];
}

export interface BrandDealNextBestAction {
  followUps: { dealId: string; brandName: string; daysStuck: number; reason: string }[];
  deliverableRisks: { dealId: string; brandName: string; risk: string }[];
  recommendedAction: string;
}

export interface CompetitorNextBestAction {
  experiments: { pattern: string; suggestedAngle: string; guardrail: string }[];
  warnings: string[];
}

const SUPPORT_KEYWORDS = ["return", "refund", "broken", "issue", "complaint", "support", "wrong", "missing", "damaged", "angry"];
const INTENT_KEYWORDS = ["buy", "order", "purchase", "price", "discount", "interested", "how much", "available", "ship", "checkout"];

function containsKeyword(text: string, keywords: string[]): boolean {
  const lowered = text.toLowerCase();
  return keywords.some((k) => lowered.includes(k));
}

function findProductMentions(products: ProductRecord[], content: string): ProductRecord[] {
  const lowered = content.toLowerCase();
  return products.filter((p) => lowered.includes(p.title.toLowerCase()));
}

function toSuggestedProduct(product: ProductRecord, reason: string): SuggestedProduct {
  return {
    id: product.id,
    title: product.title,
    price: product.price ?? 0,
    currency: product.currency ?? "",
    inStock: (product.inventory ?? 0) > 0,
    reason,
  };
}

function complementaryProducts(products: ProductRecord[], purchased: ProductRecord[]): SuggestedProduct[] {
  const excludedIds = new Set(purchased.map((p) => p.id));
  const candidates = products.filter((p) => !excludedIds.has(p.id) && (p.inventory ?? 0) > 0);
  return candidates.slice(0, 3).map((p) => toSuggestedProduct(p, `Frequently bought with ${purchased[0]?.title ?? "this order"}`));
}

export interface NextBestActionServiceInput {
  ecommerce: EcommerceQueries;
  crmQueries: CrmQueries;
  customerDirectory: CustomerDirectory;
  conversations: ConversationQueries;
  signals: SignalRepository;
  growth: typeof growthQueries;
  brandDeals: typeof brandDealQueries;
  competitorIntelligence: CompetitorIntelligenceService;
}

export function makeNextBestActionService(input: NextBestActionServiceInput) {
  async function forConversation(
    organizationId: string,
    storeId: string,
    conversationId: string,
  ): Promise<InboxNextBestAction | null> {
    const detail = await input.conversations.getConversation(conversationId);
    if (!detail) return null;

    const content = detail.messages.map((m) => m.content).join(" ");
    const customerId = detail.conversation.customerId;
    const customer = customerId ? await input.customerDirectory.getCustomerDetail(organizationId, customerId) : null;

    const isSupport = containsKeyword(content, SUPPORT_KEYWORDS);
    const hasIntent = containsKeyword(content, INTENT_KEYWORDS);
    const suppressSales = isSupport || customer?.consent === "DECLINED";

    const products = await input.ecommerce.listProducts(storeId, 100);
    const mentioned = findProductMentions(products, content);
    const suggestedProducts = mentioned.slice(0, 3).map((p) => toSuggestedProduct(p, "Mentioned in conversation"));

    let priorityScore = 0;
    if (hasIntent) priorityScore += 40;
    if (customer && customer.leadScore >= 60) priorityScore += 30;
    if (customer && customer.engagementScore >= 70) priorityScore += 20;
    if (mentioned.length > 0) priorityScore += 10;

    const priority: Priority = priorityScore >= 70 ? "high" : priorityScore >= 40 ? "medium" : "low";

    const risks: string[] = [];
    if (isSupport) risks.push("Support-sensitive conversation; sales suppressed");
    if (customer?.consent === "DECLINED") risks.push("Customer declined marketing consent");
    if (mentioned.some((p) => p.inventory === 0)) risks.push("Mentioned product is out of stock");

    let suggestedReply = "Reply with helpful context and ask a follow-up question.";
    if (suppressSales) {
      suggestedReply = "Acknowledge the issue, apologize, and escalate to support or offer a resolution.";
    } else if (suggestedProducts.length > 0) {
      suggestedReply = `Answer the question and highlight ${suggestedProducts[0].title}. Include price and a link to checkout if they are ready. If stock is low, mention limited availability.`;
    } else if (hasIntent) {
      suggestedReply = "They are showing purchase intent. Confirm availability, mention current price, and offer a direct checkout link.";
    }

    const reason = isSupport
      ? "Support keywords detected"
      : hasIntent
        ? "High-intent conversation"
        : suggestedProducts.length > 0
          ? "Product mentioned"
          : "General conversation";

    return {
      priority,
      priorityScore,
      suppressSales,
      reason,
      suggestedReply,
      relevantProducts: suggestedProducts,
      risks,
    };
  }

  async function forStoreOrders(
    organizationId: string,
    storeId: string,
  ): Promise<OrdersNextBestAction | null> {
    const [orders, products, allCustomers] = await Promise.all([
      input.ecommerce.listOrders(storeId, 250),
      input.ecommerce.listProducts(storeId, 100),
      input.customerDirectory.listCustomersByOrganization(organizationId),
    ]);

    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const fourteenDays = 14 * 24 * 60 * 60 * 1000;

    const customerSpending = new Map<string, { total: number; currency: string; orders: number }>();
    const recentOrders = orders.filter((o) => now - new Date(o.createdAt).getTime() <= fourteenDays);

    for (const order of recentOrders) {
      const ref = order.customerRef ?? "anonymous";
      const entry = customerSpending.get(ref) ?? { total: 0, currency: order.currency ?? "INR", orders: 0 };
      entry.total += Number(order.total) || 0;
      customerSpending.set(ref, entry);
    }

    const spendingValues = [...customerSpending.values()].map((v) => v.total).sort((a, b) => a - b);
    const medianLifetime = spendingValues.length
      ? spendingValues[Math.floor(spendingValues.length / 2)]
      : 0;
    const highValueThreshold = Math.max(medianLifetime, 1);

    const customersByRef = new Map<string, CustomerListView>();
    for (const c of allCustomers) {
      if (c.igUserId) customersByRef.set(c.igUserId, c);
      if (c.fbUserId) customersByRef.set(c.fbUserId, c);
      if (c.username) customersByRef.set(c.username, c);
      customersByRef.set(c.id, c);
    }

    const atRiskHighValueCustomers: AtRiskCustomer[] = [];
    for (const [ref, spending] of customerSpending) {
      const customer = customersByRef.get(ref);
      if (!customer) continue;
      if (spending.total < highValueThreshold) continue;

      const isAtRisk =
        customer.lifecycleStage === "CHURNED" ||
        (customer.lifecycleStage === "CUSTOMER" && customer.engagementScore < 40);
      if (!isAtRisk) continue;

      atRiskHighValueCustomers.push({
        customerId: customer.id,
        displayName: customer.username ?? customer.igUserId ?? customer.fbUserId ?? "Unknown",
        lifetimeValue: spending.total,
        currency: spending.currency,
        reason: `${customer.lifecycleStage.toLowerCase()} customer with ${spending.orders} recent order(s) and LTV ${spending.total}`,
      });
    }

    const postDeliveryUpsells: PostDeliveryUpsell[] = [];
    const recentDeliveries = recentOrders.filter((o) => now - new Date(o.createdAt).getTime() <= sevenDays);

    for (const order of recentDeliveries) {
      const ref = order.customerRef ?? "anonymous";
      const customer = customersByRef.get(ref);
      const purchased = [products[0]].filter((p): p is ProductRecord => !!p);
      const upsells = complementaryProducts(products, purchased);
      if (upsells.length === 0) continue;

      postDeliveryUpsells.push({
        orderId: order.externalId,
        customerId: customer?.id,
        customerName: customer?.username ?? undefined,
        productTitle: purchased[0]?.title ?? "your order",
        upsellProduct: upsells[0],
      });
    }

    const recentSignals = await input.signals.listByStore(storeId, 100);
    const sevenDaysAgo = now - sevenDays;
    const supportSignals = recentSignals.filter(
      (s: SignalRecord) =>
        s.eventType === "SupportIssueRaised" &&
        new Date(s.occurredAt).getTime() >= sevenDaysAgo,
    );
    const suppressed = supportSignals.length > 0;
    const reasons: string[] = [];
    if (suppressed) reasons.push("Active support signals detected; defer sales outreach");

    return {
      atRiskHighValueCustomers: atRiskHighValueCustomers.slice(0, 10),
      postDeliveryUpsells: postDeliveryUpsells.slice(0, 10),
      suppressed,
      reasons,
    };
  }

  async function forCrm(organizationId: string): Promise<CustomerNextBestAction | null> {
    const all = await input.customerDirectory.listCustomersByOrganization(organizationId);
    const retentionCandidates: CrmCandidate[] = [];
    const advocateCandidates: CrmCandidate[] = [];

    for (const c of all) {
      if (c.consent === "DECLINED") continue;
      if (c.lifecycleStage === "CHURNED" || (c.lifecycleStage === "CUSTOMER" && c.engagementScore < 40)) {
        retentionCandidates.push({
          customerId: c.id,
          displayName: c.username ?? c.igUserId ?? c.fbUserId ?? "Unknown",
          segment: c.segment,
          reason: `${c.lifecycleStage.toLowerCase()} customer, engagement ${c.engagementScore}`,
        });
      }
      if (c.lifecycleStage === "CUSTOMER" && c.engagementScore >= 70 && c.leadScore >= 60) {
        advocateCandidates.push({
          customerId: c.id,
          displayName: c.username ?? c.igUserId ?? c.fbUserId ?? "Unknown",
          segment: c.segment,
          reason: `High engagement (${c.engagementScore}) and purchase intent (${c.leadScore})`,
        });
      }
    }

    const reasons: string[] = [];
    return {
      retentionCandidates: retentionCandidates.slice(0, 10),
      advocateCandidates: advocateCandidates.slice(0, 10),
      suppressed: false,
      reasons,
    };
  }

  async function forContent(storeId: string): Promise<ContentNextBestAction> {
    const [ugc, products] = await Promise.all([
      input.growth.listUgc(storeId, 50),
      input.ecommerce.listProducts(storeId, 100),
    ]);

    const formatCounts = new Map<string, number>();
    const featuredProducts = new Set<string>();
    for (const asset of ugc) {
      const fmt = asset.mediaType ?? "post";
      formatCounts.set(fmt, (formatCounts.get(fmt) ?? 0) + 1);
      if (asset.caption) {
        for (const p of products) {
          if (asset.caption.toLowerCase().includes(p.title.toLowerCase())) {
            featuredProducts.add(p.id);
          }
        }
      }
    }

    const repeatFormats = [...formatCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([format, count]) => ({ format, evidence: `${count} collected asset(s)` }));

    const gaps = products
      .filter((p) => (p.inventory ?? 0) > 0 && !featuredProducts.has(p.id))
      .slice(0, 3)
      .map((p) => ({ topic: p.title, suggestedProductTitle: p.title }));

    const timing = "Post between 6 PM and 9 PM based on typical engagement; test Stories/Reels for discovery.";
    const reasons: string[] = [];
    if (repeatFormats.length > 0) reasons.push("UGC performance signals");
    if (gaps.length > 0) reasons.push("Products without recent UGC coverage");

    return {
      repeatFormats,
      contentGaps: gaps,
      timing,
      suppressed: false,
      reasons,
    };
  }

  async function forCampaigns(storeId: string): Promise<CampaignsNextBestAction> {
    const campaigns = await input.growth.listCampaigns(storeId, 50);

    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    const underperforming: CampaignsNextBestAction["underperforming"] = [];
    const highPerforming: CampaignsNextBestAction["highPerforming"] = [];

    for (const c of campaigns) {
      const sentCount = typeof c.metrics === "object" && c.metrics !== null && "sentCount" in c.metrics
        ? Number((c.metrics as Record<string, unknown>).sentCount) || 0
        : 0;
      const sentAt = c.sentAt ? new Date(c.sentAt).getTime() : null;
      const scheduledAt = c.scheduledAt ? new Date(c.scheduledAt).getTime() : null;

      if (c.status === "SCHEDULED" && scheduledAt && now > scheduledAt + sevenDays) {
        underperforming.push({ campaignId: c.id, campaignType: c.campaignType, sentCount, reason: "Scheduled campaign is over a week overdue" });
      } else if (sentAt && now - sentAt <= sevenDays && sentCount > 0) {
        highPerforming.push({ campaignId: c.id, campaignType: c.campaignType, sentCount, reason: "Recently sent and active" });
      } else if (c.status === "DRAFT") {
        underperforming.push({ campaignId: c.id, campaignType: c.campaignType, sentCount, reason: "Still in draft; review audience and offer" });
      }
    }

    const reasons: string[] = [];
    if (underperforming.length > 0) reasons.push("Campaigns stuck or underperforming");
    if (highPerforming.length > 0) reasons.push("Recent high-performing campaigns");

    let recommendedAction = "Create your first DM or comment-unlock campaign.";
    if (underperforming.length > 0) recommendedAction = "Pause or revise underperforming campaigns before re-running.";
    else if (highPerforming.length > 0) recommendedAction = "Replicate the top-performing campaign as a controlled experiment.";

    return {
      underperforming: underperforming.slice(0, 10),
      highPerforming: highPerforming.slice(0, 10),
      recommendedAction,
      suppressed: false,
      reasons,
    };
  }

  async function forBrandDeals(storeId: string): Promise<BrandDealNextBestAction> {
    const deals = await input.brandDeals.listByStore(storeId, 100);
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    const followUps: BrandDealNextBestAction["followUps"] = [];
    const deliverableRisks: BrandDealNextBestAction["deliverableRisks"] = [];

    for (const d of deals) {
      const updatedAt = new Date(d.updatedAt).getTime();
      const daysStuck = Math.floor((now - updatedAt) / oneDay);

      if (d.status === "NEGOTIATING" && daysStuck >= 7) {
        followUps.push({ dealId: d.id, brandName: d.brandName, daysStuck, reason: `Negotiating for ${daysStuck} day(s); follow up on terms` });
      } else if (d.status === "DELIVERED" && daysStuck >= 7) {
        deliverableRisks.push({ dealId: d.id, brandName: d.brandName, risk: "Deliverable completed but not yet paid; send invoice/close loop" });
      } else if (d.status === "CONTRACTED" && daysStuck >= 14) {
        deliverableRisks.push({ dealId: d.id, brandName: d.brandName, risk: "Contracted over 14 days without delivery; confirm timeline" });
      }
    }

    let recommendedAction = "No brand-deal actions needed.";
    if (followUps.length > 0) recommendedAction = `Follow up on ${followUps.length} deal(s) stuck in negotiation.`;
    else if (deliverableRisks.length > 0) recommendedAction = `Resolve payment/delivery risk on ${deliverableRisks.length} deal(s).`;

    return { followUps, deliverableRisks, recommendedAction };
  }

  async function forCompetitorIntelligence(organizationId: string, storeId: string): Promise<CompetitorNextBestAction> {
    const insights = await input.competitorIntelligence.list(organizationId, storeId, 50);
    const experiments: CompetitorNextBestAction["experiments"] = [];
    const warnings: string[] = [];

    const byMetric = new Map<string, { total: number; count: number; competitors: Set<string> }>();
    for (const i of insights) {
      const entry = byMetric.get(i.metricName) ?? { total: 0, count: 0, competitors: new Set<string>() };
      entry.total += i.value;
      entry.count += 1;
      entry.competitors.add(i.competitorHandle);
      byMetric.set(i.metricName, entry);
    }

    for (const [metric, { total, count, competitors }] of byMetric) {
      const avg = count ? total / count : 0;
      if (avg > 5) {
        experiments.push({
          pattern: metric,
          suggestedAngle: `Test a content experiment around ${metric} with your own brand voice.`,
          guardrail: "Do not copy competitor assets or unsupported claims; run a controlled test.",
        });
      }
      if (competitors.size > 2) {
        warnings.push(`${metric} appears across ${competitors.size} competitors — trend may be broad, not unique.`);
      }
    }

    return { experiments, warnings };
  }

  return { forConversation, forStoreOrders, forCrm, forContent, forCampaigns, forBrandDeals, forCompetitorIntelligence };
}

export type NextBestActionService = ReturnType<typeof makeNextBestActionService>;
