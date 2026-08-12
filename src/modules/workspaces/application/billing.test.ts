/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, beforeEach } from "vitest";
import type { Prisma } from "@prisma/client";
import { env } from "@/shared/config/env";
import { Plan } from "../domain/plan";
import type { OrganizationRepository, OrganizationRecord } from "./ports";
import type { SaaSCouponRepository, SaaSCouponRecord } from "./saas-coupon";
import type { ProcessedEventsRepository } from "@/shared/webhooks/processed-events.repository";
import { makeBillingService, type BillingService, BillingSignatureError } from "./billing";
import type { CheckoutSessionInput, PaymentGateway, InvoiceRecord, RefundInput, RefundResult } from "./payment-gateway";
import type { PaginationInput, PaginatedResult } from "@/shared/kernel";

const RAZORPAY_PLAN_PRO = "plan_pro_test";
const RAZORPAY_PLAN_BUSINESS = "plan_business_test";

interface RazorpayWebhookPayload {
  entity: "event";
  event: string;
  id?: string;
  payload: {
    subscription?: {
      id: string;
      status: string;
      plan_id: string;
      customer_id: string | null;
      notes?: Record<string, string>;
      remaining_count: string | number;
    };
    payment?: {
      id: string;
      status: string;
      invoice_id: string | null;
      subscription_id?: string | null;
    };
  };
}

class FakeOrganizationRepository implements OrganizationRepository {
  private orgs = new Map<string, OrganizationRecord>();

