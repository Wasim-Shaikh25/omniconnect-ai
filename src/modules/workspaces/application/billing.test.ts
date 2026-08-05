/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeEach } from "vitest";
import type { Prisma } from "@prisma/client";
import Stripe from "stripe";
import { env } from "@/shared/config/env";
import { Plan } from "../domain/plan";
import type { OrganizationRepository, OrganizationRecord } from "./ports";
import type { SaaSCouponRepository, SaaSCouponRecord } from "./saas-coupon";
import type { ProcessedEventsRepository } from "@/shared/webhooks/processed-events.repository";
import { makeBillingService, type BillingService, BillingSignatureError } from "./billing";
import type { CheckoutSessionInput, PaymentGateway } from "./payment-gateway";
import type { PaginationInput, PaginatedResult } from "@/shared/kernel";

const STARTER_PRICE = "price_1_starter";
const PRO_PRICE = "price_1_pro";

class FakeOrganizationRepository implements OrganizationRepository {
  private orgs = new Map<string, OrganizationRecord>();

  async create(input: { name: string }): Promise<OrganizationRecord> {
    const record: OrganizationRecord = {
      id: `org_${this.orgs.size + 1}`,
      name: input.name,
      plan: Plan.FREE,
      subscriptionId: null,
      subscriptionStatus: null,
      createdAt: new Date(),
    };
    this.orgs.set(record.id, record);
    return record;
  }

  async findById(id: string): Promise<OrganizationRecord | null> {
    return this.orgs.get(id) ?? null;
  }

  async findBySubscriptionId(
    subscriptionId: string,
    _tx?: Prisma.TransactionClient,
  ): Promise<OrganizationRecord | null> {
    return Array.from(this.orgs.values()).find((o) => o.subscriptionId === subscriptionId) ?? null;
  }

