import type { SignalRepository, PredictionRepository } from "./ports";
import type { MetricService } from "./metrics";
import type { PredictionRecord, PredictionType, PredictionStatus } from "../domain/types";

export interface PredictionServiceInput {
  predictions: PredictionRepository;
  signals: SignalRepository;
  metrics: MetricService;
  listCustomers: (storeId: string, limit?: number) => Promise<{ id: string; lifecycleStage?: string | null }[]>;
}

function expiration(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function abstained(
  organizationId: string,
  storeId: string | undefined,
  predictionType: PredictionType,
  reason: string,
): Omit<PredictionRecord, "id" | "createdAt" | "updatedAt"> {
  return {
    organizationId,
    storeId: storeId ?? null,
    predictionType,
    targetEntityType: null,
    targetEntityId: null,
    horizon: "7d",
    estimate: 0,
    probability: null,
    lowerBound: null,
    upperBound: null,
    features: null,
    calibration: "LOW",
    expiresAt: expiration(1),
    status: "ABSTAINED" as PredictionStatus,
    reason,
  };
}

export function makePredictionService(input: PredictionServiceInput) {
  return {
    async generateForStore(organizationId: string, storeId?: string): Promise<PredictionRecord[]> {
      const generated: PredictionRecord[] = [];
      const base = { organizationId, storeId: storeId ?? null };

      if (!storeId) {
        generated.push(await input.predictions.save(abstained(organizationId, storeId, "REVENUE_FORECAST", "Store-level scope required for reliable revenue forecasting.")));
        return generated;
      }

      const customers = await input.listCustomers(storeId, 1000);
      const signals = await input.signals.listByStore(storeId, 1000);

      const productSnapshot = await input.metrics.getMetric("product_count", organizationId, storeId);
      const productCount = typeof productSnapshot?.value === "number" ? productSnapshot.value : null;

      if (productCount !== null && productCount <= 5) {
        generated.push(
          await input.predictions.save({
            ...base,
            predictionType: "STOCK_OUT",
            targetEntityType: "store",
            targetEntityId: storeId,
            horizon: "7d",
            estimate: Math.max(0, 5 - productCount),
            probability: 0.6,
            lowerBound: 0,
            upperBound: 10,
            features: { productCount },
            calibration: "MEDIUM",
            expiresAt: expiration(7),
            status: "ACTIVE",
            reason: "Low product count increases risk of stock-out for best sellers.",
          }),
        );
      }

      let highPropensity = 0;
      let churnRisk = 0;
      const now = Date.now();
      const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

      for (const customer of customers) {
        const customerSignals = signals.filter((s) => s.subjectType === "customer" && s.subjectId === customer.id);
        const latest = customerSignals.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())[0];

        if (customer.lifecycleStage === "CUSTOMER" && (!latest || latest.occurredAt < thirtyDaysAgo)) {
          churnRisk++;
        }
        if (latest && latest.eventType === "NewMessage" && latest.occurredAt > new Date(now - 7 * 24 * 60 * 60 * 1000)) {
          highPropensity++;
        }
      }

      if (churnRisk > 0) {
        generated.push(
          await input.predictions.save({
            ...base,
            predictionType: "CHURN",
            targetEntityType: "store",
            targetEntityId: storeId,
            horizon: "30d",
            estimate: churnRisk,
            probability: 0.5,
            lowerBound: 0,
            upperBound: customers.length,
            features: { customersAtRisk: churnRisk, totalCustomers: customers.length },
            calibration: "MEDIUM",
            expiresAt: expiration(30),
            status: "ACTIVE",
            reason: `${churnRisk} customers have had no signal in the last 30 days.`,
          }),
        );
      }

      if (highPropensity > 0) {
        generated.push(
          await input.predictions.save({
            ...base,
            predictionType: "PURCHASE_PROPENSITY",
            targetEntityType: "store",
            targetEntityId: storeId,
            horizon: "7d",
            estimate: highPropensity,
            probability: 0.55,
            lowerBound: 0,
            upperBound: customers.length,
            features: { highIntentCustomers: highPropensity },
            calibration: "MEDIUM",
            expiresAt: expiration(7),
            status: "ACTIVE",
            reason: `${highPropensity} customers sent a message in the last 7 days and may convert with follow-up.`,
          }),
        );
      }

      const couponSnapshot = await input.metrics.getMetric("coupon_count", organizationId, storeId);
      const conversationSnapshot = await input.metrics.getMetric("conversation_count", organizationId, storeId);
      const followerSnapshot = await input.metrics.getMetric("follower_count", organizationId, storeId);
      const weeklyRevenueEstimate = (Number(couponSnapshot?.value ?? 0) + Number(conversationSnapshot?.value ?? 0)) * (Number(followerSnapshot?.value ?? 0) || 1) * 10;

      generated.push(
        await input.predictions.save({
          ...base,
          predictionType: "REVENUE_FORECAST",
          targetEntityType: "store",
          targetEntityId: storeId,
          horizon: "7d",
          estimate: weeklyRevenueEstimate,
          probability: 0.4,
          lowerBound: weeklyRevenueEstimate * 0.5,
          upperBound: weeklyRevenueEstimate * 1.5,
          features: {
            couponCount: couponSnapshot?.value ?? null,
            conversationCount: conversationSnapshot?.value ?? null,
            followerCount: followerSnapshot?.value ?? null,
          },
          calibration: "LOW",
          expiresAt: expiration(7),
          status: "ACTIVE",
          reason: "Rule-based forecast from current engagement signals; treat as scenario range.",
        }),
      );

      return generated;
    },

    async listActive(organizationId: string, storeId?: string, limit = 20): Promise<PredictionRecord[]> {
      return input.predictions.listActive(organizationId, storeId, limit);
    },
  };
}

export type PredictionService = ReturnType<typeof makePredictionService>;
