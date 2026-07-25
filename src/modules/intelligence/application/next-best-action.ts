import type { EcommerceQueries, ProductRecord } from "@/modules/ecommerce";
import type { CrmQueries, CustomerListView, customerDirectory } from "@/modules/crm";
import type { ConversationQueries } from "@/modules/conversations";
import type { SignalRepository } from "./ports";
import type { SignalRecord } from "../domain/types";

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

  return { forConversation, forStoreOrders, forCrm };
}

export type NextBestActionService = ReturnType<typeof makeNextBestActionService>;