  async listAll(pagination?: PaginationInput): Promise<PaginatedResult<OrganizationRecord>> {
    const items = Array.from(this.orgs.values());
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? items.length;
    const total = items.length;
    return {
      items: items.slice((page - 1) * limit, page * limit),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async updatePlan(
    id: string,
    input: { plan: Plan; subscriptionId?: string | null; subscriptionStatus?: string | null },
    _tx?: Prisma.TransactionClient,
  ): Promise<OrganizationRecord | null> {
    const org = this.orgs.get(id);
    if (!org) return null;
    org.plan = input.plan;
    if (input.subscriptionId !== undefined) org.subscriptionId = input.subscriptionId ?? null;
    if (input.subscriptionStatus !== undefined) org.subscriptionStatus = input.subscriptionStatus ?? null;
    return org;
  }

  async incrementAIReplies(_id: string, _limit: number | null): Promise<boolean> {
    return true;
  }

  async incrementProfileInspections(_id: string, _limit: number | null): Promise<boolean> {
    return true;
  }

  seed(record: OrganizationRecord): void {
    this.orgs.set(record.id, record);
  }
}

class FakeSaaSCouponRepository implements SaaSCouponRepository {
  private coupons = new Map<string, SaaSCouponRecord>();

  async create(input: {
    code: string;
    discountPct: number;
    maxUses?: number | null;
    appliesTo: string[];
    createdBy: string;
    label?: string | undefined;
    expiresAt?: Date | null | undefined;
    stripeCouponId?: string | null | undefined;
    stripePromotionCodeId?: string | null | undefined;
  }) {
    const id = `coupon_${this.coupons.size + 1}`;
    const coupon: SaaSCouponRecord = {
      id,
      code: input.code,
      label: input.label ?? null,
      discountPct: input.discountPct,
      maxUses: input.maxUses ?? null,
      usedCount: 0,
      expiresAt: input.expiresAt ?? null,
      appliesTo: input.appliesTo,
      isActive: true,
      stripeCouponId: input.stripeCouponId ?? null,
      stripePromotionCodeId: input.stripePromotionCodeId ?? null,
      createdBy: input.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.coupons.set(coupon.id, coupon);
    return coupon;
  }

  async findByCode(code: string, _tx?: Prisma.TransactionClient) {
    return Array.from(this.coupons.values()).find((c) => c.code === code) ?? null;
  }

  async findById(id: string) {
    return this.coupons.get(id) ?? null;
  }

  async list() {
    return { items: Array.from(this.coupons.values()), total: this.coupons.size, page: 1, limit: 10, totalPages: 1 };
  }

  async incrementUsage(id: string, _maxUses: number | null, _tx?: Prisma.TransactionClient): Promise<boolean> {
    const coupon = this.coupons.get(id);
    if (!coupon) return false;
    coupon.usedCount += 1;
    return true;
  }

  seed(code: string, maxUses: number | null = null): void {
    const id = `coupon_${code}`;
    this.coupons.set(id, {
      id,
      code,
      label: null,
      discountPct: 0,
      usedCount: 0,
      maxUses,
      expiresAt: null,
      appliesTo: [],
      isActive: true,
      stripeCouponId: null,
      stripePromotionCodeId: null,
      createdBy: "system",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  getUsedCount(code: string): number {
    return Array.from(this.coupons.values()).find((c) => c.code === code)?.usedCount ?? 0;
  }
}

class FakeProcessedEventsRepository implements ProcessedEventsRepository {
  private events = new Set<string>();

  async record(
    input: { id: string; provider: string; type: string },
    _tx?: Prisma.TransactionClient,
  ): Promise<{ recorded: boolean }> {
    const key = `${input.provider}:${input.id}:${input.type}`;
    if (this.events.has(key)) return { recorded: false };
    this.events.add(key);
    return { recorded: true };
  }

  async runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return fn(undefined as unknown as Prisma.TransactionClient);
  }

  has(input: { id: string; provider: string; type: string }): boolean {
    return this.events.has(`${input.provider}:${input.id}:${input.type}`);
  }
}

class FakePaymentGateway implements PaymentGateway {
  private events: Stripe.Event[] = [];
  private shouldThrowSignature = false;

  queue(event: Stripe.Event): void {
    this.events.push(event);
  }

  throwSignatureError(): void {
    this.shouldThrowSignature = true;
  }

  constructWebhookEvent(_payload: string | Buffer, _signature: string, _secret: string): unknown {
    if (this.shouldThrowSignature) {
      const err = Object.create(Stripe.errors.StripeSignatureVerificationError.prototype) as Error;
      err.message = "Invalid signature";
      throw err;
    }
    return this.events.shift();
  }

  createCheckoutSession(_input: CheckoutSessionInput): Promise<{ url: string | null }> {
    return Promise.resolve({ url: "https://checkout.stripe.com/test" });
  }
}

function makeStripeEvent<T extends string>(id: string, type: T, object: unknown): Stripe.Event {
  return {
    id,
    type,
    data: { object },
  } as unknown as Stripe.Event;
}

function makeCheckoutSessionEvent({
  id,
  sessionId,
  userId,
  plan,
  couponCode,
}: {
  id: string;
  sessionId: string;
  userId: string;
  plan: Plan;
  couponCode?: string;
}): Stripe.Event {
  return makeStripeEvent(id, "checkout.session.completed", {
    id: sessionId,
    payment_status: "paid",
    status: "complete",
    client_reference_id: userId,
    metadata: {
      userId,
      plan,
      couponCode: couponCode ?? "",
    },
    subscription: "sub_1",
  });
}

function makeSubscriptionEvent({
  id,
  subscriptionId,
  userId,
  priceId,
  status,
}: {
  id: string;
  subscriptionId: string;
  userId: string;
  priceId: string;
  status: Stripe.Subscription.Status;
}): Stripe.Event {
  return makeStripeEvent(id, "customer.subscription.updated", {
    id: subscriptionId,
    status,
    metadata: { userId },
    items: {
      data: [{ price: { id: priceId } }],
    },
  });
}

function makeInvoicePaidEvent({
  id,
  invoiceId,
  subscriptionId,
}: {
  id: string;
  invoiceId: string;
  subscriptionId: string;
}): Stripe.Event {
  return makeStripeEvent(id, "invoice.paid", {
    id: invoiceId,
    subscription: subscriptionId,
  });
}

interface Context {
  organizations: FakeOrganizationRepository;
  coupons: FakeSaaSCouponRepository;
  processedEvents: FakeProcessedEventsRepository;
  paymentGateway: FakePaymentGateway;
  billing: BillingService;
}

function makeContext(): Context {
  const organizations = new FakeOrganizationRepository();
  const coupons = new FakeSaaSCouponRepository();
  const processedEvents = new FakeProcessedEventsRepository();
  const paymentGateway = new FakePaymentGateway();
  const billing = makeBillingService({ organizations, paymentGateway, coupons, processedEvents });
  return { organizations, coupons, processedEvents, paymentGateway, billing };
}

function setupEnv(): void {
  (env as { STRIPE_WEBHOOK_SECRET?: string }).STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
  (env as { STRIPE_PRICE_STARTER?: string }).STRIPE_PRICE_STARTER = STARTER_PRICE;
  (env as { STRIPE_PRICE_PRO?: string }).STRIPE_PRICE_PRO = PRO_PRICE;
}

describe("billing service", () => {
  beforeEach(() => {
    setupEnv();
  });

  describe("idempotency", () => {
    it("fulfills a checkout session and records the event", async () => {
      const ctx = makeContext();
      const org = await ctx.organizations.create({ name: "Test Org" });
      ctx.paymentGateway.queue(
        makeCheckoutSessionEvent({
          id: "evt_1",
          sessionId: "cs_1",
          userId: org.id,
          plan: Plan.PRO,
        }),
      );

      await ctx.billing.fulfillCheckout("payload", "sig");

      const updated = await ctx.organizations.findById(org.id);
      expect(updated?.plan).toBe(Plan.PRO);
      expect(ctx.processedEvents.has({ id: "evt_1", provider: "stripe", type: "checkout.session.completed" })).toBe(true);
    });

    it("does not fulfill a duplicate Stripe event", async () => {
      const ctx = makeContext();
      const org = await ctx.organizations.create({ name: "Test Org" });
      const event = makeCheckoutSessionEvent({
        id: "evt_dup",
        sessionId: "cs_1",
        userId: org.id,
        plan: Plan.PRO,
      });
      ctx.paymentGateway.queue(event);
      await ctx.billing.fulfillCheckout("payload", "sig");
      ctx.paymentGateway.queue(event);
      await ctx.billing.fulfillCheckout("payload", "sig");

      const updated = await ctx.organizations.findById(org.id);
      expect(updated?.plan).toBe(Plan.PRO);
      expect(ctx.processedEvents.has({ id: "evt_dup", provider: "stripe", type: "checkout.session.completed" })).toBe(true);
    });

    it("only increments coupon usage once for a duplicate checkout", async () => {
      const ctx = makeContext();
      const org = await ctx.organizations.create({ name: "Test Org" });
      ctx.coupons.seed("WELCOME", 10);
      const event = makeCheckoutSessionEvent({
        id: "evt_coupon",
        sessionId: "cs_1",
        userId: org.id,
        plan: Plan.BUSINESS,
        couponCode: "WELCOME",
      });
      ctx.paymentGateway.queue(event);
      await ctx.billing.fulfillCheckout("payload", "sig");
      ctx.paymentGateway.queue(event);
      await ctx.billing.fulfillCheckout("payload", "sig");

      expect(ctx.coupons.getUsedCount("WELCOME")).toBe(1);
    });
  });

  describe("subscription lifecycle", () => {
    it("downgrades a Pro org to Starter when the subscription price changes to Starter", async () => {
      const ctx = makeContext();
      const org = await ctx.organizations.create({ name: "Test Org" });
      await ctx.organizations.updatePlan(org.id, {
        plan: Plan.BUSINESS,
        subscriptionId: "sub_change",
        subscriptionStatus: "active",
      });

      ctx.paymentGateway.queue(
        makeSubscriptionEvent({
          id: "evt_sub_change",
          subscriptionId: "sub_change",
          userId: org.id,
          priceId: STARTER_PRICE,
          status: "active",
        }),
      );

      await ctx.billing.fulfillCheckout("payload", "sig");

      const updated = await ctx.organizations.findById(org.id);
      expect(updated?.plan).toBe(Plan.PRO);
      expect(updated?.subscriptionStatus).toBe("active");
    });

    it("retains the current plan when the subscription is past_due", async () => {
      const ctx = makeContext();
      const org = await ctx.organizations.create({ name: "Test Org" });
      await ctx.organizations.updatePlan(org.id, {
        plan: Plan.BUSINESS,
        subscriptionId: "sub_pastdue",
        subscriptionStatus: "active",
      });

      ctx.paymentGateway.queue(
        makeSubscriptionEvent({
          id: "evt_pastdue",
          subscriptionId: "sub_pastdue",
          userId: org.id,
          priceId: PRO_PRICE,
          status: "past_due",
        }),
      );

      await ctx.billing.fulfillCheckout("payload", "sig");

      const updated = await ctx.organizations.findById(org.id);
      expect(updated?.plan).toBe(Plan.BUSINESS);
      expect(updated?.subscriptionStatus).toBe("past_due");
    });

    it("clears past_due to active on invoice.paid while preserving the plan", async () => {
      const ctx = makeContext();
      const org = await ctx.organizations.create({ name: "Test Org" });
      await ctx.organizations.updatePlan(org.id, {
        plan: Plan.BUSINESS,
        subscriptionId: "sub_recover",
        subscriptionStatus: "past_due",
      });

      ctx.paymentGateway.queue(
        makeInvoicePaidEvent({
          id: "evt_recover",
          invoiceId: "in_1",
          subscriptionId: "sub_recover",
        }),
      );

      await ctx.billing.fulfillCheckout("payload", "sig");

      const updated = await ctx.organizations.findById(org.id);
      expect(updated?.plan).toBe(Plan.BUSINESS);
      expect(updated?.subscriptionStatus).toBe("active");
    });

    it("drops entitlement to FREE when the subscription is unpaid", async () => {
      const ctx = makeContext();
      const org = await ctx.organizations.create({ name: "Test Org" });
      await ctx.organizations.updatePlan(org.id, {
        plan: Plan.BUSINESS,
        subscriptionId: "sub_unpaid",
        subscriptionStatus: "active",
      });

      ctx.paymentGateway.queue(
        makeSubscriptionEvent({
          id: "evt_unpaid",
          subscriptionId: "sub_unpaid",
          userId: org.id,
          priceId: PRO_PRICE,
          status: "unpaid",
        }),
      );

      await ctx.billing.fulfillCheckout("payload", "sig");

      const updated = await ctx.organizations.findById(org.id);
      expect(updated?.plan).toBe(Plan.FREE);
      expect(updated?.subscriptionStatus).toBe("unpaid");
    });

    it("preserves the current plan when the price is unknown", async () => {
      const ctx = makeContext();
      const org = await ctx.organizations.create({ name: "Test Org" });
      await ctx.organizations.updatePlan(org.id, {
        plan: Plan.BUSINESS,
        subscriptionId: "sub_unknown",
        subscriptionStatus: "active",
      });

      ctx.paymentGateway.queue(
        makeSubscriptionEvent({
          id: "evt_unknown",
          subscriptionId: "sub_unknown",
          userId: org.id,
          priceId: "price_unknown",
          status: "active",
        }),
      );

      await ctx.billing.fulfillCheckout("payload", "sig");

      const updated = await ctx.organizations.findById(org.id);
      expect(updated?.plan).toBe(Plan.BUSINESS);
      expect(updated?.subscriptionStatus).toBe("active");
    });
  });

  describe("security", () => {
    it("rejects a Stripe webhook with an invalid signature (S7)", async () => {
      const ctx = makeContext();
      ctx.paymentGateway.throwSignatureError();

      await expect(ctx.billing.fulfillCheckout("payload", "invalid-sig")).rejects.toBeInstanceOf(BillingSignatureError);
    });
  });
});