  async create(input: { name: string }): Promise<OrganizationRecord> {
    const record: OrganizationRecord = {
      id: `org_${this.orgs.size + 1}`,
      name: input.name,
      plan: Plan.FREE,
      subscriptionId: null,
      subscriptionStatus: null,
      paymentCustomerId: null,
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
    input: { plan: Plan; subscriptionId?: string | null; subscriptionStatus?: string | null; paymentCustomerId?: string | null },
    _tx?: Prisma.TransactionClient,
  ): Promise<OrganizationRecord | null> {
    const org = this.orgs.get(id);
    if (!org) return null;
    org.plan = input.plan;
    if (input.subscriptionId !== undefined) org.subscriptionId = input.subscriptionId ?? null;
    if (input.subscriptionStatus !== undefined) org.subscriptionStatus = input.subscriptionStatus ?? null;
    if (input.paymentCustomerId !== undefined) org.paymentCustomerId = input.paymentCustomerId ?? null;
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
  private events: RazorpayWebhookPayload[] = [];
  private shouldThrowSignature = false;

  queue(event: RazorpayWebhookPayload): void {
    this.events.push(event);
  }

  throwSignatureError(): void {
    this.shouldThrowSignature = true;
  }

  constructWebhookEvent(_payload: string | Buffer, _signature: string, _secret: string): unknown {
    if (this.shouldThrowSignature) {
      throw new Error("Invalid signature");
    }
    return this.events.shift();
  }

  createCheckoutSession(_input: CheckoutSessionInput): Promise<{ url: string | null }> {
    return Promise.resolve({ url: "https://checkout.razorpay.com/test" });
  }

  createPortalSession(_input: { customerId: string; returnUrl: string }): Promise<{ url: string | null }> {
    return Promise.resolve({ url: "https://dashboard.razorpay.com/test" });
  }

  listInvoices(_customerId: string): Promise<InvoiceRecord[]> {
    return Promise.resolve([]);
  }

  createRefund(_input: RefundInput): Promise<RefundResult> {
    return Promise.resolve({ refundId: "ref_1", amount: _input.amount ?? 1000, status: "processed" });
  }
}

function makeSubscriptionActivatedEvent({
  id,
  subscriptionId,
  userId,
  planId,
  couponCode,
  customerId = null,
}: {
  id: string;
  subscriptionId: string;
  userId: string;
  planId: string;
  couponCode?: string;
  customerId?: string | null;
}): RazorpayWebhookPayload {
  return {
    entity: "event",
    event: "subscription.activated",
    id,
    payload: {
      subscription: {
        id: subscriptionId,
        status: "active",
        plan_id: planId,
        customer_id: customerId,
        notes: {
          userId,
          plan: planFromPlanId(planId) ?? Plan.FREE,
          ...(couponCode ? { couponCode } : {}),
        },
        remaining_count: 12,
      },
    },
  };
}

function makeSubscriptionChargedEvent({
  id,
  subscriptionId,
  planId,
  customerId = null,
}: {
  id: string;
  subscriptionId: string;
  planId: string;
  customerId?: string | null;
}): RazorpayWebhookPayload {
  return {
    entity: "event",
    event: "subscription.charged",
    id,
    payload: {
      subscription: {
        id: subscriptionId,
        status: "active",
        plan_id: planId,
        customer_id: customerId,
        notes: {},
        remaining_count: 11,
      },
    },
  };
}

function makeSubscriptionHaltedEvent({
  id,
  subscriptionId,
  planId,
  customerId = null,
}: {
  id: string;
  subscriptionId: string;
  planId: string;
  customerId?: string | null;
}): RazorpayWebhookPayload {
  return {
    entity: "event",
    event: "subscription.halted",
    id,
    payload: {
      subscription: {
        id: subscriptionId,
        status: "halted",
        plan_id: planId,
        customer_id: customerId,
        notes: {},
        remaining_count: 0,
      },
    },
  };
}

function makeSubscriptionCancelledEvent({
  id,
  subscriptionId,
  planId,
  customerId = null,
}: {
  id: string;
  subscriptionId: string;
  planId: string;
  customerId?: string | null;
}): RazorpayWebhookPayload {
  return {
    entity: "event",
    event: "subscription.cancelled",
    id,
    payload: {
      subscription: {
        id: subscriptionId,
        status: "cancelled",
        plan_id: planId,
        customer_id: customerId,
        notes: {},
        remaining_count: 0,
      },
    },
  };
}

function makePaymentFailedEvent({
  id,
  paymentId,
  subscriptionId,
}: {
  id: string;
  paymentId: string;
  subscriptionId: string;
}): RazorpayWebhookPayload {
  return {
    entity: "event",
    event: "payment.failed",
    id,
    payload: {
      payment: {
        id: paymentId,
        status: "failed",
        invoice_id: null,
        subscription_id: subscriptionId,
      },
    },
  };
}

function planFromPlanId(planId: string): Plan | null {
  if (planId === RAZORPAY_PLAN_BUSINESS) return Plan.BUSINESS;
  if (planId === RAZORPAY_PLAN_PRO) return Plan.PRO;
  return null;
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
  (env as { RAZORPAY_WEBHOOK_SECRET?: string }).RAZORPAY_WEBHOOK_SECRET = "whsec_test_secret";
  (env as { RAZORPAY_PLAN_PRO?: string }).RAZORPAY_PLAN_PRO = RAZORPAY_PLAN_PRO;
  (env as { RAZORPAY_PLAN_BUSINESS?: string }).RAZORPAY_PLAN_BUSINESS = RAZORPAY_PLAN_BUSINESS;
}

describe("billing service", () => {
  beforeEach(() => {
    setupEnv();
  });

  describe("idempotency", () => {
    it("fulfills a subscription.activated event and records the event", async () => {
      const ctx = makeContext();
      const org = await ctx.organizations.create({ name: "Test Org" });
      ctx.paymentGateway.queue(
        makeSubscriptionActivatedEvent({
          id: "evt_1",
          subscriptionId: "sub_1",
          userId: org.id,
          planId: RAZORPAY_PLAN_PRO,
        }),
      );

      await ctx.billing.fulfillCheckout("payload", "sig");

      const updated = await ctx.organizations.findById(org.id);
      expect(updated?.plan).toBe(Plan.PRO);
      expect(ctx.processedEvents.has({ id: "evt_1", provider: "razorpay", type: "subscription.activated" })).toBe(true);
    });

    it("does not fulfill a duplicate Razorpay event", async () => {
      const ctx = makeContext();
      const org = await ctx.organizations.create({ name: "Test Org" });
      const event = makeSubscriptionActivatedEvent({
        id: "evt_dup",
        subscriptionId: "sub_1",
        userId: org.id,
        planId: RAZORPAY_PLAN_PRO,
      });
      ctx.paymentGateway.queue(event);
      await ctx.billing.fulfillCheckout("payload", "sig");
      ctx.paymentGateway.queue(event);
      await ctx.billing.fulfillCheckout("payload", "sig");

      const updated = await ctx.organizations.findById(org.id);
      expect(updated?.plan).toBe(Plan.PRO);
      expect(ctx.processedEvents.has({ id: "evt_dup", provider: "razorpay", type: "subscription.activated" })).toBe(true);
    });

    it("only increments coupon usage once for a duplicate activation", async () => {
      const ctx = makeContext();
      const org = await ctx.organizations.create({ name: "Test Org" });
      ctx.coupons.seed("WELCOME", 10);
      const event = makeSubscriptionActivatedEvent({
        id: "evt_coupon",
        subscriptionId: "sub_1",
        userId: org.id,
        planId: RAZORPAY_PLAN_BUSINESS,
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
    it("upgrades an org to Pro on subscription.activated", async () => {
      const ctx = makeContext();
      const org = await ctx.organizations.create({ name: "Test Org" });
      ctx.paymentGateway.queue(
        makeSubscriptionActivatedEvent({
          id: "evt_upgrade",
          subscriptionId: "sub_upgrade",
          userId: org.id,
          planId: RAZORPAY_PLAN_PRO,
          customerId: "cust_1",
        }),
      );

      await ctx.billing.fulfillCheckout("payload", "sig");

      const updated = await ctx.organizations.findById(org.id);
      expect(updated?.plan).toBe(Plan.PRO);
      expect(updated?.subscriptionStatus).toBe("active");
      expect(updated?.paymentCustomerId).toBe("cust_1");
    });

    it("remains active on subscription.charged while preserving the plan", async () => {
      const ctx = makeContext();
      const org = await ctx.organizations.create({ name: "Test Org" });
      await ctx.organizations.updatePlan(org.id, {
        plan: Plan.BUSINESS,
        subscriptionId: "sub_renew",
        subscriptionStatus: "active",
      });

      ctx.paymentGateway.queue(
        makeSubscriptionChargedEvent({
          id: "evt_renew",
          subscriptionId: "sub_renew",
          planId: RAZORPAY_PLAN_BUSINESS,
        }),
      );

      await ctx.billing.fulfillCheckout("payload", "sig");

      const updated = await ctx.organizations.findById(org.id);
      expect(updated?.plan).toBe(Plan.BUSINESS);
      expect(updated?.subscriptionStatus).toBe("active");
    });

    it("marks the subscription as past_due on subscription.halted", async () => {
      const ctx = makeContext();
      const org = await ctx.organizations.create({ name: "Test Org" });
      await ctx.organizations.updatePlan(org.id, {
        plan: Plan.BUSINESS,
        subscriptionId: "sub_pastdue",
        subscriptionStatus: "active",
      });

      ctx.paymentGateway.queue(
        makeSubscriptionHaltedEvent({
          id: "evt_pastdue",
          subscriptionId: "sub_pastdue",
          planId: RAZORPAY_PLAN_BUSINESS,
        }),
      );

      await ctx.billing.fulfillCheckout("payload", "sig");

      const updated = await ctx.organizations.findById(org.id);
      expect(updated?.plan).toBe(Plan.BUSINESS);
      expect(updated?.subscriptionStatus).toBe("past_due");
    });

    it("marks the subscription as past_due on payment.failed", async () => {
      const ctx = makeContext();
      const org = await ctx.organizations.create({ name: "Test Org" });
      await ctx.organizations.updatePlan(org.id, {
        plan: Plan.PRO,
        subscriptionId: "sub_payfail",
        subscriptionStatus: "active",
      });

      ctx.paymentGateway.queue(
        makePaymentFailedEvent({
          id: "evt_payfail",
          paymentId: "pay_fail",
          subscriptionId: "sub_payfail",
        }),
      );

      await ctx.billing.fulfillCheckout("payload", "sig");

      const updated = await ctx.organizations.findById(org.id);
      expect(updated?.plan).toBe(Plan.PRO);
      expect(updated?.subscriptionStatus).toBe("past_due");
    });

    it("downgrades an org to FREE when the subscription is cancelled", async () => {
      const ctx = makeContext();
      const org = await ctx.organizations.create({ name: "Test Org" });
      await ctx.organizations.updatePlan(org.id, {
        plan: Plan.BUSINESS,
        subscriptionId: "sub_cancel",
        subscriptionStatus: "active",
      });

      ctx.paymentGateway.queue(
        makeSubscriptionCancelledEvent({
          id: "evt_cancel",
          subscriptionId: "sub_cancel",
          planId: RAZORPAY_PLAN_BUSINESS,
        }),
      );

      await ctx.billing.fulfillCheckout("payload", "sig");

      const updated = await ctx.organizations.findById(org.id);
      expect(updated?.plan).toBe(Plan.FREE);
      expect(updated?.subscriptionStatus).toBe("canceled");
    });

    it("preserves the current plan when the plan id is unknown", async () => {
      const ctx = makeContext();
      const org = await ctx.organizations.create({ name: "Test Org" });
      await ctx.organizations.updatePlan(org.id, {
        plan: Plan.BUSINESS,
        subscriptionId: "sub_unknown",
        subscriptionStatus: "active",
      });

      ctx.paymentGateway.queue(
        makeSubscriptionChargedEvent({
          id: "evt_unknown",
          subscriptionId: "sub_unknown",
          planId: "plan_unknown",
        }),
      );

      await ctx.billing.fulfillCheckout("payload", "sig");

      const updated = await ctx.organizations.findById(org.id);
      expect(updated?.plan).toBe(Plan.BUSINESS);
      expect(updated?.subscriptionStatus).toBe("active");
    });
  });

  describe("security", () => {
    it("rejects a Razorpay webhook with an invalid signature", async () => {
      const ctx = makeContext();
      ctx.paymentGateway.throwSignatureError();

      await expect(ctx.billing.fulfillCheckout("payload", "invalid-sig")).rejects.toBeInstanceOf(BillingSignatureError);
    });
  });
});
